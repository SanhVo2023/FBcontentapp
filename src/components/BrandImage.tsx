"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export default function BrandImage({ src, alt, className = "h-8 w-8 rounded object-contain", fallbackClassName }: Props) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const initials = alt?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bgColor = alt ? `hsl(${alt.charCodeAt(0) * 7 % 360}, 40%, 30%)` : "#374151";

  if (error || !src) {
    return (
      <div className={`${fallbackClassName || className} flex items-center justify-center text-white font-bold text-xs`} style={{ background: bgColor }} title={src || "No image"}>
        {initials}
      </div>
    );
  }

  return (
    <div className="relative inline-flex">
      {loading && (
        <div className={`${className} bg-gray-800 animate-pulse`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? "absolute opacity-0" : ""}`}
        onError={() => { setError(true); setLoading(false); }}
        onLoad={() => setLoading(false)}
        title={src}
      />
    </div>
  );
}
