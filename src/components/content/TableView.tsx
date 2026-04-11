"use client";

import Link from "next/link";
import { Eye, Copy, Trash2 } from "lucide-react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES } from "@/lib/fb-specs";
import PostThumbnail from "@/components/PostThumbnail";
import BrandImage from "@/components/BrandImage";
import IconButton from "@/components/ui/IconButton";

type Props = {
  posts: PostConfig[];
  thumbnails: Record<string, string>;
  brands: BrandConfig[];
  showBrand: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAction: (action: string, postId: string, extra?: Record<string, unknown>) => void;
};

export default function TableView({ posts, thumbnails, brands, showBrand, selected, onToggleSelect, onToggleSelectAll, onAction }: Props) {
  if (posts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
        <div className="text-4xl mb-3">📝</div>
        <p>No posts yet</p>
        <Link href="/content/create" className="text-blue-400 text-sm mt-2 hover:underline">Create your first post</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-gray-950 z-10">
          <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
            <th className="pl-4 pr-2 py-2 text-left w-8"><input type="checkbox" checked={selected.size === posts.length && posts.length > 0} onChange={onToggleSelectAll} className="accent-blue-500 w-3 h-3" /></th>
            <th className="px-2 py-2 text-left w-10"></th>
            <th className="px-2 py-2 text-left">Post</th>
            <th className="px-2 py-2 text-left w-24 hidden sm:table-cell">Status</th>
            <th className="px-2 py-2 text-left w-24 hidden md:table-cell">Type</th>
            <th className="px-2 py-2 text-left w-28 hidden sm:table-cell">Schedule</th>
            {showBrand && <th className="px-2 py-2 text-left w-28 hidden lg:table-cell">Brand</th>}
            <th className="px-2 py-2 text-right w-20 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const ct = CONTENT_TYPES.find((c) => c.value === p.content_type);
            const postBrand = brands.find((b) => b.brand_id === p.brand_id);
            const isSelected = selected.has(p.id);
            return (
              <tr key={p.id} className={`border-b border-gray-800/30 hover:bg-gray-900/50 transition ${isSelected ? "bg-blue-600/5" : ""}`}>
                <td className="pl-4 pr-2 py-2"><input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(p.id)} className="accent-blue-500 w-3 h-3" /></td>

                {/* Thumbnail */}
                <td className="px-2 py-2">
                  <PostThumbnail url={thumbnails[p.id]} contentType={p.content_type} size="sm" />
                </td>

                {/* Title */}
                <td className="px-2 py-2">
                  <Link href={`/content/${p.id}`} className="text-xs font-medium text-white hover:text-blue-400 transition truncate block">
                    {p.title || p.text_overlay?.headline || "Untitled"}
                  </Link>
                  <p className="text-[10px] text-gray-500 truncate max-w-md">{p.caption_vi || p.caption_en || p.topic || p.prompt?.slice(0, 60)}</p>
                </td>

                {/* Status */}
                <td className="px-2 py-2 hidden sm:table-cell">
                  <select value={p.status} onChange={(e) => onAction("update", p.id, { status: e.target.value })} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border-0 cursor-pointer">
                    {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>

                {/* Content Type */}
                <td className="px-2 py-2 hidden md:table-cell">
                  {ct && <span className="text-[10px] text-gray-400">{ct.emoji} {ct.label}</span>}
                </td>

                {/* Schedule */}
                <td className="px-2 py-2 hidden sm:table-cell">
                  <span className="text-[10px] text-gray-400">{p.scheduled_date || "—"}</span>
                </td>

                {/* Brand */}
                {showBrand && (
                  <td className="px-2 py-2 hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <BrandImage src={postBrand?.logo} alt={postBrand?.brand_name || ""} className="w-4 h-4 rounded-full object-contain bg-white" />
                      <span className="text-[10px] text-gray-400 truncate">{postBrand?.brand_name}</span>
                    </div>
                  </td>
                )}

                {/* Actions */}
                <td className="px-2 py-2 pr-4 text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    <Link href={`/content/${p.id}`}><IconButton icon={Eye} label="View" /></Link>
                    <IconButton icon={Copy} label="Duplicate" onClick={() => onAction("duplicate", p.id)} />
                    <IconButton icon={Trash2} label="Trash" variant="danger" onClick={() => onAction("trash", p.id)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
