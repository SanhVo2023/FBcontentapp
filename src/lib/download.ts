// Client-side download helpers — force-save a remote image and copy text to clipboard.
// R2 URLs live on a different origin, so a plain `<a href download>` wouldn't
// trigger the browser download dialog; we fetch-as-blob and create an object URL.

export async function downloadImage(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename || deriveFilename(url, blob.type);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so the download has time to kick off.
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
}

function deriveFilename(url: string, mime: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.substring(path.lastIndexOf("/") + 1);
    if (last && last.includes(".")) return last;
  } catch { /* fall through */ }
  const ext = mime.split("/")[1] || "png";
  return `image-${Date.now()}.${ext}`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
