/**
 * Dev runner: build server.ts với esbuild rồi chạy bằng node thuần.
 * Tránh tsx + @tailwindcss/vite trên Windows (ERR_INVALID_URL_SCHEME).
 */
import esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, '.cache');
const outfile = path.join(outdir, 'server.mjs');

fs.mkdirSync(outdir, { recursive: true });

let child = null;

function run() {
  if (child) {
    child.kill('SIGTERM');
  }
  child = spawn(process.execPath, [outfile], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, NODE_ENV: 'development' },
  });
}

const ctx = await esbuild.context({
  entryPoints: [path.join(root, 'server.ts')],
  outfile,
  platform: 'node',
  format: 'esm',
  bundle: true,
  packages: 'external',
  sourcemap: true,
  plugins: [
    {
      name: 'restart-server',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) return;
          run();
        });
      },
    },
  ],
});

console.log('[dev] Đang build server.ts...');
await ctx.watch();
const result = await ctx.rebuild();
if (result.errors.length > 0) {
  process.exit(1);
}

process.on('SIGINT', () => {
  if (child) child.kill('SIGTERM');
  process.exit(0);
});
