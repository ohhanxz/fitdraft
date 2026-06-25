// Mirror the @imgly/background-removal model + WASM assets into public/imgly/
// so the app self-hosts them instead of fetching from img.ly's CDN at runtime.
//
// Run once (already committed to the repo):  node scripts/fetch-bg-model.mjs
//
// The asset version MUST match the installed @imgly/background-removal version
// (the resources.json format is version-specific). If you bump that package,
// update VERSION below and re-run this script.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '1.7.0';
const CDN = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/dist/`;

// Only the model the app actually uses (isnet_fp16) plus the ONNX-runtime WASM
// (both the WebGPU "jsep" and plain CPU variants, so every browser works).
const NEEDED = (key) => key.startsWith('/onnxruntime-web/') || key === '/models/isnet_fp16';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'imgly');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await mkdir(outDir, { recursive: true });

  console.log(`Fetching resources.json (${VERSION})…`);
  const manifest = await download(CDN + 'resources.json');
  await writeFile(join(outDir, 'resources.json'), manifest);
  const resources = JSON.parse(manifest.toString());

  // Collect the unique, content-addressed chunk files for the needed keys.
  const chunks = new Map(); // hash -> expected byte size
  for (const [key, entry] of Object.entries(resources)) {
    if (!NEEDED(key)) continue;
    for (const c of entry.chunks) chunks.set(c.name, c.offsets[1] - c.offsets[0]);
  }

  const names = [...chunks.keys()];
  console.log(`Need ${names.length} chunk files. Downloading…`);

  let done = 0;
  const CONCURRENCY = 6;
  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const batch = names.slice(i, i + CONCURRENCY).map(async (name) => {
      const dest = join(outDir, name);
      const expected = chunks.get(name);
      if (await exists(dest)) {
        const buf = await readFile(dest);
        if (buf.length === expected) {
          done++;
          return;
        }
      }
      const buf = await download(CDN + name);
      if (buf.length !== expected) {
        throw new Error(`Size mismatch for ${name}: got ${buf.length}, expected ${expected}`);
      }
      await writeFile(dest, buf);
      done++;
      process.stdout.write(`\r  ${done}/${names.length}`);
    });
    await Promise.all(batch);
  }

  console.log(`\nDone. Mirrored ${names.length} chunks + resources.json into public/imgly/`);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
