import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId, type WithId } from "mongodb";
import type {
  FinanceTransactionDoc,
  FinanceDirection,
} from "@/lib/types";

/**
 * Finance (Money) — Phase 4 module.
 *
 * Airtable-style editable grid for income / expense entries.
 * - Manual form on `/finance`
 * - CSV upload (parser below) auto-imports
 * - Per-row CRUD through the API routes
 */

const COLLECTION = "finance_transactions";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new Error(`invalid id: ${id}`);
  return new ObjectId(id);
}

type RawDoc = WithId<Omit<FinanceTransactionDoc, "_id">>;

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export type FinanceListOptions = {
  limit?: number;
  direction?: FinanceDirection | "all";
  q?: string;
};

export async function listFinanceTransactions(
  opts: FinanceListOptions = {}
): Promise<FinanceTransactionDoc[]> {
  return logger.timed(
    "finance.list",
    { limit: opts.limit, direction: opts.direction },
    async () => {
      const db = await getDb();
      const filter: Record<string, unknown> = {};
      if (opts.direction && opts.direction !== "all") filter.direction = opts.direction;
      if (opts.q) {
        const q = opts.q.trim();
        filter.$or = [
          { vendor: { $regex: q, $options: "i" } },
          { category: { $regex: q, $options: "i" } },
          { notes: { $regex: q, $options: "i" } },
          { counterparty: { $regex: q, $options: "i" } },
        ];
      }
      const docs = await db
        .collection<RawDoc>(COLLECTION)
        .find(filter, { projection: { _id: 0 } })
        .sort({ date: -1, createdAt: -1 })
        .limit(Math.min(500, opts.limit ?? 200))
        .toArray();
      return docs as unknown as FinanceTransactionDoc[];
    }
  );
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createFinanceTransaction(
  input: Omit<FinanceTransactionDoc, "_id" | "createdAt" | "updatedAt">
): Promise<FinanceTransactionDoc> {
  return logger.timed("finance.create", { direction: input.direction, amount: input.amount }, async () => {
    if (typeof input.amount !== "number" || Number.isNaN(input.amount)) {
      throw new Error("amount must be a number");
    }
    if (!["in", "out"].includes(input.direction)) {
      throw new Error("direction must be 'in' or 'out'");
    }
    const now = new Date().toISOString();
    const doc: Omit<FinanceTransactionDoc, "_id"> = {
      ...input,
      currency: input.currency ?? "INR",
      source: input.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    const res = await db.collection<Omit<FinanceTransactionDoc, "_id">>(COLLECTION).insertOne(doc);
    return { ...doc, _id: String(res.insertedId) };
  });
}

export async function updateFinanceTransaction(
  id: string,
  patch: Partial<Omit<FinanceTransactionDoc, "_id" | "createdAt">>
): Promise<FinanceTransactionDoc | null> {
  return logger.timed("finance.update", { id }, async () => {
    const db = await getDb();
    const next = { ...patch, updatedAt: new Date().toISOString() };
    const result = await db
      .collection<RawDoc>(COLLECTION)
      .findOneAndUpdate(
        { _id: toObjectId(id) },
        { $set: next },
        { returnDocument: "after", projection: { _id: 0 } }
      );
    return (result as unknown as FinanceTransactionDoc) ?? null;
  });
}

export async function deleteFinanceTransaction(id: string): Promise<boolean> {
  return logger.timed("finance.delete", { id }, async () => {
    const db = await getDb();
    const res = await db
      .collection<RawDoc>(COLLECTION)
      .deleteOne({ _id: toObjectId(id) });
    return res.deletedCount > 0;
  });
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export type CsvRow = Record<string, string>;

/**
 * Parse a CSV string into rows. Tolerant of CRLF, quoted fields, and
 * commas inside quotes. Returns header + body rows.
 *
 * Expected column names (case-insensitive):
 *   date, direction, amount, category, vendor, counterparty,
 *   stateSlug, experienceSlug, notes
 */
export function parseFinanceCsv(csv: string): { headers: string[]; rows: CsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const records: string[][] = [];
  let i = 0;
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  while (i < csv.length) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      record.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      record.push(field);
      field = "";
      if (record.length > 1 || (record.length === 1 && record[0] !== "")) records.push(record);
      record = [];
      if (ch === "\r" && csv[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    if (record.length > 1 || (record.length === 1 && record[0] !== "")) records.push(record);
  }

  if (records.length === 0) return { headers: [], rows: [], errors: ["empty CSV"] };
  const headers = records[0].map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let r = 1; r < records.length; r += 1) {
    const rec = records[r];
    if (rec.length === 1 && rec[0].trim() === "") continue;
    const obj: CsvRow = {};
    for (let c = 0; c < headers.length; c += 1) obj[headers[c]] = rec[c] ?? "";
    rows.push(obj);
  }
  return { headers, rows, errors };
}

export async function importFinanceCsv(csv: string): Promise<{ inserted: number; errors: string[] }> {
  return logger.timed("finance.importCsv", {}, async () => {
    const { rows, errors } = parseFinanceCsv(csv);
    const perRowErrors: string[] = [...errors];
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      try {
        const direction = (r.direction ?? "").trim().toLowerCase();
        if (direction !== "in" && direction !== "out") {
          perRowErrors.push(`Row ${i + 1}: direction must be "in" or "out" (got "${direction}")`);
          continue;
        }
        const amount = Number((r.amount ?? "").replace(/[, ]/g, ""));
        if (Number.isNaN(amount)) {
          perRowErrors.push(`Row ${i + 1}: invalid amount "${r.amount}"`);
          continue;
        }
        await createFinanceTransaction({
          date: r.date ?? new Date().toISOString().slice(0, 10),
          direction: direction as FinanceDirection,
          amount,
          currency: "INR",
          category: (r.category ?? "uncategorised").trim(),
          vendor: r.vendor?.trim() || undefined,
          counterparty: r.counterparty?.trim() || undefined,
          stateSlug: r.stateslug?.trim() || undefined,
          experienceSlug: r.experienceslug?.trim() || undefined,
          notes: r.notes?.trim() || undefined,
          source: "csv",
        });
        inserted += 1;
      } catch (err) {
        perRowErrors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { inserted, errors: perRowErrors };
  });
}

// ---------------------------------------------------------------------------
// Summaries (used by the dashboard tile + finance page charts)
// ---------------------------------------------------------------------------

export type FinanceMonthlySummary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  txCount: number;
};

export async function summariseFinance(): Promise<{
  thisMonth: FinanceMonthlySummary;
  last30Days: { income: number; expense: number; net: number; txCount: number };
  byDirection: Record<FinanceDirection, number>;
  txCount: number;
  monthly: FinanceMonthlySummary[]; // last 12 months, oldest first
}> {
  return logger.timed("finance.summarise", {}, async () => {
    const db = await getDb();

    const [byDir, all] = await Promise.all([
      db
        .collection<FinanceTransactionDoc>(COLLECTION)
        .aggregate<{ _id: FinanceDirection; total: number; n: number }>([
          { $group: { _id: "$direction", total: { $sum: "$amount" }, n: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection<FinanceTransactionDoc>(COLLECTION)
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ]);

    const byDirection: Record<FinanceDirection, number> = { in: 0, out: 0 };
    let txCount = 0;
    for (const row of byDir) {
      byDirection[row._id] = row.total;
      txCount += row.n;
    }

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const last30Cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let monthIncome = 0;
    let monthExpense = 0;
    let monthCount = 0;
    let l30Income = 0;
    let l30Expense = 0;
    let l30Count = 0;
    const monthlyMap = new Map<string, FinanceMonthlySummary>();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { month: key, income: 0, expense: 0, net: 0, txCount: 0 });
    }
    for (const tx of all) {
      const d = new Date(tx.date);
      if (Number.isNaN(d.getTime())) continue;
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const amt = tx.amount || 0;
      const slot = monthlyMap.get(mKey);
      if (slot) {
        slot.txCount += 1;
        if (tx.direction === "in") slot.income += amt;
        else slot.expense += amt;
        slot.net = slot.income - slot.expense;
      }
      if (mKey === monthKey) {
        monthCount += 1;
        if (tx.direction === "in") monthIncome += amt;
        else monthExpense += amt;
      }
      if (d >= last30Cutoff) {
        l30Count += 1;
        if (tx.direction === "in") l30Income += amt;
        else l30Expense += amt;
      }
    }

    return {
      thisMonth: {
        month: monthKey,
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
        txCount: monthCount,
      },
      last30Days: {
        income: l30Income,
        expense: l30Expense,
        net: l30Income - l30Expense,
        txCount: l30Count,
      },
      byDirection,
      txCount,
      monthly: Array.from(monthlyMap.values()),
    };
  });
}

// ---------------------------------------------------------------------------
// Suggested categories — used by the autocomplete on the finance form
// ---------------------------------------------------------------------------

export const DEFAULT_CATEGORIES: { in: string[]; out: string[] } = {
  in: ["ticket", "sponsorship", "grant", "subscription", "donation", "other-income"],
  out: ["ads", "vendor", "salary", "travel", "office", "tech", "tax", "other-expense"],
};
