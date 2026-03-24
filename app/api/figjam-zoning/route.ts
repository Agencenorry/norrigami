import { NextRequest, NextResponse } from "next/server";
import { store } from "./save/route";

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
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const project = store.get(projectId);

  if (!project) {
    return NextResponse.json(
      { error: "Projet introuvable — clique d'abord sur Exporter vers FigJam dans Norrigami" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return NextResponse.json(project, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}