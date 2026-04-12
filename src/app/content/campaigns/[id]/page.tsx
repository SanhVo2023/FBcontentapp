"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, Image, Check, RotateCcw, Loader2, Download, ExternalLink } from "lucide-react";
import type { BrandConfig, PostConfig, CampaignConfig } from "@/lib/fb-specs";
import { CAMPAIGN_STATUSES, CONTENT_TYPES, CONTEXT_TYPES } from "@/lib/fb-specs";
import type { PostImageRow } from "@/lib/db";
import FacebookMockup from "@/components/content/FacebookMockup";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<CampaignConfig | null>(null);
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [images, setImages] = useState<Record<string, PostImageRow[]>>({});
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [generatingVariants, setGeneratingVariants] = useState<Set<string>>(new Set());
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const c: CampaignConfig = await api(`/api/campaigns?id=${id}`);
      setCampaign(c);
      const { posts: p }: { posts: PostConfig[] } = await api(`/api/campaigns?campaign_id=${id}&include=posts`);
      setPosts(p || []);
      const brands: BrandConfig[] = await api("/api/brands");
      const b = brands.find((x) => x.brand_id === c.brand_id);
      if (b) setBrand(b);
      if (p?.length) {
        const thumbs = await api(`/api/posts/images?post_ids=${p.map((x) => x.id).join(",")}`);
        setThumbnails(thumbs || {});
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadPostImages = async (postId: string) => {
    try {
      const { images: imgs }: { images: PostImageRow[] } = await api(`/api/posts/images?post_id=${postId}`);
      setImages((prev) => ({ ...prev, [postId]: imgs || [] }));
    } catch { /* skip */ }
  };

  const handleUpdateCampaign = async (updates: Partial<CampaignConfig>) => {
    if (!campaign) return;
    try {
      const updated = await api("/api/campaigns", { action: "update", campaign_id: campaign.id, updates });
      setCampaign(updated);
      showMsg("Updated");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const showMsg = (m: string) => { setActionMsg(m); setTimeout(() => setActionMsg(null), 2000); };

  const handleGenerateImage = async (post: PostConfig) => {
    if (!brand) return;
    setGeneratingVariants((p) => new Set([...p, post.id]));
    try {
      const data = await api("/api/generate", { post, brand, testMode: false });
      await api("/api/upload", { imageBase64: data.imageBase64, brand: brand.brand_id, postId: post.id, title: post.title, type: post.type, prompt: post.prompt });
      const thumbs = await api(`/api/posts/images?post_ids=${post.id}`);
      setThumbnails((prev) => ({ ...prev, ...thumbs }));
      await loadPostImages(post.id);
      showMsg(`Generated "${post.title}"`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Generation failed"); }
    finally { setGeneratingVariants((p) => { const n = new Set(p); n.delete(post.id); return n; }); }
  };

  const handleGenerateAll = async () => {
    if (!brand) return;
    for (let i = 0; i < posts.length; i += 2) {
      const batch = posts.slice(i, i + 2);
      await Promise.allSettled(batch.map((p) => handleGenerateImage(p)));
    }
  };

  const handleApproveImage = async (imageId: string, postId: string) => {
    try { await api("/api/posts/images", { action: "approve", image_id: imageId }); await loadPostImages(postId); showMsg("Approved"); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleTrashCampaign = async () => {
    if (!campaign || !confirm("Trash this campaign?")) return;
    try { await api("/api/campaigns", { action: "trash", campaign_id: campaign.id }); router.push("/content"); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;
  if (!campaign) return <div className="h-full flex items-center justify-center"><div className="text-red-400">Campaign not found</div></div>;

  const ctxType = CONTEXT_TYPES.find((c) => c.value === campaign.context_type);
  const statusDef = CAMPAIGN_STATUSES.find((s) => s.value === campaign.status);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <Link href="/content" className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white truncate">{campaign.name}</h1>
            {ctxType && <span className="text-[9px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">{ctxType.emoji}</span>}
            <span className="text-[10px] text-gray-500">{posts.length} variants</span>
          </div>
        </div>
        {/* Grouped actions */}
        <div className="flex items-center gap-1.5">
          {/* Status selector */}
          <select value={campaign.status} onChange={(e) => handleUpdateCampaign({ status: e.target.value as CampaignConfig["status"] })} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-white">
            {CAMPAIGN_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={handleGenerateAll} disabled={generatingVariants.size > 0 || !brand} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5">
            <Image size={12} /> Generate All
          </button>
          <button onClick={handleTrashCampaign} className="p-1.5 bg-gray-800 hover:bg-red-600/20 text-gray-500 hover:text-red-400 rounded-lg"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="mx-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 text-xs flex items-center justify-between">{error}<button onClick={() => setError(null)} className="ml-2">x</button></div>}
      {actionMsg && <div className="mx-4 mt-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-green-400 text-xs">{actionMsg}</div>}

      {/* Campaign idea context */}
      {campaign.content_idea && (
        <div className="mx-4 mt-3 bg-gray-900/30 border border-gray-800/50 rounded-lg px-4 py-2.5">
          <p className="text-xs text-gray-400">{campaign.content_idea}</p>
        </div>
      )}

      {/* Variant Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
          {posts.map((post) => {
            const ct = CONTENT_TYPES.find((c) => c.value === post.content_type);
            const isGenerating = generatingVariants.has(post.id);
            const postImages = images[post.id] || [];
            const hasThumb = !!thumbnails[post.id];
            const isExpanded = expandedPost === post.id;

            return (
              <div key={post.id} className="group">
                {/* Label */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  {ct && <span className={`${ct.color}/20 text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>{ct.emoji} {ct.label}</span>}
                  <span className="text-[10px] text-gray-500 truncate">{post.title}</span>
                </div>

                {/* Mockup OR Generated Image */}
                {isGenerating ? (
                  <div className="rounded-lg bg-gray-800/50 border border-gray-800 flex items-center justify-center" style={{ aspectRatio: "1/1.2" }}>
                    <div className="text-center"><Loader2 className="animate-spin mx-auto mb-2 text-blue-400" size={28} /><span className="text-xs text-gray-400">Generating...</span></div>
                  </div>
                ) : hasThumb ? (
                  /* Show generated image in FB mockup frame */
                  <div style={{ background: "#242526", borderRadius: 8, overflow: "hidden", fontFamily: '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif' }}>
                    <div style={{ padding: "8px 10px 4px", display: "flex", alignItems: "center", gap: 6 }}>
                      {brand?.logo ? <img src={brand.logo} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "contain", background: "#fff", padding: 1 }} alt="" /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3A3B3C" }} />}
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: "#E4E6EB" }}>{brand?.brand_name}</div><div style={{ fontSize: 10, color: "#B0B3B8" }}>Duoc tai tro · 🌐</div></div>
                    </div>
                    {post.caption_vi && <div style={{ padding: "0 10px 6px", fontSize: 11, color: "#E4E6EB", lineHeight: "15px", maxHeight: 45, overflow: "hidden" }}>{post.caption_vi.slice(0, 100)}{post.caption_vi.length > 100 ? "... Xem thêm" : ""}</div>}
                    <img src={thumbnails[post.id]} className="w-full" alt="" />
                    <div style={{ display: "flex", justifyContent: "space-around", padding: "4px 8px", borderTop: "1px solid #3E4042" }}>
                      {["👍 Thích", "💬 Bình luận", "↗ Chia sẻ"].map((l) => <span key={l} style={{ fontSize: 10, color: "#B0B3B8", fontWeight: 600, padding: "4px 0" }}>{l}</span>)}
                    </div>
                  </div>
                ) : (
                  /* Placeholder mockup */
                  <FacebookMockup
                    brandName={brand?.brand_name || "Brand"}
                    brandLogo={brand?.logo}
                    caption={post.caption_vi || post.caption_en || ""}
                    headline={post.text_overlay?.headline}
                    subline={post.text_overlay?.subline}
                    cta={post.text_overlay?.cta}
                    postType={post.type}
                    style={post.style}
                  />
                )}

                {/* Action bar - grouped */}
                <div className="flex items-center gap-1.5 mt-2">
                  {!isGenerating && (
                    <button onClick={() => handleGenerateImage(post)} disabled={!brand} className="flex-1 py-1.5 bg-blue-600/20 text-blue-400 text-[10px] rounded-lg hover:bg-blue-600/30 flex items-center justify-center gap-1 border border-blue-500/20">
                      {hasThumb ? <><RotateCcw size={10} /> Regen</> : <><Image size={10} /> Generate</>}
                    </button>
                  )}
                  {hasThumb && (
                    <button onClick={() => { setExpandedPost(isExpanded ? null : post.id); if (!isExpanded) loadPostImages(post.id); }} className="flex-1 py-1.5 bg-gray-800 text-gray-300 text-[10px] rounded-lg hover:bg-gray-700 text-center">
                      {isExpanded ? "Hide" : "Versions"}
                    </button>
                  )}
                  <Link href={`/content/${post.id}`} className="py-1.5 px-2.5 bg-gray-800 text-gray-400 text-[10px] rounded-lg hover:bg-gray-700 hover:text-white">
                    <ExternalLink size={10} />
                  </Link>
                </div>

                {/* Image versions (expanded) */}
                {isExpanded && postImages.length > 0 && (
                  <div className="mt-2 bg-gray-900/50 border border-gray-800 rounded-lg p-2 space-y-1.5">
                    <span className="text-[9px] text-gray-500 uppercase font-semibold">Versions ({postImages.filter((i) => i.status !== "trashed").length})</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {postImages.filter((i) => i.status !== "trashed").map((img) => (
                        <div key={img.id} className={`relative rounded overflow-hidden border ${img.approved ? "border-green-500" : "border-gray-700"}`}>
                          <img src={img.r2_url} className="w-full aspect-square object-cover" alt="" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 flex items-center justify-between">
                            <span className="text-[7px] text-gray-300">v{img.version}</span>
                            {img.approved ? <span className="text-[7px] text-green-400"><Check size={8} /></span> : (
                              <button onClick={() => handleApproveImage(img.id, post.id)} className="text-[7px] text-blue-400">Approve</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
