"use client";

import { useState, type ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";

type Variant = "ghost" | "default" | "danger";
type Size = "sm" | "md";

const variantStyles: Record<Variant, string> = {
  ghost: "text-gray-500 hover:text-white hover:bg-gray-800",
  default: "text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white",
  danger: "text-red-400/60 hover:text-red-400 hover:bg-red-500/10",
};

const sizeStyles: Record<Size, string> = {
  sm: "p-1 rounded",
  md: "p-1.5 rounded-lg",
};

const iconSizes: Record<Size, number> = { sm: 14, md: 16 };

type Props = {
  icon: LucideIcon;
  label: string;
  variant?: Variant;
  size?: Size;
  className?: string;
} & Omit<ComponentProps<"button">, "children">;

export default function IconButton({ icon: Icon, label, variant = "ghost", size = "sm", className = "", ...props }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        title={label}
        className={`transition-colors cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...props}
      >
        <Icon size={iconSizes[size]} />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 text-gray-200 text-[10px] rounded whitespace-nowrap z-50 pointer-events-none shadow-lg border border-gray-700">
          {label}
        </div>
      )}
    </div>
  );
}
