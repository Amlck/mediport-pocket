import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseByteRange } from '../src/byte-range.mjs';
import { DIST, CSP } from './build.mjs';
import { verify } from './verify.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };

export async function createPocketServer({ directory = DIST } = {}) {
  const pack = await verify(directory);
  const allowed = new Set([...pack.assets.map(asset => '/' + asset.path), '/sw.js', '/bundle-inventory.json']);
  // Freeze the validated snapshot until restart; editing dist while it serves
  // cannot mix reference versions or bypass startup verification.
  const contents = new Map(await Promise.all([...allowed].map(async filename => [filename, await readFile(path.join(pack.directory, filename))])));
  return createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', CSP);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    let url;
    try { url = new URL(request.url, 'http://127.0.0.1'); }
    catch { response.writeHead(400); response.end('Invalid URL.'); return; }
    const releasePrefix = `/__releases/${pack.release.version}/`;
    const filename = url.pathname === '/' ? '/index.html'
      : url.pathname.startsWith(releasePrefix) ? '/' + url.pathname.slice(releasePrefix.length)
        : url.pathname;
    if (!['GET', 'HEAD'].includes(request.method) || url.search || !allowed.has(filename)) {
      response.writeHead(404); response.end('Not part of Mediport Pocket.'); return;
    }
    try {
      const bytes = contents.get(filename);
      response.setHeader('Content-Type', TYPES[path.extname(filename)] || 'application/octet-stream');
      if (filename.endsWith('.mp4')) {
        response.setHeader('Accept-Ranges', 'bytes');
        if (request.headers.range !== undefined) {
          const range = parseByteRange(request.headers.range, bytes.length);
          if (!range) { response.setHeader('Content-Range', `bytes */${bytes.length}`); response.writeHead(416); response.end(); return; }
          const [start, end] = range;
          response.setHeader('Content-Range', `bytes ${start}-${end}/${bytes.length}`);
          response.setHeader('Content-Length', end - start + 1);
          response.writeHead(206); response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1)); return;
        }
      }
      response.setHeader('Content-Length', bytes.length);
      response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(503); response.end('The verified reference file is no longer available. Rebuild Pocket.'); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.POCKET_PORT || process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const server = await createPocketServer({ directory: process.env.POCKET_PACK_DIRECTORY || DIST });
  server.listen(port, '127.0.0.1', () => console.log(`Mediport Pocket: http://127.0.0.1:${port}\nServing only the verified public pack.`));
}
