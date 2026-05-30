// import { defineConfig } from 'vite';
import { createViteOptions } from './vite.shared.mjs';

// export default defineConfig(({ mode }) => createViteOptions(mode));

import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường từ file .env
  const env = loadEnv(mode, '.', '');

  return {
    // Chạy trực tiếp trên domain riêng, để gốc là '/'
    base: '/',

    plugins: [tailwindcss()],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    server: {
      // MỞ KHÓA HOST: Cho phép tên miền của bạn chạy được trong chế độ dev
      allowedHosts: ['film.fitlhu.com'],
      
      hmr: env.DISABLE_HMR !== 'true',
    },
  };
});