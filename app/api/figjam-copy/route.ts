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

  if (error || !data || !data.copy_text) {
    return NextResponse.json(
      { error: "Copy introuvable — clique d'abord sur Wireframes FigJam dans Norrigami" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return NextResponse.json(
    { copyText: data.copy_text },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}