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

export type LogoVariant = { id: string; url: string; label: string };

export type SamplePost = { id: string; label: string; text: string };

export type BrandConfig = {
  brand_id: string;
  brand_name: string;
  tagline: string;
  logo: string;
  logos: LogoVariant[];
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_style: string;
  models: Array<{ id: string; name: string; photo: string; description: string }>;
  references: Array<{ id: string; path: string; description: string }>;
  sample_posts: SamplePost[];
  tone: string;
  industry: string;
  target_audience: string;
  client_password?: string;    // admin-set in brands page; enables brand client login to /client
};

// Client-side approval state (populated by /client portal actions)
export type ClientVerifyState = "pending" | "approved" | "rejected" | "revise";

// Post comment (shared between creator + client)
export type PostComment = {
  id: string;
  post_id: string;
  author_role: "client" | "creator";
  author_name: string | null;
  body: string;
  created_at: string;
  edited_at?: string | null;
};

export const TONE_PRESETS = [
  { value: "professional", label: "Chuyên nghiệp & uy tín", desc: "Professional & authoritative" },
  { value: "friendly", label: "Thân thiện & gần gũi", desc: "Friendly & conversational" },
  { value: "urgent", label: "Khẩn cấp & thúc đẩy", desc: "Urgent & promotional" },
  { value: "educational", label: "Giáo dục & thông tin", desc: "Educational & informative" },
  { value: "empathetic", label: "Thấu cảm & động viên", desc: "Empathetic & supportive" },
  { value: "custom", label: "Tùy chỉnh", desc: "Custom tone text" },
];

export function getTonePrompt(tone: string, customText?: string): string {
  if (tone === "custom") return customText || "";
  const preset = TONE_PRESETS.find((t) => t.value === tone);
  return preset ? `${preset.label} (${preset.desc})` : tone;
}

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
  campaign_id?: string;

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

  // Sheet sync
  sheet_post_id?: string;       // e.g., "VN-042"
  sheet_row_url?: string;       // direct link to sheet row
  sheet_status?: string;        // latest pulled status from sheet
  sheet_synced_at?: string;     // ISO timestamp of last sync

  // Ads campaign (optional — post doubles as an ads campaign)
  ads_enabled?: boolean;
  ads_name?: string;
  ads_objective?: string;       // Awareness | Traffic | Leads | Conversions | ...
  ads_audience?: string;
  ads_audience_detail?: string;
  ads_placement?: string;       // Feed | Stories | Reels | ...
  ads_cta?: string;
  ads_landing_url?: string;
  ads_budget_per_day?: number;
  ads_duration_days?: number;
  ads_campaign_id?: string;     // CMP-### from sheet after push

  // Client portal approval state
  client_verify_text?: ClientVerifyState;
  client_verify_image?: ClientVerifyState;
  client_verify_ads?: ClientVerifyState;
  client_approval_notes?: string;
  client_approved_at?: string;

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
  { value: "draft", label: "Nháp", color: "bg-gray-500" },
  { value: "review", label: "Review", color: "bg-yellow-500" },
  { value: "submitted", label: "Đã gửi Sheet", color: "bg-teal-500" },
  { value: "approved", label: "Đã duyệt", color: "bg-green-500" },
  { value: "images_pending", label: "Images Pending", color: "bg-purple-500" },
  { value: "images_done", label: "Images Done", color: "bg-indigo-500" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { value: "published", label: "Đã đăng", color: "bg-emerald-500" },
  { value: "trashed", label: "Thùng rác", color: "bg-red-500" },
];

// Kanban simplified 3-column grouping
export const KANBAN_COLUMNS = [
  { key: "draft" as const, label: "Nháp", color: "bg-gray-500", dotColor: "#6B7280" },
  { key: "submitted" as const, label: "Đã gửi", color: "bg-teal-500", dotColor: "#14B8A6" },
  { key: "approved" as const, label: "Đã duyệt", color: "bg-green-500", dotColor: "#10B981" },
];

export const KANBAN_STATUS_GROUPS: Record<"draft" | "submitted" | "approved", string[]> = {
  draft: ["draft", "review", "images_pending", "images_done"],
  submitted: ["submitted"],
  approved: ["approved", "scheduled", "published"],
};

export function getKanbanColumn(status: string): "draft" | "submitted" | "approved" | null {
  for (const [col, statuses] of Object.entries(KANBAN_STATUS_GROUPS)) {
    if (statuses.includes(status)) return col as "draft" | "submitted" | "approved";
  }
  return null;
}

export function isLegacyDraftStatus(status: string): boolean {
  return ["review", "images_pending", "images_done"].includes(status);
}

export type PostManifest = {
  brand_id: string;
  posts: PostConfig[];
};
