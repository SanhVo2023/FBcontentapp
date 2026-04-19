"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PostConfig, BrandConfig } from "@/lib/fb-specs";
import FacebookPreview from "@/components/content/FacebookPreview";
import ApprovalBar from "@/components/client/ApprovalBar";
import CommentsPanel from "@/components/client/CommentsPanel";

async function api(url: string, body?: unknown) {
  const opts: RequestInit = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!text) return {};
  try { const d = JSON.parse(text); if (!res.ok) throw new Error(d.error || "Failed"); return d; } catch (e) { if (e instanceof Error && e.message !== "Failed") throw new Error(`Bad: ${text.slice(0, 80)}`); throw e; }
}

export default function ClientPostView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostConfig | null>(null);
  const [brand, setBrand] = useState<{ brand_id: string; brand_name: string; logo?: string } | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [displayLang, setDisplayLang] = useState<"vi" | "en">("vi");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p: PostConfig = await api(`/api/client-posts?id=${id}`);
      if (!p) { setError("Không tìm thấy bài"); return; }
      setPost(p);
      if (p.language === "en") setDisplayLang("en");
      // Fetch brand (public brand list has it) + thumbnail
      const publicBrands = await fetch("/api/client-auth").then((r) => r.json()).catch(() => []);
      const b = Array.isArray(publicBrands) ? publicBrands.find((x: BrandConfig) => x.brand_id === p.brand_id) : null;
      if (b) setBrand(b);
      // thumbnail
      try {
        const imgs = await api(`/api/client-posts`);
        setThumb((imgs.thumbnails && imgs.thumbnails[p.id]) || null);
      } catch { /* ok */ }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: "approve_text" | "approve_image" | "reject" | "revise" | "reset", note?: string) => {
    if (!post) return;
    setBusy(action); setError(null);
    try {
      const r = await api("/api/client-posts", { action, post_id: post.id, note });
      if (r?.post) setPost(r.post);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi"); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-gray-500 text-sm">Đang tải...</div></div>;
  if (!post) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-red-400 text-sm">Không tìm thấy</div></div>;

  const caption = displayLang === "en" ? (post.caption_en || post.caption_vi) : (post.caption_vi || post.caption_en);
  const hasBoth = post.language === "both";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10 backdrop-blur">
        <Link href="/client/dashboard" className="text-gray-400 hover:text-white"><ArrowLeft size={16} /></Link>
        <h1 className="text-sm font-bold text-white truncate">{post.title || "Bài viết"}</h1>
        {hasBoth && (
          <div className="ml-auto flex gap-1 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <button onClick={() => setDisplayLang("vi")} className={`px-2 py-1 text-[11px] ${displayLang === "vi" ? "bg-blue-600/20 text-blue-400" : "text-gray-500"}`}>VI</button>
            <button onClick={() => setDisplayLang("en")} className={`px-2 py-1 text-[11px] ${displayLang === "en" ? "bg-blue-600/20 text-blue-400" : "text-gray-500"}`}>EN</button>
          </div>
        )}
      </div>

      {error && <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs max-w-3xl mx-auto">{error}</div>}

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* FB preview (read-only) */}
        <FacebookPreview
          brandName={brand?.brand_name || "Brand"}
          brandLogo={brand?.logo}
          caption={caption || ""}
          imageUrl={thumb}
          headline={post.text_overlay?.headline}
          subline={post.text_overlay?.subline}
          cta={post.text_overlay?.cta}
          sponsored
        />

        {/* Approval notes banner if rejected/revise */}
        {post.client_approval_notes && (post.client_verify_text === "rejected" || post.client_verify_image === "rejected" || post.client_verify_text === "revise" || post.client_verify_image === "revise") && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm">
            <div className="text-amber-300 font-semibold mb-1">Ghi chú đã gửi team nội dung:</div>
            <div className="text-amber-200 text-xs whitespace-pre-wrap">{post.client_approval_notes}</div>
          </div>
        )}

        {/* Approval bar */}
        <ApprovalBar
          verifyText={post.client_verify_text || "pending"}
          verifyImage={post.client_verify_image || "pending"}
          busy={busy}
          onAction={handleAction}
        />

        {/* Comments */}
        <CommentsPanel postId={post.id} apiBase="/api/client-comments" myRole="client" myName={brand?.brand_name} />
      </div>
    </div>
  );
}
