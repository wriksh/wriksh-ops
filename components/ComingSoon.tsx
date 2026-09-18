import React from "react";

/**
 * Generic placeholder used by every Phase 2+ module until that module
 * ships its own UI. Keeping it small + reusable means every placeholder
 * page looks consistent and clearly tells the admin "this isn't built yet".
 */
export default function ComingSoon({
  title,
  phase,
  pillar,
  description,
  bullets,
}: {
  title: string;
  phase: string;
  pillar: "Time" | "Money" | "Energy";
  description: string;
  bullets?: string[];
}) {
  const pillarTone: Record<typeof pillar, string> = {
    Time: "bg-gold",
    Money: "bg-rust",
    Energy: "bg-moss",
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
          {phase}  ·  Pillar of {pillar}
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">{title}</h1>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 font-body text-[10px] uppercase tracking-wider text-linen ${pillarTone[pillar]}`}
        >
          Coming soon
        </span>
      </header>

      <p className="font-body text-base text-ink-soft">{description}</p>

      {bullets?.length ? (
        <ul className="space-y-2 rounded-2xl border border-stone/40 bg-parchment p-6 font-body text-sm text-ink-soft">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-gold">·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
