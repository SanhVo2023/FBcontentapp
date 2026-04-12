import { NextRequest, NextResponse } from "next/server";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  trashPost,
  restorePost,
  duplicatePost,
  bulkUpdateStatus,
  bulkDelete,
  type PostFilters,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filters: PostFilters = {};

    if (params.get("brand")) filters.brandId = params.get("brand")!;
    if (params.get("status")) {
      const s = params.get("status")!;
      filters.status = s.includes(",") ? s.split(",") : s;
    }
    if (params.get("content_type")) filters.contentType = params.get("content_type")!;
    if (params.get("service_area")) filters.serviceArea = params.get("service_area")!;
    if (params.get("search")) filters.search = params.get("search")!;
    if (params.get("date_from")) filters.dateFrom = params.get("date_from")!;
    if (params.get("date_to")) filters.dateTo = params.get("date_to")!;
    if (params.get("sort")) filters.sortBy = params.get("sort") as PostFilters["sortBy"];
    if (params.get("order")) filters.sortOrder = params.get("order") as PostFilters["sortOrder"];
    if (params.get("tag_ids")) filters.tagIds = params.get("tag_ids")!.split(",");
    if (params.get("campaign_id")) filters.campaignId = params.get("campaign_id")!;
    if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);
    if (params.get("offset")) filters.offset = parseInt(params.get("offset")!);

    // Single post by ID
    if (params.get("id")) {
      const post = await getPost(params.get("id")!);
      return NextResponse.json(post);
    }

    const { posts, count } = await getPosts(filters);
    return NextResponse.json({ posts, count });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const post = await createPost(body.post, body.created_from);
      return NextResponse.json(post);
    }

    if (action === "update") {
      const post = await updatePost(body.post_id, body.updates);
      return NextResponse.json(post);
    }

    if (action === "trash") {
      await trashPost(body.post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      await restorePost(body.post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "duplicate") {
      const post = await duplicatePost(body.post_id);
      return NextResponse.json(post);
    }

    if (action === "delete") {
      await deletePost(body.post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk_status") {
      await bulkUpdateStatus(body.post_ids, body.status);
      return NextResponse.json({ ok: true });
    }

    if (action === "bulk_delete") {
      await bulkDelete(body.post_ids);
      return NextResponse.json({ ok: true });
    }

    // Legacy compat: save array of posts
    if (action === "save" && body.posts) {
      const results = [];
      for (const p of body.posts) {
        results.push(await createPost({ ...p, brand_id: body.brand || p.brand_id }));
      }
      return NextResponse.json({ ok: true, posts: results });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
