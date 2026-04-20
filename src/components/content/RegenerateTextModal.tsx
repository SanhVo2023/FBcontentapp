"use client";

import { X } from "lucide-react";
import type { BrandConfig } from "@/lib/fb-specs";
import PostGeneratorForm, { type GenResult } from "@/components/content/PostGeneratorForm";

type Props = {
  brand: BrandConfig;
  initial: {
    topic: string;
    angle: string;
    language: "vi" | "en" | "both";
  };
  onApply: (result: GenResult) => void;
  onClose: () => void;
};

export default function RegenerateTextModal({ brand, initial, onApply, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Tạo lại nội dung</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              AI sẽ soạn caption + text banner mới. Hình hiện tại không bị tạo lại.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1" title="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <PostGeneratorForm
            brand={brand}
            initial={initial}
            showFormat={false}
            showAdsToggle={false}
            submitLabel="Áp dụng vào bài"
            onGenerated={(result) => { onApply(result); onClose(); }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
