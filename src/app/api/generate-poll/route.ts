import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";

// Lightweight poller — client hits this every ~2s while a job is pending.
// Returns just the job status fields, not the whole payload, to keep
// responses small and fast.

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    status: job.status,
    result: job.result || null,
    error: job.error || null,
  });
}
