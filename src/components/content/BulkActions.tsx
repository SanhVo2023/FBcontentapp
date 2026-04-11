"use client";

import { X } from "lucide-react";
import { POST_STATUSES } from "@/lib/fb-specs";

type TagRow = { id: string; name: string; color: string };

type Props = {
  count: number;
  tags: TagRow[];
  onBulkAction: (action: string, value?: string) => void;
  onDeselect: () => void;
};

export default function BulkActions({ count, tags, onBulkAction, onDeselect }: Props) {
  if (count === 0) return null;

  return (
    <div className="border-b border-blue-500/30 bg-blue-600/5 px-4 py-2 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-blue-400 font-medium">{count} selected</span>
      <select onChange={(e) => { if (e.target.value) onBulkAction("status", e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300">
        <option value="">Status...</option>
        {POST_STATUSES.filter((s) => s.value !== "trashed").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {tags.length > 0 && (
        <select onChange={(e) => { if (e.target.value) onBulkAction("tag", e.target.value); e.target.value = ""; }} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300">
          <option value="">Tag...</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <button onClick={() => onBulkAction("delete")} className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30">Trash</button>
      <button onClick={onDeselect} className="ml-auto text-gray-500 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}
