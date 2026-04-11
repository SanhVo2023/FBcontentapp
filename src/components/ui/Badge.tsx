type Size = "sm" | "md";

const sizeStyles: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[9px]",
  md: "px-2 py-0.5 text-[10px]",
};

type Props = {
  color?: string;
  children: React.ReactNode;
  size?: Size;
  dot?: boolean;
  className?: string;
};

export default function Badge({ color = "bg-gray-600", children, size = "sm", dot = false, className = "" }: Props) {
  if (dot) {
    return (
      <span className={`flex items-center gap-1 ${sizeStyles[size]} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />
        {children}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded ${color}/20 text-white ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
