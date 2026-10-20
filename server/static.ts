import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Minimal static file server for the Vite build output with single-page-app fallback:
 * unknown paths WITHOUT a file extension (e.g. /join/ABCDE) get index.html; missing assets get 404.
 */
export function createStaticHandler(root: string) {
  const base = path.resolve(root);
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    if (pathname.includes('\0')) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    let file = path.join(base, pathname);
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!isFile(file)) {
      if (path.extname(pathname)) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }
      file = path.join(base, 'index.html');
      if (!isFile(file)) {
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('The web build is missing. Run `npm run build` first (in development use `npm run dev` and open http://localhost:5173).');
        return;
      }
    }
    const ext = path.extname(file).toLowerCase();
    const immutable = pathname.startsWith('/assets/');
    res.writeHead(200, {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  };
}
