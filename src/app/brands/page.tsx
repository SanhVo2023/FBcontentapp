"use client";

import { useState, useEffect } from "react";
import type { BrandConfig, LogoVariant } from "@/lib/fb-specs";
import ImportJsonModal from "@/components/ImportJsonModal";
import { generateBrandConfigPrompt } from "@/lib/prompt-templates";
import { Plus, Trash2, Upload, Palette, Users, ImageIcon, Type, Target } from "lucide-react";
import { T } from "@/lib/ui-text";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

const EMPTY_BRAND: BrandConfig = {
  brand_id: "", brand_name: "", tagline: "", logo: "", logos: [],
  color_primary: "#1a1a2e", color_secondary: "#c5a55a", color_accent: "#ffffff",
  font_style: "", models: [], references: [], sample_posts: [],
  tone: "", industry: "", target_audience: "",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [editing, setEditing] = useState<BrandConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleCopyBrandPrompt = () => {
    navigator.clipboard.writeText(generateBrandConfigPrompt());
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  useEffect(() => { api("/api/brands").then((b: BrandConfig[]) => setBrands(Array.isArray(b) ? b : [])); }, []);

  const handleNew = () => setEditing({ ...EMPTY_BRAND, brand_id: `brand-${Date.now()}` });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true); setMsg("");
    try {
      await api("/api/brands", { brand: editing });
      setMsg("Saved!");
      const updated = await api("/api/brands") as BrandConfig[];
      setBrands(updated);
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editing || !confirm(`Delete "${editing.brand_name}"?`)) return;
    try {
      await api("/api/brands", { brand_id: editing.brand_id });
      setEditing(null);
      const updated = await api("/api/brands") as BrandConfig[];
      setBrands(updated);
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Failed"); }
  };

  const handleUploadAsset = async (file: File, assetType: string, filename: string): Promise<string> => {
    if (!editing) return "";
    setUploading(filename);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const data = await api("/api/brand-asset/upload", { imageBase64: base64, brand_id: editing.brand_id, asset_type: assetType, filename, content_type: file.type });
      return data.url as string;
    } finally { setUploading(null); }
  };

  const handleUploadMultiple = async (files: FileList, assetType: string, callback: (urls: string[]) => void) => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await handleUploadAsset(files[i], assetType, `${assetType}-${Date.now()}-${i}`);
      if (url) urls.push(url);
    }
    callback(urls);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">{T.brands_title}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleCopyBrandPrompt} className="px-3 py-1.5 bg-purple-600/20 text-purple-400 text-xs rounded-lg hover:bg-purple-600/30 border border-purple-500/30">
            {promptCopied ? T.copied : T.ai_prompt}
          </button>
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-green-600/20 text-green-400 text-xs rounded-lg hover:bg-green-600/30">{T.import_json}</button>
          <button onClick={handleNew} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg flex items-center gap-1"><Plus size={12} /> {T.create}</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Brand list */}
        <div className="w-full md:w-[260px] border-b md:border-b-0 md:border-r border-gray-800 overflow-x-auto md:overflow-y-auto p-3 flex md:flex-col gap-1.5 md:space-y-0 shrink-0 max-h-[120px] md:max-h-none">
          {brands.map((b) => (
            <button key={b.brand_id} onClick={() => setEditing({ ...b, logos: b.logos || [] })} className={`shrink-0 md:w-full text-left p-3 rounded-xl border transition ${editing?.brand_id === b.brand_id ? "bg-gray-800/80 border-amber-500/40 ring-1 ring-amber-500/20" : "bg-gray-900/30 border-gray-800/50 hover:border-gray-700 hover:bg-gray-900/50"}`}>
              <div className="flex items-center gap-2.5">
                {b.logo ? <img src={b.logo} className="h-10 w-10 rounded-lg bg-white p-0.5 object-contain" alt="" /> : <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">{b.brand_name?.[0]}</div>}
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.brand_name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{b.tagline}</div>
                  <div className="flex gap-1 mt-1">{[b.color_primary, b.color_secondary, b.color_accent].map((c, i) => <div key={i} className="w-3 h-3 rounded-full border border-gray-700" style={{ background: c }} />)}</div>
                </div>
              </div>
            </button>
          ))}
          {brands.length === 0 && <p className="text-xs text-gray-600 text-center py-8">No brands yet</p>}
        </div>

        {/* Right: Editor */}
        <div className="flex-1 overflow-y-auto">
          {editing ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Identity Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><Type size={14} /> Identity</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Brand ID</label>
                    <input value={editing.brand_id} onChange={(e) => setEditing({ ...editing, brand_id: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Brand Name</label>
                    <input value={editing.brand_name} onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Tagline</label>
                    <input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Industry</label>
                    <input value={editing.industry} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                  </div>
                </div>
              </section>

              {/* Voice & Audience */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><Target size={14} /> Voice & Audience</div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">Tone</label>
                  <input value={editing.tone} onChange={(e) => setEditing({ ...editing, tone: e.target.value })} placeholder="e.g., Professional, trustworthy, approachable" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">Target Audience</label>
                  <input value={editing.target_audience} onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">Font Style</label>
                  <input value={editing.font_style} onChange={(e) => setEditing({ ...editing, font_style: e.target.value })} placeholder="e.g., Elegant serif headlines, clean sans-serif body" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500/30 outline-none" />
                </div>
              </section>

              {/* Colors */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><Palette size={14} /> Colors</div>
                <div className="flex gap-6">
                  {[
                    { key: "color_primary" as const, label: "Primary" },
                    { key: "color_secondary" as const, label: "Secondary" },
                    { key: "color_accent" as const, label: "Accent" },
                  ].map((c) => (
                    <div key={c.key} className="flex items-center gap-2.5">
                      <input type="color" value={editing[c.key]} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-700" />
                      <div>
                        <div className="text-[10px] text-gray-500">{c.label}</div>
                        <div className="text-xs text-gray-300 font-mono">{editing[c.key]}</div>
                      </div>
                    </div>
                  ))}
                  {/* Preview swatch */}
                  <div className="ml-auto flex items-center">
                    <div className="w-20 h-10 rounded-lg overflow-hidden flex">
                      <div className="flex-1" style={{ background: editing.color_primary }} />
                      <div className="flex-1" style={{ background: editing.color_secondary }} />
                      <div className="flex-1" style={{ background: editing.color_accent }} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Logos */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><ImageIcon size={14} /> Logos</div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="flex gap-3 flex-wrap">
                    {/* Primary logo */}
                    {editing.logo && (
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-lg bg-white p-1 border-2 border-amber-500/50">
                          <img src={editing.logo} className="w-full h-full object-contain" alt="Primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white px-1 rounded font-medium">Primary</div>
                      </div>
                    )}
                    {/* Logo variants */}
                    {(editing.logos || []).map((l, i) => (
                      <div key={l.id} className="relative group">
                        <div className="w-20 h-20 rounded-lg bg-white p-1 border border-gray-700 hover:border-gray-500 transition">
                          <img src={l.url} className="w-full h-full object-contain" alt={l.label} />
                        </div>
                        <input value={l.label} onChange={(e) => { const logos = [...(editing.logos || [])]; logos[i] = { ...l, label: e.target.value }; setEditing({ ...editing, logos }); }} placeholder="Label" className="w-20 mt-1 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[9px] text-white text-center" />
                        <button onClick={() => setEditing({ ...editing, logos: (editing.logos || []).filter((_, j) => j !== i) })} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition">x</button>
                      </div>
                    ))}
                    {/* Upload buttons */}
                    <div className="flex flex-col gap-1.5">
                      <label className="w-20 h-9 rounded-lg border border-dashed border-gray-700 hover:border-amber-500/50 flex items-center justify-center cursor-pointer transition">
                        <span className="text-[9px] text-gray-500">{uploading ? "..." : editing.logo ? "+ Variant" : "+ Primary"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const url = await handleUploadAsset(f, "logo", `logo-${Date.now()}`);
                          if (!editing.logo) { setEditing({ ...editing, logo: url }); }
                          else { setEditing({ ...editing, logos: [...(editing.logos || []), { id: `logo-${Date.now()}`, url, label: "" }] }); }
                        }} />
                      </label>
                      <label className="w-20 h-9 rounded-lg border border-dashed border-gray-700 hover:border-blue-500/50 flex items-center justify-center cursor-pointer transition">
                        <span className="text-[9px] text-gray-500">Multi +</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                          if (!e.target.files?.length) return;
                          await handleUploadMultiple(e.target.files, "logo", (urls) => {
                            const newLogos: LogoVariant[] = urls.map((url, i) => ({ id: `logo-${Date.now()}-${i}`, url, label: "" }));
                            if (!editing.logo && newLogos.length > 0) {
                              setEditing({ ...editing, logo: newLogos[0].url, logos: [...(editing.logos || []), ...newLogos.slice(1)] });
                            } else {
                              setEditing({ ...editing, logos: [...(editing.logos || []), ...newLogos] });
                            }
                          });
                          e.target.value = "";
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Models */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><Users size={14} /> Models ({editing.models.length})</div>
                  <button onClick={() => setEditing({ ...editing, models: [...editing.models, { id: `model-${Date.now()}`, name: "", photo: "", description: "" }] })} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={10} /> Add Model</button>
                </div>
                <div className="space-y-2">
                  {editing.models.map((m, i) => (
                    <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 flex gap-3 group hover:border-gray-700 transition">
                      {/* Photo */}
                      <div className="shrink-0">
                        {m.photo ? (
                          <div className="relative">
                            <img src={m.photo} className="w-16 h-16 rounded-lg object-cover" alt="" />
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer">
                              <Upload size={14} className="text-white" />
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                const url = await handleUploadAsset(f, "models", m.id || `model-${i}`);
                                const models = [...editing.models]; models[i] = { ...m, photo: url }; setEditing({ ...editing, models });
                              }} />
                            </label>
                          </div>
                        ) : (
                          <label className="w-16 h-16 rounded-lg border border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition">
                            <Upload size={16} className="text-gray-600" />
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const url = await handleUploadAsset(f, "models", m.id || `model-${i}`);
                              const models = [...editing.models]; models[i] = { ...m, photo: url }; setEditing({ ...editing, models });
                            }} />
                          </label>
                        )}
                      </div>
                      {/* Fields */}
                      <div className="flex-1 space-y-1.5">
                        <input value={m.name} onChange={(e) => { const models = [...editing.models]; models[i] = { ...m, name: e.target.value }; setEditing({ ...editing, models }); }} placeholder="Model name" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/30 outline-none" />
                        <input value={m.description} onChange={(e) => { const models = [...editing.models]; models[i] = { ...m, description: e.target.value }; setEditing({ ...editing, models }); }} placeholder="Description (e.g., Managing Partner, professional headshot)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:ring-2 focus:ring-blue-500/30 outline-none" />
                      </div>
                      <button onClick={() => setEditing({ ...editing, models: editing.models.filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400 transition self-start p-1"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {editing.models.length === 0 && <p className="text-xs text-gray-600 text-center py-3">No models added. Models are people featured in banner images.</p>}
                </div>
              </section>

              {/* References */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><ImageIcon size={14} /> References ({editing.references.length})</div>
                  <label className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                    <Plus size={10} /> Upload
                    <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      await handleUploadMultiple(e.target.files, "references", (urls) => {
                        const newRefs = urls.map((url, i) => ({ id: `ref-${Date.now()}-${i}`, path: url, description: "" }));
                        setEditing({ ...editing, references: [...editing.references, ...newRefs] });
                      });
                      e.target.value = "";
                    }} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {editing.references.map((r, i) => (
                    <div key={i} className="relative group">
                      <img src={r.path} className="w-full aspect-square rounded-lg object-cover border border-gray-700" alt="" />
                      <input value={r.description} onChange={(e) => { const refs = [...editing.references]; refs[i] = { ...r, description: e.target.value }; setEditing({ ...editing, references: refs }); }} placeholder="Description" className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[9px] text-white" />
                      <button onClick={() => setEditing({ ...editing, references: editing.references.filter((_, j) => j !== i) })} className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 text-white rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition">x</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Sample posts */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"><Type size={14} /> {T.brand_sample_posts} ({editing.sample_posts?.length || 0})</div>
                  <button onClick={() => setEditing({ ...editing, sample_posts: [...(editing.sample_posts || []), { id: `sample-${Date.now()}`, label: "", text: "" }] })} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus size={10} /> {T.add_sample_post}</button>
                </div>
                <p className="text-[10px] text-gray-600">Dán nội dung bài FB thật để AI Composer học cách viết (cấu trúc, emoji, khối liên hệ).</p>
                <div className="space-y-2">
                  {(editing.sample_posts || []).map((s, i) => (
                    <div key={s.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2 group hover:border-gray-700 transition">
                      <div className="flex items-center gap-2">
                        <input value={s.label} onChange={(e) => { const samples = [...(editing.sample_posts || [])]; samples[i] = { ...s, label: e.target.value }; setEditing({ ...editing, sample_posts: samples }); }} placeholder={T.sample_label_placeholder} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-purple-500/30 outline-none" />
                        <button onClick={() => setEditing({ ...editing, sample_posts: (editing.sample_posts || []).filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400 transition p-1"><Trash2 size={12} /></button>
                      </div>
                      <textarea value={s.text} onChange={(e) => { const samples = [...(editing.sample_posts || [])]; samples[i] = { ...s, text: e.target.value }; setEditing({ ...editing, sample_posts: samples }); }} rows={5} placeholder={T.sample_text_placeholder} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 font-mono resize-y outline-none focus:border-purple-500/50 leading-relaxed" />
                    </div>
                  ))}
                  {(editing.sample_posts?.length || 0) === 0 && <p className="text-xs text-gray-600 text-center py-3">Chưa có bài mẫu. Thêm 1-2 bài để AI Composer bắt chước phong cách.</p>}
                </div>
              </section>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-sm disabled:bg-gray-700 transition">
                  {saving ? T.saving : T.save_brand}
                </button>
                {msg && <span className={`text-sm ${msg === "Saved!" ? "text-green-400" : "text-red-400"}`}>{msg}</span>}
                <button onClick={handleDelete} className="ml-auto px-3 py-2 text-gray-600 hover:text-red-400 text-xs transition flex items-center gap-1"><Trash2 size={12} /> {T.delete_brand}</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center"><Palette size={24} className="text-gray-600" /></div>
              <p className="text-sm">Select a brand or create a new one</p>
              <button onClick={handleNew} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg flex items-center gap-1"><Plus size={12} /> New Brand</button>
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportJsonModal
          title="Import Brand JSON"
          description="Paste a brand configuration JSON from an AI agent."
          placeholder='{"brand_id": "my-brand", "brand_name": "My Brand", ...}'
          validate={(data) => {
            const d = data as Record<string, unknown>;
            if (!d.brand_id || !d.brand_name) return "JSON needs brand_id and brand_name";
            return null;
          }}
          onImport={(data) => { setEditing({ ...EMPTY_BRAND, ...(data as BrandConfig) }); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
