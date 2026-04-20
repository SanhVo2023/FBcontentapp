"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BrandConfig } from "@/lib/fb-specs";
import BrandImage from "@/components/BrandImage";
import { T } from "@/lib/ui-text";

export default function DashboardPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((b: BrandConfig[]) => {
      const arr = Array.isArray(b) ? b : [];
      setBrands(arr);
      setLoading(false);
      for (const brand of arr) {
        fetch(`/api/posts?brand=${brand.brand_id}&limit=1`).then((r) => r.json()).then((d) => {
          setPostCounts((prev) => ({ ...prev, [brand.brand_id]: d.count || 0 }));
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page title */}
      <div className="border-b border-gray-800 px-5 py-3 flex items-center gap-3">
        <h1 className="text-base font-bold"><span className="text-blue-400">Apolo</span> {T.dash_title.replace("Apolo ", "")}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-500">Supabase</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Content */}
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{T.dash_content}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/content" className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/60 transition group">
              <div className="text-xl mb-1.5">📝</div>
              <div className="font-semibold text-sm text-white group-hover:text-blue-400 transition">{T.dash_content_hub}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_content_hub_desc}</div>
            </Link>
            <Link href="/content/create" className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/60 transition group">
              <div className="text-xl mb-1.5">✨</div>
              <div className="font-semibold text-sm text-white group-hover:text-purple-400 transition">{T.dash_create}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_create_desc}</div>
            </Link>
            <Link href="/content" className="bg-gradient-to-br from-teal-600/20 to-teal-600/5 border border-teal-500/30 rounded-xl p-4 hover:border-teal-500/60 transition group">
              <div className="text-xl mb-1.5">📅</div>
              <div className="font-semibold text-sm text-white group-hover:text-teal-400 transition">{T.dash_calendar}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_calendar_desc}</div>
            </Link>
          </div>
        </div>

        {/* Image Studio */}
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{T.dash_studio}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/studio" className="bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/60 transition group">
              <div className="text-xl mb-1.5">🎨</div>
              <div className="font-semibold text-sm text-white group-hover:text-amber-400 transition">{T.dash_gen_banner}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_gen_banner_desc}</div>
            </Link>
            <Link href="/studio/batch" className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/30 rounded-xl p-4 hover:border-orange-500/60 transition group">
              <div className="text-xl mb-1.5">📦</div>
              <div className="font-semibold text-sm text-white group-hover:text-orange-400 transition">{T.dash_batch}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_batch_desc}</div>
            </Link>
            <Link href="/content/create" className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/30 rounded-xl p-4 hover:border-green-500/60 transition group">
              <div className="text-xl mb-1.5">✍️</div>
              <div className="font-semibold text-sm text-white group-hover:text-green-400 transition">{T.dash_create}</div>
              <div className="text-[11px] text-gray-500 mt-1">{T.dash_create_desc}</div>
            </Link>
          </div>
        </div>

        {/* Brands */}
        <div>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{T.dash_brands} ({brands.length})</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2].map((i) => <div key={i} className="h-20 bg-gray-900 rounded-xl animate-pulse" />)}</div>
          ) : brands.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500">No brands yet</p>
              <Link href="/brands" className="text-blue-400 text-sm mt-2 inline-block hover:underline">Add your first brand</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brands.map((b) => (
                <div key={b.brand_id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition">
                  <BrandImage src={b.logo} alt={b.brand_name} className="h-11 w-11 object-contain rounded bg-white p-1" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{b.brand_name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{b.tagline}</div>
                    {postCounts[b.brand_id] !== undefined && <div className="text-[10px] text-gray-600">{postCounts[b.brand_id]} posts</div>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/content`} className="px-2.5 py-1 rounded text-[11px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">Content</Link>
                    <Link href={`/studio`} className="px-2.5 py-1 rounded text-[11px] bg-gray-800 text-gray-400 hover:text-white">Studio</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
