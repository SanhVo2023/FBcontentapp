"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2, FileJson, X } from "lucide-react";
import type { BrandConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, FB_POST_TYPES } from "@/lib/fb-specs";
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

type GenResult = {
  title: string;
  caption_vi?: string;
  caption_en?: string;
  headline: string;
  subline: string;
  cta: string;
  image_prompt: string;
  service_area: string;
  suggested_date: string;
};

export default function CreatePostPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contentIdea, setContentIdea] = useState("");
  const [angle, setAngle] = useState("educational");
  const [language, setLanguage] = useState<"vi" | "en" | "both">("both");
  const [postFormat, setPostFormat] = useState("feed-square");
  const [enableAds, setEnableAds] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      if (arr.length) setBrand(arr[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!brand || !contentIdea.trim()) return;
    setGenerating(true); setError(null);
    try {
      // 1. AI generates a single post's content (title + caption + banner text + image prompt)
      const gen: GenResult = await api("/api/ai-content", {
        action: "generate_full_post",
        brand,
        topic: contentIdea,
        post_type: "post",
        angle,
        language,
      });

      // 2. Create the post row in draft state — user edits on /content/[id]
      const post = await api("/api/posts", {
        action: "create",
        post: {
          brand_id: brand.brand_id,
          campaign_id: null,
          title: gen.title,
          topic: contentIdea,
          caption_vi: gen.caption_vi || "",
          caption_en: gen.caption_en || "",
          text_overlay: { headline: gen.headline || "", subline: gen.subline || "", cta: gen.cta || "" },
          prompt: gen.image_prompt || "",
          content_type: angle,
          service_area: gen.service_area || null,
          language,
          type: postFormat,
          style: "professional",
          status: "draft",
          scheduled_date: gen.suggested_date || null,
          ads_enabled: enableAds,
        },
        created_from: "scratch",
      });

      if (!post?.id) throw new Error("Không tạo được bài");
      router.push(`/content/${post.id}?new=1`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
      setGenerating(false);
    }
  };

  const handleJsonImport = async (data: unknown) => {
    if (!brand) return;
    if (!Array.isArray(data)) { setError("JSON phải là mảng"); return; }
    try {
      await api("/api/posts/bulk", { brand_id: brand.brand_id, posts: data });
      router.push("/content");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
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
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100"><X size={14} /></button>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">Ý tưởng nội dung</label>
              <textarea
                value={contentIdea}
                onChange={(e) => setContentIdea(e.target.value)}
                rows={3}
                placeholder="Bài đăng về cái gì? VD: Tư vấn thủ tục ly hôn đơn phương cho phụ nữ 25-45 tại TP.HCM..."
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Góc nhìn</label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setAngle(ct.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition ${
                      angle === ct.value
                        ? `${ct.color}/20 text-white ring-1 ring-current`
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {ct.emoji} {ct.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Ngôn ngữ</label>
              <div className="flex gap-1.5 mt-1">
                {[{ v: "vi" as const, l: "Tiếng Việt" }, { v: "en" as const, l: "English" }, { v: "both" as const, l: "Cả hai" }].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setLanguage(o.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      language === o.v ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Định dạng</label>
              <select
                value={postFormat}
                onChange={(e) => setPostFormat(e.target.value)}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.width}×{t.height}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableAds}
                onChange={(e) => setEnableAds(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              <span className="text-xs text-gray-300">Bật chế độ Quảng cáo</span>
              <span className="text-[10px] text-gray-500">(cấu hình đối tượng, ngân sách, CTA trong màn hình chi tiết)</span>
            </label>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerate}
              disabled={generating || !contentIdea.trim() || !brand}
            >
              {generating ? <><Loader2 className="animate-spin" size={14} /> Đang tạo...</> : <><Wand2 size={14} /> Tạo bài với AI</>}
            </Button>

            <p className="text-[10px] text-gray-500 text-center">
              AI sẽ soạn tiêu đề, caption, text banner và mô tả hình. Sau đó bạn chỉnh tiếp ở màn hình chi tiết.
            </p>
          </div>

          <div className="text-center pt-4 border-t border-gray-800/50">
            <button
              onClick={() => setShowJson(true)}
              className="text-[11px] text-gray-500 hover:text-gray-300 inline-flex items-center gap-1.5"
            >
              <FileJson size={12} /> Nhập nhiều bài từ JSON
            </button>
          </div>
        </div>
      </div>

      {showJson && (
        <ImportJsonModal
          title="Nhập từ JSON"
          description="Dán mảng JSON. Bắt buộc: title. Tùy chọn: topic, caption_vi, caption_en, content_type, service_area, scheduled_date, language, type."
          placeholder='[\n  { "title": "Ly hôn đơn phương", "topic": "Ly hôn", "content_type": "educational" }\n]'
          onImport={(data) => { setShowJson(false); handleJsonImport(data); }}
          onClose={() => setShowJson(false)}
          validate={(data) => Array.isArray(data) ? null : "Phải là một mảng JSON"}
        />
      )}
    </div>
  );
}
