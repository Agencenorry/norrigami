import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  const { data, error } = await supabase
    .from("norrigami_figjam_store")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Projet introuvable — clique d'abord sur Exporter vers FigJam" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return NextResponse.json(
    { pages: data.pages, projectName: data.project_name },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}