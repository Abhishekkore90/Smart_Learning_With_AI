import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// SPA build — no nitro/SSR, produces dist/client with _shell.html → index.html
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
    },
    prerender: {
      enabled: false,
    },
    tsr: {
      autoCodeSplitting: false,
    },
  },
  vite: {
    build: {
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist') || id.includes('jspdf') || id.includes('pdfkit') || id.includes('html2canvas') || id.includes('html2pdf')) {
                return 'vendor-pdf';
              }
              if (id.includes('xlsx') || id.includes('mammoth')) {
                return 'vendor-office';
              }
              if (id.includes('recharts') || id.includes('chart.js') || id.includes('framer-motion')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        html2canvas: require.resolve('html2canvas-pro'),
      },
    },
    server: {
      port: 8080,
      host: true,
      strictPort: false,
      cors: true,
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          headers: {
            'Referer': 'https://api.anthropic.com',
            'Origin': 'https://api.anthropic.com'
          }
        },
        '/api/bunny-stream': {
          target: 'https://video.bunnycdn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-stream/, ''),
          headers: {
            'Referer': 'https://video.bunnycdn.com',
            'Origin': 'https://video.bunnycdn.com'
          }
        },
        '/api/bunny-storage': {
          target: 'https://storage.bunnycdn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-storage/, ''),
          headers: {
            'AccessKey': process.env.VITE_BUNNY_STORAGE_API_KEY || 'bc06a0c2-aad1-436c-b88a1c197eca-d74a-44e8',
            'Referer': 'https://storage.bunnycdn.com',
            'Origin': 'https://storage.bunnycdn.com'
          }
        },
        '/api/bunny-cdn': {
          target: 'https://sgkbrainova.b-cdn.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-cdn/, ''),
          headers: {
            'Referer': 'https://sgkbrainova.b-cdn.net',
            'Origin': 'https://sgkbrainova.b-cdn.net'
          }
        },
        '/v0/b': {
          target: 'https://firebasestorage.googleapis.com',
          changeOrigin: true,
          headers: {
            'Origin': 'https://firebasestorage.googleapis.com'
          }
        }
      }
    },
  },
});
