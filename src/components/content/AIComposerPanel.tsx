"use client";

import { useState, useEffect } from "react";
import { Wand2, ChevronDown, ChevronUp, Save, Settings, Trash2, Download } from "lucide-react";
import type { BrandConfig, ContentType, SamplePost } from "@/lib/fb-specs";
import { TONE_PRESETS, CONTENT_TYPES, getTonePrompt } from "@/lib/fb-specs";
import { T } from "@/lib/ui-text";

type GoalTemplate = {
  id: string;
  brand_id: string | null;
  name: string;
  description: string;
  post_defaults: Record<string, unknown>;
  schedule_pattern: string;
};

type ComposerDefaults = {
  kind: "composer";
  tone: string;
  tone_custom?: string;
  angle: ContentType;
  sample_text?: string;
  fact_hint?: string;
  language: "vi" | "en" | "both";
};

type Props = {
  brand: BrandConfig | null;
  language: "vi" | "en" | "both";
  topic?: string;
  onComposed: (result: {
    caption_vi?: string;
    caption_en?: string;
    headline: string;
    subline: string;
    cta: string;
    hashtags: string;
  }) => void;
};

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function AIComposerPanel({ brand, language, topic, onComposed }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [tone, setTone] = useState("professional");
  const [toneCustom, setToneCustom] = useState("");
  const [angle, setAngle] = useState<ContentType>("educational");
  const [sampleText, setSampleText] = useState("");
  const [facts, setFacts] = useState("");
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [showManage, setShowManage] = useState(false);

  // Load templates for this brand
  useEffect(() => {
    if (!brand?.brand_id) return;
    api(`/api/templates?brand=${brand.brand_id}`)
      .then((t) => setTemplates((Array.isArray(t) ? t : []).filter((x: GoalTemplate) => (x.post_defaults as ComposerDefaults)?.kind === "composer")))
      .catch(() => setTemplates([]));
  }, [brand?.brand_id]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2000); };

  const handleCompose = async () => {
    if (!brand) { setError("Chọn thương hiệu trước"); return; }
    if (!facts.trim()) { setError("Nhập thông tin & dữ liệu"); return; }
    setComposing(true); setError(null);
    try {
      const samples = sampleText.split(/\n\s*---+\s*\n/).map((s) => s.trim()).filter(Boolean);
      if (samples.length === 0 && sampleText.trim()) samples.push(sampleText.trim());
      const tonePrompt = getTonePrompt(tone, toneCustom);
      const result = await api("/api/ai-content", {
        action: "compose_post",
        brand,
        input: { tone: tonePrompt, angle, samples, facts, topic, language },
      });
      onComposed(result);
      showMsg("✨ Soạn xong");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setComposing(false); }
  };

  const handleLoadBrandSamples = () => {
    if (!brand?.sample_posts?.length) { setError("Thương hiệu chưa có bài mẫu"); return; }
    const joined = brand.sample_posts.map((s: SamplePost) => s.text).join("\n\n---\n\n");
    setSampleText(joined);
    showMsg(`Đã nạp ${brand.sample_posts.length} bài mẫu`);
  };

  const handleLoadTemplate = (templateId: string) => {
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const d = tpl.post_defaults as ComposerDefaults;
    if (d.tone) setTone(d.tone);
    if (d.tone_custom) setToneCustom(d.tone_custom);
    if (d.angle) setAngle(d.angle);
    if (d.sample_text) setSampleText(d.sample_text);
    if (d.fact_hint) setFacts(d.fact_hint);
    showMsg(`📋 ${tpl.name}`);
  };

  const handleSaveTemplate = async () => {
    const name = window.prompt(T.template_name_prompt);
    if (!name || !brand) return;
    const post_defaults: ComposerDefaults = {
      kind: "composer",
      tone,
      tone_custom: tone === "custom" ? toneCustom : undefined,
      angle,
      sample_text: sampleText,
      fact_hint: facts,
      language,
    };
    try {
      const tpl = await api("/api/templates", {
        action: "create",
        template: { brand_id: brand.brand_id, name, description: "", post_defaults, schedule_pattern: "" },
      });
      setTemplates((prev) => [...prev, tpl]);
      showMsg(T.template_saved);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(T.delete + "?")) return;
    try {
      await api("/api/templates", { action: "delete", template_id: id });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showMsg(T.template_deleted);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/5 border border-purple-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-purple-500/5 transition"
      >
        <Wand2 size={14} className="text-purple-400" />
        <span className="text-sm font-semibold text-white">{T.ai_composer}</span>
        <span className="text-[10px] text-gray-500 hidden sm:inline">— {T.ai_composer_desc}</span>
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{msg}</span>}
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-purple-500/10 p-4 space-y-3">
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 text-xs">{error}</div>}

          {/* Template controls */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] text-gray-500 uppercase font-medium">{T.load_template}:</label>
            <select
              onChange={(e) => { handleLoadTemplate(e.target.value); e.target.value = ""; }}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none min-w-[160px]"
              defaultValue=""
            >
              <option value="">— {T.load_template} —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowManage(!showManage)} className="p-1 text-gray-500 hover:text-gray-300" title={T.manage_templates}>
              <Settings size={12} />
            </button>
          </div>

          {/* Manage templates list */}
          {showManage && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 space-y-1">
              {templates.length === 0 ? (
                <p className="text-[10px] text-gray-600 text-center py-1">{T.no_templates}</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
                    <span className="text-xs text-gray-300">{t.name}</span>
                    <button type="button" onClick={() => handleDeleteTemplate(t.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tone + Angle row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.tone_of_voice}</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none">
                {TONE_PRESETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {tone === "custom" && (
                <input value={toneCustom} onChange={(e) => setToneCustom(e.target.value)} placeholder={T.tone_custom_placeholder} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50" />
              )}
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.content_angle}</label>
              <div className="flex gap-1 flex-wrap">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setAngle(ct.value)}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium transition ${angle === ct.value ? `${ct.color}/20 text-white ring-1 ring-current` : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {ct.emoji} {ct.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sample posts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-gray-500 uppercase font-medium">{T.sample_posts_label}</label>
              {(brand?.sample_posts?.length || 0) > 0 && (
                <button type="button" onClick={handleLoadBrandSamples} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <Download size={10} /> {T.load_brand_samples} ({brand?.sample_posts?.length})
                </button>
              )}
            </div>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={4}
              placeholder={T.sample_posts_placeholder}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-300 resize-y outline-none focus:border-purple-500/50 font-mono leading-relaxed"
            />
          </div>

          {/* Facts */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-medium block mb-1">{T.facts_label}</label>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              rows={4}
              placeholder={T.facts_placeholder}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white resize-y outline-none focus:border-purple-500/50 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleCompose}
              disabled={composing || !facts.trim() || !brand}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Wand2 size={12} />
              {composing ? T.composing : T.compose_now}
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!brand}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs rounded-lg transition flex items-center gap-1.5"
            >
              <Save size={12} />
              {T.save_as_template}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
