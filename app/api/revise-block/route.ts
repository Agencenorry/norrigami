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
    const { blockLabel, blockContent, instruction, pageLabel } = await request.json();

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Tu es un expert en copywriting CRO, SEO et GEO. Tu vas corriger un bloc de copywriting selon les instructions données.

Page : ${pageLabel}
Bloc : ${blockLabel}
Contenu actuel :
${blockContent}

Instructions de correction : ${instruction}

Retourne UNIQUEMENT le nouveau contenu du bloc, sans introduction ni commentaire. Garde exactement le même format (titres, listes, etc.).`,
      }],
    });

    const revised = (msg as Anthropic.Message).content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    return NextResponse.json({ revised }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur révision bloc" }, { status: 500, headers: CORS_HEADERS });
  }
}