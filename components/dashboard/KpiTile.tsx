import React from "react";

/**
 * KPI tile used on the Dhoomkethu dashboard.
 *
 * Pure presentation — receives the value already computed server-side.
 * The `tone` accent matches the marketing-calendar category colours so
 * the dashboard and the calendar share one visual language.
 */
export type KpiTone =
  | "neutral"
  | "gold"
  | "moss"
  | "clay"
  | "rust"
  | "forest"
  | "umber";

const TONE_CLASSES: Record<KpiTone, { dot: string; bar: string; text: string }> = {
  neutral: { dot: "bg-stone", bar: "bg-stone", text: "text-stone" },
  gold: { dot: "bg-gold", bar: "bg-gold", text: "text-gold" },
  moss: { dot: "bg-moss", bar: "bg-moss", text: "text-moss" },
  clay: { dot: "bg-clay", bar: "bg-clay", text: "text-clay" },
  rust: { dot: "bg-rust", bar: "bg-rust", text: "text-rust" },
  forest: { dot: "bg-forest", bar: "bg-forest", text: "text-forest" },
  umber: { dot: "bg-umber", bar: "bg-umber", text: "text-umber" },
};

export function KpiTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  tone?: KpiTone;
  href?: string;
}) {
  const t = TONE_CLASSES[tone];
  const inner = (
    <div className="relative overflow-hidden rounded-2xl border border-stone/40 bg-parchment p-5 shadow-card transition hover:border-gold/40 hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 ${t.bar}`} />
      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">
          {label}
        </span>
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
      </div>
      <div className="mt-3 font-display text-3xl text-ink">{value}</div>
      {sub ? (
        <div className={`mt-1 font-body text-xs ${t.text}`}>{sub}</div>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
