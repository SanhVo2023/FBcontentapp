import type { BrandConfig } from "./fb-specs";

export const VIETNAMESE_FB_WRITING_STYLE = `## VIETNAMESE FACEBOOK WRITING STYLE GUIDE
Follow these rules strictly when writing Vietnamese Facebook captions:

1. **Emoji as structure**: Use emoji as bullet points and emphasis throughout the text (e.g., ✅ 📌 👉 💡 ⚖️ 🏠). Every section should start with a relevant emoji.
2. **Line breaks between every thought**: Each point/sentence gets its own line. NEVER write long paragraphs. Use blank lines between sections.
3. **Attention-grabbing hook**: Start with a compelling question, exclamation, or bold statement with emoji (e.g., "🔥 Bạn đang bị tranh chấp đất đai?" or "⚠️ 5 ĐIỀU BẠN CẦN BIẾT khi ly hôn đơn phương!")
4. **Numbered lists with emoji**: Use 1️⃣ 2️⃣ 3️⃣ or ✅ for listing points
5. **Personal & conversational tone**: Even for professional/legal content, write as if talking to a friend. Use "bạn" (you), ask rhetorical questions.
6. **Contact info block at end**: Always end with a formatted contact block:
   ---
   📞 Hotline: (028) 66.701.709
   💬 Zalo: zalo.me/apololawyers
   📍 108 Trần Đình Xu, Q.1, TP.HCM
7. **Hashtags at end**: Mix Vietnamese and English hashtags (e.g., #LuậtSư #ApololLawyers #TưVấnPhápLý #LawyerHCMC)
8. **Short punchy sentences**: Max 1-2 lines per sentence. Break complex ideas into simple, digestible points.
9. **Vietnamese CTA style**: Use strong CTAs like "Liên hệ NGAY", "Inbox NGAY để được tư vấn MIỄN PHÍ", "Gọi ngay cho luật sư"
10. **Emotional connection**: Include empathetic phrases like "Apolo Lawyers hiểu rằng...", "Đừng lo lắng...", "Chúng tôi luôn đồng hành..."
`;


export function generatePostBatchPrompt(brand: BrandConfig, count = 12): string {
  return `You are a Facebook ad creative strategist. Generate ${count} Facebook post/ad banner configurations for the brand below.

## BRAND
- Name: ${brand.brand_name}
- Tagline: ${brand.tagline}
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Target Audience: ${brand.target_audience}
- Colors: Primary ${brand.color_primary}, Secondary ${brand.color_secondary}, Accent ${brand.color_accent}
- Font Style: ${brand.font_style}
${brand.models?.length ? `- Available Models: ${brand.models.map((m) => `"${m.id}" (${m.name} — ${m.description})`).join(", ")}` : "- No model photos available"}
${brand.references?.length ? `- Available References: ${brand.references.map((r) => `"${r.id}" (${r.description})`).join(", ")}` : "- No reference images"}

## OUTPUT FORMAT
Return ONLY a JSON array. Each item must follow this exact schema:
\`\`\`json
[
  {
    "id": "unique-slug-id",
    "title": "Human readable title for this post",
    "type": "feed-square",
    "prompt": "Detailed visual description of the banner image. Be specific about composition, lighting, subjects, and atmosphere.",
    "text_overlay": {
      "headline": "MAIN HEADLINE TEXT",
      "subline": "Supporting text line",
      "cta": "Call to action button text"
    },
    "use_model": "mr-hien",
    "use_reference": null,
    "style": "professional",
    "status": "pending"
  }
]
\`\`\`

## FIELD RULES
- **id**: unique kebab-case slug (e.g., "promo-divorce-consultation-1")
- **type**: one of: "feed-square" (1080x1080), "feed-wide" (1200x630), "story" (1080x1920), "carousel" (1080x1080), "ad-square" (1080x1080), "ad-landscape" (1200x628), "cover" (820x312)
- **prompt**: describe the VISUAL scene in detail. Mention composition, lighting, colors, subjects, atmosphere. Do NOT describe text — that goes in text_overlay.
- **text_overlay**: the text to render IN the image. Keep headline under 8 words. Subline under 15 words. CTA under 4 words.
- **use_model**: set to a model ID from the brand (e.g., "${brand.models?.[0]?.id || "null"}") or null for no person
- **use_reference**: set to a reference ID or null
- **style**: one of: "professional", "bold", "minimal", "warm", "dark-luxury", "vibrant", "editorial"

## FACEBOOK BEST PRACTICES
- Text in image must be <20% of total area
- Mix post types: some square, some wide, some stories
- Each post should have a different visual concept
- Vary styles: not all the same look
- Include both Vietnamese and English posts if the brand serves both markets
- Use model photos for authority/trust posts, skip model for abstract/conceptual posts
- CTA should drive action: "Liên hệ ngay", "Book Now", "Gọi luật sư", etc.

## REQUIREMENTS
- Generate exactly ${count} posts
- Mix of at least 3 different types
- Mix of at least 3 different styles
- At least 2 posts using the model (if available)
- Both Vietnamese AND English posts
- Return ONLY the JSON array, no explanation`;
}

