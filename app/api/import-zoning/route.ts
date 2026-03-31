import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: `Extrais et reformate ce zoning en respectant exactement ce format markdown :

## Nom de la page [Sprint X]

- **Nom du bloc** : Objectif en une phrase

Respecte l'ordre des pages et des blocs. Si des sprints sont mentionnés, garde-les entre crochets. Retourne uniquement le zoning formaté, sans introduction ni commentaire.`,
          },
        ],
      }],
    });

    const zoning = (msg as Anthropic.Message).content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    return NextResponse.json({ zoning });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur import zoning" }, { status: 500 });
  }
}