"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BrandConfig, CampaignConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, SERVICE_AREAS, CONTEXT_TYPES } from "@/lib/fb-specs";
import type { CampaignVariant, GeneratedCampaign } from "@/lib/gemini-text";
import { generateContentCalendarPrompt } from "@/lib/prompt-templates";
import BrandImage from "@/components/BrandImage";
import FacebookMockup from "@/components/content/FacebookMockup";

type GoalTemplate = { id: string; name: string; description: string; post_defaults: Record<string, unknown>; schedule_pattern: string };

const JSON_SAMPLE = `[
  {
    "title": "Ly hon don phuong - Thu tuc va quyen loi",
    "topic": "Ly hon don phuong",
    "caption_vi": "Ban dang can ly hon don phuong?...",
    "content_type": "educational",
    "service_area": "family-law",
    "language": "both",
    "scheduled_date": "2026-04-20"
  }
]`;

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

type Mode = "select" | "campaign" | "scratch" | "json";

export default function CreatePostPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<Mode>("select");

  // Campaign fields
  const [contentIdea, setContentIdea] = useState("");
  const [contextType, setContextType] = useState<string>("content");
  const [contextDetail, setContextDetail] = useState("");
  const [campaignLanguage, setCampaignLanguage] = useState<"vi" | "en" | "both">("both");
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(["feed-square", "feed-wide", "story"]));
  const [generating, setGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [editingVariants, setEditingVariants] = useState<CampaignVariant[]>([]);

  const FB_FORMAT_OPTIONS = [
    { value: "feed-square", label: "Feed Square", desc: "1080x1080", icon: "⬛" },
    { value: "feed-wide", label: "Feed Wide", desc: "1200x630", icon: "🟦" },
    { value: "story", label: "Story / Reel", desc: "1080x1920", icon: "📱" },
    { value: "carousel", label: "Carousel", desc: "1080x1080", icon: "🎠" },
    { value: "ad-square", label: "Ad Square", desc: "1080x1080", icon: "📢" },
    { value: "ad-landscape", label: "Ad Wide", desc: "1200x628", icon: "📺" },
    { value: "cover", label: "Cover Photo", desc: "820x312", icon: "🖼️" },
  ];

  const toggleFormat = (f: string) => {
    setSelectedFormats((prev) => {
      const n = new Set(prev);
      n.has(f) ? n.delete(f) : n.add(f);
      return n;
    });
  };

  // Scratch fields
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("both");
  const [postTypeGroup, setPostTypeGroup] = useState("post");
  const [angle, setAngle] = useState("educational");
  const [preview, setPreview] = useState<{ title: string; caption_vi?: string; caption_en?: string; headline: string; subline: string; cta: string; image_prompt: string; service_area: string; suggested_date: string } | null>(null);

  // JSON import
  const [jsonText, setJsonText] = useState("");
  const [jsonPreview, setJsonPreview] = useState<Array<Record<string, unknown>> | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  // Calendar prompt
  const [calCopied, setCalCopied] = useState(false);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      if (arr.length) setBrand(arr[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ---- CAMPAIGN: AI Generate ----
  const handleCampaignGenerate = async () => {
    if (!brand || !contentIdea) return;
    setGenerating(true); setError(null); setGeneratedCampaign(null);
    try {
      const data: GeneratedCampaign = await api("/api/ai-content", {
        action: "generate_campaign", brand, content_idea: contentIdea,
        context_type: contextType, context_detail: contextDetail, language: campaignLanguage,
        formats: Array.from(selectedFormats),
      });
      setGeneratedCampaign(data);
      setEditingVariants(data.variants || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  };

  const handleCreateCampaign = async () => {
    if (!brand || !generatedCampaign || editingVariants.length === 0) return;
    setCreating(true); setError(null);
    try {
      // 1. Create campaign
      const campaign: CampaignConfig = await api("/api/campaigns", {
        action: "create",
        campaign: {
          brand_id: brand.brand_id,
          name: generatedCampaign.name,
          description: generatedCampaign.description,
          content_idea: contentIdea,
          context_type: contextType,
          context_detail: contextDetail,
          status: "draft",
        },
      });

      // 2. Create posts for each variant
      for (const v of editingVariants) {
        await api("/api/posts", {
          action: "create",
          post: {
            brand_id: brand.brand_id,
            campaign_id: campaign.id,
            title: v.title,
            caption_vi: v.caption_vi,
            caption_en: v.caption_en,
            content_type: v.content_type,
            service_area: v.service_area,
            language: campaignLanguage,
            type: v.post_type || "feed-square",
            prompt: v.image_prompt,
            text_overlay: { headline: v.headline, subline: v.subline, cta: v.cta },
            style: v.style || "professional",
            status: "draft",
          },
          created_from: "scratch",
        });
      }

      router.push(`/content/campaigns/${campaign.id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); setCreating(false); }
  };

  const updateVariant = (idx: number, updates: Partial<CampaignVariant>) => {
    setEditingVariants((prev) => prev.map((v, i) => i === idx ? { ...v, ...updates } : v));
  };

  const removeVariant = (idx: number) => {
    setEditingVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---- SCRATCH: AI Generate ----
  const handleAIGenerate = async () => {
    if (!brand || !topic) return;
    setGenerating(true); setError(null); setPreview(null);
    try {
      const data = await api("/api/ai-content", { action: "generate_full_post", brand, topic, post_type: postTypeGroup, angle, language });
      setPreview(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  };

  const handleSaveScratch = async () => {
    if (!brand || !preview) return;
    setCreating(true); setError(null);
    try {
      const post = await api("/api/posts", {
        action: "create",
        post: {
          brand_id: brand.brand_id, title: preview.title, topic,
          service_area: preview.service_area, content_type: angle,
          language, caption_vi: preview.caption_vi, caption_en: preview.caption_en,
          type: "feed-square", prompt: preview.image_prompt,
          text_overlay: { headline: preview.headline, subline: preview.subline, cta: preview.cta },
          style: "professional", status: "draft",
          scheduled_date: preview.suggested_date,
        },
        created_from: "scratch",
      });
      router.push(`/content/${post.id}`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); setCreating(false); }
  };

  // ---- JSON IMPORT ----
  const handleJsonParse = () => {
    setJsonError(null); setJsonPreview(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      setJsonPreview(parsed);
    } catch (e: unknown) { setJsonError(e instanceof Error ? e.message : "Invalid JSON"); }
  };

  const handleJsonImport = async () => {
    if (!brand || !jsonPreview) return;
    setCreating(true); setError(null);
    try {
      await api("/api/posts/bulk", { brand_id: brand.brand_id, posts: jsonPreview });
      router.push("/content");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Import failed"); setCreating(false); }
  };

  const handleCopyCalendarPrompt = () => {
    if (!brand) return;
    navigator.clipboard.writeText(generateContentCalendarPrompt(brand, 4));
    setCalCopied(true);
    setTimeout(() => setCalCopied(false), 2000);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Create Content</h1>
        <select value={brand?.brand_id || ""} onChange={(e) => { const b = brands.find((x) => x.brand_id === e.target.value); if (b) setBrand(b); }} className="ml-4 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
        </select>
        {brand?.logo && <img src={brand.logo} className="h-6 rounded bg-white p-0.5" alt="" />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {error && <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>}

          {/* ===== MODE SELECT ===== */}
          {mode === "select" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">How do you want to create?</h2>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setMode("campaign")} className="bg-gradient-to-br from-amber-600/20 to-orange-600/5 border border-amber-500/30 rounded-xl p-6 hover:border-amber-500/60 transition text-left group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded">NEW</div>
                  <div className="text-3xl mb-3">🚀</div>
                  <div className="font-semibold text-white group-hover:text-amber-400 transition">Campaign</div>
                  <div className="text-xs text-gray-500 mt-2">Enter a content idea + context. AI generates a full campaign with multiple content variants — different angles, formats, and styles.</div>
                </button>

                <button onClick={() => setMode("scratch")} className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition text-left group">
                  <div className="text-3xl mb-3">✨</div>
                  <div className="font-semibold text-white group-hover:text-blue-400 transition">Single Post</div>
                  <div className="text-xs text-gray-500 mt-2">Enter a topic, AI generates a single post — caption, banner text, image prompt, schedule suggestion.</div>
                </button>

                <button onClick={() => setMode("json")} className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition text-left group">
                  <div className="text-3xl mb-3">📦</div>
                  <div className="font-semibold text-white group-hover:text-green-400 transition">JSON Import</div>
                  <div className="text-xs text-gray-500 mt-2">Paste or upload a JSON array to bulk-create posts. Perfect for AI agent workflows or batch operations.</div>
                </button>
              </div>
            </div>
          )}

          {/* ===== CAMPAIGN MODE ===== */}
          {mode === "campaign" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMode("select"); setGeneratedCampaign(null); setEditingVariants([]); }} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">Create Campaign</h2>
              </div>

              {/* Input */}
              <div className="bg-gradient-to-r from-amber-600/10 to-orange-600/10 border border-amber-500/20 rounded-xl p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium">Content Idea</label>
                  <textarea value={contentIdea} onChange={(e) => setContentIdea(e.target.value)} rows={3} placeholder="What's this campaign about? e.g., Quảng bá dịch vụ tư vấn ly hôn đơn phương, nhắm đến phụ nữ 25-45 tuổi tại TP.HCM..." className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Context Type</label>
                    <div className="flex gap-1.5 mt-1">
                      {CONTEXT_TYPES.map((ct) => (
                        <button key={ct.value} onClick={() => setContextType(ct.value)} className={`px-3 py-1.5 rounded-lg text-xs transition ${contextType === ct.value ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                          {ct.emoji} {ct.label.split(" / ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Language</label>
                    <div className="flex gap-1.5 mt-1">
                      {[{ v: "vi" as const, l: "Vietnamese" }, { v: "en" as const, l: "English" }, { v: "both" as const, l: "Both" }].map((o) => (
                        <button key={o.v} onClick={() => setCampaignLanguage(o.v)} className={`px-3 py-1.5 rounded-lg text-xs ${campaignLanguage === o.v ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400"}`}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium">Context Detail <span className="text-gray-600">(optional)</span></label>
                  <textarea value={contextDetail} onChange={(e) => setContextDetail(e.target.value)} rows={2} placeholder="Product details, promotion terms, reference links, specific requirements..." className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                </div>

                {/* Content Format Selection */}
                <div>
                  <label className="text-xs text-gray-400 font-medium">Content Formats <span className="text-gray-600">({selectedFormats.size} selected)</span></label>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {FB_FORMAT_OPTIONS.map((f) => (
                      <button key={f.value} onClick={() => toggleFormat(f.value)} className={`px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center gap-1.5 ${selectedFormats.has(f.value) ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300"}`}>
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                        <span className="text-[9px] opacity-60">{f.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleCampaignGenerate} disabled={generating || !contentIdea || !brand} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl text-sm transition flex items-center gap-2">
                  {generating ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generating Campaign...</>
                  ) : "Generate Campaign"}
                </button>
              </div>

              {/* Generated Campaign Review */}
              {generatedCampaign && editingVariants.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{generatedCampaign.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{generatedCampaign.description}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">{editingVariants.length} variants</span>
                    </div>
                  </div>

                  {/* Variant Cards with Facebook Mockups */}
                  <div className="grid grid-cols-2 gap-5">
                    {editingVariants.map((v, idx) => {
                      const ct = CONTENT_TYPES.find((c) => c.value === v.content_type);
                      return (
                        <div key={idx} className="group">
                          {/* Label bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-300">#{idx + 1}</span>
                            {ct && <span className={`${ct.color}/20 text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>{ct.emoji} {ct.label}</span>}
                            <span className="text-[9px] text-gray-500">{v.title}</span>
                            <button onClick={() => removeVariant(idx)} className="ml-auto text-gray-700 hover:text-red-400 text-[10px] transition opacity-0 group-hover:opacity-100">Remove</button>
                          </div>

                          {/* Facebook Mockup */}
                          <FacebookMockup
                            brandName={brand?.brand_name || "Brand"}
                            brandLogo={brand?.logo}
                            caption={v.caption_vi || v.caption_en || ""}
                            headline={v.headline}
                            subline={v.subline}
                            cta={v.cta}
                            postType={v.post_type}
                            style={v.style}
                          />

                          {/* Editable fields (collapsible) */}
                          <details className="mt-2 bg-gray-900/50 border border-gray-800/50 rounded-lg overflow-hidden">
                            <summary className="px-3 py-2 text-[11px] text-gray-400 cursor-pointer hover:text-gray-200 select-none flex items-center gap-2">
                              <svg className="w-3 h-3 transition-transform" style={{ transform: "rotate(0deg)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                              Edit content & prompt
                            </summary>
                            <div className="px-3 pb-3 space-y-2 border-t border-gray-800/50 pt-2">
                              <div>
                                <label className="text-[9px] text-gray-500 uppercase">Title</label>
                                <input value={v.title} onChange={(e) => updateVariant(idx, { title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium mt-0.5" />
                              </div>
                              {v.caption_vi !== undefined && (
                                <div>
                                  <label className="text-[9px] text-gray-500 uppercase">Caption (VI)</label>
                                  <textarea value={v.caption_vi || ""} onChange={(e) => updateVariant(idx, { caption_vi: e.target.value })} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white resize-none mt-0.5" />
                                </div>
                              )}
                              {v.caption_en !== undefined && (
                                <div>
                                  <label className="text-[9px] text-gray-500 uppercase">Caption (EN)</label>
                                  <textarea value={v.caption_en || ""} onChange={(e) => updateVariant(idx, { caption_en: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white resize-none mt-0.5" />
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2">
                                <div><label className="text-[9px] text-gray-500 uppercase">Headline</label><input value={v.headline} onChange={(e) => updateVariant(idx, { headline: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-white font-bold mt-0.5" /></div>
                                <div><label className="text-[9px] text-gray-500 uppercase">Subline</label><input value={v.subline} onChange={(e) => updateVariant(idx, { subline: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-white mt-0.5" /></div>
                                <div><label className="text-[9px] text-gray-500 uppercase">CTA</label><input value={v.cta} onChange={(e) => updateVariant(idx, { cta: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-blue-400 mt-0.5" /></div>
                              </div>
                              <div>
                                <label className="text-[9px] text-gray-500 uppercase">Image Prompt</label>
                                <textarea value={v.image_prompt} onChange={(e) => updateVariant(idx, { image_prompt: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 resize-none mt-0.5" />
                              </div>
                              <div className="flex gap-2">
                                <select value={v.post_type} onChange={(e) => updateVariant(idx, { post_type: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
                                  {FB_FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.icon} {f.label}</option>)}
                                </select>
                                <select value={v.style} onChange={(e) => updateVariant(idx, { style: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-[10px] text-white">
                                  {["professional","bold","minimal","warm","dark-luxury","vibrant","editorial"].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleCampaignGenerate} disabled={generating} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700 transition">
                      {generating ? "Regenerating..." : "Regenerate"}
                    </button>
                    <button onClick={handleCreateCampaign} disabled={creating} className="px-8 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-sm font-semibold rounded-xl transition">
                      {creating ? "Creating..." : `Create Campaign (${editingVariants.length} posts)`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== FROM SCRATCH ===== */}
          {mode === "scratch" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMode("select"); setPreview(null); }} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">Create Single Post</h2>
              </div>

              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
                <div className="flex gap-2">
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What's this post about? e.g., Ly hon don phuong..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50" onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()} />
                  <div className="flex bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                      <button key={o.v} onClick={() => setLanguage(o.v)} className={`px-2.5 py-2 text-xs ${language === o.v ? "bg-gray-700 text-white" : "text-gray-500 hover:bg-gray-800"}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex gap-1">{[{ v: "post", l: "Post" }, { v: "ad", l: "Ad" }, { v: "story", l: "Story" }].map((t) => (
                    <button key={t.v} onClick={() => setPostTypeGroup(t.v)} className={`px-3 py-1 rounded text-xs ${postTypeGroup === t.v ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400"}`}>{t.l}</button>
                  ))}</div>
                  <div className="flex gap-1">{CONTENT_TYPES.map((ct) => (
                    <button key={ct.value} onClick={() => setAngle(ct.value)} className={`px-2 py-1 rounded text-xs ${angle === ct.value ? `${ct.color}/20 text-white ring-1 ring-current` : "bg-gray-800 text-gray-400"}`}>{ct.emoji} {ct.label}</button>
                  ))}</div>
                </div>
                <button onClick={handleAIGenerate} disabled={generating || !topic || !brand} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl text-sm transition">
                  {generating ? "Generating..." : "Generate Post"}
                </button>
              </div>

              {preview && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-green-400">Generated Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div><label className="text-[9px] text-gray-500 uppercase">Title</label><input value={preview.title} onChange={(e) => setPreview({ ...preview, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white mt-0.5" /></div>
                      {preview.caption_vi !== undefined && <div><label className="text-[9px] text-gray-500 uppercase">Caption (VI)</label><textarea value={preview.caption_vi} onChange={(e) => setPreview({ ...preview, caption_vi: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-[11px] text-white mt-0.5 resize-none" /></div>}
                      {preview.caption_en !== undefined && <div><label className="text-[9px] text-gray-500 uppercase">Caption (EN)</label><textarea value={preview.caption_en} onChange={(e) => setPreview({ ...preview, caption_en: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-[11px] text-white mt-0.5 resize-none" /></div>}
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 rounded p-3 space-y-2">
                        <label className="text-[9px] text-gray-500 uppercase">Banner Text</label>
                        <input value={preview.headline} onChange={(e) => setPreview({ ...preview, headline: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white font-bold" placeholder="Headline" />
                        <input value={preview.subline} onChange={(e) => setPreview({ ...preview, subline: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white" placeholder="Subline" />
                        <input value={preview.cta} onChange={(e) => setPreview({ ...preview, cta: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-blue-400" placeholder="CTA" />
                      </div>
                      <div><label className="text-[9px] text-gray-500 uppercase">Service Area</label><p className="text-xs text-gray-400 mt-0.5">{preview.service_area}</p></div>
                      <div><label className="text-[9px] text-gray-500 uppercase">Suggested Date</label><p className="text-xs text-gray-400 mt-0.5">{preview.suggested_date}</p></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAIGenerate} disabled={generating} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700">Regenerate</button>
                    <button onClick={handleSaveScratch} disabled={creating} className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
                      {creating ? "Creating..." : "Create Post"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== JSON IMPORT ===== */}
          {mode === "json" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setMode("select")} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">Content Import</h2>
                {brand && (
                  <button onClick={handleCopyCalendarPrompt} className="ml-auto px-3 py-1.5 bg-purple-600/20 text-purple-400 text-xs rounded-lg hover:bg-purple-600/30 transition border border-purple-500/30">
                    {calCopied ? "Copied!" : "Copy Calendar AI Prompt"}
                  </button>
                )}
              </div>

              {/* Sample */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                <button onClick={() => setShowSample(!showSample)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition">
                  <div className="flex items-center gap-2"><span className="text-sm">📋</span><span className="text-xs font-semibold text-gray-300">JSON Schema & Sample</span></div>
                  <span className="text-gray-500 text-xs">{showSample ? "Hide" : "Show"}</span>
                </button>
                {showSample && (
                  <div className="border-t border-gray-800 px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="text-gray-400">title</span><span className="text-gray-600">required</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">topic</span><span className="text-gray-600">string</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">caption_vi / caption_en</span><span className="text-gray-600">captions</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">content_type</span><span className="text-purple-400/70">educational | authority | ...</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">service_area</span><span className="text-blue-400/70">family-law | corporate | ...</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">scheduled_date</span><span className="text-gray-600">YYYY-MM-DD</span></div>
                    </div>
                    <div className="flex items-center justify-between"><h4 className="text-[10px] text-gray-500 uppercase font-semibold">Sample</h4><button onClick={() => { navigator.clipboard.writeText(JSON_SAMPLE); setJsonText(JSON_SAMPLE); }} className="text-[10px] text-green-400 hover:text-green-300">Copy to editor</button></div>
                    <pre className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-[11px] text-gray-300 font-mono overflow-x-auto whitespace-pre leading-relaxed max-h-40 overflow-y-auto">{JSON_SAMPLE}</pre>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="bg-green-600/5 border border-green-500/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Paste JSON or upload a file</span>
                  <label className="ml-auto px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg cursor-pointer transition flex items-center gap-1.5">
                    Upload .json
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => { const t = ev.target?.result as string; setJsonText(t); try { const p = JSON.parse(t); if (Array.isArray(p)) { setJsonPreview(p); setJsonError(null); } else { setJsonError("Must be array"); } } catch (err: unknown) { setJsonError(err instanceof Error ? err.message : "Invalid"); } };
                      reader.readAsText(file); e.target.value = "";
                    }} />
                  </label>
                </div>
                <textarea value={jsonText} onChange={(e) => { setJsonText(e.target.value); setJsonPreview(null); setJsonError(null); }} rows={8} placeholder={`[\n  { "title": "...", "topic": "..." }\n]`} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-[11px] text-white font-mono resize-y min-h-[100px]" />
                {jsonError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">{jsonError}</div>}
                <div className="flex gap-2">
                  <button onClick={handleJsonParse} disabled={!jsonText.trim()} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-xs rounded-lg">Validate</button>
                  {jsonPreview && <button onClick={handleJsonImport} disabled={creating} className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs font-semibold rounded-lg">{creating ? "Importing..." : `Import ${jsonPreview.length} Posts`}</button>}
                </div>
              </div>

              {/* Preview table */}
              {jsonPreview && jsonPreview.length > 0 && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
                    <span className="text-xs font-semibold text-green-400">Preview</span>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{jsonPreview.length} posts</span>
                  </div>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead><tr className="text-[9px] text-gray-500 uppercase border-b border-gray-800/50 sticky top-0 bg-gray-900">
                        <th className="px-4 py-2 text-left w-8">#</th><th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left w-24">Type</th><th className="px-3 py-2 text-left w-24">Date</th>
                      </tr></thead>
                      <tbody>{jsonPreview.map((p, i) => {
                        const ct = CONTENT_TYPES.find((c) => c.value === p.content_type);
                        return (
                          <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20"><td className="px-4 py-2 text-gray-600">{i + 1}</td>
                            <td className="px-3 py-2"><div className="text-white truncate max-w-[300px]">{String(p.title || "Untitled")}</div></td>
                            <td className="px-3 py-2">{ct ? <span className={`${ct.color}/20 text-white text-[9px] px-1.5 py-0.5 rounded`}>{ct.emoji}</span> : "—"}</td>
                            <td className="px-3 py-2">{p.scheduled_date ? <span className="text-teal-400 text-[10px]">{String(p.scheduled_date)}</span> : "—"}</td>
                          </tr>);
                      })}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
