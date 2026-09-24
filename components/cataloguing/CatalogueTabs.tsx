"use client";

import { useState, type ReactNode } from "react";

/**
 * Lightweight client-side tab strip used by the cataloguing per-state page.
 *
 * Pure presentation — no router or fetch logic. The parent server component
 * passes the content for each tab as `panels`, and we just toggle visibility.
 *
 * Tab order matters: it matches the order on the public site (Discover →
 * Experience → Learn) and the order of the corresponding PDF generators
 * (`state-catalogue`, `experiences`, `learn`).
 */
export type CatalogueTabId = "catalogue" | "experiences" | "learn";

const TABS: { id: CatalogueTabId; label: string; eyebrow: string }[] = [
  {
    id: "catalogue",
    label: "State Catalogue",
    eyebrow: "01",
  },
  {
    id: "experiences",
    label: "Experiences",
    eyebrow: "02",
  },
  {
    id: "learn",
    label: "Learn",
    eyebrow: "03",
  },
];

export default function CatalogueTabs({
  panels,
}: {
  panels: Record<CatalogueTabId, ReactNode>;
}) {
  const [active, setActive] = useState<CatalogueTabId>("catalogue");

  return (
    <div className="space-y-6">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Catalogue sections"
        className="flex flex-wrap gap-2 border-b border-stone/40"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={[
                "group inline-flex items-baseline gap-2 border-b-2 px-4 py-3 font-body text-xs uppercase tracking-[0.24em] transition",
                isActive
                  ? "border-gold text-ink"
                  : "border-transparent text-umber hover:border-stone hover:text-ink",
              ].join(" ")}
            >
              <span className="font-mono text-[10px] text-gold">
                {t.eyebrow}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab panels — only the active one is rendered to keep the DOM light. */}
      {TABS.map((t) => {
        if (t.id !== active) return null;
        return (
          <div
            key={t.id}
            id={`panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${t.id}`}
          >
            {panels[t.id]}
          </div>
        );
      })}
    </div>
  );
}
