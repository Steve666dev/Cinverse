import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // '' = load ALL env vars, not just VITE_

  return {
    plugins: [
      react(),
      {
        name: 'api-proxy',
        configureServer(server) {
          server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse) => {
            const raw = req.url ?? '';
            const base = `http://localhost${raw}`;
            const url = new URL(base);

            let targetUrl: string;

            if (url.pathname === '/tmdb' || url.pathname === '') {
              const path = url.searchParams.get('path');
              if (!path) { res.statusCode = 400; res.end('Missing path'); return; }
              url.searchParams.delete('path');
              const append = url.searchParams.get('append');
              if (append) { url.searchParams.set('append_to_response', append); url.searchParams.delete('append'); }
              url.searchParams.set('api_key', env.TMDB_API_KEY);
              targetUrl = `https://api.themoviedb.org/3${path}?${url.searchParams}`;
            } else if (url.pathname === '/omdb') {
              url.searchParams.set('apikey', env.OMDB_API_KEY);
              targetUrl = `https://www.omdbapi.com/?${url.searchParams}`;
            } else {
              res.statusCode = 404; res.end('Not found'); return;
            }

            try {
              const r = await fetch(targetUrl);
              const body = await r.text();
              res.setHeader('Content-Type', 'application/json');
              res.end(body);
            } catch (e: any) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
})
