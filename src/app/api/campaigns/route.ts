import { NextRequest, NextResponse } from "next/server";
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  trashCampaign,
  getCampaignPosts,
  getCampaignSummaries,
  type CampaignFilters,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filters: CampaignFilters = {};

    if (params.get("brand")) filters.brandId = params.get("brand")!;
    if (params.get("status")) {
      const s = params.get("status")!;
      filters.status = s.includes(",") ? s.split(",") : s;
    }
    if (params.get("search")) filters.search = params.get("search")!;
    if (params.get("date_from")) filters.dateFrom = params.get("date_from")!;
    if (params.get("date_to")) filters.dateTo = params.get("date_to")!;
    if (params.get("sort")) filters.sortBy = params.get("sort") as CampaignFilters["sortBy"];
    if (params.get("order")) filters.sortOrder = params.get("order") as CampaignFilters["sortOrder"];
    if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);
    if (params.get("offset")) filters.offset = parseInt(params.get("offset")!);

    // Single campaign by ID
    if (params.get("id")) {
      const campaign = await getCampaign(params.get("id")!);
      return NextResponse.json(campaign);
    }

    // Campaign posts
    if (params.get("campaign_id") && params.get("include") === "posts") {
      const posts = await getCampaignPosts(params.get("campaign_id")!);
      return NextResponse.json({ posts });
    }

    const { campaigns, count } = await getCampaigns(filters);

    // Enrich with summaries
    if (campaigns.length && params.get("include") !== "none") {
      const summaries = await getCampaignSummaries(campaigns.map((c) => c.id));
      for (const c of campaigns) {
        const s = summaries[c.id];
        if (s) {
          c.post_count = s.post_count;
          c.image_count = s.image_count;
          c.thumbnails = s.thumbnails;
        }
      }
    }

    return NextResponse.json({ campaigns, count });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const campaign = await createCampaign(body.campaign);
      return NextResponse.json(campaign);
    }

    if (action === "update") {
      const campaign = await updateCampaign(body.campaign_id, body.updates);
      return NextResponse.json(campaign);
    }

    if (action === "trash") {
      await trashCampaign(body.campaign_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await deleteCampaign(body.campaign_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
