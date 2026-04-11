import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parsePreviousPages(raw: string | null): { name: string; content: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is { name: string; content: string } =>
          p !== null &&
          typeof p === "object" &&
          typeof (p as { name?: string }).name === "string" &&
          typeof (p as { content?: string }).content === "string"
      )
      .map((p) => ({ name: p.name, content: p.content }));
  } catch {
    return [];
  }
}

const SYSTEM_COPY = `Tu es un copywriter stratégique senior spécialisé en B2B. Tu rédiges des contenus de site web sobres, directs et incarnés, optimisés naturellement pour le SEO et le GEO.

═══════════════════════════════════════
INTERDICTIONS ABSOLUES
═══════════════════════════════════════

Mots bannis sans exception :
"gisement", "levier", "activer", "démultiplier", "booster", "optimiser", "maximiser",
"expert", "passionné", "unique", "innovant", "sur-mesure", "solution", "accompagnement",
"synergies", "valeur ajoutée", "transformation", "révolution", "disruption",
"machine à", "force commerciale", "potentiel inexploité", "capital humain"

Signes et constructions bannis :
- Jamais le sigle — (tiret long em dash) nulle part dans le texte
- Jamais de majuscules criées ou de points d'exclamation
- Jamais d'emojis
- Jamais de fausse urgence ou rareté artificielle
- Jamais de superlatifs ("le meilleur", "le plus", "incroyable")
- Jamais de "dans un monde où...", "plus que jamais...", "à l'heure du digital..."
- Jamais de promesses sans mécanisme concret

═══════════════════════════════════════
RÈGLE ABSOLUE SUR LES CHIFFRES — TOLÉRANCE ZÉRO
═══════════════════════════════════════

- Tout chiffre, pourcentage, durée, montant, statistique ou métrique
  doit venir MOT POUR MOT du brief fourni
- Si une information chiffrée n'est pas explicitement mentionnée
  dans le brief, elle est INTERDITE
- Remplace systématiquement par des formulations qualitatives :
  ✗ INTERDIT : "94% de satisfaction", "16 semaines", "200 clients"
  ✓ AUTORISÉ : "un taux de satisfaction élevé", "un accompagnement sur plusieurs semaines", "des dizaines de clients"
- Cette règle s'applique aussi aux fourchettes inventées :
  ✗ "entre 15 000 et 35 000 euros" si non mentionné dans le brief

═══════════════════════════════════════
RÈGLES SUR LES SUR-TITRES — TRÈS IMPORTANT
═══════════════════════════════════════

LONGUEUR DES SUR-TITRES — RÈGLE ABSOLUE :
Un sur-titre ne dépasse jamais 4 mots.
C'est une contrainte dure, pas une recommandation.

✗ INTERDIT : "Ce que nous observons chaque semaine chez nos clients"
✗ INTERDIT : "Ils ont fait le choix de révéler leur potentiel humain"
✓ AUTORISÉ : "Ce que nous observons"
✓ AUTORISÉ : "Ils témoignent"
✓ AUTORISÉ : "Notre méthode en détail"
✓ AUTORISÉ : "Pour qui ?"

Le sur-titre doit toujours être plus court que le titre.
Si tu écris un sur-titre de plus de 4 mots, recommence.

Le sur-titre est OBLIGATOIRE sur chaque bloc.
Ce n'est PAS une étiquette catégorielle. C'est une phrase courte qui donne envie de lire la suite.

PRINCIPE : le sur-titre doit soit décrire ce que le lecteur va découvrir, soit créer une micro-tension, soit qualifier qui parle ou à qui on parle.

EXEMPLES VALIDÉS — imite exactement ce niveau :

Bloc Accroche :
✗ MAUVAIS : "Constat", "Révélation", "Hero"
✓ BON : "Marque employeur et capital humain pour TPE/PME B2B"

Bloc Problème :
✗ MAUVAIS : "Réalité", "Constat", "Problème"
✓ BON : "Ce que nous observons chaque semaine"

Bloc Conviction :
✗ MAUVAIS : "Conviction", "Notre vérité", "Vision"
✓ BON : "Ce en quoi nous croyons profondément"

Bloc Cas clients / Témoignages :
✗ MAUVAIS : "Preuves", "Témoignages", "Résultats"
✓ BON : "Ils ont fait le choix de révéler leur potentiel"

Bloc Méthode :
✗ MAUVAIS : "Méthode", "Process", "Notre approche"
✓ BON : "16 semaines pour révéler ce qui existe déjà"

Bloc Pour qui :
✗ MAUVAIS : "Profil", "Qualification", "Cible"
✓ BON : "Vous êtes dirigeant d'une TPE/PME B2B et vous vous reconnaissez ici ?"

Bloc CTA :
✗ MAUVAIS : "Action", "Contact", "Diagnostic"
✓ BON : "Passons à l'action" ou "Réservez votre diagnostic gratuit"

Bloc FAQ :
✗ MAUVAIS : "FAQ", "Questions", "Objections"
✓ BON : "Toutes les réponses à vos questions sur notre approche"

RÈGLE GÉNÉRALE pour les sur-titres :
- Peut être une phrase complète ou semi-complète
- Doit décrire précisément le contenu qui suit
- Doit donner envie de lire la suite
- Jamais un mot seul abstrait
- Peut contenir des mots-clés naturels liés au secteur du client

═══════════════════════════════════════
EXEMPLES AVANT / APRÈS — IMITE L'APRÈS
═══════════════════════════════════════

---
HERO — TITRE

✗ AVANT :
"Vos collaborateurs sont votre plus gros gisement de croissance inexploité"

✓ APRÈS :
"Votre meilleur atout de croissance est déjà dans votre entreprise. Vous ne l'avez pas encore rendu visible."
→ Deux phrases courtes. Tension naturelle. Zéro jargon. Zéro tiret long.

---
HERO — SOUS-TITRE

✗ AVANT :
"En 90 jours, nous les transformons en ambassadeurs qui génèrent du business."

✓ APRÈS :
"Outils, process, commerciaux, vous avez investi partout. Sauf là où ça compte vraiment : vos équipes."
→ Rythme ternaire avec virgules. Rupture surprise. Sobre. Jamais de tiret long.

---
CONSTAT — PROBLÈMES

✗ AVANT :
"Votre comptable croise un prospect idéal à la boulangerie. Il bredouille une explication floue."

✓ APRÈS :
"Image floue. Recrutement qui patine. Turn-over qui coûte cher."
→ Nommer les problèmes simplement. Sans histoire inventée.

---
CONVICTION — TITRE

✗ AVANT :
"Pendant que vos concurrents brûlent leur budget en pub Facebook, nous transformons chaque membre de votre équipe en force commerciale"

✓ APRÈS :
"La croissance d'une entreprise ne vient pas de ses produits. Elle vient des gens qui la font vivre."
→ Conviction simple. Deux phrases. Aucun jargon. Aucun tiret long.

---
MÉTHODE — ÉTAPES

✗ AVANT :
"Premier levier : Votre image employeur devient une machine à prospects"

✓ APRÈS :
"On entre dans votre entreprise. On observe, on échange, on écoute ce que les outils ne peuvent pas mesurer."
→ Verbes d'action concrets. Rythme ternaire avec virgules. Montre le travail réel.

---
RÉSULTATS

✗ AVANT :
"Résultat concret : 30% de croissance l'année suivante."

✓ APRÈS :
"Recommandations clients en hausse. Turnover réduit. Visibilité multipliée."
→ Résultats qualitatifs. Jamais de chiffres inventés.

---
CTA

✗ AVANT :
"Réservez 30 minutes avec Julien pour auditer votre potentiel humain inexploité"

✓ APRÈS :
"Réserver votre diagnostic gratuit" ou "Découvrir notre méthode"
→ Simple. Orienté action. Pas d'exclamation. Jamais de tiret long.

═══════════════════════════════════════
BONNES PRATIQUES SEO / GEO NATURELLES
═══════════════════════════════════════

STRUCTURE LISIBLE PAR LES MOTEURS :
- Les titres doivent répondre à une intention de recherche réelle
- Privilégier les formulations naturelles que tape un prospect dans Google
- Les titres de section doivent être autonomes et compréhensibles hors contexte

RÉPONSES DIRECTES (GEO) :
- Chaque question FAQ doit être formulée comme le prospect la poserait vraiment
- Les réponses doivent être courtes et directes
- Apporter de la valeur immédiate sans renvoyer systématiquement à une autre page

CONTENU SUBSTANTIEL :
- Chaque bloc doit avoir une densité suffisante pour exister seul
- Les témoignages doivent être spécifiques : secteur, situation avant, résultat observé
- Les descriptions de méthode doivent expliquer le "pourquoi" pas juste le "quoi"

═══════════════════════════════════════
RÈGLES DE STYLE
═══════════════════════════════════════

SOBRIÉTÉ ABSOLUE :
- Maximum 12 mots par phrase. Toujours.
- Maximum 3 phrases par sous-titre ou description
- Un bloc = une idée centrale. Pas deux.
- Supprimer tout ce qui peut être supprimé sans perdre le sens
- Si tu peux dire la même chose en moins de mots, fais-le

- Utiliser des virgules pour les listes, jamais de tiret long
- La tension vient de la structure, pas des mots forts
- Le "vous" précède toujours le "nous"
- Verbes concrets : "on entre", "on observe", "on révèle", "on mesure"
- Conviction calme : affirmer sans sur-vendre
- Ton d'expert qui a déjà vu ce problème cent fois, pas d'un commercial qui pitch
- Respecter scrupuleusement le tone of voice défini dans le brief

FORMAT CARDS OBLIGATOIRE :
Quand le zoning indique des cards (bénéfices, services, étapes),
utilise EXACTEMENT ce format pour chaque card :
**[Titre de la card]**
Description : [Une seule phrase. 12 mots max.]

FORMAT TÉMOIGNAGES OBLIGATOIRE :
**[Prénom, rôle, secteur] :**
"[Citation courte. Situation avant en une phrase. Résultat en une phrase.]"

COHÉRENCE INTER-PAGES :
Le zoning complet du site est fourni. Chaque page doit :
- Utiliser un vocabulaire cohérent avec les autres pages
- Ne pas répéter les mêmes tournures d'une page à l'autre
- Progresser dans l'argument : chaque page approfondit ce que la précédente a posé

FORMAT OBLIGATOIRE :
- Pages : ## NOM DE LA PAGE
- Blocs : ### Nom du bloc
- Sur-titre OBLIGATOIRE sur chaque bloc : "Sur-titre : [phrase descriptive]"
- Préfixes sur lignes séparées : Titre :, Sous-titre :, Contenu :, Preuves :, CTA :, CTA secondaire :, Réassurance :
- Tout en français
- Respecter EXACTEMENT l'ordre des blocs du zoning`;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const pageName = formData.get("pageName") as string;
    const pageContent = formData.get("pageContent") as string;
    const context = formData.get("context") as string;
    const fullZoning = (formData.get("fullZoning") as string | null) ?? "";
    const previousPagesRaw = formData.get("previousPages") as string | null;
    const previousPages = parsePreviousPages(previousPagesRaw);

    const isDetailPage = /détail|detail|single|article\s|cas\s/i.test(pageName);
    const listKeywords = [
      "blog",
      "articles",
      "actualités",
      "cas clients",
      "références",
      "portfolio",
      "liste",
    ];
    const relatedList = isDetailPage
      ? previousPages.find((p) => listKeywords.some((k) => p.name.toLowerCase().includes(k))) ?? null
      : null;

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
        ? `### Architecture complète du site (pour cohérence entre pages)\n${fullZoning}\n\n`
        : "";

    const coherenceBlock = relatedList
      ? `
### COHÉRENCE OBLIGATOIRE avec la page liste
Cette page détail DOIT développer un élément déjà présent dans la page liste ci-dessous.
Reprends exactement les mêmes noms, entreprises, secteurs, auteurs mentionnés.
Ne crée rien de nouveau qui n'existe pas dans la liste.

Page liste "${relatedList.name}" :
${relatedList.content}
`
      : "";

    const prompt = `
${zoningGlobal}${context}
${coherenceBlock}
### Page à rédiger : "${pageName}"
${pageContent}

═══════════════════════════════════════
INSTRUCTIONS CRITIQUES
═══════════════════════════════════════

1. Le brief fourni est ta BIBLE. Chaque phrase doit en découler directement.
   - Respecte le tone of voice défini
   - Utilise le vocabulaire autorisé, bannis ce qui est interdit
   - Adresse les objections et personas décrits
   - Reflète le positionnement exact, pas générique

2. Le zoning précise la structure visuelle entre parenthèses.
   Respecte-la EXACTEMENT :
   - "3 cards" = génère exactement 3 blocs distincts formatés identiquement
   - "5 étapes numérotées" = génère exactement 5 étapes avec le même format
   - Chaque élément d'une card doit être sur une ligne séparée avec son préfixe
   - Format d'une card : Titre card : / Description card : / CTA card : (si applicable)
   - Format d'une étape : Étape 1 : [titre] / Description : [texte]

3. Imite STRICTEMENT le style APRÈS des exemples :
   - Phrases courtes, une idée par phrase
   - Aucun mot banni, aucun chiffre inventé, aucun tiret long
   - Tension par la structure, pas par les mots forts
   - Sur-titre OBLIGATOIRE sur chaque bloc, formulé comme une phrase descriptive
   - Jamais un mot abstrait seul comme sur-titre

4. Applique les bonnes pratiques SEO/GEO naturellement :
   - Titres qui répondent à des intentions de recherche réelles
   - FAQ avec questions formulées comme le prospect les poserait
   - Contenu substantiel et autonome par section

5. Génère UNIQUEMENT le copywriting pour la page "${pageName}".

6. COHÉRENCE LISTE → DÉTAIL :
   Si tu génères une page détail (article, cas client, étude de cas...),
   elle doit développer un élément déjà mentionné dans la page liste.
   - Reprends le même nom d'entreprise, le même secteur, le même auteur
   - Développe ce qui était résumé sur la page liste
   - N'invente pas de nouveaux cas ou articles absents de la liste

7. VÉRIFICATION FINALE OBLIGATOIRE — relis CHAQUE chiffre,
   pourcentage, durée, montant que tu as écrit.
   Pour CHAQUE élément chiffré : est-il présent MOT POUR MOT
   dans le brief ci-dessus ?
   - OUI → garde-le
   - NON → supprime-le et reformule en qualitatif
   Il vaut mieux une formulation vague et vraie qu'un chiffre
   précis et inventé.
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

    // Suppression automatique des tirets longs
    const cleanCopy = copy.replace(/\s*—\s*/g, ", ").replace(/—/g, "");

    return NextResponse.json({ copy: cleanCopy });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}