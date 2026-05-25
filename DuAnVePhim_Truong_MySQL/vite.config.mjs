import { defineConfig } from 'vite';
import { createViteOptions } from './vite.shared.mjs';

export default defineConfig(({ mode }) => createViteOptions(mode));
