import { NextResponse } from "next/server";
import {
  getPersonBySlug,
  updatePerson,
  deletePerson,
} from "@/lib/collections/people";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const p = await getPersonBySlug(decodeURIComponent(params.slug));
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ person: p });
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const p = await updatePerson(decodeURIComponent(params.slug), body);
    if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ person: p });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const ok = await deletePerson(decodeURIComponent(params.slug));
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
