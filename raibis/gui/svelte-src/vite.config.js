import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Builds a single self-contained IIFE bundle (no ES modules, no code
// splitting) so it can be dropped in as a plain <script> tag next to
// app.js — same "compiled asset served as a static file" pattern the
// Go backend already uses for app.js/style.css.
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: '../public/svelte',
    emptyOutDir: true,
    lib: {
      entry: 'src/main.js',
      name: 'RaibisSvelte',
      formats: ['iife'],
      fileName: () => 'bundle.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'bundle.[ext]',
      },
    },
  },
});
