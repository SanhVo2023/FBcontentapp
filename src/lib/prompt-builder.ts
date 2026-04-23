import type { BrandConfig, PostConfig } from "./fb-specs";
import { getPostSpec } from "./fb-specs";
import type { DesignLanguage } from "./design-extractor";
import { hasDesignDirection } from "./design-extractor";

type BuildOpts = {
  includeLogo?: boolean;
  /** Creative mode — an abstract description of a reference banner's design
   *  language. Injected as directional inspiration (NOT a literal template)
   *  so the model adopts the spirit while keeping creative latitude. */
  designDirection?: DesignLanguage | null;
};

export function buildFBBannerPrompt(post: PostConfig, brand: BrandConfig, opts: BuildOpts = {}): string {
  const spec = getPostSpec(post.type);
  const includeLogo = opts.includeLogo !== false; // default true

  const lines: string[] = [
    `Generate a Facebook ${spec.label} banner image at exactly ${spec.width}x${spec.height} pixels (${spec.aspect} aspect ratio).`,
    ``,
    `BRAND: ${brand.brand_name} - ${brand.tagline}`,
    `BRAND COLORS: Primary ${brand.color_primary}, Secondary ${brand.color_secondary}, Accent ${brand.color_accent}`,
    `BRAND TONE: ${brand.tone}`,
    `INDUSTRY: ${brand.industry}`,
  ];

  if (hasDesignDirection(opts.designDirection)) {
    const d = opts.designDirection;
    const bullets: string[] = [];
    if (d.typography)        bullets.push(`- Typography: ${d.typography}`);
    if (d.composition)       bullets.push(`- Composition: ${d.composition}`);
    if (d.color_mood)        bullets.push(`- Color mood: ${d.color_mood}`);
    if (d.visual_style)      bullets.push(`- Visual style: ${d.visual_style}`);
    if (d.notable_patterns)  bullets.push(`- Notable patterns: ${d.notable_patterns}`);
    lines.push(
      ``,
      `DESIGN DIRECTION (creative inspiration — NOT a literal template):`,
      ...bullets,
      `INSTRUCTION: Absorb these cues as creative DIRECTION. Do NOT copy the reference — improvise in its spirit. BRAND COLORS above are the hard palette; "color mood" is atmospheric guidance only. Keep the output FRESH and CREATIVE — surprise us within this aesthetic.`,
    );
  }

  lines.push(
    ``,
    `VISUAL SUBJECT: ${post.prompt}`,
  );

  // Text-overlay block only prints when at least one field is filled.
  // Creative mode passes no overlay text so this block is skipped entirely
  // and the prompt decides its own composition (no baked-in headline).
  const ov = post.text_overlay;
  const hasOverlayText = ov && (ov.headline || ov.subline || ov.cta);
  if (hasOverlayText) {
    lines.push(``, `TEXT TO RENDER IN THE IMAGE:`);
    if (ov.headline) lines.push(`- HEADLINE (large, prominent): "${ov.headline}"`);
    if (ov.subline) lines.push(`- SUBLINE (smaller, below headline): "${ov.subline}"`);
    if (ov.cta) lines.push(`- CTA BUTTON/TEXT (bold, contrasting): "${ov.cta}"`);
    lines.push(`- Text styling: ${brand.font_style}`);
    lines.push(`- ALL TEXT MUST BE PERFECTLY LEGIBLE AND CORRECTLY SPELLED`);
  }

  lines.push(
    ``,
    `FACEBOOK OPTIMIZATION RULES:`,
    `- Text overlay must occupy LESS THAN 20% of total image area`,
    `- Keep ALL key content in the CENTER 80% of the image (safe zone for mobile crop)`,
  );

  if (includeLogo) {
    lines.push(
      `- LOGO HANDLING (CRITICAL): A brand logo has been provided as a reference image. You MUST:
  1. REMOVE the logo's background completely — make it transparent/seamless with the banner
  2. Place the EXACT original logo pixels as-is — do NOT redraw, regenerate, or alter ANY part of it
  3. Keep every letter, word, shape, color, and detail PIXEL-PERFECT identical to the original
  4. Do NOT add, remove, change, or re-spell any text that appears on the logo
  5. Position it in the bottom-right or top-left corner, small but readable (8-12% of image width)
  6. The logo must blend into the banner as if it were a transparent PNG overlay with NO visible background rectangle or box behind it
  7. If the logo has a white or solid background, CUT IT OUT so only the logo graphic remains`
    );
  } else {
    // User explicitly turned off the logo — emit a STRONG negative so the AI doesn't invent one.
    lines.push(
      `- NO LOGO (CRITICAL): Do NOT render, overlay, add, draw, invent, or suggest ANY logo, brand mark, watermark, crest, shield, badge, monogram, initials, signature, seal, icon representing a company, or stylized text resembling a brand name anywhere in the image. The banner must be free of any branding marks. NO LOGO. NO WATERMARK. NO BRAND ICONS.`
    );
  }

  lines.push(
    `- Use HIGH CONTRAST colors for maximum feed visibility`,
    `- ONE clear focal point — do not clutter the composition`,
    `- Clean, professional composition with intentional white space`,
    `- Colors should POP in a scrolling Facebook feed`,
    post.use_model
      ? `- Include the person from the reference photo as the MAIN SUBJECT, occupying 40-60% of frame`
      : `- ${post.prompt.toLowerCase().includes("person") || post.prompt.toLowerCase().includes("lawyer") ? "Include people as described" : "No people unless specified"}`,
    ``,
    `STYLE: ${getStyleDescription(post.style)}`,
    ``,
    `OUTPUT: A single, complete, ready-to-post Facebook banner. No mockups, no device frames, no borders.`,
  );

  return lines.join("\n");
}

function getStyleDescription(style: string): string {
  const map: Record<string, string> = {
    professional: "Clean corporate photography, soft lighting, trust-building aesthetic, muted professional tones",
    bold: "High contrast, saturated colors, dramatic lighting, attention-grabbing composition, strong typography",
    minimal: "Minimalist design, lots of white/negative space, elegant, refined, simple geometry",
    warm: "Warm color palette, natural lighting, inviting, approachable, human connection",
    "dark-luxury": "Dark background (#0a0a0a to #1a1a2e), gold/brass accents, luxury brand aesthetic, premium feel",
    vibrant: "Bright, colorful, energetic, modern gradients, youthful energy",
    editorial: "Magazine-quality, sophisticated composition, editorial photography, refined color grading",
  };
  return map[style] || style;
}
