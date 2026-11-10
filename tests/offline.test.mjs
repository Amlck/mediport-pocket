import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { parseByteRange } from '../src/byte-range.mjs';

const template = await readFile(new URL('../src/sw-template.js', import.meta.url), 'utf8');
const offlineUi = await readFile(new URL('../src/app/lib/offline.js', import.meta.url), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
function harness({ corrupt = false, fail = false, media = false, canonicalShell = false, isolatedShell = false, pinned = false, windows = 1, waiting = true } = {}) {
  const stores = new Map();
  const handlers = new Map();
  const calls = [];
  let networkFailure = fail;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { async put(key, response) { store.set(String(key), response.clone()); }, async match(key) { return store.get(String(key))?.clone(); } };
    },
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
  };
  const worker = {};
  const activation = { skipped: 0, windowQueries: [] };
  const self = { location: { href: 'https://pocket.example/pocket/sw.js' },
    serviceWorker: worker,
    registration: { waiting: waiting ? worker : null },
    clients: { async matchAll(options) { activation.windowQueries.push(options); return Array.from({ length: windows }, () => ({})); } },
    async skipWaiting() { activation.skipped++; },
    addEventListener(type, callback) { handlers.set(type, callback); } };
  vm.runInNewContext(`const RELEASE={version:'test-v1',builtAt:'2026-09-24T15:00:00.000Z',releaseNotes:{date:'2026-09-24',label:'Pocket usability update',changes:['Clearer updates']}}; const ASSETS=[{path:'index.html',${isolatedShell ? "downloadPath:'offline-shell.txt',contentType:'text/html; charset=utf-8'," : canonicalShell ? "downloadPath:'./'," : ''}sha256:'${digest('app shell')}'},{path:'reference.json',sha256:'${digest('reference snapshot')}'}${pinned ? `,{path:'app.js',downloadPath:'__releases/test-v1/app.js',sha256:'${digest('pinned application')}'},{path:'data/reference.json',downloadPath:'__releases/test-v1/data/reference.json',sha256:'${digest('pinned clinical data')}'}` : ''}${media ? `,{path:'images/pocus/clip.mp4',sha256:'${digest('0123456789')}'}` : ''}];\n${parseByteRange.toString()}\n${template}`, {
    self, caches, crypto: webcrypto, URL, Response, Headers, Uint8Array,
    fetch: async (url, options) => {
      calls.push({url, options});
      if (canonicalShell && url.endsWith('index.html')) throw new Error('Host redirects index.html; redirects remain forbidden.');
      if (networkFailure) return new Response('unavailable', {status:503});
      if (isolatedShell && url.endsWith('offline-shell.txt')) return new Response(corrupt ? 'injected script' : 'app shell', { headers: { 'Content-Type': 'text/plain', 'Content-Encoding': 'br', 'Content-Length': '1234', 'Content-Security-Policy': "default-src 'self'" } });
      if (pinned && url.endsWith('/app.js')) return new Response(corrupt ? 'wrong' : 'pinned application');
      if (pinned && url.endsWith('/data/reference.json')) return new Response(corrupt ? 'wrong' : 'pinned clinical data');
      if (url.endsWith('.mp4')) return new Response(corrupt ? 'wrong' : '0123456789', { headers: { 'Content-Type': 'video/mp4' } });
      return new Response(corrupt ? 'wrong version' : url.endsWith('index.html') || (canonicalShell && url.endsWith('/pocket/')) ? 'app shell' : 'reference snapshot');
    },
  });
  async function event(type, extra = {}) {
    let pending;
    let response;
    const target = { waitUntil(value) { pending = value; }, respondWith(value) { response = value; }, ...extra };
    handlers.get(type)(target);
    await pending;
    return response ? await response : undefined;
  }
  async function message(type) {
    let result;
    await event('message', {data:{type}, ports:[{postMessage(value) { result = value; }}]});
    return result;
  }
  return { event, message, caches, stores, calls, activation, setFailure(value) { networkFailure=value; } };
}
test('install verifies the complete allowlisted pack before reporting offline ready', async () => {
  const h = harness();
  await h.event('install');
  const status = await h.message('STATUS');
  assert.equal(status.complete, true); assert.equal(status.version, 'test-v1');
  assert.equal(status.builtAt, '2026-09-24T15:00:00.000Z');
  assert.equal(status.releaseNotes.date, '2026-09-24');
  assert.deepEqual(Array.from(status.releaseNotes.changes), ['Clearer updates']);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls.every(call => call.options.credentials === 'omit' && call.options.redirect === 'error'));
  assert.doesNotMatch(template, /clients\.claim/);
  assert.equal(h.activation.skipped, 0, 'installing never activates by itself');
  // skipWaiting appears once, inside the user-requested ACTIVATE handler only.
  assert.equal(template.match(/skipWaiting/g).length, 1);
  const activate = template.slice(template.indexOf("type === 'ACTIVATE'"), template.indexOf("type === 'REPAIR'"));
  assert.match(activate, /skipWaiting/);
});

