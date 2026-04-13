"use client";

import Link from "next/link";
import { Kanban, CalendarDays, List, Plus } from "lucide-react";
import type { BrandConfig } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";
import ViewSwitcher from "@/components/ui/ViewSwitcher";
import type { ContentView, DisplayMode } from "@/hooks/useContentHub";
import { T } from "@/lib/ui-text";

const VIEWS = [
  { key: "kanban", icon: Kanban, label: "Kanban" },
  { key: "calendar", icon: CalendarDays, label: "Calendar" },
  { key: "table", icon: List, label: "Table" },
];

type Props = {
  brands: BrandConfig[];
  activeBrand: string;
  onBrandChange: (id: string) => void;
  view: ContentView;
  onViewChange: (v: ContentView) => void;
  displayMode: DisplayMode;
  onDisplayModeChange: (m: DisplayMode) => void;
};

export default function ContentHeader({ brands, activeBrand, onBrandChange, view, onViewChange, displayMode, onDisplayModeChange }: Props) {
  return (
    <div className="border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 shrink-0">
      <h1 className="text-base font-bold shrink-0"><span className="text-blue-400">{T.nav_content}</span></h1>

      {/* Campaigns/Posts toggle */}
      <div className="flex bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shrink-0">
        <button onClick={() => onDisplayModeChange("campaigns")} className={`px-2.5 py-1 text-[11px] font-medium transition ${displayMode === "campaigns" ? "bg-amber-600/20 text-amber-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          {T.campaigns}
        </button>
        <button onClick={() => onDisplayModeChange("posts")} className={`px-2.5 py-1 text-[11px] font-medium transition ${displayMode === "posts" ? "bg-blue-600/20 text-blue-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          {T.posts}
        </button>
      </div>

      {/* Brand tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mx-2 flex-1 min-w-0">
        <button onClick={() => onBrandChange("all")} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap shrink-0 ${activeBrand === "all" ? "bg-blue-600/15 text-blue-400 ring-1 ring-blue-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          {T.all_brands}
        </button>
        {brands.map((b) => (
          <button key={b.brand_id} onClick={() => onBrandChange(b.brand_id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap shrink-0 ${activeBrand === b.brand_id ? "bg-blue-600/15 text-blue-400 ring-1 ring-blue-500/30" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
            <BrandImage src={b.logo} alt={b.brand_name} className="w-4 h-4 rounded-full object-contain bg-white" />
            <span className="hidden sm:inline">{b.brand_name}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ViewSwitcher views={VIEWS} active={view} onChange={(v) => onViewChange(v as ContentView)} />
        <Link href="/content/create" title="Create" className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          <Plus size={16} />
        </Link>
      </div>
    </div>
  );
}
