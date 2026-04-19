"use client";

import { Lock, Target, Users, MapPin, MousePointerClick, ExternalLink, Calendar, DollarSign, Megaphone } from "lucide-react";
import type { PostConfig } from "@/lib/fb-specs";

type Props = {
  post: PostConfig;
};

function fmtNumber(n: number | undefined | null): string {
  if (!n) return "—";
  return Number(n).toLocaleString("vi-VN");
}

export default function AdsCampaignCard({ post }: Props) {
  if (!post.ads_enabled) return null;

  const budget = post.ads_budget_per_day || 0;
  const days = post.ads_duration_days || 0;
  const total = budget * days;

  const rows: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: React.ReactNode }[] = [
    { icon: Megaphone, label: "Tên chiến dịch", value: post.ads_name || <span className="text-gray-600">—</span> },
    { icon: Target, label: "Mục tiêu", value: post.ads_objective || <span className="text-gray-600">—</span> },
    { icon: Users, label: "Đối tượng", value: post.ads_audience || <span className="text-gray-600">—</span> },
    ...(post.ads_audience_detail ? [{ icon: Users, label: "Chi tiết đối tượng", value: post.ads_audience_detail }] : []),
    { icon: MapPin, label: "Vị trí hiển thị", value: post.ads_placement || <span className="text-gray-600">—</span> },
    { icon: MousePointerClick, label: "Nút CTA", value: post.ads_cta || <span className="text-gray-600">—</span> },
  ];

  return (
    <div className="bg-gradient-to-br from-orange-500/5 via-gray-900/40 to-gray-900/40 border border-orange-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-orange-500/20 bg-orange-500/5 flex items-center gap-2">
        <Megaphone size={16} className="text-orange-400" />
        <span className="text-sm font-semibold text-orange-200">Chiến dịch quảng cáo</span>
        {post.ads_campaign_id && (
          <span className="text-[10px] text-orange-300/70 bg-orange-500/10 px-2 py-0.5 rounded">
            {post.ads_campaign_id}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Budget — read-only, locked */}
        <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
          <Lock size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">Ngân sách (do team quản lý)</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Mỗi ngày</div>
                <div className="text-gray-200 font-medium mt-0.5">{fmtNumber(budget)}₫</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Số ngày</div>
                <div className="text-gray-200 font-medium mt-0.5">{days || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Tổng ngân sách</div>
                <div className="text-orange-300 font-semibold mt-0.5">{fmtNumber(total)}₫</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 italic">
              Nếu muốn thay đổi ngân sách, trao đổi với team qua bình luận bên dưới.
            </p>
          </div>
        </div>

        {/* Other ads fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-gray-900/40 border border-gray-800/60">
              <Icon size={12} className="text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 uppercase">{label}</div>
                <div className="text-gray-200 text-sm mt-0.5 break-words">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Landing URL (if present) */}
        {post.ads_landing_url && (
          <a
            href={post.ads_landing_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 transition"
          >
            <ExternalLink size={12} />
            <span className="truncate flex-1">{post.ads_landing_url}</span>
          </a>
        )}

        {/* Schedule */}
        {post.scheduled_date && (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400">
            <Calendar size={12} />
            <span>Bắt đầu chạy: <span className="text-gray-200">{post.scheduled_date}</span></span>
          </div>
        )}

        <div className="text-[10px] text-gray-500 italic border-t border-gray-800 pt-2">
          💡 Tất cả các mục trên (trừ ngân sách) có thể trao đổi qua bình luận bên dưới.
        </div>
      </div>
    </div>
  );
}
