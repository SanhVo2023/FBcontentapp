import type { ReactNode } from "react";
import { TEXT, cn } from "@/lib/design-tokens";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/40", className)}>
      <div className="min-w-0">
        <h1 className={cn(TEXT.display, "truncate")}>{title}</h1>
        {subtitle && <p className={cn(TEXT.caption, "mt-0.5 truncate")}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
