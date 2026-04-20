"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2, Plus, FileJson, X } from "lucide-react";
import type { BrandConfig, CampaignConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES } from "@/lib/fb-specs";
import type { CampaignVariant, GeneratedCampaign } from "@/lib/gemini-text";
import FacebookMockup from "@/components/content/FacebookMockup";
import ImportJsonModal from "@/components/ImportJsonModal";
import Button from "@/components/ui/Button";
import { T } from "@/lib/ui-text";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

const FB_FORMAT_OPTIONS = [
  { value: "feed-square", label: "Feed Square", desc: "1080×1080", icon: "⬛" },
  { value: "feed-wide", label: "Feed Wide", desc: "1200×630", icon: "🟦" },
  { value: "story", label: "Story / Reel", desc: "1080×1920", icon: "📱" },
  { value: "carousel", label: "Carousel", desc: "1080×1080", icon: "🎠" },
  { value: "ad-square", label: "Ad Square", desc: "1080×1080", icon: "📢" },
  { value: "ad-landscape", label: "Ad Wide", desc: "1200×628", icon: "📺" },
  { value: "cover", label: "Cover", desc: "820×312", icon: "🖼️" },
];

export default function CreatePostPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Unified form fields
  const [contentIdea, setContentIdea] = useState("");
  const [language, setLanguage] = useState<"vi" | "en" | "both">("both");
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(["feed-square"]));

  // Generation output
  const [generating, setGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [editingVariants, setEditingVariants] = useState<CampaignVariant[]>([]);

  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      if (arr.length) setBrand(arr[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleFormat = (f: string) => {
    setSelectedFormats((prev) => {
      const n = new Set(prev);
      n.has(f) ? n.delete(f) : n.add(f);
      // Don't let the user land on zero — fall back to feed-square.
      if (n.size === 0) n.add("feed-square");
      return n;
    });
  };

  const updateVariant = (idx: number, updates: Partial<CampaignVariant>) => {
    setEditingVariants((prev) => prev.map((v, i) => i === idx ? { ...v, ...updates } : v));
  };

  const removeVariant = (idx: number) => {
    setEditingVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!brand || !contentIdea.trim()) return;
    setGenerating(true); setError(null); setGeneratedCampaign(null);
    try {
      const data: GeneratedCampaign = await api("/api/ai-content", {
        action: "generate_campaign",
        brand,
        content_idea: contentIdea,
        context_type: "content",
        context_detail: "",
        language,
        formats: Array.from(selectedFormats),
      });
      setGeneratedCampaign(data);
      setEditingVariants(data.variants || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setGenerating(false); }
  };

  const handleSaveAll = async () => {
    if (!brand || !generatedCampaign || editingVariants.length === 0) return;
    setCreating(true); setError(null);
    try {
      const campaign: CampaignConfig = await api("/api/campaigns", {
        action: "create",
        campaign: {
          brand_id: brand.brand_id,
          name: generatedCampaign.name,
          description: generatedCampaign.description,
          content_idea: contentIdea,
          context_type: "content",
          context_detail: "",
          status: "draft",
        },
      });

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
            language,
            topic: contentIdea,
            type: v.post_type || "feed-square",
            prompt: v.image_prompt,
            text_overlay: { headline: v.headline, subline: v.subline, cta: v.cta },
            style: v.style || "professional",
            status: "draft",
          },
          created_from: "scratch",
        });
      }

      // Single-post creations land straight in the post detail;
      // multi-variant goes to the campaign overview.
      if (editingVariants.length === 1) {
        // Fetch the first post to get its ID (cheap — just go to campaign for simplicity)
        router.push(`/content/campaigns/${campaign.id}`);
      } else {
        router.push(`/content/campaigns/${campaign.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
      setCreating(false);
    }
  };

  const handleJsonImport = async (data: unknown) => {
    if (!brand) return;
    if (!Array.isArray(data)) { setError("JSON phải là mảng"); return; }
    setCreating(true); setError(null);
    try {
      await api("/api/posts/bulk", { brand_id: brand.brand_id, posts: data });
      router.push("/content");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
      setCreating(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Đang tải...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold text-gray-100">{T.create_title}</h1>
        <select
          value={brand?.brand_id || ""}
          onChange={(e) => { const b = brands.find((x) => x.brand_id === e.target.value); if (b) setBrand(b); }}
          className="ml-4 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
        </select>
        {brand?.logo && <img src={brand.logo} className="h-6 rounded bg-white p-0.5" alt="" />}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100"><X size={14} /></button>
            </div>
          )}

          {/* Unified form */}
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">Ý tưởng nội dung</label>
              <textarea
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                rows={3}
                placeholder="Bài đăng về cái gì? VD: Tư vấn thủ tục ly hôn đơn phương, nhắm đến phụ nữ 25-45 tại TP.HCM..."
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Ngôn ngữ</label>
              <div className="flex gap-1.5 mt-1">
                {[{ v: "vi" as const, l: "Tiếng Việt" }, { v: "en" as const, l: "English" }, { v: "both" as const, l: "Cả hai" }].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setLanguage(o.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs ${language === o.v ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Định dạng ({selectedFormats.size})</label>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {FB_FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => toggleFormat(f.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center gap-1.5 ${
                      selectedFormats.has(f.value)
                        ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50"
                        : "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                    <span className="text-[9px] opacity-60">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerate}
              disabled={generating || !contentIdea.trim() || !brand}
            >
              {generating ? <><Loader2 className="animate-spin" size={14} /> Đang tạo...</> : <><Wand2 size={14} /> Tạo với AI</>}
            </Button>
          </div>

          {/* Review grid */}
          {generatedCampaign && editingVariants.length > 0 && (
            <div className="space-y-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{generatedCampaign.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{generatedCampaign.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                    {editingVariants.length} bài
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {editingVariants.map((v, idx) => {
                  const ct = CONTENT_TYPES.find((c) => c.value === v.content_type);
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-300">#{idx + 1}</span>
                        {ct && <span className={`${ct.color}/20 text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>{ct.emoji} {ct.label}</span>}
                        <span className="text-[9px] text-gray-500 truncate">{v.title}</span>
                        <button onClick={() => removeVariant(idx)} className="ml-auto text-gray-700 hover:text-red-400 text-[10px] transition opacity-0 group-hover:opacity-100">Xóa</button>
                      </div>

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

                      <details className="mt-2 bg-gray-900/50 border border-gray-800/50 rounded-lg overflow-hidden">
                        <summary className="px-3 py-2 text-[11px] text-gray-400 cursor-pointer hover:text-gray-200 select-none">
                          Sửa nội dung & prompt
                        </summary>
                        <div className="px-3 pb-3 space-y-2 border-t border-gray-800/50 pt-2">
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase">Tiêu đề</label>
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
                            <label className="text-[9px] text-gray-500 uppercase">Image prompt</label>
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

              <div className="flex gap-3 sticky bottom-0 bg-gray-950/80 backdrop-blur-sm -mx-6 px-6 py-3 border-t border-gray-800">
                <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Đang tạo..." : "Tạo lại"}
                </Button>
                <Button variant="success" size="lg" onClick={handleSaveAll} disabled={creating}>
                  {creating ? "Đang lưu..." : `Lưu tất cả (${editingVariants.length} bài)`}
                </Button>
              </div>
            </div>
          )}

          {/* Bottom: JSON import secondary link */}
          <div className="text-center pt-4 border-t border-gray-800/50">
            <button
              onClick={() => setShowJson(true)}
              className="text-[11px] text-gray-500 hover:text-gray-300 inline-flex items-center gap-1.5"
            >
              <FileJson size={12} /> Nhập từ JSON (dành cho quy trình AI batch)
            </button>
          </div>
        </div>
      </div>

      {showJson && (
        <ImportJsonModal
          title="Nhập từ JSON"
          description={`Dán mảng JSON. Cột yêu cầu: title. Tùy chọn: topic, caption_vi, caption_en, content_type, service_area, scheduled_date (YYYY-MM-DD), language, type.`}
          placeholder='[\n  { "title": "Ly hôn đơn phương", "topic": "Ly hôn", "content_type": "educational" }\n]'
          onImport={(data) => { setShowJson(false); handleJsonImport(data); }}
          onClose={() => setShowJson(false)}
          validate={(data) => Array.isArray(data) ? null : "Phải là một mảng JSON"}
        />
      )}
    </div>
  );
}