export function generateBrandConfigPrompt(): string {
  return `Create a brand configuration JSON for the Apolo Content Studio app.

## OUTPUT FORMAT
Return ONLY a JSON object with this exact schema:
\`\`\`json
{
  "brand_id": "unique-kebab-case-id",
  "brand_name": "Full Brand Name",
  "tagline": "Brand tagline or slogan",
  "logo": "",
  "logos": [],
  "color_primary": "#hex",
  "color_secondary": "#hex",
  "color_accent": "#hex",
  "font_style": "Description of typography style",
  "tone": "Comma-separated tone descriptors",
  "industry": "Industry description",
  "target_audience": "Who the brand serves",
  "models": [],
  "references": [],
  "sample_posts": [],
  "client_password": ""
}
\`\`\`

## FIELD RULES
- **brand_id** (required): unique, lowercase, kebab-case (e.g., "apolo-lawyers")
- **brand_name** (required): public display name
- **tagline**: short slogan (under 60 chars)
- **logo**: leave as empty string — uploaded via the Brands page
- **logos**: array of extra logo variants \`[{ "id": "slug", "url": "", "label": "White on dark" }]\`. Leave empty — uploaded later.
- **color_primary / color_secondary / color_accent**: valid hex colors. Primary = dominant brand color, Secondary = supporting tone, Accent = attention-grabbing highlight
- **font_style**: typography feel (e.g., "Elegant serif headlines, clean sans-serif body")
- **tone**: comma-separated personality traits (e.g., "Authoritative, trustworthy, premium")
- **industry**: one-line industry description
- **target_audience**: who the brand serves (demographic + psychographic)
- **models**: array of real people for banners \`[{ "id": "slug", "name": "Full Name", "photo": "", "description": "Role/identifier" }]\`. Leave empty — photos uploaded via the Brands page.
- **references**: array of style-reference images \`[{ "id": "slug", "path": "", "description": "What this looks like" }]\`. Leave empty — uploaded later.
- **sample_posts**: array of reference Facebook posts that show the brand's voice \`[{ "id": "slug", "label": "Short label", "text": "Full post text including emoji, line breaks, contact block, hashtags" }]\`. Use for AI style-matching during post generation. Include 2–4 representative samples if you have them.
- **client_password**: optional. If set, the brand's client can log in at \`/client\` with this password to review/approve posts. Leave empty for creator-only brands.

Return ONLY the JSON, no explanation.`;
}

