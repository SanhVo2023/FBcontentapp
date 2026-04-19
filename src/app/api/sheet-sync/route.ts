import { NextRequest, NextResponse } from "next/server";
import { getPost, updatePost, getPostImages } from "@/lib/db";
import { getPostSpec } from "@/lib/fb-specs";

export const maxDuration = 60;

const GAS_URL = process.env.GAS_WEBAPP_URL || "";
const GAS_SECRET = process.env.GAS_SHARED_SECRET || "";

function ensureConfigured() {
  if (!GAS_URL || !GAS_SECRET) {
    throw new Error("Sheet sync chưa được cấu hình. Thiếu GAS_WEBAPP_URL hoặc GAS_SHARED_SECRET.");
  }
}

async function callGasPost(payload: Record<string, unknown>) {
  ensureConfigured();
  const res = await fetch(GAS_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: GAS_SECRET }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GAS trả về không phải JSON: ${text.slice(0, 120)}`);
  }
}

async function callGasGet(params: Record<string, string>) {
  ensureConfigured();
  const qs = new URLSearchParams({ ...params, token: GAS_SECRET });
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, {
    method: "GET",
    redirect: "follow",
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GAS trả về không phải JSON: ${text.slice(0, 120)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, post_id } = body as { action: string; post_id: string };

    if (!post_id) return NextResponse.json({ error: "Thiếu post_id" }, { status: 400 });

    if (action === "push_post") {
      const post = await getPost(post_id);
      if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });

      // Get first image URL if any
      let image_url = "";
      try {
        const images = await getPostImages(post_id);
        const approved = images.find((i) => i.approved && i.status === "done");
        const first = approved || images.find((i) => i.status === "done");
        if (first?.r2_url) image_url = first.r2_url;
      } catch { /* ok */ }

      const spec = getPostSpec(post.type);
      const lang = post.language === "en" ? "en" : "vi";
      const caption = lang === "en" ? (post.caption_en || post.caption_vi || "") : (post.caption_vi || post.caption_en || "");

      // Build ads block if enabled
      const adsBlock = post.ads_enabled ? {
        enabled: true,
        name: post.ads_name || post.title || `Ads - ${post.topic || post.id}`,
        objective: post.ads_objective || "Awareness",
        audience: post.ads_audience || "",
        audience_detail: post.ads_audience_detail || "",
        placement: post.ads_placement || "Feed",
        cta: post.ads_cta || "Liên hệ",
        landing_url: post.ads_landing_url || "",
        budget_per_day: post.ads_budget_per_day || 0,
        duration_days: post.ads_duration_days || 7,
        start_date: post.scheduled_date || new Date().toISOString().slice(0, 10),
      } : null;

      const result = await callGasPost({
        action: "create_post",
        data: {
          app_id: post.id,
          language: lang,
          fanpage: lang === "vi" ? "Apolo VN" : "Apolo EN",
          planned_date: post.scheduled_date || new Date().toISOString().slice(0, 10),
          channel: "Facebook",
          format: spec.label,
          topic: post.topic || post.title || "",
          caption,
          hashtags: "",
          image_url,
          assignee: "Như Ý",
          needs_legal: post.legal_context ? "Yes" : "No",
          will_run_ads: post.ads_enabled ? "Yes" : "No",
          ads: adsBlock,
        },
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error || "GAS push failed" }, { status: 500 });
      }

      // Save sheet reference to Supabase and mark post as submitted
      await updatePost(post_id, {
        status: "submitted",
        sheet_post_id: result.post_id,
        sheet_row_url: result.sheet_url,
        sheet_status: "Pending Hiển Approval",
        sheet_synced_at: new Date().toISOString(),
        ads_campaign_id: result.ads?.campaign_id || undefined,
      });

      return NextResponse.json({ ok: true, sheet_post_id: result.post_id, sheet_url: result.sheet_url, ads_campaign_id: result.ads?.campaign_id });
    }

    if (action === "bulk_pull") {
      const postIds = (body.post_ids as string[]) || [];
      const results: Record<string, { status?: string; approval_notes?: string; found: boolean }> = {};
      // Process sequentially to avoid GAS rate limiting
      for (const pid of postIds) {
        try {
          const post = await getPost(pid);
          if (!post) continue;
          const r = await callGasGet({ action: "get_status", app_id: pid });
          if (r?.ok && r.found) {
            await updatePost(pid, { sheet_status: r.status, sheet_synced_at: new Date().toISOString() });
            // Auto-move post status based on sheet approval
            if (r.status === "Approved" && post.status === "submitted") {
              await updatePost(pid, { status: "approved" });
            } else if ((r.status === "Rejected" || r.status === "Revise") && post.status === "submitted") {
              await updatePost(pid, { status: "draft" });
            }
            results[pid] = { status: r.status, approval_notes: r.approval_notes, found: true };
          } else {
            results[pid] = { found: false };
          }
        } catch {
          results[pid] = { found: false };
        }
      }
      return NextResponse.json({ ok: true, results });
    }

    if (action === "pull_status") {
      const post = await getPost(post_id);
      if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });

      const result = await callGasGet({ action: "get_status", app_id: post_id });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Không lấy được trạng thái" }, { status: 500 });
      }
      if (!result.found) {
        return NextResponse.json({ ok: true, found: false });
      }

      const updates: Record<string, unknown> = {
        sheet_status: result.status,
        sheet_synced_at: new Date().toISOString(),
      };
      // Auto-move status based on sheet approval when post is in submitted state
      if (result.status === "Approved" && post.status === "submitted") {
        updates.status = "approved";
      } else if ((result.status === "Rejected" || result.status === "Revise") && post.status === "submitted") {
        updates.status = "draft";
      }
      await updatePost(post_id, updates);

      return NextResponse.json({
        ok: true,
        found: true,
        status: result.status,
        legal_approved: result.legal_approved,
        content_approved: result.content_approved,
        approval_notes: result.approval_notes,
        new_app_status: updates.status || post.status,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
