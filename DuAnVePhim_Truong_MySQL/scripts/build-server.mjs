import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, '.cache');
const outfile = path.join(outdir, 'server.mjs');

fs.mkdirSync(outdir, { recursive: true });

const result = await esbuild.build({
  entryPoints: [path.join(root, 'server.ts')],
  outfile,
  platform: 'node',
  format: 'esm',
  bundle: true,
  packages: 'external',
  sourcemap: true,
});

if (result.errors.length > 0) {
  process.exit(1);
}

console.log('[build-server] OK → .cache/server.mjs');
