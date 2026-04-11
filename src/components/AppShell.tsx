"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, Image, Building2, Trash2, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/content", icon: FileText, label: "Content" },
  { href: "/studio", icon: Image, label: "Studio" },
  { href: "/brands", icon: Building2, label: "Brands" },
  { href: "/trash", icon: Trash2, label: "Trash" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No shell for login page
  if (pathname === "/") return <>{children}</>;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col w-14 bg-gray-900/80 border-r border-gray-800 shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-gray-800">
          <span className="text-blue-400 font-bold text-lg">A</span>
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col items-center py-3 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative group ${
                  active
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }`}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r" />}
                <item.icon size={20} />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border border-gray-700">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="pb-3 flex flex-col items-center">
          <button
            onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.href = "/"; }}
            title="Logout"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-14 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.map((item) => {
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
