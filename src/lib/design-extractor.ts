import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BrandConfig } from "./fb-specs";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const lite = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

export type DesignLanguage = {
  typography: string;
  composition: string;
  color_mood: string;
  visual_style: string;
  notable_patterns: string;
};

export const EMPTY_DESIGN_LANGUAGE: DesignLanguage = {
  typography: "",
  composition: "",
  color_mood: "",
  visual_style: "",
  notable_patterns: "",
};

/**
 * Convert a reference banner image into a short, abstract description of its
 * design language. The goal is to capture the HOW (typography, composition,
 * color mood, visual style) — not the WHAT (specific subjects). Downstream
 * image generation folds this into the prompt as creative direction, so the
 * output channels the reference's spirit without copying it.
 *
 * Each field is capped at ~20 words; the whole response is tight enough that
 * the image model doesn't drown in description.
 */
export async function extractDesignLanguage(
  referenceBase64: string,
  mimeType: string,
  brand: BrandConfig,
): Promise<DesignLanguage> {
  const instruction = `You are a visual design analyst. Inspect the attached banner/poster/ad image and extract ITS DESIGN LANGUAGE — the abstract patterns another designer could adopt. Do NOT describe the literal subject matter (people, products, scenes). Describe how the image COMMUNICATES visually so an AI image generator can improvise in this spirit.

Context: we're generating Facebook banners for brand "${brand.brand_name}" (${brand.industry}). Brand tone: ${brand.tone}. Output fields will be blended into the generator's prompt alongside the brand's own colors and logo.

Return ONLY a JSON object with these five keys. Each value is a single short phrase, max 20 words, no sentences, no periods at the end:

{
  "typography": "font character, weight, case, hierarchy, placement — e.g., 'tall condensed serif headlines, thin sans caps subtitle'",
  "composition": "layout, alignment, negative space, focal point — e.g., 'asymmetric left-heavy grid, generous white space, floating headline block'",
  "color_mood": "palette energy and atmosphere (not exact hex) — e.g., 'warm cream + deep navy with a single gold accent, luxe editorial calm'",
  "visual_style": "imagery treatment, rendering style, effects — e.g., 'editorial photo overlaid with flat typographic geometry, soft duotone grading'",
  "notable_patterns": "repeatable signature moves — e.g., 'corner stamp brand mark, diagonal text ribbon, thin hairline dividers'"
}

Return ONLY the JSON object, no preface, no code fence.`;

  const result = await lite.generateContent([
    { inlineData: { data: referenceBase64, mimeType } },
    { text: instruction },
  ]);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(text) as Partial<DesignLanguage>;

  return {
    typography: (parsed.typography || "").trim(),
    composition: (parsed.composition || "").trim(),
    color_mood: (parsed.color_mood || "").trim(),
    visual_style: (parsed.visual_style || "").trim(),
    notable_patterns: (parsed.notable_patterns || "").trim(),
  };
}

/** Returns true if at least one field is non-empty — used as a guard before
 * we inject the block into the image prompt. */
export function hasDesignDirection(d: DesignLanguage | null | undefined): d is DesignLanguage {
  if (!d) return false;
  return !!(d.typography || d.composition || d.color_mood || d.visual_style || d.notable_patterns);
}
