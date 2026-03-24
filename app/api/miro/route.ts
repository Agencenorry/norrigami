import { NextRequest, NextResponse } from "next/server";
import {
  parseZoningToPages,
  getSprintTheme,
  SPRINT_THEMES,
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

const SECTION_MIN = 56;
const SECTION_MAX = 120;

function sectionHeight(objective: string): number {
  if (!objective) return SECTION_MIN;
  const extra = Math.ceil(objective.length / 42) * 12;
  return Math.min(SECTION_MAX, Math.max(SECTION_MIN, 52 + extra));
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

function getCardHeight(page: ZoningPage) {
  let h = FRAME_HEADER + FRAME_PADDING * 2;
  for (const sec of page.sections) {
    h += sectionHeight(sec.objective) + SECTION_GAP;
  }
  return h;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function createCard(boardId: string, page: ZoningPage, x: number, y: number) {
  const cardHeight = getCardHeight(page);
  const theme = getSprintTheme(page);

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: { shape: "rectangle", content: "" },
    style: {
      fillColor: theme.card,
      borderColor: theme.header,
      borderWidth: "2",
      borderOpacity: "1",
      fillOpacity: "1",
      borderStyle: "normal",
    },
    position: { x, y, origin: "center" },
    geometry: { width: CARD_WIDTH, height: cardHeight },
  });

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: {
      shape: "rectangle",
      content: `<strong style="color:#ffffff">${page.cleanLabel.toUpperCase()}</strong>`,
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
    const section = page.sections[i];
    const sh = sectionHeight(section.objective);
    const sectionY = y - cardHeight / 2 + offset + sh / 2;
    const fill = theme.section;
    const prevu = section.objective
      ? `<br/><span style="font-size:9px;color:#555"><u>Prévu :</u></span><br/><span style="font-size:10px">${escapeHtml(section.objective.slice(0, 380))}${section.objective.length > 380 ? "…" : ""}</span>`
      : "";

    await miroRequest("POST", `/boards/${boardId}/shapes`, {
      data: {
        shape: "rectangle",
        content: `<strong>${escapeHtml(section.label)}</strong>${prevu}`,
      },
      style: {
        fillColor: fill,
        borderColor: theme.header,
        borderWidth: "2",
        borderOpacity: "1",
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

async function createLegend(boardId: string, sprintNumbers: number[], x: number, y: number) {
  const LEGEND_WIDTH = 180;
  const LEGEND_ITEM_HEIGHT = 36;
  const LEGEND_GAP = 8;
  const LEGEND_PADDING = 16;
  const legendHeight = LEGEND_PADDING * 2 + 30 + sprintNumbers.length * (LEGEND_ITEM_HEIGHT + LEGEND_GAP);

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: { shape: "rectangle", content: "" },
    style: {
      fillColor: "#fafafa",
      borderColor: "#bdbdbd",
      borderWidth: "2",
      borderOpacity: "1",
      fillOpacity: "1",
    },
    position: { x, y, origin: "center" },
    geometry: { width: LEGEND_WIDTH, height: legendHeight },
  });

  await miroRequest("POST", `/boards/${boardId}/shapes`, {
    data: { shape: "rectangle", content: '<strong style="color:#fff">Sprints</strong>' },
    style: {
      fillColor: "#1a1a1a",
      borderColor: "#1a1a1a",
      borderWidth: "2",
      fillOpacity: "1",
      fontSize: "11",
      fontFamily: "open_sans",
      textAlign: "center",
    },
    position: { x, y: y - legendHeight / 2 + 15, origin: "center" },
    geometry: { width: LEGEND_WIDTH, height: 30 },
  });

  for (let i = 0; i < sprintNumbers.length; i++) {
    const sprintNum = sprintNumbers[i];
    const st = SPRINT_THEMES[sprintNum] || { header: "#757575" };
    const itemY =
      y -
      legendHeight / 2 +
      LEGEND_PADDING +
      30 +
      LEGEND_GAP +
      i * (LEGEND_ITEM_HEIGHT + LEGEND_GAP) +
      LEGEND_ITEM_HEIGHT / 2;

    await miroRequest("POST", `/boards/${boardId}/shapes`, {
      data: {
        shape: "rectangle",
        content: `<strong style="color:#fff">Sprint ${sprintNum}</strong>`,
      },
      style: {
        fillColor: st.header,
        borderColor: st.header,
        borderWidth: "2",
        fillOpacity: "1",
        fontSize: "11",
        fontFamily: "open_sans",
        textAlign: "center",
      },
      position: { x, y: itemY, origin: "center" },
      geometry: { width: LEGEND_WIDTH - LEGEND_PADDING * 2, height: LEGEND_ITEM_HEIGHT },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { zoningText, projectName } = await request.json();
    const pages = parseZoningToPages(zoningText);

    if (pages.length === 0) {
      return NextResponse.json({ error: "Impossible de parser le zoning" }, { status: 400 });
    }

    const board = await miroRequest("POST", "/boards", {
      name: `Zoning — ${projectName || "Nouveau projet"}`,
      description: "Généré automatiquement par Agent Mélina",
    });

    const boardId = board.id;
    const boardUrl = board.viewLink;

    const mainPage = pages[0];
    const otherPages = pages.slice(1);
    const secondaryPages = otherPages.filter((p) => p.type !== "utility");
    const utilityPages = otherPages.filter((p) => p.type === "utility");

    const totalSecondaryWidth = secondaryPages.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
    const mainX = Math.max(totalSecondaryWidth / 2, CARD_WIDTH / 2);
    const mainCardHeight = getCardHeight(mainPage);
    const mainY = mainCardHeight / 2 + 40;

    await createCard(boardId, mainPage, mainX, mainY);

    const secondaryRowY = mainY + mainCardHeight / 2 + ROW_GAP;
    for (let idx = 0; idx < secondaryPages.length; idx++) {
      const page = secondaryPages[idx];
      const childX = idx * (CARD_WIDTH + CARD_GAP);
      const childCardHeight = getCardHeight(page);
      const childY = secondaryRowY + childCardHeight / 2;
      await createCard(boardId, page, childX, childY);
    }

    if (utilityPages.length > 0) {
      const maxSecondaryHeight = Math.max(...secondaryPages.map((p) => getCardHeight(p)), 0);
      const utilityRowY = secondaryRowY + maxSecondaryHeight + ROW_GAP / 2;
      const totalUtilityWidth = utilityPages.length * (CARD_WIDTH + CARD_GAP) - CARD_GAP;
      const utilityStartX = totalSecondaryWidth / 2 - totalUtilityWidth / 2;

      for (let idx = 0; idx < utilityPages.length; idx++) {
        const page = utilityPages[idx];
        const childX = utilityStartX + idx * (CARD_WIDTH + CARD_GAP);
        const childCardHeight = getCardHeight(page);
        const childY = utilityRowY + childCardHeight / 2;
        await createCard(boardId, page, childX, childY);
      }
    }

    const sprintNumbers = [...new Set(pages.map((p) => p.sprint).filter((s): s is number => s !== null))].sort();

    if (sprintNumbers.length > 0) {
      const legendX = totalSecondaryWidth + CARD_GAP * 2 + 180 / 2;
      const legendY = mainY;
      await createLegend(boardId, sprintNumbers, legendX, legendY);
    }

    return NextResponse.json({ boardUrl, boardId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'export Miro" }, { status: 500 });
  }
}
