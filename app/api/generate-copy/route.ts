import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_COPY = `Tu es un expert en copywriting CRO, SEO et GEO. Tu travailles pour une agence de création et refonte de sites web.

À partir du zoning validé et du brief, génère le copywriting complet. Même ordre de pages et de blocs que le zoning (mêmes titres de pages et mêmes noms de blocs).

FORMAT OBLIGATOIRE pour chaque bloc — utilise les champs pertinents, mets « — » seul sur une ligne pour un champ vide :

## [Nom de la page exact du zoning]

### [Nom du bloc exact du zoning]
**Titre** : [H1 ou titre principal si pertinent, sinon —]
**Sous-titre** : [accroche courte si pertinent, sinon —]
**Paragraphe** : [corps de texte, arguments, liste en phrases ; peut faire plusieurs phrases]
**CTA** : [texte du bouton ou appel à l'action si pertinent, sinon —]

Champs selon le type de bloc :
- Navigation : **Entrées** : entrée1 | entrée2 | entrée3 (les autres champs en —)
- Footer : **Paragraphe** pour les colonnes / liens, ou **Entrées** pour la liste de liens
- CTA seul : surtout **CTA**, le reste en —
- FAQ : **Question 1** : … puis **Réponse 1** : …, **Question 2** : …, **Réponse 2** : … (autant que nécessaire)
- Formulaire : **Paragraphe** pour consignes, **CTA** pour le bouton d'envoi

Entre chaque bloc : ligne --- seule.

Règles : français, pas d'anglicismes, SEO/GEO, brief et mots-clés respectés.`;

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

    const copy = copyMsg!.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return NextResponse.json({ copy });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération du copywriting" }, { status: 500 });
  }
}