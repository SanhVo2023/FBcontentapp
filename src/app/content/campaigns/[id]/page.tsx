"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, Image, Check, RotateCcw, Loader2 } from "lucide-react";
import type { BrandConfig, PostConfig, CampaignConfig } from "@/lib/fb-specs";
import { CAMPAIGN_STATUSES, CONTENT_TYPES, CONTEXT_TYPES } from "@/lib/fb-specs";
import type { PostImageRow } from "@/lib/db";
import PostThumbnail from "@/components/PostThumbnail";

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
  const [editingStatus, setEditingStatus] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load campaign
      const c: CampaignConfig = await api(`/api/campaigns?id=${id}`);
      setCampaign(c);

      // Load campaign posts
      const { posts: p }: { posts: PostConfig[] } = await api(`/api/campaigns?campaign_id=${id}&include=posts`);
      setPosts(p || []);

      // Load brand
      const brands: BrandConfig[] = await api("/api/brands");
      const b = brands.find((x) => x.brand_id === c.brand_id);
      if (b) setBrand(b);

      // Load thumbnails
      if (p?.length) {
        const thumbs = await api(`/api/posts/images?post_ids=${p.map((x) => x.id).join(",")}`);
        setThumbnails(thumbs || {});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadPostImages = async (postId: string) => {
    const { images: imgs }: { images: PostImageRow[] } = await api(`/api/posts/images?post_id=${postId}`);
    setImages((prev) => ({ ...prev, [postId]: imgs || [] }));
  };

  const handleUpdateCampaign = async (updates: Partial<CampaignConfig>) => {
    if (!campaign) return;
    try {
      const updated = await api("/api/campaigns", { action: "update", campaign_id: campaign.id, updates });
      setCampaign(updated);
      setActionMsg("Campaign updated");
      setTimeout(() => setActionMsg(null), 2000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Update failed"); }
  };

  const handleGenerateImage = async (post: PostConfig) => {
    if (!brand) return;
    setGeneratingVariants((p) => new Set([...p, post.id]));
    try {
      const data = await api("/api/generate", { post, brand, testMode: false });
      await api("/api/upload", {
        imageBase64: data.imageBase64, brand: brand.brand_id,
        postId: post.id, title: post.title, type: post.type, prompt: post.prompt,
      });
      // Refresh thumbnails and images
      const thumbs = await api(`/api/posts/images?post_ids=${post.id}`);
      setThumbnails((prev) => ({ ...prev, ...thumbs }));
      await loadPostImages(post.id);
      setActionMsg(`Image generated for "${post.title}"`);
      setTimeout(() => setActionMsg(null), 2000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Generation failed"); }
    finally { setGeneratingVariants((p) => { const n = new Set(p); n.delete(post.id); return n; }); }
  };

  const handleGenerateAll = async () => {
    if (!brand) return;
    for (let i = 0; i < posts.length; i += 3) {
      const batch = posts.slice(i, i + 3);
      await Promise.allSettled(batch.map((p) => handleGenerateImage(p)));
    }
  };

  const handleApproveImage = async (imageId: string, postId: string) => {
    try {
      await api("/api/posts/images", { action: "approve", image_id: imageId });
      await loadPostImages(postId);
      setActionMsg("Image approved");
      setTimeout(() => setActionMsg(null), 2000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Approve failed"); }
  };

  const handleTrashNonApproved = async (postId: string) => {
    try {
      await api("/api/posts/images", { action: "trash_non_approved", post_id: postId });
      await loadPostImages(postId);
      setActionMsg("Non-approved images trashed");
      setTimeout(() => setActionMsg(null), 2000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Trash failed"); }
  };

  const handleTrashCampaign = async () => {
    if (!campaign || !confirm("Trash this campaign?")) return;
    try {
      await api("/api/campaigns", { action: "trash", campaign_id: campaign.id });
      router.push("/content");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Trash failed"); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading campaign...</div></div>;
  if (!campaign) return <div className="h-full flex items-center justify-center"><div className="text-red-400">Campaign not found</div></div>;

  const ctxType = CONTEXT_TYPES.find((c) => c.value === campaign.context_type);
  const statusDef = CAMPAIGN_STATUSES.find((s) => s.value === campaign.status);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <Link href="/content" className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{campaign.name}</h1>
          <p className="text-[11px] text-gray-500 truncate">{campaign.description}</p>
        </div>
        {statusDef && (
          <button onClick={() => setEditingStatus(!editingStatus)} className={`px-2.5 py-1 ${statusDef.color}/20 text-white text-xs rounded-full border border-current/20`}>
            {statusDef.label}
          </button>
        )}
        {brand && <img src={brand.logo} className="h-6 rounded bg-white p-0.5" alt="" />}
      </div>

      {/* Status dropdown */}
      {editingStatus && (
        <div className="border-b border-gray-800 px-4 py-2 flex gap-1.5 bg-gray-900/50">
          {CAMPAIGN_STATUSES.filter((s) => s.value !== "trashed").map((s) => (
            <button key={s.value} onClick={() => { handleUpdateCampaign({ status: s.value as CampaignConfig["status"] }); setEditingStatus(false); }}
              className={`px-3 py-1 rounded text-xs ${campaign.status === s.value ? `${s.color} text-white` : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {error && <div className="mx-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 text-xs flex items-center justify-between">{error}<button onClick={() => setError(null)} className="text-red-500 ml-2">x</button></div>}
      {actionMsg && <div className="mx-4 mt-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-green-400 text-xs">{actionMsg}</div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Campaign Info */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {ctxType && <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{ctxType.emoji} {ctxType.label}</span>}
              <span className="text-[10px] text-gray-500">{posts.length} variants</span>
              {campaign.target_date && <span className="text-[10px] text-teal-400 flex items-center gap-1"><Calendar size={10} />{campaign.target_date}</span>}
            </div>
            {campaign.content_idea && <p className="text-xs text-gray-400">{campaign.content_idea}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleGenerateAll} disabled={generatingVariants.size > 0 || !brand} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded-lg flex items-center gap-1.5">
              <Image size={12} /> Generate All Images
            </button>
            <button onClick={handleTrashCampaign} className="px-3 py-1.5 bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 text-xs rounded-lg"><Trash2 size={12} /></button>
          </div>
        </div>

        {/* Variant Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map((post) => {
            const ct = CONTENT_TYPES.find((c) => c.value === post.content_type);
            const isGenerating = generatingVariants.has(post.id);
            const postImages = images[post.id] || [];
            const approvedImage = postImages.find((img) => img.approved);
            const hasAnyImage = !!thumbnails[post.id] || postImages.length > 0;

            return (
              <div key={post.id} className="bg-gray-900/70 border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700 transition">
                {/* Image area */}
                <div className="relative aspect-video bg-gray-800/30">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-2 text-blue-400" size={24} />
                        <span className="text-xs text-gray-400">Generating...</span>
                      </div>
                    </div>
                  ) : thumbnails[post.id] ? (
                    <img src={thumbnails[post.id]} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button onClick={() => handleGenerateImage(post)} disabled={!brand} className="px-3 py-2 bg-blue-600/20 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 border border-blue-500/30">
                        <Image size={14} className="inline mr-1.5" />Generate Image
                      </button>
                    </div>
                  )}
                  {ct && <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${ct.color}/80 text-white backdrop-blur-sm`}>{ct.emoji} {ct.label}</div>}
                  <div className="absolute top-2 right-2 text-[9px] text-gray-300 bg-gray-900/70 px-1.5 py-0.5 rounded backdrop-blur-sm">{post.type}</div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/content/${post.id}`} className="text-sm font-medium text-white hover:text-blue-400 transition truncate">{post.title}</Link>
                    <span className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{post.style}</span>
                  </div>

                  {post.caption_vi && <p className="text-[11px] text-gray-400 line-clamp-2">{post.caption_vi}</p>}

                  {/* Banner text */}
                  {post.text_overlay?.headline && (
                    <div className="bg-gray-800/50 rounded px-2.5 py-1.5 space-y-0.5">
                      <div className="text-[10px] font-bold text-white">{post.text_overlay.headline}</div>
                      {post.text_overlay.subline && <div className="text-[9px] text-gray-400">{post.text_overlay.subline}</div>}
                      {post.text_overlay.cta && <div className="text-[9px] text-blue-400">{post.text_overlay.cta}</div>}
                    </div>
                  )}

                  {/* Image versions */}
                  {postImages.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-gray-500 uppercase font-semibold">Image Versions ({postImages.filter((i) => i.status !== "trashed").length})</span>
                        {approvedImage && <button onClick={() => handleTrashNonApproved(post.id)} className="text-[9px] text-red-400 hover:text-red-300">Trash non-approved</button>}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {postImages.filter((i) => i.status !== "trashed").map((img) => (
                          <div key={img.id} className={`relative rounded overflow-hidden border ${img.approved ? "border-green-500" : "border-gray-700"}`}>
                            <img src={img.r2_url} className="w-full aspect-square object-cover" alt="" />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 flex items-center justify-between">
                              <span className="text-[8px] text-gray-300">v{img.version}</span>
                              {img.approved ? (
                                <span className="text-[8px] text-green-400 flex items-center gap-0.5"><Check size={8} />Approved</span>
                              ) : (
                                <button onClick={() => handleApproveImage(img.id, post.id)} className="text-[8px] text-blue-400 hover:text-blue-300">Approve</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    {hasAnyImage && !postImages.length && (
                      <button onClick={() => loadPostImages(post.id)} className="text-[10px] text-gray-400 hover:text-white">Show versions</button>
                    )}
                    {hasAnyImage && (
                      <button onClick={() => handleGenerateImage(post)} disabled={isGenerating || !brand} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:text-gray-600">
                        <RotateCcw size={10} /> Regenerate
                      </button>
                    )}
                    <Link href={`/content/${post.id}`} className="text-[10px] text-gray-400 hover:text-white ml-auto">Edit post</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
