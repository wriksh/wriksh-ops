import { NextResponse } from "next/server";
import { listPeople, createPerson, countPeopleByRole } from "@/lib/collections/people";

/**
 * GET  /api/people              → list + role counts
 * POST /api/people              → create
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const role = url.searchParams.get("role") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;
  const roles = role ? (role.split(",") as never) : undefined;
  const [people, counts] = await Promise.all([
    listPeople({ q, stateSlug: state, tag, roles, limit: 500 }),
    countPeopleByRole(),
  ]);
  return NextResponse.json({ people, counts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createPerson(body);
    return NextResponse.json({ person: created }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
