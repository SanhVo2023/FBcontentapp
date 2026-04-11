import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BrandConfig } from "./fb-specs";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

function brandContext(brand: BrandConfig): string {
  return `Brand: ${brand.brand_name} (${brand.tagline})
Industry: ${brand.industry}
Tone: ${brand.tone}
Audience: ${brand.target_audience}
Colors: ${brand.color_primary}, ${brand.color_secondary}`;
}

export async function generateCaptions(
  prompt: string, brand: BrandConfig, language: "vi" | "en" | "both"
): Promise<{ headline: string; subline: string; cta: string; caption_vi?: string; caption_en?: string }> {
  const langInstruction = language === "both"
    ? "Generate in BOTH Vietnamese and English."
    : language === "vi" ? "Generate in Vietnamese." : "Generate in English.";

  const result = await model.generateContent(`You are a Facebook ad copywriter for a law firm.

${brandContext(brand)}

Visual concept: ${prompt}

${langInstruction}

Return ONLY a JSON object:
{
  "headline": "Main headline for the banner (max 8 words)",
  "subline": "Supporting text (max 15 words)",
  "cta": "Call to action (max 4 words)"${language === "both" ? `,
  "caption_vi": "Full Vietnamese Facebook post caption (2-3 sentences, engaging, end with CTA)",
  "caption_en": "Full English Facebook post caption (2-3 sentences, engaging, end with CTA)"` : language === "vi" ? `,
  "caption_vi": "Full Vietnamese Facebook post caption (2-3 sentences)"` : `,
  "caption_en": "Full English Facebook post caption (2-3 sentences)"`}
}

Return ONLY the JSON, no explanation.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function suggestVariations(
  prompt: string, brand: BrandConfig
): Promise<string[]> {
  const result = await model.generateContent(`You are a creative director for Facebook ads.

${brandContext(brand)}

Original visual prompt: "${prompt}"

Generate 3 creative variations of this visual prompt. Each should be a different concept/angle but serve the same marketing goal.

Return ONLY a JSON array of 3 strings:
["variation 1 prompt", "variation 2 prompt", "variation 3 prompt"]

Return ONLY the JSON array.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function generateWeekContent(
  brand: BrandConfig, weekStart: string
): Promise<Array<{
  id: string; title: string; type: string; prompt: string;
  text_overlay: { headline: string; subline: string; cta: string };
  caption_vi: string; caption_en: string;
  content_type: string; scheduled_date: string; style: string;
}>> {
  const result = await model.generateContent(`You are a social media content strategist for a law firm in Vietnam.

${brandContext(brand)}
${brand.models?.length ? `Available model: "${brand.models[0].id}" (${brand.models[0].name})` : ""}

Generate 4 Facebook posts for the week starting ${weekStart}. Schedule them on Mon, Wed, Fri, Sat.

Content mix:
- Monday: Educational (tips, legal knowledge)
- Wednesday: Authority (featuring the firm's expertise, credentials)
- Friday: Promotional (free consultation, service highlight)
- Saturday: Engagement (question, seasonal, community)

For each post include BOTH Vietnamese and English captions.

Return ONLY a JSON array:
[{
  "id": "week-${weekStart}-edu",
  "title": "Short title",
  "type": "feed-square",
  "prompt": "Detailed visual description for AI image generation",
  "text_overlay": { "headline": "MAX 8 WORDS", "subline": "max 15 words", "cta": "max 4 words" },
  "caption_vi": "Full Vietnamese Facebook post text (2-4 sentences, engaging)",
  "caption_en": "Full English Facebook post text (2-4 sentences, engaging)",
  "content_type": "educational|authority|promotional|engagement",
  "scheduled_date": "YYYY-MM-DD",
  "style": "professional|bold|minimal|warm|dark-luxury|editorial"
}]

Use the brand's tone and colors. Mix Vietnamese and English headlines. Return ONLY JSON.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function suggestLegalContext(
  serviceArea: string, topic: string, brand: BrandConfig
): Promise<{ points: string[]; references: string[] }> {
  const result = await model.generateContent(`You are a Vietnamese legal content advisor.

${brandContext(brand)}
Service area: ${serviceArea}
Topic: ${topic}

Suggest legal context for a Facebook post about this topic:
1. Key legal points the audience should know (3-5 bullet points in Vietnamese)
2. Relevant Vietnamese law references (e.g., "Điều 51, Luật HN&GĐ 2014")

Return ONLY JSON:
{
  "points": ["Point 1 in Vietnamese", "Point 2", "Point 3"],
  "references": ["Luật ABC 2024, Điều X", "Bộ luật XYZ 2015, Điều Y"]
}

Return ONLY JSON.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function createPostFromContext(
  serviceArea: string, contentType: string, topic: string, legalContext: string,
  language: string, brand: BrandConfig
): Promise<{
  title: string; caption_vi?: string; caption_en?: string;
  headline: string; subline: string; cta: string;
}> {
  const result = await model.generateContent(`You are a Facebook content writer for a Vietnamese law firm.

${brandContext(brand)}
Service area: ${serviceArea}
Content type: ${contentType}
Topic: ${topic}
Legal context: ${legalContext}
Language: ${language === "both" ? "Vietnamese AND English" : language === "vi" ? "Vietnamese" : "English"}

Create a Facebook post:
- The caption should be engaging, informative, and end with a clear CTA
- Reference the legal context naturally (don't just list laws)
- Keep headline under 8 words, subline under 15 words, CTA under 4 words
- The tone must match the brand: ${brand.tone}

Return ONLY JSON:
{
  "title": "Short internal title for this post",
  ${language === "both" || language === "vi" ? '"caption_vi": "Full Vietnamese Facebook caption (3-5 sentences, engaging, ends with CTA)",' : ""}
  ${language === "both" || language === "en" ? '"caption_en": "Full English Facebook caption (3-5 sentences, engaging, ends with CTA)",' : ""}
  "headline": "HEADLINE FOR BANNER",
  "subline": "Supporting text for banner",
  "cta": "CTA TEXT"
}

Return ONLY JSON.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function createImagePromptFromContent(
  caption: string, headline: string, brand: BrandConfig
): Promise<string> {
  const result = await model.generateContent(`You are a creative director for Facebook ads.

${brandContext(brand)}

Post caption: "${caption}"
Banner headline: "${headline}"

Write a detailed visual description prompt for an AI image generator (Nano Banana 2) to create a Facebook banner for this post.

The prompt should:
- Describe the scene, composition, lighting, colors
- Match the brand's visual identity
- Be specific enough for an AI to generate a compelling image
- NOT include text (text overlay is handled separately)
- Be 2-3 sentences

Return ONLY the prompt text, no JSON, no quotes.`);

  return result.response.text().trim();
}

export async function generateFullPost(
  topic: string, postType: string, angle: string, language: string, brand: BrandConfig
): Promise<{
  title: string; caption_vi?: string; caption_en?: string;
  headline: string; subline: string; cta: string;
  image_prompt: string; service_area: string; suggested_date: string;
}> {
  const langInst = language === "both" ? "Generate BOTH Vietnamese and English captions."
    : language === "vi" ? "Vietnamese caption only." : "English caption only.";

  const nextDay = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const result = await model.generateContent(`You are a Facebook content creator for a Vietnamese law firm.

${brandContext(brand)}

Create a complete Facebook ${postType} about: "${topic}"
Content angle: ${angle}
${langInst}

Return ONLY JSON:
{
  "title": "Short title (under 10 words)",
  ${language !== "en" ? '"caption_vi": "Vietnamese Facebook caption. 3-5 sentences. Engaging, legal references, end with CTA.",' : ""}
  ${language !== "vi" ? '"caption_en": "English Facebook caption. 3-5 sentences. Engaging, end with CTA.",' : ""}
  "headline": "BANNER HEADLINE (max 6 words, uppercase)",
  "subline": "Supporting text (max 12 words)",
  "cta": "CTA text (max 3 words)",
  "image_prompt": "Visual description for AI image generator. Scene, composition, lighting, mood. 2-3 sentences. No text.",
  "service_area": "family-law|civil-disputes|land-real-estate|corporate|criminal|labor|commercial|foreign-investment|general",
  "suggested_date": "${nextDay}"
}

Tone: ${brand.tone}. Return ONLY JSON.`);

  const text = result.response.text().replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

export async function generateMonthContent(brand: BrandConfig, year: number, month: number) {
  // Get all Mondays of the month
  const weeks: string[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 1) weeks.push(date.toISOString().slice(0, 10));
    date.setDate(date.getDate() + 1);
  }
  if (weeks.length === 0) weeks.push(new Date(year, month - 1, 1).toISOString().slice(0, 10));

  const allPosts = [];
  for (const weekStart of weeks) {
    const posts = await generateWeekContent(brand, weekStart);
    allPosts.push(...posts);
  }
  return allPosts;
}
