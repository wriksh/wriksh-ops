import { NextResponse } from "next/server";
import {
  listFinanceTransactions,
  createFinanceTransaction,
} from "@/lib/collections/finance";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "200");
  const direction = (url.searchParams.get("direction") ?? "all") as
    | "in"
    | "out"
    | "all";
  const q = url.searchParams.get("q") ?? undefined;
  const txs = await listFinanceTransactions({ limit, direction, q });
  return NextResponse.json({ transactions: txs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tx = await createFinanceTransaction({
      date: String(body.date ?? new Date().toISOString().slice(0, 10)),
      direction: body.direction === "in" ? "in" : "out",
      amount: Number(body.amount) || 0,
      category: String(body.category ?? "uncategorised"),
      currency: body.currency,
      vendor: body.vendor,
      counterparty: body.counterparty,
      stateSlug: body.stateSlug,
      experienceSlug: body.experienceSlug,
      notes: body.notes,
      source: "manual",
    });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
