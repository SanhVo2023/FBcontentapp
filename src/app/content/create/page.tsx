"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileJson, X } from "lucide-react";
import type { BrandConfig } from "@/lib/fb-specs";
import ImportJsonModal from "@/components/ImportJsonModal";
import PostGeneratorForm, { type GenResult, type GenMeta } from "@/components/content/PostGeneratorForm";
import { generatePostBulkPrompt } from "@/lib/prompt-templates";
import { T } from "@/lib/ui-text";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function CreatePostPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      if (arr.length) setBrand(arr[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleGenerated = async (gen: GenResult, meta: GenMeta) => {
    if (!brand) return;
    try {
      const post = await api("/api/posts", {
        action: "create",
        post: {
          brand_id: brand.brand_id,
          campaign_id: null,
          title: gen.title,
          topic: meta.topic,
          caption_vi: gen.caption_vi || "",
          caption_en: gen.caption_en || "",
          text_overlay: { headline: gen.headline || "", subline: gen.subline || "", cta: gen.cta || "" },
          prompt: gen.image_prompt || "",
          content_type: meta.angle,
          service_area: gen.service_area || null,
          language: meta.language,
          type: meta.postFormat,
          style: "professional",
          status: "draft",
          scheduled_date: gen.suggested_date || null,
          ads_enabled: meta.adsEnabled,
        },
        created_from: "scratch",
      });
      if (!post?.id) throw new Error("Không tạo được bài");
      router.push(`/content/${post.id}?new=1`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
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

          {brand && <PostGeneratorForm brand={brand} onGenerated={handleGenerated} />}

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

      {showJson && brand && (
        <ImportJsonModal
          title="Nhập nhiều bài từ JSON"
          description="Dán mảng JSON các bài đăng. Dùng Copy AI Prompt để lấy prompt đúng schema."
          placeholder='[\n  { "title": "Ly hôn đơn phương", "topic": "Ly hôn", "content_type": "educational", "language": "both", "type": "feed-square", "status": "draft" }\n]'
          onImport={(data) => { setShowJson(false); handleJsonImport(data); }}
          onClose={() => setShowJson(false)}
          validate={(data) => Array.isArray(data) ? null : "Phải là một mảng JSON"}
          copyPrompt={generatePostBulkPrompt(brand, 10)}
        />
      )}
    </div>
  );
}
