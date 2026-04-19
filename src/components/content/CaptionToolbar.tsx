"use client";

import { useRef, useState } from "react";
import type { BrandConfig } from "@/lib/fb-specs";
import { T } from "@/lib/ui-text";

type Props = {
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  brand?: BrandConfig | null;
  language: "vi" | "en";
};

const QUICK_EMOJI = ["📝", "⚖️", "✅", "⚠️", "🔥", "📞", "💼", "👉", "💡", "📍", "🏠", "📅", "🎯", "💬", "⭐", "🔔"];

function buildContactBlock(brand: BrandConfig | null | undefined, language: "vi" | "en"): string {
  const name = brand?.brand_name || (language === "vi" ? "APOLO LAWYERS" : "APOLO LAWYERS");
  if (language === "vi") {
    return `\n_______\n${name.toUpperCase()}\nĐịa chỉ: 108 Trần Đình Xu, Phường Cầu Ông Lãnh, TP. Hồ Chí Minh\nĐiện thoại: (028) 66.701.709 | 0908.043.086\nHotline: 0903.600.347\n_______\nCHI NHÁNH ĐÔNG SÀI GÒN\nĐịa chỉ: Tầng 09, Tòa nhà K&M, 33 Ung Văn Khiêm, Phường Thạnh Mỹ Tây, TP.HCM\nĐiện thoại: (028) 35.059.349 | 0908.097.068\nHotline: 0979.48.98.79\n_______\nTổng đài tư vấn: 0903.419.479\nEmail: contact@apolo.com.vn\n`;
  }
  return `\n_______\n${name.toUpperCase()} - Solicitors & Litigators\nAddress: 108 Tran Dinh Xu, Cau Ong Lanh Ward, Ho Chi Minh City\nPhone: (028) 66.701.709 | 0908.043.086\nHotline: 0903.600.347\n_______\nEAST SAIGON BRANCH\nAddress: Floor 09, K&M Tower, 33 Ung Van Khiem, HCMC\nPhone: (028) 35.059.349 | 0908.097.068\nHotline: 0979.48.98.79\n_______\nConsultation: 0903.419.479\nEmail: contact@apolo.com.vn\n`;
}

const HASHTAGS_VI = "\n#dichvuluatsu #luatsu #apololawyers #tuvanphapluat #luatsuHCM";
const HASHTAGS_EN = "\n#LegalService #Lawyer #ApoloLawyers #LegalAdvice #LawyerHCMC";

export default function CaptionToolbar({ value, onChange, textareaRef, brand, language }: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + snippet); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    // Restore caret after React re-render
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + snippet.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmoji(false);
  };

  const handleClear = () => {
    if (value.trim() && !confirm(T.toolbar_clear_confirm)) return;
    onChange("");
  };

  const btn = "px-2 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition min-w-[32px] min-h-[32px] flex items-center justify-center";

  return (
    <div className="flex flex-wrap gap-1 mb-1.5 items-center relative">
      {/* Emoji picker */}
      <div className="relative">
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} title={T.toolbar_emoji} className={btn}>😀</button>
        {showEmoji && (
          <div ref={emojiRef} className="absolute top-full left-0 mt-1 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 grid grid-cols-8 gap-1">
            {QUICK_EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => handleEmoji(e)} className="w-8 h-8 hover:bg-gray-800 rounded text-lg">{e}</button>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => insertAtCursor("\n✅ \n✅ \n✅ ")} title={T.toolbar_checklist} className={btn}>✅</button>
      <button type="button" onClick={() => insertAtCursor("\n1️⃣ \n2️⃣ \n3️⃣ ")} title={T.toolbar_numbered} className={btn}>1️⃣</button>
      <button type="button" onClick={() => insertAtCursor(buildContactBlock(brand, language))} title={T.toolbar_contact} className={btn}>📞</button>
      <button type="button" onClick={() => insertAtCursor(language === "vi" ? HASHTAGS_VI : HASHTAGS_EN)} title={T.toolbar_hashtags} className={btn}>#</button>
      <button type="button" onClick={() => insertAtCursor("\n_______\n")} title={T.toolbar_divider} className={btn}>━</button>
      <div className="ml-auto">
        <button type="button" onClick={handleClear} title={T.toolbar_clear} className="px-2 py-1 text-[10px] text-gray-500 hover:text-red-400 transition">Aa</button>
      </div>
    </div>
  );
}
