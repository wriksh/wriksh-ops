import "server-only";
import { getDb } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import type { FinanceTransactionDoc, FinanceDirection } from "@/lib/types";

/**
 * Finance (Money) — Phase 4 module.
 *
 * For the dashboard we expose a small monthly aggregate that powers the
 * "income / expense / net" tile. Full CRUD + CSV upload comes later.
 */

export type FinanceMonthlySummary = {
  /** Calendar month as YYYY-MM. */
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
}> {
  return logger.timed("finance.summarise", {}, async () => {
    const db = await getDb();

    const [byDir, all] = await Promise.all([
      db
        .collection<FinanceTransactionDoc>("finance_transactions")
        .aggregate<{ _id: FinanceDirection; total: number; n: number }>([
          { $group: { _id: "$direction", total: { $sum: "$amount" }, n: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection<FinanceTransactionDoc>("finance_transactions")
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
    for (const tx of all) {
      const d = new Date(tx.date);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const amt = tx.amount || 0;
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
    };
  });
}
