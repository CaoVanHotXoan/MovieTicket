import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/** Cấu hình Vite dùng chung cho dev (server.ts) và build (vite.config.mjs). */
export function createViteOptions(mode = 'development') {
  const env = loadEnv(mode, root, '');
  return {
    root,
    plugins: [tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': root,
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
}