export function generatePostBulkPrompt(brand: BrandConfig, count = 10): string {
  return `You are a Facebook content strategist generating ${count} posts for the brand below. Output will be imported into Apolo Content Studio via bulk-post JSON import.

## BRAND
- Name: ${brand.brand_name} (${brand.tagline})
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Audience: ${brand.target_audience}
- Colors: ${brand.color_primary} / ${brand.color_secondary} / ${brand.color_accent}
- Font style: ${brand.font_style}
${brand.models?.length ? `- Available models (use the \`id\` in use_model): ${brand.models.map((m) => `"${m.id}" (${m.name} — ${m.description})`).join(", ")}` : "- No model photos available — use_model: null"}
${brand.references?.length ? `- Available references (use the \`id\` in use_reference): ${brand.references.map((r) => `"${r.id}" (${r.description})`).join(", ")}` : "- No reference images — use_reference: null"}
${brand.sample_posts?.length ? `\n## STYLE REFERENCE SAMPLES (match shape & voice)\n${brand.sample_posts.map((s, i) => `--- SAMPLE ${i + 1}: ${s.label} ---\n${s.text}`).join("\n\n")}\n` : ""}

## OUTPUT FORMAT
Return ONLY a JSON array. Each item is one post with this exact schema:
\`\`\`json
[
  {
    "title": "Short human-readable title (under 10 words)",
    "topic": "Subject of the post (plain Vietnamese or English phrase)",
    "caption_vi": "Full Vietnamese Facebook caption with emoji, line breaks, contact block, hashtags",
    "caption_en": "Full English Facebook caption with emoji, line breaks, contact block, hashtags",
    "content_type": "educational",
    "service_area": "family-law",
    "language": "both",
    "type": "feed-square",
    "prompt": "Visual description of the image: scene, composition, lighting, subject, mood. 2-3 sentences. Do NOT include any text in the scene — text goes in text_overlay.",
    "text_overlay": {
      "headline": "BANNER HEADLINE (max 6 words, uppercase)",
      "subline": "Supporting line (max 12 words)",
      "cta": "CTA (max 3 words)"
    },
    "style": "professional",
    "use_model": null,
    "use_reference": null,
    "scheduled_date": "2026-04-22",
    "ads_enabled": false,
    "status": "draft"
  }
]
\`\`\`

## FIELD RULES
- **title** (required): short title shown in lists
- **topic**: plain subject line for filtering & regeneration
- **caption_vi / caption_en**: the actual Facebook caption body. Include at least one if \`language\` = "vi" or "en"; include both if \`language\` = "both". Follow the style reference samples above for structure (emoji headers, bullet points, rhetorical questions, CTA block, contact block, hashtags).
- **content_type**: one of \`educational\` | \`authority\` | \`promotional\` | \`engagement\`
- **service_area**: one of \`family-law\` | \`civil-disputes\` | \`land-real-estate\` | \`corporate\` | \`criminal\` | \`labor\` | \`commercial\` | \`foreign-investment\` | \`general\`
- **language**: \`vi\` | \`en\` | \`both\`
- **type**: one of \`feed-square\` (1080×1080), \`feed-wide\` (1200×630), \`story\` (1080×1920), \`carousel\` (1080×1080), \`ad-square\` (1080×1080), \`ad-landscape\` (1200×628), \`cover\` (820×312). Default \`feed-square\`.
- **prompt**: describe the VISUAL scene for the AI image generator. No text in image.
- **text_overlay**: text rendered ON the image. Short; keeps <20% of image area.
- **style**: one of \`professional\` | \`bold\` | \`minimal\` | \`warm\` | \`dark-luxury\` | \`vibrant\` | \`editorial\`
- **use_model**: set to a model \`id\` from the brand's models list above, or \`null\`
- **use_reference**: set to a reference \`id\` from the brand's references list above, or \`null\`
- **scheduled_date**: \`YYYY-MM-DD\` or null — weekday suggestion for publishing
- **ads_enabled**: \`true\` if the post is part of a paid ads campaign (ads fields are filled in the app)
- **status**: always \`"draft"\` for imported posts

## CONTENT MIX
- Generate exactly ${count} posts
- Mix content_types: at least 2 educational, 2 authority, 2 promotional, 2 engagement
- Mix service_areas (if brand serves multiple)
- Mix post types: at least 3 different \`type\` values
- Vary visual styles: at least 3 different \`style\` values
- If the brand has sample_posts above, match their structure/voice/emoji-patterns

Return ONLY the JSON array, no explanation.`;
}

