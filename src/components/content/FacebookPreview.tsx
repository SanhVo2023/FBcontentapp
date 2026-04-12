"use client";

import BrandImage from "@/components/BrandImage";

type Props = {
  brandName: string;
  brandLogo?: string;
  caption: string;
  imageUrl?: string | null;
  headline?: string;
  subline?: string;
  cta?: string;
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
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (year === now.getFullYear()) {
    return `${day} tháng ${month} lúc ${hours}:${minutes}`;
  }
  return `${day} tháng ${month}, ${year}`;
}

function renderCaption(text: string) {
  if (!text) return null;
  // Split into lines and highlight hashtags
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} style={{ color: "#1877F2" }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// SVG icons matching Facebook's style
const ThumbUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const CommentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm6.918 6h-3.215a16.01 16.01 0 0 0-1.286-3.74A8.03 8.03 0 0 1 18.918 8zM12 4.04c.756 1.024 1.357 2.18 1.756 3.46h-3.512c.4-1.28 1-2.436 1.756-3.46zM4.26 14a7.82 7.82 0 0 1 0-4h3.482a16.8 16.8 0 0 0 0 4H4.26zm.822 2h3.215a16.01 16.01 0 0 0 1.286 3.74A8.03 8.03 0 0 1 5.082 16zm3.215-8H5.082a8.03 8.03 0 0 1 4.335-3.74A16.01 16.01 0 0 0 8.297 8zM12 19.96c-.756-1.024-1.357-2.18-1.756-3.46h3.512c-.4 1.28-1 2.436-1.756 3.46zM14.172 14H9.828a14.86 14.86 0 0 1 0-4h4.344a14.86 14.86 0 0 1 0 4zm.245 5.74A16.01 16.01 0 0 0 15.703 16h3.215a8.03 8.03 0 0 1-4.501 3.74zM16.258 14a16.8 16.8 0 0 0 0-4h3.482a7.82 7.82 0 0 1 0 4h-3.482z" />
  </svg>
);

export default function FacebookPreview({
  brandName,
  brandLogo,
  caption,
  imageUrl,
  headline,
  subline,
  cta,
  timestamp,
  sponsored,
}: Props) {
  const timeText = sponsored ? "Được tài trợ" : formatVietnameseTime(timestamp);
  const showSeeMore = caption.split("\n").length > 7 || caption.length > 400;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
        backgroundColor: "#FFFFFF",
        border: "1px solid #E4E6EB",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <BrandImage
          src={brandLogo}
          alt={brandName}
          className="w-10 h-10 rounded-full object-contain bg-white"
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#050505", lineHeight: "20px" }}>
            {brandName}
          </div>
          <div style={{ fontSize: 13, color: "#65676B", lineHeight: "16px", display: "flex", alignItems: "center", gap: 4 }}>
            {timeText}
            <span style={{ color: "#65676B" }}> · </span>
            <GlobeIcon />
          </div>
        </div>
      </div>

      {/* Caption */}
      <div
        style={{
          padding: "0 16px 12px",
          fontSize: 15,
          lineHeight: "20px",
          color: "#050505",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          ...(showSeeMore ? { maxHeight: 140, overflow: "hidden", position: "relative" as const } : {}),
        }}
      >
        {caption ? renderCaption(caption) : (
          <span style={{ color: "#65676B" }}>Nội dung bài viết sẽ xuất hiện ở đây...</span>
        )}
        {showSeeMore && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: "linear-gradient(transparent, #FFFFFF)",
              display: "flex",
              alignItems: "flex-end",
              paddingLeft: 16,
              paddingBottom: 2,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#65676B", cursor: "pointer" }}>
              Xem thêm
            </span>
          </div>
        )}
      </div>

      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="Post" style={{ width: "100%", display: "block" }} />
      ) : (
        <div
          style={{
            backgroundColor: "#F0F2F5",
            height: 260,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {headline ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#050505", lineHeight: "26px" }}>{headline}</div>
              {subline && <div style={{ fontSize: 14, color: "#65676B", marginTop: 6 }}>{subline}</div>}
              {cta && (
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-block",
                    padding: "8px 20px",
                    backgroundColor: "#1877F2",
                    color: "#FFFFFF",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {cta}
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 14, color: "#65676B" }}>Hình ảnh bài viết</span>
          )}
        </div>
      )}

      {/* Reaction summary */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #E4E6EB",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* Reaction emojis */}
          <span style={{ display: "flex" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid white", zIndex: 3 }}>👍</span>
            <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#F33E58", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: -4, border: "2px solid white", zIndex: 2 }}>❤️</span>
            <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "#F7B928", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: -4, border: "2px solid white", zIndex: 1 }}>😮</span>
          </span>
          <span style={{ fontSize: 15, color: "#65676B", marginLeft: 4 }}>156</span>
        </div>
        <div style={{ fontSize: 15, color: "#65676B" }}>
          3 bình luận · 1 lượt chia sẻ
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: "#E4E6EB", margin: "0 16px" }} />

      {/* Action buttons */}
      <div style={{ padding: "4px 16px", display: "flex", justifyContent: "space-around" }}>
        {[
          { icon: <ThumbUpIcon />, label: "Thích" },
          { icon: <CommentIcon />, label: "Bình luận" },
          { icon: <ShareIcon />, label: "Chia sẻ" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 0",
              margin: "0 2px",
              borderRadius: 4,
              background: "transparent",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              color: "#65676B",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0F2F5")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
