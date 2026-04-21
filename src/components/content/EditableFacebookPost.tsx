"use client";

import { useState } from "react";
import { Copy, Download, Link as LinkIcon, Check } from "lucide-react";
import BrandImage from "@/components/BrandImage";
import { downloadImage } from "@/lib/download";

type Props = {
  brandName: string;
  brandLogo?: string;
  caption: string;
  imageUrl?: string | null;
  onCaptionClick?: () => void;
  onImageClick?: () => void;
  editingCaption?: boolean;
  onCaptionChange?: (v: string) => void;
  captionTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onCaptionBlur?: () => void;
  language?: "vi" | "en";
  onLanguageChange?: (lang: "vi" | "en") => void;
  showLanguageToggle?: boolean;
  timestamp?: string;
  sponsored?: boolean;
};

function formatVietnameseTime(isoString?: string): string {
  if (!isoString) return "Vừa xong";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Vừa xong";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  if (diffHour < 24) return `${diffHour} giờ`;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day} tháng ${month}`;
}

function renderCaption(text: string) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? <span key={i} style={{ color: "#1877F2" }}>{part}</span> : <span key={i}>{part}</span>
  );
}

const ThumbUpIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>;
const CommentIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const ShareIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>;
const GlobeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.6"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm6.918 6h-3.215a16.01 16.01 0 0 0-1.286-3.74A8.03 8.03 0 0 1 18.918 8z" /></svg>;

type ToolbarFlash = "caption" | "url" | "download" | null;