test('install now activates only a complete waiting version that is the sole Pocket window', async () => {
  const h = harness(); await h.event('install');
  assert.deepEqual({ ...await h.message('ACTIVATE') }, { ok: true, version: 'test-v1' });
  assert.equal(h.activation.skipped, 1);
  assert.equal(h.activation.windowQueries[0].type, 'window');
  assert.equal(h.activation.windowQueries[0].includeUncontrolled, true, 'windows of the running version count');

  const crowded = harness({ windows: 2 }); await crowded.event('install');
  assert.deepEqual({ ...await crowded.message('ACTIVATE') }, { ok: false, reason: 'windows', windows: 2 });
  assert.equal(crowded.activation.skipped, 0, 'another open window keeps the running version');

  const active = harness({ waiting: false }); await active.event('install');
  assert.equal((await active.message('ACTIVATE')).reason, 'not-waiting');
  assert.equal(active.activation.skipped, 0);

  const partial = harness({ corrupt: true });
  await assert.rejects(partial.event('install'));
  assert.equal((await partial.message('ACTIVATE')).reason, 'incomplete');
  assert.equal(partial.activation.skipped, 0, 'an unverified download never takes over');
});

test('public install downloads the canonical shell without following redirects and keeps offline navigation', async () => {
  const h = harness({ canonicalShell: true });
  await h.event('install');
  assert.equal((await h.message('STATUS')).complete, true);
  assert.equal(h.calls[0].url, 'https://pocket.example/pocket/');
  assert.ok(h.calls.every(call => call.options.redirect === 'error'));
  h.setFailure(true);
  assert.equal(await (await h.event('fetch', { request: new Request('https://pocket.example/pocket/#/install') })).text(), 'app shell');
});

test('public shell verifies plain-text bytes before restoring HTML MIME and preserves security headers', async () => {
  const h = harness({ isolatedShell: true });
  await h.event('install');
  assert.equal(h.calls[0].url, 'https://pocket.example/pocket/offline-shell.txt');
  assert.equal((await h.message('STATUS')).complete, true);
  h.setFailure(true);
  const response = await h.event('fetch', { request: new Request('https://pocket.example/pocket/') });
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'self'");
  assert.equal(response.headers.get('Content-Encoding'), null);
  assert.equal(response.headers.get('Content-Length'), null);
  assert.equal(await response.text(), 'app shell');
  await assert.rejects(harness({ isolatedShell: true, corrupt: true }).event('install'), /Reference version mismatch/);
});

