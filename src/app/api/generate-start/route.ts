import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/db";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import type { DesignLanguage } from "@/lib/design-extractor";

// Kicks off a background image-generation job. The actual AI call + sharp +
// R2 upload happens in /netlify/functions/generate-background, which returns
// 202 to our fire-and-forget fetch almost instantly (Netlify's Background
// Function contract) so this endpoint itself stays well under the 10s cap.
//
// Response: { job_id } — the client then polls /api/generate-poll?id=... .

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const {
      post, brand, includeLogo = true, provider = "gemini",
      designDirection = null, variantType,
    } = (await req.json()) as {
      post: PostConfig;
      brand: BrandConfig;
      includeLogo?: boolean;
      provider?: "gemini" | "seedream";
      designDirection?: DesignLanguage | null;
      variantType: string;
    };

    if (!post?.id) return NextResponse.json({ error: "post.id required" }, { status: 400 });
    if (!variantType) return NextResponse.json({ error: "variantType required" }, { status: 400 });

    const job = await createJob({
      kind: "image_gen",
      post_id: post.id,
      payload: {
        post_id: post.id,
        variantType,
        provider,
        includeLogo,
        designDirection,
        brand_id: brand.brand_id,
      },
    });

    // Fire-and-forget: Netlify background functions respond 202 on receipt.
    // We await the initial response so we know the function was accepted,
    // but don't wait for it to actually finish.
    const origin = new URL(req.url).origin;
    const bgUrl = `${origin}/.netlify/functions/generate-background`;

    try {
      await fetch(bgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          post, brand, includeLogo, provider, designDirection, variantType,
        }),
      });
    } catch (e) {
      // If the kick-off itself fails, mark the job failed so the poller
      // doesn't spin forever.
      console.error("[generate-start] kick-off fetch failed:", e);
    }

    return NextResponse.json({ job_id: job.id });
  } catch (e: unknown) {
    console.error("[generate-start] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
