"use client";

import { useState, useMemo } from "react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { KANBAN_COLUMNS, getKanbanColumn } from "@/lib/fb-specs";
import KanbanColumn from "./KanbanColumn";
import PostCard from "./PostCard";

type Props = {
  postsByStatus: Record<string, PostConfig[]>;
  thumbnails: Record<string, string>;
  brands: BrandConfig[];
  showBrand: boolean;
  onAction: (action: string, postId: string, extra?: Record<string, unknown>) => void;
};

export default function KanbanBoard({ postsByStatus, thumbnails, brands, showBrand, onAction }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<"draft" | "submitted" | "approved" | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Regroup posts into 3 kanban columns
  const grouped = useMemo(() => {
    const buckets: Record<"draft" | "submitted" | "approved", PostConfig[]> = { draft: [], submitted: [], approved: [] };
    for (const posts of Object.values(postsByStatus)) {
      for (const p of posts) {
        const col = getKanbanColumn(p.status);
        if (col) buckets[col].push(p);
      }
    }
    return buckets;
  }, [postsByStatus]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDragStart = (e: React.DragEvent, postId: string, fromColumn: "draft" | "submitted" | "approved") => {
    e.dataTransfer.setData("text/plain", postId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(postId);
    setDraggingFrom(fromColumn);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDraggingFrom(null);
    setOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent, status: string) => {
    if (overColumn === status) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        setOverColumn(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, toColumn: "draft" | "submitted" | "approved") => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain");
    const from = draggingFrom;
    setOverColumn(null);
    setDraggingId(null);
    setDraggingFrom(null);

    if (!postId || !from || from === toColumn) return;

    // Find the post
    let post: PostConfig | undefined;
    for (const bucket of Object.values(grouped)) {
      const found = bucket.find((p) => p.id === postId);
      if (found) { post = found; break; }
    }
    if (!post) return;

    // Enforce drag rules
    if (toColumn === "approved") {
      showToast("Chỉ khách duyệt trên Sheet mới chuyển sang Đã duyệt");
      return;
    }

    if (toColumn === "submitted" && from === "draft") {
      // Validate: has caption and has image
      const hasCaption = !!(post.caption_vi?.trim() || post.caption_en?.trim());
      const hasImage = !!thumbnails[post.id];
      if (!hasCaption) { showToast("Bài viết cần có caption trước khi gửi Sheet"); return; }
      if (!hasImage) { showToast("Bài viết cần có hình trước khi gửi Sheet"); return; }
      onAction("submit_to_sheet", postId);
      return;
    }

    if (toColumn === "draft" && from === "submitted") {
      // Manual revert — just update status, don't touch sheet
      onAction("update", postId, { status: "draft" });
      return;
    }

    if (toColumn === "draft" && from === "approved") {
      // Rework: move back to draft
      onAction("update", postId, { status: "draft" });
      return;
    }

    if (toColumn === "submitted" && from === "approved") {
      showToast("Bài đã duyệt — không cần gửi lại");
      return;
    }
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg text-xs z-50 backdrop-blur-sm">
          {toast}
        </div>
      )}
      <div className="flex gap-3 p-4 h-full min-w-max">
        {KANBAN_COLUMNS.map((col) => {
          const posts = grouped[col.key];
          return (
            <KanbanColumn
              key={col.key}
              status={col.key}
              label={col.label}
              dotColor={col.dotColor}
              count={posts.length}
              isOver={overColumn === col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {posts.map((post) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, post.id, col.key)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab active:cursor-grabbing transition-opacity ${draggingId === post.id ? "opacity-40" : ""}`}
                >
                  <PostCard
                    post={post}
                    thumbnailUrl={thumbnails[post.id]}
                    brand={brands.find((b) => b.brand_id === post.brand_id)}
                    showBrand={showBrand}
                    onAction={onAction}
                  />
                </div>
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );
}
