import { NextRequest, NextResponse } from "next/server";
import { uploadBrandAsset } from "@/lib/r2-client";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, brand_id, asset_type, filename, content_type } = await req.json();
    const buffer = Buffer.from(imageBase64, "base64");
    const url = await uploadBrandAsset(buffer, brand_id, asset_type, filename, content_type || "image/png");
    return NextResponse.json({ url });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
