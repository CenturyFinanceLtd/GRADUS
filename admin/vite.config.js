import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor'
            if (id.includes('apexcharts')) return 'charts'
            if (id.includes('quill')) return 'quill'
            if (id.includes('lightgallery')) return 'lightgallery'
            if (id.includes('bootstrap')) return 'bootstrap'
            if (id.includes('datatables')) return 'datatables'
            if (id.includes('fullcalendar')) return 'fullcalendar'
            if (id.includes('jsvectormap')) return 'jsvectormap'
            if (id.includes('slick')) return 'slick'
            if (id.includes('magnific-popup')) return 'magnific'
            if (id.includes('prism')) return 'prism'
            return 'vendor'
          }
        },
      },
    },
  },
})
