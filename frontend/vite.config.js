import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Keep the entry chunk small (Part C Phase 7): heavy vendor graphs go into
    // their own chunks, loaded on demand by the pages that need them.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('recharts') ||
            id.includes('/d3-') ||
            id.includes('victory-vendor') ||
            id.includes('internmap') ||
            id.includes('delaunator') ||
            id.includes('robust-predicates')
          ) {
            return 'charts';
          }
          if (
            id.includes('framer-motion') ||
            id.includes('motion-dom') ||
            id.includes('motion-utils')
          ) {
            return 'motion';
          }
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-icons') || id.includes('lucide-react')) {
            return 'icons';
          }
          return undefined;
        },
      },
    },
  },
})