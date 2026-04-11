import { NextRequest, NextResponse } from "next/server";
import { deleteFromR2 } from "@/lib/r2-client";
import { getPosts, deletePost, restorePost } from "@/lib/db";

export async function GET() {
  try {
    const { posts } = await getPosts({ status: "trashed" });
    return NextResponse.json(posts);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, post_id, urls } = await req.json();

    if (action === "restore") {
      await restorePost(post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "permanent_delete") {
      await deletePost(post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "cleanup") {
      let deleted = 0;
      for (const url of (urls as string[])) {
        try { await deleteFromR2(url); deleted++; } catch { /* skip */ }
      }
      return NextResponse.json({ ok: true, deleted });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
