import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Local LAN Discovery Middleware for Kettlebell Knight.
 * Allows the Fire TV app to register its active WebRTC room on the local network,
 * and allows the Phone Companion to scan and discover it automatically with 0 manual typing.
 */
function localDiscoveryPlugin(): Plugin {
  const activeRooms = new Map<string, { roomId: string; name: string; timestamp: number }>();

  const handleRegister = (req: any, res: any) => {
    let body = '';
    req.on('data', (chunk: any) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.roomId) {
          activeRooms.set(data.roomId, {
            roomId: data.roomId,
            name: data.name || 'Fire TV',
            timestamp: Date.now(),
          });
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, count: activeRooms.size }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  };

  const handleList = (res: any) => {
    const now = Date.now();
    for (const [id, r] of activeRooms.entries()) {
      // Purge rooms inactive for > 25s
      if (now - r.timestamp > 25000) activeRooms.delete(id);
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(Array.from(activeRooms.values())));
  };

  const middleware = (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0];
    if (url === '/api/discovery/register' && req.method === 'POST') {
      return handleRegister(req, res);
    }
    if (url === '/api/discovery/rooms' && req.method === 'GET') {
      return handleList(res);
    }
    next();
  };

  return {
    name: 'local-discovery-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/**
 * GitHub Pages build (`vite build --mode pages`): the site is only the phone companion, installable as a PWA.
 * Drops the TV-only assets (~140 MB) and, since Pages has no SPA rewrites, copies index.html to each
 * route's folder (so /phone?room=… loads with a 200) and to 404.html for anything else.
 * pwa/ holds the icons and service worker; the manifest is written here so its paths follow `base`.
 */
function pagesSitePlugin(): Plugin {
  const TV_ONLY_ASSETS = ['spine', 'music', 'cinematics', 'codex', 'backgrounds'];
  const ROUTES = ['phone', 'test', 'lab'];
  const PWA_FILES = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
  const THEME = '#0F0E17';
  let base = '/';
  return {
    name: 'phone-pages-site',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      const meta = (name: string, content: string) => ({ tag: 'meta', attrs: { name, content }, injectTo: 'head' as const });
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }, injectTo: 'head' },
        meta('theme-color', THEME),
        meta('mobile-web-app-capable', 'yes'),
        meta('apple-mobile-web-app-capable', 'yes'),
        meta('apple-mobile-web-app-title', 'KB Knight'),
        meta('apple-mobile-web-app-status-bar-style', 'black-translucent'),
      ];
    },
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      for (const dir of TV_ONLY_ASSETS) {
        fs.rmSync(path.join(dist, 'assets', dir), { recursive: true, force: true });
      }

      const pwa = path.resolve(__dirname, 'pwa');
      for (const file of PWA_FILES) fs.copyFileSync(path.join(pwa, file), path.join(dist, file));
      const sw = fs.readFileSync(path.join(pwa, 'sw.js'), 'utf8').replace(/__BUILD_ID__/g, Date.now().toString(36));
      fs.writeFileSync(path.join(dist, 'sw.js'), sw);
      const manifest = {
        id: `${base}phone`,
        name: 'Kettlebell Knight Companion',
        short_name: 'KB Knight',
        description: 'Counts your kettlebell reps with the camera and sends them to Kettlebell Knight on your TV.',
        start_url: `${base}phone`,
        scope: base,
        display: 'standalone',
        background_color: THEME,
        theme_color: THEME,
        icons: [
          { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      };
      fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

      const index = path.join(dist, 'index.html');
      for (const route of ROUTES) {
        fs.mkdirSync(path.join(dist, route), { recursive: true });
        fs.copyFileSync(index, path.join(dist, route, 'index.html'));
      }
      fs.copyFileSync(index, path.join(dist, '404.html'));
      fs.writeFileSync(path.join(dist, '.nojekyll'), '');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Project pages live under /<repo>/; set PAGES_BASE=/ when using a custom domain.
  base: mode === 'pages' ? process.env.PAGES_BASE ?? '/kettlebell-knight/' : '/',
  plugins: [react(), localDiscoveryPlugin(), ...(mode === 'pages' ? [pagesSitePlugin()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Function form, so Vite's dynamic-import preload helper isn't pulled into pixi-vendor (which
        // made the phone page download PixiJS just for that helper).
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'preload-helper';
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor';
          if (/node_modules\/(pixi\.js|@pixi)\//.test(id)) return 'pixi-vendor';
          if (id.includes('node_modules/@mediapipe/tasks-vision/')) return 'vision-vendor';
          if (/node_modules\/(peerjs|peerjs-js-binarypack)\//.test(id)) return 'network-vendor';
          return undefined;
        },
      },
    },
  },
}));
