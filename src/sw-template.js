/* Generated release constants are prepended by build.mjs. No runtime caching. */
const BASE = new URL('./', self.location.href);
const PREFIX = 'mediport-pocket:' + BASE.pathname + ':';
const CACHE = PREFIX + RELEASE.version;
const PINNED = new URL('__releases/' + RELEASE.version + '/', BASE);
const allowed = new Map(ASSETS.map(asset => [new URL(asset.path, BASE).href, asset]));
const hex = buffer => Array.from(new Uint8Array(buffer), value => value.toString(16).padStart(2, '0')).join('');

async function downloadPack() {
    const cache = await caches.open(CACHE);
      for (const asset of ASSETS) {
        const url = new URL(asset.path, BASE).href;
        // Public hosting may canonicalize or inject scripts into HTML. Fetch
        // the declared exact shell bytes and retain the stable HTML cache key.
        const downloadUrl = new URL(asset.downloadPath || asset.path, BASE).href;
        const response = await fetch(downloadUrl, { cache: 'reload', credentials: 'omit', redirect: 'error' });
        if (!response.ok || response.type === 'opaque') throw new Error('Reference download failed');
        const digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
        if (digest !== asset.sha256) throw new Error('Reference version mismatch');
        if (asset.contentType) {
          const headers = new Headers(response.headers);
          headers.set('Content-Type', asset.contentType);
          // Fetch exposes decoded bytes; transport encoding/length no longer
          // describe this synthetic response. Preserve security headers.
          headers.delete('Content-Encoding');
          headers.delete('Content-Length');
          await cache.put(url, new Response(await response.arrayBuffer(), { status: response.status, headers }));
        } else await cache.put(url, response);
      }
}
async function cachedAssetMatches(cache, asset) {
  const response = await cache.match(new URL(asset.path, BASE).href);
  if (!response || response.type === 'opaque') return false;
  try {
    const digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
    return digest === asset.sha256;
  } catch {
    return false;
  }
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      await downloadPack();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  // A waiting worker reaches activation only after existing Pocket windows have
  // closed. Never clear caches belonging to another app or another scope.
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Chrome keeps the fragment on navigation requests; the hash router means
  // every reopen of "#/guides" would otherwise miss the allowlist.
  url.hash = '';
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith((async () => {
    if (request.method !== 'GET' || url.search) return new Response('Not part of the pocket reference bundle', { status: 404 });
    let key = url.href === BASE.href ? new URL('index.html', BASE).href : url.href;
    // A built shell imports modules/data from its immutable release URL. Map
    // only this installed version back to its verified cache keys; never fetch
    // an unknown path or another release during an existing session.
    if (url.href.startsWith(PINNED.href)) {
      const relative = url.href.slice(PINNED.href.length);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(relative)
        || relative.split('/').some(part => !part || part === '.' || part === '..')) {
        return new Response('Not part of the pocket reference bundle', { status: 404 });
      }
      key = new URL(relative, BASE).href;
    }
    if (!allowed.has(key)) return new Response('Not part of the pocket reference bundle', { status: 404 });
    const cached = await (await caches.open(CACHE)).match(key);
    // Media seeks must stay within the verified full file, including offline.
    // Never fetch a partial response or add a runtime request to the cache.
    const rangeHeader = request.headers?.get('range');
    if (cached && key.endsWith('.mp4') && rangeHeader !== null && rangeHeader !== undefined) {
      const bytes = await cached.arrayBuffer();
      const range = parseByteRange(rangeHeader, bytes.byteLength);
      const headers = new Headers(cached.headers);
      headers.set('Accept-Ranges', 'bytes');
      if (!range) {
        headers.set('Content-Range', `bytes */${bytes.byteLength}`);
        headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
      }
      const [start, end] = range;
      headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
      headers.set('Content-Length', String(end - start + 1));
      return new Response(bytes.slice(start, end + 1), { status: 206, headers });
    }
    return cached || new Response('Reference download missing. Reconnect and repair the offline copy.', { status: 503 });
  })());
});
self.addEventListener('message', event => {
  const reply = value => event.ports[0]?.postMessage(value);
  if (event.data?.type === 'STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      // Bound full-file reads: motion clips must not all be copied into memory
      // together on a phone just to report the installed pack's status.
      let complete = true;
      for (const asset of ASSETS) if (!await cachedAssetMatches(cache, asset)) { complete = false; break; }
      reply({ version: RELEASE.version, builtAt: RELEASE.builtAt, releaseNotes: RELEASE.releaseNotes,
        complete, assets: ASSETS.length });
    })());
  }
  // Install now: sent only by the user's tap on a verified waiting update.
  // Activation is refused while another Pocket window is open, because the
  // activate step removes the previous version's files that window still uses.
  if (event.data?.type === 'ACTIVATE') {
    event.waitUntil((async () => {
      const waiting = self.registration?.waiting;
      if (!waiting || (self.serviceWorker && waiting !== self.serviceWorker)) {
        reply({ ok: false, reason: 'not-waiting' }); return;
      }
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.length > 1) { reply({ ok: false, reason: 'windows', windows: windows.length }); return; }
      const cache = await caches.open(CACHE);
      for (const asset of ASSETS) {
        if (!await cachedAssetMatches(cache, asset)) { reply({ ok: false, reason: 'incomplete' }); return; }
      }
      await self.skipWaiting();
      reply({ ok: true, version: RELEASE.version });
    })());
  }
  if (event.data?.type === 'REPAIR') {
    event.waitUntil((async () => {
      try { await downloadPack(); reply({ ok: true }); }
      catch { reply({ ok: false, message: 'Could not repair this version. Reconnect and check for an update; retained files were preserved.' }); }
    })());
  }
});
