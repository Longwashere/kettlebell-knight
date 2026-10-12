import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localDiscoveryPlugin()],
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pixi-vendor': ['pixi.js'],
          'vision-vendor': ['@mediapipe/tasks-vision'],
          'network-vendor': ['peerjs'],
        },
      },
    },
  },
});
