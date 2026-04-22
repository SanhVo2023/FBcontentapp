import { NextRequest, NextResponse } from "next/server";
import { extractDesignLanguage } from "@/lib/design-extractor";
import { fetchR2AsBase64 } from "@/lib/r2-client";
import type { BrandConfig } from "@/lib/fb-specs";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, imageUrl, brand } = (await req.json()) as {
      imageBase64?: string;
      mimeType?: string;
      imageUrl?: string;
      brand: BrandConfig;
    };

    if (!brand?.brand_name) return NextResponse.json({ error: "Thiếu brand" }, { status: 400 });

    // Accept either raw base64 (from upload) or a URL (e.g. a brand reference already on R2).
    let b64 = imageBase64 || "";
    let mt = mimeType || "image/png";
    if (!b64 && imageUrl) {
      const asset = await fetchR2AsBase64(imageUrl);
      b64 = asset.base64;
      mt = asset.mimeType;
    }
    if (!b64) return NextResponse.json({ error: "Thiếu ảnh tham khảo" }, { status: 400 });

    const design = await extractDesignLanguage(b64, mt, brand);
    return NextResponse.json(design);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
