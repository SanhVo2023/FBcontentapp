// Byteplus Ark / Seedream 5.0 image generation client.
// API docs: https://docs.byteplus.com/en/docs/ModelArk/1824121
// Endpoint: POST https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
// The key lives in ARK_API_KEY (Netlify env var + .env.local for dev).
//
// Important: Seedream 5.0 (model "seedream-5-0-260128") accepts size in
// TWO formats:
//   1. Preset strings "2K" / "3K" / "4K" — BUT only on some model variants.
//      The 5.0 main model will reject these with:
//        "size must be one of 'WIDTHxHEIGHT' ..."
//   2. Explicit dimensions "WIDTHxHEIGHT" (e.g. "1024x1024", "1280x672").
// We always pass explicit dimensions to be safe across variants.
//
// Response shape (per docs) is OpenAI-style:
//   { model, created, data: [{ url, size }], usage: {...} }

const ARK_URL = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
// Seedream 4.5 full model (not lite). Per docs:
//   - Min pixel count: 2560×1440 = 3,686,400
//   - Max pixel count: 4096×4096 = 16,777,216
//   - Aspect ratio must be within [1/16, 16]
//   - Preset "2K" / "4K" also accepted; we use explicit dimensions to pin
//     the aspect ratio per FB post type.
const MODEL_ID = "seedream-4-5-251128";

export type SeedreamFormat = "png" | "jpeg";

type ArkSuccess = {
  model?: string;
  created?: number;
  data?: Array<{ url?: string; size?: string; b64_json?: string }>;
  // Legacy/alternate shapes (kept for resilience in case Seedream updates).
  image_url?: string;
  images?: Array<string | { url?: string; b64_json?: string }>;
};

type ArkError = {
  error?: { code?: string; message?: string };
  message?: string;
};

export async function generateImageSeedream(input: {
  prompt: string;
  /** Explicit dimensions as "WIDTHxHEIGHT" (e.g. "1024x1024"). Required. */
  size: string;
  outputFormat?: SeedreamFormat;
  image?: string | string[];
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY chưa cấu hình — thêm vào Netlify env và .env.local");

  const outputFormat = input.outputFormat || "png";

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    prompt: input.prompt,
    size: input.size,
    output_format: outputFormat,
    watermark: false,
  };
  if (input.image) body.image = input.image;

  const res = await fetch(ARK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[seedream] HTTP", res.status, "response:", text.slice(0, 500));
    let msg = `Seedream HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as ArkError;
      msg = j.error?.message || j.message || msg;
    } catch { /* fall back to status */ }
    throw new Error(msg);
  }

  let json: ArkSuccess;
  try {
    json = JSON.parse(text) as ArkSuccess;
  } catch {
    console.error("[seedream] non-JSON response:", text.slice(0, 500));
    throw new Error("Seedream trả về phản hồi không hợp lệ");
  }

  // Primary shape per docs: { data: [{ url }] }
  let imageUrl: string | undefined;
  let inlineB64: string | undefined;

  if (json.data?.length) {
    imageUrl = json.data[0].url;
    inlineB64 = json.data[0].b64_json;
  }
  if (!imageUrl && !inlineB64 && json.image_url) imageUrl = json.image_url;
  if (!imageUrl && !inlineB64 && json.images?.length) {
    const first = json.images[0];
    if (typeof first === "string") imageUrl = first;
    else { imageUrl = first.url; inlineB64 = first.b64_json; }
  }

  if (!imageUrl && !inlineB64) {
    console.error("[seedream] unexpected success shape:", text.slice(0, 500));
    throw new Error("Seedream trả về không có ảnh");
  }

  const mimeType = outputFormat === "jpeg" ? "image/jpeg" : "image/png";

  if (inlineB64) {
    return { buffer: Buffer.from(inlineB64, "base64"), mimeType };
  }

  const imgRes = await fetch(imageUrl!);
  if (!imgRes.ok) {
    console.error("[seedream] image fetch failed", imgRes.status, imageUrl);
    throw new Error(`Seedream image fetch HTTP ${imgRes.status}`);
  }
  const arrayBuf = await imgRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), mimeType };
}

/**
 * Map the FB spec dimensions to a Seedream 4.5-compatible size string.
 * Seedream 4.5 REQUIRES w*h >= 3,686,400 pixels — we target just above that
 * floor to keep generation within Netlify's function timeout while
 * preserving each post type's aspect ratio. Sharp downscales to the exact
 * FB spec afterwards.
 */
export function seedreamSizeForSpec(width: number, height: number): string {
  const aspect = width / height;
  // Pinned sizes per common FB aspect ratio, all ≥3.7 MP.
  if (Math.abs(aspect - 1) < 0.05)  return "2048x2048";  // 4.19 MP — square, carousel, ad-square
  if (aspect > 2.5)                 return "3136x1216";  // 3.81 MP — cover (2.63:1)
  if (aspect > 1.5)                 return "2656x1408";  // 3.74 MP — wide, ad-landscape (≈1.91:1)
  if (aspect < 0.7)                 return "1472x2624";  // 3.86 MP — story / reel (9:16)
  // Fallback: derive from aspect, land just above the 3,686,400-px floor.
  const targetPixels = 3_800_000;
  let h = Math.max(1440, Math.round(Math.sqrt(targetPixels / aspect) / 32) * 32);
  let w = Math.max(1440, Math.round((h * aspect) / 32) * 32);
  // Safety: if rounding knocked us under the floor, bump up.
  while (w * h < 3_686_400) { h += 32; w = Math.round((h * aspect) / 32) * 32; }
  return `${w}x${h}`;
}
