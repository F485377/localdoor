import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// 開発用：`npm run dev` だけで api/ の Vercel Functions を動かす。
// 本番（Vercel）ではこのプラグインは使われず、Vercel が api/ を直接実行する。
function resolveApiFile(apiDir, segments) {
  let dir = apiDir;
  const params = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const dynamic = (ext) => entries.find((e) => /^\[\w+\]/.test(e) && (ext ? e.endsWith('.js') : !e.endsWith('.js')));

    if (isLast && entries.includes(`${seg}.js`)) return { file: path.join(dir, `${seg}.js`), params };
    if (entries.includes(seg) && fs.statSync(path.join(dir, seg)).isDirectory()) {
      dir = path.join(dir, seg);
      continue;
    }
    const dynFile = isLast && dynamic(true);
    if (dynFile) {
      params[dynFile.slice(1, dynFile.indexOf(']'))] = decodeURIComponent(seg);
      return { file: path.join(dir, dynFile), params };
    }
    const dynDir = dynamic(false);
    if (!dynDir) return null;
    params[dynDir.slice(1, -1)] = decodeURIComponent(seg);
    dir = path.join(dir, dynDir);
  }
  const index = path.join(dir, 'index.js');
  return fs.existsSync(index) ? { file: index, params } : null;
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });
}

function vercelApiDev() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      const apiDir = path.resolve('api');
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const segments = url.pathname.split('/').filter(Boolean);
        const route = resolveApiFile(apiDir, segments);
        if (!route) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Not found' }));
        }
        req.query = { ...Object.fromEntries(url.searchParams), ...route.params };
        // JSON のときだけ先に読む。写真などはそのまま API 側で読む
        if (String(req.headers['content-type'] ?? '').includes('application/json')) req.body = await readBody(req);
        res.status = (code) => ((res.statusCode = code), res);
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };
        try {
          // WSL などファイル監視が効かない環境でも、編集した API を毎回読み直す
          server.moduleGraph.invalidateAll();
          const mod = await server.ssrLoadModule(route.file);
          await mod.default(req, res);
        } catch (err) {
          console.error(err);
          if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
        }
      });
    },
  };
}

export default defineConfig(({ mode, command }) => {
  if (command === 'serve') {
    // .env.local の DATABASE_URL などを API 側に渡す
    for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v;
  }
  return {
    plugins: [react(), command === 'serve' && !process.env.VERCEL && vercelApiDev()],
    ssr: { external: ['@prisma/client'] },
    // Dev Container の外（パソコンのブラウザ）から開けるように、すべての住所で待ち受ける
    server: { host: true, port: 5173 },
    // デモ版は1枚のHTMLにまとめるので、遅延読み込みのファイルも分割しない
    build: process.env.VITE_DEMO === '1' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  };
});
