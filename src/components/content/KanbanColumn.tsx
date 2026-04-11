"use client";

import { POST_STATUSES } from "@/lib/fb-specs";

type Props = {
  status: string;
  count: number;
  isOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
};

export default function KanbanColumn({ status, count, isOver, onDragOver, onDragLeave, onDrop, children }: Props) {
  const st = POST_STATUSES.find((s) => s.value === status);

  return (
    <div className="flex flex-col w-[272px] min-w-[272px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${st?.color || "bg-gray-600"}`} />
        <span className="text-[11px] font-semibold text-gray-300">{st?.label || status}</span>
        <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>
      </div>

      {/* Droppable area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex-1 space-y-2 p-1.5 rounded-xl transition-colors min-h-[120px] overflow-y-auto ${
          isOver
            ? "bg-blue-600/10 border-2 border-dashed border-blue-500/30"
            : "bg-gray-900/30 border-2 border-transparent"
        }`}
      >
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            Drag posts here
          </div>
        )}
      </div>
    </div>
  );
}
