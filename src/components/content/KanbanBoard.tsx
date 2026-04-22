"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { BrandConfig, PostConfig, KanbanKey } from "@/lib/fb-specs";
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

const COLUMN_TOOLTIPS: Record<KanbanKey, string> = {
  draft: "Đang soạn — chưa gửi khách",
  submitted: "Đang chờ khách duyệt",
  approved: "Khách đã duyệt",
  published: "Đã đăng lên Facebook",
};

export default function KanbanBoard({ postsByStatus, thumbnails, brands, showBrand, onAction }: Props) {
  // draggingId stays in state so ONLY the dragged card needs to re-apply a CSS class.
  // draggingFromRef stays in a ref — it's only read inside handlers, never rendered.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingFromRef = useRef<KanbanKey | null>(null);
  const lastOverColRef = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<KanbanKey, PostConfig[]> = { draft: [], submitted: [], approved: [], published: [] };
    for (const posts of Object.values(postsByStatus)) {
      for (const p of posts) {
        const col = getKanbanColumn(p.status);
        if (col) buckets[col].push(p);
      }
    }
    return buckets;
  }, [postsByStatus]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Imperatively toggle `.is-over` on the column under the cursor.
  // This avoids React state updates on every dragOver event (dozens per second).
  const setOverColumn = useCallback((el: HTMLElement | null) => {
    if (lastOverColRef.current && lastOverColRef.current !== el) {
      lastOverColRef.current.classList.remove("is-over");
    }
    if (el) el.classList.add("is-over");
    lastOverColRef.current = el;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, postId: string, fromColumn: KanbanKey) => {
    e.dataTransfer.setData("text/plain", postId);
    e.dataTransfer.effectAllowed = "move";
    draggingFromRef.current = fromColumn;
    setDraggingId(postId);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggingFromRef.current = null;
    setDraggingId(null);
    setOverColumn(null);
  }, [setOverColumn]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(e.currentTarget as HTMLElement);
  }, [setOverColumn]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      if (lastOverColRef.current === el) setOverColumn(null);
    }
  }, [setOverColumn]);

  const handleDrop = useCallback((e: React.DragEvent, toColumn: KanbanKey) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain");
    const from = draggingFromRef.current;
    setOverColumn(null);
    draggingFromRef.current = null;
    setDraggingId(null);

    if (!postId || !from || from === toColumn) return;

    let post: PostConfig | undefined;
    for (const bucket of Object.values(grouped)) {
      const found = bucket.find((p) => p.id === postId);
      if (found) { post = found; break; }
    }
    if (!post) return;

    // Creator can't self-approve — only the client approves via the /client portal.
    if (toColumn === "approved" && from !== "published") {
      showToast("Chỉ khách duyệt mới chuyển bài sang Đã duyệt");
      return;
    }

    // Draft → Submitted: gate on having caption + image.
    if (toColumn === "submitted" && from === "draft") {
      const hasCaption = !!(post.caption_vi?.trim() || post.caption_en?.trim());
      const hasImage = !!thumbnails[post.id];
      if (!hasCaption) { showToast("Cần có caption trước khi gửi khách"); return; }
      if (!hasImage) { showToast("Cần có hình trước khi gửi khách"); return; }
      onAction("update", postId, {
        status: "submitted",
        client_verify_text: "pending",
        client_verify_image: "pending",
        client_verify_ads: "pending",
        client_approval_notes: null,
      });
      return;
    }

    // Approved → Published: creator marks post as live on FB.
    if (toColumn === "published" && from === "approved") {
      onAction("update", postId, { status: "published" });
      return;
    }

    // Published → Approved: unpublish (e.g. accidental publish).
    if (toColumn === "approved" && from === "published") {
      onAction("update", postId, { status: "approved" });
      return;
    }

    // Any → Draft: manual revert.
    if (toColumn === "draft" && (from === "submitted" || from === "approved" || from === "published")) {
      onAction("update", postId, { status: "draft" });
      return;
    }

    // Submitted ↔ published or published ← submitted: block, must approve first.
    if (toColumn === "published" && from !== "approved") {
      showToast("Phải duyệt trước khi đăng");
      return;
    }

    if (toColumn === "submitted" && (from === "approved" || from === "published")) {
      showToast("Bài đã duyệt — không cần gửi lại");
      return;
    }
  }, [grouped, thumbnails, onAction, setOverColumn, showToast]);

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
              tooltip={COLUMN_TOOLTIPS[col.key]}
              dotColor={col.dotColor}
              count={posts.length}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {posts.map((post) => {
                const isDragging = draggingId === post.id;
                return (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post.id, col.key)}
                    onDragEnd={handleDragEnd}
                    className={`kanban-card cursor-grab active:cursor-grabbing ${isDragging ? "is-dragging" : ""}`}
                  >
                    <PostCard
                      post={post}
                      thumbnailUrl={thumbnails[post.id]}
                      brand={brands.find((b) => b.brand_id === post.brand_id)}
                      showBrand={showBrand}
                      onAction={onAction}
                    />
                  </div>
                );
              })}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );
}
