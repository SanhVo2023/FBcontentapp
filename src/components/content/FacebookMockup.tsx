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
  contactInfo?: string;
};

const STYLE_THEMES: Record<string, { bg: string; grad: string; text: string; accent: string; overlay: string }> = {
  professional: { bg: "#1E3A5F", grad: "linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)", text: "#FFFFFF", accent: "#63B3ED", overlay: "rgba(30,58,95,0.85)" },
  bold: { bg: "#B91C1C", grad: "linear-gradient(135deg, #991B1B 0%, #DC2626 50%, #F87171 100%)", text: "#FFFFFF", accent: "#FCD34D", overlay: "rgba(185,28,28,0.85)" },
  minimal: { bg: "#F9FAFB", grad: "linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%)", text: "#111827", accent: "#6B7280", overlay: "rgba(249,250,251,0.95)" },
  warm: { bg: "#92400E", grad: "linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)", text: "#FFFFFF", accent: "#FDE68A", overlay: "rgba(146,64,14,0.85)" },
  "dark-luxury": { bg: "#0A0A0F", grad: "linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #16213E 100%)", text: "#FFFFFF", accent: "#C5A55A", overlay: "rgba(10,10,15,0.9)" },
  vibrant: { bg: "#4F46E5", grad: "linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #818CF8 100%)", text: "#FFFFFF", accent: "#F59E0B", overlay: "rgba(79,70,229,0.85)" },
  editorial: { bg: "#1F2937", grad: "linear-gradient(135deg, #111827 0%, #1F2937 50%, #374151 100%)", text: "#FFFFFF", accent: "#A78BFA", overlay: "rgba(31,41,55,0.9)" },
};

function truncateCaption(text: string, maxLen = 80): string {
  if (!text || text.length <= maxLen) return text || "";
  return text.slice(0, maxLen) + "...";
}

export default function FacebookMockup({ brandName, brandLogo, caption, headline, subline, cta, postType = "feed-square", style = "professional", contactInfo }: Props) {
  const spec = getPostSpec(postType);
  const theme = STYLE_THEMES[style] || STYLE_THEMES["dark-luxury"];
  const isStory = postType === "story";
  const isWide = postType === "feed-wide" || postType === "ad-landscape" || postType === "cover";

  const bannerHeight = isStory ? 280 : isWide ? 160 : 220;

  // Render caption with hashtag highlighting
  const captionDisplay = truncateCaption(caption || "", 90);
  const captionParts = captionDisplay.split(/(#\S+)/g);

  return (
    <div style={{ background: "#242526", borderRadius: 8, overflow: "hidden", fontFamily: '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* FB Post Header */}
      <div style={{ padding: "10px 12px 6px", display: "flex", alignItems: "center", gap: 8 }}>
        {brandLogo ? (
          <img src={brandLogo} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "contain", background: "#fff", padding: 1 }} alt="" />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1A1A2E", display: "flex", alignItems: "center", justifyContent: "center", color: "#C5A55A", fontWeight: 700, fontSize: 13 }}>{brandName?.[0]}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E4E6EB", lineHeight: "17px" }}>{brandName}</div>
          <div style={{ fontSize: 11, color: "#B0B3B8", lineHeight: "14px", display: "flex", alignItems: "center", gap: 3 }}>
            Vừa xong · <svg width="10" height="10" viewBox="0 0 24 24" fill="#B0B3B8"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" /></svg>
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#B0B3B8"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
      </div>

      {/* Caption */}
      {caption && (
        <div style={{ padding: "0 12px 8px", fontSize: 13, lineHeight: "18px", color: "#E4E6EB", whiteSpace: "pre-wrap" }}>
          {captionParts.map((part, i) =>
            part.startsWith("#") ? <span key={i} style={{ color: "#4599FF" }}>{part}</span> : <span key={i}>{part}</span>
          )}
          {(caption?.length || 0) > 90 && <span style={{ color: "#B0B3B8", fontWeight: 500 }}> Xem thêm</span>}
        </div>
      )}

      {/* Banner Image Area */}
      <div style={{ width: "100%", height: bannerHeight, background: theme.grad, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Decorative elements */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `${theme.accent}15` }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: `${theme.accent}10` }} />

        {/* Brand logo in banner */}
        {brandLogo && (
          <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <img src={brandLogo} style={{ height: 22, objectFit: "contain", filter: style === "minimal" ? "none" : "brightness(1.1)" }} alt="" />
          </div>
        )}

        {/* Headline area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 14px", position: "relative", zIndex: 1 }}>
          {headline ? (
            <>
              <div style={{ fontSize: isWide ? 15 : 17, fontWeight: 800, color: theme.text, lineHeight: 1.2, textShadow: style === "minimal" ? "none" : "0 1px 3px rgba(0,0,0,0.3)", maxWidth: "75%" }}>
                {headline}
              </div>
              {subline && (
                <div style={{ fontSize: isWide ? 10 : 11, color: theme.text, opacity: 0.8, marginTop: 4, fontStyle: "italic", maxWidth: "70%" }}>
                  {subline}
                </div>
              )}
              {cta && (
                <div style={{ marginTop: 8, display: "inline-flex", alignSelf: "flex-start" }}>
                  <span style={{ padding: "4px 14px", background: theme.accent, color: theme.bg === "#F9FAFB" ? "#fff" : "#000", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
                    {cta}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: 11, color: theme.text, opacity: 0.3, fontWeight: 500 }}>{spec.width} x {spec.height}</div>
              <div style={{ fontSize: 10, color: theme.text, opacity: 0.2, marginTop: 2 }}>{spec.label}</div>
            </div>
          )}
        </div>

        {/* Contact bar */}
        <div style={{ background: theme.overlay, padding: "5px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 8, color: theme.accent, borderTop: `1px solid ${theme.accent}30` }}>
          <span>📍 108 Trần Đình Xu, Q.1, TP.HCM</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>📞 (028) 66.701.709</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>🌐 apolo.com.vn</span>
        </div>
      </div>

      {/* Reactions bar */}
      <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "flex" }}>
            <span style={{ fontSize: 11 }}>👍</span>
            <span style={{ fontSize: 11, marginLeft: -2 }}>❤️</span>
            <span style={{ fontSize: 11, marginLeft: -2 }}>😮</span>
          </span>
          <span style={{ fontSize: 11, color: "#B0B3B8" }}>156</span>
        </div>
        <span style={{ fontSize: 11, color: "#B0B3B8" }}>3 bình luận · 1 chia sẻ</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#3E4042", margin: "0 12px" }} />

      {/* Action buttons */}
      <div style={{ display: "flex", padding: "2px 12px" }}>
        {["👍 Thích", "💬 Bình luận", "↗ Chia sẻ"].map((label) => (
          <div key={label} style={{ flex: 1, textAlign: "center", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#B0B3B8", cursor: "pointer" }}>
            {label}
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div style={{ padding: "6px 12px 8px", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #3E4042" }}>
        {brandLogo ? (
          <img src={brandLogo} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "contain", background: "#fff", padding: 1 }} alt="" />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3A3B3C" }} />
        )}
        <div style={{ flex: 1, background: "#3A3B3C", borderRadius: 16, padding: "5px 10px", fontSize: 11, color: "#B0B3B8" }}>
          Bình luận dưới tên {brandName}
        </div>
      </div>
    </div>
  );
}
