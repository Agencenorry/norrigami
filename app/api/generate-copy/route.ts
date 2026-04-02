import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

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
   Fonction : catégoriser/contextualiser la section.
   Ex : "Sur-titre : Nos services"

2. **Titre principal** — 1 à 2 lignes, accrocheur, orienté bénéfice client.
   Préfixe avec "Titre : "
   C'est l'élément le plus lu, il doit donner envie de lire la suite.

3. **Sous-titre / chapeau** — 2 à 3 phrases.
   Préfixe avec "Sous-titre : "
   Développe le titre, apporte du contexte, adresse une douleur ou une promesse.

4. **Contenu principal** — Variable selon la section.
   Préfixe avec "Contenu : "
   Peut se décliner en prose, liste à puces, ou combinaison des deux.

5. **Éléments de preuve** (si pertinent) — Format ultra court.
   Préfixe avec "Preuves : "
   Ex : "200+ projets livrés • 98% de satisfaction • Depuis 2015"

6. **CTA principal** — 1 bouton, verbe d'action + bénéfice.
   Préfixe avec "CTA : "
   Ex : "Démarrer mon projet", "Voir nos réalisations"

7. **CTA secondaire** (si pertinent) — Alternative douce.
   Préfixe avec "CTA secondaire : "
   Ex : "En savoir plus", "Voir les tarifs"

8. **Arguments de réassurance** (si pertinent) — 1 à 3 éléments courts.
   Préfixe avec "Réassurance : "
   Ex : "Sans engagement • Réponse rapide • 100% sur mesure"

═══════════════════════════════════════
RÈGLES PAR TYPE DE BLOC
═══════════════════════════════════════

### NAVIGATION
Sur-titre : [Nom de marque/logo]
Liens : [4 à 6 items, 1 à 2 mots chacun]
CTA navbar : [1 bouton court et engageant]
CTA secondaire : [Optionnel, lien discret]

### ACCROCHE / HERO
Sur-titre : [2-3 mots de contextualisation]
Titre : [H1 percutant, orienté bénéfice, 1-2 lignes]
Sous-titre : [2-3 phrases qui développent la promesse]
CTA : [Bouton principal]
CTA secondaire : [Optionnel]
Réassurance : [1-3 arguments courts]

### INTRODUCTION (pages contenu)
Sur-titre : [Catégorie]
Titre : [Titre de section accrocheur]
Sous-titre : [2-3 phrases de contexte]

### SERVICES
Sur-titre : [2-3 mots]
Titre : [Titre accrocheur]
Sous-titre : [2-3 phrases]
Contenu : [Liste des services avec nom + description courte pour chacun]
CTA : [Bouton principal]

### CHIFFRES CLÉS / STATS
Sur-titre : [2-3 mots]
Titre : [Titre accrocheur]
Preuves : [3 à 4 stats, format : chiffre + label court + description]

### CAS CLIENT / RÉALISATIONS
Sur-titre : [2-3 mots]
Titre : [Titre accrocheur]
Sous-titre : [2-3 phrases]
Contenu : [Pour chaque cas : Nom client • Problématique • Solution • Résultat chiffré]
CTA : [Bouton]

### TÉMOIGNAGES / PREUVES SOCIALES
Sur-titre : [2-3 mots]
Titre : [Titre accrocheur]
Sous-titre : [2-3 phrases]
Contenu : [Pour chaque témoignage :
  - Citation (2 à 4 phrases, entre guillemets)
  - Prénom Nom
  - Poste / Entreprise]

### FAQ
Sur-titre : [2-3 mots]
Titre : [Titre accrocheur]
Contenu : [6 questions formulées comme le client les poserait, avec réponse complète de 3 à 5 phrases chacune, ton conversationnel]

### CTA / APPEL À L'ACTION
Sur-titre : [2-3 mots]
Titre : [Titre orienté bénéfice]
Sous-titre : [1-2 phrases de contexte]
CTA : [Bouton principal]
Réassurance : [1-3 arguments]

