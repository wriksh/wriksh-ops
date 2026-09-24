"use client";

import { useState } from "react";
import type { CataloguePdfKind } from "@/lib/types";

/**
 * Client-side PDF generator trigger.
 *
 * Opens the PDF in a new tab so the admin can preview while the file also
 * downloads. We use `<a target="_blank">` rather than fetch + blob so the
 * browser's built-in PDF viewer can take over (and we avoid pulling in a
 * heavyweight PDF.js just for the preview).
 *
 * The component is intentionally a thin shim: the server route does the
 * real work. Three PDF kinds are supported — "state-catalogue" (the
 * original behaviour), "experiences", and "learn" — each hits a
 * different URL but otherwise shares the same render-and-stream pipeline.
 */
export default function CatalogueGenerator({
  stateSlug,
  stateName,
  pdfKind = "state-catalogue",
  buttonLabel,
}: {
  stateSlug: string;
  stateName: string;
  pdfKind?: CataloguePdfKind;
  /** Override the button text — e.g. "Generate Experiences PDF". */
  buttonLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/catalogue/${stateSlug}${
    pdfKind === "state-catalogue" ? "/pdf" : `/${pdfKind}/pdf`
  }`;

  const onGenerate = () => {
    setError(null);
    setBusy(true);
    // Open in a new tab — Next.js routes return the PDF stream directly,
    // and the browser's PDF viewer will render it without us needing to
    // proxy the bytes through client JS.
    window.open(url, "_blank", "noopener,noreferrer");
    // We can't know exactly when the new tab finishes loading, so we just
    // clear the busy state after a short delay. The download attribute on
    // the link is set server-side.
    setTimeout(() => setBusy(false), 1500);
  };

  const label =
    buttonLabel ??
    (pdfKind === "state-catalogue"
      ? `Generate ${stateName} PDF`
      : pdfKind === "experiences"
        ? `Generate ${stateName} Experiences PDF`
        : `Generate ${stateName} Learn PDF`);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onGenerate}
        disabled={busy}
        className="rounded-full bg-gold px-6 py-2.5 font-body text-xs uppercase tracking-[0.24em] text-linen shadow-card transition hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Opening…" : label}
      </button>
      <a
        href={`${url}?download=1`}
        className="font-body text-xs uppercase tracking-[0.24em] text-umber hover:text-gold"
      >
        or direct download
      </a>
      {error ? (
        <span className="font-body text-sm text-clay">{error}</span>
      ) : null}
    </div>
  );
}
