import { NextRequest, NextResponse } from "next/server";
import { getClientSessionBrandId } from "@/lib/client-auth";
import { getPosts, getPost, updatePost, getPostThumbnails, getPostCommentCounts } from "@/lib/db";
import type { ClientVerifyState, PostConfig } from "@/lib/fb-specs";

function deriveAppStatusFromClient(
  post: PostConfig,
  verifyText: ClientVerifyState,
  verifyImage: ClientVerifyState,
  verifyAds: ClientVerifyState,
): string | null {
  const adsRelevant = !!post.ads_enabled;
  const allApproved = verifyText === "approved"
    && verifyImage === "approved"
    && (!adsRelevant || verifyAds === "approved");
  if (allApproved) return "approved";
  if (verifyText === "rejected" || verifyImage === "rejected" || (adsRelevant && verifyAds === "rejected")) return "draft";
  if (verifyText === "revise" || verifyImage === "revise" || (adsRelevant && verifyAds === "revise")) return "draft";
  return null;
}

/** Toggle: if already in `target`, set to "pending"; else set to `target`. */
function toggle(current: ClientVerifyState | undefined, target: ClientVerifyState): ClientVerifyState {
  return current === target ? "pending" : target;
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
    const currentAds: ClientVerifyState = post.client_verify_ads || "pending";
    let nextText = currentText;
    let nextImage = currentImage;
    let nextAds = currentAds;
    let notes: string | null = post.client_approval_notes ?? null;

    switch (action) {
      case "approve_text":
        nextText = toggle(currentText, "approved");
        break;
      case "approve_image":
        nextImage = toggle(currentImage, "approved");
        break;
      case "approve_ads":
        nextAds = toggle(currentAds, "approved");
        break;
      case "reject":
        nextText = "rejected"; nextImage = "rejected";
        if (post.ads_enabled) nextAds = "rejected";
        notes = note || null;
        break;
      case "revise":
        nextText = "revise"; nextImage = "revise";
        if (post.ads_enabled) nextAds = "revise";
        notes = note || null;
        break;
      case "reset":
        nextText = "pending"; nextImage = "pending"; nextAds = "pending";
        notes = null;
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updates: Partial<PostConfig> = {
      client_verify_text: nextText,
      client_verify_image: nextImage,
      client_verify_ads: nextAds,
      client_approval_notes: notes ?? undefined,
    };
    const newStatus = deriveAppStatusFromClient(post, nextText, nextImage, nextAds);
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
