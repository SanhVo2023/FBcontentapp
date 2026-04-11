"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BrandConfig } from "@/lib/fb-specs";
import { generatePostBatchPrompt, generateBrandConfigPrompt, generateContentCalendarPrompt, APOLO_BRAND_GUIDELINES } from "@/lib/prompt-templates";

export default function TemplatesPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(12);
  const [weeks, setWeeks] = useState(4);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((b: BrandConfig[]) => { setBrands(b); if (b.length) setBrand(b[0]); }).catch(() => {});
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const templates = [
    {
      id: "post-batch",
      title: "Generate Post Batch",
      icon: "📦",
      desc: "Generate multiple Facebook post configs. The AI outputs a JSON array you can import directly into Batch Mode.",
      color: "blue",
      needsBrand: true,
      getPrompt: () => brand ? generatePostBatchPrompt(brand, postCount) : "",
      controls: (
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-gray-500">Posts:</label>
          <input type="number" min={4} max={50} value={postCount} onChange={(e) => setPostCount(Number(e.target.value))} className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
        </div>
      ),
    },
    {
      id: "content-calendar",
      title: "Content Calendar",
      icon: "📅",
      desc: "Generate a full month of posts with weekly themes: educational, authority, promotional, engagement.",
      color: "purple",
      needsBrand: true,
      getPrompt: () => brand ? generateContentCalendarPrompt(brand, weeks) : "",
      controls: (
        <div className="flex items-center gap-2 mt-2">
          <label className="text-xs text-gray-500">Weeks:</label>
          <input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
        </div>
      ),
    },
    {
      id: "brand-config",
      title: "New Brand Config",
      icon: "🏢",
      desc: "Generate a brand configuration JSON. Import it in the Brands page.",
      color: "amber",
      needsBrand: false,
      getPrompt: () => generateBrandConfigPrompt(),
      controls: null,
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-600/20 to-blue-600/5 border-blue-500/30 hover:border-blue-500/60",
    purple: "from-purple-600/20 to-purple-600/5 border-purple-500/30 hover:border-purple-500/60",
    amber: "from-amber-600/20 to-amber-600/5 border-amber-500/30 hover:border-amber-500/60",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">&larr;</Link>
        <h1 className="text-lg font-bold"><span className="text-green-400">AI</span> Prompt Templates</h1>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6 w-full">
        {/* Brand selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Brand context:</label>
          <select value={brand?.brand_id || ""} onChange={(e) => setBrand(brands.find((b) => b.brand_id === e.target.value) || null)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
            {brands.length === 0 && <option>No brands — add one in /brands first</option>}
          </select>
          {brand && (
            <div className="flex items-center gap-2">
              {brand.logo && <img src={brand.logo} className="h-6 rounded bg-white p-0.5" />}
              <div className="flex gap-1">{[brand.color_primary, brand.color_secondary].map((c, i) => <div key={i} className="w-4 h-4 rounded" style={{ background: c }} />)}</div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">Copy a prompt below, paste it into any AI chat (Claude, ChatGPT, Gemini), get JSON back, then import it into the app.</p>

        {/* Template cards */}
        <div className="space-y-4">
          {templates.map((t) => {
            const prompt = t.getPrompt();
            const disabled = t.needsBrand && !brand;
            return (
              <div key={t.id} className={`bg-gradient-to-br ${colorMap[t.color]} border rounded-xl p-5 transition`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{t.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{t.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{t.desc}</p>
                    {t.controls}
                  </div>
                  <button
                    onClick={() => copyToClipboard(prompt, t.id)}
                    disabled={disabled}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
                  >
                    {copied === t.id ? "Copied!" : disabled ? "Select brand first" : "Copy Prompt"}
                  </button>
                </div>

                {/* Preview */}
                {!disabled && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Preview prompt ({prompt.length} chars)</summary>
                    <pre className="mt-2 bg-gray-950/50 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">{prompt}</pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        {/* Brand Guidelines Reference */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Apolo Lawyers Brand Guidelines</h3>
            <button onClick={() => copyToClipboard(APOLO_BRAND_GUIDELINES, "guidelines")} className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700">
              {copied === "guidelines" ? "Copied!" : "Copy Guidelines"}
            </button>
          </div>
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">View guidelines</summary>
            <pre className="mt-2 bg-gray-950/50 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">{APOLO_BRAND_GUIDELINES}</pre>
          </details>
        </div>

        {/* How to use */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3">How to use</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div><div className="text-2xl mb-1">1</div><div className="text-xs text-gray-400">Copy a prompt template above</div></div>
            <div><div className="text-2xl mb-1">2</div><div className="text-xs text-gray-400">Paste into Claude, ChatGPT, or any AI</div></div>
            <div><div className="text-2xl mb-1">3</div><div className="text-xs text-gray-400">Copy the JSON output</div></div>
            <div><div className="text-2xl mb-1">4</div><div className="text-xs text-gray-400">Import in <Link href="/batch" className="text-blue-400">Batch</Link> or <Link href="/brands" className="text-amber-400">Brands</Link></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
