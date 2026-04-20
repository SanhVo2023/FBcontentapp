"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

type Props = {
  title: string;
  description: string;
  placeholder: string;
  onImport: (data: unknown) => void;
  onClose: () => void;
  validate?: (data: unknown) => string | null;
  /** AI prompt to copy so the user can paste into ChatGPT / Claude / Gemini to produce a JSON matching this importer's schema */
  copyPrompt?: string;
};

export default function ImportJsonModal({ title, description, placeholder, onImport, onClose, validate, copyPrompt }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleParse = () => {
    setError(null);
    setPreview(null);
    try {
      let clean = text.trim();
      if (clean.startsWith("```")) {
        clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(clean);

      if (validate) {
        const err = validate(parsed);
        if (err) { setError(err); return; }
      }

      const count = Array.isArray(parsed) ? parsed.length : 1;
      setPreview(`Parsed: ${count} ${count === 1 ? "item" : "items"}`);
      onImport(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleCopyPrompt = async () => {
    if (!copyPrompt) return;
    try {
      await navigator.clipboard.writeText(copyPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setError("Không thể copy vào clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {copyPrompt && (
              <button
                onClick={handleCopyPrompt}
                title="Copy AI prompt — dán vào ChatGPT/Claude/Gemini để tạo JSON đúng schema"
                className={`px-2.5 py-1.5 text-[11px] rounded-lg border inline-flex items-center gap-1.5 transition ${
                  promptCopied
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border-purple-500/30"
                }`}
              >
                {promptCopied ? <><Check size={12} /> Đã chép!</> : <><Copy size={12} /> Copy AI Prompt</>}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1" title="Đóng"><X size={14} /></button>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={15}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white font-mono placeholder-gray-600 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
          />

          {error && <div className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}
          {preview && <div className="mt-3 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded px-3 py-2">{preview}</div>}
        </div>

        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700">Hủy</button>
          <button onClick={handleParse} disabled={!text.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:bg-gray-700 disabled:text-gray-500">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
