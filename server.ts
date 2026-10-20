/**
 * One process, one port: serves the built React app (./dist) AND runs Socket.IO + all room state in memory.
 * There is no database. A restart erases every room.
 */
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { RoomManager } from './server/roomManager.ts';
import { registerHandlers, startSweeper } from './server/socketHandlers.ts';
import type { IoLike } from './server/socketHandlers.ts';
import { existsSync } from 'node:fs';
import { createStaticHandler } from './server/static.ts';
import { originAllowed } from './server/validation.ts';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from './lib/socket/events.ts';

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? '0.0.0.0';
const graceMs = Number(process.env.RECONNECT_GRACE_MS ?? 60_000);
const idleMs = Number(process.env.ROOM_IDLE_MS ?? 600_000);
const origins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const mgr = new RoomManager({ graceMs, idleMs });
// Two deployment shapes: (a) one host serving dist/ + sockets, (b) API-only (frontend on Vercel).
const hasFrontend = existsSync(path.join(distDir, 'index.html'));
const serveStatic = hasFrontend
  ? createStaticHandler(distDir)
  : (_req: unknown, res: { writeHead(c: number, h: Record<string, string>): void; end(b: string): void }) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('Naija Whot game server is running. Open the web app to play.');
    };

const httpServer = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  (serveStatic as (a: typeof req, b: typeof res) => void)(req, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: origins.length ? { origin: origins } : undefined,
  maxHttpBufferSize: 50_000,
  // Also protects the WebSocket upgrade (CORS alone does not): only the configured site may connect.
  allowRequest: (req, cb) => cb(null, originAllowed(origins, req.headers.origin)),
});

registerHandlers(io as unknown as IoLike, mgr);
const stopSweeper = startSweeper(io as unknown as IoLike, mgr);

httpServer.listen(port, hostname, () => {
  console.log(`> Whot server on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
  console.log(`> ${hasFrontend ? 'Serving the web app from ./dist' : 'API-only mode (no ./dist): the frontend is hosted elsewhere'}. Allowed origins: ${origins.length ? origins.join(', ') : 'any (same-origin deployment)'}`);
  console.log(`> Rooms live in memory only; a restart erases all games. Reconnect grace: ${graceMs} ms.`);
});

const shutdown = () => {
  stopSweeper();
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
