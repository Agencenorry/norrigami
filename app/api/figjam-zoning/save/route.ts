import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { projectId, pages, projectName } = await request.json();

    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");

    const tmpDir = join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });

    const filePath = join(tmpDir, `${projectId}.json`);
    await writeFile(filePath, JSON.stringify({ pages, projectName }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}