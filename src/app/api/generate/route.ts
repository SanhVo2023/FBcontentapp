import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { generateFromText, generateFromMultipleImages } from "@/lib/gemini";
import { buildFBBannerPrompt } from "@/lib/prompt-builder";
import { getPostSpec } from "@/lib/fb-specs";
import { fetchR2AsBase64 } from "@/lib/r2-client";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";

export async function POST(req: NextRequest) {
  try {
    const { post, brand, testMode, includeLogo = true } = (await req.json()) as { post: PostConfig; brand: BrandConfig; testMode: boolean; includeLogo?: boolean };
    const spec = getPostSpec(post.type);
    const prompt = buildFBBannerPrompt(post, brand);

    const images: Array<{ base64: string; mimeType: string; label: string }> = [];

    // Fetch logo from R2 URL (when includeLogo is true)
    if (includeLogo && brand.logo && brand.logo.startsWith("http")) {
      try {
        const asset = await fetchR2AsBase64(brand.logo);
        images.push({ ...asset, label: `Brand logo for ${brand.brand_name}. For REFERENCE of brand identity only. Do NOT paste directly.` });
      } catch { /* logo optional */ }
    }

    // Fetch model photo from R2 URL
    if (post.use_model) {
      const model = brand.models?.find((m) => m.id === post.use_model);
      if (model?.photo?.startsWith("http")) {
        const asset = await fetchR2AsBase64(model.photo);
        images.push({ ...asset, label: `Photo of ${model.name} (${model.description}). Use this person as the main subject.` });
      }
    }

    // Fetch reference from R2 URL
    if (post.use_reference) {
      const ref = brand.references?.find((r) => r.id === post.use_reference);
      if (ref?.path?.startsWith("http")) {
        const asset = await fetchR2AsBase64(ref.path);
        images.push({ ...asset, label: `Reference: ${ref.description}. Use as visual inspiration.` });
      }
    }

    const result = images.length > 0
      ? await generateFromMultipleImages(images, prompt)
      : await generateFromText(prompt);

    const targetW = testMode ? Math.min(spec.width, 540) : spec.width;
    const targetH = testMode ? Math.round((spec.height / spec.width) * targetW) : spec.height;

    const optimized = await sharp(result.buffer)
      .resize(targetW, targetH, { fit: "cover" })
      .png({ quality: 90 })
      .toBuffer({ resolveWithObject: true });

    return NextResponse.json({
      imageBase64: optimized.data.toString("base64"),
      mimeType: "image/png",
      width: optimized.info.width,
      height: optimized.info.height,
      size: optimized.data.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
