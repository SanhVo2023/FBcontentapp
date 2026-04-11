import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

let client: S3Client | null = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export async function uploadToR2(
  buffer: Buffer, key: string, contentType = "image/png"
): Promise<{ key: string; url: string }> {
  await getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return { key, url: `${process.env.R2_PUBLIC_URL}/${key}` };
}

export async function uploadBrandAsset(
  buffer: Buffer, brandId: string, assetType: string, filename: string, contentType = "image/png"
): Promise<string> {
  const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
  const key = `brands/${brandId}/${assetType}/${filename}-${hash}${contentType.includes("png") ? ".png" : ".jpg"}`;
  const result = await uploadToR2(buffer, key, contentType);
  return result.url;
}

export async function uploadGeneratedImage(
  buffer: Buffer, brandId: string, postId: string
): Promise<string> {
  const month = new Date().toISOString().slice(0, 7);
  const key = `generated/${brandId}/${month}/${postId}-${Date.now()}.png`;
  const result = await uploadToR2(buffer, key, "image/png");
  return result.url;
}

export async function fetchR2AsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "image/png";
  return { base64: buffer.toString("base64"), mimeType: ct };
}

export async function getObjectAsBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
  const chunks: Uint8Array[] = [];
  const stream = res.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function deleteFromR2(url: string): Promise<void> {
  // Extract key from public URL
  const publicBase = process.env.R2_PUBLIC_URL || "";
  const key = url.startsWith(publicBase) ? url.slice(publicBase.length + 1) : url;
  if (!key) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
}
