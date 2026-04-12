"use client";

import { useState } from "react";
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
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragEnd = () => { setDraggingId(null); setOverColumn(null); };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent, status: string) => {
    if (overColumn === status) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) setOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    setOverColumn(null); setDraggingId(null);
    for (const [status, campaigns] of Object.entries(campaignsByStatus)) {
      if (campaigns.some((c) => c.id === id) && status !== newStatus) {
        onAction("update", id, { status: newStatus });
        break;
      }
    }
  };

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
              isOver={overColumn === status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {items.map((campaign) => (
                <div
                  key={campaign.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, campaign.id)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab active:cursor-grabbing transition-opacity ${draggingId === campaign.id ? "opacity-40" : ""}`}
                >
                  <CampaignCard
                    campaign={campaign}
                    brand={brands.find((b) => b.brand_id === campaign.brand_id)}
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
