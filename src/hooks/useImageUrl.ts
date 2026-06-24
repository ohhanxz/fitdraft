import { useEffect, useState } from 'react';
import { getImageUrl } from '../lib/imageStore';

/** Resolve an IndexedDB image key to an object URL for rendering. */
export function useImageUrl(key: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!key) {
      setUrl(null);
      return;
    }
    getImageUrl(key).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return url;
}
