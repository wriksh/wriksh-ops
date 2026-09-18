import { NextResponse } from "next/server";
import { updateMediaAsset, deleteMediaAsset } from "@/lib/collections/media";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const a = await updateMediaAsset(params.id, body);
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ asset: a });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteMediaAsset(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
