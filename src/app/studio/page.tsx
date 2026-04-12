"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FB_POST_TYPES, FB_STYLES, getPostSpec } from "@/lib/fb-specs";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import type { PostImageRow } from "@/lib/db";
import BrandImage from "@/components/BrandImage";
import { Clock, ArrowUpRight, Image as ImageIcon, Trash2, ChevronRight } from "lucide-react";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad response: ${text.slice(0, 100)}`); throw e; }
}

// ── localStorage persistence ──
const STORAGE_KEY = "studio-settings";
type StudioSettings = {
  brandId: string; postType: string; style: string; prompt: string;
  headline: string; subline: string; cta: string;
  useModel: string | null; useRef: string | null; includeLogo: boolean;
};

function loadSettings(): Partial<StudioSettings> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveSettings(s: StudioSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const HISTORY_KEY = "studio-history";
type HistoryEntry = {
  id: string; prompt: string; headline: string; subline: string; cta: string;
  postType: string; style: string; brandId: string; brandName: string;
  r2_url?: string; timestamp: number;
};

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50))); } catch { /* ignore */ }
}

// ── Gallery panel ──
type GalleryTab = "gallery" | "history";

export default function GeneratePage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [postType, setPostType] = useState("feed-square");
  const [style, setStyle] = useState("professional");
  const [prompt, setPrompt] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [cta, setCta] = useState("");
  const [useModel, setUseModel] = useState<string | null>(null);
  const [useRef, setUseRef] = useState<string | null>(null);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [aiAssisting, setAiAssisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imageBase64: string; width: number; height: number; size: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ drive_url?: string; r2_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  // Gallery
  const [galleryTab, setGalleryTab] = useState<GalleryTab>("gallery");
  const [galleryImages, setGalleryImages] = useState<PostImageRow[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [galleryDetail, setGalleryDetail] = useState<PostImageRow | null>(null);

  // Load brands + restore settings
  useEffect(() => {
    const saved = loadSettings();
    if (saved.postType) setPostType(saved.postType);
    if (saved.style) setStyle(saved.style);
    if (saved.prompt) setPrompt(saved.prompt);
    if (saved.headline) setHeadline(saved.headline);
    if (saved.subline) setSubline(saved.subline);
    if (saved.cta) setCta(saved.cta);
    if (saved.useModel !== undefined) setUseModel(saved.useModel);
    if (saved.useRef !== undefined) setUseRef(saved.useRef);
    if (saved.includeLogo !== undefined) setIncludeLogo(saved.includeLogo);

    setHistory(loadHistory());

    api("/api/brands").then((b: BrandConfig[]) => {
      setBrands(b);
      const target = saved.brandId ? b.find((x) => x.brand_id === saved.brandId) : b[0];
      if (target) setBrand(target);
    });
  }, []);

  // Save settings on change
  useEffect(() => {
    if (brand) saveSettings({ brandId: brand.brand_id, postType, style, prompt, headline, subline, cta, useModel, useRef, includeLogo });
  }, [brand, postType, style, prompt, headline, subline, cta, useModel, useRef, includeLogo]);

  // Load gallery images when brand changes
  useEffect(() => {
    if (!brand) return;
    setGalleryLoading(true);
    api(`/api/posts?brand=${brand.brand_id}&limit=30`)
      .then(async (data) => {
        const posts: PostConfig[] = data.posts || [];
        if (posts.length === 0) { setGalleryImages([]); return; }
        const allImages: PostImageRow[] = [];
        for (const p of posts.slice(0, 15)) {
          try {
            const resp = await api(`/api/posts/images?post_id=${p.id}`);
            const imgs: PostImageRow[] = resp.images || [];
            allImages.push(...imgs.filter((i) => i.status === "done"));
          } catch { /* skip */ }
        }
        setGalleryImages(allImages);
      })
      .catch(() => setGalleryImages([]))
      .finally(() => setGalleryLoading(false));
  }, [brand]);

  const spec = getPostSpec(postType);

  // Determine which logo to use
  const activeLogo = selectedLogo || brand?.logo || (brand?.logos?.[0]?.url);

  const handleGenerate = useCallback(async () => {
    if (!brand || !prompt) return;
    setLoading(true); setError(null); setUploadResult(null);
    try {
      const brandWithLogo = { ...brand, logo: activeLogo || brand.logo };
      const post: PostConfig = { id: `gen-${Date.now()}`, title: headline || prompt.slice(0, 50), type: postType as PostConfig["type"], prompt, text_overlay: { headline: headline || undefined, subline: subline || undefined, cta: cta || undefined }, use_model: useModel, use_reference: useRef, style, status: "pending" };
      const data = await api("/api/generate", { post, brand: brandWithLogo, testMode: false, includeLogo });
      setResult({ imageBase64: data.imageBase64, width: data.width, height: data.height, size: data.size });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [brand, activeLogo, prompt, postType, headline, subline, cta, useModel, useRef, style, includeLogo]);

  const handleUpload = useCallback(async () => {
    if (!result || !brand) return;
    setUploading(true);
    try {
      const data = await api("/api/upload", { imageBase64: result.imageBase64, brand: brand.brand_id, postId: `single-${Date.now()}`, title: headline || prompt.slice(0, 50), type: postType, prompt });
      setUploadResult({ drive_url: data.drive_url, r2_url: data.r2_url });

      // Add to history
      const entry: HistoryEntry = { id: `h-${Date.now()}`, prompt, headline, subline, cta, postType, style, brandId: brand.brand_id, brandName: brand.brand_name, r2_url: data.r2_url, timestamp: Date.now() };
      const newHistory = [entry, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);

      // Reload gallery
      if (data.r2_url) {
        setGalleryImages((prev) => [{ id: `new-${Date.now()}`, post_id: "", variant_type: postType, prompt, r2_url: data.r2_url, drive_url: null, status: "done", version: 1, approved: false, created_at: new Date().toISOString() }, ...prev]);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }, [result, brand, headline, prompt, postType, style, subline, cta, history]);

  const restoreFromHistory = (entry: HistoryEntry) => {
    setPrompt(entry.prompt);
    setHeadline(entry.headline);
    setSubline(entry.subline);
    setCta(entry.cta);
    setPostType(entry.postType);
    setStyle(entry.style);
    const b = brands.find((x) => x.brand_id === entry.brandId);
    if (b) setBrand(b);
  };

  const importToContent = async (img: PostImageRow) => {
    if (!brand) return;
    try {
      const post = await api("/api/posts", {
        action: "create",
        post: { brand_id: brand.brand_id, title: img.prompt?.slice(0, 60) || "Imported from Studio", type: img.variant_type || "feed-square", prompt: img.prompt || "", style: "professional", status: "images_done" },
        created_from: "studio",
      });
      window.open(`/content/${post.id}`, "_blank");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Import failed"); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Image Studio</h1>
        <span className="text-[10px] text-gray-600">Settings auto-saved</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[380px] border-r border-gray-800 overflow-y-auto p-4 flex flex-col gap-3 shrink-0">
          {/* Brand */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Brand</label>
            <select value={brand?.brand_id || ""} onChange={(e) => { setBrand(brands.find((b) => b.brand_id === e.target.value) || null); setSelectedLogo(null); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
            </select>
          </div>

          {/* Brand assets */}
          {brand && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-2.5">
              {/* Logos */}
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Logo</span>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {brand.logo && (
                    <button onClick={() => setSelectedLogo(brand.logo)} className={`h-9 w-9 rounded bg-white p-0.5 border-2 transition ${(!selectedLogo || selectedLogo === brand.logo) ? "border-blue-500" : "border-transparent hover:border-gray-600"}`}>
                      <img src={brand.logo} className="w-full h-full object-contain" alt="Primary" />
                    </button>
                  )}
                  {brand.logos?.map((l) => (
                    <button key={l.id} onClick={() => setSelectedLogo(l.url)} className={`h-9 w-9 rounded bg-white p-0.5 border-2 transition ${selectedLogo === l.url ? "border-blue-500" : "border-transparent hover:border-gray-600"}`} title={l.label}>
                      <img src={l.url} className="w-full h-full object-contain" alt={l.label} />
                    </button>
                  ))}
                  <div className="flex gap-1">{[brand.color_primary, brand.color_secondary].map((c, i) => <div key={i} className="w-4 h-4 rounded self-center" style={{ background: c }} />)}</div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5" />
                Include logo in generation
              </label>
              {/* Models */}
              {brand.models?.length > 0 && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Models</span>
                  <div className="flex gap-2 mt-1 flex-wrap">{brand.models.map((m) => (
                    <button key={m.id} onClick={() => setUseModel(useModel === m.id ? null : m.id)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition ${useModel === m.id ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      <BrandImage src={m.photo} alt={m.name} className="w-5 h-5 rounded-full object-cover" />{m.name}
                    </button>
                  ))}</div>
                </div>
              )}
              {/* References */}
              {brand.references?.length > 0 && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">References</span>
                  <div className="flex gap-2 mt-1 flex-wrap">{brand.references.map((r) => (
                    <button key={r.id} onClick={() => setUseRef(useRef === r.id ? null : r.id)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition ${useRef === r.id ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      <img src={r.path} className="w-5 h-5 rounded object-cover" alt="" />{r.description?.slice(0, 20) || r.id}
                    </button>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          {/* Post Type */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Post Type</label>
            <div className="grid grid-cols-2 gap-1">{FB_POST_TYPES.map((t) => (
              <button key={t.value} onClick={() => setPostType(t.value)} className={`py-1.5 px-2 rounded text-[11px] font-medium text-left ${postType === t.value ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                {t.label}<span className="text-[9px] text-gray-600 ml-1">{t.width}x{t.height}</span>
              </button>
            ))}</div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Visual Description</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Describe the banner..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none" />
          </div>

          {/* AI Assist */}
          {prompt && brand && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={async () => { setAiAssisting(true); try { const data = await api("/api/ai-content", { action: "auto_caption", prompt, brand, language: "both" }); if (data.headline) setHeadline(data.headline); if (data.subline) setSubline(data.subline); if (data.cta) setCta(data.cta); } catch { /* */ } finally { setAiAssisting(false); } }} disabled={aiAssisting} className="px-2.5 py-1 bg-green-600/20 text-green-400 text-[10px] rounded hover:bg-green-600/30 disabled:opacity-40">
                {aiAssisting ? "..." : "Auto-fill"}
              </button>
              <button onClick={async () => { setAiAssisting(true); try { const data = await api("/api/ai-content", { action: "suggest_variations", prompt, brand }); if (data.variations?.length) { const p = window.prompt(`1. ${data.variations[0]}\n\n2. ${data.variations[1]}\n\n3. ${data.variations[2]}\n\nPick 1-3:`); if (p && data.variations[parseInt(p) - 1]) setPrompt(data.variations[parseInt(p) - 1]); } } catch { /* */ } finally { setAiAssisting(false); } }} disabled={aiAssisting} className="px-2.5 py-1 bg-purple-600/20 text-purple-400 text-[10px] rounded hover:bg-purple-600/30 disabled:opacity-40">
                Variations
              </button>
            </div>
          )}

          {/* Text Overlay */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-gray-400">Text Overlay</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500" />
            <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Subline" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500" />
            <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500" />
          </div>

          {/* Style */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Style</label>
            <div className="grid grid-cols-2 gap-1">{FB_STYLES.map((s) => (
              <button key={s.value} onClick={() => setStyle(s.value)} className={`py-1 px-2 rounded text-[11px] text-left ${style === s.value ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{s.label}</button>
            ))}</div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt || !brand} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg text-sm transition">
            {loading ? "Generating..." : `Generate ${spec.width}x${spec.height}`}
          </button>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 p-5 flex flex-col items-center justify-center overflow-y-auto min-w-0">
          {error && <div className="mb-3 w-full max-w-lg bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>}
          {result ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-lg">
              <div className="bg-white rounded-lg shadow-xl w-full overflow-hidden cursor-zoom-in" onClick={() => setLightbox(true)}>
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">{brand?.brand_name?.[0]}</div>
                  <div><div className="text-xs font-semibold text-gray-900">{brand?.brand_name}</div><div className="text-[10px] text-gray-500">Sponsored</div></div>
                </div>
                {headline && <div className="px-3 pb-1.5 text-xs text-gray-800">{headline}</div>}
                <img src={`data:image/png;base64,${result.imageBase64}`} alt="Banner" className="w-full" />
                <div className="px-3 py-1.5 border-t border-gray-200 flex justify-around text-gray-500 text-[10px] font-medium"><span>Like</span><span>Comment</span><span>Share</span></div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400"><span>PNG</span><span>{result.width}x{result.height}</span><span>{(result.size / 1024).toFixed(0)}KB</span></div>
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={loading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg">Regenerate</button>
                <button onClick={handleUpload} disabled={uploading} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">{uploading ? "Uploading..." : "Upload & Save"}</button>
                <button onClick={() => { const a = document.createElement("a"); a.href = `data:image/png;base64,${result.imageBase64}`; a.download = `fb-${postType}-${Date.now()}.png`; a.click(); }} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg">Download</button>
              </div>
              {uploadResult && (
                <div className="w-full bg-gray-900 rounded-lg px-3 py-2 text-xs space-y-0.5">
                  <div className="text-green-400 font-medium">Uploaded!</div>
                  {uploadResult.r2_url && <a href={uploadResult.r2_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline block truncate text-[10px]">{uploadResult.r2_url}</a>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <ImageIcon size={40} className="mx-auto mb-3 text-gray-700" />
              <p className="text-sm font-medium">Create a Facebook Banner</p>
              <p className="text-xs mt-1">Select brand, post type, describe the visual</p>
            </div>
          )}
        </div>

        {/* Right: Gallery / History */}
        <div className="w-[280px] border-l border-gray-800 flex flex-col overflow-hidden shrink-0 hidden lg:flex">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button onClick={() => setGalleryTab("gallery")} className={`flex-1 py-2 text-[11px] font-medium transition ${galleryTab === "gallery" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
              <ImageIcon size={12} className="inline mr-1" />Gallery
            </button>
            <button onClick={() => setGalleryTab("history")} className={`flex-1 py-2 text-[11px] font-medium transition ${galleryTab === "history" ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-500 hover:text-gray-300"}`}>
              <Clock size={12} className="inline mr-1" />History
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {galleryTab === "gallery" ? (
              <>
                {galleryLoading && <div className="grid grid-cols-2 gap-1.5">{[1,2,3,4].map((i) => <div key={i} className="aspect-square bg-gray-800 rounded animate-pulse" />)}</div>}

                {/* Detail view */}
                {galleryDetail ? (
                  <div className="space-y-2">
                    <button onClick={() => setGalleryDetail(null)} className="text-[10px] text-gray-500 hover:text-white">&larr; Back</button>
                    <img src={galleryDetail.r2_url} className="w-full rounded-lg" alt="" />
                    <div className="space-y-1.5 text-[10px]">
                      <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{galleryDetail.variant_type}</span></div>
                      <div><span className="text-gray-500">Version:</span> <span className="text-gray-300">{galleryDetail.version}</span></div>
                      <div><span className="text-gray-500">Created:</span> <span className="text-gray-300">{new Date(galleryDetail.created_at).toLocaleDateString()}</span></div>
                      {galleryDetail.prompt && <div><span className="text-gray-500">Prompt:</span><p className="text-gray-400 mt-0.5 leading-relaxed">{galleryDetail.prompt}</p></div>}
                    </div>
                    <button onClick={() => importToContent(galleryDetail)} className="w-full py-1.5 bg-green-600/20 text-green-400 text-[10px] rounded-lg hover:bg-green-600/30 flex items-center justify-center gap-1">
                      <ArrowUpRight size={10} /> Import to Content Hub
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {galleryImages.map((img) => (
                      <button key={img.id} onClick={() => setGalleryDetail(img)} className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-blue-500/50 transition group">
                        <img src={img.r2_url} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-1.5">
                          <span className="text-[8px] text-white truncate">{img.variant_type}</span>
                        </div>
                      </button>
                    ))}
                    {galleryImages.length === 0 && !galleryLoading && <p className="col-span-2 text-[10px] text-gray-600 text-center py-4">No images yet</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                {history.map((entry) => (
                  <button key={entry.id} onClick={() => restoreFromHistory(entry)} className="w-full text-left bg-gray-900/50 border border-gray-800/50 rounded-lg p-2.5 hover:border-gray-700 transition group">
                    <div className="flex items-start gap-2">
                      {entry.r2_url ? (
                        <img src={entry.r2_url} className="w-10 h-10 rounded object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center shrink-0"><ImageIcon size={14} className="text-gray-600" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-white truncate">{entry.prompt?.slice(0, 50)}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">{entry.brandName} · {entry.postType} · {entry.style}</div>
                        <div className="text-[9px] text-gray-600">{new Date(entry.timestamp).toLocaleDateString()}</div>
                      </div>
                      <ChevronRight size={12} className="text-gray-700 group-hover:text-gray-400 shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
                {history.length === 0 && <p className="text-[10px] text-gray-600 text-center py-4">No history yet. Upload an image to start.</p>}
                {history.length > 0 && (
                  <button onClick={() => { setHistory([]); saveHistory([]); }} className="w-full text-center text-[9px] text-gray-600 hover:text-red-400 py-2">Clear history</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && result && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out" onClick={() => setLightbox(false)}>
          <img src={`data:image/png;base64,${result.imageBase64}`} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  );
}
