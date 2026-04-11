"use client";

import { useState, useEffect } from "react";
import type { BrandConfig } from "@/lib/fb-specs";
import ImportJsonModal from "@/components/ImportJsonModal";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

const EMPTY_BRAND: BrandConfig = {
  brand_id: "", brand_name: "", tagline: "", logo: "",
  color_primary: "#1a1a2e", color_secondary: "#c5a55a", color_accent: "#ffffff",
  font_style: "", models: [], references: [],
  tone: "", industry: "", target_audience: "",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [editing, setEditing] = useState<BrandConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { api("/api/brands").then((b: BrandConfig[]) => setBrands(b)); }, []);

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

  const handleUploadAsset = async (file: File, assetType: string, filename: string) => {
    if (!editing) return "";
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    const data = await api("/api/brand-asset/upload", { imageBase64: base64, brand_id: editing.brand_id, asset_type: assetType, filename, content_type: file.type });
    return data.url as string;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Brands</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-green-600/20 text-green-400 text-xs rounded-lg hover:bg-green-600/30">Import JSON</button>
          <button onClick={handleNew} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg">+ New Brand</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Brand list */}
        <div className="w-[280px] border-r border-gray-800 overflow-y-auto p-3 space-y-2">
          {brands.map((b) => (
            <button key={b.brand_id} onClick={() => setEditing({ ...b })} className={`w-full text-left p-3 rounded-lg border transition ${editing?.brand_id === b.brand_id ? "bg-gray-800 border-amber-500/40" : "bg-gray-900/50 border-gray-800/50 hover:border-gray-700"}`}>
              <div className="flex items-center gap-2">
                {b.logo ? <img src={b.logo} className="h-8 w-8 rounded bg-white p-0.5 object-contain" /> : <div className="h-8 w-8 rounded bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600">{b.brand_name[0]}</div>}
                <div><div className="text-sm font-medium">{b.brand_name}</div><div className="text-[10px] text-gray-500">{b.tagline}</div></div>
              </div>
            </button>
          ))}
          {brands.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No brands yet</p>}
        </div>

        {/* Right: Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {editing ? (
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500">Brand ID</label><input value={editing.brand_id} onChange={(e) => setEditing({ ...editing, brand_id: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-gray-500">Brand Name</label><input value={editing.brand_name} onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-gray-500">Tagline</label><input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-gray-500">Industry</label><input value={editing.industry} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
              </div>

              <div><label className="text-xs text-gray-500">Tone</label><input value={editing.tone} onChange={(e) => setEditing({ ...editing, tone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
              <div><label className="text-xs text-gray-500">Target Audience</label><input value={editing.target_audience} onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>
              <div><label className="text-xs text-gray-500">Font Style</label><input value={editing.font_style} onChange={(e) => setEditing({ ...editing, font_style: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white" /></div>

              {/* Colors */}
              <div className="flex gap-4">
                <div><label className="text-xs text-gray-500">Primary</label><div className="flex gap-2 items-center"><input type="color" value={editing.color_primary} onChange={(e) => setEditing({ ...editing, color_primary: e.target.value })} className="w-10 h-10 rounded cursor-pointer" /><span className="text-xs text-gray-400">{editing.color_primary}</span></div></div>
                <div><label className="text-xs text-gray-500">Secondary</label><div className="flex gap-2 items-center"><input type="color" value={editing.color_secondary} onChange={(e) => setEditing({ ...editing, color_secondary: e.target.value })} className="w-10 h-10 rounded cursor-pointer" /><span className="text-xs text-gray-400">{editing.color_secondary}</span></div></div>
                <div><label className="text-xs text-gray-500">Accent</label><div className="flex gap-2 items-center"><input type="color" value={editing.color_accent} onChange={(e) => setEditing({ ...editing, color_accent: e.target.value })} className="w-10 h-10 rounded cursor-pointer" /><span className="text-xs text-gray-400">{editing.color_accent}</span></div></div>
              </div>

              {/* Logo */}
              <div>
                <label className="text-xs text-gray-500">Logo</label>
                <div className="flex items-center gap-3 mt-1">
                  {editing.logo && <img src={editing.logo} className="h-12 rounded bg-white p-1" />}
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await handleUploadAsset(f, "logo", "logo");
                    setEditing({ ...editing, logo: url });
                  }} className="text-xs text-gray-400" />
                </div>
              </div>

              {/* Models */}
              <div>
                <div className="flex items-center justify-between"><label className="text-xs text-gray-500">Models</label>
                  <button onClick={() => setEditing({ ...editing, models: [...editing.models, { id: `model-${Date.now()}`, name: "", photo: "", description: "" }] })} className="text-[10px] text-blue-400">+ Add</button>
                </div>
                {editing.models.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 mt-2 bg-gray-900 rounded-lg p-2">
                    {m.photo && <img src={m.photo} className="w-10 h-10 rounded-full object-cover" />}
                    <input value={m.name} onChange={(e) => { const models = [...editing.models]; models[i] = { ...m, name: e.target.value }; setEditing({ ...editing, models }); }} placeholder="Name" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await handleUploadAsset(f, "models", m.id || `model-${i}`);
                      const models = [...editing.models]; models[i] = { ...m, photo: url }; setEditing({ ...editing, models });
                    }} className="text-[10px] text-gray-400 w-24" />
                    <button onClick={() => setEditing({ ...editing, models: editing.models.filter((_, j) => j !== i) })} className="text-red-400 text-xs">X</button>
                  </div>
                ))}
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-sm disabled:bg-gray-700">{saving ? "Saving..." : "Save Brand"}</button>
                {msg && <span className={`text-sm ${msg === "Saved!" ? "text-green-400" : "text-red-400"}`}>{msg}</span>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">Select a brand or create a new one</div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportJsonModal
          title="Import Brand JSON"
          description="Paste a brand configuration JSON from an AI agent."
          placeholder='{"brand_id": "my-brand", "brand_name": "My Brand", "tagline": "...", ...}'
          validate={(data) => {
            const d = data as Record<string, unknown>;
            if (!d.brand_id || !d.brand_name) return "JSON needs brand_id and brand_name";
            return null;
          }}
          onImport={(data) => {
            setEditing(data as BrandConfig);
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
