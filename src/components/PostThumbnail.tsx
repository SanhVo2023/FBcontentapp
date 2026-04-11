import { CONTENT_TYPES } from "@/lib/fb-specs";

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<Size, string> = {
  sm: "w-8 h-8 rounded",
  md: "w-full aspect-video rounded-lg",
  lg: "w-full aspect-video rounded-xl",
};

type Props = {
  url?: string;
  contentType?: string;
  size?: Size;
  className?: string;
};

export default function PostThumbnail({ url, contentType, size = "md", className = "" }: Props) {
  const ct = CONTENT_TYPES.find((c) => c.value === contentType);

  if (url) {
    return (
      <div className={`${sizeStyles[size]} overflow-hidden bg-gray-800 ${className}`}>
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${sizeStyles[size]} overflow-hidden bg-gray-800/60 flex items-center justify-center ${className}`}>
      <span className={size === "sm" ? "text-xs" : "text-lg"}>{ct?.emoji || "📝"}</span>
    </div>
  );
}
