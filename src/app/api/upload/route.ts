import { NextRequest, NextResponse } from "next/server";
import { uploadGeneratedImage } from "@/lib/r2-client";
import { getPostSpec } from "@/lib/fb-specs";
import { savePostImage, updatePost } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, brand, postId, title, type, prompt } = await req.json();
    const spec = getPostSpec(type);
    let r2_url = "";

    // Upload to R2
    try {
      const buffer = Buffer.from(imageBase64, "base64");
      r2_url = await uploadGeneratedImage(buffer, brand, postId);
    } catch { /* R2 optional */ }

    // Save image record to Supabase
    if (postId && r2_url) {
      try {
        await savePostImage({
          post_id: postId,
          variant_type: type || "feed-square",
          prompt: prompt?.slice(0, 500) || "",
          r2_url,
          status: "done",
        });
        // Update post status to images_done
        await updatePost(postId, { status: "images_done" });
      } catch { /* DB save optional — image is already in R2 */ }
    }

    return NextResponse.json({ ok: true, r2_url, type: spec.label, size: `${spec.width}x${spec.height}` });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
