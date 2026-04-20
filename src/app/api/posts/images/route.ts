import { NextRequest, NextResponse } from "next/server";
import { getPostThumbnails, getPostImageVersions, approveImage, trashNonApprovedImages, trashPostImage } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    // All image versions for a single post
    if (params.get("post_id")) {
      const images = await getPostImageVersions(params.get("post_id")!);
      return NextResponse.json({ images });
    }

    // Thumbnails for multiple posts
    const ids = params.get("post_ids");
    if (!ids) return NextResponse.json({});
    const postIds = ids.split(",").filter(Boolean);
    const thumbnails = await getPostThumbnails(postIds);
    return NextResponse.json(thumbnails);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "approve") {
      await approveImage(body.image_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "trash_non_approved") {
      await trashNonApprovedImages(body.post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "trash") {
      await trashPostImage(body.image_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
