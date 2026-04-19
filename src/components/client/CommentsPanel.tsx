"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Send, MoreHorizontal, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import type { PostComment } from "@/lib/fb-specs";

type ApiBase = "/api/client-comments" | "/api/posts/comments";

type Props = {
  postId: string;
  apiBase: ApiBase;
  myRole: "client" | "creator";
  myName?: string;
};

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
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

function initialsOf(name: string | null | undefined, fallback: string): string {
  const base = name?.trim() || fallback;
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorForAuthor(role: "client" | "creator"): string {
  return role === "client" ? "bg-amber-500" : "bg-blue-600";
}

export default function CommentsPanel({ postId, apiBase, myRole, myName }: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // close menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    if (openMenu) document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [openMenu]);

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
        await api(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId, text: text.trim() }) });
      } else {
        await api(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", post_id: postId, body: text.trim(), author_name: myName || "Team" }) });
      }
      setText("");
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setSending(false); }
  };

  const beginEdit = (c: PostComment) => {
    setEditingId(c.id);
    setEditText(c.body);
    setOpenMenu(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (c: PostComment) => {
    if (!editText.trim()) return;
    setError(null);
    try {
      if (apiBase === "/api/client-comments") {
        await api(apiBase, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, text: editText.trim() }) });
      } else {
        await api(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", id: c.id, body: editText.trim() }) });
      }
      cancelEdit();
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (c: PostComment) => {
    if (!confirm("Xóa bình luận này?")) return;
    setOpenMenu(null);
    setError(null);
    try {
      if (apiBase === "/api/client-comments") {
        await api(apiBase, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      } else {
        await api(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: c.id }) });
      }
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-200">Bình luận</span>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{comments.length}</span>
      </div>

      <div className="p-4 space-y-4">
        {loading && <div className="text-xs text-gray-600">Đang tải...</div>}
        {!loading && comments.length === 0 && (
          <div className="text-center text-xs text-gray-600 py-4">
            Chưa có bình luận. Hãy để lại phản hồi đầu tiên.
          </div>
        )}

        {comments.map((c) => {
          const isMine = c.author_role === myRole;
          const isEditing = editingId === c.id;
          const nameDisplay = c.author_name || (c.author_role === "client" ? "Khách" : "Team");
          return (
            <div key={c.id} className="flex items-start gap-2.5 group">
              <div className={`w-8 h-8 rounded-full ${colorForAuthor(c.author_role)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                {initialsOf(c.author_name, c.author_role === "client" ? "K" : "T")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-800/70 border border-gray-700/50 rounded-2xl px-3 py-2 relative">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-gray-200">{nameDisplay}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.author_role === "client" ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-300"}`}>
                      {c.author_role === "client" ? "Khách" : "Team"}
                    </span>
                    {isMine && !isEditing && (
                      <div className="ml-auto relative" ref={openMenu === c.id ? menuRef : null}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? null : c.id); }}
                          className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition p-1"
                          aria-label="Tùy chọn"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenu === c.id && (
                          <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 py-1 w-32">
                            <button onClick={() => beginEdit(c)} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                              <Pencil size={11} /> Sửa
                            </button>
                            <button onClick={() => handleDelete(c)} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-gray-800 flex items-center gap-2">
                              <Trash2 size={11} /> Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white resize-y outline-none focus:border-blue-500/50"
                      />
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit(c)} disabled={!editText.trim()} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[10px] rounded flex items-center gap-1">
                          <Check size={10} /> Lưu
                        </button>
                        <button onClick={cancelEdit} className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded flex items-center gap-1">
                          <XIcon size={10} /> Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">{c.body}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-2 pt-1 text-[10px] text-gray-500">
                  <span>{formatRelative(c.created_at)}</span>
                  {c.edited_at && <span className="italic">· đã sửa</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="px-4 py-2 text-[11px] text-red-400 bg-red-500/10 border-t border-red-500/20">{error}</div>}

      {/* Composer */}
      <div className="border-t border-gray-800 p-3 flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-full ${colorForAuthor(myRole)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
          {initialsOf(myName, myRole === "client" ? "K" : "T")}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend(); }}
            rows={2}
            placeholder="Viết bình luận..."
            className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none outline-none focus:border-blue-500/50"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-600">Ctrl/⌘ + Enter để gửi</span>
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs font-medium rounded-full flex items-center gap-1.5"
            >
              <Send size={11} />
              {sending ? "Đang gửi..." : "Gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