### FORMULAIRE DE CONTACT
Sur-titre : [2-3 mots]
Titre : [1-2 lignes]
Sous-titre : [2-3 phrases]
CTA : [Bouton d'envoi]
Réassurance : [1-3 arguments]

### FOOTER
Accroche : [1 phrase courte]
Informations : [Email, téléphone, adresse si pertinent]
Liens secondaires : [Navigation secondaire]
Mentions : [Copyright + mentions légales]

═══════════════════════════════════════
RÈGLES GÉNÉRALES
═══════════════════════════════════════
- Respecte EXACTEMENT l'ordre des pages et des blocs du zoning
- Utilise les préfixes (Sur-titre :, Titre :, Sous-titre :, etc.) sur des lignes séparées
- Appuie-toi sur le brief copy, le ton, l'angle éditorial et les mots-clés fournis
- Intègre naturellement les mots-clés SEO dans les textes sans les forcer
- Pas d'anglicismes, tout en français
- Optimise pour le SEO et le GEO (questions naturelles, réponses directes)
- Ton orienté bénéfice client, jamais centré sur l'agence
- Pas de texte lorem ipsum, tout doit être réel et utilisable directement`;

function extractPages(zoning: string): { name: string; content: string }[] {
  const pages: { name: string; content: string }[] = [];
  const lines = zoning.split("\n");
  let currentPage: { name: string; content: string } | null = null;

  for (const line of lines) {
    const pageMatch =
      line.match(/^#{1,2}\s+(.+)/) ||
      line.match(/^Page\s*:\s*(.+)/i) ||
      line.match(/^-+\s*(.+)\s*-+/);
    if (pageMatch) {
      if (currentPage) pages.push(currentPage);
      currentPage = { name: pageMatch[1].trim(), content: line + "\n" };
    } else if (currentPage) {
      currentPage.content += line + "\n";
    }
  }
  if (currentPage) pages.push(currentPage);

  if (pages.length === 0) {
    pages.push({ name: "Site complet", content: zoning });
  }

  return pages;
}

export const maxDuration = 120;

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

    // Préparer le PDF si fourni
    let pdfBlock: Anthropic.DocumentBlockParam | null = null;
    if (copyBriefFile && copyBriefFile.size > 0) {
      const arrayBuffer = await copyBriefFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      pdfBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };
    }

    // Lire le CSV des mots-clés si fourni
    let keywordsFromFile = "";
    if (keywordsFile && keywordsFile.size > 0) {
      const text = await keywordsFile.text();
      keywordsFromFile = text.replace(/,/g, "\n").trim();
    }

    // Construire le contexte commun
    let context = "Voici les informations pour générer le copywriting :\n\n";
    if (brief) context += `### Brief client\n${brief}\n\n`;
    if (url) context += `### URL du site existant\n${url}\n\n`;
    if (notes) context += `### Notes d'entretien\n${notes}\n\n`;
    if (copyBrief) context += `### Brief copywriting\n${copyBrief}\n\n`;
    if (keywords || keywordsFromFile) {
      context += `### Mots-clés SEO\n${keywords || ""}\n${keywordsFromFile}\n\n`;
    }

    const pages = extractPages(zoning || "");

    // Créer un stream ReadableStream pour envoyer les résultats au fur et à mesure
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const allCopies: string[] = [];
          const batchSize = 2;

          for (let i = 0; i < pages.length; i += batchSize) {
            const batch = pages.slice(i, i + batchSize);

            const batchResults = await Promise.all(
              batch.map(async (page) => {
                const userContent: Anthropic.MessageParam["content"] = [];

                if (pdfBlock) userContent.push(pdfBlock);

                const prompt = `${context}\n\n### Zoning de la page à traiter\n${page.content}\n\nGénère UNIQUEMENT le copywriting pour cette page "${page.name}". Respecte exactement la structure du zoning.`;
                userContent.push({ type: "text", text: prompt });

                // Streaming Anthropic pour chaque page
                let pageText = "";
                const stream = await client.messages.stream({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 3000,
                  system: SYSTEM_COPY,
                  messages: [{ role: "user", content: userContent }],
                });

                for await (const chunk of stream) {
                  if (
                    chunk.type === "content_block_delta" &&
                    chunk.delta.type === "text_delta"
                  ) {
                    pageText += chunk.delta.text;
                    // Envoyer chaque chunk au client
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`
                      )
                    );
                  }
                }

                return pageText;
              })
            );

            allCopies.push(...batchResults);
          }

          // Signaler la fin
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : "Erreur inconnue";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}