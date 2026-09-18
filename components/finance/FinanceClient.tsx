"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  FinanceTransactionDoc,
  FinanceDirection,
} from "@/lib/types";
import type { FinanceMonthlySummary } from "@/lib/collections/finance";

type Summary = Awaited<ReturnType<typeof import("@/lib/collections/finance").summariseFinance>>;

const fmtINR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * /finance — Airtable-style editable grid + summary tiles + CSV upload.
 *
 * Editable rows: click any cell (except _id) to edit, blur or Enter to save.
 * New row at the bottom is always present.
 */
export default function FinanceClient({
  initialTransactions,
  summary,
  categorySuggestions,
}: {
  initialTransactions: FinanceTransactionDoc[];
  summary: Summary;
  categorySuggestions: { in: string[]; out: string[] };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [txs, setTxs] = useState<FinanceTransactionDoc[]>(initialTransactions);
  const [filter, setFilter] = useState<FinanceDirection | "all">("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const visible = useMemo(() => {
    return txs.filter((t) => {
      if (filter !== "all" && t.direction !== filter) return false;
      if (q) {
        const hay = `${t.vendor ?? ""} ${t.category} ${t.notes ?? ""} ${t.counterparty ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [txs, filter, q]);

  async function patchField<K extends keyof FinanceTransactionDoc>(
    id: string,
    field: K,
    value: FinanceTransactionDoc[K]
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "patch failed");
      }
      const data = await res.json();
      setTxs((prev) => prev.map((t) => (t._id === id ? data.transaction : t)));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function addNewRow() {
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          direction: "out",
          amount: 0,
          category: "uncategorised",
          source: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "create failed");
      setTxs((prev) => [data.transaction, ...prev]);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Delete this transaction?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setTxs((prev) => prev.filter((t) => t._id !== id));
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function uploadCsv(file: File) {
    setCsvBusy(true);
    setCsvResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/finance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "import failed");
      setCsvResult(
        `Imported ${data.inserted} row${data.inserted === 1 ? "" : "s"}${data.errors?.length ? ` (${data.errors.length} errors — see logs)` : ""}.`
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setCsvResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCsvBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.32em] text-rust">
          Phase 4  ·  Pillar of Money
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Finance</h1>
        <p className="mt-3 max-w-2xl font-body text-sm text-ink-soft">
          Airtable-style editable grid for income and expense entries. Click
          any cell to edit, blur or press Enter to save. CSV upload auto-categorises
          and imports in one pass.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-clay/40 bg-parchment p-4 font-body text-sm text-clay">
          {error}
        </div>
      ) : null}

      {/* Summary tiles */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="This month · income"
          value={`₹${fmtINR.format(summary.thisMonth.income)}`}
          tone="moss"
        />
        <SummaryTile
          label="This month · expense"
          value={`₹${fmtINR.format(summary.thisMonth.expense)}`}
          tone="rust"
        />
        <SummaryTile
          label="This month · net"
          value={`₹${fmtINR.format(summary.thisMonth.net)}`}
          tone={summary.thisMonth.net >= 0 ? "moss" : "rust"}
        />
        <SummaryTile
          label="Total transactions"
          value={summary.txCount}
          tone="umber"
        />
      </section>

      {/* 12-month sparkline */}
      <section className="rounded-2xl border border-stone/40 bg-parchment p-6">
        <h2 className="font-display text-xl text-ink">Last 12 months</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {summary.monthly.map((m) => {
            const max = Math.max(
              ...summary.monthly.map((x) => Math.max(x.income, x.expense)),
              1
            );
            const hi = (m.income / max) * 100;
            const he = (m.expense / max) * 100;
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-px">
                  <div
                    className="w-1/2 rounded-t bg-moss"
                    style={{ height: `${hi}%` }}
                    title={`Income ₹${fmtINR.format(m.income)}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-rust"
                    style={{ height: `${he}%` }}
                    title={`Expense ₹${fmtINR.format(m.expense)}`}
                  />
                </div>
                <span className="font-body text-[9px] text-umber">{m.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-4 font-body text-[11px] text-ink-soft">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-moss" /> income
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rust" /> expense
          </span>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone/40 bg-parchment p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FinanceDirection | "all")}
            className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
          >
            <option value="all">All directions</option>
            <option value="in">Income</option>
            <option value="out">Expense</option>
          </select>
          <input
            placeholder="Search vendor, category, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded border border-stone/40 bg-linen px-2 py-1 font-body text-xs"
          />
          <span className="font-body text-xs text-umber">{visible.length} row{visible.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full border border-gold px-4 py-1 font-body text-[11px] uppercase tracking-wider text-gold hover:bg-gold hover:text-linen">
            {csvBusy ? "Importing…" : "Upload CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCsv(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={addNewRow}
            className="rounded-full bg-gold px-4 py-1 font-body text-[11px] uppercase tracking-wider text-linen hover:bg-gold-bright"
          >
            + Add row
          </button>
        </div>
      </div>

      {csvResult ? (
        <div className="rounded-2xl border border-stone/40 bg-parchment p-3 font-body text-xs text-ink-soft">
          {csvResult}
        </div>
      ) : null}

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-stone/40">
        <table className="w-full min-w-[1100px] font-body text-sm">
          <thead className="bg-forest text-left text-[11px] uppercase tracking-wider text-parchment/70">
            <tr>
              <th className="w-32 px-3 py-2">Date</th>
              <th className="w-24 px-3 py-2">Dir</th>
              <th className="w-32 px-3 py-2 text-right">Amount</th>
              <th className="w-40 px-3 py-2">Category</th>
              <th className="w-40 px-3 py-2">Vendor</th>
              <th className="w-40 px-3 py-2">Counterparty</th>
              <th className="w-28 px-3 py-2">State</th>
              <th className="px-3 py-2">Notes</th>
              <th className="w-20 px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center font-body text-sm text-ink-soft">
                  No transactions yet. Click <em>+ Add row</em> or <em>Upload CSV</em>.
                </td>
              </tr>
            ) : null}
            {visible.map((t) => (
              <FinanceRow
                key={t._id}
                tx={t}
                busy={busyId === t._id}
                onPatch={(field, value) => t._id && patchField(t._id, field, value)}
                onDelete={() => t._id && removeRow(t._id)}
                suggestionsIn={categorySuggestions.in}
                suggestionsOut={categorySuggestions.out}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV format hint */}
      <details className="rounded-2xl border border-stone/40 bg-parchment p-4 font-body text-xs text-ink-soft">
        <summary className="cursor-pointer font-body text-sm text-ink">
          CSV format reference
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-linen p-3 font-mono text-[11px] text-ink-soft">
{`date,direction,amount,category,vendor,counterparty,stateSlug,experienceSlug,notes
2026-09-18,in,15000,ticket,Goa Folk Fest,,goa,,"Dasara advance tickets"
2026-09-19,out,4500,ads,Instagram,Meta,,,"Boost for launch reel"
2026-09-20,out,22000,vendor,Hamsalekha troupe,Hamsalekha,karnataka,karnataka-ganesh-2026,"Performance fee"`
        }</pre>
        <p className="mt-2">
          Column names are case-insensitive. <code>direction</code> must be{" "}
          <code>in</code> or <code>out</code>. <code>amount</code> may use commas
          or spaces as thousands separators.
        </p>
      </details>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: "moss" | "rust" | "umber";
}) {
  const dot = tone === "moss" ? "bg-moss" : tone === "rust" ? "bg-rust" : "bg-umber";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone/40 bg-parchment p-5 shadow-card">
      <div className={`absolute left-0 top-0 h-full w-1 ${dot}`} />
      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] uppercase tracking-[0.28em] text-umber">{label}</span>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
      <div className="mt-2 font-display text-2xl text-ink">{value}</div>
    </div>
  );
}

function FinanceRow({
  tx,
  busy,
  onPatch,
  onDelete,
  suggestionsIn,
  suggestionsOut,
}: {
  tx: FinanceTransactionDoc;
  busy: boolean;
  onPatch: <K extends keyof FinanceTransactionDoc>(field: K, value: FinanceTransactionDoc[K]) => void;
  onDelete: () => void;
  suggestionsIn: string[];
  suggestionsOut: string[];
}) {
  const suggestions = tx.direction === "in" ? suggestionsIn : suggestionsOut;
  const isIncome = tx.direction === "in";

  return (
    <tr
      className={
        "border-b border-stone/30 last:border-b-0 " +
        (busy ? "opacity-60" : "") +
        (isIncome ? "bg-moss/5" : "bg-rust/5")
      }
    >
      <td className="px-3 py-2">
        <input
          type="date"
          defaultValue={tx.date?.slice(0, 10) ?? ""}
          onBlur={(e) => e.target.value !== tx.date && onPatch("date", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-sm hover:border-stone/40 focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <select
          defaultValue={tx.direction}
          onChange={(e) => onPatch("direction", e.target.value as FinanceDirection)}
          className={
            "w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-xs uppercase tracking-wider focus:border-gold focus:bg-linen focus:outline-none " +
            (isIncome ? "text-moss" : "text-rust")
          }
        >
          <option value="in">in</option>
          <option value="out">out</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          defaultValue={tx.amount}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n) && n !== tx.amount) onPatch("amount", n);
          }}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-right font-mono text-sm focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <input
          defaultValue={tx.category}
          list={`cat-${tx._id ?? "new"}`}
          onBlur={(e) => e.target.value !== tx.category && onPatch("category", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-sm focus:border-gold focus:bg-linen focus:outline-none"
        />
        <datalist id={`cat-${tx._id ?? "new"}`}>
          {suggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </td>
      <td className="px-3 py-2">
        <input
          defaultValue={tx.vendor ?? ""}
          onBlur={(e) => e.target.value !== (tx.vendor ?? "") && onPatch("vendor", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-sm focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <input
          defaultValue={tx.counterparty ?? ""}
          onBlur={(e) => e.target.value !== (tx.counterparty ?? "") && onPatch("counterparty", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-sm focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <input
          defaultValue={tx.stateSlug ?? ""}
          onBlur={(e) => e.target.value !== (tx.stateSlug ?? "") && onPatch("stateSlug", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-mono text-xs focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2">
        <input
          defaultValue={tx.notes ?? ""}
          onBlur={(e) => e.target.value !== (tx.notes ?? "") && onPatch("notes", e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-1 font-body text-sm focus:border-gold focus:bg-linen focus:outline-none"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="font-body text-[11px] uppercase tracking-wider text-clay hover:text-clay-deep"
          title="Delete row"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
