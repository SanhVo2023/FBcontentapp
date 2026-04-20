"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Image as ImageIcon, Check, Copy, Eye, Plus, Trash2, UserPlus, X } from "lucide-react";
import type { BrandConfig, PostConfig, PostType } from "@/lib/fb-specs";
import { FB_POST_TYPES, FB_STYLES, getPostSpec } from "@/lib/fb-specs";
import type { PostImageRow } from "@/lib/db";
import BrandImage from "@/components/BrandImage";
import { T } from "@/lib/ui-text";

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

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Nhập mô tả hình ảnh"); return; }
    if (variants.size === 0) { setError("Chọn ít nhất 1 định dạng"); return; }
    setError(null);
    const brandWithLogo = { ...brand, logo: activeLogo || brand.logo };
    const types = Array.from(variants);
    setPendingVariants(types);

    try {
      for (const type of types) {
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
          const data = await api("/api/generate", { post: postPayload, brand: brandWithLogo, testMode: false, includeLogo });
          if (data?.imageBase64) {
            const up = await api("/api/upload", { imageBase64: data.imageBase64, brand: brand.brand_id, postId: post.id, title: post.title, type, prompt });
            if (up?.r2_url && onUploaded) onUploaded(up.r2_url);
          }
        } catch { /* skip this variant; continue others */ }
        // Remove this variant from pending list as soon as it finishes
        setPendingVariants((p) => p.filter((t) => t !== type));
        await loadImages();
      }
      showMsg("✨ Đã tạo xong");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setPendingVariants([]); }
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
        disabled={loading || !prompt.trim()}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition"
      >
        {loading ? (
          <><Loader2 className="animate-spin" size={14} /> Đang tạo {pendingVariants.length} định dạng...</>
        ) : doneImages.length === 0 ? (
          <><ImageIcon size={14} /> Tạo hình ({variants.size}) {spec.width}x{spec.height}</>
        ) : (
          <><Plus size={14} /> Tạo thêm phiên bản ({variants.size})</>
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
                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(img.r2_url); }} title="Copy URL" className="bg-black/60 text-white p-0.5 rounded hover:bg-black/80"><Copy size={9} /></button>
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
