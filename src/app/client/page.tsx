"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type PublicBrand = { brand_id: string; brand_name: string; logo?: string };

export default function ClientLoginPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [brandId, setBrandId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client-auth")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) { setBrands(data); if (data.length) setBrandId(data[0].brand_id); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !password) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/client-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không đăng nhập được");
      router.push("/client/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📘</div>
            <h1 className="text-xl font-bold text-white">Cổng duyệt nội dung</h1>
            <p className="text-xs text-gray-500 mt-1">Đăng nhập để xem và duyệt các bài đang chờ</p>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">Đang tải...</div>
          ) : brands.length === 0 ? (
            <div className="text-center text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              Chưa có thương hiệu nào bật đăng nhập khách.<br />
              Liên hệ quản trị viên.
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Thương hiệu</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  {brands.map((b) => (
                    <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  placeholder="Nhập mật khẩu khách"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
                />
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">{error}</div>}

              <button
                type="submit"
                disabled={submitting || !password}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold rounded-lg text-sm transition"
              >
                {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-[10px] text-gray-600">
            Apolo Content Studio · Client Portal
          </div>
        </div>
      </div>
    </div>
  );
}
