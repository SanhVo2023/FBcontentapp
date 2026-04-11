"use client";

import { useState, useEffect } from "react";
import type { PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES } from "@/lib/fb-specs";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function timeRemaining(trashedAt: string): { text: string; expired: boolean } {
  const expiry = new Date(trashedAt).getTime() + 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now >= expiry) return { text: "Expired", expired: true };
  const remaining = expiry - now;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return { text: `${hours}h ${minutes}m remaining`, expired: false };
}

export default function TrashPage() {
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/trash").then((data) => {
      setPosts(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRestore = async (postId: string) => {
    await api("/api/trash", { action: "restore", post_id: postId });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePermanentDelete = async (postId: string) => {
    await api("/api/trash", { action: "permanent_delete", post_id: postId });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="text-base font-bold">Trash</h1>
        <span className="text-xs text-gray-500">{posts.length} trashed items</span>
      </div>

      <div className="flex-1 overflow-y-auto"><div className="max-w-4xl mx-auto w-full p-6">
        {loading ? (
          <div className="text-center text-gray-600 py-12">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <div className="text-4xl mb-3">🗑️</div>
            <p>Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const timer = post.trashed_at ? timeRemaining(post.trashed_at) : null;
              const ct = CONTENT_TYPES.find((c) => c.value === post.content_type);
              return (
                <div key={post.id} className={`flex items-center gap-3 bg-gray-900/70 border border-gray-800/50 rounded-lg px-4 py-3 ${timer?.expired ? "opacity-50" : ""}`}>
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm">{ct?.emoji || "📝"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{post.title || "Untitled"}</div>
                    <div className="text-[10px] text-gray-500">{post.topic || post.caption_vi?.slice(0, 50)}</div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div className={`text-[10px] ${timer?.expired ? "text-red-400" : "text-yellow-400"}`}>{timer?.text || "No timestamp"}</div>
                    <button onClick={() => handleRestore(post.id)} className="px-3 py-1 rounded text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">Restore</button>
                    <button onClick={() => handlePermanentDelete(post.id)} className="px-3 py-1 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div></div>
    </div>
  );
}
