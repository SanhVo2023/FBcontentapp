export const FB_POST_TYPES = [
  { value: "feed-square", label: "Feed Post (Square)", width: 1080, height: 1080, aspect: "1:1" },
  { value: "feed-wide", label: "Feed Post (Wide)", width: 1200, height: 630, aspect: "1.91:1" },
  { value: "story", label: "Story / Reel Cover", width: 1080, height: 1920, aspect: "9:16" },
  { value: "carousel", label: "Carousel Slide", width: 1080, height: 1080, aspect: "1:1" },
  { value: "ad-square", label: "Ad (Square)", width: 1080, height: 1080, aspect: "1:1" },
  { value: "ad-landscape", label: "Ad (Landscape)", width: 1200, height: 628, aspect: "1.91:1" },
  { value: "cover", label: "Page Cover Photo", width: 820, height: 312, aspect: "2.63:1" },
] as const;

export type PostType = (typeof FB_POST_TYPES)[number]["value"];

export function getPostSpec(type: string) {
  return FB_POST_TYPES.find((t) => t.value === type) ?? FB_POST_TYPES[0];
}

export const FB_STYLES = [
  { value: "professional", label: "Professional", desc: "Clean corporate look, trust-building" },
  { value: "bold", label: "Bold & Eye-catching", desc: "High contrast, attention-grabbing" },
  { value: "minimal", label: "Minimal", desc: "Clean white space, elegant" },
  { value: "warm", label: "Warm & Personal", desc: "Inviting, approachable, human" },
  { value: "dark-luxury", label: "Dark Luxury", desc: "Dark background, gold accents, premium" },
  { value: "vibrant", label: "Vibrant", desc: "Colorful, energetic, youthful" },
  { value: "editorial", label: "Editorial", desc: "Magazine-quality, sophisticated" },
];

export type BrandConfig = {
  brand_id: string;
  brand_name: string;
  tagline: string;
  logo: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_style: string;
  models: Array<{ id: string; name: string; photo: string; description: string }>;
  references: Array<{ id: string; path: string; description: string }>;
  tone: string;
  industry: string;
  target_audience: string;
};

export type ContentType = "educational" | "authority" | "promotional" | "engagement";

export type ImageVariant = {
  type: PostType;
  prompt?: string;
  preview?: string;
  result_url?: string;
  drive_url?: string;
  status: string;
};

export type PostConfig = {
  id: string;
  title: string;
  brand_id?: string;

  // Content
  service_area?: string;
  content_type?: ContentType;
  topic?: string;
  legal_context?: string;
  caption_vi?: string;
  caption_en?: string;
  language?: "vi" | "en" | "both";

  // Image generation
  type: PostType;
  prompt: string;
  text_overlay?: { headline?: string; subline?: string; cta?: string };
  use_model?: string | null;
  use_reference?: string | null;
  style: string;
  image_variants?: ImageVariant[];

  // Lifecycle
  status: string;
  scheduled_date?: string;
  trashed_at?: string;
  created_at?: string;
  updated_at?: string;

  // Legacy compat
  result_url?: string;
  drive_url?: string;
  preview?: string;
};

export const CONTENT_TYPES: { value: ContentType; label: string; color: string; emoji: string }[] = [
  { value: "educational", label: "Educational", color: "bg-blue-500", emoji: "📘" },
  { value: "authority", label: "Authority", color: "bg-purple-500", emoji: "⚖️" },
  { value: "promotional", label: "Promotional", color: "bg-green-500", emoji: "📢" },
  { value: "engagement", label: "Engagement", color: "bg-orange-500", emoji: "💬" },
];

export const SERVICE_AREAS = [
  { value: "family-law", label: "Hôn nhân & Gia đình / Family Law" },
  { value: "civil-disputes", label: "Dân sự / Civil Disputes" },
  { value: "land-real-estate", label: "Đất đai / Land & Real Estate" },
  { value: "corporate", label: "Doanh nghiệp / Corporate" },
  { value: "criminal", label: "Hình sự / Criminal Defense" },
  { value: "labor", label: "Lao động / Labor" },
  { value: "commercial", label: "Thương mại / Commercial" },
  { value: "foreign-investment", label: "Đầu tư nước ngoài / Foreign Investment" },
  { value: "general", label: "Tổng quát / General" },
];

export const POST_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-500" },
  { value: "review", label: "Review", color: "bg-yellow-500" },
  { value: "approved", label: "Approved", color: "bg-blue-500" },
  { value: "images_pending", label: "Images Pending", color: "bg-purple-500" },
  { value: "images_done", label: "Images Done", color: "bg-indigo-500" },
  { value: "scheduled", label: "Scheduled", color: "bg-teal-500" },
  { value: "published", label: "Published", color: "bg-green-500" },
  { value: "trashed", label: "Trashed", color: "bg-red-500" },
];

export type PostManifest = {
  brand_id: string;
  posts: PostConfig[];
};
