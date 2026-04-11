"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES, SERVICE_AREAS, FB_POST_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";

type TagRow = { id: string; brand_id: string; name: string; color: string };
type PostImageRow = { id: string; post_id: string; variant_type: string; r2_url: string; status: string; created_at: string };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<PostConfig | null>(null);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [images, setImages] = useState<PostImageRow[]>([]);
  const [allTags, setAllTags] = useState<TagRow[]>([]);
  const [postTags, setPostTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [captionVi, setCaptionVi] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [cta, setCta] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("draft");
  const [contentType, setContentType] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [postType, setPostType] = useState("feed-square");
  const [language, setLanguage] = useState("both");
  const [topic, setTopic] = useState("");

  // Image generation
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set(["feed-square"]));
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  // New tag
  const [newTagName, setNewTagName] = useState("");

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const p = await api(`/api/posts?id=${postId}`);
        if (!p) { setError("Post not found"); setLoading(false); return; }
        setPost(p);
        setTitle(p.title || "");
        setCaptionVi(p.caption_vi || "");
        setCaptionEn(p.caption_en || "");
        setHeadline(p.text_overlay?.headline || "");
        setSubline(p.text_overlay?.subline || "");
        setCta(p.text_overlay?.cta || "");
        setPrompt(p.prompt || "");
        setStatus(p.status || "draft");
        setContentType(p.content_type || "");
        setServiceArea(p.service_area || "");
        setScheduledDate(p.scheduled_date || "");
        setPostType(p.type || "feed-square");
        setLanguage(p.language || "both");
        setTopic(p.topic || "");

        // Load brand
        if (p.brand_id) {
          const brands = await api("/api/brands");
          const b = (Array.isArray(brands) ? brands : []).find((x: BrandConfig) => x.brand_id === p.brand_id);
          if (b) setBrand(b);

          // Load tags
          const tags = await api(`/api/tags?brand=${p.brand_id}`);
          setAllTags(Array.isArray(tags) ? tags : []);
          const pTags = await api(`/api/tags?post_id=${postId}`);
          setPostTags(Array.isArray(pTags) ? pTags : []);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true); setError(null); setMsg(null);
    try {
      await api("/api/posts", {
        action: "update",
        post_id: postId,
        updates: {
          title, caption_vi: captionVi, caption_en: captionEn,
          text_overlay: { headline, subline, cta },
          prompt, status, content_type: contentType || null,
          service_area: serviceArea || null, scheduled_date: scheduledDate || null,
          type: postType, language, topic,
        },
      });
      setMsg("Saved");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }, [postId, title, captionVi, captionEn, headline, subline, cta, prompt, status, contentType, serviceArea, scheduledDate, postType, language, topic]);

  // Generate images
  const handleGenerateImages = useCallback(async () => {
    if (!brand) return;
    setGeneratingImages(true); setError(null);
    for (const type of selectedVariants) {
      try {
        const data = await api("/api/generate", {
          post: { type, prompt, text_overlay: { headline, subline, cta }, style: "professional" },
          brand, testMode: false,
        });
        if (data.imageBase64) {
          setGeneratedPreview(data.imageBase64);
          // Upload to R2 + save to DB
          await api("/api/upload", { imageBase64: data.imageBase64, brand: brand.brand_id, postId, title, type, prompt });
        }
      } catch { /* skip variant */ }
    }
    setGeneratingImages(false);
    setMsg("Images generated & uploaded");
  }, [brand, selectedVariants, prompt, headline, subline, cta, postId, title]);

  // Tag management
  const handleAddTag = async (tagId: string) => {
    await api("/api/tags", { action: "add_to_post", post_id: postId, tag_id: tagId });
    const tag = allTags.find((t) => t.id === tagId);
    if (tag) setPostTags((prev) => [...prev, tag]);
  };

  const handleRemoveTag = async (tagId: string) => {
    await api("/api/tags", { action: "remove_from_post", post_id: postId, tag_id: tagId });
    setPostTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName || !post?.brand_id) return;
    const tag = await api("/api/tags", { action: "create", brand_id: post.brand_id, name: newTagName });
    setAllTags((prev) => [...prev, tag]);
    setNewTagName("");
  };

  // Trash
  const handleTrash = async () => {
    await api("/api/posts", { action: "trash", post_id: postId });
    router.push("/content");
  };

  // Duplicate
  const handleDuplicate = async () => {
    const dup = await api("/api/posts", { action: "duplicate", post_id: postId });
    if (dup?.id) router.push(`/content/${dup.id}`);
  };

  const toggleVariant = (t: string) => setSelectedVariants((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Post Detail</h1>
        {brand && (
          <div className="flex items-center gap-1.5 ml-2">
            <BrandImage src={brand.logo} alt={brand.brand_name} className="w-5 h-5 rounded-full object-contain bg-white" />
            <span className="text-xs text-gray-400">{brand.brand_name}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-xs text-green-400">{msg}</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button onClick={handleDuplicate} className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700">Duplicate</button>
          <button onClick={handleTrash} className="px-3 py-1.5 bg-red-600/20 text-red-400 text-xs rounded-lg hover:bg-red-600/30">Trash</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-5 gap-6">
          {/* ===== LEFT: Edit Form (3 cols) ===== */}
          <div className="col-span-3 space-y-5">
            {/* Title */}
            <div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title..." className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 outline-none border-b border-gray-800 pb-2 focus:border-blue-500" />
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white">
                  {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Content Type</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white">
                  <option value="">None</option>
                  {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Service Area</label>
                <select value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white">
                  <option value="">None</option>
                  {SERVICE_AREAS.map((sa) => <option key={sa.value} value={sa.value}>{sa.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Schedule</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white" />
              </div>
            </div>

            {/* Post type + language */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Post Type</label>
                <select value={postType} onChange={(e) => setPostType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white">
                  {FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Language</label>
                <div className="flex bg-gray-900 rounded border border-gray-800 overflow-hidden">
                  {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                    <button key={o.v} onClick={() => setLanguage(o.v)} className={`flex-1 py-1.5 text-xs ${language === o.v ? "bg-gray-700 text-white" : "text-gray-500 hover:bg-gray-800"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Topic</label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-white" />
              </div>
            </div>

            {/* Captions */}
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Caption (Vietnamese)</label>
                <textarea value={captionVi} onChange={(e) => setCaptionVi(e.target.value)} rows={4} className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-white resize-none" />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 uppercase block mb-1">Caption (English)</label>
                <textarea value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} rows={4} className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-white resize-none" />
              </div>
            </div>

            {/* Banner Text */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
              <label className="text-[9px] text-gray-500 uppercase">Banner Text Overlay</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (max 6 words)" className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-white font-bold" />
              <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Subline (max 12 words)" className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-white" />
              <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA (max 3 words)" className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-blue-400" />
            </div>

            {/* Image Prompt */}
            <div>
              <label className="text-[9px] text-gray-500 uppercase block mb-1">Image Prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-white resize-none" />
            </div>

            {/* Image Generation */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-[9px] text-gray-500 uppercase block mb-2">Generate Images</label>
              <div className="flex flex-wrap gap-1 mb-3">
                {FB_POST_TYPES.map((t) => (
                  <label key={t.value} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] cursor-pointer ${selectedVariants.has(t.value) ? "bg-blue-500/15 text-blue-400" : "bg-gray-800/50 text-gray-600"}`}>
                    <input type="checkbox" checked={selectedVariants.has(t.value)} onChange={() => toggleVariant(t.value)} className="accent-blue-500 w-2.5 h-2.5" />{t.label}
                  </label>
                ))}
              </div>
              <button onClick={handleGenerateImages} disabled={generatingImages || !prompt} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
                {generatingImages ? "Generating..." : `Generate ${selectedVariants.size} Image(s)`}
              </button>
            </div>

            {/* Tags */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-[9px] text-gray-500 uppercase block mb-2">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {postTags.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: t.color + "20", color: t.color }}>
                    {t.name}
                    <button onClick={() => handleRemoveTag(t.id)} className="hover:opacity-70">x</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300">
                  <option value="">Add existing tag...</option>
                  {allTags.filter((t) => !postTags.find((pt) => pt.id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white" onKeyDown={(e) => e.key === "Enter" && handleCreateTag()} />
                {newTagName && <button onClick={handleCreateTag} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">+</button>}
              </div>
            </div>

            {/* Metadata */}
            <div className="text-[10px] text-gray-600 flex gap-4">
              {post?.created_at && <span>Created: {new Date(post.created_at).toLocaleString()}</span>}
              {post?.updated_at && <span>Updated: {new Date(post.updated_at).toLocaleString()}</span>}
            </div>
          </div>

          {/* ===== RIGHT: FB Preview (2 cols) ===== */}
          <div className="col-span-2 space-y-4">
            <div className="sticky top-6">
              {/* FB Post Mockup */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <BrandImage src={brand?.logo} alt={brand?.brand_name || ""} className="w-10 h-10 rounded-full object-contain bg-white p-0.5 border" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{brand?.brand_name || "Brand"}</div>
                    <div className="text-[10px] text-gray-500">Sponsored</div>
                  </div>
                </div>
                <div className="px-4 pb-3 text-[12px] text-gray-800 whitespace-pre-line line-clamp-6">
                  {captionVi || captionEn || "Your caption will appear here..."}
                </div>
                {generatedPreview ? (
                  <img src={`data:image/png;base64,${generatedPreview}`} className="w-full" alt="Generated" />
                ) : (
                  <div className="bg-gray-100 h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
                    {headline ? (
                      <div className="text-center p-4">
                        <div className="text-lg font-bold text-gray-700">{headline}</div>
                        {subline && <div className="text-sm text-gray-500 mt-1">{subline}</div>}
                        {cta && <div className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded text-xs inline-block">{cta}</div>}
                      </div>
                    ) : (
                      <span>Banner preview</span>
                    )}
                  </div>
                )}
                <div className="px-4 py-2 border-t border-gray-200 flex justify-around text-gray-500 text-xs">
                  <span>Like</span><span>Comment</span><span>Share</span>
                </div>
              </div>

              {/* Status workflow */}
              <div className="mt-4 bg-gray-900/50 border border-gray-800 rounded-xl p-3">
                <label className="text-[9px] text-gray-500 uppercase block mb-2">Quick Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => (
                    <button key={s.value} onClick={() => setStatus(s.value)} className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${status === s.value ? `${s.color} text-white` : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
