"use client";

import { useCallback, useRef, useState } from "react";
import type { BrandConfig, CampaignConfig } from "@/lib/fb-specs";
import { CAMPAIGN_STATUSES } from "@/lib/fb-specs";
import KanbanColumn from "./KanbanColumn";
import CampaignCard from "./CampaignCard";

const KANBAN_STATUSES = CAMPAIGN_STATUSES.filter((s) => s.value !== "trashed").map((s) => s.value);

type Props = {
  campaignsByStatus: Record<string, CampaignConfig[]>;
  brands: BrandConfig[];
  showBrand: boolean;
  onAction: (action: string, campaignId: string, extra?: Record<string, unknown>) => void;
};

export default function CampaignKanban({ campaignsByStatus, brands, showBrand, onAction }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const lastOverColRef = useRef<HTMLElement | null>(null);

  const setOverColumn = useCallback((el: HTMLElement | null) => {
    if (lastOverColRef.current && lastOverColRef.current !== el) {
      lastOverColRef.current.classList.remove("is-over");
    }
    if (el) el.classList.add("is-over");
    lastOverColRef.current = el;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
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

  const handleDrop = useCallback((e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setOverColumn(null); setDraggingId(null);
    if (!id) return;
    for (const [status, campaigns] of Object.entries(campaignsByStatus)) {
      if (campaigns.some((c) => c.id === id) && status !== newStatus) {
        onAction("update", id, { status: newStatus });
        break;
      }
    }
  }, [campaignsByStatus, onAction, setOverColumn]);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 p-4 h-full min-w-max">
        {KANBAN_STATUSES.map((status) => {
          const items = campaignsByStatus[status] || [];
          return (
            <KanbanColumn
              key={status}
              status={status}
              count={items.length}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {items.map((campaign) => {
                const isDragging = draggingId === campaign.id;
                return (
                  <div
                    key={campaign.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, campaign.id)}
                    onDragEnd={handleDragEnd}
                    className={`kanban-card cursor-grab active:cursor-grabbing ${isDragging ? "is-dragging" : ""}`}
                  >
                    <CampaignCard
                      campaign={campaign}
                      brand={brands.find((b) => b.brand_id === campaign.brand_id)}
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
