import { NextRequest, NextResponse } from "next/server";
import { getClientSessionBrandId } from "@/lib/client-auth";
import { getPost, getBrand, getPostComments, createComment } from "@/lib/db";

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
