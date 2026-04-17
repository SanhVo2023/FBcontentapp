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
          will_run_ads: "No",
        },
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error || "GAS push failed" }, { status: 500 });
      }

      // Save sheet reference to Supabase
      await updatePost(post_id, {
        sheet_post_id: result.post_id,
        sheet_row_url: result.sheet_url,
        sheet_status: "Pending Hiển Approval",
        sheet_synced_at: new Date().toISOString(),
      });

      return NextResponse.json({ ok: true, sheet_post_id: result.post_id, sheet_url: result.sheet_url });
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

      await updatePost(post_id, {
        sheet_status: result.status,
        sheet_synced_at: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        found: true,
        status: result.status,
        legal_approved: result.legal_approved,
        content_approved: result.content_approved,
        approval_notes: result.approval_notes,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
