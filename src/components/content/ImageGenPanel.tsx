"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Image as ImageIcon, Check, Copy, Eye, Plus, Trash2, Download, UserPlus, X, Sparkles, Wand2 } from "lucide-react";
import type { BrandConfig, PostConfig, PostType } from "@/lib/fb-specs";
import { FB_POST_TYPES, FB_STYLES, getPostSpec } from "@/lib/fb-specs";
import type { PostImageRow } from "@/lib/db";
import type { DesignLanguage } from "@/lib/design-extractor";
import { EMPTY_DESIGN_LANGUAGE } from "@/lib/design-extractor";
import BrandImage from "@/components/BrandImage";
import { downloadImage } from "@/lib/download";
import { T } from "@/lib/ui-text";

type ImageMode = "standard" | "creative";
type ImageProvider = "gemini" | "seedream";

type Props = {
  post: PostConfig;
  brand: BrandConfig;
  onUploaded?: (r2_url: string) => void;
  /** Which version ID is selected for preview on the parent FB mockup */
  selectedImageId?: string | null;
  /** Called when user clicks a version to view it */
  onSelectImage?: (img: PostImageRow) => void;
  /** Optional controlled banner overlay — when present, edits bubble up to the parent's post state (autosave) */
  overlayHeadline?: string;
  overlaySubline?: string;
  overlayCta?: string;
  onOverlayChange?: (updates: { headline?: string; subline?: string; cta?: string }) => void;
};

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 100)}`); throw e; }
}

export default function ImageGenPanel({
  post, brand, onUploaded, selectedImageId, onSelectImage,
  overlayHeadline, overlaySubline, overlayCta, onOverlayChange,
}: Props) {
  const [postType, setPostType] = useState<PostType>(post.type || "feed-square");
  const [style, setStyle] = useState(post.style || "professional");
  const [prompt, setPrompt] = useState(post.prompt || "");
  // Overlay fields: local fallback state; controlled by parent when overlay* props are passed
  const [localHeadline, setLocalHeadline] = useState(post.text_overlay?.headline || "");
  const [localSubline, setLocalSubline] = useState(post.text_overlay?.subline || "");
  const [localCta, setLocalCta] = useState(post.text_overlay?.cta || "");
  const headline = overlayHeadline ?? localHeadline;
  const subline = overlaySubline ?? localSubline;
  const cta = overlayCta ?? localCta;
  const setHeadline = (v: string) => {
    if (onOverlayChange) onOverlayChange({ headline: v }); else setLocalHeadline(v);
  };
  const setSubline = (v: string) => {
    if (onOverlayChange) onOverlayChange({ subline: v }); else setLocalSubline(v);
  };
  const setCta = (v: string) => {
    if (onOverlayChange) onOverlayChange({ cta: v }); else setLocalCta(v);
  };
  const [useModel, setUseModel] = useState<string | null>(post.use_model || null);
  const [useRef, setUseRef] = useState<string | null>(post.use_reference || null);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [variants, setVariants] = useState<Set<string>>(new Set([post.type || "feed-square"]));
  // Local mirror of brand.models so newly-added models appear instantly without a parent refetch.
  const [models, setModels] = useState(brand?.models || []);

  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<PostImageRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  // Placeholders for variants currently being generated (used for skeleton tiles)
  const [pendingVariants, setPendingVariants] = useState<string[]>([]);
  const loading = pendingVariants.length > 0;

  // Add-model popover state
  const [showAddModel, setShowAddModel] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelDesc, setModelDesc] = useState("");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUploading, setModelUploading] = useState(false);

  // Mode + provider selectors
  const [mode, setMode] = useState<ImageMode>("standard");
  const [imageProvider, setImageProvider] = useState<ImageProvider>("gemini");

  // Creative mode: reference image + extracted design language.
  // The reference is held as base64 in state (only sent to /api/image-extract,
  // not saved server-side). The extracted fields ARE sent to /api/generate.
  const [creativeRefB64, setCreativeRefB64] = useState<string | null>(null);
  const [creativeRefMime, setCreativeRefMime] = useState<string>("image/png");
  const [creativeRefPreview, setCreativeRefPreview] = useState<string | null>(null);
  const [creativeRefUrl, setCreativeRefUrl] = useState<string | null>(null);
  const [designDirection, setDesignDirection] = useState<DesignLanguage>(EMPTY_DESIGN_LANGUAGE);
  const [extracting, setExtracting] = useState(false);
  const hasDD = Object.values(designDirection).some((v) => (v || "").trim().length > 0);

  const spec = getPostSpec(postType);
  const activeLogo = selectedLogo || brand?.logo || (brand?.logos?.[0]?.url);

  useEffect(() => { setModels(brand?.models || []); }, [brand]);

  const loadImages = useCallback(async () => {
    try {
      const r = await api(`/api/posts/images?post_id=${post.id}`);
      if (r?.images) setImages(r.images);
    } catch { /* ok */ }
  }, [post.id]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2000); };

  const toggleVariant = (v: string) => setVariants((p) => { const n = new Set(p); n.has(v) ? n.delete(v) : n.add(v); return n; });

  // Parallel-friendly: the main Generate button stays enabled; clicking it
  // again while variants are in flight just appends more to the pending list.
  // The per-variant skeleton tiles signal progress; the button itself shows
  // only a small pending count, not a disabled state.
  // Generation goes through a Netlify Background Function so Seedream's
  // ~13s wall-time doesn't blow past the 10s sync cap. Flow per variant:
  //   1. POST /api/generate-start → returns { job_id } in <1s
  //   2. Poll /api/generate-poll?id=X every 2s until status=done|failed
  //   3. On done, the background worker has already written post_images +
  //      uploaded to R2 — we just refresh the grid.
  const pollJob = async (jobId: string, signal?: { cancelled: boolean }) => {
    const maxAttempts = 90;        // 3 minutes at 2s intervals
    for (let i = 0; i < maxAttempts; i++) {
      if (signal?.cancelled) throw new Error("Cancelled");
      await new Promise((res) => setTimeout(res, 2000));
      const p = await fetch(`/api/generate-poll?id=${jobId}`, { cache: "no-store" }).then((r) => r.json());
      if (p.status === "done") return p.result;
      if (p.status === "failed") throw new Error(p.error || "Background job failed");
    }
    throw new Error("Hết thời gian chờ");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Nhập mô tả hình ảnh"); return; }
    if (variants.size === 0) { setError("Chọn ít nhất 1 định dạng"); return; }
    setError(null);
    const brandWithLogo = { ...brand, logo: activeLogo || brand.logo };
    const types = Array.from(variants);
    const dd = mode === "creative" && hasDD ? designDirection : null;
    setPendingVariants((prev) => [...prev, ...types]);

    const errs: string[] = [];
    await Promise.allSettled(types.map(async (type) => {
      try {
        const postPayload: PostConfig = {
          ...post,
          id: post.id,
          type: type as PostConfig["type"],
          prompt,
          text_overlay: { headline, subline, cta },
          use_model: useModel,
          use_reference: useRef,
          style,
        };
        const { job_id } = await api("/api/generate-start", {
          post: postPayload,
          brand: brandWithLogo,
          includeLogo,
          provider: imageProvider,
          designDirection: dd,
          variantType: type,
        });
        if (!job_id) throw new Error("Không tạo được job");
        const result = await pollJob(job_id);
        if (result?.r2_url && onUploaded) onUploaded(result.r2_url as string);
      } catch (err: unknown) {
        errs.push(`${type}: ${err instanceof Error ? err.message : "Lỗi"}`);
      }
      finally {
        setPendingVariants((p) => { const idx = p.indexOf(type); if (idx === -1) return p; const next = p.slice(); next.splice(idx, 1); return next; });
        loadImages();
      }
    }));
    if (errs.length) setError(errs.join(" • "));
    else showMsg("✨ Đã tạo xong");
  };

  const handlePickCreativeFile = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Read failed"));
      r.readAsDataURL(file);
    });
    setCreativeRefB64(base64);
    setCreativeRefMime(file.type || "image/png");
    setCreativeRefUrl(null);
    setCreativeRefPreview(URL.createObjectURL(file));
    setDesignDirection(EMPTY_DESIGN_LANGUAGE);
  };

  const handlePickCreativeFromBrand = (refId: string) => {
    const ref = brand.references?.find((r) => r.id === refId);
    if (!ref?.path) return;
    setCreativeRefB64(null);
    setCreativeRefUrl(ref.path);
    setCreativeRefPreview(ref.path);
    setCreativeRefMime("image/png");
    setDesignDirection(EMPTY_DESIGN_LANGUAGE);
  };

  const handleExtractDesign = async () => {
    if (!creativeRefB64 && !creativeRefUrl) { setError("Chọn hoặc upload ảnh tham khảo trước"); return; }
    setExtracting(true); setError(null);
    try {
      const body: Record<string, unknown> = { brand };
      if (creativeRefB64) { body.imageBase64 = creativeRefB64; body.mimeType = creativeRefMime; }
      else if (creativeRefUrl) { body.imageUrl = creativeRefUrl; }
      const d = await api("/api/image-extract", body);
      setDesignDirection({
        typography: d.typography || "",
        composition: d.composition || "",
        color_mood: d.color_mood || "",
        visual_style: d.visual_style || "",
        notable_patterns: d.notable_patterns || "",
      });
      showMsg("✨ Đã phân tích phong cách");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi phân tích"); }
    finally { setExtracting(false); }
  };

  const updateDD = (k: keyof DesignLanguage, v: string) => {
    setDesignDirection((prev) => ({ ...prev, [k]: v }));
  };

  const handleApprove = async (imageId: string) => {
    try { await api("/api/posts/images", { action: "approve", image_id: imageId }); await loadImages(); showMsg("Đã duyệt"); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleTrashImage = async (imageId: string) => {
    if (!confirm("Xóa phiên bản này?")) return;
    // Optimistic removal — on failure we reload, so the UI reverts.
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    try {
      await api("/api/posts/images", { action: "trash", image_id: imageId });
      showMsg("Đã xóa");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
      loadImages();
    }
  };

  const handleAddModel = async () => {
    if (!modelFile || !modelName.trim()) { setError("Cần ảnh và tên"); return; }
    setModelUploading(true); setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(modelFile);
      });
      const up = await api("/api/brand-asset/upload", {
        imageBase64: base64,
        brand_id: brand.brand_id,
        asset_type: "model",
        filename: modelFile.name,
        content_type: modelFile.type || "image/png",
      });
      if (!up?.url) throw new Error("Upload failed");

      const newModel = { id: `model_${Date.now()}`, name: modelName.trim(), photo: up.url, description: modelDesc.trim() };
      const updatedBrand: BrandConfig = { ...brand, models: [...models, newModel] };
      await api("/api/brands", { brand: updatedBrand });

      setModels((prev) => [...prev, newModel]);
      setUseModel(newModel.id);
      setShowAddModel(false);
      setModelName(""); setModelDesc(""); setModelFile(null);
      showMsg("Đã thêm model");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setModelUploading(false);
    }
  };

  const doneImages = images.filter((i) => i.status === "done");

  return (
    <div className="space-y-3">
      {/* Mode + Model selector — lives above everything so the user sets
          intent first. Defaults (Chuẩn + Gemini) match previous behavior. */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Chế độ</span>
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${mode === "standard" ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <ImageIcon size={11} /> Chuẩn
          </button>
          <button
            type="button"
            onClick={() => setMode("creative")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${mode === "creative" ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/40" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            <Sparkles size={11} /> Sáng tạo
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Model</span>
          <button
            type="button"
            onClick={() => setImageProvider("gemini")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${imageProvider === "gemini" ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Gemini 3.1
          </button>
          <button
            type="button"
            onClick={() => setImageProvider("seedream")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${imageProvider === "seedream" ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Seedream 5.0
          </button>
        </div>
        {imageProvider === "seedream" && (
          <p className="text-[10px] text-gray-500">
            🎯 Seedream: prompt-to-image. Logo sẽ được ghép sau khi tạo. Người mẫu / tham khảo từ brand sẽ được mô tả bằng chữ trong prompt.
          </p>
        )}
      </div>

      {/* Creative reference section — appears in Creative mode only.
          Extracts an abstract design-language description from a reference
          image via /api/image-extract, then folds it into the prompt as
          directional inspiration (not a literal template). */}
      {mode === "creative" && (
        <div className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 border border-purple-500/30 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-300" />
            <span className="text-[11px] text-purple-200 font-semibold">Tham khảo sáng tạo</span>
            <span className="text-[9px] text-gray-500">AI sẽ hấp thu phong cách, không sao chép</span>
          </div>

          <div className="flex items-start gap-2">
            {creativeRefPreview ? (
              <div className="relative shrink-0">
                <img src={creativeRefPreview} className="w-20 h-20 rounded object-cover border border-gray-700" alt="" />
                <button
                  type="button"
                  onClick={() => { setCreativeRefB64(null); setCreativeRefUrl(null); setCreativeRefPreview(null); setDesignDirection(EMPTY_DESIGN_LANGUAGE); }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white"
                  title="Bỏ ảnh"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded border border-dashed border-gray-700 flex items-center justify-center shrink-0 text-gray-600">
                <ImageIcon size={20} />
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              <label className="block">
                <span className="sr-only">Upload ảnh tham khảo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickCreativeFile(f); e.target.value = ""; }}
                  className="block w-full text-[10px] text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-600 file:text-white file:text-[10px] file:cursor-pointer"
                />
              </label>
              {(brand.references?.length || 0) > 0 && (
                <select
                  onChange={(e) => { if (e.target.value) handlePickCreativeFromBrand(e.target.value); e.target.value = ""; }}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-300"
                  defaultValue=""
                >
                  <option value="">— chọn từ Brand References —</option>
                  {brand.references.map((r) => <option key={r.id} value={r.id}>{r.description || r.id}</option>)}
                </select>
              )}
              <button
                type="button"
                onClick={handleExtractDesign}
                disabled={extracting || (!creativeRefB64 && !creativeRefUrl)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[11px] rounded"
              >
                {extracting ? <><Loader2 className="animate-spin" size={11} /> Đang phân tích...</> : <><Wand2 size={11} /> Phân tích phong cách</>}
              </button>
            </div>
          </div>

          {hasDD && (
            <div className="space-y-1.5 border-t border-purple-500/20 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-purple-300/70 uppercase font-semibold">Design language (có thể chỉnh)</span>
                <button type="button" onClick={() => setDesignDirection(EMPTY_DESIGN_LANGUAGE)} className="text-[9px] text-gray-500 hover:text-gray-300">Xoá</button>
              </div>
              {(["typography", "composition", "color_mood", "visual_style", "notable_patterns"] as const).map((k) => (
                <div key={k}>
                  <label className="text-[9px] text-gray-500 capitalize">{k.replace("_", " ")}</label>
                  <input
                    value={designDirection[k]}
                    onChange={(e) => updateDD(k, e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand + Logo selector */}
      {brand && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-2.5">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold">{T.logo}</span>
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
            </div>
          </div>
          <label className={`flex items-center gap-2 text-[11px] cursor-pointer ${includeLogo ? "text-gray-300" : "text-amber-400"}`}>
            <input type="checkbox" checked={includeLogo} onChange={(e) => setIncludeLogo(e.target.checked)} className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5" />
            {includeLogo ? T.include_logo : "Không gắn logo — AI sẽ được cấm render logo/watermark"}
          </label>

          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold">{T.models}</span>
            <div className="flex gap-2 mt-1 flex-wrap">
              {models.map((m) => (
                <button key={m.id} onClick={() => setUseModel(useModel === m.id ? null : m.id)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${useModel === m.id ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  <BrandImage src={m.photo} alt={m.name} className="w-5 h-5 rounded-full object-cover" />{m.name}
                </button>
              ))}
              <button onClick={() => setShowAddModel(true)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-gray-800 text-gray-400 hover:bg-gray-700 border border-dashed border-gray-600">
                <UserPlus size={10} /> Thêm model
              </button>
            </div>
            {showAddModel && (
              <div className="mt-2 p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-300 font-semibold">Thêm model mới</span>
                  <button onClick={() => { setShowAddModel(false); setModelFile(null); setModelName(""); setModelDesc(""); }} className="text-gray-500 hover:text-white"><X size={12} /></button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                  className="w-full text-[10px] text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-[10px]"
                />
                <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Tên (VD: Luật sư A)" className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white outline-none" />
                <input value={modelDesc} onChange={(e) => setModelDesc(e.target.value)} placeholder="Mô tả ngắn (tùy chọn)" className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white outline-none" />
                <button
                  onClick={handleAddModel}
                  disabled={!modelFile || !modelName.trim() || modelUploading}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-[10px] rounded flex items-center justify-center gap-1.5"
                >
                  {modelUploading ? <><Loader2 className="animate-spin" size={10} /> Đang tải...</> : <><Plus size={10} /> Thêm</>}
                </button>
              </div>
            )}
          </div>

          {brand.references?.length > 0 && (
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">{T.references}</span>
              <div className="flex gap-2 mt-1 flex-wrap">{brand.references.map((r) => (
                <button key={r.id} onClick={() => setUseRef(useRef === r.id ? null : r.id)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${useRef === r.id ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  <img src={r.path} className="w-5 h-5 rounded object-cover" alt="" />{r.description?.slice(0, 20) || r.id}
                </button>
              ))}</div>
            </div>
          )}
        </div>
      )}

      {/* Visual prompt */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.visual_desc}</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Mô tả hình ảnh..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-y outline-none focus:border-blue-500/50" />
      </div>

      {/* Banner text */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 space-y-1.5">
        <label className="text-[10px] text-gray-500 uppercase font-medium">{T.text_overlay}</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white font-bold outline-none" />
        <input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Subline" className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white outline-none" />
        <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-blue-400 outline-none" />
      </div>

      {/* Style + Post type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.style}</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none">
            {FB_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.post_type}</label>
          <select value={postType} onChange={(e) => { const v = e.target.value as PostType; setPostType(v); setVariants(new Set([v])); }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none">
            {FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Variant multi-select */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">Tạo nhiều định dạng</label>
        <div className="flex flex-wrap gap-1">
          {FB_POST_TYPES.map((t) => (
            <label key={t.value} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer ${variants.has(t.value) ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "bg-gray-800/50 text-gray-500"}`}>
              <input type="checkbox" checked={variants.has(t.value)} onChange={() => toggleVariant(t.value)} className="accent-blue-500 w-3 h-3" />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 text-xs">{error}</div>}
      {msg && <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-green-400 text-xs">{msg}</div>}

      {/* Generate — always available; generates new versions every time */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || variants.size === 0}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition"
      >
        {doneImages.length === 0 ? (
          <><ImageIcon size={14} /> Tạo hình ({variants.size}) {spec.width}x{spec.height}</>
        ) : (
          <><Plus size={14} /> Tạo thêm phiên bản ({variants.size})</>
        )}
        {loading && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/30 rounded text-[10px] font-normal">
            <Loader2 className="animate-spin" size={10} /> +{pendingVariants.length} đang chạy
          </span>
        )}
      </button>

      {/* Versions gallery: skeletons + real versions */}
      {(pendingVariants.length > 0 || doneImages.length > 0) && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-500 uppercase font-semibold">Phiên bản hình ({doneImages.length})</label>
            {doneImages.length > 0 && <span className="text-[9px] text-gray-600">Click để xem trên mockup</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {/* Skeleton placeholders while generating */}
            {pendingVariants.map((t) => (
              <div key={`sk-${t}`} className="relative rounded overflow-hidden border border-blue-500/40 bg-gray-800 aspect-square flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="animate-spin text-blue-400 mb-1" size={18} />
                <span className="text-[8px] text-gray-400">{t}</span>
                <span className="text-[8px] text-blue-400 mt-0.5">đang tạo...</span>
              </div>
            ))}
            {/* Real versions */}
            {doneImages.map((img) => {
              const isSelected = selectedImageId === img.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onSelectImage?.(img)}
                  className={`relative rounded overflow-hidden border-2 transition group cursor-pointer ${
                    isSelected ? "border-blue-400 ring-2 ring-blue-400/40" : img.approved ? "border-green-500" : "border-gray-700 hover:border-gray-500"
                  }`}
                  title={isSelected ? "Đang xem" : "Click để xem trên mockup"}
                >
                  <img src={img.r2_url} className="w-full aspect-square object-cover" alt="" />
                  {isSelected && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] px-1 py-0.5 rounded font-semibold flex items-center gap-0.5">
                      <Eye size={8} /> Đang xem
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 flex items-center justify-between">
                    <span className="text-[8px] text-gray-300">{img.variant_type} v{img.version}</span>
                    {img.approved ? (
                      <span className="text-[8px] text-green-400 flex items-center gap-0.5"><Check size={8} />Duyệt</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleApprove(img.id); }} className="text-[8px] text-blue-400 hover:text-blue-300">Duyệt</button>
                    )}
                  </div>
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = `${post.title || post.id}-${img.variant_type}-v${img.version}.png`.replace(/[^\w.-]+/g, "_");
                        downloadImage(img.r2_url, name).catch(() => setError("Tải ảnh thất bại"));
                      }}
                      title="Tải ảnh về máy"
                      className="bg-black/60 text-white p-0.5 rounded hover:bg-black/80"
                    >
                      <Download size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(img.r2_url); showMsg("Đã copy URL"); }} title="Copy URL" className="bg-black/60 text-white p-0.5 rounded hover:bg-black/80"><Copy size={9} /></button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTrashImage(img.id); }}
                      disabled={img.approved}
                      title={img.approved ? "Bỏ duyệt trước khi xóa" : "Xóa phiên bản"}
                      className="bg-black/60 text-red-300 p-0.5 rounded hover:bg-red-600/50 disabled:opacity-40 disabled:hover:bg-black/60"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
