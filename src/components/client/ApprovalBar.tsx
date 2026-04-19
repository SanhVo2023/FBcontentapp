"use client";

import { Check, AlertTriangle, X, RotateCcw, Megaphone, Type as TypeIcon, Image as ImageIcon } from "lucide-react";
import type { ClientVerifyState } from "@/lib/fb-specs";

type Action = "approve_text" | "approve_image" | "approve_ads" | "reject" | "revise" | "reset";

type Props = {
  verifyText: ClientVerifyState;
  verifyImage: ClientVerifyState;
  verifyAds?: ClientVerifyState;
  showAdsStep?: boolean;
  busy: string | null;
  onAction: (action: Action, note?: string) => void;
};

type StepConfig = {
  key: "text" | "image" | "ads";
  label: string;
  state: ClientVerifyState;
  action: Action;
  Icon: React.ComponentType<{ size?: number }>;
};

export default function ApprovalBar({ verifyText, verifyImage, verifyAds = "pending", showAdsStep, busy, onAction }: Props) {
  const steps: StepConfig[] = [
    { key: "text", label: "Duyệt nội dung", state: verifyText, action: "approve_text", Icon: TypeIcon },
    { key: "image", label: "Duyệt hình ảnh", state: verifyImage, action: "approve_image", Icon: ImageIcon },
  ];
  if (showAdsStep) steps.push({ key: "ads", label: "Duyệt quảng cáo", state: verifyAds, action: "approve_ads", Icon: Megaphone });

  const allApproved = steps.every((s) => s.state === "approved");
  const anyRejected = steps.some((s) => s.state === "rejected");
  const anyRevise = steps.some((s) => s.state === "revise");
  const anyTouched = steps.some((s) => s.state !== "pending");

  const ask = (label: string) => {
    const note = window.prompt(label, "");
    return note === null ? null : note;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Trạng thái duyệt:</span>
        {allApproved && <span className="text-[11px] text-green-400 font-semibold">✓ Đã duyệt toàn bộ</span>}
        {!allApproved && anyRejected && <span className="text-[11px] text-red-400 font-semibold">Có mục bị từ chối</span>}
        {!allApproved && !anyRejected && anyRevise && <span className="text-[11px] text-amber-400 font-semibold">Có mục cần sửa</span>}
        {!allApproved && !anyRejected && !anyRevise && <span className="text-[11px] text-gray-500">Đang chờ bạn duyệt</span>}
      </div>

      {/* Approve toggle buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {steps.map(({ key, label, state, action, Icon }) => {
          const approved = state === "approved";
          const rejected = state === "rejected";
          const revise = state === "revise";
          const isBusy = busy === action;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onAction(action)}
              disabled={busy !== null}
              title={approved ? "Click để bỏ duyệt" : "Click để duyệt"}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition border ${
                approved
                  ? "bg-green-500/15 text-green-300 border-green-500/40 hover:bg-green-500/25"
                  : rejected
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : revise
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-gray-600"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {approved ? <Check size={14} /> : <Icon size={14} />}
              <span>
                {approved ? `Đã duyệt ${label.replace("Duyệt ", "")}` : label}
              </span>
              {isBusy && <span className="text-[10px] opacity-60">...</span>}
            </button>
          );
        })}
      </div>

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-800">
        <button
          type="button"
          onClick={() => { const n = ask("Cần sửa gì? (tùy chọn — team sẽ nhận được ghi chú này)"); if (n !== null) onAction("revise", n); }}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs rounded-lg border border-amber-500/30"
        >
          <AlertTriangle size={12} />
          Cần sửa tất cả
        </button>
        <button
          type="button"
          onClick={() => { const n = ask("Lý do từ chối? (tùy chọn)"); if (n !== null) onAction("reject", n); }}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs rounded-lg border border-red-500/30"
        >
          <X size={12} />
          Từ chối tất cả
        </button>
        {anyTouched && (
          <button
            type="button"
            onClick={() => onAction("reset")}
            disabled={busy !== null}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-white text-xs transition"
            title="Đặt lại toàn bộ trạng thái duyệt về chờ"
          >
            <RotateCcw size={12} />
            Đặt lại
          </button>
        )}
      </div>

      <div className="text-[10px] text-gray-600">
        💡 Click vào nút đã duyệt để bỏ duyệt. Team chỉ nhận được trạng thái cuối cùng.
      </div>
    </div>
  );
}
