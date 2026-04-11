import { NextRequest, NextResponse } from "next/server";
import { bulkCreatePosts } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { brand_id, posts } = await req.json();

    if (!brand_id) return NextResponse.json({ error: "brand_id required" }, { status: 400 });
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: "posts array required" }, { status: 400 });
    }

    const withBrand = posts.map((p: Record<string, unknown>) => ({
      ...p,
      brand_id,
    }));

    const created = await bulkCreatePosts(withBrand);
    return NextResponse.json({ ok: true, count: created.length, posts: created });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
