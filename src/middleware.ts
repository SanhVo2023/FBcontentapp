import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "fb-banner-session";
const PROTECTED = ["/dashboard", "/content", "/studio", "/generate", "/batch", "/brands", "/templates", "/trash", "/calendar", "/api/brands", "/api/posts", "/api/generate", "/api/upload", "/api/gas-status", "/api/brand-asset", "/api/ai-content", "/api/trash"];

async function verify(token: string, password: string): Promise<boolean> {
  const [hash, ts] = token.split(":");
  if (!hash || !ts) return false;
  if (Date.now() - parseInt(ts) > 7 * 24 * 60 * 60 * 1000) return false;

  // Web Crypto API (works in Edge runtime)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(ts));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === hash;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip auth for login endpoint
  if (pathname === "/api/auth") return NextResponse.next();

  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = req.cookies.get(COOKIE_NAME)?.value;
  const valid = session ? await verify(session, process.env.APP_PASSWORD || "") : false;

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/content/:path*", "/studio/:path*", "/generate/:path*", "/batch/:path*", "/brands/:path*", "/templates/:path*", "/trash/:path*", "/calendar/:path*", "/api/:path*"] };
