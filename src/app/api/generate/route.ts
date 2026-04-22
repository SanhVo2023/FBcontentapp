import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { generateFromText, generateFromMultipleImages } from "@/lib/gemini";
import { generateImageSeedream, seedreamSizeForSpec } from "@/lib/seedream";
import { compositeLogoBottomRight } from "@/lib/image-composite";
import { buildFBBannerPrompt } from "@/lib/prompt-builder";
import { getPostSpec } from "@/lib/fb-specs";
import { fetchR2AsBase64 } from "@/lib/r2-client";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import type { DesignLanguage } from "@/lib/design-extractor";

export const maxDuration = 120;

type Provider = "gemini" | "seedream";

export async function POST(req: NextRequest) {
  try {
    const {
      post, brand, testMode, includeLogo = true,
      provider = "gemini",
      designDirection = null,
    } = (await req.json()) as {
      post: PostConfig;
      brand: BrandConfig;
      testMode: boolean;
      includeLogo?: boolean;
      provider?: Provider;
      designDirection?: DesignLanguage | null;
    };

    const spec = getPostSpec(post.type);
    const prompt = buildFBBannerPrompt(post, brand, { includeLogo, designDirection });

    let raw: { buffer: Buffer; mimeType: string };

    if (provider === "seedream") {
      // Seedream = prompt-to-image. We don't feed logo/model/reference as
      // image inputs — the logo is composited post-hoc with sharp so branding
      // stays consistent across providers.
      //
      // Seedream 5.0 requires explicit WIDTHxHEIGHT dimensions (the "2K"
      // preset is rejected on this model variant). seedreamSizeForSpec maps
      // the FB spec to a ~1-megapixel Seedream size that matches the aspect
      // ratio. We keep output around 1 MP because Netlify Starter-plan
      // functions cap at 10s and 2K+ generation blows past that. Sharp
      // upscales to the exact FB spec afterwards.
      const seedSize = seedreamSizeForSpec(spec.width, spec.height);
      const t0 = Date.now();
      raw = await generateImageSeedream({
        prompt,
        size: seedSize,
      });
      console.log(`[seedream] ${seedSize} generated in ${Date.now() - t0}ms`);

      if (includeLogo && brand.logo && /^https?:/i.test(brand.logo)) {
        try {
          raw = await compositeLogoBottomRight(raw.buffer, brand.logo);
        } catch {
          // Logo composite is nice-to-have; don't fail generation if it hiccups.
        }
      }
    } else {
      // Gemini path — feeds logo/model/reference as conditioning images.
      const images: Array<{ base64: string; mimeType: string; label: string }> = [];

      if (includeLogo && brand.logo && brand.logo.startsWith("http")) {
        try {
          const asset = await fetchR2AsBase64(brand.logo);
          images.push({
            ...asset,
            label: `Brand logo for ${brand.brand_name}. CRITICAL: Remove the background completely. Place the EXACT original logo pixels unchanged — do NOT redraw or alter any text/shapes/colors. Overlay it transparently in a corner, small but readable.`,
          });
        } catch { /* logo optional */ }
      }

      if (post.use_model) {
        const model = brand.models?.find((m) => m.id === post.use_model);
        if (model?.photo?.startsWith("http")) {
          const asset = await fetchR2AsBase64(model.photo);
          images.push({
            ...asset,
            label: `Photo of ${model.name} (${model.description}). Use this person as the main subject.`,
          });
        }
      }

      if (post.use_reference) {
        const ref = brand.references?.find((r) => r.id === post.use_reference);
        if (ref?.path?.startsWith("http")) {
          const asset = await fetchR2AsBase64(ref.path);
          images.push({
            ...asset,
            label: `Reference: ${ref.description}. Use as visual inspiration.`,
          });
        }
      }

      raw = images.length > 0
        ? await generateFromMultipleImages(images, prompt)
        : await generateFromText(prompt);
    }

    const targetW = testMode ? Math.min(spec.width, 540) : spec.width;
    const targetH = testMode ? Math.round((spec.height / spec.width) * targetW) : spec.height;

    const optimized = await sharp(raw.buffer)
      .resize(targetW, targetH, { fit: "cover" })
      .png({ quality: 90 })
      .toBuffer({ resolveWithObject: true });

    return NextResponse.json({
      imageBase64: optimized.data.toString("base64"),
      mimeType: "image/png",
      width: optimized.info.width,
      height: optimized.info.height,
      size: optimized.data.length,
      provider,
    });
  } catch (e: unknown) {
    // Log full error server-side (shows in Netlify function logs) and return
    // a clean message to the client so the UI can display what went wrong.
    console.error("[/api/generate] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
