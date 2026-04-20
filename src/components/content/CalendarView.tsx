"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import type { BrandConfig, PostConfig } from "@/lib/fb-specs";
import { CONTENT_TYPES } from "@/lib/fb-specs";
import IconButton from "@/components/ui/IconButton";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), isCurrentMonth: false });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d.toISOString().slice(0, 10), day: i, isCurrentMonth: true });
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - startOffset - daysInMonth + 1);
    days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), isCurrentMonth: false });
  }
  return days;
}

type Props = {
  posts: PostConfig[];
  postsByDate: Record<string, PostConfig[]>;
  unscheduledPosts: PostConfig[];
  thumbnails: Record<string, string>;
  brands: BrandConfig[];
  calYear: number;
  calMonth: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onAction: (action: string, postId: string, extra?: Record<string, unknown>) => void;
};

export default function CalendarView(props: Props) {
  const days = getDaysInMonth(props.calYear, props.calMonth);
  const today = new Date().toISOString().slice(0, 10);

  const prevMonth = () => {
    if (props.calMonth === 0) { props.onMonthChange(11); props.onYearChange(props.calYear - 1); }
    else props.onMonthChange(props.calMonth - 1);
  };
  const nextMonth = () => {
    if (props.calMonth === 11) { props.onMonthChange(0); props.onYearChange(props.calYear + 1); }
    else props.onMonthChange(props.calMonth + 1);
  };
  const goToday = () => { props.onMonthChange(new Date().getMonth()); props.onYearChange(new Date().getFullYear()); };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <IconButton icon={ChevronLeft} label="Previous month" variant="default" size="md" onClick={prevMonth} />
          <h2 className="text-base font-bold min-w-[160px] text-center">{MONTHS[props.calMonth]} {props.calYear}</h2>
          <IconButton icon={ChevronRight} label="Next month" variant="default" size="md" onClick={nextMonth} />
          <button onClick={goToday} title="Go to today" className="flex items-center gap-1 px-2.5 py-1 bg-gray-800/50 rounded-lg text-[11px] text-gray-400 hover:text-white transition ml-2">
            <CalendarCheck size={13} /> Today
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px mb-px">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[10px] text-gray-500 py-1.5 font-semibold uppercase tracking-wider">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-800/30 rounded-xl overflow-hidden">
          {days.map((day) => {
            const dayPosts = props.postsByDate[day.date] || [];
            const isToday = day.date === today;
            return (
              <div key={day.date} className={`min-h-[120px] p-1.5 transition ${day.isCurrentMonth ? "bg-gray-900/80" : "bg-gray-950/60"} ${isToday ? "ring-1 ring-inset ring-blue-500/40" : ""}`}>
                <div className={`text-[11px] mb-1 font-medium ${day.isCurrentMonth ? "text-gray-400" : "text-gray-700"} ${isToday ? "text-blue-400 font-bold" : ""}`}>
                  {day.day}
                  {isToday && <span className="ml-1 text-[8px] text-blue-400/60">today</span>}
                </div>

                {dayPosts.slice(0, 3).map((p) => {
                  const ct = CONTENT_TYPES.find((c) => c.value === p.content_type);
                  const thumb = props.thumbnails[p.id];
                  return (
                    <Link key={p.id} href={`/content/${p.id}`} className="w-full text-left mb-1 rounded-lg overflow-hidden transition hover:ring-1 hover:ring-blue-500/50 block">
                      <div className="flex items-center gap-1.5 bg-gray-800/70 rounded-lg p-1">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                        ) : (
                          ct && <div className={`w-1.5 h-6 rounded-full ${ct.color} shrink-0`} />
                        )}
                        <span className="text-[9px] text-gray-300 truncate leading-tight">{p.title?.slice(0, 22) || p.text_overlay?.headline?.slice(0, 18)}</span>
                      </div>
                    </Link>
                  );
                })}
                {dayPosts.length > 3 && <div className="text-[8px] text-gray-600 text-center mt-0.5">+{dayPosts.length - 3}</div>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-3 flex-wrap">
          {CONTENT_TYPES.map((ct) => (
            <div key={ct.value} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className={`w-2 h-2 rounded-full ${ct.color}`} />{ct.label}
            </div>
          ))}
        </div>
      </div>

      {/* Backlog sidebar — unscheduled posts awaiting a date */}
      <div className="w-[320px] border-l border-gray-800 overflow-y-auto hidden md:block">
        <div className="p-4">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase mb-3">Chưa xếp lịch ({props.unscheduledPosts.length})</h3>
          {props.unscheduledPosts.length === 0 ? (
            <p className="text-[11px] text-gray-600 text-center py-6">Tất cả bài đã có ngày đăng</p>
          ) : (
            <div className="space-y-2">
              {props.unscheduledPosts.slice(0, 20).map((p) => {
                const ct = CONTENT_TYPES.find((c) => c.value === p.content_type);
                const thumb = props.thumbnails[p.id];
                return (
                  <Link key={p.id} href={`/content/${p.id}`} className="w-full text-left bg-gray-900/50 border border-gray-800/30 rounded-lg p-2.5 hover:border-gray-700 transition block">
                    <div className="flex items-center gap-2.5">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <span className="text-sm shrink-0">{ct?.emoji || "📝"}</span>
                      )}
                      <div className="min-w-0">
                        <span className="text-[11px] text-white truncate block">{p.title || "Untitled"}</span>
                        <span className="text-[9px] text-gray-500 truncate block">{p.caption_vi?.slice(0, 35) || p.topic}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
