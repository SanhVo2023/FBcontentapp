"use client";

import { POST_STATUSES } from "@/lib/fb-specs";

type Props = {
  status: string;
  label?: string;
  dotColor?: string;
  count: number;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
};

export default function KanbanColumn({ status, label, dotColor, count, isOver, onDragOver, onDragLeave, onDrop, children }: Props) {
  const st = POST_STATUSES.find((s) => s.value === status);
  const displayLabel = label || st?.label || status;

  return (
    <div className="flex flex-col w-[300px] min-w-[300px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor || "#6B7280" }} />
        <span className="text-xs font-semibold text-gray-200">{displayLabel}</span>
        <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>

      {/* Droppable area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex-1 space-y-2 p-1.5 rounded-xl transition-colors min-h-[120px] overflow-y-auto ${
          isOver
            ? "bg-blue-600/10 border-2 border-dashed border-blue-500/40"
            : "bg-gray-900/30 border-2 border-transparent"
        }`}
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
