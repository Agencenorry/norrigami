import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_TRANSLATE_COPY =
  "Tu es un copywriter natif anglophone expert en marketing. Tu recois un copy en francais destine a un site web. Ton travail n'est pas de traduire mot a mot, mais de reecrire ce copy en anglais americain naturel, percutant et adapte culturellement. Adapte les expressions, le ton et les formulations pour qu'elles sonnent authentiquement anglais, pas comme une traduction.";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { copy?: string };
    const copy = body?.copy?.trim();

    if (!copy) {
      return Response.json({ error: "Le copy a traduire est requis." }, { status: 400 });
    }

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_TRANSLATE_COPY,
      messages: [{ role: "user", content: copy }],
      stream: false,
    });

    const translatedCopy = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return Response.json({ translatedCopy });
  } catch (error: unknown) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la traduction du copy." },
      { status: 500 }
    );
  }
}
