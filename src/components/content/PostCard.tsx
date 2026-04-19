"use client";

import Link from "next/link";
import { Eye, Copy, Trash2, CalendarDays, GripVertical } from "lucide-react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES, POST_STATUSES, isLegacyDraftStatus } from "@/lib/fb-specs";
import PostThumbnail from "@/components/PostThumbnail";
import BrandImage from "@/components/BrandImage";
import IconButton from "@/components/ui/IconButton";

type Props = {
  post: PostConfig;
  thumbnailUrl?: string;
  brand?: BrandConfig;
  showBrand?: boolean;
  onAction?: (action: string, postId: string) => void;
  dragHandleProps?: Record<string, unknown>;
};

export default function PostCard({ post, thumbnailUrl, brand, showBrand, onAction, dragHandleProps }: Props) {
  const ct = CONTENT_TYPES.find((c) => c.value === post.content_type);
  const legacy = isLegacyDraftStatus(post.status);
  const legacyStatus = legacy ? POST_STATUSES.find((s) => s.value === post.status) : null;
  const sheetState = post.sheet_status;
  const sheetApproved = sheetState === "Approved";
  const sheetRejected = sheetState === "Rejected" || sheetState === "Revise";

  return (
    <div className="bg-gray-900/70 border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700 transition group">
      {/* Thumbnail */}
      <div className="relative">
        <PostThumbnail url={thumbnailUrl} contentType={post.content_type} size="md" />

        {/* Drag handle */}
        {dragHandleProps && (
          <div {...dragHandleProps} className="absolute top-1.5 left-1.5 p-0.5 rounded bg-gray-900/70 text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} />
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/content/${post.id}`}>
            <IconButton icon={Eye} label="View details" variant="default" size="sm" />
          </Link>
          {onAction && (
            <>
              <IconButton icon={Copy} label="Duplicate" variant="default" size="sm" onClick={() => onAction("duplicate", post.id)} />
              <IconButton icon={Trash2} label="Trash" variant="danger" size="sm" onClick={() => onAction("trash", post.id)} />
            </>
          )}
        </div>

        {/* Content type badge */}
        {ct && (
          <div className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${ct.color}/80 text-white backdrop-blur-sm`}>
            {ct.emoji} {ct.label}
          </div>
        )}

        {/* Sheet status badge */}
        {post.sheet_post_id && (
          <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium backdrop-blur-sm ${sheetApproved ? "bg-green-500/80 text-white" : sheetRejected ? "bg-red-500/80 text-white" : "bg-amber-500/80 text-white"}`}>
            {sheetApproved ? "✓ Duyệt" : sheetRejected ? "✗ Từ chối" : `${post.sheet_post_id}`}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <Link href={`/content/${post.id}`} className="text-xs font-medium text-white hover:text-blue-400 transition line-clamp-2 block leading-tight">
          {post.title || post.text_overlay?.headline || "Untitled"}
        </Link>

        <div className="flex items-center gap-2 mt-2">
          {showBrand && brand && (
            <BrandImage src={brand.logo} alt={brand.brand_name} className="w-4 h-4 rounded-full object-contain bg-white shrink-0" />
          )}

          {post.scheduled_date && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <CalendarDays size={10} />
              {post.scheduled_date}
            </span>
          )}

          {post.language && (
            <span className="text-[9px] text-gray-600 ml-auto">{post.language === "both" ? "VI/EN" : post.language.toUpperCase()}</span>
          )}
        </div>

        {/* Legacy status chip */}
        {legacyStatus && (
          <div className="mt-1.5">
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
              {legacyStatus.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
