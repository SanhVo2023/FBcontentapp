"use client";

import Link from "next/link";
import { GripVertical, Trash2, CalendarDays, Image as ImageIcon, FileText } from "lucide-react";
import type { BrandConfig, CampaignConfig } from "@/lib/fb-specs";
import { CAMPAIGN_STATUSES, CONTEXT_TYPES } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";

type Props = {
  campaign: CampaignConfig;
  brand?: BrandConfig;
  showBrand?: boolean;
  onAction?: (action: string, campaignId: string) => void;
  dragHandleProps?: Record<string, unknown>;
};

export default function CampaignCard({ campaign, brand, showBrand, onAction, dragHandleProps }: Props) {
  const ctx = CONTEXT_TYPES.find((c) => c.value === campaign.context_type);
  const status = CAMPAIGN_STATUSES.find((s) => s.value === campaign.status);

  return (
    <div className="bg-gray-900/70 border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700 transition group">
      {/* Thumbnail grid */}
      <div className="relative">
        <div className="grid grid-cols-2 aspect-[2/1]">
          {(campaign.thumbnails || []).slice(0, 4).map((url, i) => (
            <div key={i} className="bg-gray-800/30 overflow-hidden">
              <img src={url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
          {(!campaign.thumbnails || campaign.thumbnails.length === 0) && (
            <div className="col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center">
              <ImageIcon size={20} className="text-gray-700" />
            </div>
          )}
          {campaign.thumbnails && campaign.thumbnails.length > 0 && campaign.thumbnails.length < 4 &&
            Array.from({ length: 4 - campaign.thumbnails.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-800/20" />
            ))
          }
        </div>

        {/* Drag handle */}
        {dragHandleProps && (
          <div {...dragHandleProps} className="absolute top-1.5 left-1.5 p-0.5 rounded bg-gray-900/70 text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} />
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAction && (
            <button onClick={() => onAction("trash", campaign.id)} className="p-1 rounded bg-gray-900/70 text-gray-400 hover:text-red-400 transition">
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Context type badge */}
        {ctx && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-900/80 text-gray-300 backdrop-blur-sm">
            {ctx.emoji} {ctx.label.split(" / ")[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <Link href={`/content/campaigns/${campaign.id}`} className="text-xs font-medium text-white hover:text-blue-400 transition line-clamp-2 block leading-tight">
          {campaign.name || "Untitled Campaign"}
        </Link>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {showBrand && brand && (
            <BrandImage src={brand.logo} alt={brand.brand_name} className="w-4 h-4 rounded-full object-contain bg-white shrink-0" />
          )}

          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <FileText size={10} />
            {campaign.post_count ?? 0} posts
          </span>

          {(campaign.image_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <ImageIcon size={10} />
              {campaign.image_count}
            </span>
          )}

          {campaign.target_date && (
            <span className="flex items-center gap-1 text-[10px] text-teal-400">
              <CalendarDays size={10} />
              {campaign.target_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
