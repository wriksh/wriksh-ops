import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { logger } from "@/lib/logger";
import { createMediaAsset } from "@/lib/collections/media";
import type { MediaAssetDoc } from "@/lib/types";

/**
 * POST /api/library/upload
 *
 * Multipart upload: field `file` is the binary, fields `title`, `tags`,
 * `bucket`, `caption`, `credit` are plain text. Streams the file to
 * Vercel Blob, then inserts a `media_assets` row.
 *
 * Limits:
 *   - Default 50 MB cap. Override via env `LIBRARY_MAX_BYTES`.
 *   - Single file per request (the dropzone submits one at a time).
 *
 * Failure modes:
 *   - Missing `BLOB_READ_WRITE_TOKEN` → 503 with a clear "configure"
 *     hint (we don't silently fail).
 *   - Blob 4xx → 502 (the upstream rejected us — don't insert).
 *   - Mongo write fails after blob upload → log + 500; the blob stays
 *     in the bucket and the admin can retry by uploading the same file
 *     with the same title (we don't dedupe yet — future work).
 */
export const dynamic = "force-dynamic";

function deriveKind(mime: string): MediaAssetDoc["kind"] {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "doc";
}

export async function POST(req: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local (and to Vercel) before uploading.",
      },
      { status: 503 }
    );
  }

  const maxBytes = Number(process.env.LIBRARY_MAX_BYTES ?? 50 * 1024 * 1024);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `invalid form data: ${reason}` }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `file too large: ${file.size} bytes (cap ${maxBytes})` },
      { status: 413 }
    );
  }

  const title = (formData.get("title") ?? file.name).toString().trim();
  const bucket = (formData.get("bucket") ?? "general").toString().trim() || "general";
  const caption = formData.get("caption")?.toString().trim() || undefined;
  const credit = formData.get("credit")?.toString().trim() || undefined;
  const stateSlug = formData.get("stateSlug")?.toString().trim() || undefined;
  const rawTags = formData.get("tags")?.toString() ?? "";
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const uploadedBy = req.headers.get("x-wriksh-user") ?? "anonymous";

  // Stream the file to Vercel Blob.
  let blob;
  try {
    blob = await put(`library/${Date.now()}-${file.name}`, file, {
      access: "public",
      token,
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("library.upload.blobFailed", {
      reason,
      filename: file.name,
      size: file.size,
    });
    return NextResponse.json(
      { error: `Vercel Blob rejected the upload: ${reason}` },
      { status: 502 }
    );
  }

  // Insert the metadata row.
  try {
    const asset = await createMediaAsset({
      title,
      kind: deriveKind(file.type || ""),
      url: blob.url,
      thumbnailUrl: undefined,
      bucket,
      stateSlug,
      tags,
      caption,
      credit,
      owner: uploadedBy,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    });
    logger.info("library.upload.ok", {
      assetId: asset._id,
      bytes: file.size,
      mime: file.type,
      bucket,
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("library.upload.mongoFailed", {
      blobUrl: blob.url,
      reason,
    });
    return NextResponse.json(
      { error: `uploaded to blob but failed to record metadata: ${reason}` },
      { status: 500 }
    );
  }
}
