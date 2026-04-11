"use client";

import { useState, useEffect } from "react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { FB_POST_TYPES, FB_STYLES, getPostSpec } from "@/lib/fb-specs";
import ImportJsonModal from "@/components/ImportJsonModal";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function BatchPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PostConfig | null>(null);
  const [log, setLog] = useState<Array<{ msg: string; type: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { api("/api/brands").then((b: BrandConfig[]) => { setBrands(b); if (b.length) { setBrand(b[0]); loadPosts(b[0].brand_id); } }); }, []);

  const loadPosts = async (brandId: string) => {
    try { const p = await api(`/api/posts?brand=${brandId}`); setPosts(Array.isArray(p) ? p : []); } catch { setPosts([]); }
  };

  const addLog = (msg: string, type = "info") => setLog((p) => [{ msg, type }, ...p]);
  const toggleSelect = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const updatePost = (id: string, updates: Partial<PostConfig>) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));

  const handleGenerate = async (id: string) => {
    if (!brand) return;
    setProcessing((p) => new Set([...p, id]));
    const post = posts.find((p) => p.id === id); if (!post) return;
    try {
      const data = await api("/api/generate", { post, brand, testMode: false });
      updatePost(id, { preview: data.imageBase64, status: "generated" });
      addLog(`${id}: Generated`, "ok");
    } catch (e: unknown) { addLog(`${id}: ${e instanceof Error ? e.message : "Failed"}`, "error"); }
    finally { setProcessing((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const handleUpload = async (id: string) => {
    if (!brand) return;
    const post = posts.find((p) => p.id === id); if (!post?.preview) return;
    setProcessing((p) => new Set([...p, id]));
    try {
      const data = await api("/api/upload", { imageBase64: post.preview, brand: brand.brand_id, postId: post.id, title: post.title, type: post.type, prompt: post.prompt });
      updatePost(id, { drive_url: data.drive_url, result_url: data.r2_url, status: "uploaded" });
      addLog(`${id}: Uploaded`, "ok");
    } catch (e: unknown) { addLog(`${id}: ${e instanceof Error ? e.message : "Failed"}`, "error"); }
    finally { setProcessing((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const handleGenerateAll = async () => {
    if (!brand || selected.size === 0) return;
    setGenerating(true);
    addLog(`Generating ${selected.size} banners...`);
    const ids = Array.from(selected);
    for (let i = 0; i < ids.length; i += 3) {
      const batch = ids.slice(i, i + 3);
      setProcessing(new Set(batch));
      await Promise.allSettled(batch.map((id) => handleGenerate(id)));
    }
    setGenerating(false); setProcessing(new Set());
  };

  const handleSave = async () => {
    if (!brand) return;
    try { await api("/api/posts", { action: "save", brand: brand.brand_id, posts }); addLog("Saved to Sheet", "ok"); } catch (e: unknown) { addLog(`Save failed: ${e instanceof Error ? e.message : ""}`, "error"); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Batch Mode</h1>
        <select value={brand?.brand_id || ""} onChange={(e) => { const b = brands.find((x) => x.brand_id === e.target.value); if (b) { setBrand(b); loadPosts(b.brand_id); } }} className="ml-4 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-3 py-1.5 bg-green-600/20 text-green-400 text-xs rounded hover:bg-green-600/30">Import JSON</button>
          <button onClick={handleSave} className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700">Save to Sheet</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={posts.length > 0 && posts.every((p) => selected.has(p.id))} onChange={(e) => e.target.checked ? setSelected(new Set(posts.map((p) => p.id))) : setSelected(new Set())} className="accent-blue-500 w-3.5 h-3.5" />
              All ({posts.length})
            </label>
            {selected.size > 0 && (
              <>
                <span className="text-xs text-blue-400 ml-2">{selected.size} selected</span>
                <button onClick={handleGenerateAll} disabled={generating} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded disabled:bg-gray-700">{generating ? "Generating..." : `Generate ${selected.size}`}</button>
              </>
            )}
            {error && <span className="text-xs text-red-400 ml-2">{error}</span>}
          </div>

          {/* Posts */}
          <div className="p-3 space-y-2">
            {posts.length === 0 && <div className="text-center text-gray-600 py-12">No posts for this brand. Create posts in Google Sheet or add via the app.</div>}
            {posts.map((post) => {
              const spec = getPostSpec(post.type);
              const isProc = processing.has(post.id);
              const hasImg = !!post.preview;
              return (
                <div key={post.id} className={`bg-gray-900/70 border rounded-lg overflow-hidden ${selected.has(post.id) ? "border-blue-500/40" : "border-gray-800/50"} ${isProc ? "animate-pulse opacity-70" : ""}`}>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <input type="checkbox" checked={selected.has(post.id)} onChange={() => toggleSelect(post.id)} className="accent-blue-500 w-4 h-4 shrink-0" />
                    <div onClick={hasImg ? () => setLightbox(post) : undefined} className={`w-16 h-16 bg-gray-800 rounded overflow-hidden shrink-0 flex items-center justify-center ${hasImg ? "cursor-zoom-in hover:ring-2 hover:ring-blue-500/50" : ""}`}>
                      {post.preview ? <img src={`data:image/png;base64,${post.preview}`} className="w-full h-full object-cover" /> : <span className="text-gray-700 text-[8px]">{spec.width}x{spec.height}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5"><span className="text-xs font-medium truncate">{post.title}</span><span className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-500">{spec.label}</span></div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{post.prompt?.slice(0, 70)}</div>
                      <div className="flex gap-2 text-[10px] mt-0.5">{post.use_model && <span className="text-blue-400/70">Model: {post.use_model}</span>}{post.text_overlay?.headline && <span className="text-yellow-400/60">"{post.text_overlay.headline}"</span>}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleGenerate(post.id)} disabled={isProc} className="px-3 py-1.5 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700">{hasImg ? "Regen" : "Generate"}</button>
                      <button onClick={() => setEditing(editing === post.id ? null : post.id)} className={`px-2 py-1.5 rounded text-[11px] ${editing === post.id ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>Edit</button>
                      {hasImg && <button onClick={() => handleUpload(post.id)} disabled={isProc} className="px-3 py-1.5 rounded text-[11px] bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700">Upload</button>}
                      {post.drive_url && <a href={post.drive_url} target="_blank" rel="noreferrer" className="px-2 py-1.5 rounded text-[11px] bg-gray-800 text-green-400">Drive</a>}
                    </div>
                  </div>
                  {editing === post.id && (
                    <div className="border-t border-gray-800 px-3 py-3 bg-gray-900/30 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-gray-500">Prompt</label><textarea value={post.prompt} onChange={(e) => updatePost(post.id, { prompt: e.target.value })} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white resize-none" /></div>
                        <div className="space-y-1.5">
                          <div><label className="text-[10px] text-gray-500">Headline</label><input value={post.text_overlay?.headline || ""} onChange={(e) => updatePost(post.id, { text_overlay: { ...post.text_overlay, headline: e.target.value } })} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                          <div><label className="text-[10px] text-gray-500">Subline</label><input value={post.text_overlay?.subline || ""} onChange={(e) => updatePost(post.id, { text_overlay: { ...post.text_overlay, subline: e.target.value } })} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                          <div><label className="text-[10px] text-gray-500">CTA</label><input value={post.text_overlay?.cta || ""} onChange={(e) => updatePost(post.id, { text_overlay: { ...post.text_overlay, cta: e.target.value } })} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <select value={post.type} onChange={(e) => updatePost(post.id, { type: e.target.value as PostConfig["type"] })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">{FB_POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                        <select value={post.style} onChange={(e) => updatePost(post.id, { style: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">{FB_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                        <select value={post.use_model || ""} onChange={(e) => updatePost(post.id, { use_model: e.target.value || null })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"><option value="">No model</option>{brand?.models?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                        <button onClick={() => setEditing(null)} className="px-3 py-1 rounded text-xs bg-green-500/20 text-green-400">Done</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Log */}
        <div className="w-[220px] border-l border-gray-800 overflow-y-auto p-3">
          <h2 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Log</h2>
          {log.map((l, i) => (
            <div key={i} className={`text-[11px] px-2 py-1 rounded mb-0.5 ${l.type === "error" ? "bg-red-500/10 text-red-400" : l.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-gray-800/50 text-gray-400"}`}>{l.msg}</div>
          ))}
        </div>
      </div>

      {showImport && (
        <ImportJsonModal
          title="Import Posts JSON"
          description="Paste a JSON array of posts from an AI agent. Use the AI Templates page to generate the correct format."
          placeholder='[{"id": "post-001", "title": "...", "type": "feed-square", "prompt": "...", "style": "professional", "status": "pending"}]'
          validate={(data) => {
            if (!Array.isArray(data)) return "Expected a JSON array of posts";
            if (data.length === 0) return "Array is empty";
            if (!data[0].id || !data[0].prompt) return "Each post needs at least 'id' and 'prompt'";
            return null;
          }}
          onImport={(data) => {
            const imported = (data as PostConfig[]).map((p) => ({ ...p, status: p.status || "pending" }));
            setPosts((prev) => [...prev, ...imported]);
            addLog(`Imported ${imported.length} posts`, "ok");
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {lightbox && lightbox.preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-lg shadow-2xl max-w-[540px] w-full overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{brand?.brand_name?.[0]}</div><div><div className="text-sm font-semibold text-gray-900">{brand?.brand_name}</div><div className="text-xs text-gray-500">Sponsored</div></div></div>
              <img src={`data:image/png;base64,${lightbox.preview}`} className="w-full" />
              <div className="px-4 py-2 border-t border-gray-200 flex justify-around text-gray-500 text-xs"><span>Like</span><span>Comment</span><span>Share</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { handleGenerate(lightbox.id); setLightbox(null); }} className="px-4 py-2 rounded bg-blue-600 text-white text-sm">Regenerate</button>
              <button onClick={() => { handleUpload(lightbox.id); setLightbox(null); }} className="px-4 py-2 rounded bg-green-600 text-white text-sm">Upload</button>
              <button onClick={() => setLightbox(null)} className="px-4 py-2 rounded bg-gray-700 text-white text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
