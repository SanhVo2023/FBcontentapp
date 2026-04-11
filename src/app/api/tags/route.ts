import { NextRequest, NextResponse } from "next/server";
import { getTags, createTag, deleteTag, getPostTags, addTagToPost, removeTagFromPost, bulkAddTag } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brand");
    const postId = req.nextUrl.searchParams.get("post_id");

    if (postId) {
      const tags = await getPostTags(postId);
      return NextResponse.json(tags);
    }

    if (!brandId) return NextResponse.json({ error: "brand param required" }, { status: 400 });
    const tags = await getTags(brandId);
    return NextResponse.json(tags);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const tag = await createTag(body.brand_id, body.name, body.color);
      return NextResponse.json(tag);
    }

    if (action === "delete") {
      await deleteTag(body.tag_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "add_to_post") {
      await addTagToPost(body.post_id, body.tag_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "remove_from_post") {
      await removeTagFromPost(body.post_id, body.tag_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk_add") {
      await bulkAddTag(body.post_ids, body.tag_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
