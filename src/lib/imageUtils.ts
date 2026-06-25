/** Load a Blob into an HTMLImageElement. */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Fetch an image URL as a Blob. Throws on CORS / network failure (caller handles). */
export async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Not an image');
  return blob;
}

/** Downscale a raster blob so its longest edge is <= max px (default 1200). */
export async function downscaleBlob(blob: Blob, max = 1200): Promise<Blob> {
  const img = await blobToImage(blob);
  const longest = Math.max(img.width, img.height);
  if (longest <= max) return blob;
  const scale = max / longest;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? blob), 'image/png'),
  );
}

/** Natural dimensions of an image blob. */
export async function imageDimensions(blob: Blob): Promise<{ w: number; h: number }> {
  const img = await blobToImage(blob);
  return { w: img.width, h: img.height };
}

/**
 * Download an image (given a blob/object/data URL) as a transparent PNG or a
 * JPEG. JPEG has no alpha, so the image is first composited onto a solid white
 * background. Triggers a browser download named `${name}.{jpg|png}`.
 */
export async function downloadImageAs(
  srcUrl: string,
  name: string,
  format: 'png' | 'jpeg',
): Promise<void> {
  const blob = await (await fetch(srcUrl)).blob();
  const img = await blobToImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.92));
  if (!out) return;
  const url = URL.createObjectURL(out);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  a.click();
  URL.revokeObjectURL(url);
}
