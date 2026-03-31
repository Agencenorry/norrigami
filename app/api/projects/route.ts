import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("norrigami_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: NextRequest) {
  const project = await request.json();
  const { error } = await supabase.from("norrigami_projects").upsert({
    id: project.id,
    name: project.name,
    created_at: project.createdAt,
    brief: project.brief || "",
    url: project.url || "",
    notes: project.notes || "",
    sprints: project.sprints || "",
    zoning: project.zoning || null,
    copy: project.copy || null,
    miro_url: project.miroUrl || null,
    miro_board_id: project.miroBoardId || null,
    copy_brief: project.copyBrief || "",
    keywords: project.keywords || "",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const { error } = await supabase.from("norrigami_projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}