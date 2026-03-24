import { NextRequest, NextResponse } from "next/server";

const copyStore = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const { projectId, pages, projectName } = await request.json();
    copyStore.set(projectId, { pages, projectName });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde copy" }, { status: 500 });
  }
}

export { copyStore };