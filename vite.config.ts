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
    tsr: {
      autoCodeSplitting: false,
    },
  },
  vite: {
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
            'Referer': 'https://storage.bunnycdn.com',
            'Origin': 'https://storage.bunnycdn.com'
          }
        }
      }
    },
  },
});
