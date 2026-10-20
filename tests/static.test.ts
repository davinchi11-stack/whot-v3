import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStaticHandler } from '../server/static.ts';

describe('static file server (SPA fallback)', () => {
  let server: Server;
  let base = '';
  let dir = '';
  before(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'whot-dist-'));
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
    writeFileSync(path.join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
    writeFileSync(path.join(dir, 'secret.txt'), 'outside? no, inside');
    server = createServer(createStaticHandler(path.join(dir)));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('serves index.html at / and for invite links like /join/ABCDE', async () => {
    for (const p of ['/', '/join/ABCDE', '/anything/else']) {
      const r = await fetch(base + p);
      assert.equal(r.status, 200, p);
      assert.match(r.headers.get('content-type') ?? '', /text\/html/);
      assert.equal(await r.text(), '<div id="root"></div>');
    }
  });

  test('serves assets with the right type and long cache; missing assets 404', async () => {
    const r = await fetch(base + '/assets/app-abc.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /javascript/);
    assert.match(r.headers.get('cache-control') ?? '', /immutable/);
    assert.equal((await fetch(base + '/assets/nope.js')).status, 404);
  });

  test('blocks path traversal and non-GET methods', async () => {
    const raw = await fetch(base + '/%2e%2e/%2e%2e/etc/passwd');
    assert.ok([403, 404].includes(raw.status) || (await raw.text()) === '<div id="root"></div>');
    assert.notEqual(raw.status, 500);
    const body = await (await fetch(base + '/..%2f..%2fetc%2fpasswd')).text();
    assert.ok(!body.includes('root:'));
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  });
});
