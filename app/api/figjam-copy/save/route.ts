import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectName, copyText } = await request.json();
    await supabase.from("norrigami_figjam_store").upsert({
      project_id: projectId,
      project_name: projectName,
      copy_text: copyText,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde copy" }, { status: 500 });
  }
}