import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Dev: Vite serves the UI on :5173 and proxies Socket.IO to the Node server on :3000.
// Production: `vite build` writes ./dist and server.ts serves it (or Vercel hosts it).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  server: { port: 5173, proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } } },
  build: { outDir: 'dist', sourcemap: false },
});
