"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BrandConfig, CampaignConfig } from "@/lib/fb-specs";
import { CAMPAIGN_STATUSES } from "@/lib/fb-specs";

type Props = {
  campaigns: CampaignConfig[];
  campaignsByDate: Record<string, CampaignConfig[]>;
  unscheduledCampaigns: CampaignConfig[];
  brands: BrandConfig[];
  calYear: number;
  calMonth: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onAction: (action: string, campaignId: string, extra?: Record<string, unknown>) => void;
};

export default function CampaignCalendar({ campaigns, campaignsByDate, unscheduledCampaigns, brands, calYear, calMonth, onYearChange, onMonthChange, onAction }: Props) {
  const monthName = new Date(calYear, calMonth, 1).toLocaleString("en", { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ date: string; day: number; isCurrentMonth: boolean; isToday: boolean }> = [];
    const today = new Date().toISOString().slice(0, 10);

    // Previous month overflow
    const prevMonth = new Date(calYear, calMonth, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonth.getDate() - i;
      const dt = new Date(calYear, calMonth - 1, d);
      cells.push({ date: dt.toISOString().slice(0, 10), day: d, isCurrentMonth: false, isToday: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(calYear, calMonth, d).toISOString().slice(0, 10);
      cells.push({ date: dt, day: d, isCurrentMonth: true, isToday: dt === today });
    }

    // Next month fill to complete grid
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(calYear, calMonth + 1, d);
      cells.push({ date: dt.toISOString().slice(0, 10), day: d, isCurrentMonth: false, isToday: false });
    }
    return cells;
  }, [calYear, calMonth]);

  const navigate = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    onMonthChange(m); onYearChange(y);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-800 rounded"><ChevronLeft size={16} className="text-gray-400" /></button>
          <span className="text-sm font-medium text-white min-w-[160px] text-center">{monthName}</span>
          <button onClick={() => navigate(1)} className="p-1 hover:bg-gray-800 rounded"><ChevronRight size={16} className="text-gray-400" /></button>
          <button onClick={() => { onYearChange(new Date().getFullYear()); onMonthChange(new Date().getMonth()); }} className="text-[10px] text-gray-500 hover:text-white px-2 py-0.5 rounded hover:bg-gray-800">Today</button>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] text-gray-500 uppercase py-1.5 border-b border-gray-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="flex-1 grid grid-cols-7 overflow-y-auto">
          {days.map((cell, i) => {
            const cellCampaigns = campaignsByDate[cell.date] || [];
            return (
              <div key={i} className={`min-h-[100px] border-b border-r border-gray-800/30 p-1 ${cell.isCurrentMonth ? "" : "opacity-30"} ${cell.isToday ? "ring-1 ring-inset ring-blue-500/30" : ""}`}>
                <div className={`text-[10px] mb-1 ${cell.isToday ? "text-blue-400 font-bold" : "text-gray-500"}`}>{cell.day}</div>
                {cellCampaigns.slice(0, 2).map((c) => {
                  const st = CAMPAIGN_STATUSES.find((s) => s.value === c.status);
                  return (
                    <Link key={c.id} href={`/content/campaigns/${c.id}`} className="block mb-0.5 px-1 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 truncate transition">
                      {c.name} <span className="text-gray-500">({c.post_count ?? 0})</span>
                    </Link>
                  );
                })}
                {cellCampaigns.length > 2 && <div className="text-[9px] text-gray-500 px-1">+{cellCampaigns.length - 2} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Backlog Sidebar */}
      <div className="w-72 border-l border-gray-800 overflow-y-auto p-3 hidden md:block">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">Unscheduled ({unscheduledCampaigns.length})</h3>
        <div className="space-y-2">
          {unscheduledCampaigns.slice(0, 20).map((c) => {
            const st = CAMPAIGN_STATUSES.find((s) => s.value === c.status);
            return (
              <Link key={c.id} href={`/content/campaigns/${c.id}`} className="block bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 hover:border-gray-700 transition">
                <div className="text-xs text-white font-medium truncate">{c.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-gray-500">{c.post_count ?? 0} posts</span>
                  {st && <span className={`text-[9px] ${st.color}/20 text-white px-1 py-0.5 rounded`}>{st.label}</span>}
                </div>
              </Link>
            );
          })}
          {unscheduledCampaigns.length === 0 && <p className="text-xs text-gray-600">No unscheduled campaigns</p>}
        </div>
      </div>
    </div>
  );
}
