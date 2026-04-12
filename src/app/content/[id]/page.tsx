"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES, SERVICE_AREAS, FB_POST_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";
import FacebookPreview from "@/components/content/FacebookPreview";

type TagRow = { id: string; brand_id: string; name: string; color: string };
type PostImageRow = { id: string; post_id: string; variant_type: string; r2_url: string; status: string; created_at: string };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-4 ${className}`}>
      <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [useModel, setUseModel] = useState("");
  const [style, setStyle] = useState("professional");

  // Image generation
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set(["feed-square"]));
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  // Tags
  const [newTagName, setNewTagName] = useState("");

  // Back link with brand filter preserved
  const backBrand = searchParams.get("brand") || post?.brand_id || "";
  const backUrl = backBrand ? `/content?brand=${backBrand}` : "/content";

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
        setUseModel(p.use_model || "");
        setStyle(p.style || "professional");

        if (p.brand_id) {
          const brands = await api("/api/brands");
          const b = (Array.isArray(brands) ? brands : []).find((x: BrandConfig) => x.brand_id === p.brand_id);
          if (b) setBrand(b);

          const tags = await api(`/api/tags?brand=${p.brand_id}`);
          setAllTags(Array.isArray(tags) ? tags : []);
          const pTags = await api(`/api/tags?post_id=${postId}`);
          setPostTags(Array.isArray(pTags) ? pTags : []);
        }

        // Load generated images
        try {
          const imgData = await api(`/api/posts/images?post_ids=${postId}`);
          if (imgData && typeof imgData === "object") {
            const imgs = imgData[postId];
            if (Array.isArray(imgs)) setImages(imgs);
            else if (imgData.r2_url) setImages([imgData]);
          }
        } catch { /* images optional */ }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  // Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
          type: postType, language, topic, use_model: useModel || null, style,
        },
      });
      setMsg("Saved");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }, [postId, title, captionVi, captionEn, headline, subline, cta, prompt, status, contentType, serviceArea, scheduledDate, postType, language, topic, useModel, style]);

  // Generate images
  const handleGenerateImages = useCallback(async () => {
    if (!brand) return;
    setGeneratingImages(true); setError(null);
    for (const type of selectedVariants) {
      try {
        const data = await api("/api/generate", {
          post: { type, prompt, text_overlay: { headline, subline, cta }, style, use_model: useModel || null },
          brand, testMode: false,
        });
        if (data.imageBase64) {
          setGeneratedPreview(data.imageBase64);
          await api("/api/upload", { imageBase64: data.imageBase64, brand: brand.brand_id, postId, title, type, prompt });
          // Refresh images list
          try {
            const imgData = await api(`/api/posts/images?post_ids=${postId}`);
            if (imgData && typeof imgData === "object") {
              const imgs = imgData[postId];
              if (Array.isArray(imgs)) setImages(imgs);
            }
          } catch { /* ok */ }
        }
      } catch { /* skip variant */ }
    }
    setGeneratingImages(false);
    setMsg("Images generated & uploaded");
    setTimeout(() => setMsg(null), 3000);
  }, [brand, selectedVariants, prompt, headline, subline, cta, postId, title, style, useModel]);

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

  const handleTrash = async () => {
    await api("/api/posts", { action: "trash", post_id: postId });
    router.push(backUrl);
  };

  const handleDuplicate = async () => {
    const dup = await api("/api/posts", { action: "duplicate", post_id: postId });
    if (dup?.id) router.push(`/content/${dup.id}`);
  };

  const toggleVariant = (t: string) => setSelectedVariants((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  // Preview image URL
  const previewImageUrl = generatedPreview
    ? `data:image/png;base64,${generatedPreview}`
    : images.length > 0 && images[0].r2_url
      ? images[0].r2_url
      : null;

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ===== STICKY HEADER ===== */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-2 shrink-0 bg-gray-950/80 backdrop-blur-sm">
        {/* Breadcrumb + Back */}
        <Link href={backUrl} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          {brand ? brand.brand_name : "Content"}
        </Link>
        <span className="text-gray-700 text-xs">/</span>
        <span className="text-xs text-gray-400 truncate max-w-[200px]">{title || "Untitled"}</span>

        {brand && (
          <div className="flex items-center gap-1.5 ml-3">
            <BrandImage src={brand.logo} alt={brand.brand_name} className="w-5 h-5 rounded-full object-contain bg-white" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{msg}</span>}
          {error && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{error}</span>}
          <button onClick={handleDuplicate} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 text-[10px] rounded-lg hover:bg-gray-700">Duplicate</button>
          <button onClick={handleTrash} className="px-2.5 py-1.5 bg-red-600/15 text-red-400 text-[10px] rounded-lg hover:bg-red-600/25">Trash</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[10px] font-bold rounded-lg">
            {saving ? "Saving..." : "Save"} <span className="text-blue-300 ml-1">Ctrl+S</span>
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-5 grid grid-cols-5 gap-5">
          {/* ===== LEFT COLUMN: Editor (3 cols) ===== */}
          <div className="col-span-3 space-y-4">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
              className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none border-b border-gray-800 pb-2 focus:border-blue-500 transition"
            />

            {/* Content Card */}
            <Card title="Content">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Topic</label>
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white focus:border-blue-500/50 outline-none transition" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Language</label>
                  <div className="flex bg-gray-900 rounded border border-gray-800 overflow-hidden">
                    {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                      <button key={o.v} onClick={() => setLanguage(o.v)} className={`flex-1 py-2 text-xs font-medium transition ${language === o.v ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:bg-gray-800"}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Post Type</label>
                  <select value={postType} onChange={(e) => setPostType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                    {FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            {/* Captions Card */}
            <Card title="Captions">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-gray-500 uppercase">Vietnamese</label>
                    <span className="text-[9px] text-gray-600">{captionVi.length} chars</span>
                  </div>
                  <textarea value={captionVi} onChange={(e) => setCaptionVi(e.target.value)} rows={6} placeholder="Nhập caption tiếng Việt..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 transition leading-relaxed" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-gray-500 uppercase">English</label>
                    <span className="text-[9px] text-gray-600">{captionEn.length} chars</span>
                  </div>
                  <textarea value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} rows={4} placeholder="Enter English caption..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 transition leading-relaxed" />
                </div>
              </div>
            </Card>

            {/* Banner Text Card */}
            <Card title="Banner Text Overlay">
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-gray-500">HEADLINE</label>
                    <span className={`text-[9px] ${wordCount(headline) > 8 ? "text-red-400" : "text-gray-600"}`}>{wordCount(headline)}/8 words</span>
                  </div>
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Main headline text..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-base text-white font-bold outline-none focus:border-blue-500/50 transition" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-gray-500">SUBLINE</label>
                    <span className={`text-[9px] ${wordCount(subline) > 15 ? "text-red-400" : "text-gray-600"}`}>{wordCount(subline)}/15 words</span>
                  </div>
                  <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Supporting subline..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 transition" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-gray-500">CTA BUTTON</label>
                    <span className={`text-[9px] ${wordCount(cta) > 4 ? "text-red-400" : "text-gray-600"}`}>{wordCount(cta)}/4 words</span>
                  </div>
                  <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Call to action..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-blue-400 font-medium outline-none focus:border-blue-500/50 transition" />
                </div>
              </div>
            </Card>

            {/* Image Generation Card */}
            <Card title="Image Generation">
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Visual Prompt</label>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Describe the visual composition..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 transition leading-relaxed" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Style</label>
                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                      {["professional", "bold", "minimal", "warm", "dark-luxury", "vibrant", "editorial"].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Model</label>
                    <select value={useModel} onChange={(e) => setUseModel(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                      <option value="">No model</option>
                      {brand?.models?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1.5">Variants</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FB_POST_TYPES.map((t) => (
                      <label key={t.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] cursor-pointer transition ${selectedVariants.has(t.value) ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "bg-gray-800/50 text-gray-600 hover:text-gray-400"}`}>
                        <input type="checkbox" checked={selectedVariants.has(t.value)} onChange={() => toggleVariant(t.value)} className="accent-blue-500 w-3 h-3" />{t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button onClick={handleGenerateImages} disabled={generatingImages || !prompt} className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold rounded-lg transition">
                  {generatingImages ? "Generating..." : `Generate ${selectedVariants.size} Image(s)`}
                </button>
              </div>
            </Card>

            {/* Metadata Card */}
            <Card title="Metadata">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                    {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Content Type</label>
                  <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                    <option value="">None</option>
                    {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Service Area</label>
                  <select value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                    <option value="">None</option>
                    {SERVICE_AREAS.map((sa) => <option key={sa.value} value={sa.value}>{sa.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-500 uppercase block mb-1">Schedule</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" />
                </div>
              </div>
              <div className="mt-3 text-[9px] text-gray-600 flex gap-3">
                {post?.created_at && <span>Created: {new Date(post.created_at).toLocaleString()}</span>}
                {post?.updated_at && <span>Updated: {new Date(post.updated_at).toLocaleString()}</span>}
              </div>
            </Card>

            {/* Tags Card */}
            <Card title="Tags">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {postTags.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ backgroundColor: t.color + "20", color: t.color }}>
                    {t.name}
                    <button onClick={() => handleRemoveTag(t.id)} className="hover:opacity-70 ml-0.5">&times;</button>
                  </span>
                ))}
                {postTags.length === 0 && <span className="text-[10px] text-gray-600">No tags</span>}
              </div>
              <div className="flex gap-2">
                <select onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-300 outline-none">
                  <option value="">Add tag...</option>
                  {allTags.filter((t) => !postTags.find((pt) => pt.id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag" className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white outline-none flex-1" onKeyDown={(e) => e.key === "Enter" && handleCreateTag()} />
                {newTagName && <button onClick={handleCreateTag} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700">+</button>}
              </div>
            </Card>
          </div>

          {/* ===== RIGHT COLUMN: Preview (2 cols) ===== */}
          <div className="col-span-2">
            <div className="sticky top-5 space-y-4">
              {/* Facebook Preview */}
              <FacebookPreview
                brandName={brand?.brand_name || "Brand"}
                brandLogo={brand?.logo}
                caption={captionVi || captionEn || ""}
                imageUrl={previewImageUrl}
                headline={headline}
                subline={subline}
                cta={cta}
                sponsored
              />

              {/* Image Gallery */}
              {images.length > 0 && (
                <Card title={`Generated Images (${images.length})`}>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setGeneratedPreview(null)}
                        className="group relative rounded-lg overflow-hidden border border-gray-800 hover:border-blue-500/50 transition"
                      >
                        <img src={img.r2_url} alt={img.variant_type} className="w-full aspect-square object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-[8px] text-gray-300">
                          {img.variant_type}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(img.r2_url); }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded transition"
                        >
                          Copy URL
                        </button>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Quick Status */}
              <Card title="Quick Status">
                <div className="flex flex-wrap gap-1.5">
                  {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition ${status === s.value ? `${s.color} text-white` : "bg-gray-800 text-gray-400 hover:text-white"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