export function generateContentCalendarPrompt(brand: BrandConfig, weeks = 4): string {
  return `You are a social media content strategist. Create a ${weeks}-week Facebook content calendar for the brand below. Generate 4 posts per week (${weeks * 4} total).

## BRAND
- Name: ${brand.brand_name} (${brand.tagline})
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Audience: ${brand.target_audience}
- Colors: ${brand.color_primary} / ${brand.color_secondary} / ${brand.color_accent}
${brand.models?.length ? `- Model: ${brand.models.map((m) => `"${m.id}" — ${m.name}`).join(", ")}` : ""}

## CONTENT MIX PER WEEK
- 1x Educational/Value post (tips, legal knowledge, industry insights)
- 1x Authority/Trust post (featuring the lawyer/team, credentials, experience)
- 1x Promotional/CTA post (service promotion, free consultation, special offer)
- 1x Engagement post (question, poll-style, community, seasonal/topical)

## CALENDAR STRUCTURE
Organize posts by week. For each post include:
- Week number and suggested day (Mon/Wed/Fri/Sat)
- Content theme and angle

## OUTPUT FORMAT
Return ONLY a JSON array following this exact schema:
\`\`\`json
[
  {
    "id": "week1-edu-legal-tips",
    "title": "Week 1 Mon - Legal Tips for Business Owners",
    "type": "feed-square",
    "prompt": "Professional infographic-style banner showing...",
    "text_overlay": {
      "headline": "5 ĐIỀU DOANH NGHIỆP CẦN BIẾT",
      "subline": "Về luật lao động 2024",
      "cta": "Tìm hiểu thêm"
    },
    "use_model": null,
    "style": "professional",
    "status": "pending"
  }
]
\`\`\`

Use the same field rules as post batches. Return ONLY JSON.`;
}

export const APOLO_BRAND_GUIDELINES = `## APOLO LAWYERS Brand Guidelines

### Identity
- Legal Name: CÔNG TY LUẬT APOLO LAWYERS
- English: APOLO LAWYERS — Solicitors & Litigators
- Managing Partner: Luật sư Võ Thiện Hiển (Henry Vo)

### Visual Identity
- Primary: Navy #1a1a2e (backgrounds, headers)
- Secondary: Gold #c5a55a (accents, highlights, luxury elements)
- Accent: White #ffffff (text on dark, clean contrast)
- Typography: Elegant serif for headlines, clean sans-serif for body. Luxury law firm aesthetic.
- Photography: Warm golden lighting, premium office interiors, HCMC skyline. Editorial quality.

### Tone of Voice
- Authoritative but approachable
- Professional, not cold
- Luxury positioning — premium service, not budget
- Confident expertise — "we know the law, we protect your rights"
- Bilingual — Vietnamese primary, English for international clients

### Contact Information
- HQ: 108 Trần Đình Xu, Phường Cầu Ông Lãnh, TP. Hồ Chí Minh
- Branch: Tầng 09, K&M Tower, 33 Ung Văn Khiêm, TP.HCM
- Hotline: (028) 66.701.709 | 0903.419.479 | 0903.600.347
- Email: contact@apolo.com.vn
- Zalo: https://zalo.me/apololawyers
- WhatsApp: https://wa.me/84903419479
- Web VN: https://apolo.com.vn
- Web EN: https://apololawyers.com

### CTA Labels
- Vietnamese: "Liên hệ ngay", "Gọi luật sư", "Chat Zalo", "Đặt lịch tư vấn", "Gửi yêu cầu tư vấn"
- English: "Contact Us", "Call a Lawyer", "Book a Consultation", "Request Legal Advice", "Chat via WhatsApp"

### Practice Areas
- Civil Disputes (Tranh chấp dân sự)
- Land & Real Estate (Đất đai / Bất động sản)
- Family Law & Divorce (Hôn nhân gia đình / Ly hôn)
- Corporate Law (Luật doanh nghiệp)
- Labor Disputes (Tranh chấp lao động)
- Criminal Defense (Hình sự)
- Foreign Investment (Đầu tư nước ngoài)
- Commercial Disputes (Tranh chấp thương mại)
`;
