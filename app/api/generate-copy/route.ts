import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_COPY = `Tu es un expert en copywriting CRO, SEO et GEO (Generative Engine Optimization). Tu travailles pour une agence de création et refonte de sites web. Tu génères du copywriting structuré, orienté conversion, optimisé pour le référencement naturel et les moteurs IA.

À partir du zoning validé et du brief copywriting fournis, génère le copywriting complet du site.

Pour chaque page du zoning, génère le copywriting de chaque bloc dans l'ordre exact du zoning.

Utilise ce format strict :

## [Nom de la page]

### [Nom du bloc]
[Copywriting du bloc structuré selon les règles ci-dessous]

---

═══════════════════════════════════════
STRUCTURE TYPE DE CHAQUE SECTION
═══════════════════════════════════════

Chaque section doit contenir dans l'ordre, selon sa pertinence :

1. **Sur-titre** — 2 à 3 mots max. Préfixe avec "Sur-titre : "
2. **Titre principal** — 1 à 2 lignes, accrocheur, orienté bénéfice client. Préfixe avec "Titre : "
3. **Sous-titre / chapeau** — 2 à 3 phrases. Préfixe avec "Sous-titre : "
4. **Contenu principal** — Variable selon la section. Préfixe avec "Contenu : "
5. **Éléments de preuve** (si pertinent). Préfixe avec "Preuves : "
6. **CTA principal** — Préfixe avec "CTA : "
7. **CTA secondaire** (si pertinent) — Préfixe avec "CTA secondaire : "
8. **Arguments de réassurance** (si pertinent) — Préfixe avec "Réassurance : "

═══════════════════════════════════════
RÈGLES GÉNÉRALES
═══════════════════════════════════════
- Respecte EXACTEMENT l'ordre des blocs du zoning
- Utilise les préfixes sur des lignes séparées
- Intègre naturellement les mots-clés SEO
- Pas d'anglicismes, tout en français
- Ton orienté bénéfice client
- Pas de texte lorem ipsum`;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const pageName = formData.get("pageName") as string;
    const pageContent = formData.get("pageContent") as string;
    const context = formData.get("context") as string;
    const copyBriefFile = formData.get("copyBriefFile") as File | null;

    let pdfBlock: Anthropic.DocumentBlockParam | null = null;
    if (copyBriefFile && copyBriefFile.size > 0) {
      const arrayBuffer = await copyBriefFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      pdfBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    }

    const userContent: Anthropic.MessageParam["content"] = [];
    if (pdfBlock) userContent.push(pdfBlock);

    const prompt = `${context}\n\n### Zoning de la page à traiter\n${pageContent}\n\nGénère UNIQUEMENT le copywriting pour cette page "${pageName}". Respecte exactement la structure du zoning.`;
    userContent.push({ type: "text", text: prompt });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_COPY,
      messages: [{ role: "user", content: userContent }],
      stream: false,
    });

    const copy = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    return NextResponse.json({ copy });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}