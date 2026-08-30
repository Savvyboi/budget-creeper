import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static single-page app. `npm run build` emits a plain `dist/` folder that can be
// dropped on Cloudflare Pages, Cloudflare Workers Assets, Vercel, Netlify or any CDN.
//
// GitHub Pages serves a project site from `https://<user>.github.io/<repo>/`, so
// every asset URL needs that prefix. Set BASE_PATH at build time and Vite rewrites
// the bundle, the public files referenced from index.html, and `import.meta.env.
// BASE_URL`, which is what src/lib/data.ts uses to find /data:
//
//   BASE_PATH=/valtion-budjetti/ npm run build
//
// Leave it unset for a root deployment (Cloudflare Pages, Vercel, a custom domain).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Budget JSON lives in public/data and is fetched at runtime, so the JS bundle
    // stays small and a new data year does not invalidate the app chunk.
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
  server: { port: 5173, open: true },
});
