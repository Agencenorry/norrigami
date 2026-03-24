import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId manquant" },
      {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  const { readFile } = await import("fs/promises");
  const { join } = await import("path");

  try {
    const filePath = join(process.cwd(), "tmp", `${projectId}.json`);
    const content = await readFile(filePath, "utf-8");
    const project = JSON.parse(content);

    return NextResponse.json(project, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return NextResponse.json(
      { error: "Projet introuvable" },
      {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}