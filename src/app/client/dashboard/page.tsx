"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, MessageSquare, Image as ImageIcon, List, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { PostConfig } from "@/lib/fb-specs";

type ClientPostsResponse = {
  posts: PostConfig[];
  thumbnails: Record<string, string>;
  comment_counts: Record<string, number>;
};

type View = "list" | "calendar";

const COLS = [
  { key: "pending", label: "⏳ Chờ duyệt" },
  { key: "approved", label: "✓ Đã duyệt" },
  { key: "revision", label: "⚠️ Cần sửa" },
] as const;

function bucketOf(post: PostConfig): "pending" | "approved" | "revision" {
  const vt = post.client_verify_text || "pending";
  const vi = post.client_verify_image || "pending";
  const va = post.client_verify_ads || "pending";
  const adsRelevant = !!post.ads_enabled;
  if (vt === "approved" && vi === "approved" && (!adsRelevant || va === "approved")) return "approved";
  if (vt === "rejected" || vi === "rejected" || vt === "revise" || vi === "revise" || va === "rejected" || va === "revise") return "revision";
  return "pending";
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500 text-sm">Đang tải...</div></div>}>
      <ClientDashboardInner />
    </Suspense>
  );
}

function ClientDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") || "list") as View;

  const [posts, setPosts] = useState<PostConfig[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

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

  const grouped = useMemo(() => {
    const g: Record<"pending" | "approved" | "revision", PostConfig[]> = { pending: [], approved: [], revision: [] };
    for (const p of posts) g[bucketOf(p)].push(p);
    return g;
  }, [posts]);

  const postsByDate = useMemo(() => {
    const map: Record<string, PostConfig[]> = {};
    for (const p of posts) {
      if (p.scheduled_date) (map[p.scheduled_date] ||= []).push(p);
    }
    return map;
  }, [posts]);

  const setView = (v: View) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "list") params.delete("view"); else params.set("view", v);
    const qs = params.toString();
    router.replace(qs ? `/client/dashboard?${qs}` : "/client/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-3">
          <h1 className="text-sm font-bold text-white">📘 Duyệt nội dung</h1>
          <span className="text-[11px] text-gray-500 hidden sm:inline">{posts.length} bài</span>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <button onClick={() => setView("list")} className={`px-2.5 py-1 text-[11px] flex items-center gap-1 ${view === "list" ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
              <List size={12} /> Danh sách
            </button>
            <button onClick={() => setView("calendar")} className={`px-2.5 py-1 text-[11px] flex items-center gap-1 ${view === "calendar" ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
              <CalendarDays size={12} /> Lịch
            </button>
          </div>

          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-xs flex items-center gap-1"><LogOut size={12} /><span className="hidden sm:inline">Đăng xuất</span></button>
        </div>
      </div>

      {error && <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs max-w-[1200px] md:mx-auto">{error}</div>}
      {loading && <div className="p-8 text-center text-gray-500 text-sm">Đang tải...</div>}

      {/* LIST VIEW */}
      {!loading && view === "list" && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1200px] mx-auto">
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
                              {p.ads_enabled && <span className="text-orange-400">🎯 Ads</span>}
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

      {/* CALENDAR VIEW */}
      {!loading && view === "calendar" && (
        <ClientCalendar posts={posts} postsByDate={postsByDate} thumbs={thumbs} counts={counts} calYear={calYear} calMonth={calMonth} onNav={(delta) => {
          let m = calMonth + delta; let y = calYear;
          if (m < 0) { m = 11; y--; }
          if (m > 11) { m = 0; y++; }
          setCalMonth(m); setCalYear(y);
        }} onToday={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }} />
      )}
    </div>
  );
}

function ClientCalendar({ posts, postsByDate, thumbs, counts, calYear, calMonth, onNav, onToday }: {
  posts: PostConfig[];
  postsByDate: Record<string, PostConfig[]>;
  thumbs: Record<string, string>;
  counts: Record<string, number>;
  calYear: number;
  calMonth: number;
  onNav: (delta: number) => void;
  onToday: () => void;
}) {
  const monthName = new Date(calYear, calMonth, 1).toLocaleString("vi-VN", { month: "long", year: "numeric" });
  const days = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ date: string; day: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const today = new Date().toISOString().slice(0, 10);
    const prev = new Date(calYear, calMonth, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prev.getDate() - i;
      const dt = new Date(calYear, calMonth - 1, d);
      cells.push({ date: dt.toISOString().slice(0, 10), day: d, isCurrentMonth: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(calYear, calMonth, d).toISOString().slice(0, 10);
      cells.push({ date: dt, day: d, isCurrentMonth: true, isToday: dt === today });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(calYear, calMonth + 1, d);
      cells.push({ date: dt.toISOString().slice(0, 10), day: d, isCurrentMonth: false, isToday: false });
    }
    return cells;
  }, [calYear, calMonth]);

  const unscheduled = posts.filter((p) => !p.scheduled_date);

  return (
    <div className="max-w-[1200px] mx-auto p-4 flex gap-4 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => onNav(-1)} className="p-1.5 hover:bg-gray-800 rounded"><ChevronLeft size={16} className="text-gray-400" /></button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center capitalize">{monthName}</span>
          <button onClick={() => onNav(1)} className="p-1.5 hover:bg-gray-800 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
          <button onClick={onToday} className="text-[11px] text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-gray-800">Hôm nay</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] text-gray-500 uppercase py-1.5 border-b border-gray-800">
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0 border-l border-gray-800">
          {days.map((cell, i) => {
            const dayPosts = postsByDate[cell.date] || [];
            return (
              <div key={i} className={`min-h-[110px] border-b border-r border-gray-800/50 p-1 ${cell.isCurrentMonth ? "" : "opacity-30"} ${cell.isToday ? "ring-1 ring-inset ring-blue-500/30" : ""}`}>
                <div className={`text-[10px] mb-1 ${cell.isToday ? "text-blue-400 font-bold" : "text-gray-500"}`}>{cell.day}</div>
                {dayPosts.slice(0, 3).map((p) => {
                  const thumb = thumbs[p.id];
                  const b = bucketOf(p);
                  const color = b === "approved" ? "bg-green-500/15 text-green-300 border-green-500/30" : b === "revision" ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30";
                  return (
                    <Link key={p.id} href={`/client/post/${p.id}`} className={`flex items-center gap-1 mb-0.5 px-1.5 py-1 rounded text-[10px] truncate border ${color} hover:opacity-80`}>
                      {thumb && <img src={thumb} className="w-4 h-4 object-cover rounded shrink-0" alt="" />}
                      <span className="truncate">{p.title}</span>
                    </Link>
                  );
                })}
                {dayPosts.length > 3 && <div className="text-[9px] text-gray-500 px-1">+{dayPosts.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="text-xs font-semibold text-gray-400 mb-2 px-1">Chưa lên lịch ({unscheduled.length})</div>
        <div className="space-y-1.5">
          {unscheduled.slice(0, 20).map((p) => {
            const thumb = thumbs[p.id];
            const b = bucketOf(p);
            const color = b === "approved" ? "border-green-500/30" : b === "revision" ? "border-red-500/30" : "border-amber-500/30";
            return (
              <Link key={p.id} href={`/client/post/${p.id}`} className={`flex items-center gap-2 p-2 rounded-lg border bg-gray-900/50 hover:bg-gray-900 transition ${color}`}>
                {thumb ? <img src={thumb} className="w-10 h-10 object-cover rounded shrink-0" alt="" /> : <div className="w-10 h-10 rounded bg-gray-800 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white line-clamp-1">{p.title || "Chưa có tiêu đề"}</div>
                  {(counts[p.id] || 0) > 0 && <div className="text-[9px] text-gray-500 flex items-center gap-0.5 mt-0.5"><MessageSquare size={9} />{counts[p.id]}</div>}
                </div>
              </Link>
            );
          })}
          {unscheduled.length === 0 && <p className="text-[10px] text-gray-600 text-center py-4">—</p>}
        </div>
      </div>
    </div>
  );
}
