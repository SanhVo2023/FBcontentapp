import sharp from "sharp";

/**
 * Overlay a logo onto the bottom-right corner of a generated banner.
 * Used when the image provider (e.g., Seedream) can't condition on the logo
 * natively — we composite after generation so branding stays consistent
 * regardless of which AI model produced the image.
 *
 * The logo is scaled to ~12% of the image width, the short side is honored,
 * and transparent PNGs pass through untouched. The original image's format
 * and dimensions are preserved in the output.
 */
export async function compositeLogoBottomRight(
  baseBuffer: Buffer,
  logoUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const [baseMeta, logoBytes] = await Promise.all([
    sharp(baseBuffer).metadata(),
    fetchLogoBytes(logoUrl),
  ]);

  const baseWidth = baseMeta.width || 1080;
  const baseHeight = baseMeta.height || 1080;
  // 12% of the shorter dimension keeps the logo readable but unobtrusive
  // across both square feed posts (1080×1080) and wide banners (1200×630).
  const logoTargetWidth = Math.round(Math.min(baseWidth, baseHeight) * 0.12);
  const padding = Math.round(Math.min(baseWidth, baseHeight) * 0.03);

  const resizedLogo = await sharp(logoBytes)
    .resize({ width: logoTargetWidth, withoutEnlargement: true })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resizedLogo).metadata();
  const logoWidth = resizedMeta.width || logoTargetWidth;
  const logoHeight = resizedMeta.height || logoTargetWidth;

  const left = Math.max(0, baseWidth - logoWidth - padding);
  const top = Math.max(0, baseHeight - logoHeight - padding);

  const composed = await sharp(baseBuffer)
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();

  return { buffer: composed, mimeType: "image/png" };
}

async function fetchLogoBytes(url: string): Promise<Buffer> {
  if (!/^https?:/i.test(url)) throw new Error("Logo URL phải là http(s)");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Logo fetch HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
