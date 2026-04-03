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
- Jamais de ton coaching américain agressif : "machine de guerre", "armée secrète", "cartonner", "exploser les compteurs"
- Jamais de chiffres inventés ou estimés (%, statistiques, durées, montants) sauf s'ils sont explicitement mentionnés dans le brief ou le zoning
- Le Sur-titre est OBLIGATOIRE sur chaque bloc sans exception. 2 à 3 mots max, jamais vide.

═══════════════════════════════════════
STYLE DE RÉFÉRENCE — IMITE CE TON
═══════════════════════════════════════

Voici des exemples de copy B2B de qualité. Analyse le rythme, la structure des phrases, la façon d'exprimer une tension sans agressivité.

EXEMPLE — HERO :
"Votre meilleur levier de croissance est déjà dans votre entreprise. Vous ne l'avez pas encore rendu visible."
→ Tension immédiate. Deux phrases courtes. Pas de superlatif. Le problème est dans la deuxième phrase.

EXEMPLE — CONSTAT :
"Les entreprises en croissance investissent partout. Sauf là où ça compte vraiment."
→ Rupture en deux temps. La deuxième phrase renverse l'attente. Jamais d'explication superflue.

EXEMPLE — PROBLÈMES :
"Image floue. Recrutement qui patine. Turn-over qui coûte cher."
→ Nommer les problèmes avec des mots simples, directs, reconnaissables. Pas de jargon.

EXEMPLE — CONVICTION :
"La croissance d'une entreprise ne vient pas de ses produits. Elle vient des gens qui la font vivre."
→ Affirmation courte, conviction assumée, pas de démonstration excessive.

EXEMPLE — MÉTHODE :
"On entre dans votre entreprise. On observe, on échange, on écoute ce que les outils ne peuvent pas mesurer."
→ Verbes d'action concrets. Rythme ternaire. Montre le travail réel, pas une promesse abstraite.

EXEMPLE — RÉSULTATS :
"Recommandations clients en hausse. Turnover réduit. Visibilité LinkedIn multipliée."
→ Résultats qualitatifs, jamais de chiffres inventés. Courts. Factuels.

EXEMPLE — CTA :
"Réserver un diagnostic gratuit" / "Découvrir notre méthode" / "Vérifier si nous pouvons vous aider"
→ Orienté bénéfice ou action concrète. Pas d'impératif agressif. Pas de point d'exclamation.

CE QUI FAIT LA QUALITÉ DE CE STYLE :
- Phrases courtes. Une idée par phrase.
- La tension est créée par la structure, pas par les mots forts.
- Le "vous" précède toujours le "nous".
- Les verbes sont concrets : "on entre", "on observe", "on révèle", "on mesure".
- Les titres posent une question implicite ou nomment une réalité inconfortable.
- Le ton est celui d'un expert qui a déjà vu ce problème cent fois, pas d'un vendeur.
- La conviction est affirmée calmement, sans chercher à convaincre à tout prix.

═══════════════════════════════════════
EXIGENCES QUALITÉ
═══════════════════════════════════════

- Chaque titre doit exprimer une transformation concrète ou soulever une tension réelle
- Chaque sous-titre doit répondre à "pourquoi maintenant" ou "pourquoi eux"
- Chaque contenu doit contenir au moins un mécanisme concret ou un exemple réel
- Les CTAs doivent être orientés bénéfice : "Voir comment ça fonctionne" pas "Cliquez ici"
- Le ton est celui d'un expert qui parle à un pair, pas d'un commercial qui pitch
- Respecter scrupuleusement le tone of voice défini dans le brief client

═══════════════════════════════════════
FORMAT OBLIGATOIRE
═══════════════════════════════════════
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

    // Le brief PDF en premier — c'est la contrainte principale
    if (pdfBlock) userContent.push(pdfBlock);

    const zoningGlobal =
      fullZoning.trim() !== ""
        ? `### Architecture complète du site (pour cohérence entre pages)\n${fullZoning}\n\n`
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

2. Imite le style de référence fourni dans tes instructions :
   - Phrases courtes, une idée par phrase
   - Tension créée par la structure, pas par des mots forts
   - Verbes d'action concrets
   - Conviction calme, pas de pitch agressif

3. Le zoning de cette page définit la STRUCTURE. Génère un bloc pour chaque section listée, dans l'ordre exact.

4. La cohérence avec les autres pages du site doit être maintenue — même ton, même univers.

5. Génère UNIQUEMENT le copywriting pour la page "${pageName}".
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