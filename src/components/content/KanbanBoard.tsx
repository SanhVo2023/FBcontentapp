"use client";

import { useState } from "react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { POST_STATUSES } from "@/lib/fb-specs";
import KanbanColumn from "./KanbanColumn";
import PostCard from "./PostCard";

const KANBAN_STATUSES = POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => s.value);

type Props = {
  postsByStatus: Record<string, PostConfig[]>;
  thumbnails: Record<string, string>;
  brands: BrandConfig[];
  showBrand: boolean;
  onAction: (action: string, postId: string, extra?: Record<string, unknown>) => void;
};

export default function KanbanBoard({ postsByStatus, thumbnails, brands, showBrand, onAction }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData("text/plain", postId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(postId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent, status: string) => {
    // Only clear if leaving the column itself, not entering a child
    if (overColumn === status) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        setOverColumn(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain");
    if (!postId) return;
    setOverColumn(null);
    setDraggingId(null);

    // Find the post's current status
    for (const [status, posts] of Object.entries(postsByStatus)) {
      if (posts.some((p) => p.id === postId) && status !== newStatus) {
        onAction("update", postId, { status: newStatus });
        break;
      }
    }
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-4 h-full min-w-max">
        {KANBAN_STATUSES.map((status) => {
          const posts = postsByStatus[status] || [];
          return (
            <KanbanColumn
              key={status}
              status={status}
              count={posts.length}
              isOver={overColumn === status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {posts.map((post) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, post.id)}
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
