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
    const activePage = (formData.get("activePage") as string | null) ?? "";
    const historyRaw = formData.get("history") as string;
    const files = formData.getAll("files") as File[];
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    const systemPrompt = `Tu es un assistant copywriter et architecte web senior.
Tu travailles sur un projet de site web avec le zoning et le copywriting fournis.
Tu peux corriger, améliorer, reformuler ou restructurer à la demande.
Tu peux traiter les retours client fournis en PDF ou texte.

IMPORTANT : Réponds TOUJOURS en texte, JAMAIS en JSON, JAMAIS en markdown, et sans backticks.

Quand tu modifies le zoning, réponds en deux parties séparées par ---ZONING--- :
1) D'abord une phrase d'explication courte.
2) Puis la ligne exacte : ---ZONING---
3) Puis le zoning complet.

Exemple :
J'ai ajouté les 6 pages manquantes dans le Sprint 2.
---ZONING---
## Accueil [Sprint 1]
...

Quand tu modifies le copy, réponds avec ---COPY--- puis le copy complet de CETTE PAGE UNIQUEMENT.

Sinon, réponds normalement en texte (une réponse courte et claire).

ZONING ACTUEL :
${zoning || "Pas encore généré"}

${activePage ? `PAGE ACTIVE : ${activePage}\n\nCOPY DE CETTE PAGE :\n${copy}` : `COPY ACTUEL :\n${copy || "Pas encore généré"}`}`;

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

    if (text.includes("---ZONING---")) {
      const parts = text.split("---ZONING---");
      return NextResponse.json({
        message: parts[0].trim(),
        updatedZoning: (parts[1] ?? "").trim(),
      });
    }
    if (text.includes("---COPY---")) {
      const parts = text.split("---COPY---");
      return NextResponse.json({
        message: parts[0].trim(),
        updatedCopy: (parts[1] ?? "").trim(),
      });
    }
    return NextResponse.json({ message: text });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Chat API error:", errorMessage);
    return NextResponse.json(
      { message: `Erreur serveur : ${errorMessage}` },
      { status: 200 }
    );
  }
}
