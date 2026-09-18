import { NextResponse } from "next/server";
import {
  updateFinanceTransaction,
  deleteFinanceTransaction,
} from "@/lib/collections/finance";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const tx = await updateFinanceTransaction(params.id, body);
    if (!tx) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteFinanceTransaction(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
