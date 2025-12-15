import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Use relative URLs so the app works when served from sub-paths or behind proxies
  base: "./",
  plugins: [react()],
  css: {
    // disables CSS source maps in dev mode
    devSourcemap: false,
  },
  build: {
    chunkSizeWarningLimit: 900, // raise limit after splitting to avoid noisy warnings
    rollupOptions: {
      output: {
        // manualChunks: {
        //   "vendor-react": ["react", "react-dom", "react-router-dom"],
        //   "vendor-ui": [
        //     "bootstrap",
        //     "react-select",
        //     "aos",
        //     "lightgallery",
        //     "react-modal-video",
        //     "react-fast-marquee",
        //     "react-slider",
        //     "react-visibility-sensor",
        //     "react-countup",
        //   ],
        //   "vendor-slick": ["react-slick", "slick-carousel"],
        //   "vendor-icons": [
        //     "@fortawesome/fontawesome-svg-core",
        //     "@fortawesome/free-brands-svg-icons",
        //     "@fortawesome/react-fontawesome",
        //   ],
        //   "vendor-pdf": ["pdfjs-dist"],
        //   "vendor-socket": ["socket.io-client"],
        // },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
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
