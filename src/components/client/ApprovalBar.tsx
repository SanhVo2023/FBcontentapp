"use client";

import { Check, AlertTriangle, X, RotateCcw } from "lucide-react";
import type { ClientVerifyState } from "@/lib/fb-specs";

type Props = {
  verifyText: ClientVerifyState;
  verifyImage: ClientVerifyState;
  busy: string | null; // current action name in progress
  onAction: (action: "approve_text" | "approve_image" | "reject" | "revise" | "reset", note?: string) => void;
};

const pill = (label: string, active: boolean) =>
  `px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
    active === true
      ? "bg-green-500/20 text-green-300 border border-green-500/30"
      : "bg-gray-700/50 text-gray-400 border border-gray-600"
  }`;

export default function ApprovalBar({ verifyText, verifyImage, busy, onAction }: Props) {
  const textApproved = verifyText === "approved";
  const imageApproved = verifyImage === "approved";
  const anyRejected = verifyText === "rejected" || verifyImage === "rejected";
  const anyRevise = verifyText === "revise" || verifyImage === "revise";
  const bothApproved = textApproved && imageApproved;

  const ask = (label: string) => {
    const note = window.prompt(label);
    return note === null ? null : note;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Trạng thái duyệt:</span>
        <span className={pill("Text", textApproved)}>Nội dung {textApproved ? "✓" : ""}</span>
        <span className={pill("Image", imageApproved)}>Hình ảnh {imageApproved ? "✓" : ""}</span>
        {bothApproved && <span className="ml-auto text-[11px] text-green-400 font-semibold">Đã duyệt toàn bộ ✓</span>}
        {anyRejected && <span className="ml-auto text-[11px] text-red-400 font-semibold">Bị từ chối</span>}
        {anyRevise && <span className="ml-auto text-[11px] text-amber-400 font-semibold">Cần chỉnh sửa</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction("approve_text")}
          disabled={busy !== null || textApproved}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            textApproved
              ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700"
          }`}
        >
          <Check size={14} />
          {textApproved ? "Đã duyệt nội dung" : "Duyệt nội dung"}
        </button>
        <button
          onClick={() => onAction("approve_image")}
          disabled={busy !== null || imageApproved}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            imageApproved
              ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700"
          }`}
        >
          <Check size={14} />
          {imageApproved ? "Đã duyệt hình" : "Duyệt hình ảnh"}
        </button>
        <button
          onClick={() => { const n = ask("Cần sửa gì? (tùy chọn — sẽ gửi đến team nội dung)"); if (n !== null) onAction("revise", n); }}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-sm rounded-lg border border-amber-500/30"
        >
          <AlertTriangle size={14} />
          Cần sửa
        </button>
        <button
          onClick={() => { const n = ask("Lý do từ chối? (tùy chọn)"); if (n !== null) onAction("reject", n); }}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm rounded-lg border border-red-500/30"
        >
          <X size={14} />
          Từ chối
        </button>
        {(anyRejected || anyRevise || textApproved || imageApproved) && (
          <button
            onClick={() => onAction("reset")}
            disabled={busy !== null}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-white text-xs"
            title="Đặt lại trạng thái duyệt"
          >
            <RotateCcw size={12} />
            Đặt lại
          </button>
        )}
      </div>

      {busy && <div className="text-[11px] text-gray-500">Đang xử lý...</div>}
    </div>
  );
}
