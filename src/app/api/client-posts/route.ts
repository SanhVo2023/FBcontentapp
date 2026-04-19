import { NextRequest, NextResponse } from "next/server";
import { getClientSessionBrandId } from "@/lib/client-auth";
import { getPosts, getPost, updatePost, getPostThumbnails, getPostCommentCounts } from "@/lib/db";
import type { ClientVerifyState } from "@/lib/fb-specs";

function deriveAppStatusFromClient(verifyText: ClientVerifyState, verifyImage: ClientVerifyState): string | null {
  if (verifyText === "approved" && verifyImage === "approved") return "approved";
  if (verifyText === "rejected" || verifyImage === "rejected") return "draft";
  if (verifyText === "revise" || verifyImage === "revise") return "draft";
  return null; // pending — don't change status
}

export async function GET(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const post = await getPost(id);
      if (!post || post.brand_id !== brandId) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(post);
    }

    // Return all posts for this brand (exclude trashed). Client sees draft+submitted+approved.
    const { posts } = await getPosts({ brandId });
    const visible = posts.filter((p) => p.status !== "trashed");
    const ids = visible.map((p) => p.id);
    const thumbs = await getPostThumbnails(ids).catch(() => ({} as Record<string, string>));
    const commentCounts = await getPostCommentCounts(ids).catch(() => ({} as Record<string, number>));
    return NextResponse.json({ posts: visible, thumbnails: thumbs, comment_counts: commentCounts });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const brandId = await getClientSessionBrandId();
    if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, post_id, note } = body as { action: string; post_id: string; note?: string };
    if (!post_id) return NextResponse.json({ error: "Thiếu post_id" }, { status: 400 });

    const post = await getPost(post_id);
    if (!post || post.brand_id !== brandId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const currentText: ClientVerifyState = post.client_verify_text || "pending";
    const currentImage: ClientVerifyState = post.client_verify_image || "pending";
    let nextText = currentText;
    let nextImage = currentImage;
    let notes: string | null = post.client_approval_notes ?? null;

    switch (action) {
      case "approve_text":
        nextText = "approved";
        break;
      case "approve_image":
        nextImage = "approved";
        break;
      case "reject":
        nextText = "rejected";
        nextImage = "rejected";
        notes = note || null;
        break;
      case "revise":
        nextText = "revise";
        nextImage = "revise";
        notes = note || null;
        break;
      case "reset":
        nextText = "pending";
        nextImage = "pending";
        notes = null;
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updates: Partial<typeof post> = {
      client_verify_text: nextText,
      client_verify_image: nextImage,
      client_approval_notes: notes ?? undefined,
    };
    const newStatus = deriveAppStatusFromClient(nextText, nextImage);
    if (newStatus) {
      updates.status = newStatus;
      if (newStatus === "approved") updates.client_approved_at = new Date().toISOString();
    }

    const updated = await updatePost(post_id, updates);
    return NextResponse.json({ ok: true, post: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
