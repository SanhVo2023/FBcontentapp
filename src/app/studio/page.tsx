"use client";

import { useState, useEffect, useCallback } from "react";
import { FB_POST_TYPES, FB_STYLES, getPostSpec } from "@/lib/fb-specs";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad response: ${text.slice(0, 100)}`); throw e; }
}

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
  const [aiAssisting, setAiAssisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imageBase64: string; width: number; height: number; size: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ drive_url?: string; r2_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => { setBrands(b); if (b.length) setBrand(b[0]); });
  }, []);

  const spec = getPostSpec(postType);

  const handleGenerate = useCallback(async () => {
    if (!brand || !prompt) return;
    setLoading(true); setError(null); setUploadResult(null);
    try {
      const post: PostConfig = { id: `gen-${Date.now()}`, title: headline || prompt.slice(0, 50), type: postType as PostConfig["type"], prompt, text_overlay: { headline: headline || undefined, subline: subline || undefined, cta: cta || undefined }, use_model: useModel, use_reference: useRef, style, status: "pending" };
      const data = await api("/api/generate", { post, brand, testMode: false, includeLogo });
      setResult({ imageBase64: data.imageBase64, width: data.width, height: data.height, size: data.size });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [brand, prompt, postType, headline, subline, cta, useModel, useRef, style]);

  const handleUpload = useCallback(async () => {
    if (!result || !brand) return;
    setUploading(true);
    try {
      const data = await api("/api/upload", { imageBase64: result.imageBase64, brand: brand.brand_id, postId: `single-${Date.now()}`, title: headline || prompt.slice(0, 50), type: postType, prompt });
      setUploadResult({ drive_url: data.drive_url, r2_url: data.r2_url });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }, [result, brand, headline, prompt, postType]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Create Banner</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[400px] border-r border-gray-800 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Brand</label>
            <select value={brand?.brand_id || ""} onChange={(e) => setBrand(brands.find((b) => b.brand_id === e.target.value) || null)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
            </select>
          </div>

          {/* Brand assets preview */}
          {brand && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BrandImage src={brand.logo} alt={brand.brand_name} className="h-8 w-8 rounded bg-white p-0.5 object-contain" />
                <div className="flex gap-1">{[brand.color_primary, brand.color_secondary].map((c, i) => <div key={i} className="w-4 h-4 rounded" style={{ background: c }} />)}</div>
                <span className="text-[10px] text-gray-500 ml-auto">{brand.tone?.slice(0, 40)}</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/30" />
                Include Logo as reference
              </label>
              {brand.models?.length > 0 && (
                <div className="flex gap-2">{brand.models.map((m) => (
                  <button key={m.id} onClick={() => setUseModel(useModel === m.id ? null : m.id)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${useModel === m.id ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500" : "bg-gray-800 text-gray-400"}`}>
                    <BrandImage src={m.photo} alt={m.name} className="w-5 h-5 rounded-full object-cover" />{m.name}
                  </button>
                ))}</div>
              )}
            </div>
          )}

          {/* Post Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Post Type</label>
            <div className="grid grid-cols-2 gap-1.5">{FB_POST_TYPES.map((t) => (
              <button key={t.value} onClick={() => setPostType(t.value)} className={`py-2 px-2 rounded text-xs font-medium text-left ${postType === t.value ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                <div>{t.label}</div><div className="text-[10px] text-gray-500">{t.width}x{t.height}</div>
              </button>
            ))}</div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Visual Description</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Describe the banner..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none" />
          </div>

          {/* AI Assist */}
          {prompt && brand && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-green-400">AI Assist</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    setAiAssisting(true);
                    try {
                      const data = await api("/api/ai-content", { action: "auto_caption", prompt, brand, language: "both" });
                      if (data.headline) setHeadline(data.headline);
                      if (data.subline) setSubline(data.subline);
                      if (data.cta) setCta(data.cta);
                    } catch { /* ignore */ }
                    finally { setAiAssisting(false); }
                  }}
                  disabled={aiAssisting}
                  className="px-3 py-1.5 bg-green-600/20 text-green-400 text-[11px] rounded hover:bg-green-600/30 disabled:opacity-40"
                >
                  {aiAssisting ? "Thinking..." : "Auto-fill Captions"}
                </button>
                <button
                  onClick={async () => {
                    setAiAssisting(true);
                    try {
                      const data = await api("/api/ai-content", { action: "suggest_variations", prompt, brand });
                      if (data.variations?.length) {
                        const picked = window.prompt(`Prompt variations:\n\n1. ${data.variations[0]}\n\n2. ${data.variations[1]}\n\n3. ${data.variations[2]}\n\nEnter 1, 2, or 3 to use:`);
                        if (picked && data.variations[parseInt(picked) - 1]) setPrompt(data.variations[parseInt(picked) - 1]);
                      }
                    } catch { /* ignore */ }
                    finally { setAiAssisting(false); }
                  }}
                  disabled={aiAssisting}
                  className="px-3 py-1.5 bg-purple-600/20 text-purple-400 text-[11px] rounded hover:bg-purple-600/30 disabled:opacity-40"
                >
                  Suggest Variations
                </button>
                <button
                  onClick={() => {
                    const tpl = `Generate a Facebook post JSON for this brand:\n\nBrand: ${brand.brand_name}\nTone: ${brand.tone}\nVisual: ${prompt}\n\nReturn JSON: {"headline":"...","subline":"...","cta":"...","caption_vi":"...","caption_en":"..."}`;
                    navigator.clipboard.writeText(tpl);
                  }}
                  className="px-3 py-1.5 bg-gray-800 text-gray-400 text-[11px] rounded hover:bg-gray-700"
                >
                  Copy Agent Prompt
                </button>
              </div>
            </div>
          )}

          {/* Text Overlay */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Text Overlay</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
            <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Subline" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
            <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Style</label>
            <div className="grid grid-cols-2 gap-1.5">{FB_STYLES.map((s) => (
              <button key={s.value} onClick={() => setStyle(s.value)} className={`py-1.5 px-2 rounded text-xs text-left ${style === s.value ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{s.label}</button>
            ))}</div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt || !brand} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg text-sm transition">
            {loading ? "Generating..." : `Generate ${spec.width}x${spec.height}`}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
          {error && <div className="mb-4 w-full max-w-2xl bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
          {result ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-[500px] overflow-hidden cursor-zoom-in" onClick={() => setLightbox(true)}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{brand?.brand_name?.[0]}</div>
                  <div><div className="text-sm font-semibold text-gray-900">{brand?.brand_name}</div><div className="text-xs text-gray-500">Sponsored</div></div>
                </div>
                {headline && <div className="px-4 pb-2 text-sm text-gray-800">{headline}</div>}
                <img src={`data:image/png;base64,${result.imageBase64}`} alt="Banner" className="w-full" />
                <div className="px-4 py-2 border-t border-gray-200 flex justify-around text-gray-500 text-xs font-medium"><span>Like</span><span>Comment</span><span>Share</span></div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400"><span>PNG</span><span>{result.width}x{result.height}</span><span>{(result.size / 1024).toFixed(0)}KB</span></div>
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg">Regenerate</button>
                <button onClick={handleUpload} disabled={uploading} className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg">{uploading ? "Uploading..." : "Upload"}</button>
                <button onClick={() => { const a = document.createElement("a"); a.href = `data:image/png;base64,${result.imageBase64}`; a.download = `fb-${postType}-${Date.now()}.png`; a.click(); }} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg">Download</button>
              </div>
              {uploadResult && (
                <div className="w-full bg-gray-900 rounded-lg px-4 py-2 text-xs space-y-1">
                  <div className="text-green-400">Uploaded!</div>
                  {uploadResult.drive_url && <a href={uploadResult.drive_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline block">Google Drive</a>}
                  {uploadResult.r2_url && <a href={uploadResult.r2_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline block truncate">{uploadResult.r2_url}</a>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <div className="text-5xl mb-4">📘</div>
              <p className="text-lg font-medium">Create a Facebook Banner</p>
              <p className="text-sm mt-1">Select brand, post type, describe the visual</p>
            </div>
          )}
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
