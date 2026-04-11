import { supabase } from "./supabase";
import type { BrandConfig, PostConfig } from "./fb-specs";

// ============================================
// TYPE MAPPINGS (Supabase row ↔ App types)
// ============================================

type BrandRow = {
  id: string;
  brand_id: string;
  brand_name: string;
  tagline: string;
  logo: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_style: string;
  tone: string;
  industry: string;
  target_audience: string;
  models: Array<{ id: string; name: string; photo: string; description: string }>;
  references: Array<{ id: string; path: string; description: string }>;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: string;
  brand_id: string;
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
  created_at: string;
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
    color_primary: row.color_primary || "#1a56db",
    color_secondary: row.color_secondary || "#1e3a5f",
    color_accent: row.color_accent || "#f59e0b",
    font_style: row.font_style || "modern",
    tone: row.tone || "",
    industry: row.industry || "",
    target_audience: row.target_audience || "",
    models: row.models || [],
    references: row.references || [],
  };
}

// Convert Supabase post row → app PostConfig
function toPostConfig(row: PostRow): PostConfig {
  return {
    id: row.id,
    title: row.title || "",
    brand_id: row.brand_id,
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
        color_primary: brand.color_primary,
        color_secondary: brand.color_secondary,
        color_accent: brand.color_accent,
        font_style: brand.font_style,
        tone: brand.tone,
        industry: brand.industry,
        target_audience: brand.target_audience,
        models: brand.models,
        references: brand.references,
      },
      { onConflict: "brand_id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteBrand(brandId: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("brand_id", brandId);
  if (error) throw new Error(error.message);
}

// ============================================
// POSTS
// ============================================

export type PostFilters = {
  brandId?: string;
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

  const { data, error } = await supabase
    .from("posts")
    .update(dbUpdates)
    .eq("id", postId)
    .select()
    .single();
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
