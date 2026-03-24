import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_COPY = `Tu es un expert en copywriting CRO, SEO et GEO (Generative Engine Optimization). Tu travailles pour une agence de création et refonte de sites web.

À partir du zoning validé et du brief copywriting fournis, génère le copywriting complet du site.

Pour chaque page du zoning, génère le copywriting de chaque bloc dans l'ordre exact du zoning.

Utilise ce format strict :

## [Nom de la page]

### [Nom du bloc]
[Copywriting du bloc]

---

Règles :
- Respecte EXACTEMENT l'ordre des pages et des blocs du zoning
- Pour les blocs Accroche : rédige un H1 percutant + sous-titre
- Pour les blocs CTA : rédige uniquement le texte du bouton
- Pour les blocs FAQ : rédige les questions ET les réponses complètes optimisées SEO/GEO
- Pour les blocs Navigation : liste les entrées de menu
- Pour les blocs Footer : liste les liens et informations
- Appuie-toi sur le brief copy, le ton, l'angle éditorial et les mots-clés fournis
- Intègre naturellement les mots-clés SEO dans les textes
- Pas d'anglicismes, tout en français
- Optimise chaque texte pour le SEO et le GEO`;

async function createWithRetry(params: Parameters<typeof client.messages.create>[0], retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.messages.create(params);
    } catch (error: unknown) {
      const isRateLimit = (error as { status?: number })?.status === 429;
      if (isRateLimit && i < retries - 1) {
        const retryAfter = (error as { headers?: Headers })?.headers?.get("retry-after");
        const waitSeconds = retryAfter ? parseInt(retryAfter) + 2 : 30;
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      } else throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const zoning = formData.get("zoning") as string;
    const brief = formData.get("brief") as string;
    const url = formData.get("url") as string;
    const notes = formData.get("notes") as string;
    const copyBrief = formData.get("copyBrief") as string;
    const keywords = formData.get("keywords") as string;
    const copyBriefFile = formData.get("copyBriefFile") as File | null;
    const keywordsFile = formData.get("keywordsFile") as File | null;

    const userContent: Anthropic.MessageParam["content"] = [];

    // Ajouter le PDF du brief copy si fourni
    if (copyBriefFile && copyBriefFile.size > 0) {
      const arrayBuffer = await copyBriefFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as Anthropic.DocumentBlockParam);
    }

    // Lire le CSV des mots-clés si fourni
    let keywordsFromFile = "";
    if (keywordsFile && keywordsFile.size > 0) {
      const text = await keywordsFile.text();
      keywordsFromFile = text.replace(/,/g, "\n").trim();
    }

    // Construire le prompt texte
    let userPrompt = "Voici les informations pour générer le copywriting :\n\n";
    if (brief) userPrompt += `### Brief client\n${brief}\n\n`;
    if (url) userPrompt += `### URL du site existant\n${url}\n\n`;
    if (notes) userPrompt += `### Notes d'entretien\n${notes}\n\n`;
    if (copyBrief) userPrompt += `### Brief copywriting\n${copyBrief}\n\n`;
    if (keywords || keywordsFromFile) {
      userPrompt += `### Mots-clés SEO\n${keywords}\n${keywordsFromFile}\n\n`;
    }
    if (zoning) userPrompt += `### Zoning validé\n${zoning}\n\n`;
    userPrompt += "Génère le copywriting complet en respectant exactement la structure du zoning.";

    userContent.push({ type: "text", text: userPrompt });

    const copyMsg = await createWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: SYSTEM_COPY,
      messages: [{ role: "user", content: userContent }],
    });

    const msg = copyMsg as { content: { type: string; text?: string }[] };
    const copy = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return NextResponse.json({ copy });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération du copywriting" }, { status: 500 });
  }
}