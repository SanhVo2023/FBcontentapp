"use client";

import { useState } from "react";

type Props = {
  title: string;
  description: string;
  placeholder: string;
  onImport: (data: unknown) => void;
  onClose: () => void;
  validate?: (data: unknown) => string | null; // return error message or null
};

export default function ImportJsonModal({ title, description, placeholder, onImport, onClose, validate }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleParse = () => {
    setError(null);
    setPreview(null);
    try {
      // Clean up: strip markdown code fences if present
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
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
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700">Cancel</button>
          <button onClick={handleParse} disabled={!text.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:bg-gray-700 disabled:text-gray-500">
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
