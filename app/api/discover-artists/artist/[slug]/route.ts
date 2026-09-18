import { NextResponse } from "next/server";
import {
  getDiscoverArtist,
  updateDiscoverArtist,
  deleteDiscoverArtist,
  addArtistQuotation,
  addArtistRating,
} from "@/lib/collections/artists";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const a = await getDiscoverArtist(params.slug);
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ artist: a });
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();
    if (body.__action === "addQuotation") {
      const a = await addArtistQuotation(params.slug, body.quotation);
      if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ artist: a });
    }
    if (body.__action === "addRating") {
      const a = await addArtistRating(params.slug, body.rating);
      if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ artist: a });
    }
    const a = await updateDiscoverArtist(params.slug, body);
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ artist: a });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const ok = await deleteDiscoverArtist(params.slug);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
