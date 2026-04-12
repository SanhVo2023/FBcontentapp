"use client";

import type { PostType } from "@/lib/fb-specs";
import { getPostSpec } from "@/lib/fb-specs";

type Props = {
  brandName: string;
  brandLogo?: string;
  caption?: string;
  headline?: string;
  subline?: string;
  cta?: string;
  postType?: PostType | string;
  style?: string;
  compact?: boolean;
};

const STYLE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  professional: { bg: "#F8F9FA", text: "#1A1A2E", accent: "#1877F2" },
  bold: { bg: "#1A1A1A", text: "#FFFFFF", accent: "#FF4444" },
  minimal: { bg: "#FFFFFF", text: "#333333", accent: "#666666" },
  warm: { bg: "#FFF8F0", text: "#4A2C2A", accent: "#E8805C" },
  "dark-luxury": { bg: "#0A0A0A", text: "#FFFFFF", accent: "#C5A55A" },
  vibrant: { bg: "#667EEA", text: "#FFFFFF", accent: "#F6E05E" },
  editorial: { bg: "#F5F0EB", text: "#2D3436", accent: "#6C5CE7" },
};

function renderCaption(text: string, maxLen = 120) {
  if (!text) return null;
  const truncated = text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  const parts = truncated.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? <span key={i} style={{ color: "#1877F2" }}>{part}</span> : <span key={i}>{part}</span>
  );
}

export default function FacebookMockup({ brandName, brandLogo, caption, headline, subline, cta, postType = "feed-square", style = "professional", compact }: Props) {
  const spec = getPostSpec(postType);
  const colors = STYLE_COLORS[style] || STYLE_COLORS.professional;

  // Aspect ratio for the image area
  const aspectMap: Record<string, string> = {
    "feed-square": "1/1",
    "feed-wide": "1.91/1",
    "story": "9/16",
    "carousel": "1/1",
    "ad-square": "1/1",
    "ad-landscape": "1.91/1",
    "cover": "2.63/1",
  };
  const aspect = aspectMap[postType] || "1/1";
  const isStory = postType === "story";

  if (compact) {
    // Compact card version — just the mockup shape
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white" style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}>
        {/* Mini header */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5">
          {brandLogo ? <img src={brandLogo} className="w-5 h-5 rounded-full object-contain bg-white" alt="" /> : <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold">{brandName?.[0]}</div>}
          <div className="text-[10px] font-semibold text-gray-900 truncate">{brandName}</div>
          <span className="text-[8px] text-gray-400 ml-auto">{spec.label}</span>
        </div>
        {/* Caption preview */}
        {caption && <div className="px-2.5 pb-1.5 text-[10px] text-gray-700 line-clamp-2 leading-tight" style={{ whiteSpace: "pre-wrap" }}>{renderCaption(caption, 80)}</div>}
        {/* Image placeholder */}
        <div style={{ aspectRatio: isStory ? "9/16" : aspect, maxHeight: isStory ? 200 : undefined, background: colors.bg }} className="flex flex-col items-center justify-center p-3 relative overflow-hidden">
          {headline && <div className="text-center" style={{ color: colors.text }}>
            <div className="font-bold text-xs leading-tight">{headline}</div>
            {subline && <div className="text-[9px] mt-0.5 opacity-70">{subline}</div>}
            {cta && <div className="mt-1.5 px-2.5 py-0.5 rounded text-[8px] font-semibold" style={{ background: colors.accent, color: style === "minimal" ? "#fff" : colors.text === "#FFFFFF" ? colors.bg : "#fff" }}>{cta}</div>}
          </div>}
          {!headline && <span className="text-[9px] opacity-40" style={{ color: colors.text }}>Banner image</span>}
          {/* Post type indicator */}
          <div className="absolute bottom-1 right-1 text-[7px] text-gray-400 bg-white/80 px-1 rounded">{spec.width}x{spec.height}</div>
        </div>
        {/* Mini actions */}
        <div className="flex justify-around py-1 border-t border-gray-100 text-[9px] text-gray-400 font-medium">
          <span>Thich</span><span>Binh luan</span><span>Chia se</span>
        </div>
      </div>
    );
  }

  // Full-size mockup
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm" style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {brandLogo ? <img src={brandLogo} className="w-8 h-8 rounded-full object-contain bg-white" alt="" /> : <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{brandName?.[0]}</div>}
        <div>
          <div className="text-[13px] font-semibold text-gray-900">{brandName}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1">Duoc tai tro · <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" /></svg></div>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-2 text-[13px] text-gray-900 leading-[18px]" style={{ whiteSpace: "pre-wrap" }}>
          {renderCaption(caption, 200)}
        </div>
      )}

      {/* Image area */}
      <div style={{ aspectRatio: isStory ? "9/16" : aspect, maxHeight: isStory ? 400 : undefined, background: colors.bg }} className="flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {headline ? (
          <div className="text-center" style={{ color: colors.text }}>
            <div className="font-bold text-lg leading-tight">{headline}</div>
            {subline && <div className="text-sm mt-1 opacity-70">{subline}</div>}
            {cta && <div className="mt-3 px-5 py-1.5 rounded-md text-sm font-semibold inline-block" style={{ background: colors.accent, color: style === "minimal" ? "#fff" : colors.text === "#FFFFFF" ? colors.bg : "#fff" }}>{cta}</div>}
          </div>
        ) : (
          <span className="text-sm opacity-30" style={{ color: colors.text }}>Banner image</span>
        )}
        <div className="absolute bottom-2 right-2 text-[9px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">{spec.label} · {spec.width}x{spec.height}</div>
      </div>

      {/* Reactions */}
      <div className="px-3 py-1.5 flex justify-between items-center border-t border-gray-100">
        <div className="flex items-center gap-1">
          <span className="flex"><span className="text-[10px]">👍</span><span className="text-[10px] -ml-0.5">❤️</span></span>
          <span className="text-[11px] text-gray-500">156</span>
        </div>
        <span className="text-[11px] text-gray-500">3 binh luan</span>
      </div>
      <div className="h-px bg-gray-100 mx-3" />
      <div className="flex justify-around py-1.5 text-[12px] text-gray-500 font-semibold">
        <span>Thich</span><span>Binh luan</span><span>Chia se</span>
      </div>
    </div>
  );
}
