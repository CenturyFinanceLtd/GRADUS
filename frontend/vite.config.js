import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // disables CSS source maps in dev mode
    devSourcemap: false,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    // Reduce Windows file locking issues by using polling and
    // prevent dev overlay from blocking the screen on transient EBUSY errors
    watch: {
      usePolling: true,
      interval: 200,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    },
    hmr: {
      overlay: false,
    },
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
