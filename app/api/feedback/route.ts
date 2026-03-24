import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { current, feedback, systemPrompt, brief, notes, url } = await request.json();

    let context = "";
    if (brief) context += `### Brief client original\n${brief}\n\n`;
    if (url) context += `### URL du site\n${url}\n\n`;
    if (notes) context += `### Notes d'entretien\n${notes}\n\n`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${context}---\n\nVoici le livrable actuel à corriger :\n\n${current}\n\n---\n\nInstruction de correction : ${feedback}\n\nGénère le livrable corrigé en ENTIER, en appliquant l'instruction tout en t'appuyant sur le brief original. Ne raccourcis pas, ne résume pas — chaque page et chaque section doit être présente.`,
        },
      ],
    });

    const result = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    return NextResponse.json({ result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur lors de la correction" },
      { status: 500 }
    );
  }
}