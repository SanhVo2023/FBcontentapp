"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BrandConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, SERVICE_AREAS, FB_POST_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";

type GoalTemplate = { id: string; name: string; description: string; post_defaults: Record<string, unknown>; schedule_pattern: string };

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function CreatePostPage() {
  const router = useRouter();

  // Shared
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Mode
  const [mode, setMode] = useState<"select" | "scratch" | "template" | "json">("select");

  // Scratch fields
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("both");
  const [postTypeGroup, setPostTypeGroup] = useState("post");
  const [angle, setAngle] = useState("educational");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ title: string; caption_vi?: string; caption_en?: string; headline: string; subline: string; cta: string; image_prompt: string; service_area: string; suggested_date: string } | null>(null);

  // Template
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [templateTopic, setTemplateTopic] = useState("");

  // JSON import
  const [jsonText, setJsonText] = useState("");
  const [jsonPreview, setJsonPreview] = useState<Array<Record<string, unknown>> | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    api("/api/brands").then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      if (arr.length) setBrand(arr[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (brand) {
      api(`/api/templates?brand=${brand.brand_id}`).then((t) => setTemplates(Array.isArray(t) ? t : [])).catch(() => setTemplates([]));
    }
  }, [brand]);

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

  // ---- TEMPLATE: Generate from template ----
  const handleTemplateGenerate = async () => {
    if (!brand || !selectedTemplate || !templateTopic) return;
    setGenerating(true); setError(null); setPreview(null);
    try {
      const defaults = selectedTemplate.post_defaults || {};
      const data = await api("/api/ai-content", {
        action: "generate_full_post", brand, topic: templateTopic,
        post_type: (defaults.post_type_group as string) || "post",
        angle: (defaults.content_type as string) || "educational",
        language: (defaults.language as string) || "both",
      });
      setPreview(data);
      setMode("scratch"); // Reuse scratch preview/save flow
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
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

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Create Post</h1>
        <select value={brand?.brand_id || ""} onChange={(e) => { const b = brands.find((x) => x.brand_id === e.target.value); if (b) setBrand(b); }} className="ml-4 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {error && <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>}

          {/* ===== MODE SELECT ===== */}
          {mode === "select" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">How do you want to create?</h2>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setMode("scratch")} className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition text-left group">
                  <div className="text-3xl mb-3">✨</div>
                  <div className="font-semibold text-white group-hover:text-blue-400 transition">From Scratch</div>
                  <div className="text-xs text-gray-500 mt-2">Enter a topic, AI generates the full post — caption, banner text, image prompt, schedule suggestion.</div>
                </button>

                <button onClick={() => setMode("template")} className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition text-left group">
                  <div className="text-3xl mb-3">📋</div>
                  <div className="font-semibold text-white group-hover:text-purple-400 transition">From Template</div>
                  <div className="text-xs text-gray-500 mt-2">Pick a goal template with preset defaults, then customize the topic. Great for repeating series.</div>
                </button>

                <button onClick={() => setMode("json")} className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition text-left group">
                  <div className="text-3xl mb-3">📦</div>
                  <div className="font-semibold text-white group-hover:text-green-400 transition">JSON Import</div>
                  <div className="text-xs text-gray-500 mt-2">Paste or upload a JSON array to bulk-create posts. Perfect for AI agent workflows or batch operations.</div>
                </button>
              </div>
            </div>
          )}

          {/* ===== FROM SCRATCH ===== */}
          {mode === "scratch" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMode("select"); setPreview(null); }} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">Create from Scratch</h2>
              </div>

              {/* Input area */}
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-5 space-y-4">
                <div className="flex gap-2">
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What's this post about? e.g., Ly hon don phuong..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50" onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()} />
                  <div className="flex bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                    {[{ v: "vi", l: "VI" }, { v: "en", l: "EN" }, { v: "both", l: "Both" }].map((o) => (
                      <button key={o.v} onClick={() => setLanguage(o.v)} className={`px-2.5 py-2 text-xs ${language === o.v ? "bg-gray-700 text-white" : "text-gray-500 hover:bg-gray-800"}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
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

              {/* Preview */}
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

          {/* ===== FROM TEMPLATE ===== */}
          {mode === "template" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setMode("select")} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">Create from Template</h2>
              </div>

              {templates.length === 0 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-500">No templates yet for this brand.</p>
                  <p className="text-xs text-gray-600 mt-2">Templates can be created in the settings area to speed up recurring content series.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t)} className={`text-left bg-gray-900/50 border rounded-xl p-4 transition ${selectedTemplate?.id === t.id ? "border-purple-500 ring-1 ring-purple-500/40" : "border-gray-800 hover:border-gray-700"}`}>
                        <div className="font-medium text-sm text-white">{t.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{t.description}</div>
                        {t.schedule_pattern && <div className="text-[10px] text-purple-400 mt-2">Schedule: {t.schedule_pattern}</div>}
                      </button>
                    ))}
                  </div>

                  {selectedTemplate && (
                    <div className="bg-purple-600/5 border border-purple-500/20 rounded-xl p-5 space-y-3">
                      <div className="text-sm font-medium text-purple-400">{selectedTemplate.name}</div>
                      <input value={templateTopic} onChange={(e) => setTemplateTopic(e.target.value)} placeholder="Topic for this post..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50" />
                      <button onClick={handleTemplateGenerate} disabled={generating || !templateTopic} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-medium rounded-xl text-sm">
                        {generating ? "Generating..." : "Generate from Template"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== JSON IMPORT ===== */}
          {mode === "json" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setMode("select")} className="text-gray-500 hover:text-white text-sm">&larr;</button>
                <h2 className="text-xl font-bold text-white">JSON Bulk Import</h2>
              </div>

              <div className="bg-green-600/5 border border-green-500/20 rounded-xl p-5 space-y-4">
                <p className="text-xs text-gray-400">Paste a JSON array of posts. Each object can have: title, topic, caption_vi, caption_en, content_type, service_area, language, scheduled_date, prompt, text_overlay, style.</p>
                <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={12} placeholder={`[\n  {\n    "title": "Post title",\n    "topic": "Ly hon don phuong",\n    "caption_vi": "...",\n    "content_type": "educational",\n    "scheduled_date": "2026-04-15"\n  }\n]`} className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-xs text-white font-mono resize-none" />
                {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleJsonParse} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700">Validate</button>
                  {jsonPreview && (
                    <button onClick={handleJsonImport} disabled={creating} className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg">
                      {creating ? "Importing..." : `Import ${jsonPreview.length} Post${jsonPreview.length !== 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>

                {jsonPreview && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                    <div className="text-xs text-green-400 mb-2">Valid JSON: {jsonPreview.length} posts</div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {jsonPreview.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                          <span className="text-gray-600">#{i + 1}</span>
                          <span className="text-white">{(p.title as string) || "Untitled"}</span>
                          {p.content_type ? <span className="text-purple-400">{String(p.content_type)}</span> : null}
                          {p.scheduled_date ? <span className="text-teal-400 ml-auto">{String(p.scheduled_date)}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
