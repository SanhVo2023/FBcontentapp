import { cookies } from "next/headers";
import crypto from "crypto";

const CLIENT_COOKIE = "client-session";
const CLIENT_MAX_AGE = 7 * 24 * 60 * 60;

function hmac(data: string): string {
  return crypto.createHmac("sha256", process.env.APP_PASSWORD || "").update(data).digest("hex");
}

/**
 * Create a brand-scoped client session token.
 * Format: `{hmac(brandId + ts)}:{brandId}:{ts}`
 */
export function createClientSession(brandId: string): string {
  const ts = Date.now().toString();
  return `${hmac(brandId + ":" + ts)}:${brandId}:${ts}`;
}

/**
 * Verify client session token. Returns brandId if valid, else null.
 */
export function verifyClientSession(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(":");
  if (parts.length < 3) return null;
  const [sig, brandId, ts] = [parts[0], parts[1], parts.slice(2).join(":")];
  if (!sig || !brandId || !ts) return null;
  const expected = hmac(brandId + ":" + ts);
  if (sig !== expected) return null;
  const issued = parseInt(ts, 10);
  if (!Number.isFinite(issued)) return null;
  const age = (Date.now() - issued) / 1000;
  if (age > CLIENT_MAX_AGE) return null;
  return brandId;
}

export async function getClientSessionBrandId(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(CLIENT_COOKIE)?.value || null;
  return verifyClientSession(token);
}

export { CLIENT_COOKIE, CLIENT_MAX_AGE };
