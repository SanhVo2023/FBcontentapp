"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES, SERVICE_AREAS, FB_POST_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";
import EditableFacebookPost from "@/components/content/EditableFacebookPost";
import CaptionToolbar from "@/components/content/CaptionToolbar";
import AIComposerPanel from "@/components/content/AIComposerPanel";
import ImageGenPanel from "@/components/content/ImageGenPanel";
import { T } from "@/lib/ui-text";
import { X, MessageSquare, ImageIcon, Settings, ExternalLink, RotateCcw, Send } from "lucide-react";

type TagRow = { id: string; brand_id: string; name: string; color: string };
type PostImageRow = { id: string; post_id: string; variant_type: string; r2_url: string; status: string; created_at: string; version?: number; approved?: boolean };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

type DrawerMode = "caption" | "image" | "settings" | null;

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
  const [language, setLanguage] = useState<"vi" | "en" | "both">("both");
  const [topic, setTopic] = useState("");
  const [useModel, setUseModel] = useState("");
  const [style, setStyle] = useState("professional");

  // Ads fields
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adsName, setAdsName] = useState("");
  const [adsObjective, setAdsObjective] = useState("Awareness");
  const [adsAudience, setAdsAudience] = useState("");
  const [adsCta, setAdsCta] = useState("Liên hệ");
  const [adsLandingUrl, setAdsLandingUrl] = useState("");
  const [adsBudgetPerDay, setAdsBudgetPerDay] = useState<number>(0);
  const [adsDurationDays, setAdsDurationDays] = useState<number>(7);

  // UI state
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState<"vi" | "en">("vi");
  const [newTagName, setNewTagName] = useState("");
  const [sheetBusy, setSheetBusy] = useState<"push" | "pull" | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>("");

  const viTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const enTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const backBrand = searchParams.get("brand") || post?.brand_id || "";
  const backUrl = backBrand ? `/content?brand=${backBrand}` : "/content";

  // Load
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
        setPostType(p.type || "feed-square"); setLanguage((p.language || "both") as "vi" | "en" | "both");
        setTopic(p.topic || ""); setUseModel(p.use_model || ""); setStyle(p.style || "professional");
        setAdsEnabled(!!p.ads_enabled);
        setAdsName(p.ads_name || "");
        setAdsObjective(p.ads_objective || "Awareness");
        setAdsAudience(p.ads_audience || "");
        setAdsCta(p.ads_cta || "Liên hệ");
        setAdsLandingUrl(p.ads_landing_url || "");
        setAdsBudgetPerDay(p.ads_budget_per_day || 0);
        setAdsDurationDays(p.ads_duration_days || 7);
        // Default display language based on post.language
        if (p.language === "en") setDisplayLanguage("en");
        else setDisplayLanguage("vi");
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

  // Auto-pull sheet status on mount if post is submitted
  useEffect(() => {
    if (!post?.sheet_post_id || post.status !== "submitted") return;
    api("/api/sheet-sync", { action: "pull_status", post_id: postId })
      .then((r) => {
        if (r?.found) {
          setPost((prev) => prev ? { ...prev, sheet_status: r.status } : prev);
          if (r.status === "Approved" && post.status === "submitted") setStatus("approved");
          else if ((r.status === "Rejected" || r.status === "Revise") && post.status === "submitted") setStatus("draft");
          if (r.approval_notes) setApprovalNotes(r.approval_notes);
        }
      })
      .catch(() => { /* silent */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  // Keyboard: Esc closes drawer or exits caption edit
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingCaption) setEditingCaption(false);
        else if (drawerMode) setDrawerMode(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const handleSave = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      await api("/api/posts", { action: "update", post_id: postId, updates: {
        title, caption_vi: captionVi, caption_en: captionEn, text_overlay: { headline, subline, cta },
        prompt, status, content_type: contentType || null, service_area: serviceArea || null,
        scheduled_date: scheduledDate || null, type: postType, language, topic, use_model: useModel || null, style,
        ads_enabled: adsEnabled,
        ads_name: adsName || null,
        ads_objective: adsObjective || null,
        ads_audience: adsAudience || null,
        ads_cta: adsCta || null,
        ads_landing_url: adsLandingUrl || null,
        ads_budget_per_day: adsBudgetPerDay || null,
        ads_duration_days: adsDurationDays || null,
      }});
      showMsg(T.saved);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }, [postId, title, captionVi, captionEn, headline, subline, cta, prompt, status, contentType, serviceArea, scheduledDate, postType, language, topic, useModel, style, adsEnabled, adsName, adsObjective, adsAudience, adsCta, adsLandingUrl, adsBudgetPerDay, adsDurationDays]);

  // Auto-save on caption blur
  const handleCaptionBlur = async () => {
    setEditingCaption(false);
    // Save if changed
    await handleSave();
  };

  const handleCaptionClick = () => {
    setDrawerMode("caption");
    setEditingCaption(true);
  };

  const handleImageClick = () => {
    setDrawerMode("image");
    setEditingCaption(false);
  };

  const handleSettingsClick = () => {
    setDrawerMode("settings");
    setEditingCaption(false);
  };

  const handleAddTag = async (tagId: string) => { await api("/api/tags", { action: "add_to_post", post_id: postId, tag_id: tagId }); const tag = allTags.find((t) => t.id === tagId); if (tag) setPostTags((prev) => [...prev, tag]); };
  const handleRemoveTag = async (tagId: string) => { await api("/api/tags", { action: "remove_from_post", post_id: postId, tag_id: tagId }); setPostTags((prev) => prev.filter((t) => t.id !== tagId)); };
  const handleCreateTag = async () => { if (!newTagName || !post?.brand_id) return; const tag = await api("/api/tags", { action: "create", brand_id: post.brand_id, name: newTagName }); setAllTags((prev) => [...prev, tag]); setNewTagName(""); };
  const handleTrash = async () => { await api("/api/posts", { action: "trash", post_id: postId }); router.push(backUrl); };
  const handleDuplicate = async () => { const dup = await api("/api/posts", { action: "duplicate", post_id: postId }); if (dup?.id) router.push(`/content/${dup.id}`); };

  const handlePushToSheet = async () => {
    setSheetBusy("push"); setError(null);
    try {
      const r = await api("/api/sheet-sync", { action: "push_post", post_id: postId });
      if (r?.sheet_post_id && post) {
        setPost({ ...post, status: "submitted", sheet_post_id: r.sheet_post_id, sheet_row_url: r.sheet_url, sheet_status: "Pending Hiển Approval" });
        setStatus("submitted");
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
        if (r.approval_notes) setApprovalNotes(r.approval_notes);
        if (r.new_app_status) setStatus(r.new_app_status);
        showMsg(`Sheet: ${r.status}`);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setSheetBusy(null); }
  };

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

  const handleImageUploaded = async () => {
    try {
      const resp = await api(`/api/posts/images?post_id=${postId}`);
      if (resp?.images) setImages(resp.images);
    } catch { /* ok */ }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">{T.loading}</div></div>;
  if (!post) return <div className="h-full flex items-center justify-center"><div className="text-red-400">{T.not_found}</div></div>;

  const approvedImage = images.find((i) => i.approved && i.status === "done");
  const firstImage = images.find((i) => i.status === "done");
  const previewImageUrl = approvedImage?.r2_url || firstImage?.r2_url || null;
  const currentCaption = displayLanguage === "vi" ? captionVi : captionEn;
  const setCurrentCaption = displayLanguage === "vi" ? setCaptionVi : setCaptionEn;
  const currentTextareaRef = displayLanguage === "vi" ? viTextareaRef : enTextareaRef;

  const canSubmit = (status === "draft" || status === "images_done" || status === "approved") && !post.sheet_post_id;
  const isSubmitted = !!post.sheet_post_id;
  const sheetStatusLabel =
    post.sheet_status === "Approved" ? T.sheet_approved :
    post.sheet_status === "Rejected" ? T.sheet_rejected :
    post.sheet_status === "Revise" ? T.sheet_revise :
    post.sheet_status === "Pending Hiển Approval" ? T.sheet_pending :
    post.sheet_status;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-2 shrink-0 bg-gray-950 z-10">
        <Link href={backUrl} className="text-gray-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></Link>
        {brand && <BrandImage src={brand.logo} alt={brand.brand_name} className="w-5 h-5 rounded-full object-contain bg-white" />}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề..."
          className="bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-blue-500 px-1 max-w-[240px]"
        />

        {/* Drawer mode tabs (desktop) */}
        <div className="ml-2 hidden md:flex items-center gap-1 border-l border-gray-800 pl-2">
          <button onClick={() => setDrawerMode("caption")} title="Soạn caption" className={`p-1.5 rounded transition ${drawerMode === "caption" ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-white"}`}><MessageSquare size={14} /></button>
          <button onClick={() => setDrawerMode("image")} title="Tạo hình" className={`p-1.5 rounded transition ${drawerMode === "image" ? "bg-purple-500/20 text-purple-400" : "text-gray-500 hover:text-white"}`}><ImageIcon size={14} /></button>
          <button onClick={handleSettingsClick} title="Cài đặt" className={`p-1.5 rounded transition ${drawerMode === "settings" ? "bg-amber-500/20 text-amber-400" : "text-gray-500 hover:text-white"}`}><Settings size={14} /></button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {msg && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{msg}</span>}
          {error && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded max-w-[200px] truncate">{error}</span>}

          {/* Sheet actions */}
          {canSubmit && (
            <button onClick={handlePushToSheet} disabled={sheetBusy !== null} className="hidden md:inline px-2.5 py-1 bg-teal-600/20 text-teal-400 text-[11px] rounded-lg hover:bg-teal-600/30 border border-teal-500/30 flex items-center gap-1">
              <Send size={10} /> {sheetBusy === "push" ? T.pushing_to_sheet : T.push_to_sheet}
            </button>
          )}
          {isSubmitted && (
            <button onClick={handlePullStatus} disabled={sheetBusy !== null} className="hidden md:inline px-2.5 py-1 bg-gray-800 text-gray-300 text-[11px] rounded-lg hover:bg-gray-700 flex items-center gap-1">
              <RotateCcw size={10} /> {sheetBusy === "pull" ? T.pulling_status : T.pull_status}
            </button>
          )}
          {isSubmitted && post.sheet_row_url && (
            <a href={post.sheet_row_url} target="_blank" rel="noreferrer" className="hidden md:inline p-1.5 text-green-400 hover:text-green-300" title="Mở Sheet">
              <ExternalLink size={12} />
            </a>
          )}

          <button onClick={handleDuplicate} className="hidden sm:block px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-lg hover:bg-gray-700">{T.duplicate}</button>
          <button onClick={handleTrash} className="px-2 py-1 bg-gray-800 text-red-400 text-[10px] rounded-lg hover:bg-red-600/20">{T.trash}</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[10px] font-bold rounded-lg">
            {saving ? "..." : T.save} <span className="text-blue-300 text-[8px] hidden sm:inline">^S</span>
          </button>
        </div>
      </div>

      {/* Body: centered FB mockup + right drawer */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main column: FB mockup */}
        <div className={`flex-1 overflow-y-auto p-6 ${drawerMode ? "hidden md:block" : "block"}`}>
          <EditableFacebookPost
            brandName={brand?.brand_name || "Brand"}
            brandLogo={brand?.logo}
            caption={currentCaption}
            imageUrl={previewImageUrl}
            onCaptionClick={handleCaptionClick}
            onImageClick={handleImageClick}
            editingCaption={editingCaption && drawerMode === "caption"}
            onCaptionChange={setCurrentCaption}
            captionTextareaRef={currentTextareaRef}
            onCaptionBlur={handleCaptionBlur}
            language={displayLanguage}
            onLanguageChange={setDisplayLanguage}
            showLanguageToggle={language === "both"}
            sheetStatus={post.sheet_status}
            sheetStatusLabel={sheetStatusLabel}
            approvalNotes={approvalNotes}
            sheetRowUrl={post.sheet_row_url}
            timestamp={post.scheduled_date}
          />

          {/* Quick access tiny toolbar below post */}
          <div className="max-w-[540px] mx-auto mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button onClick={() => setDrawerMode("caption")} className="px-3 py-1.5 bg-gray-900 border border-gray-800 text-gray-300 text-[11px] rounded-lg hover:bg-gray-800 flex items-center gap-1.5">
              <MessageSquare size={12} /> Soạn nội dung
            </button>
            <button onClick={() => setDrawerMode("image")} className="px-3 py-1.5 bg-gray-900 border border-gray-800 text-gray-300 text-[11px] rounded-lg hover:bg-gray-800 flex items-center gap-1.5">
              <ImageIcon size={12} /> Tạo hình
            </button>
            <button onClick={() => setDrawerMode("settings")} className="px-3 py-1.5 bg-gray-900 border border-gray-800 text-gray-300 text-[11px] rounded-lg hover:bg-gray-800 flex items-center gap-1.5">
              <Settings size={12} /> Cài đặt
            </button>
          </div>
        </div>

        {/* Drawer */}
        {drawerMode && (
          <div className={`${drawerMode ? "block" : "hidden"} w-full md:w-[420px] md:border-l border-gray-800 overflow-y-auto bg-gray-950 shrink-0`}>
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center gap-2 z-10">
              <span className="text-xs font-semibold text-gray-300">
                {drawerMode === "caption" ? "📝 Soạn nội dung" : drawerMode === "image" ? "🎨 Tạo hình ảnh" : "⚙️ Cài đặt"}
              </span>
              <button onClick={() => { setDrawerMode(null); setEditingCaption(false); }} className="ml-auto text-gray-500 hover:text-white p-1"><X size={14} /></button>
            </div>

            <div className="p-4 space-y-3">
              {drawerMode === "caption" && (
                <>
                  <AIComposerPanel
                    brand={brand}
                    language={language}
                    topic={topic || title}
                    onComposed={handleComposed}
                  />

                  {/* Caption editor */}
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase font-medium">
                        {displayLanguage === "vi" ? T.caption_vi : T.caption_en}
                      </label>
                      {language === "both" && (
                        <div className="flex gap-1">
                          <button onClick={() => setDisplayLanguage("vi")} className={`px-2 py-0.5 text-[10px] rounded ${displayLanguage === "vi" ? "bg-blue-600/30 text-blue-400" : "text-gray-500"}`}>VI</button>
                          <button onClick={() => setDisplayLanguage("en")} className={`px-2 py-0.5 text-[10px] rounded ${displayLanguage === "en" ? "bg-blue-600/30 text-blue-400" : "text-gray-500"}`}>EN</button>
                        </div>
                      )}
                    </div>
                    <CaptionToolbar value={currentCaption} onChange={setCurrentCaption} textareaRef={currentTextareaRef} brand={brand} language={displayLanguage} />
                    <textarea
                      ref={currentTextareaRef}
                      value={currentCaption}
                      onChange={(e) => setCurrentCaption(e.target.value)}
                      rows={10}
                      placeholder={displayLanguage === "vi" ? "Nhập caption tiếng Việt..." : "Enter English caption..."}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white resize-y outline-none focus:border-blue-500/50 leading-relaxed font-mono"
                    />
                    <div className="text-right text-[9px] text-gray-600">{currentCaption.length} ký tự</div>
                  </div>

                  {/* Banner text */}
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-medium">{T.banner_text}</label>
                    <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={T.headline} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none" />
                    <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder={T.subline} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none" />
                    <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder={T.cta} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-blue-400 outline-none" />
                  </div>
                </>
              )}

              {drawerMode === "image" && brand && post && (
                <ImageGenPanel post={post} brand={brand} onUploaded={handleImageUploaded} />
              )}

              {drawerMode === "settings" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.topic}</label>
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.language}</label>
                    <div className="flex bg-gray-900 rounded border border-gray-800 overflow-hidden">
                      {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                        <button key={o.v} onClick={() => setLanguage(o.v as "vi" | "en" | "both")} className={`flex-1 py-2 text-xs ${language === o.v ? "bg-blue-600/20 text-blue-400" : "text-gray-500"}`}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.status}</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                      {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.content_type}</label>
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                      <option value="">—</option>
                      {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.emoji} {ct.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.service_area}</label>
                    <select value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none">
                      <option value="">—</option>
                      {SERVICE_AREAS.map((sa) => <option key={sa.value} value={sa.value}>{sa.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase block mb-1">{T.schedule}</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" />
                  </div>

                  {/* Ads Campaign */}
                  <div className={`border rounded-lg p-3 transition ${adsEnabled ? "bg-orange-500/5 border-orange-500/30" : "bg-gray-900/50 border-gray-800"}`}>
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                      <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">🎯 Quảng cáo / Ads Campaign</span>
                      <input type="checkbox" checked={adsEnabled} onChange={(e) => setAdsEnabled(e.target.checked)} className="accent-orange-500 w-4 h-4" />
                    </label>
                    {adsEnabled && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-orange-500/20">
                        <p className="text-[10px] text-orange-300/80">Khi gửi Sheet, bài này cũng được thêm vào sheet Ads_Campaigns.</p>
                        <input value={adsName} onChange={(e) => setAdsName(e.target.value)} placeholder="Tên chiến dịch (tự động nếu bỏ trống)" className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-xs text-white outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={adsObjective} onChange={(e) => setAdsObjective(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-[11px] text-white outline-none">
                            {["Awareness", "Traffic", "Engagement", "Leads", "Conversions", "App Installs", "Video Views"].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <input value={adsCta} onChange={(e) => setAdsCta(e.target.value)} placeholder="CTA" className="bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-[11px] text-white outline-none" />
                        </div>
                        <input value={adsAudience} onChange={(e) => setAdsAudience(e.target.value)} placeholder="Đối tượng (VD: Nữ 25-45, TP.HCM)" className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white outline-none" />
                        <input value={adsLandingUrl} onChange={(e) => setAdsLandingUrl(e.target.value)} placeholder="Landing URL" className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-0.5">Ngân sách/ngày (₫)</label>
                            <input type="number" value={adsBudgetPerDay || ""} onChange={(e) => setAdsBudgetPerDay(Number(e.target.value) || 0)} placeholder="0" className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-[11px] text-white outline-none" />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 block mb-0.5">Số ngày chạy</label>
                            <input type="number" value={adsDurationDays || ""} onChange={(e) => setAdsDurationDays(Number(e.target.value) || 0)} placeholder="7" className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-[11px] text-white outline-none" />
                          </div>
                        </div>
                        {adsBudgetPerDay > 0 && adsDurationDays > 0 && (
                          <div className="text-[10px] text-gray-400">Tổng ngân sách: <span className="text-orange-400 font-medium">{(adsBudgetPerDay * adsDurationDays).toLocaleString("vi-VN")}₫</span></div>
                        )}
                        {post?.ads_campaign_id && (
                          <div className="text-[10px] text-green-400 bg-green-500/10 rounded px-2 py-1">✓ Đã tạo trong Sheet: {post.ads_campaign_id}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                    <label className="text-[9px] text-gray-500 uppercase block mb-2">{T.tags}</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {postTags.map((t) => (
                        <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: t.color + "20", color: t.color }}>
                          {t.name}<button onClick={() => handleRemoveTag(t.id)} className="hover:opacity-70">&times;</button>
                        </span>
                      ))}
                      {postTags.length === 0 && <span className="text-[10px] text-gray-600">{T.no_tags}</span>}
                    </div>
                    <div className="flex gap-1.5">
                      <select onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none">
                        <option value="">{T.add_tag}</option>
                        {allTags.filter((t) => !postTags.find((pt) => pt.id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder={T.new_tag} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] text-white outline-none flex-1" onKeyDown={(e) => e.key === "Enter" && handleCreateTag()} />
                      {newTagName && <button onClick={handleCreateTag} className="px-2 py-1 bg-gray-800 text-gray-300 text-[10px] rounded">+</button>}
                    </div>
                  </div>

                  {/* Info */}
                  {post && (
                    <div className="text-[10px] text-gray-600 space-y-0.5 pt-2 border-t border-gray-800">
                      {post.created_at && <div>{T.created_at}: {new Date(post.created_at).toLocaleString()}</div>}
                      {post.updated_at && <div>{T.updated_at}: {new Date(post.updated_at).toLocaleString()}</div>}
                      {post.campaign_id && <div>{T.campaign}: <Link href={`/content/campaigns/${post.campaign_id}`} className="text-blue-400 hover:underline">{post.campaign_id.slice(0, 8)}...</Link></div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
