import { NextResponse } from "next/server";
import { updateExperienceGuide, deleteExperienceGuide } from "@/lib/collections/experienceGuides";

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const g = await updateExperienceGuide(params.slug, body);
    if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ guide: g });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const ok = await deleteExperienceGuide(params.slug);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
