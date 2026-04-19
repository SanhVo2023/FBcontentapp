import { NextRequest, NextResponse } from "next/server";
import { getPostComments, createComment, deleteComment, updateComment, getComment } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const postId = req.nextUrl.searchParams.get("post_id");
    if (!postId) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    const comments = await getPostComments(postId);
    return NextResponse.json({ comments });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { post_id, body: text, author_name } = body;
      if (!post_id || !text?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const comment = await createComment({
        post_id,
        author_role: "creator",
        author_name: author_name || "Creator",
        body: text.trim(),
      });
      return NextResponse.json({ ok: true, comment });
    }

    if (action === "edit") {
      const { id, body: text } = body;
      if (!id || !text?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      // Creators can only edit their own creator-authored comments.
      const c = await getComment(id);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (c.author_role !== "creator") return NextResponse.json({ error: "Không thể sửa bình luận của khách" }, { status: 403 });
      const updated = await updateComment(id, text.trim());
      return NextResponse.json({ ok: true, comment: updated });
    }

    if (action === "delete") {
      if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const c = await getComment(body.id);
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (c.author_role !== "creator") return NextResponse.json({ error: "Không thể xóa bình luận của khách" }, { status: 403 });
      await deleteComment(body.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
