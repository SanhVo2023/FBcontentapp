import { NextRequest, NextResponse } from "next/server";
import { fetchR2AsBase64 } from "@/lib/r2-client";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const asset = await fetchR2AsBase64(url);
    return NextResponse.json(asset);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Not found" }, { status: 404 });
  }
}
