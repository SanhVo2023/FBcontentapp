"use client";

import { useState } from "react";
import { Wand2, Loader2, Download } from "lucide-react";
import type { BrandConfig, SamplePost } from "@/lib/fb-specs";
import { CONTENT_TYPES, FB_POST_TYPES } from "@/lib/fb-specs";
import Button from "@/components/ui/Button";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export type GenResult = {
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

export type GenMeta = {
  topic: string;
  angle: string;
  language: "vi" | "en" | "both";
  postFormat: string;
  adsEnabled: boolean;
};

type Props = {
  brand: BrandConfig;
  initial?: Partial<GenMeta & { samples: string; facts: string }>;
  showFormat?: boolean;
  showAdsToggle?: boolean;
  submitLabel?: string;
  onGenerated: (result: GenResult, meta: GenMeta) => void | Promise<void>;
  onCancel?: () => void;
};

export default function PostGeneratorForm({
  brand,
  initial,
  showFormat = true,
  showAdsToggle = true,
  submitLabel = "Tạo bài với AI",
  onGenerated,
  onCancel,
}: Props) {
  const [topic, setTopic] = useState(initial?.topic || "");
  const [angle, setAngle] = useState(initial?.angle || "educational");
  const [language, setLanguage] = useState<"vi" | "en" | "both">(initial?.language || "both");
  const [postFormat, setPostFormat] = useState(initial?.postFormat || "feed-square");
  const [adsEnabled, setAdsEnabled] = useState(!!initial?.adsEnabled);
  const [samples, setSamples] = useState(initial?.samples || "");
  const [facts, setFacts] = useState(initial?.facts || "");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandSampleCount = brand.sample_posts?.length || 0;

  const handleLoadBrandSamples = () => {
    if (!brand.sample_posts?.length) return;
    const joined = brand.sample_posts.map((s: SamplePost) => s.text.trim()).filter(Boolean).join("\n\n---\n\n");
    setSamples(joined);
  };

  const handleSubmit = async () => {
    if (!topic.trim()) { setError("Nhập ý tưởng nội dung"); return; }
    setGenerating(true); setError(null);
    try {
      const samplesArr = samples
        .split(/\n\s*---+\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const result: GenResult = await api("/api/ai-content", {
        action: "generate_full_post",
        brand,
        topic,
        post_type: "post",
        angle,
        language,
        samples: samplesArr,
        facts: facts.trim() || undefined,
      });

      await onGenerated(result, { topic, angle, language, postFormat, adsEnabled });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{error}</div>
      )}

      <div>
        <label className="text-xs text-gray-400 font-medium">Ý tưởng nội dung</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
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
              type="button"
              onClick={() => setAngle(ct.value)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                angle === ct.value ? `${ct.color}/20 text-white ring-1 ring-current` : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
              type="button"
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

      {showFormat && (
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
      )}

      {/* Preference / style reference samples */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400 font-medium">Preference / Bài mẫu phong cách</label>
          {brandSampleCount > 0 && (
            <button
              type="button"
              onClick={handleLoadBrandSamples}
              className="text-[10px] text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
            >
              <Download size={10} /> Nạp bài mẫu từ thương hiệu ({brandSampleCount})
            </button>
          )}
        </div>
        <textarea
          value={samples}
          onChange={(e) => setSamples(e.target.value)}
          rows={5}
          placeholder={"Dán 1-2 bài mẫu để AI học phong cách (cấu trúc, emoji, bullet, CTA). Dùng --- để ngăn cách giữa các bài."}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-300 font-mono resize-y outline-none focus:border-blue-500/50 leading-relaxed"
        />
      </div>

      {/* Document / context — grounding facts */}
      <div>
        <label className="text-xs text-gray-400 font-medium">Document / Ngữ cảnh</label>
        <textarea
          value={facts}
          onChange={(e) => setFacts(e.target.value)}
          rows={4}
          placeholder="Thông tin cụ thể để AI không bịa: dịch vụ, giá, điểm nổi bật, điều khoản luật liên quan, hotline, email liên hệ..."
          className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 resize-y leading-relaxed"
        />
      </div>

      {showAdsToggle && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={adsEnabled}
            onChange={(e) => setAdsEnabled(e.target.checked)}
            className="accent-orange-500 w-4 h-4"
          />
          <span className="text-xs text-gray-300">Bật chế độ Quảng cáo</span>
          <span className="text-[10px] text-gray-500">(cấu hình đối tượng, ngân sách, CTA trong màn hình chi tiết)</span>
        </label>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={generating || !topic.trim() || !brand}
          fullWidth={!onCancel}
        >
          {generating ? <><Loader2 className="animate-spin" size={14} /> Đang tạo...</> : <><Wand2 size={14} /> {submitLabel}</>}
        </Button>
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} disabled={generating}>
            Hủy
          </Button>
        )}
      </div>

      <p className="text-[10px] text-gray-500 text-center">
        AI sẽ soạn tiêu đề, caption, text banner và mô tả hình. Các giá trị sẽ xuất hiện trên mockup bài viết ở màn hình chi tiết.
      </p>
    </div>
  );
}
