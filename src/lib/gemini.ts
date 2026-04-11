import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-3.1-flash-image-preview",
    generationConfig: { responseModalities: ["image", "text"] } as never,
  });
}

type ImageInput = { base64: string; mimeType: string; label: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(response: any): { buffer: Buffer; mimeType: string } {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData) {
        return { buffer: Buffer.from(part.inlineData.data, "base64"), mimeType: part.inlineData.mimeType || "image/png" };
      }
    }
  }
  throw new Error("No image generated.");
}

/**
 * Generate with text prompt only (no reference images).
 */
export async function generateFromText(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return extractImage(result.response);
}

/**
 * Generate with a single reference image + prompt.
 */
export async function generateFromImage(imageBase64: string, mimeType: string, prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const model = getModel();
  const result = await model.generateContent([
    { inlineData: { mimeType, data: imageBase64 } },
    prompt,
  ]);
  return extractImage(result.response);
}

/**
 * Generate with MULTIPLE reference images + prompt.
 * Used to pass logo + model/reference together so the AI sees all brand assets.
 */
export async function generateFromMultipleImages(
  images: ImageInput[],
  prompt: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const model = getModel();

  // Build content parts: each image with a label, then the prompt
  const parts: Array<Record<string, unknown>> = [];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    parts.push({ text: `[Above image is: ${img.label}]` });
  }
  parts.push({ text: prompt });

  const result = await model.generateContent(parts as never);
  return extractImage(result.response);
}
