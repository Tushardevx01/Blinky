import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173;

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../../'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
  clearScreen: false,
  server: {
    port,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
