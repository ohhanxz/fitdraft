import { useCallback, useState } from 'react';

type Status = 'idle' | 'processing' | 'done' | 'error';

/**
 * In-browser background removal via @imgly/background-removal (WASM).
 * Imported lazily so the heavy WASM model isn't pulled into the initial bundle.
 */
export function useBackgroundRemoval() {
  const [status, setStatus] = useState<Status>('idle');

  const remove = useCallback(async (input: Blob): Promise<Blob> => {
    setStatus('processing');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const result = await removeBackground(input, {
        model: 'isnet_fp16',
        // Self-hosted model + WASM (mirrored into public/imgly/ — see
        // scripts/fetch-bg-model.mjs). Resolves to <origin>/imgly/ so nothing
        // is fetched from a third-party CDN at runtime. document.baseURI keeps
        // it correct under any Vite base path.
        publicPath: new URL('imgly/', document.baseURI).href,
        output: { format: 'image/png', quality: 0.9 },
      });
      setStatus('done');
      return result;
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, []);

  return { remove, status, setStatus };
}
