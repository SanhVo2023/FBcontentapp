"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { POST_STATUSES } from "@/lib/fb-specs";
import Button from "@/components/ui/Button";

type TagRow = { id: string; name: string; color: string };

type Props = {
  count: number;
  tags: TagRow[];
  onBulkAction: (action: string, value?: string) => void;
  onDeselect: () => void;
};

// Explicit creator-facing statuses only. Legacy codes stay in DB but
// aren't selectable here.
const SELECTABLE_STATUSES = POST_STATUSES.filter((s) =>
  ["draft", "submitted", "approved", "published"].includes(s.value),
);

export default function BulkActions({ count, tags, onBulkAction, onDeselect }: Props) {
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingTag, setPendingTag] = useState("");

  if (count === 0) return null;

  const applyStatus = () => {
    if (!pendingStatus) return;
    onBulkAction("status", pendingStatus);
    setPendingStatus("");
  };
  const applyTag = () => {
    if (!pendingTag) return;
    onBulkAction("tag", pendingTag);
    setPendingTag("");
  };

  return (
    <div className="border-b border-blue-500/30 bg-blue-600/5 px-4 py-2 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-blue-400 font-medium">{count} đã chọn</span>

      {/* Status */}
      <div className="flex items-center gap-1">
        <select
          value={pendingStatus}
          onChange={(e) => setPendingStatus(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
        >
          <option value="">Trạng thái...</option>
          {SELECTABLE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button size="sm" variant="primary" disabled={!pendingStatus} onClick={applyStatus}>
          <Check size={12} /> Áp dụng
        </Button>
      </div>

      {/* Tag */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1">
          <select
            value={pendingTag}
            onChange={(e) => setPendingTag(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="">Tag...</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button size="sm" variant="primary" disabled={!pendingTag} onClick={applyTag}>
            <Check size={12} /> Áp dụng
          </Button>
        </div>
      )}

      <Button size="sm" variant="danger" onClick={() => onBulkAction("delete")}>Xóa</Button>

      <button onClick={onDeselect} className="ml-auto text-gray-500 hover:text-white" title="Bỏ chọn">
        <X size={14} />
      </button>
    </div>
  );
}
