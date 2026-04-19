import { supabase } from "./supabase";
import type { BrandConfig, PostConfig, CampaignConfig, CampaignStatus, ContextType, ClientVerifyState, PostComment } from "./fb-specs";

// ============================================
// TYPE MAPPINGS (Supabase row ↔ App types)
// ============================================

type BrandRow = {
  id: string;
  brand_id: string;
  brand_name: string;
  tagline: string;
  logo: string;
  logos: Array<{ id: string; url: string; label: string }> | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_style: string;
  tone: string;
  industry: string;
  target_audience: string;
  models: Array<{ id: string; name: string; photo: string; description: string }>;
  references: Array<{ id: string; path: string; description: string }>;
  sample_posts: Array<{ id: string; label: string; text: string }> | null;
  client_password: string | null;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: string;
  brand_id: string;
  campaign_id: string | null;
  title: string;
  service_area: string | null;
  content_type: string | null;
  topic: string;
  legal_context: string;
  caption_vi: string;
  caption_en: string;
  language: string;
  post_type: string;
  prompt: string;
  text_overlay: { headline?: string; subline?: string; cta?: string };
  use_model: string | null;
  use_reference: string | null;
  style: string;
  status: string;
  scheduled_date: string | null;
  trashed_at: string | null;
  created_from: string;
  sheet_post_id: string | null;
  sheet_row_url: string | null;
  sheet_status: string | null;
  sheet_synced_at: string | null;
  ads_enabled: boolean | null;
  ads_name: string | null;
  ads_objective: string | null;
  ads_audience: string | null;
  ads_audience_detail: string | null;
  ads_placement: string | null;
  ads_cta: string | null;
  ads_landing_url: string | null;
  ads_budget_per_day: number | null;
  ads_duration_days: number | null;
  ads_campaign_id: string | null;
  client_verify_text: string | null;
  client_verify_image: string | null;
  client_verify_ads: string | null;
  client_approval_notes: string | null;
  client_approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PostImageRow = {
  id: string;
  post_id: string;
  variant_type: string;
  prompt: string;
  r2_url: string;
  drive_url: string | null;
  status: string;
  version: number;
  approved: boolean;
  created_at: string;
};

export type PostCommentRow = {
  id: string;
  post_id: string;
  author_role: string;
  author_name: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
};

export type CampaignRow = {
  id: string;
  brand_id: string;
  name: string;
  description: string;
  content_idea: string;
  context_type: string;
  context_detail: string;
  status: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TagRow = {
  id: string;
  brand_id: string;
  name: string;
  color: string;
};

export type GoalTemplateRow = {
  id: string;
  brand_id: string | null;
  name: string;
  description: string;
  post_defaults: Record<string, unknown>;
  schedule_pattern: string;
  created_at: string;
};

// Convert Supabase brand row → app BrandConfig
function toBrandConfig(row: BrandRow): BrandConfig {
  return {
    brand_id: row.brand_id,
    brand_name: row.brand_name,
    tagline: row.tagline || "",
    logo: row.logo || "",
    logos: row.logos || [],
    color_primary: row.color_primary || "#1a56db",
    color_secondary: row.color_secondary || "#1e3a5f",
    color_accent: row.color_accent || "#f59e0b",
    font_style: row.font_style || "modern",
    tone: row.tone || "",
    industry: row.industry || "",
    target_audience: row.target_audience || "",
    models: row.models || [],
    references: row.references || [],
    sample_posts: row.sample_posts || [],
    client_password: row.client_password || undefined,
  };
}

// Convert Supabase post row → app PostConfig
function toPostConfig(row: PostRow): PostConfig {
  return {
    id: row.id,
    title: row.title || "",
    brand_id: row.brand_id,
    campaign_id: row.campaign_id || undefined,
    service_area: row.service_area || undefined,
    content_type: (row.content_type as PostConfig["content_type"]) || undefined,
    topic: row.topic || undefined,
    legal_context: row.legal_context || undefined,
    caption_vi: row.caption_vi || undefined,
    caption_en: row.caption_en || undefined,
    language: (row.language as PostConfig["language"]) || "both",
    type: row.post_type as PostConfig["type"],
    prompt: row.prompt || "",
    text_overlay: row.text_overlay || {},
    use_model: row.use_model,
    use_reference: row.use_reference,
    style: row.style || "professional",
    status: row.status || "draft",
    scheduled_date: row.scheduled_date || undefined,
    trashed_at: row.trashed_at || undefined,
    sheet_post_id: row.sheet_post_id || undefined,
    sheet_row_url: row.sheet_row_url || undefined,
    sheet_status: row.sheet_status || undefined,
    sheet_synced_at: row.sheet_synced_at || undefined,
    ads_enabled: row.ads_enabled || false,
    ads_name: row.ads_name || undefined,
    ads_objective: row.ads_objective || undefined,
    ads_audience: row.ads_audience || undefined,
    ads_audience_detail: row.ads_audience_detail || undefined,
    ads_placement: row.ads_placement || undefined,
    ads_cta: row.ads_cta || undefined,
    ads_landing_url: row.ads_landing_url || undefined,
    ads_budget_per_day: row.ads_budget_per_day ?? undefined,
    ads_duration_days: row.ads_duration_days ?? undefined,
    ads_campaign_id: row.ads_campaign_id || undefined,
    client_verify_text: (row.client_verify_text as ClientVerifyState) || "pending",
    client_verify_image: (row.client_verify_image as ClientVerifyState) || "pending",
    client_verify_ads: (row.client_verify_ads as ClientVerifyState) || "pending",
    client_approval_notes: row.client_approval_notes || undefined,
    client_approved_at: row.client_approved_at || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Convert Supabase campaign row → app CampaignConfig
function toCampaignConfig(row: CampaignRow): CampaignConfig {
  return {
    id: row.id,
    brand_id: row.brand_id,
    name: row.name || "",
    description: row.description || "",
    content_idea: row.content_idea || "",
    context_type: (row.context_type as ContextType) || "content",
    context_detail: row.context_detail || "",
    status: (row.status as CampaignStatus) || "draft",
    target_date: row.target_date || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================
// BRANDS
// ============================================

export async function getBrands(): Promise<BrandConfig[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("brand_name");
  if (error) throw new Error(error.message);
  return (data as BrandRow[]).map(toBrandConfig);
}

export async function getBrand(brandId: string): Promise<BrandConfig | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("brand_id", brandId)
    .single();
  if (error) return null;
  return toBrandConfig(data as BrandRow);
}

export async function saveBrand(brand: BrandConfig): Promise<void> {
  const { error } = await supabase
    .from("brands")
    .upsert(
      {
        brand_id: brand.brand_id,
        brand_name: brand.brand_name,
        tagline: brand.tagline,
        logo: brand.logo,
        logos: brand.logos || [],
        color_primary: brand.color_primary,
        color_secondary: brand.color_secondary,
        color_accent: brand.color_accent,
        font_style: brand.font_style,
        tone: brand.tone,
        industry: brand.industry,
        target_audience: brand.target_audience,
        models: brand.models,
        references: brand.references,
        sample_posts: brand.sample_posts || [],
        client_password: brand.client_password ?? null,
      },
      { onConflict: "brand_id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteBrand(brandId: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("brand_id", brandId);
  if (error) throw new Error(error.message);
}

export async function getBrandReferenceCount(brandId: string): Promise<{ posts: number; campaigns: number; tags: number }> {
  const [posts, campaigns, tags] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    supabase.from("tags").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
  ]);
  return {
    posts: posts.count || 0,
    campaigns: campaigns.count || 0,
    tags: tags.count || 0,
  };
}

export async function deleteBrandCascade(brandId: string): Promise<void> {
  const { data: postRows } = await supabase.from("posts").select("id").eq("brand_id", brandId);
  const postIds = (postRows || []).map((r) => r.id);

  if (postIds.length > 0) {
    await supabase.from("post_tags").delete().in("post_id", postIds);
    await supabase.from("post_images").delete().in("post_id", postIds);
    await supabase.from("posts").delete().in("id", postIds);
  }

  await supabase.from("campaigns").delete().eq("brand_id", brandId);
  await supabase.from("tags").delete().eq("brand_id", brandId);

  const { error } = await supabase.from("brands").delete().eq("brand_id", brandId);
  if (error) throw new Error(error.message);
}

// ============================================
// POSTS
// ============================================

export type PostFilters = {
  brandId?: string;
  campaignId?: string;
  status?: string | string[];
  contentType?: string;
  serviceArea?: string;
  tagIds?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "created_at" | "scheduled_date" | "updated_at" | "title";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function getPosts(filters: PostFilters = {}): Promise<{ posts: PostConfig[]; count: number }> {
  let query = supabase.from("posts").select("*", { count: "exact" });

  if (filters.brandId) query = query.eq("brand_id", filters.brandId);
  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.contentType) query = query.eq("content_type", filters.contentType);
  if (filters.serviceArea) query = query.eq("service_area", filters.serviceArea);
  if (filters.dateFrom) query = query.gte("scheduled_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("scheduled_date", filters.dateTo);

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,caption_vi.ilike.%${filters.search}%,caption_en.ilike.%${filters.search}%,topic.ilike.%${filters.search}%`);
  }

  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc", nullsFirst: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let posts = (data as PostRow[]).map(toPostConfig);

  // Tag filtering requires a second query if tagIds specified
  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data: taggedPostIds } = await supabase
      .from("post_tags")
      .select("post_id")
      .in("tag_id", filters.tagIds);
    const ids = new Set((taggedPostIds || []).map((r) => r.post_id));
    posts = posts.filter((p) => ids.has(p.id));
  }

  return { posts, count: count || 0 };
}

export async function getPost(postId: string): Promise<PostConfig | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error) return null;
  return toPostConfig(data as PostRow);
}

export async function createPost(
  post: Partial<PostConfig> & { brand_id: string },
  createdFrom: string = "scratch"
): Promise<PostConfig> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      brand_id: post.brand_id,
      campaign_id: post.campaign_id || null,
      title: post.title || "",
      service_area: post.service_area || null,
      content_type: post.content_type || null,
      topic: post.topic || "",
      legal_context: post.legal_context || "",
      caption_vi: post.caption_vi || "",
      caption_en: post.caption_en || "",
      language: post.language || "both",
      post_type: post.type || "feed-square",
      prompt: post.prompt || "",
      text_overlay: post.text_overlay || {},
      use_model: post.use_model || null,
      use_reference: post.use_reference || null,
      style: post.style || "professional",
      status: post.status || "draft",
      scheduled_date: post.scheduled_date || null,
      created_from: createdFrom,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toPostConfig(data as PostRow);
}

export async function updatePost(postId: string, updates: Partial<PostConfig>): Promise<PostConfig> {
  // Map app field names to DB column names
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.service_area !== undefined) dbUpdates.service_area = updates.service_area;
  if (updates.content_type !== undefined) dbUpdates.content_type = updates.content_type;
  if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
  if (updates.legal_context !== undefined) dbUpdates.legal_context = updates.legal_context;
  if (updates.caption_vi !== undefined) dbUpdates.caption_vi = updates.caption_vi;
  if (updates.caption_en !== undefined) dbUpdates.caption_en = updates.caption_en;
  if (updates.language !== undefined) dbUpdates.language = updates.language;
  if (updates.type !== undefined) dbUpdates.post_type = updates.type;
  if (updates.prompt !== undefined) dbUpdates.prompt = updates.prompt;
  if (updates.text_overlay !== undefined) dbUpdates.text_overlay = updates.text_overlay;
  if (updates.use_model !== undefined) dbUpdates.use_model = updates.use_model;
  if (updates.use_reference !== undefined) dbUpdates.use_reference = updates.use_reference;
  if (updates.style !== undefined) dbUpdates.style = updates.style;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.scheduled_date !== undefined) dbUpdates.scheduled_date = updates.scheduled_date || null;
  if (updates.trashed_at !== undefined) dbUpdates.trashed_at = updates.trashed_at;
  if (updates.brand_id !== undefined) dbUpdates.brand_id = updates.brand_id;
  if (updates.campaign_id !== undefined) dbUpdates.campaign_id = updates.campaign_id || null;
  if (updates.sheet_post_id !== undefined) dbUpdates.sheet_post_id = updates.sheet_post_id || null;
  if (updates.sheet_row_url !== undefined) dbUpdates.sheet_row_url = updates.sheet_row_url || null;
  if (updates.sheet_status !== undefined) dbUpdates.sheet_status = updates.sheet_status || null;
  if (updates.sheet_synced_at !== undefined) dbUpdates.sheet_synced_at = updates.sheet_synced_at || null;
  if (updates.ads_enabled !== undefined) dbUpdates.ads_enabled = !!updates.ads_enabled;
  if (updates.ads_name !== undefined) dbUpdates.ads_name = updates.ads_name || null;
  if (updates.ads_objective !== undefined) dbUpdates.ads_objective = updates.ads_objective || null;
  if (updates.ads_audience !== undefined) dbUpdates.ads_audience = updates.ads_audience || null;
  if (updates.ads_audience_detail !== undefined) dbUpdates.ads_audience_detail = updates.ads_audience_detail || null;
  if (updates.ads_placement !== undefined) dbUpdates.ads_placement = updates.ads_placement || null;
  if (updates.ads_cta !== undefined) dbUpdates.ads_cta = updates.ads_cta || null;
  if (updates.ads_landing_url !== undefined) dbUpdates.ads_landing_url = updates.ads_landing_url || null;
  if (updates.ads_budget_per_day !== undefined) dbUpdates.ads_budget_per_day = updates.ads_budget_per_day ?? null;
  if (updates.ads_duration_days !== undefined) dbUpdates.ads_duration_days = updates.ads_duration_days ?? null;
  if (updates.ads_campaign_id !== undefined) dbUpdates.ads_campaign_id = updates.ads_campaign_id || null;
  if (updates.client_verify_text !== undefined) dbUpdates.client_verify_text = updates.client_verify_text || null;
  if (updates.client_verify_image !== undefined) dbUpdates.client_verify_image = updates.client_verify_image || null;
  if (updates.client_verify_ads !== undefined) dbUpdates.client_verify_ads = updates.client_verify_ads || null;
  if (updates.client_approval_notes !== undefined) dbUpdates.client_approval_notes = updates.client_approval_notes || null;
  if (updates.client_approved_at !== undefined) dbUpdates.client_approved_at = updates.client_approved_at || null;

  // Resilient update: if DB rejects because a column doesn't exist (old schema,
  // migration not run), strip the offending column and retry. Prevents a single
  // missing column from blocking all saves.
  const optionalCols = [
    "sheet_post_id", "sheet_row_url", "sheet_status", "sheet_synced_at",
    "ads_enabled", "ads_name", "ads_objective", "ads_audience", "ads_audience_detail",
    "ads_placement", "ads_cta", "ads_landing_url", "ads_budget_per_day",
    "ads_duration_days", "ads_campaign_id", "campaign_id",
    "client_verify_text", "client_verify_image", "client_verify_ads", "client_approval_notes", "client_approved_at",
  ];
  let result = await supabase.from("posts").update(dbUpdates).eq("id", postId).select().single();
  let attempts = 0;
  while (result.error && attempts < optionalCols.length) {
    const msg = result.error.message || "";
    const match = msg.match(/column\s+"?([a-z_]+)"?\s+(?:of\s+relation|does not exist)/i)
      || msg.match(/could not find\s+the\s+['"]?([a-z_]+)['"]?\s+column/i);
    const missingCol = match?.[1];
    if (!missingCol || !(missingCol in dbUpdates)) break;
    console.warn(`[db] Missing column "${missingCol}", stripping and retrying update`);
    delete dbUpdates[missingCol];
    result = await supabase.from("posts").update(dbUpdates).eq("id", postId).select().single();
    attempts++;
  }
  const { data, error } = result;
  if (error) throw new Error(error.message);
  return toPostConfig(data as PostRow);
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function trashPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "trashed", trashed_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function restorePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "draft", trashed_at: null })
    .eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function duplicatePost(postId: string): Promise<PostConfig> {
  const original = await getPost(postId);
  if (!original) throw new Error("Post not found");
  return createPost({
    ...original,
    title: `${original.title} (copy)`,
    status: "draft",
    scheduled_date: undefined,
    brand_id: original.brand_id!,
  });
}

export async function bulkCreatePosts(
  posts: Array<Partial<PostConfig> & { brand_id: string }>
): Promise<PostConfig[]> {
  const rows = posts.map((p) => ({
    brand_id: p.brand_id,
    campaign_id: p.campaign_id || null,
    title: p.title || "",
    service_area: p.service_area || null,
    content_type: p.content_type || null,
    topic: p.topic || "",
    legal_context: p.legal_context || "",
    caption_vi: p.caption_vi || "",
    caption_en: p.caption_en || "",
    language: p.language || "both",
    post_type: p.type || "feed-square",
    prompt: p.prompt || "",
    text_overlay: p.text_overlay || {},
    use_model: p.use_model || null,
    use_reference: p.use_reference || null,
    style: p.style || "professional",
    status: p.status || "draft",
    scheduled_date: p.scheduled_date || null,
    created_from: "json_import" as const,
  }));

  const { data, error } = await supabase.from("posts").insert(rows).select();
  if (error) throw new Error(error.message);
  return (data as PostRow[]).map(toPostConfig);
}

export async function bulkUpdateStatus(postIds: string[], status: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status })
    .in("id", postIds);
  if (error) throw new Error(error.message);
}

export async function bulkDelete(postIds: string[]): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ status: "trashed", trashed_at: new Date().toISOString() })
    .in("id", postIds);
  if (error) throw new Error(error.message);
}

// ============================================
// POST IMAGES
// ============================================

export async function getPostThumbnails(postIds: string[]): Promise<Record<string, string>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("post_images")
    .select("post_id, r2_url")
    .in("post_id", postIds)
    .eq("status", "done")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  // Deduplicate: take first image per post
  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (!map[row.post_id] && row.r2_url) map[row.post_id] = row.r2_url;
  }
  return map;
}

export async function getPostImages(postId: string): Promise<PostImageRow[]> {
  const { data, error } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", postId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as PostImageRow[];
}

export async function savePostImage(image: {
  post_id: string;
  variant_type: string;
  prompt?: string;
  r2_url?: string;
  drive_url?: string;
  status?: string;
  version?: number;
  approved?: boolean;
}): Promise<PostImageRow> {
  const { data, error } = await supabase
    .from("post_images")
    .insert({
      post_id: image.post_id,
      variant_type: image.variant_type,
      prompt: image.prompt || "",
      r2_url: image.r2_url || "",
      drive_url: image.drive_url || null,
      status: image.status || "pending",
      version: image.version || 1,
      approved: image.approved || false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PostImageRow;
}

export async function updatePostImage(imageId: string, updates: Partial<PostImageRow>): Promise<void> {
  const { error } = await supabase
    .from("post_images")
    .update(updates)
    .eq("id", imageId);
  if (error) throw new Error(error.message);
}

// ============================================
// TAGS
// ============================================

export async function getTags(brandId: string): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("brand_id", brandId)
    .order("name");
  if (error) throw new Error(error.message);
  return data as TagRow[];
}

export async function createTag(brandId: string, name: string, color?: string): Promise<TagRow> {
  const { data, error } = await supabase
    .from("tags")
    .insert({ brand_id: brandId, name, color: color || "#6b7280" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TagRow;
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw new Error(error.message);
}

export async function getPostTags(postId: string): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from("post_tags")
    .select("tag_id, tags(*)")
    .eq("post_id", postId);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => r.tags as TagRow);
}

export async function addTagToPost(postId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("post_tags")
    .upsert({ post_id: postId, tag_id: tagId });
  if (error) throw new Error(error.message);
}

export async function removeTagFromPost(postId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
}

export async function bulkAddTag(postIds: string[], tagId: string): Promise<void> {
  const rows = postIds.map((post_id) => ({ post_id, tag_id: tagId }));
  const { error } = await supabase.from("post_tags").upsert(rows);
  if (error) throw new Error(error.message);
}

// ============================================
// GOAL TEMPLATES
// ============================================

export async function getTemplates(brandId?: string): Promise<GoalTemplateRow[]> {
  let query = supabase.from("goal_templates").select("*").order("name");
  if (brandId) {
    query = query.or(`brand_id.eq.${brandId},brand_id.is.null`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as GoalTemplateRow[];
}

export async function createTemplate(template: {
  brand_id?: string;
  name: string;
  description?: string;
  post_defaults?: Record<string, unknown>;
  schedule_pattern?: string;
}): Promise<GoalTemplateRow> {
  const { data, error } = await supabase
    .from("goal_templates")
    .insert({
      brand_id: template.brand_id || null,
      name: template.name,
      description: template.description || "",
      post_defaults: template.post_defaults || {},
      schedule_pattern: template.schedule_pattern || "",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GoalTemplateRow;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from("goal_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
}

// ============================================
// CAMPAIGNS
// ============================================

export type CampaignFilters = {
  brandId?: string;
  status?: string | string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "created_at" | "updated_at" | "target_date" | "name";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function getCampaigns(filters: CampaignFilters = {}): Promise<{ campaigns: CampaignConfig[]; count: number }> {
  let query = supabase.from("campaigns").select("*", { count: "exact" });

  if (filters.brandId) query = query.eq("brand_id", filters.brandId);

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content_idea.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) query = query.gte("target_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("target_date", filters.dateTo);

  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc", nullsFirst: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { campaigns: (data as CampaignRow[]).map(toCampaignConfig), count: count || 0 };
}

export async function getCampaign(campaignId: string): Promise<CampaignConfig | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (error) return null;
  return toCampaignConfig(data as CampaignRow);
}

export async function createCampaign(campaign: Partial<CampaignConfig> & { brand_id: string }): Promise<CampaignConfig> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: campaign.brand_id,
      name: campaign.name || "",
      description: campaign.description || "",
      content_idea: campaign.content_idea || "",
      context_type: campaign.context_type || "content",
      context_detail: campaign.context_detail || "",
      status: campaign.status || "draft",
      target_date: campaign.target_date || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCampaignConfig(data as CampaignRow);
}

export async function updateCampaign(campaignId: string, updates: Partial<CampaignConfig>): Promise<CampaignConfig> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.content_idea !== undefined) dbUpdates.content_idea = updates.content_idea;
  if (updates.context_type !== undefined) dbUpdates.context_type = updates.context_type;
  if (updates.context_detail !== undefined) dbUpdates.context_detail = updates.context_detail;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.target_date !== undefined) dbUpdates.target_date = updates.target_date || null;

  const { data, error } = await supabase
    .from("campaigns")
    .update(dbUpdates)
    .eq("id", campaignId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCampaignConfig(data as CampaignRow);
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw new Error(error.message);
}

export async function trashCampaign(campaignId: string): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "trashed" })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
}

export async function getCampaignPosts(campaignId: string): Promise<PostConfig[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("campaign_id", campaignId)
    .neq("status", "trashed")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data as PostRow[]).map(toPostConfig);
}

export async function getCampaignSummaries(
  campaignIds: string[]
): Promise<Record<string, { post_count: number; image_count: number; thumbnails: string[] }>> {
  if (!campaignIds.length) return {};

  // Get post counts per campaign
  const { data: posts } = await supabase
    .from("posts")
    .select("id, campaign_id, status")
    .in("campaign_id", campaignIds)
    .neq("status", "trashed");

  const postsByCampaign: Record<string, string[]> = {};
  for (const p of posts || []) {
    if (!postsByCampaign[p.campaign_id]) postsByCampaign[p.campaign_id] = [];
    postsByCampaign[p.campaign_id].push(p.id);
  }

  // Get thumbnails
  const allPostIds = (posts || []).map((p) => p.id);
  const thumbnails = allPostIds.length ? await getPostThumbnails(allPostIds) : {};

  // Get image counts
  let imageCounts: Record<string, number> = {};
  if (allPostIds.length) {
    const { data: images } = await supabase
      .from("post_images")
      .select("post_id")
      .in("post_id", allPostIds)
      .eq("status", "done");
    for (const img of images || []) {
      imageCounts[img.post_id] = (imageCounts[img.post_id] || 0) + 1;
    }
  }

  const result: Record<string, { post_count: number; image_count: number; thumbnails: string[] }> = {};
  for (const cid of campaignIds) {
    const cPostIds = postsByCampaign[cid] || [];
    result[cid] = {
      post_count: cPostIds.length,
      image_count: cPostIds.reduce((sum, pid) => sum + (imageCounts[pid] || 0), 0),
      thumbnails: cPostIds.slice(0, 4).map((pid) => thumbnails[pid]).filter(Boolean),
    };
  }
  return result;
}

// ============================================
// IMAGE VERSIONING
// ============================================

export async function getPostImageVersions(postId: string): Promise<PostImageRow[]> {
  const { data, error } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", postId)
    .order("variant_type")
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return data as PostImageRow[];
}

export async function getNextImageVersion(postId: string, variantType: string): Promise<number> {
  const { data } = await supabase
    .from("post_images")
    .select("version")
    .eq("post_id", postId)
    .eq("variant_type", variantType)
    .order("version", { ascending: false })
    .limit(1);
  return (data?.[0]?.version || 0) + 1;
}

export async function approveImage(imageId: string): Promise<void> {
  // Get the image to find its post_id and variant_type
  const { data: img } = await supabase
    .from("post_images")
    .select("post_id, variant_type")
    .eq("id", imageId)
    .single();
  if (!img) throw new Error("Image not found");

  // Approve this image
  await supabase.from("post_images").update({ approved: true }).eq("id", imageId);

  // Un-approve other versions of the same variant
  await supabase
    .from("post_images")
    .update({ approved: false })
    .eq("post_id", img.post_id)
    .eq("variant_type", img.variant_type)
    .neq("id", imageId);
}

export async function trashNonApprovedImages(postId: string): Promise<void> {
  await supabase
    .from("post_images")
    .update({ status: "trashed" })
    .eq("post_id", postId)
    .eq("approved", false)
    .neq("status", "trashed");
}

// ============================================
// POST COMMENTS
// ============================================

function toPostComment(row: PostCommentRow): PostComment {
  return {
    id: row.id,
    post_id: row.post_id,
    author_role: row.author_role === "client" ? "client" : "creator",
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at,
    edited_at: row.edited_at || null,
  };
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PostCommentRow[]).map(toPostComment);
}

export async function getPostCommentCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from("post_comments")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data || []) counts[row.post_id] = (counts[row.post_id] || 0) + 1;
  return counts;
}

export async function createComment(input: {
  post_id: string;
  author_role: "client" | "creator";
  author_name?: string | null;
  body: string;
}): Promise<PostComment> {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: input.post_id,
      author_role: input.author_role,
      author_name: input.author_name ?? null,
      body: input.body,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toPostComment(data as PostCommentRow);
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("post_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateComment(id: string, body: string): Promise<PostComment> {
  const { data, error } = await supabase
    .from("post_comments")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toPostComment(data as PostCommentRow);
}

export async function getComment(id: string): Promise<PostComment | null> {
  const { data, error } = await supabase.from("post_comments").select("*").eq("id", id).single();
  if (error) return null;
  return toPostComment(data as PostCommentRow);
}
