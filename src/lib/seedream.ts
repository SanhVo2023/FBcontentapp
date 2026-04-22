// Byteplus Ark / Seedream 5.0 image generation client.
// API reference: https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
// The key lives in ARK_API_KEY (Netlify env var + .env.local for dev).

const ARK_URL = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
const MODEL_ID = "seedream-5-0-260128";

export type SeedreamSize = "1K" | "2K" | "3K" | "4K";
export type SeedreamFormat = "png" | "jpeg";

type ArkSuccess = {
  // Seedream responses include a single image_url for single-image generations,
  // plus a parallel `data` / `images` array for multi-image cases. We only
  // need one image per call, so we accept either shape.
  image_url?: string;
  data?: Array<{ url?: string; b64_json?: string }>;
  images?: Array<string | { url?: string; b64_json?: string }>;
  request_id?: string;
  model_version?: string;
};

type ArkError = {
  error?: { code?: string; message?: string };
  message?: string;
};

export async function generateImageSeedream(input: {
  prompt: string;
  size?: SeedreamSize;
  outputFormat?: SeedreamFormat;
  image?: string | string[]; // optional — base64 or URL; we don't pass this from creative mode
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("ARK_API_KEY chưa cấu hình — thêm vào Netlify env và .env.local");

  const outputFormat = input.outputFormat || "png";
  const size = input.size || "2K";

  const body: Record<string, unknown> = {
    model: MODEL_ID,
    prompt: input.prompt,
    size,
    output_format: outputFormat,
    watermark: false,
    // Ask Seedream for inline base64 whenever possible — avoids a second
    // round-trip to a CDN URL that might be region-locked or short-lived.
    response_format: "b64_json",
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
    // Surface the raw response body to server logs so we can debug failures
    // that don't match ArkError's shape.
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

  // Pull the first image out of the union of shapes Seedream can return.
  let imageUrl: string | undefined;
  let inlineB64: string | undefined;

  if (json.image_url) imageUrl = json.image_url;
  if (json.data?.length) {
    imageUrl = imageUrl || json.data[0].url;
    inlineB64 = inlineB64 || json.data[0].b64_json;
  }
  if (json.images?.length) {
    const first = json.images[0];
    if (typeof first === "string") imageUrl = imageUrl || first;
    else { imageUrl = imageUrl || first.url; inlineB64 = inlineB64 || first.b64_json; }
  }

  if (!imageUrl && !inlineB64) {
    console.error("[seedream] unexpected success shape:", text.slice(0, 500));
    throw new Error("Seedream trả về không có ảnh");
  }

  const mimeType = outputFormat === "jpeg" ? "image/jpeg" : "image/png";

  if (inlineB64) {
    return { buffer: Buffer.from(inlineB64, "base64"), mimeType };
  }

  // Fallback: fetch the hosted image → bytes.
  const imgRes = await fetch(imageUrl!);
  if (!imgRes.ok) {
    console.error("[seedream] image fetch failed", imgRes.status, imageUrl);
    throw new Error(`Seedream image fetch HTTP ${imgRes.status}`);
  }
  const arrayBuf = await imgRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), mimeType };
}
