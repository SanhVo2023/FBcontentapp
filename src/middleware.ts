import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE = "fb-banner-session";
const CLIENT_COOKIE = "client-session";

// API routes that are PUBLIC (no auth of any kind)
const PUBLIC_API = ["/api/auth", "/api/client-auth"];

// API routes that require the CLIENT session (brand-scoped)
const CLIENT_API_PREFIXES = ["/api/client-posts", "/api/client-comments"];

// Pages that require the CLIENT session
const CLIENT_PAGE_PREFIXES = ["/client/dashboard", "/client/post"];

async function verifyAdminToken(token: string, password: string): Promise<boolean> {
  const [hash, ts] = token.split(":");
  if (!hash || !ts) return false;
  if (Date.now() - parseInt(ts) > 7 * 24 * 60 * 60 * 1000) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(ts));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === hash;
}

async function verifyClientToken(token: string, password: string): Promise<string | null> {
  const parts = token.split(":");
  if (parts.length < 3) return null;
  const [sig, brandId, ...rest] = parts;
  const ts = rest.join(":");
  if (!sig || !brandId || !ts) return null;
  const issued = parseInt(ts, 10);
  if (!Number.isFinite(issued)) return null;
  if (Date.now() - issued > 7 * 24 * 60 * 60 * 1000) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(brandId + ":" + ts));
  const expected = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === sig ? brandId : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.APP_PASSWORD || "";

  // ── Public ── no auth needed
  if (PUBLIC_API.some((p) => pathname === p)) return NextResponse.next();
  if (pathname === "/client" || pathname === "/") return NextResponse.next();

  // ── Client-scoped routes ──
  const isClientPage = CLIENT_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  const isClientApi = CLIENT_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (isClientPage || isClientApi) {
    const token = req.cookies.get(CLIENT_COOKIE)?.value;
    const brandId = token ? await verifyClientToken(token, password) : null;
    if (!brandId) {
      if (isClientApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/client", req.url));
    }
    // Forward brand id as a header for downstream routes
    const res = NextResponse.next();
    res.headers.set("x-client-brand-id", brandId);
    return res;
  }

  // ── Admin-scoped routes ── everything else under /api/ or protected pages
  const isAdminRoute =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/content") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/generate") ||
    pathname.startsWith("/batch") ||
    pathname.startsWith("/brands") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/trash") ||
    pathname.startsWith("/calendar");

  if (!isAdminRoute) return NextResponse.next();

  const session = req.cookies.get(ADMIN_COOKIE)?.value;
  const valid = session ? await verifyAdminToken(session, password) : false;
  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/content/:path*",
    "/studio/:path*",
    "/generate/:path*",
    "/batch/:path*",
    "/brands/:path*",
    "/templates/:path*",
    "/trash/:path*",
    "/calendar/:path*",
    "/client/:path*",
    "/api/:path*",
  ],
};
