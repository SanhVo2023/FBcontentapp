import type { BrandConfig } from "./fb-specs";

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
  return `Create a brand configuration JSON for a Facebook banner generator app.

## OUTPUT FORMAT
Return ONLY a JSON object with this exact schema:
\`\`\`json
{
  "brand_id": "unique-kebab-case-id",
  "brand_name": "Full Brand Name",
  "tagline": "Brand tagline or slogan",
  "logo": "",
  "color_primary": "#hex",
  "color_secondary": "#hex",
  "color_accent": "#hex",
  "font_style": "Description of typography style",
  "tone": "Comma-separated tone descriptors",
  "industry": "Industry description",
  "target_audience": "Who the brand serves",
  "models": [],
  "references": []
}
\`\`\`

## FIELD RULES
- **brand_id**: unique, lowercase, kebab-case
- **colors**: valid hex colors. Primary = main brand color, Secondary = accent, Accent = text/contrast
- **font_style**: describe the typography feel (e.g., "Modern sans-serif, clean and minimal")
- **tone**: comma-separated personality traits (e.g., "Professional, trustworthy, modern")
- **logo**: leave empty — will be uploaded separately
- **models/references**: leave as empty arrays — will be added via the app

Return ONLY the JSON, no explanation.`;
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
