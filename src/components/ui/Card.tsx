import { SURFACE, cn } from "@/lib/design-tokens";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING = {
  none: "",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
} as const;

export default function Card({ padding = "md", className, children, ...rest }: CardProps) {
  return (
    <div className={cn(SURFACE.card, PADDING[padding], className)} {...rest}>
      {children}
    </div>
  );
}
