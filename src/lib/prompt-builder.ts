import type { BrandConfig, PostConfig } from "./fb-specs";
import { getPostSpec } from "./fb-specs";

export function buildFBBannerPrompt(post: PostConfig, brand: BrandConfig): string {
  const spec = getPostSpec(post.type);

  const lines: string[] = [
    `Generate a Facebook ${spec.label} banner image at exactly ${spec.width}x${spec.height} pixels (${spec.aspect} aspect ratio).`,
    ``,
    `BRAND: ${brand.brand_name} - ${brand.tagline}`,
    `BRAND COLORS: Primary ${brand.color_primary}, Secondary ${brand.color_secondary}, Accent ${brand.color_accent}`,
    `BRAND TONE: ${brand.tone}`,
    `INDUSTRY: ${brand.industry}`,
    ``,
    `VISUAL SUBJECT: ${post.prompt}`,
  ];

  if (post.text_overlay) {
    lines.push(``, `TEXT TO RENDER IN THE IMAGE:`);
    if (post.text_overlay.headline) lines.push(`- HEADLINE (large, prominent): "${post.text_overlay.headline}"`);
    if (post.text_overlay.subline) lines.push(`- SUBLINE (smaller, below headline): "${post.text_overlay.subline}"`);
    if (post.text_overlay.cta) lines.push(`- CTA BUTTON/TEXT (bold, contrasting): "${post.text_overlay.cta}"`);
    lines.push(`- Text styling: ${brand.font_style}`);
    lines.push(`- ALL TEXT MUST BE PERFECTLY LEGIBLE AND CORRECTLY SPELLED`);
  }

  lines.push(
    ``,
    `FACEBOOK OPTIMIZATION RULES:`,
    `- Text overlay must occupy LESS THAN 20% of total image area`,
    `- Keep ALL key content in the CENTER 80% of the image (safe zone for mobile crop)`,
    `- LOGO HANDLING (CRITICAL): A brand logo has been provided as a reference image. You MUST:
  1. REMOVE the logo's background completely — make it transparent/seamless with the banner
  2. Place the EXACT original logo pixels as-is — do NOT redraw, regenerate, or alter ANY part of it
  3. Keep every letter, word, shape, color, and detail PIXEL-PERFECT identical to the original
  4. Do NOT add, remove, change, or re-spell any text that appears on the logo
  5. Position it in the bottom-right or top-left corner, small but readable (8-12% of image width)
  6. The logo must blend into the banner as if it were a transparent PNG overlay with NO visible background rectangle or box behind it
  7. If the logo has a white or solid background, CUT IT OUT so only the logo graphic remains`,
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
