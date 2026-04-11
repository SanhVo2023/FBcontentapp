import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "fb-banner-session";
const MAX_AGE = 7 * 24 * 60 * 60;

function hmac(data: string): string {
  return crypto.createHmac("sha256", process.env.APP_PASSWORD || "").update(data).digest("hex");
}

export function createSession(): string {
  const ts = Date.now().toString();
  return `${hmac(ts)}:${ts}`;
}

export function checkPassword(password: string): boolean {
  return password === process.env.APP_PASSWORD;
}

export async function getSession(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value || null;
}

export { COOKIE_NAME, MAX_AGE };
