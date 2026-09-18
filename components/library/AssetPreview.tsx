import type { LibraryEntry } from "@/lib/library/index";

/**
 * AssetPreview — renders the appropriate preview for a media entry.
 *
 * Photos → <img>
 * Videos → <video controls>
 * Audio  → <audio controls>
 * Docs / PDFs → <iframe> embedding the blob URL
 */
export default function AssetPreview({ entry }: { entry: LibraryEntry }) {
  const url = entry.href;
  switch (entry.kind) {
    case "photo":
      return (
        <div className="overflow-hidden rounded-2xl border border-stone/40 bg-parchment">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={entry.title}
            className="block max-h-[80vh] w-full object-contain"
          />
        </div>
      );
    case "video":
      return (
        <div className="overflow-hidden rounded-2xl border border-stone/40 bg-forest">
          <video src={url} controls className="block w-full" />
        </div>
      );
    case "audio":
      return (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-6">
          <audio src={url} controls className="w-full" />
        </div>
      );
    case "doc":
    case "pdf":
      return (
        <div className="overflow-hidden rounded-2xl border border-stone/40 bg-parchment">
          <iframe
            src={url}
            title={entry.title}
            className="block h-[80vh] w-full"
          />
        </div>
      );
    default:
      return (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-6 font-body text-sm text-ink-soft">
          No preview available for this file type.
        </div>
      );
  }
}
