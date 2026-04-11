import { NextRequest, NextResponse } from "next/server";
import { getPostThumbnails } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const ids = req.nextUrl.searchParams.get("post_ids");
    if (!ids) return NextResponse.json({});
    const postIds = ids.split(",").filter(Boolean);
    const thumbnails = await getPostThumbnails(postIds);
    return NextResponse.json(thumbnails);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
