import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    const content: Anthropic.MessageParam["content"] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as Anthropic.DocumentBlockParam);
    }

    const multiHint =
      files.length > 1
        ? `Tu reçois ${files.length} PDF de zoning. Fusionne et unifie le tout en un seul zoning cohérent (même format, pas de doublons de pages). `
        : "";

    content.push({
      type: "text",
      text: `${multiHint}Extrais et reformate ce zoning en respectant exactement ce format markdown :

## Nom de la page [Sprint X]

- **Nom du bloc** : Objectif en une phrase

Respecte l'ordre des pages et des blocs. Si des sprints sont mentionnés, garde-les entre crochets. Retourne uniquement le zoning formaté, sans introduction ni commentaire.`,
    });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content }],
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
