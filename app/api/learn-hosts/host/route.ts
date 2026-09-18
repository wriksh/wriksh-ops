import { NextResponse } from "next/server";
import { listLearnHosts, createLearnHost } from "@/lib/collections/experienceGuides";

export async function GET() {
  const hosts = await listLearnHosts();
  return NextResponse.json({ hosts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.slug || !body.name || !body.artForm) {
      return NextResponse.json(
        { error: "slug, name, artForm required" },
        { status: 400 }
      );
    }
    const h = await createLearnHost(body);
    return NextResponse.json({ host: h }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
