import { NextRequest, NextResponse } from "next/server";
import {
  parseZoningToPages,
  getSprintTheme,
  getZoningRightEdgeX,
  COPY_COLUMN_GAP,
  normKey,
  cleanLabel,
  CARD_WIDTH,
  CARD_GAP,
  SECTION_GAP,
  FRAME_HEADER,
  FRAME_PADDING,
  ROW_GAP,
  type ZoningPage,
} from "@/lib/miro-zoning";

const MIRO_TOKEN = process.env.MIRO_ACCESS_TOKEN;
const MIRO_API = "https://api.miro.com/v2";

const FIELD_ORDER = ["Titre", "Sous-titre", "Paragraphe", "CTA", "Entrées", "Lien", "Méta"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseStructuredFields(content: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /\*\*([^*]+)\*\*\s*[:：]\s*([\s\S]*?)(?=\n\*\*[^*]+\*\*\s*[:：]|$)/g;
  let m;
  while ((m = re.exec(content.trim())) !== null) {
    const k = m[1].trim();
    const v = m[2].trim();
    if (v && v !== "—" && v !== "-" && !/^—\s*$/.test(v)) fields[k] = v;
  }
  if (Object.keys(fields).length === 0 && content.trim()) {
    fields["Paragraphe"] = content.trim().replace(/\*\*/g, "");
  }
  return fields;
}

type CopyPage = { label: string; blocks: Map<string, string> };

function parseCopyToStructure(copyText: string): CopyPage[] {
  const pages: CopyPage[] = [];
  const lines = copyText.split("\n");
  let currentPage: CopyPage | null = null;
  let currentBlock: string | null = null;
  let blockContent = "";

  const flushBlock = () => {
    if (currentPage && currentBlock !== null) {
      currentPage.blocks.set(normKey(currentBlock), blockContent.trim());
    }
    blockContent = "";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushBlock();
      if (currentPage) pages.push(currentPage);
      currentPage = { label: cleanLabel(trimmed.replace(/^##\s*/, "").trim()), blocks: new Map() };
      currentBlock = null;
    } else if (trimmed.startsWith("### ")) {
      flushBlock();
      currentBlock = trimmed.replace(/^###\s*/, "").trim();
    } else if (trimmed === "---") {
      flushBlock();
      currentBlock = null;
    } else if (currentBlock !== null && currentPage) {
      blockContent += (blockContent ? "\n" : "") + line;
    }
  }
  flushBlock();
  if (currentPage) pages.push(currentPage);
  return pages.filter((p) => p.blocks.size > 0);
}

function findCopyForSection(
  copyPages: CopyPage[],
  zoningPages: ZoningPage[],
  pageIdx: number,
  sectionIdx: number,
  sectionLabel: string
): Record<string, string> {
  const zPage = zoningPages[pageIdx];
  const nkPage = normKey(zPage.cleanLabel);
  let copyPage =
    copyPages.find((p) => normKey(cleanLabel(p.label)) === nkPage) ||
    copyPages.find(
      (p) =>
        normKey(cleanLabel(p.label)).includes(nkPage) ||
        nkPage.includes(normKey(cleanLabel(p.label)))
    ) ||
    copyPages[pageIdx];

  if (!copyPage) return {};

  const nkSec = normKey(sectionLabel);
  let raw =
    copyPage.blocks.get(nkSec) ||
    [...copyPage.blocks.entries()].find(([k]) => k.includes(nkSec) || nkSec.includes(k))?.[1];

  if (!raw) {
    const keys = [...copyPage.blocks.keys()];
    raw = copyPage.blocks.get(keys[sectionIdx]) ?? "";
  }

  return parseStructuredFields(raw || "");
}

function fieldsToHtml(blockName: string, fields: Record<string, string>): string {
  const keys = Object.keys(fields);
  const ordered = [
    ...FIELD_ORDER.filter((f) => fields[f]),
    ...keys.filter((k) => !FIELD_ORDER.includes(k)).sort(),
  ];
  let html = `<strong>${escapeHtml(blockName)}</strong>`;
  for (const k of ordered) {
    const v = fields[k];
    if (!v) continue;
    const short = v.length > 450 ? v.slice(0, 447) + "…" : v;
    html += `<br/><span style="font-size:9px;color:#555"><u>${escapeHtml(k)}</u></span><br/><span style="font-size:10px">${escapeHtml(short).replace(/\n/g, "<br/>")}</span>`;
  }
  return html;
}

function estimateSectionHeight(html: string): number {
  const plain = html.replace(/<[^>]+>/g, " ");
  const len = plain.length;
  return Math.min(280, Math.max(96, 56 + Math.ceil(len / 55) * 14));
}

function cardHeightForPage(page: ZoningPage, copyPages: CopyPage[], zoningPages: ZoningPage[], pageIdx: number): number {
  let h = FRAME_HEADER + FRAME_PADDING * 2;
  for (let i = 0; i < page.sections.length; i++) {
    const sec = page.sections[i];
    const fields = findCopyForSection(copyPages, zoningPages, pageIdx, i, sec.label);
    const html = fieldsToHtml(sec.label, fields);
    h += estimateSectionHeight(html) + SECTION_GAP;
  }
  return h;
}

async function miroRequest(method: string, path: string, body?: unknown) {
  const response = await fetch(`${MIRO_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${MIRO_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Miro API error: ${response.status} — ${error}`);
  }
  return response.json();
}

/** Supprime uniquement les éléments à droite du zoning (colonne copy précédente), sans toucher au zoning + Prévu. */
async function deleteCopyColumnItems(boardId: string, minCenterX: number) {
  let cursor: string | undefined;
  for (;;) {
    const path = cursor
      ? `/boards/${boardId}/items?limit=50&cursor=${encodeURIComponent(cursor)}`
      : `/boards/${boardId}/items?limit=50`;
    const res = await miroRequest("GET", path);
    const data: { id: string; position?: { x: number } }[] = res.data || [];
    for (const item of data) {
      const x = item.position?.x ?? 0;
      if (item.id && x >= minCenterX) {
        try {
          await miroRequest("DELETE", `/boards/${boardId}/items/${item.id}`);
        } catch {
          /* ignore */
        }
      }
    }
    cursor = res.cursor as string | undefined;
    if (!cursor || data.length === 0) break;
  }
}

async function createCardWithCopy(
  boardId: string,
  page: ZoningPage,
  pageIdx: number,
  zoningPages: ZoningPage[],
  copyPages: CopyPage[],
  x: number,
  y: number
) {
  const cardHeight = cardHeightForPage(page, copyPages, zoningPages, pageIdx);
  const theme = getSprintTheme(page);

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: { shape: "rectangle", content: "" },
    style: {
      fillColor: theme.card,
      borderColor: theme.header,
      borderWidth: "2",
      fillOpacity: "1",
    },
    position: { x, y, origin: "center" },
    geometry: { width: CARD_WIDTH, height: cardHeight },
  });

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: {
      shape: "rectangle",
      content: `<strong style="color:#fff">${escapeHtml(page.cleanLabel).toUpperCase()}</strong>`,
    },
    style: {
      fillColor: theme.header,
      borderColor: theme.header,
      borderWidth: "2",
      fillOpacity: "1",
      fontSize: "11",
      fontFamily: "open_sans",
      textAlign: "center",
    },
    position: { x, y: y - cardHeight / 2 + FRAME_HEADER / 2, origin: "center" },
    geometry: { width: CARD_WIDTH, height: FRAME_HEADER },
  });

  let offset = FRAME_HEADER + FRAME_PADDING;
  for (let i = 0; i < page.sections.length; i++) {
    const sec = page.sections[i];
    const fields = findCopyForSection(copyPages, zoningPages, pageIdx, i, sec.label);
    const html = fieldsToHtml(sec.label, fields);
    const sh = estimateSectionHeight(html);
    const sectionY = y - cardHeight / 2 + offset + sh / 2;

    await miroRequest("POST", `/boards/${boardId}/shapes`, {
      data: { shape: "rectangle", content: html },
      style: {
        fillColor: theme.section,
        borderColor: theme.header,
        borderWidth: "2",
        fillOpacity: "1",
        fontSize: "10",
        fontFamily: "open_sans",
        textAlign: "left",
      },
      position: { x, y: sectionY, origin: "center" },
      geometry: { width: CARD_WIDTH - FRAME_PADDING * 2, height: sh },
    });
    offset += sh + SECTION_GAP;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { boardId, copyText, zoningText } = await request.json();

    if (!boardId || !zoningText?.trim()) {
      return NextResponse.json({ error: "Board ID et zoning requis" }, { status: 400 });
    }
    if (!copyText?.trim()) {
      return NextResponse.json({ error: "Copywriting requis" }, { status: 400 });
    }

    const zoningPages = parseZoningToPages(zoningText);
    if (zoningPages.length === 0) {
      return NextResponse.json({ error: "Zoning invalide" }, { status: 400 });
    }

    const copyPages = parseCopyToStructure(copyText);
    if (copyPages.length === 0) {
      return NextResponse.json({ error: "Copywriting illisible (attendu ## page / ### bloc)" }, { status: 400 });
    }

    const zoningRight = getZoningRightEdgeX(zoningPages);
    const shift = zoningRight + COPY_COLUMN_GAP;
    await deleteCopyColumnItems(boardId, zoningRight + COPY_COLUMN_GAP / 2);

    const mainPage = zoningPages[0];
    const otherPages = zoningPages.slice(1);
    const secondaryPages = otherPages.filter((p) => p.type !== "utility");
    const utilityPages = otherPages.filter((p) => p.type === "utility");

    const totalSecondaryWidth = secondaryPages.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
    const mainX = Math.max(totalSecondaryWidth / 2, CARD_WIDTH / 2) + shift;
    const mainCardHeight = cardHeightForPage(mainPage, copyPages, zoningPages, 0);
    const mainY = mainCardHeight / 2 + 40;

    await miroRequest("POST", `/boards/${boardId}/shapes`, {
      data: {
        shape: "rectangle",
        content: `<strong style="color:#5c4a00">← Zoning à gauche</strong><br/><strong>COPYWRITING</strong>`,
      },
      style: {
        fillColor: "#fff9e6",
        borderColor: "#c9a227",
        borderWidth: "2",
        fillOpacity: "1",
        fontSize: "10",
        fontFamily: "open_sans",
        textAlign: "center",
      },
      position: { x: mainX, y: 22, origin: "center" },
      geometry: { width: Math.min(CARD_WIDTH + 80, 320), height: 40 },
    });

    const mainYCopy = mainCardHeight / 2 + 40 + 36;
    await createCardWithCopy(boardId, mainPage, 0, zoningPages, copyPages, mainX, mainYCopy);

    const secondaryRowY = mainYCopy + mainCardHeight / 2 + ROW_GAP;
    for (let idx = 0; idx < secondaryPages.length; idx++) {
      const page = secondaryPages[idx];
      const pIdx = zoningPages.indexOf(page);
      const childX = idx * (CARD_WIDTH + CARD_GAP) + shift;
      const childCardHeight = cardHeightForPage(page, copyPages, zoningPages, pIdx);
      const childY = secondaryRowY + childCardHeight / 2;
      await createCardWithCopy(boardId, page, pIdx, zoningPages, copyPages, childX, childY);
    }

    if (utilityPages.length > 0) {
      const maxSecondaryHeight = Math.max(
        ...secondaryPages.map((p) => cardHeightForPage(p, copyPages, zoningPages, zoningPages.indexOf(p))),
        0
      );
      const utilityRowY = secondaryRowY + maxSecondaryHeight + ROW_GAP / 2;
      const totalUtilityWidth = utilityPages.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
      const utilityStartX = totalSecondaryWidth / 2 - totalUtilityWidth / 2 + shift;

      for (let idx = 0; idx < utilityPages.length; idx++) {
        const page = utilityPages[idx];
        const pIdx = zoningPages.indexOf(page);
        const childX = utilityStartX + idx * (CARD_WIDTH + CARD_GAP);
        const childCardHeight = cardHeightForPage(page, copyPages, zoningPages, pIdx);
        const childY = utilityRowY + childCardHeight / 2;
        await createCardWithCopy(boardId, page, pIdx, zoningPages, copyPages, childX, childY);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur export Miro" },
      { status: 500 }
    );
  }
}
