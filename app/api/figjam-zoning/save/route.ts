import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { projectId, pages, projectName } = await request.json();
    await supabase.from("norrigami_figjam_store").upsert({
      project_id: projectId,
      project_name: projectName,
      pages,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}