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
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res: any) => {
              if (res && 'headersSent' in res && !res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Gateway Timeout' }));
              }
            });
          }
        },
        '/api/bunny-stream': {
          target: 'https://video.bunnycdn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-stream/, ''),
          headers: {
            'Referer': 'https://video.bunnycdn.com',
            'Origin': 'https://video.bunnycdn.com'
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res: any) => {
              if (res && 'headersSent' in res && !res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Gateway Timeout' }));
              }
            });
          }
        },
        '/api/bunny-storage': {
          target: 'https://storage.bunnycdn.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-storage/, ''),
          headers: {
            'Referer': 'https://storage.bunnycdn.com',
            'Origin': 'https://storage.bunnycdn.com'
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res: any) => {
              if (res && 'headersSent' in res && !res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Gateway Timeout' }));
              }
            });
          }
        },
        '/api/bunny-cdn': {
          target: 'https://sgkbrainova.b-cdn.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/bunny-cdn/, ''),
          headers: {
            'Referer': 'https://sgkbrainova.b-cdn.net',
            'Origin': 'https://sgkbrainova.b-cdn.net'
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res: any) => {
              if (res && 'headersSent' in res && !res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy Gateway Timeout' }));
              }
            });
          }
        }
      }
    },
  },
});
