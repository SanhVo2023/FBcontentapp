import { NextRequest, NextResponse } from "next/server";
import { getBrands, saveBrand, deleteBrandCascade, getBrandReferenceCount } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const countId = req.nextUrl.searchParams.get("count");
    if (countId) {
      const counts = await getBrandReferenceCount(countId);
      return NextResponse.json(counts);
    }
    const brands = await getBrands();
    return NextResponse.json(brands);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Delete action via brand_id (from brands page)
    if (body.brand_id && !body.brand) {
      await deleteBrandCascade(body.brand_id);
      return NextResponse.json({ ok: true });
    }
    // Save brand
    if (body.brand) {
      await saveBrand(body.brand);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { brand_id } = await req.json();
    await deleteBrandCascade(brand_id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
