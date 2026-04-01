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

    const systemPrompt = `Tu es un expert en copywriting CRO, SEO et GEO. Tu aides à réviser des blocs de copywriting pour un site web.

Contexte :
- Page : ${pageLabel}
- Bloc : ${blockLabel}
- Contenu actuel du bloc :
${blockContent}

Tu peux :
1. Réviser directement le bloc selon les instructions → retourne JSON avec "revised" (nouveau contenu complet) ET "message" (courte explication)
2. Répondre à une question ou demander des précisions → retourne JSON avec seulement "message" (pas de "revised")

IMPORTANT : Réponds TOUJOURS en JSON valide avec ce format :
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