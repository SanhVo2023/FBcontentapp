"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { PostComment } from "@/lib/fb-specs";

type Props = {
  postId: string;
  // Which API prefix to use: "/api/client-comments" for clients or "/api/posts/comments" for creators
  apiBase: "/api/client-comments" | "/api/posts/comments";
  // Display label for the sender side when role matches
  myRole: "client" | "creator";
  myName?: string;
};

async function api(url: string, body?: unknown, method: "GET" | "POST" = body ? "POST" : "GET") {
  const opts: RequestInit = body
    ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { method };
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} ngày`;
  return d.toLocaleDateString("vi-VN");
}

export default function CommentsPanel({ postId, apiBase, myRole, myName }: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api(`${apiBase}?post_id=${postId}`);
      setComments(r.comments || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setLoading(false); }
  }, [postId, apiBase]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true); setError(null);
    try {
      if (apiBase === "/api/client-comments") {
        await api(apiBase, { post_id: postId, text: text.trim() });
      } else {
        await api(apiBase, { action: "create", post_id: postId, body: text.trim(), author_name: myName || "Creator" });
      }
      setText("");
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setSending(false); }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-300">Bình luận ({comments.length})</span>
      </div>

      <div className="max-h-80 overflow-y-auto p-3 space-y-2">
        {loading && <div className="text-xs text-gray-600">Đang tải...</div>}
        {!loading && comments.length === 0 && <div className="text-xs text-gray-600 text-center py-4">Chưa có bình luận</div>}
        {comments.map((c) => {
          const mine = c.author_role === myRole;
          return (
            <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.author_role === "client" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>
                    {c.author_role === "client" ? "Khách" : "Team"}
                  </span>
                  {c.author_name && <span className="text-[10px] text-gray-500">{c.author_name}</span>}
                  <span className="text-[10px] text-gray-600">{formatRelative(c.created_at)}</span>
                </div>
                <div className={`text-xs px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${mine ? "bg-blue-600/20 text-blue-100 border border-blue-500/20" : "bg-gray-800/70 text-gray-200 border border-gray-700"}`}>
                  {c.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="px-3 py-2 text-[11px] text-red-400 bg-red-500/10">{error}</div>}

      <div className="border-t border-gray-800 p-2.5 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend(); }}
          rows={2}
          placeholder="Nhập bình luận..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 resize-none outline-none focus:border-blue-500/50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <Send size={12} />
          Gửi
        </button>
      </div>
    </div>
  );
}
