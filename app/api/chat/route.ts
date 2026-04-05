import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const zoning = formData.get("zoning") as string;
    const copy = formData.get("copy") as string;
    const historyRaw = formData.get("history") as string;
    const files = formData.getAll("files") as File[];
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    const systemPrompt = `Tu es un assistant copywriter et architecte web senior.
Tu travailles sur un projet de site web avec le zoning et le copywriting fournis.
Tu peux corriger, améliorer, reformuler ou restructurer à la demande.
Tu peux traiter les retours client fournis en PDF ou texte.

Quand tu modifies le zoning, réponds UNIQUEMENT avec ce JSON :
{"message": "explication courte", "updatedZoning": "nouveau zoning complet"}

Quand tu modifies le copy, réponds UNIQUEMENT avec ce JSON :
{"message": "explication courte", "updatedCopy": "nouveau copy complet"}

Sinon réponds normalement en texte.

ZONING ACTUEL :
${zoning || "Pas encore généré"}

COPY ACTUEL :
${copy || "Pas encore généré"}`;

    const messages: Anthropic.MessageParam[] = [];
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const userContent: Anthropic.MessageParam["content"] = [];
    for (const file of files) {
      if (file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as Anthropic.DocumentBlockParam);
      }
    }
    if (message) userContent.push({ type: "text", text: message });

    messages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    try {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ message: text });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
