import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import type { DesignLanguage } from "@/lib/design-extractor";
import { hasDesignDirection } from "@/lib/design-extractor";

export const maxDuration = 30;

// Produces TWO distinct image-generation prompts for the current post.
// Uses everything we know — brand, caption text, banner text, content_type,
// style, optional creative-mode design direction — and asks Gemini to
// return two deliberately DIFFERENT creative angles:
//   variant_a — editorial / literal (shows the subject directly)
//   variant_b — conceptual / metaphorical (symbolism, abstract composition)
// Result feeds the image generator on either or both clicks, so the user
// gets two distinct creative takes per post without having to write prompts.

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const lite = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

export async function POST(req: NextRequest) {
  try {
    const { brand, post, designDirection, userDirection, creativeMode } = (await req.json()) as {
      brand: BrandConfig;
      post: PostConfig;
      designDirection?: DesignLanguage | null;
      userDirection?: string;  // Creative-mode: short hint the user types
      creativeMode?: boolean;  // When true, omit banner-text fields (no in-image text)
    };

    if (!brand?.brand_name || !post) {
      return NextResponse.json({ error: "brand + post required" }, { status: 400 });
    }

    const caption = (post.caption_vi || post.caption_en || "").slice(0, 400);
    // Creative mode doesn't bake headline/subline/cta into the image — the
    // prompt itself decides composition. Standard mode passes them through.
    const headline = creativeMode ? "" : (post.text_overlay?.headline || "");
    const subline = creativeMode ? "" : (post.text_overlay?.subline || "");
    const cta = creativeMode ? "" : (post.text_overlay?.cta || "");
    const currentPrompt = (post.prompt || "").slice(0, 300);

    const ddBlock = hasDesignDirection(designDirection)
      ? `
## DESIGN DIRECTION (creative inspiration — reference banner's voice)
- Typography: ${designDirection.typography || "—"}
- Composition: ${designDirection.composition || "—"}
- Color mood: ${designDirection.color_mood || "—"}
- Visual style: ${designDirection.visual_style || "—"}
- Notable patterns: ${designDirection.notable_patterns || "—"}

Both variants should ABSORB this direction (composition, mood, visual rhythm) without copying the reference literally.
`
      : "";

    const userDirectionBlock = userDirection && userDirection.trim()
      ? `\n## USER DIRECTION (creative brief from the creator — respect this)\n${userDirection.trim()}\n`
      : "";

    const overlayBlock = (headline || subline || cta)
      ? `- Banner headline: ${headline || "—"}
- Banner subline: ${subline || "—"}
- Banner CTA: ${cta || "—"}`
      : `- (Creative mode: no banner text — the prompt decides composition entirely. Do NOT describe any text, words, logos, or captions inside the scene.)`;

    const instruction = `You are a senior creative director for Facebook ad visuals. Write TWO distinct image-generation prompts for the post below. Each prompt feeds a text-to-image model (Gemini or Seedream) to produce the banner's visual. Text overlays are added separately, so do NOT mention text/captions in the scene.

## BRAND
- Name: ${brand.brand_name} (${brand.tagline})
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Audience: ${brand.target_audience}
- Palette: primary ${brand.color_primary}, secondary ${brand.color_secondary}, accent ${brand.color_accent}
- Font feel: ${brand.font_style}

## POST CONTENT
- Title: ${post.title || "—"}
- Topic: ${post.topic || "—"}
- Content type / angle: ${post.content_type || "general"}
- Visual style preset: ${post.style || "professional"}
- Format: ${post.type || "feed-square"}
${overlayBlock}
- Caption excerpt (for context, do NOT quote): ${caption || "—"}
- User's current prompt draft (optional starting point): ${currentPrompt || "—"}
${userDirectionBlock}${ddBlock}

## TASK
Return TWO prompts that approach the same post from DIFFERENT creative angles:

- **variant_a — editorial / literal**: show the subject directly in a documentary / editorial style. Think magazine photo, real scene, tangible subject matter tied to the topic.
- **variant_b — conceptual / metaphorical**: use symbolism, abstract composition, unexpected angle, or visual metaphor to EXPRESS the idea (not show it literally). Think art-direction-led poster, negative space, single symbolic object, dramatic lighting.

## PROMPT-WRITING RULES
- 2 to 3 sentences each, vivid and specific.
- Include at minimum: subject, composition, lighting, mood, camera/angle cues where apt.
- Respect the brand tone and visual style preset.
- If DESIGN DIRECTION is present, let it colour the style (composition, mood, rhythm) — but do NOT copy the reference literally.
- NEVER mention text, words, captions, labels, logos, typography, or banner text inside the scene. The banner text is overlaid afterwards.
- NO lists, NO numbering. Each variant is one prose block.

Return ONLY this JSON (no preface, no markdown fence):
{
  "variant_a": "<editorial / literal prompt, 2-3 sentences>",
  "variant_b": "<conceptual / metaphorical prompt, 2-3 sentences>"
}`;

    const result = await lite.generateContent(instruction);
    const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text) as { variant_a?: string; variant_b?: string };

    return NextResponse.json({
      variant_a: (parsed.variant_a || "").trim(),
      variant_b: (parsed.variant_b || "").trim(),
    });
  } catch (e: unknown) {
    console.error("[image-prompt-suggest] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
