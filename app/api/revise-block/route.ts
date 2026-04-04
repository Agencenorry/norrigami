import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { blockLabel, blockContent, instruction, pageLabel, history } = await request.json();

    const systemPrompt = `Tu es un copywriter stratégique senior spécialisé en B2B.

RÈGLES ABSOLUES :
- Jamais de majuscules criées, jamais d'emojis
- Jamais de mots bannis : "gisement", "levier", "activer", "démultiplier", "expert", "passionné", "unique", "innovant", "sur-mesure", "synergie", "valeur ajoutée", "accompagnement", "machine à", "force commerciale", "potentiel inexploité"
- Jamais de formules creuses : "dans un monde où...", "plus que jamais..."
- Jamais de chiffres inventés qui ne viennent pas du brief
- Phrases courtes. Une idée par phrase. Maximum 20 mots.
- Le "vous" précède toujours le "nous"
- Ton d'expert qui parle à un pair, pas d'un commercial qui pitch
- Sur-titres : jamais un mot abstrait isolé ("Révélation", "Conviction") — toujours contextualisant ("Ce que vous vivez", "Comment ça fonctionne")
- Si l'utilisateur demande de ne plus utiliser un mot ou un style, mémorise cette instruction pour TOUT le reste de la conversation

Contexte :
- Page : ${pageLabel}
- Bloc : ${blockLabel}
- Contenu actuel :
${String(blockContent ?? "").replace(/\*\*/g, "")}

Réponds TOUJOURS en JSON valide :
- Si tu révises : {"revised": "...", "message": "..."}
- Si tu discutes : {"message": "..."}
Retourne UNIQUEMENT le JSON, sans markdown ni backticks.`;

    const messages: Anthropic.MessageParam[] = [];

    // Ajouter l'historique de conversation
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    } else {
      messages.push({ role: "user", content: instruction });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    let parsed;
    try {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { message: text };
    }

    return NextResponse.json(parsed, { headers: CORS_HEADERS });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur révision" }, { status: 500, headers: CORS_HEADERS });
  }
}