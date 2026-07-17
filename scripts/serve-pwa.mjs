import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist');
const port = Number(process.argv[2] || 8090);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm',
  '.sqlite': 'application/vnd.sqlite3', '.db': 'application/vnd.sqlite3', '.aac': 'audio/aac', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', `http://${request.headers.host}`).pathname);
  const safe = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidates = [join(root, safe), join(root, `${safe}.html`), join(root, safe, 'index.html'), join(root, 'index.html')];
  const file = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  const stat = statSync(file);
  response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  response.setHeader('Content-Length', stat.size);
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(/(?:index\.html|service-worker\.js|manifest\.webmanifest)$/.test(file) ? 'Cache-Control' : 'Cache-Control', /(?:index\.html|service-worker\.js|manifest\.webmanifest)$/.test(file) ? 'no-cache' : 'public, max-age=31536000, immutable');
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`PWA de production : http://localhost:${port}`));