test('offline video ranges and seeks read only the verified full cached media', async () => {
  const h = harness({ media: true });
  await h.event('install'); h.setFailure(true);
  for (const [range, body, contentRange] of [
    ['bytes=0-1', '01', 'bytes 0-1/10'],
    ['bytes=6-', '6789', 'bytes 6-9/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=8-99', '89', 'bytes 8-9/10'],
  ]) {
    const response = await h.event('fetch', { request: new Request('https://pocket.example/pocket/images/pocus/clip.mp4', { headers: { Range: range } }) });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Type'), 'video/mp4');
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(response.headers.get('Content-Length'), String(body.length));
    assert.equal(await response.text(), body);
  }
  for (const range of ['bytes=10-', 'bytes=9-2', 'bytes=-0', 'bytes=0-1,5-6', 'bogus']) {
    const response = await h.event('fetch', { request: new Request('https://pocket.example/pocket/images/pocus/clip.mp4', { headers: { Range: range } }) });
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
    assert.equal(await response.text(), '');
  }
  assert.equal((await h.event('fetch', { request: new Request('https://pocket.example/pocket/images/pocus/secret.mp4', { headers: { Range: 'bytes=0-1' } }) })).status, 404);
  assert.equal((await h.event('fetch', { request: new Request('https://pocket.example/pocket/images/pocus/clip.mp4?patient=x', { headers: { Range: 'bytes=0-1' } }) })).status, 404);
  assert.equal(h.calls.length, 3, 'no runtime media request uses the network');
  assert.equal((await h.message('STATUS')).complete, true, 'seeks leave the full verified cache intact');
});
test('update UI switches versions only from the explicit install-now action', () => {
  assert.match(offlineUi, /export async function applyUpdate\(\)/);
  assert.match(offlineUi, /Close ALL Pocket windows, then reopen Pocket to install it/);
  assert.match(offlineUi, /navigator\.serviceWorker\.controller \|\| registration\?\.active/);
  assert.doesNotMatch(offlineUi, /skipWaiting|clients\.claim/);
  // The page's single ACTIVATE request and reload both live in runInstall.
  const install = offlineUi.slice(offlineUi.indexOf('async function runInstall()'), offlineUi.indexOf('export async function installUpdate()'));
  assert.equal(offlineUi.match(/'ACTIVATE'/g).length, 1);
  assert.equal(offlineUi.match(/location\.reload\(\)/g).length, 1);
  assert.match(install, /'ACTIVATE'/);
  assert.match(install, /location\.reload\(\)/);
});
test('offline fetches use only installed files and never cache arbitrary API or navigation requests', async () => {
  const h = harness(); await h.event('install'); h.setFailure(true);
  assert.equal(await (await h.event('fetch', {request:new Request('https://pocket.example/pocket/')})).text(), 'app shell');
  // Chrome passes the fragment through on navigation requests; the hash router relies on this.
  assert.equal(await (await h.event('fetch', {request:{url:'https://pocket.example/pocket/#/guides', method:'GET'}})).text(), 'app shell');
  assert.equal(await (await h.event('fetch', {request:new Request('https://pocket.example/pocket/reference.json')})).text(), 'reference snapshot');
  for (const url of ['api/patients', 'reference.json?patient=example', '../pocket/not-in-bundle']) {
    assert.equal((await h.event('fetch', {request:new Request(new URL(url, 'https://pocket.example/pocket/'))})).status, 404);
  }
  assert.equal((await h.event('fetch', {request:new Request('https://pocket.example/pocket/reference.json', {method:'POST',body:'not stored'})})).status, 404);
  assert.equal(h.calls.length, 2, 'runtime requests do not fetch or populate cache');
});
test('offline pinned modules, data and media resolve only to this installed release cache', async () => {
  const h = harness({ pinned: true, media: true });
  await h.event('install'); h.setFailure(true);
  const base = 'https://pocket.example/pocket/__releases/test-v1/';
  for (const [path, body] of [['app.js', 'pinned application'], ['data/reference.json', 'pinned clinical data']]) {
    const response = await h.event('fetch', { request: new Request(base + path) });
    assert.equal(response.status, 200); assert.equal(await response.text(), body);
  }
  const video = await h.event('fetch', { request: new Request(base + 'images/pocus/clip.mp4', { headers: { Range: 'bytes=2-4' } }) });
  assert.equal(video.status, 206); assert.equal(await video.text(), '234');
  for (const url of [
    'https://pocket.example/pocket/__releases/test-v2/app.js',
    base + '../app.js', base + '%2e%2e/app.js', base + '%2e%2e%2fapp.js',
    base + 'app.js?patient=example', base + 'not-in-bundle.js',
  ]) assert.equal((await h.event('fetch', { request: new Request(url) })).status, 404);
  assert.equal((await h.event('fetch', { request: new Request(base + 'app.js', { method: 'POST', body: 'not stored' }) })).status, 404);
  assert.equal(await h.event('fetch', { request: new Request('https://other.example/pocket/__releases/test-v1/app.js') }), undefined, 'foreign origins are outside this worker');
  assert.equal(h.calls.length, 5, 'pinned runtime requests never fetch or add cache entries');
});
test('failed or mismatched download cannot replace a prior installed cache', async () => {
  for (const options of [{fail:true}, {corrupt:true}]) {
    const h = harness(options);
    const previous = await h.caches.open('mediport-pocket:/pocket/:prior');
    await previous.put('old', new Response('retained'));
    await assert.rejects(h.event('install'));
    assert.equal(h.stores.has('mediport-pocket:/pocket/:test-v1'), false);
    assert.equal(await (await previous.match('old')).text(), 'retained');
  }
});
test('incomplete cache reports unavailable files instead of falsely claiming offline readiness', async () => {
  const h = harness(); await h.event('install');
  h.stores.get('mediport-pocket:/pocket/:test-v1').delete('https://pocket.example/pocket/reference.json');
  assert.equal((await h.message('STATUS')).complete, false);
  assert.equal((await h.event('fetch', {request:new Request('https://pocket.example/pocket/reference.json')})).status, 503);
  assert.equal((await h.message('REPAIR')).ok, true);
  assert.equal((await h.message('STATUS')).complete, true);
});
test('tampered cached bytes are incomplete even when every asset key exists', async () => {
  const h = harness(); await h.event('install');
  h.stores.get('mediport-pocket:/pocket/:test-v1').set('https://pocket.example/pocket/reference.json', new Response('tampered'));
  assert.equal((await h.message('STATUS')).complete, false);
});
test('failed repair preserves existing files and failed readiness stays explicit', async () => {
  const h = harness(); await h.event('install');
  h.stores.get('mediport-pocket:/pocket/:test-v1').delete('https://pocket.example/pocket/reference.json');
  h.setFailure(true);
  assert.equal((await h.message('REPAIR')).ok, false);
  assert.equal((await h.message('STATUS')).complete, false);
  assert.equal(await (await h.event('fetch', {request:new Request('https://pocket.example/pocket/')})).text(), 'app shell');
});
test('only natural activation cleans old caches within this Pocket scope', async () => {
  const h = harness();
  await h.caches.open('other-app'); await h.caches.open('mediport-pocket:/different/:v1'); await h.caches.open('mediport-pocket:/pocket/:old');
  await h.event('install');
  assert.equal(h.stores.has('mediport-pocket:/pocket/:old'), true, 'install must leave the active version intact');
  await h.event('activate');
  assert.equal(h.stores.has('mediport-pocket:/pocket/:old'), false);
  assert.equal(h.stores.has('other-app'), true); assert.equal(h.stores.has('mediport-pocket:/different/:v1'), true);
});
