import { NextResponse } from "next/server";
import { updateLearnHost, deleteLearnHost } from "@/lib/collections/experienceGuides";

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    const h = await updateLearnHost(params.slug, body);
    if (!h) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ host: h });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const ok = await deleteLearnHost(params.slug);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