export default function EditableFacebookPost({
  brandName, brandLogo, caption, imageUrl,
  onCaptionClick, onImageClick,
  editingCaption, onCaptionChange, captionTextareaRef, onCaptionBlur,
  language, onLanguageChange, showLanguageToggle,
  timestamp, sponsored,
}: Props) {
  const timeText = sponsored ? "Được tài trợ" : formatVietnameseTime(timestamp);
  const [flash, setFlash] = useState<ToolbarFlash>(null);
  const flashFor = (k: Exclude<ToolbarFlash, null>) => { setFlash(k); setTimeout(() => setFlash(null), 1500); };

  const handleCopyCaption = async () => {
    if (!caption) return;
    try { await navigator.clipboard.writeText(caption); flashFor("caption"); } catch { /* ignore */ }
  };
  const handleCopyUrl = async () => {
    if (!imageUrl) return;
    try { await navigator.clipboard.writeText(imageUrl); flashFor("url"); } catch { /* ignore */ }
  };
  const handleDownload = async () => {
    if (!imageUrl) return;
    try { await downloadImage(imageUrl); flashFor("download"); } catch { /* ignore */ }
  };

  return (
    <div className="max-w-[540px] mx-auto">
      {/* Toolbar — quick utilities that don't belong inside the FB mockup chrome */}
      <div className="mb-2 flex items-center justify-end gap-1.5 text-[11px]">
        <button
          type="button"
          onClick={handleCopyCaption}
          disabled={!caption}
          title="Copy caption"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            flash === "caption"
              ? "bg-green-500/15 text-green-300 border-green-500/40"
              : "bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700"
          }`}
        >
          {flash === "caption" ? <Check size={11} /> : <Copy size={11} />}
          {flash === "caption" ? "Đã chép!" : "Copy caption"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!imageUrl}
          title="Tải ảnh về máy"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            flash === "download"
              ? "bg-green-500/15 text-green-300 border-green-500/40"
              : "bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700"
          }`}
        >
          {flash === "download" ? <Check size={11} /> : <Download size={11} />}
          {flash === "download" ? "Đã tải" : "Tải ảnh"}
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          disabled={!imageUrl}
          title="Copy URL ảnh"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed ${
            flash === "url"
              ? "bg-green-500/15 text-green-300 border-green-500/40"
              : "bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700"
          }`}
        >
          {flash === "url" ? <Check size={11} /> : <LinkIcon size={11} />}
          {flash === "url" ? "Đã chép URL" : "Copy URL ảnh"}
        </button>
      </div>

      {/* FB post */}
      <div
        style={{
          fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
          backgroundColor: "#FFFFFF",
          border: "1px solid #E4E6EB",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <BrandImage src={brandLogo} alt={brandName} className="w-10 h-10 rounded-full object-contain bg-white" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#050505", lineHeight: "20px" }}>{brandName}</div>
            <div style={{ fontSize: 13, color: "#65676B", lineHeight: "16px", display: "flex", alignItems: "center", gap: 4 }}>
              {timeText}
              <span> · </span>
              <GlobeIcon />
            </div>
          </div>
          {showLanguageToggle && onLanguageChange && (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => onLanguageChange("vi")} style={{ padding: "3px 8px", fontSize: 11, fontWeight: 600, borderRadius: 4, border: language === "vi" ? "1px solid #1877F2" : "1px solid #E4E6EB", background: language === "vi" ? "#E7F3FF" : "transparent", color: language === "vi" ? "#1877F2" : "#65676B", cursor: "pointer" }}>VI</button>
              <button onClick={() => onLanguageChange("en")} style={{ padding: "3px 8px", fontSize: 11, fontWeight: 600, borderRadius: 4, border: language === "en" ? "1px solid #1877F2" : "1px solid #E4E6EB", background: language === "en" ? "#E7F3FF" : "transparent", color: language === "en" ? "#1877F2" : "#65676B", cursor: "pointer" }}>EN</button>
            </div>
          )}
        </div>

        {/* Caption - click to edit */}
        {editingCaption ? (
          <div style={{ padding: "0 16px 12px" }}>
            <textarea
              ref={captionTextareaRef}
              value={caption}
              onChange={(e) => onCaptionChange?.(e.target.value)}
              onBlur={onCaptionBlur}
              autoFocus
              rows={Math.max(6, Math.min(24, caption.split("\n").length + 1))}
              style={{
                width: "100%",
                fontSize: 15,
                lineHeight: "20px",
                color: "#050505",
                border: "2px solid #1877F2",
                borderRadius: 6,
                padding: "8px 12px",
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none",
                background: "#FFFFFF",
                whiteSpace: "pre-wrap",
              }}
              placeholder="Nhập nội dung bài viết..."
            />
            <p style={{ fontSize: 11, color: "#65676B", marginTop: 4 }}>Nhấn ra ngoài để lưu, Esc để hủy</p>
          </div>
        ) : (
          <div
            onClick={onCaptionClick}
            style={{
              padding: "0 16px 12px",
              fontSize: 15,
              lineHeight: "20px",
              color: "#050505",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              cursor: onCaptionClick ? "pointer" : "default",
              minHeight: 40,
              position: "relative",
            }}
            className={onCaptionClick ? "group/caption hover:bg-blue-50/50 rounded transition" : ""}
          >
            {caption ? renderCaption(caption) : (
              <span style={{ color: "#65676B", fontStyle: "italic" }}>
                {onCaptionClick ? "Click để viết nội dung bài..." : "Chưa có nội dung"}
              </span>
            )}
            {onCaptionClick && (
              <span className="absolute top-0 right-2 text-[10px] text-blue-500 opacity-0 group-hover/caption:opacity-100 transition">✏️ Click để sửa</span>
            )}
          </div>
        )}

        {/* Image - click to edit */}
        <div
          onClick={onImageClick}
          style={{
            position: "relative",
            cursor: onImageClick ? "pointer" : "default",
          }}
          className={onImageClick ? "group/image" : ""}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ width: "100%", display: "block" }} />
          ) : (
            <div style={{ backgroundColor: "#F0F2F5", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 48, opacity: 0.2 }}>🖼️</span>
              <span style={{ fontSize: 13, color: "#65676B" }}>
                {onImageClick ? "Click để tạo hình ảnh" : "Chưa có hình"}
              </span>
            </div>
          )}
          {onImageClick && imageUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition flex items-center justify-center">
              <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">🎨 Click để chỉnh sửa hình</span>
            </div>
          )}
        </div>

        {/* Reactions */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #E4E6EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "flex" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid white" }}>👍</span>
              <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#F33E58", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: -4, border: "2px solid white" }}>❤️</span>
            </span>
            <span style={{ fontSize: 15, color: "#65676B", marginLeft: 4 }}>156</span>
          </div>
          <div style={{ fontSize: 15, color: "#65676B" }}>3 bình luận · 1 chia sẻ</div>
        </div>

        {/* Actions */}
        <div style={{ height: 1, backgroundColor: "#E4E6EB", margin: "0 16px" }} />
        <div style={{ padding: "4px 16px", display: "flex", justifyContent: "space-around" }}>
          {[{ icon: <ThumbUpIcon />, label: "Thích" }, { icon: <CommentIcon />, label: "Bình luận" }, { icon: <ShareIcon />, label: "Chia sẻ" }].map(({ icon, label }) => (
            <button key={label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", margin: "0 2px", borderRadius: 4, background: "transparent", border: "none", fontSize: 15, fontWeight: 600, color: "#65676B", cursor: "pointer" }}>
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
