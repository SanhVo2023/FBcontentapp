"use client";

import { memo } from "react";
import { POST_STATUSES } from "@/lib/fb-specs";

type Props = {
  status: string;
  label?: string;
  tooltip?: string;
  dotColor?: string;
  count: number;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
};

function KanbanColumn({ status, label, tooltip, dotColor, count, onDragOver, onDragLeave, onDrop, children }: Props) {
  const st = POST_STATUSES.find((s) => s.value === status);
  const displayLabel = label || st?.label || status;

  return (
    <div className="flex flex-col w-[300px] min-w-[300px] shrink-0">
      <div className="flex items-center gap-2 px-2 py-2 mb-1" title={tooltip}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor || "#6B7280" }} />
        <span className="text-xs font-semibold text-gray-200">{displayLabel}</span>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>

      <div
        data-col={status}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="kanban-col flex-1 space-y-2 p-1.5 rounded-xl min-h-[120px] overflow-y-auto"
      >
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            Kéo bài vào đây
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(KanbanColumn);
