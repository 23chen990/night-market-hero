import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Phaser is intentionally shipped as one offline-capable prototype bundle.
    chunkSizeWarningLimit: 1_300,
  },
});
