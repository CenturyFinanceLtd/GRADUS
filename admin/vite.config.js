import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // IMPORTANT: only split pure, non-React libs.
            if (id.includes('node_modules/bootstrap')) return 'bootstrap'
            if (id.includes('node_modules/apexcharts/')) return 'charts'
            if (id.includes('node_modules/lightgallery/')) return 'lightgallery'
            if (id.includes('node_modules/datatables.')) return 'datatables'
            if (id.includes('node_modules/@fullcalendar/')) return 'fullcalendar'
            if (id.includes('node_modules/jsvectormap/')) return 'jsvectormap'
            if (id.includes('node_modules/slick-carousel/')) return 'slick'
            if (id.includes('node_modules/magnific-popup/')) return 'magnific'
            if (id.includes('node_modules/prism')) return 'prism'
            return 'vendor'
          }
        },
      },
    },
  },
})

