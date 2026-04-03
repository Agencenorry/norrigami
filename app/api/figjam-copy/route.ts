import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId manquant" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { data, error } = await supabase
    .from("norrigami_figjam_store")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error || !data || !data.copy_text) {
    return NextResponse.json(
      { error: "Copy introuvable — clique d'abord sur Wireframes FigJam dans Kore" },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json({ copyText: data.copy_text }, { headers: corsHeaders });
}
