// Netlify Background Function — does the slow AI image generation work
// outside of Netlify's 10s sync function cap. Triggered by /api/generate-start
// via a fire-and-forget POST to /.netlify/functions/generate-background.
// Netlify returns 202 to the caller immediately; this handler has up to
// 15 minutes to complete.
//
// Responsibilities:
//  1. Mark the job row as 'pending' (already done by caller).
//  2. Call Seedream or Gemini depending on the payload's `provider`.
//  3. Composite logo for Seedream (sharp, bottom-right).
//  4. Resize to the post's target FB spec.
//  5. Upload to R2.
//  6. Insert into post_images.
//  7. Update the job row: status='done' with a result payload, or 'failed'.

import sharp from "sharp";
import { generateFromText, generateFromMultipleImages } from "../../src/lib/gemini";
import { generateImageSeedream, seedreamSizeForSpec } from "../../src/lib/seedream";
import { compositeLogoBottomRight } from "../../src/lib/image-composite";
import { buildFBBannerPrompt } from "../../src/lib/prompt-builder";
import { getPostSpec } from "../../src/lib/fb-specs";
import { fetchR2AsBase64, uploadGeneratedImage } from "../../src/lib/r2-client";
import { updateJob } from "../../src/lib/db";
import { supabase } from "../../src/lib/supabase";
import type { BrandConfig, PostConfig } from "../../src/lib/fb-specs";
import type { DesignLanguage } from "../../src/lib/design-extractor";

type JobPayload = {
  job_id: string;
  post: PostConfig;
  brand: BrandConfig;
  includeLogo?: boolean;
  provider?: "gemini" | "seedream";
  designDirection?: DesignLanguage | null;
  variantType: string;
};

// Minimal Netlify function types — avoids a new dep on @netlify/functions.
type HandlerEvent = { body: string | null; httpMethod: string };
type HandlerResponse = { statusCode: number; body: string };
type Handler = (event: HandlerEvent) => Promise<HandlerResponse>;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: JobPayload;
  try {
    body = JSON.parse(event.body || "{}") as JobPayload;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON" }) };
  }

  const { job_id, post, brand, includeLogo = true, provider = "gemini", designDirection = null, variantType } = body;
  if (!job_id) return { statusCode: 400, body: JSON.stringify({ error: "job_id required" }) };

  try {
    const spec = getPostSpec(variantType as PostConfig["type"]);
    const prompt = buildFBBannerPrompt({ ...post, type: variantType as PostConfig["type"] }, brand, { includeLogo, designDirection });

    let raw: { buffer: Buffer; mimeType: string };

    if (provider === "seedream") {
      const seedSize = seedreamSizeForSpec(spec.width, spec.height);
      const t0 = Date.now();
      raw = await generateImageSeedream({ prompt, size: seedSize });
      console.log(`[generate-background] seedream ${seedSize} in ${Date.now() - t0}ms`);

      if (includeLogo && brand.logo && /^https?:/i.test(brand.logo)) {
        try {
          raw = await compositeLogoBottomRight(raw.buffer, brand.logo);
        } catch (e) {
          console.error("[generate-background] logo composite failed:", e);
        }
      }
    } else {
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
          images.push({ ...asset, label: `Photo of ${model.name} (${model.description}). Use this person as the main subject.` });
        }
      }

      if (post.use_reference) {
        const ref = brand.references?.find((r) => r.id === post.use_reference);
        if (ref?.path?.startsWith("http")) {
          const asset = await fetchR2AsBase64(ref.path);
          images.push({ ...asset, label: `Reference: ${ref.description}. Use as visual inspiration.` });
        }
      }

      const t0 = Date.now();
      raw = images.length > 0
        ? await generateFromMultipleImages(images, prompt)
        : await generateFromText(prompt);
      console.log(`[generate-background] gemini in ${Date.now() - t0}ms`);
    }

    // Resize to exact FB spec
    const optimized = await sharp(raw.buffer)
      .resize(spec.width, spec.height, { fit: "cover" })
      .png({ quality: 90 })
      .toBuffer();

    // Upload to R2
    const r2Url = await uploadGeneratedImage(optimized, brand.brand_id, post.id);

    // Insert into post_images with next version
    const { data: existing } = await supabase
      .from("post_images")
      .select("version")
      .eq("post_id", post.id)
      .eq("variant_type", variantType)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (existing?.[0]?.version || 0) + 1;

    const { data: img, error: imgErr } = await supabase
      .from("post_images")
      .insert({
        post_id: post.id,
        variant_type: variantType,
        prompt,
        r2_url: r2Url,
        status: "done",
        version: nextVersion,
        approved: false,
      })
      .select()
      .single();
    if (imgErr) throw new Error(imgErr.message);

    // Bump post status to images_done (legacy hook — lets existing kanban logic know images exist)
    await supabase.from("posts").update({ status: "images_done", updated_at: new Date().toISOString() }).eq("id", post.id);

    await updateJob(job_id, {
      status: "done",
      result: {
        r2_url: r2Url,
        variant_type: variantType,
        version: nextVersion,
        image_id: img?.id,
        provider,
      },
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, r2_url: r2Url }) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[generate-background] failed:", e);
    try { await updateJob(job_id, { status: "failed", error: msg }); } catch { /* ignore */ }
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
};
