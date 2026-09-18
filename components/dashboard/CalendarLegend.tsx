import {
  MARKETING_CATEGORY_LABELS,
  MARKETING_CATEGORY_COLOR,
  type MarketingCategory,
} from "@/lib/types";

/**
 * The six-category colour legend for the marketing calendar.
 *
 * Reads straight from `lib/types.ts` so a category added there shows up
 * here automatically — no edit needed.
 */
export default function CalendarLegend({
  counts,
}: {
  counts: Record<MarketingCategory, number>;
}) {
  const order: MarketingCategory[] = [
    "post",
    "meeting",
    "experience",
    "collab",
    "ad",
    "app-dev",
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {order.map((cat) => (
        <div
          key={cat}
          className="flex items-center gap-2 rounded-full border border-stone/40 bg-linen px-3 py-1.5"
        >
          <span className={`h-3 w-3 rounded-full ${MARKETING_CATEGORY_COLOR[cat]}`} />
          <span className="font-body text-xs text-ink-soft">
            {MARKETING_CATEGORY_LABELS[cat]}
          </span>
          <span className="font-display text-sm text-ink">{counts[cat]}</span>
        </div>
      ))}
    </div>
  );
}
