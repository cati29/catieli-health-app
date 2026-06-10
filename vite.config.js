import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app', '.ngrok.io']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('three')) return 'vendor-three';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('framer-motion')) return 'vendor-framer';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) return 'vendor-pdf';
          if (id.includes('react-leaflet') || id.includes('leaflet')) return 'vendor-leaflet';
          if (id.includes('react-quill') || id.includes('quill')) return 'vendor-quill';
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('micromark') || id.includes('unified') || id.includes('hast')) return 'vendor-markdown';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';
          if (id.includes('lodash')) return 'vendor-lodash';
          if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
          return 'vendor';
        }
      }
    }
  }
});
