import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBrand } from "@/lib/db";
import { createClientSession, CLIENT_COOKIE, CLIENT_MAX_AGE } from "@/lib/client-auth";

export async function POST(req: NextRequest) {
  try {
    const { brand_id, password } = await req.json();
    if (!brand_id || !password) return NextResponse.json({ error: "Thiếu brand_id hoặc password" }, { status: 400 });

    const brand = await getBrand(brand_id);
    if (!brand) return NextResponse.json({ error: "Thương hiệu không tồn tại" }, { status: 404 });
    if (!brand.client_password) return NextResponse.json({ error: "Thương hiệu chưa bật đăng nhập khách" }, { status: 403 });
    if (brand.client_password !== password) return NextResponse.json({ error: "Mật khẩu sai" }, { status: 401 });

    const token = createClientSession(brand_id);
    const c = await cookies();
    c.set(CLIENT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: CLIENT_MAX_AGE,
    });
    return NextResponse.json({ ok: true, brand_id, brand_name: brand.brand_name });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const c = await cookies();
  c.delete(CLIENT_COOKIE);
  return NextResponse.json({ ok: true });
}

// Public GET: list brands that have client_password set (for the login dropdown).
// Does NOT leak the password — only name + id.
export async function GET() {
  try {
    // Avoid importing getBrands which returns ALL brands including password.
    // Filter in memory and strip sensitive fields.
    const { getBrands } = await import("@/lib/db");
    const brands = await getBrands();
    const pub = brands
      .filter((b) => !!b.client_password)
      .map((b) => ({ brand_id: b.brand_id, brand_name: b.brand_name, logo: b.logo }));
    return NextResponse.json(pub);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
