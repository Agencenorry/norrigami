import { NextRequest, NextResponse } from "next/server";

const store = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const { projectId, pages, projectName } = await request.json();
    store.set(projectId, { pages, projectName });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}

export { store };