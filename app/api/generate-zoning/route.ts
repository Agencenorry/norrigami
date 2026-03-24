import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_ZONING = `Tu es un expert en architecture web et UX. Tu travailles pour une agence de création et refonte de sites web.

À partir des informations fournies, génère le zoning du site : une liste de pages avec pour chacune les blocs/sections qui la composent dans l'ordre vertical.

## FORMAT DE SORTIE

Pour chaque page :

## Nom de la page [Sprint X]

- **Nom du bloc** : Objectif UX/CRO en une phrase courte

## RÈGLES DE STRUCTURE

### Entrées de menu
Si le site a des rubriques avec sous-pages, crée d'abord une entrée de menu (pas une page) puis liste les pages dedans :

## ENTRÉE : Services [Sprint X]
### Page : Services Comptabilité [Sprint X]
- **Bloc** : Objectif

### Blocs obligatoires sur toutes les pages
- Toujours commencer par **Navigation**
- Toujours finir par **FAQ SEO/AEO/GEO** (5-6 questions) puis **Footer** — SAUF sur les pages cas client liste, cas client détail et contact
- Toujours avoir soit un bloc **Accroche** soit un bloc **Introduction** en début de page (jamais "Hero Section")

### Règles par type de page
- **Pages à enjeux de conversion** (Accueil, Services, Landing) : utiliser **Accroche** (jamais "Hero Section")
- **Pages de contenu** (Cas client liste, Cas client détail, Contact, Blog) : utiliser **Introduction** (jamais "Hero Section")
- **Accueil** : inclure un bloc "Cas client mis en avant" + CTA vers la liste des cas clients
- **Pages Services** : inclure 2-3 cas clients liés au service
- **Cas client liste** : uniquement Navigation, Introduction, Filtres, Liste des cas clients, Footer. Objectif unique : pousser vers la consultation d'un cas client
- **Cas client détail** : toujours inclure un CTA de prise de RDV (le prospect est qualifié)
- **Contact** : uniquement Navigation, Introduction, Formulaire de contact, Embed Calendly, Infos pratiques et disponibilités (un seul bloc), FAQ (3 questions max), Footer
- **Landing page ville** : Navigation classique simplifiée avec ancres (pas "navigation locale"), embed Calendly directement (pas de CTA de prise de RDV), pas de FAQ

### Règles de vocabulaire — OBLIGATOIRE
- Pas d'anglicismes : "Social Proof" → "Preuves sociales", "Hero Section" → "Accroche" ou "Introduction", "Call to Action" → "Appel à l'action"
- Dans les blocs de chiffres/statistiques : ne jamais utiliser le mot "records"
- Tous les blocs en français

### Sprints
Si des sprints sont fournis, indique le numéro de sprint entre crochets après chaque nom de page : [Sprint 1], [Sprint 2], etc.
Les pages d'un même sprint auront la même couleur dans Miro.`;

async function createWithRetry(
  params: Parameters<typeof client.messages.create>[0],
  retries = 3
): Promise<Anthropic.Message> {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.messages.create({ ...params, stream: false }) as Anthropic.Message;
    } catch (error: unknown) {
      const isRateLimit = (error as { status?: number })?.status === 429;
      if (isRateLimit && i < retries - 1) {
        const retryAfter = (error as { headers?: Headers })?.headers?.get("retry-after");
        const waitSeconds = retryAfter ? parseInt(retryAfter) + 2 : 30;
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      } else throw error;
    }
  }
  throw new Error("Max retries reached");
}

async function buildContent(files: File[], pdfUrl: string, prompt: string): Promise<Anthropic.MessageParam["content"]> {
  const content: Anthropic.MessageParam["content"] = [];
  for (const file of files) {
    if (file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as Anthropic.DocumentBlockParam);
    }
  }
  if (pdfUrl?.trim()) {
    content.push({
      type: "document",
      source: { type: "url", url: pdfUrl.trim() },
    } as Anthropic.DocumentBlockParam);
  }
  content.push({ type: "text", text: prompt });
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const brief = formData.get("brief") as string;
    const url = formData.get("url") as string;
    const notes = formData.get("notes") as string;
    const pdfUrl = formData.get("pdfUrl") as string;
    const sprints = formData.get("sprints") as string;
    const files = formData.getAll("files") as File[];

    let userPrompt = "Voici les informations du client :\n\n";
    if (brief) userPrompt += `### Brief client\n${brief}\n\n`;
    if (url) userPrompt += `### URL du site existant\n${url}\n\n`;
    if (notes) userPrompt += `### Notes d'entretien\n${notes}\n\n`;
    if (sprints) userPrompt += `### Sprints\n${sprints}\n\n`;
    userPrompt += "Génère le zoning complet du site en respectant toutes les règles.";

    const zoningContent = await buildContent(files, pdfUrl, userPrompt);
    const zoningMsg = await createWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: SYSTEM_ZONING,
      messages: [{ role: "user", content: zoningContent }],
    });

    const zoning = zoningMsg.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return NextResponse.json({ zoning });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de la génération du zoning" }, { status: 500 });
  }
}