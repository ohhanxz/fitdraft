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
