"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES, SERVICE_AREAS, FB_POST_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";
import FacebookPreview from "@/components/content/FacebookPreview";
import CaptionToolbar from "@/components/content/CaptionToolbar";
import AIComposerPanel from "@/components/content/AIComposerPanel";
import { T } from "@/lib/ui-text";

type TagRow = { id: string; brand_id: string; name: string; color: string };
type PostImageRow = { id: string; post_id: string; variant_type: string; r2_url: string; status: string; created_at: string; version?: number; approved?: boolean };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

type Tab = "content" | "image" | "settings";

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
  const [tab, setTab] = useState<Tab>("content");

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
  const [newTagName, setNewTagName] = useState("");

  // Sheet sync
  const [sheetBusy, setSheetBusy] = useState<"push" | "pull" | null>(null);

  // Refs for caption textareas (for toolbar caret insertion)
  const viTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const enTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const backBrand = searchParams.get("brand") || post?.brand_id || "";
  const backUrl = backBrand ? `/content?brand=${backBrand}` : "/content";

  useEffect(() => {
    (async () => {
      try {
        const p = await api(`/api/posts?id=${postId}`);
        if (!p) { setError("Not found"); setLoading(false); return; }
        setPost(p);
        setTitle(p.title || ""); setCaptionVi(p.caption_vi || ""); setCaptionEn(p.caption_en || "");
        setHeadline(p.text_overlay?.headline || ""); setSubline(p.text_overlay?.subline || ""); setCta(p.text_overlay?.cta || "");
        setPrompt(p.prompt || ""); setStatus(p.status || "draft"); setContentType(p.content_type || "");
        setServiceArea(p.service_area || ""); setScheduledDate(p.scheduled_date || "");
        setPostType(p.type || "feed-square"); setLanguage(p.language || "both");
        setTopic(p.topic || ""); setUseModel(p.use_model || ""); setStyle(p.style || "professional");
        if (p.brand_id) {
          const brands = await api("/api/brands");
          const b = (Array.isArray(brands) ? brands : []).find((x: BrandConfig) => x.brand_id === p.brand_id);
          if (b) setBrand(b);
          const tags = await api(`/api/tags?brand=${p.brand_id}`);
          setAllTags(Array.isArray(tags) ? tags : []);
          const pTags = await api(`/api/tags?post_id=${postId}`);
          setPostTags(Array.isArray(pTags) ? pTags : []);
        }
        try {
          const resp = await api(`/api/posts/images?post_id=${postId}`);
          if (resp?.images) setImages(resp.images);
        } catch { /* ok */ }
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
      finally { setLoading(false); }
    })();
  }, [postId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2000); };

  const handleSave = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      await api("/api/posts", { action: "update", post_id: postId, updates: {
        title, caption_vi: captionVi, caption_en: captionEn, text_overlay: { headline, subline, cta },
        prompt, status, content_type: contentType || null, service_area: serviceArea || null,
        scheduled_date: scheduledDate || null, type: postType, language, topic, use_model: useModel || null, style,
      }});
      showMsg("Saved");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }, [postId, title, captionVi, captionEn, headline, subline, cta, prompt, status, contentType, serviceArea, scheduledDate, postType, language, topic, useModel, style]);

  const handleGenerateImages = useCallback(async () => {
    if (!brand) return;
    setGeneratingImages(true); setError(null);
    for (const type of selectedVariants) {
      try {
        const data = await api("/api/generate", { post: { type, prompt, text_overlay: { headline, subline, cta }, style, use_model: useModel || null }, brand, testMode: false });
        if (data.imageBase64) {
          setGeneratedPreview(data.imageBase64);
          await api("/api/upload", { imageBase64: data.imageBase64, brand: brand.brand_id, postId, title, type, prompt });
          try { const resp = await api(`/api/posts/images?post_id=${postId}`); if (resp?.images) setImages(resp.images); } catch { /* ok */ }
        }
      } catch { /* skip */ }
    }
    setGeneratingImages(false);
    showMsg("Images generated");
  }, [brand, selectedVariants, prompt, headline, subline, cta, postId, title, style, useModel]);

  const handleComposed = (result: { caption_vi?: string; caption_en?: string; headline: string; subline: string; cta: string; hashtags: string }) => {
    if (result.caption_vi !== undefined) {
      const final = result.hashtags && !result.caption_vi.includes("#") ? `${result.caption_vi}\n\n${result.hashtags}` : result.caption_vi;
      setCaptionVi(final);
    }
    if (result.caption_en !== undefined) {
      const final = result.hashtags && !result.caption_en.includes("#") ? `${result.caption_en}\n\n${result.hashtags}` : result.caption_en;
      setCaptionEn(final);
    }
    if (result.headline) setHeadline(result.headline);
    if (result.subline) setSubline(result.subline);
    if (result.cta) setCta(result.cta);
    showMsg("✨ Đã soạn");
  };

  const handlePushToSheet = async () => {
    setSheetBusy("push"); setError(null);
    try {
      const r = await api("/api/sheet-sync", { action: "push_post", post_id: postId });
      if (r?.sheet_post_id && post) {
        setPost({ ...post, sheet_post_id: r.sheet_post_id, sheet_row_url: r.sheet_url, sheet_status: "Pending Hiển Approval" });
      }
      showMsg(T.pushed_to_sheet);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : T.sheet_sync_error); }
    finally { setSheetBusy(null); }
  };
  const handlePullStatus = async () => {
    setSheetBusy("pull"); setError(null);
    try {
      const r = await api("/api/sheet-sync", { action: "pull_status", post_id: postId });
      if (r?.found && post) {
        setPost({ ...post, sheet_status: r.status });
        showMsg(`${T.sheet_status}: ${r.status}`);
      } else if (!r?.found) {
        setError("Không tìm thấy bài trong Sheet");
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : T.sheet_sync_error); }
    finally { setSheetBusy(null); }
  };

  const handleAddTag = async (tagId: string) => { await api("/api/tags", { action: "add_to_post", post_id: postId, tag_id: tagId }); const tag = allTags.find((t) => t.id === tagId); if (tag) setPostTags((prev) => [...prev, tag]); };
  const handleRemoveTag = async (tagId: string) => { await api("/api/tags", { action: "remove_from_post", post_id: postId, tag_id: tagId }); setPostTags((prev) => prev.filter((t) => t.id !== tagId)); };
  const handleCreateTag = async () => { if (!newTagName || !post?.brand_id) return; const tag = await api("/api/tags", { action: "create", brand_id: post.brand_id, name: newTagName }); setAllTags((prev) => [...prev, tag]); setNewTagName(""); };
  const handleTrash = async () => { await api("/api/posts", { action: "trash", post_id: postId }); router.push(backUrl); };
  const handleDuplicate = async () => { const dup = await api("/api/posts", { action: "duplicate", post_id: postId }); if (dup?.id) router.push(`/content/${dup.id}`); };
  const toggleVariant = (t: string) => setSelectedVariants((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const previewImageUrl = generatedPreview ? `data:image/png;base64,${generatedPreview}` : images.length > 0 && images[0].r2_url ? images[0].r2_url : null;

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-2 shrink-0">
        <Link href={backUrl} className="text-gray-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></Link>
        {brand && <BrandImage src={brand.logo} alt={brand.brand_name} className="w-5 h-5 rounded-full object-contain bg-white" />}
        <span className="text-xs text-gray-400 truncate max-w-[200px]">{title || "Untitled"}</span>
        {/* Status + Actions grouped */}
        <div className="ml-auto flex items-center gap-1.5">
          {msg && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{msg}</span>}
          {error && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded max-w-[200px] truncate">{error}</span>}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
            {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Sheet sync */}
          {post?.sheet_post_id ? (
            <div className="hidden md:flex items-center gap-1">
              <a href={post.sheet_row_url || "#"} target="_blank" rel="noreferrer" className="px-2 py-1 bg-green-500/15 text-green-400 text-[10px] rounded-lg hover:bg-green-500/25 border border-green-500/30">
                Sheet: {post.sheet_post_id}
              </a>
              <button onClick={handlePullStatus} disabled={sheetBusy !== null} className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-lg hover:bg-gray-700">
                {sheetBusy === "pull" ? T.pulling_status : T.pull_status}
              </button>
            </div>
          ) : (status === "approved" || status === "images_done") ? (
            <button onClick={handlePushToSheet} disabled={sheetBusy !== null} className="hidden md:inline px-2 py-1 bg-amber-500/15 text-amber-400 text-[10px] rounded-lg hover:bg-amber-500/25 border border-amber-500/30">
              {sheetBusy === "push" ? T.pushing_to_sheet : T.push_to_sheet}
            </button>
          ) : null}
          <button onClick={handleDuplicate} className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-lg hover:bg-gray-700 hidden sm:block">{T.duplicate}</button>
          <button onClick={handleTrash} className="px-2 py-1 bg-gray-800 text-red-400 text-[10px] rounded-lg hover:bg-red-600/20">{T.trash}</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[10px] font-bold rounded-lg">
            {saving ? "..." : T.save} <span className="text-blue-300 text-[8px] hidden sm:inline">^S</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 flex gap-0 shrink-0">
        {([
          { key: "content" as Tab, label: T.tab_content, icon: "📝" },
          { key: "image" as Tab, label: T.tab_image, icon: "🎨" },
          { key: "settings" as Tab, label: T.tab_settings, icon: "⚙️" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${tab === t.key ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
          {/* Left: Tab content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Title (always visible) */}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title..." className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 outline-none border-b border-gray-800 pb-2 focus:border-blue-500 transition" />

            {/* ── CONTENT TAB ── */}
            {tab === "content" && (
              <div className="space-y-4">
                {/* AI Composer */}
                <AIComposerPanel
                  brand={brand}
                  language={language as "vi" | "en" | "both"}
                  topic={topic || title}
                  onComposed={handleComposed}
                />

                {/* Captions */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{T.captions}</h3>
                  {(language === "vi" || language === "both") && (
                    <div>
                      <div className="flex justify-between mb-1"><label className="text-[9px] text-gray-500 uppercase">{T.caption_vi}</label><span className="text-[9px] text-gray-600">{captionVi.length}</span></div>
                      <CaptionToolbar value={captionVi} onChange={setCaptionVi} textareaRef={viTextareaRef} brand={brand} language="vi" />
                      <textarea ref={viTextareaRef} value={captionVi} onChange={(e) => setCaptionVi(e.target.value)} rows={10} placeholder="Nhập caption tiếng Việt..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 leading-relaxed font-mono" />
                    </div>
                  )}
                  {(language === "en" || language === "both") && (
                    <div>
                      <div className="flex justify-between mb-1"><label className="text-[9px] text-gray-500 uppercase">{T.caption_en}</label><span className="text-[9px] text-gray-600">{captionEn.length}</span></div>
                      <CaptionToolbar value={captionEn} onChange={setCaptionEn} textareaRef={enTextareaRef} brand={brand} language="en" />
                      <textarea ref={enTextareaRef} value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} rows={6} placeholder="English caption..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 leading-relaxed font-mono" />
                    </div>
                  )}
                </div>

                {/* Banner Text */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Banner Text</h3>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-[9px] text-gray-500">HEADLINE</label><span className={`text-[9px] ${wordCount(headline) > 8 ? "text-red-400" : "text-gray-600"}`}>{wordCount(headline)}/8</span></div>
                    <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Main headline..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-base text-white font-bold outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-[9px] text-gray-500">SUBLINE</label><span className={`text-[9px] ${wordCount(subline) > 15 ? "text-red-400" : "text-gray-600"}`}>{wordCount(subline)}/15</span></div>
                    <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Subline..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-[9px] text-gray-500">CTA</label><span className={`text-[9px] ${wordCount(cta) > 4 ? "text-red-400" : "text-gray-600"}`}>{wordCount(cta)}/4</span></div>
                    <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Call to action..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-blue-400 font-medium outline-none focus:border-blue-500/50" />
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {postTags.map((t) => (
                      <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: t.color + "20", color: t.color }}>
                        {t.name}<button onClick={() => handleRemoveTag(t.id)} className="hover:opacity-70">&times;</button>
                      </span>
                    ))}
                    {postTags.length === 0 && <span className="text-[10px] text-gray-600">No tags</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <select onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none">
                      <option value="">Add tag...</option>
                      {allTags.filter((t) => !postTags.find((pt) => pt.id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag" className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none flex-1" onKeyDown={(e) => e.key === "Enter" && handleCreateTag()} />
                    {newTagName && <button onClick={handleCreateTag} className="px-2 py-1 bg-gray-800 text-gray-300 text-[10px] rounded">+</button>}
                  </div>
                </div>
              </div>
            )}

            {/* ── IMAGE TAB ── */}
            {tab === "image" && (
              <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Visual Prompt</h3>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Describe the visual..." className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-y outline-none focus:border-blue-500/50 leading-relaxed" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase block mb-1">Style</label>
                      <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                        {["professional", "bold", "minimal", "warm", "dark-luxury", "vibrant", "editorial"].map((s) => <option key={s} value={s}>{s}</option>)}
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
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Generate</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {FB_POST_TYPES.map((t) => (
                      <label key={t.value} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer ${selectedVariants.has(t.value) ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "bg-gray-800/50 text-gray-600"}`}>
                        <input type="checkbox" checked={selectedVariants.has(t.value)} onChange={() => toggleVariant(t.value)} className="accent-blue-500 w-3 h-3" />{t.label}
                      </label>
                    ))}
                  </div>
                  <button onClick={handleGenerateImages} disabled={generatingImages || !prompt} className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white text-xs font-bold rounded-lg">
                    {generatingImages ? "Generating..." : `Generate ${selectedVariants.size} Image(s)`}
                  </button>
                </div>

                {/* Generated Images */}
                {images.length > 0 && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Generated Images ({images.filter((i) => i.status !== "trashed").length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {images.filter((i) => i.status !== "trashed").map((img) => (
                        <div key={img.id} className={`relative rounded-lg overflow-hidden border ${img.approved ? "border-green-500" : "border-gray-700"} group`}>
                          <img src={img.r2_url} className="w-full aspect-square object-cover" alt="" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-center justify-between">
                            <span className="text-[8px] text-gray-300">{img.variant_type} v{img.version || 1}</span>
                            {img.approved ? <span className="text-[8px] text-green-400">Approved</span> : (
                              <button onClick={() => api("/api/posts/images", { action: "approve", image_id: img.id }).then(() => api(`/api/posts/images?post_id=${postId}`).then((r) => { if (r?.images) setImages(r.images); }))} className="text-[8px] text-blue-400">Approve</button>
                            )}
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(img.r2_url)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[7px] px-1.5 py-0.5 rounded">Copy</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {tab === "settings" && (
              <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Post Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Topic</label><input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" /></div>
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Language</label>
                      <div className="flex bg-gray-900 rounded border border-gray-800 overflow-hidden">
                        {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                          <button key={o.v} onClick={() => setLanguage(o.v)} className={`flex-1 py-2 text-xs ${language === o.v ? "bg-blue-600/20 text-blue-400" : "text-gray-500"}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Post Type</label><select value={postType} onChange={(e) => setPostType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">{FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Content Type</label><select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none"><option value="">None</option>{CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}</select></div>
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Service Area</label><select value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none"><option value="">None</option>{SERVICE_AREAS.map((sa) => <option key={sa.value} value={sa.value}>{sa.label}</option>)}</select></div>
                    <div><label className="text-[9px] text-gray-500 uppercase block mb-1">Schedule</label><input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" /></div>
                  </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Info</h3>
                  <div className="text-[10px] text-gray-600 space-y-1">
                    {post?.created_at && <div>Created: {new Date(post.created_at).toLocaleString()}</div>}
                    {post?.updated_at && <div>Updated: {new Date(post.updated_at).toLocaleString()}</div>}
                    {post?.campaign_id && <div>Campaign: <Link href={`/content/campaigns/${post.campaign_id}`} className="text-blue-400 hover:underline">{post.campaign_id.slice(0, 8)}...</Link></div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview (2 cols) */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-5">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
