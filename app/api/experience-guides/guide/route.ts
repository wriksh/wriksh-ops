import { NextResponse } from "next/server";
import { listExperienceGuides, createExperienceGuide } from "@/lib/collections/experienceGuides";

export async function GET() {
  const guides = await listExperienceGuides();
  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.slug || !body.name || !body.stateSlug) {
      return NextResponse.json({ error: "slug, name, stateSlug required" }, { status: 400 });
    }
    const g = await createExperienceGuide(body);
    return NextResponse.json({ guide: g }, { status: 201 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: reason }, { status: 400 });
  }
}
