"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { CONTENT_TYPES, POST_STATUSES, SERVICE_AREAS } from "@/lib/fb-specs";

type TagRow = { id: string; brand_id: string; name: string; color: string };

type Props = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterStatus: string[];
  onFilterStatusChange: (s: string[]) => void;
  filterContentType: string;
  onFilterContentTypeChange: (ct: string) => void;
  filterServiceArea: string;
  onFilterServiceAreaChange: (sa: string) => void;
  filterTags: string[];
  onFilterTagsChange: (tags: string[]) => void;
  tags: TagRow[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (by: string, order: "asc" | "desc") => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  activeFilterCount: number;
  postCount: number;
};

export default function ContentFilters(props: Props) {
  const toggleStatus = (s: string) => {
    props.onFilterStatusChange(
      props.filterStatus.includes(s) ? props.filterStatus.filter((x) => x !== s) : [...props.filterStatus, s]
    );
  };

  const toggleTag = (id: string) => {
    props.onFilterTagsChange(
      props.filterTags.includes(id) ? props.filterTags.filter((x) => x !== id) : [...props.filterTags, id]
    );
  };

  const clearAll = () => {
    props.onFilterStatusChange([]);
    props.onFilterContentTypeChange("");
    props.onFilterServiceAreaChange("");
    props.onFilterTagsChange([]);
    props.onSearchChange("");
  };

  return (
    <>
      {/* Main filter bar */}
      <div className="border-b border-gray-800/50 px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <input value={props.searchQuery} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Search..." className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500/50" />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        </div>

        {/* Quick status pills */}
        <div className="hidden sm:flex gap-1">
          {["draft", "scheduled", "images_done", "published"].map((s) => {
            const isActive = props.filterStatus.includes(s);
            const st = POST_STATUSES.find((x) => x.value === s);
            return (
              <button key={s} onClick={() => toggleStatus(s)} className={`px-2 py-1 rounded text-[10px] font-medium transition ${isActive ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"}`}>
                {st?.label}
              </button>
            );
          })}
        </div>

        {/* Advanced toggle */}
        <button onClick={props.onToggleAdvanced} title="Filters" className={`p-1.5 rounded-lg transition ${props.showAdvanced || props.activeFilterCount > 0 ? "bg-purple-600/20 text-purple-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
          <SlidersHorizontal size={15} />
          {props.activeFilterCount > 0 && <span className="ml-1 text-[9px]">{props.activeFilterCount}</span>}
        </button>

        {/* Sort */}
        <select value={`${props.sortBy}-${props.sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split("-"); props.onSortChange(s, o as "asc" | "desc"); }} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 hidden sm:block">
          <option value="created_at-desc">Newest</option>
          <option value="created_at-asc">Oldest</option>
          <option value="updated_at-desc">Updated</option>
          <option value="scheduled_date-asc">Schedule</option>
          <option value="title-asc">Title A-Z</option>
        </select>

        <span className="text-[10px] text-gray-600 hidden sm:block">{props.postCount}</span>
      </div>

      {/* Advanced filters */}
      {props.showAdvanced && (
        <div className="border-b border-gray-800/50 px-4 py-2.5 flex items-center gap-4 bg-gray-900/30 flex-wrap">
          <div>
            <label className="text-[9px] text-gray-500 uppercase block mb-1">Content Type</label>
            <select value={props.filterContentType} onChange={(e) => props.onFilterContentTypeChange(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300">
              <option value="">All</option>
              {CONTENT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-gray-500 uppercase block mb-1">Service Area</label>
            <select value={props.filterServiceArea} onChange={(e) => props.onFilterServiceAreaChange(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300">
              <option value="">All</option>
              {SERVICE_AREAS.map((sa) => <option key={sa.value} value={sa.value}>{sa.label}</option>)}
            </select>
          </div>
          {props.tags.length > 0 && (
            <div>
              <label className="text-[9px] text-gray-500 uppercase block mb-1">Tags</label>
              <div className="flex gap-1 flex-wrap">
                {props.tags.map((t) => (
                  <button key={t.id} onClick={() => toggleTag(t.id)} className={`px-2 py-0.5 rounded text-[10px] transition ${props.filterTags.includes(t.id) ? "ring-1 ring-current" : ""}`} style={{ backgroundColor: t.color + "20", color: t.color }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 hover:text-white">
            <X size={12} /> Clear
          </button>
        </div>
      )}
    </>
  );
}
