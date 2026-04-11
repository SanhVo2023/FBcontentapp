import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brand") || undefined;
    const templates = await getTemplates(brandId);
    return NextResponse.json(templates);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const template = await createTemplate(body.template);
      return NextResponse.json(template);
    }

    if (action === "delete") {
      await deleteTemplate(body.template_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
