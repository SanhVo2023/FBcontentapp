import { NextRequest, NextResponse } from "next/server";
import { getClientSessionBrandId } from "@/lib/client-auth";
import { getPost, getBrand, getPostComments, createComment, updateComment, deleteComment, getComment } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const postId = req.nextUrl.searchParams.get("post_id");
    if (!postId) return NextResponse.json({ error: "Thiếu post_id" }, { status: 400 });

    const post = await getPost(postId);
    if (!post || post.brand_id !== brandId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comments = await getPostComments(postId);
    return NextResponse.json({ comments });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { post_id, text } = body as { post_id: string; text: string };
    if (!post_id || !text?.trim()) return NextResponse.json({ error: "Thiếu post_id hoặc nội dung" }, { status: 400 });

    const post = await getPost(post_id);
    if (!post || post.brand_id !== brandId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const brand = await getBrand(brandId);
    const comment = await createComment({
      post_id,
      author_role: "client",
      author_name: brand?.brand_name || "Khách",
      body: text.trim(),
    });
    return NextResponse.json({ ok: true, comment });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/** Verify the comment exists, belongs to a post of this brand, and was authored by the client. */
async function verifyOwnership(id: string, brandId: string) {
  const c = await getComment(id);
  if (!c) return { ok: false as const, code: 404, error: "Not found" };
  if (c.author_role !== "client") return { ok: false as const, code: 403, error: "Không thể sửa/xóa bình luận của team" };
  const post = await getPost(c.post_id);
  if (!post || post.brand_id !== brandId) return { ok: false as const, code: 403, error: "Forbidden" };
  return { ok: true as const, comment: c };
}

export async function PUT(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, text } = body as { id: string; text: string };
    if (!id || !text?.trim()) return NextResponse.json({ error: "Thiếu id hoặc nội dung" }, { status: 400 });

    const check = await verifyOwnership(id, brandId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.code });

    const updated = await updateComment(id, text.trim());
    return NextResponse.json({ ok: true, comment: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = body as { id: string };
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    const check = await verifyOwnership(id, brandId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.code });

    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
