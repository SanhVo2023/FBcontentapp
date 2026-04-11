"use client";

import type { LucideIcon } from "lucide-react";

type ViewOption = {
  key: string;
  icon: LucideIcon;
  label: string;
};

type Props = {
  views: ViewOption[];
  active: string;
  onChange: (key: string) => void;
};

export default function ViewSwitcher({ views, active, onChange }: Props) {
  return (
    <div className="flex bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {views.map((v) => {
        const isActive = active === v.key;
        return (
          <button
            key={v.key}
            title={v.label}
            onClick={() => onChange(v.key)}
            className={`px-2.5 py-1.5 transition-colors ${isActive ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"}`}
          >
            <v.icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
