/** Parsing zoning + mise en page cartes Miro (partagé miro / miro-copy) */

export const CARD_WIDTH = 240;
export const CARD_GAP = 60;
export const SECTION_GAP = 8;
export const FRAME_HEADER = 52;
export const FRAME_PADDING = 12;
export const ROW_GAP = 300;

/** Couleurs par sprint : fond carte, bandeau titre, blocs sections */
export const SPRINT_THEMES: Record<number, { card: string; header: string; section: string }> = {
  1: { card: "#e3f2fd", header: "#1e88e5", section: "#bbdefb" },
  2: { card: "#fce4ec", header: "#e91e63", section: "#f8bbd0" },
  3: { card: "#e8f5e9", header: "#43a047", section: "#c8e6c9" },
  4: { card: "#fff8e1", header: "#fb8c00", section: "#ffe0b2" },
  5: { card: "#f3e5f5", header: "#8e24aa", section: "#e1bee7" },
  6: { card: "#e0f2f1", header: "#00897b", section: "#b2dfdb" },
  7: { card: "#fff3e0", header: "#f4511e", section: "#ffccbc" },
  8: { card: "#e8eaf6", header: "#3949ab", section: "#c5cae9" },
};

const DEFAULT_THEME = { card: "#f5f5f5", header: "#757575", section: "#eeeeee" };
const UTILITY_THEME = { card: "#fafafa", header: "#9e9e9e", section: "#f5f5f5" };

export function getSprintTheme(page: { type: string; sprint: number | null }): {
  card: string;
  header: string;
  section: string;
} {
  if (page.type === "utility") return UTILITY_THEME;
  if (page.sprint && SPRINT_THEMES[page.sprint]) return SPRINT_THEMES[page.sprint];
  return DEFAULT_THEME;
}

export function extractSprintNumber(label: string): number | null {
  const match = label.match(/\[Sprint\s*(\d+)\]/i);
  return match ? parseInt(match[1]) : null;
}

export function cleanLabel(label: string): string {
  return label.replace(/\[Sprint\s*\d+\]/gi, "").trim();
}

export function normKey(s: string): string {
  return cleanLabel(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ZoningPage = {
  label: string;
  cleanLabel: string;
  type: string;
  sprint: number | null;
  sections: { label: string; objective: string }[];
};

export function parseZoningToPages(zoningText: string): ZoningPage[] {
  const pages: ZoningPage[] = [];
  const lines = zoningText.split("\n");
  let currentPage: ZoningPage | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^#{1,3} /)) {
      const rawLabel = trimmed.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim();

      if (
        rawLabel.toLowerCase().includes("zoning") ||
        rawLabel.toLowerCase().includes("architecture") ||
        rawLabel.toLowerCase().includes("sections") ||
        rawLabel.length < 2
      )
        continue;

      if (currentPage) pages.push(currentPage);

      const sprint = extractSprintNumber(rawLabel);
      const clean = cleanLabel(rawLabel);
      const isEntry = clean.toUpperCase().startsWith("ENTRÉE");
      const type =
        clean.toLowerCase().includes("mention") ||
        clean.toLowerCase().includes("politique") ||
        clean.toLowerCase().includes("404") ||
        clean.toLowerCase().includes("cgv")
          ? "utility"
          : isEntry
            ? "entry"
            : pages.length === 0
              ? "main"
              : "secondary";

      currentPage = { label: rawLabel, cleanLabel: clean, type, sprint, sections: [] };
    } else if (trimmed.startsWith("- ") && currentPage) {
      const content = trimmed.slice(2);
      const boldMatch = content.match(/^\*\*([^*]+)\*\*/);
      const label = boldMatch
        ? boldMatch[1].replace(/\s*:\s*$/, "").trim()
        : content.split(":")[0].replace(/\*\*/g, "").trim();
      const objective = content
        .replace(/^\*\*[^*]+\*\*\s*:?\s*/, "")
        .replace(/^\s*:\s*/, "")
        .replace(/\*\*Objectif CRO\s*:\*\*\s*/i, "")
        .replace(/\*\*/g, "")
        .trim();

      if (label.length > 1) {
        currentPage.sections.push({ label, objective });
      }
    }
  }

  if (currentPage) pages.push(currentPage);
  return pages.filter((p) => p.cleanLabel && p.sections.length > 0);
}

export function getSectionFill(page: { type: string; sprint: number | null }): string {
  return getSprintTheme(page).section;
}

const LEGEND_WIDTH = 180;

/**
 * Abscisse du bord droit du cluster « zoning seul » (cartes + légende sprints si présente).
 * Sert à placer la colonne copywriting à droite sans chevauchement.
 */
export function getZoningRightEdgeX(pages: ZoningPage[]): number {
  const secondaryPages = pages.slice(1).filter((p) => p.type !== "utility");
  const n = secondaryPages.length;
  const totalSecondaryWidth = n > 0 ? n * CARD_WIDTH + (n - 1) * CARD_GAP : 0;
  const mainX = Math.max(totalSecondaryWidth / 2, CARD_WIDTH / 2);
  let right = mainX + CARD_WIDTH / 2;
  if (n > 0) {
    right = Math.max(right, (n - 1) * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH);
  }
  const sprintNumbers = [...new Set(pages.map((p) => p.sprint).filter((s): s is number => s !== null))];
  if (sprintNumbers.length > 0) {
    const legendCenterX = totalSecondaryWidth + CARD_GAP * 2 + LEGEND_WIDTH / 2;
    right = Math.max(right, legendCenterX + LEGEND_WIDTH / 2);
  }
  return right;
}

export const COPY_COLUMN_GAP = 140;
