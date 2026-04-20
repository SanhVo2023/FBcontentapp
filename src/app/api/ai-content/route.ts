import { NextRequest, NextResponse } from "next/server";
import {
  generateCaptions, suggestVariations, generateWeekContent,
  suggestLegalContext, createPostFromContext, createImagePromptFromContent,
  generateFullPost, composePost,
} from "@/lib/gemini-text";
import type { BrandConfig } from "@/lib/fb-specs";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, brand } = body as { action: string; brand: BrandConfig; [key: string]: unknown };

    switch (action) {
      case "auto_caption": {
        const result = await generateCaptions(body.prompt as string, brand, (body.language as "vi" | "en" | "both") || "both");
        return NextResponse.json(result);
      }
      case "suggest_variations": {
        const variations = await suggestVariations(body.prompt as string, brand);
        return NextResponse.json({ variations });
      }
      case "generate_week": {
        const posts = await generateWeekContent(brand, body.week_start as string);
        return NextResponse.json({ posts });
      }
      case "suggest_context": {
        const result = await suggestLegalContext(body.service_area as string, body.topic as string, brand);
        return NextResponse.json(result);
      }
      case "create_post": {
        const result = await createPostFromContext(
          body.service_area as string, body.content_type as string,
          body.topic as string, body.legal_context as string,
          body.language as string, brand
        );
        return NextResponse.json(result);
      }
      case "create_image_prompt": {
        const prompt = await createImagePromptFromContent(body.caption as string, body.headline as string, brand);
        return NextResponse.json({ prompt });
      }
      case "generate_full_post": {
        const result = await generateFullPost(
          body.topic as string, body.post_type as string || "post",
          body.angle as string || "educational", body.language as string || "both", brand
        );
        return NextResponse.json(result);
      }
      case "compose_post": {
        const result = await composePost(brand, body.input as Parameters<typeof composePost>[1]);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 500 });
  }
}
