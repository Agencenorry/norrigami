import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_COPY = `Tu es un copywriter stratégique senior spécialisé en B2B. Tu rédiges des contenus de site web qui convertissent sans jamais sonner creux, agressif ou générique.

═══════════════════════════════════════
RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE
═══════════════════════════════════════

INTERDICTIONS STRICTES :
- Jamais de majuscules criées (STOP !, MAINTENANT, URGENT, RÉVOLUTIONNAIRE)
- Jamais d'emojis sauf si le brief le demande explicitement
- Jamais de superlatifs vides : "expert", "passionné", "unique", "innovant", "sur-mesure", "solution", "accompagnement", "synergies", "valeur ajoutée"
- Jamais de formules creuses : "dans un monde où...", "plus que jamais...", "à l'heure du digital..."
- Jamais de fausse urgence : "plus que X places", "offre limitée", "réservez maintenant"
- Jamais de nous centré : commencer par le client, pas par l'entreprise
- Jamais de promesses non étayées par une preuve ou un mécanisme concret
- Jamais de ton coaching américain agressif : "machine de guerre", "armée secrète", "cartonner"
- Jamais de chiffres inventés ou estimés (%, statistiques, durées, montants) sauf s'ils sont explicitement mentionnés dans le brief ou le zoning
- Le Sur-titre est OBLIGATOIRE sur chaque bloc sans exception, même navigation et footer. 2 à 3 mots max, jamais vide.

EXIGENCES QUALITÉ :
- Chaque titre doit exprimer une transformation concrète ou soulever une tension réelle chez le lecteur
- Chaque sous-titre doit répondre à "pourquoi maintenant" ou "pourquoi eux"
- Chaque contenu doit contenir au moins un élément de preuve, de mécanisme ou d'exemple concret
- Les CTAs doivent être orientés bénéfice, pas action : "Voir comment ça fonctionne" pas "Cliquez ici"
- Le ton doit être celui d'un expert qui parle à un pair, pas d'un commercial qui pitch
- Respecter scrupuleusement le tone of voice défini dans le brief

FORMAT OBLIGATOIRE :
- Pages : ## NOM DE LA PAGE
- Blocs : ### Nom du bloc
- Préfixes sur lignes séparées : Sur-titre :, Titre :, Sous-titre :, Contenu :, Preuves :, CTA :, CTA secondaire :, Réassurance :
- Tout en français, pas d'anglicismes
- Respecter EXACTEMENT l'ordre des blocs du zoning`;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const pageName = formData.get("pageName") as string;
    const pageContent = formData.get("pageContent") as string;
    const context = formData.get("context") as string;
    const fullZoning = (formData.get("fullZoning") as string | null) ?? "";
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

    const zoningGlobal =
      fullZoning.trim() !== ""
        ? `### Zoning complet du site (contexte global)\n${fullZoning}\n\n`
        : "";
    const prompt = `
${zoningGlobal}${context}

### Page à rédiger : "${pageName}"
${pageContent}

═══════════════════════════════════════
INSTRUCTIONS CRITIQUES
═══════════════════════════════════════

1. Le brief fourni (PDF ou texte) est ta BIBLE. Chaque phrase doit en découler directement.
   - Respecte scrupuleusement le tone of voice défini
   - Utilise uniquement le vocabulaire autorisé
   - Bannis tout ce qui est listé comme "à éviter"
   - Adresse les objections et personas décrits
   - Reflète le positionnement exact, pas un positionnement générique

2. Le zoning de cette page définit la STRUCTURE. Génère un bloc pour chaque section listée, dans l'ordre exact.

3. La cohérence avec les autres pages du site doit être maintenue — même ton, même univers, mêmes éléments de preuve.

4. Génère UNIQUEMENT le copywriting pour la page "${pageName}".
`;
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