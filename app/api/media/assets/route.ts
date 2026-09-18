import { NextResponse } from "next/server";
import { listMediaAssets, createMediaAsset } from "@/lib/collections/media";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "photo" | "video" | "doc" | "audio" | null;
  const bucket = url.searchParams.get("bucket") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const assets = await listMediaAssets({ kind: kind ?? undefined, bucket, q });
  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.url || !body.kind) {
      return NextResponse.json(
        { error: "title, url, kind are required" },
        { status: 400 }
      );
    }
    const a = await createMediaAsset({
      title: String(body.title),
      kind: body.kind,
      url: String(body.url),
      thumbnailUrl: body.thumbnailUrl,
      bucket: body.bucket,
      stateSlug: body.stateSlug,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      caption: body.caption,
      credit: body.credit,
      owner: body.owner,
      uploadedBy: body.uploadedBy,
      uploadedAt: body.uploadedAt ?? new Date().toISOString(),
    });
    return NextResponse.json({ asset: a }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
