"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MessageSquare, Image as ImageIcon } from "lucide-react";
import type { PostConfig } from "@/lib/fb-specs";

type ClientPostsResponse = {
  posts: PostConfig[];
  thumbnails: Record<string, string>;
  comment_counts: Record<string, number>;
};

const COLS = [
  { key: "pending", label: "⏳ Chờ duyệt", color: "amber" },
  { key: "approved", label: "✓ Đã duyệt", color: "green" },
  { key: "revision", label: "⚠️ Cần sửa", color: "red" },
] as const;

function bucketOf(post: PostConfig): "pending" | "approved" | "revision" {
  const vt = post.client_verify_text || "pending";
  const vi = post.client_verify_image || "pending";
  if (vt === "approved" && vi === "approved") return "approved";
  if (vt === "rejected" || vi === "rejected" || vt === "revise" || vi === "revise") return "revision";
  return "pending";
}

export default function ClientDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client-posts")
      .then(async (r) => {
        if (r.status === 401) { router.replace("/client"); return null; }
        return r.json();
      })
      .then((data: ClientPostsResponse | null) => {
        if (!data) return;
        setPosts(data.posts || []);
        setThumbs(data.thumbnails || {});
        setCounts(data.comment_counts || {});
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/client-auth", { method: "DELETE" });
    router.push("/client");
  };

  const grouped = { pending: [] as PostConfig[], approved: [] as PostConfig[], revision: [] as PostConfig[] };
  for (const p of posts) grouped[bucketOf(p)].push(p);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10 backdrop-blur">
        <h1 className="text-sm font-bold text-white">📘 Duyệt nội dung</h1>
        <span className="text-[11px] text-gray-500 hidden sm:inline">{posts.length} bài</span>
        <button onClick={handleLogout} className="ml-auto text-gray-500 hover:text-red-400 text-xs flex items-center gap-1"><LogOut size={12} /> Đăng xuất</button>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">{error}</div>}
      {loading && <div className="p-8 text-center text-gray-500 text-sm">Đang tải...</div>}

      {!loading && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {COLS.map((col) => {
            const items = grouped[col.key];
            return (
              <div key={col.key} className="flex flex-col min-h-[300px]">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm font-semibold text-gray-200">{col.label}</span>
                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="bg-gray-900/30 rounded-xl p-2 space-y-2 flex-1">
                  {items.length === 0 && <p className="text-[11px] text-gray-600 text-center py-6">—</p>}
                  {items.map((p) => {
                    const thumb = thumbs[p.id];
                    const count = counts[p.id] || 0;
                    const lang = p.language === "en" ? "en" : "vi";
                    const caption = lang === "en" ? (p.caption_en || p.caption_vi) : (p.caption_vi || p.caption_en);
                    return (
                      <Link key={p.id} href={`/client/post/${p.id}`} className="block bg-gray-900/80 border border-gray-800 rounded-lg p-3 hover:border-blue-500/40 hover:bg-gray-900 transition">
                        <div className="flex items-start gap-3">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gray-800 flex items-center justify-center shrink-0"><ImageIcon size={20} className="text-gray-700" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white line-clamp-1">{p.title || "Chưa có tiêu đề"}</div>
                            {caption && <div className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{caption}</div>}
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                              {p.scheduled_date && <span>{p.scheduled_date}</span>}
                              {count > 0 && <span className="flex items-center gap-0.5"><MessageSquare size={10} />{count}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
