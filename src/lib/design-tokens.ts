// Design tokens — single source of truth for UI styling.
// Keep the set of values small and semantic. Compose into components.

export const BTN = {
  primary: "bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white",
  secondary: "bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-gray-100 border border-gray-700",
  ghost: "text-gray-400 hover:text-gray-100 hover:bg-gray-800 disabled:text-gray-600",
  danger: "bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 text-red-300 border border-red-600/30",
  success: "bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white",
} as const;
export type BtnVariant = keyof typeof BTN;

export const BTN_SIZE = {
  sm: "px-2.5 py-1 text-xs rounded-md",
  md: "px-3 py-1.5 text-sm rounded-lg",
  lg: "px-4 py-2.5 text-sm font-semibold rounded-lg",
} as const;
export type BtnSize = keyof typeof BTN_SIZE;

export const TEXT = {
  display: "text-lg font-bold text-gray-100",
  title: "text-sm font-semibold text-gray-100",
  body: "text-xs text-gray-300",
  caption: "text-[11px] text-gray-400",
  micro: "text-[9px] uppercase tracking-wide text-gray-500 font-semibold",
} as const;

export const SURFACE = {
  card: "bg-gray-900/60 border border-gray-800 rounded-lg",
  control: "bg-gray-800 border border-gray-700 rounded-lg",
  input: "bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none",
  pill: "rounded-full px-2 py-0.5 text-[11px]",
} as const;

export const RADIUS = {
  control: "rounded-lg",
  card: "rounded-xl",
  pill: "rounded-full",
  sm: "rounded-md",
} as const;

export const SPACE = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
} as const;

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
