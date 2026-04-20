"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, Image, Building2, Trash2, LogOut } from "lucide-react";
import { T } from "@/lib/ui-text";

type NavItem = { href: string; icon: React.ComponentType<{ size?: number }>; label: string };

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: T.nav_dashboard },
  { href: "/content", icon: FileText, label: T.nav_content },
  { href: "/studio", icon: Image, label: T.nav_studio },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/brands", icon: Building2, label: T.nav_brands },
  { href: "/trash", icon: Trash2, label: T.nav_trash },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No shell for login or client portal
  if (pathname === "/" || pathname.startsWith("/client")) return <>{children}</>;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const renderItem = (item: NavItem, dim: boolean) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative group ${
          active
            ? "bg-blue-600/15 text-blue-400"
            : dim
              ? "text-gray-600 hover:text-gray-300 hover:bg-gray-800"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
        }`}
      >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r" />}
        <item.icon size={20} />
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-gray-700">
          {item.label}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar — primary / secondary groups separated by a divider */}
      <nav className="hidden lg:flex flex-col w-14 bg-gray-900/80 border-r border-gray-800 shrink-0">
        <div className="h-14 flex items-center justify-center border-b border-gray-800">
          <span className="text-blue-400 font-bold text-lg">A</span>
        </div>

        <div className="flex-1 flex flex-col items-center py-3 gap-1">
          {PRIMARY_NAV.map((item) => renderItem(item, false))}

          <div className="w-6 h-px bg-gray-800 my-2" aria-hidden />

          {SECONDARY_NAV.map((item) => renderItem(item, true))}
        </div>

        <div className="pb-3 flex flex-col items-center">
          <button
            onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/"; }}
            title="Đăng xuất"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden pb-14 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav — primary items first, no grouping (screen too narrow) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 flex items-center justify-around px-2 z-50">
        {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                active ? "text-blue-400" : "text-gray-500"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
