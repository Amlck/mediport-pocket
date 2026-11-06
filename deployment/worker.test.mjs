import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createDeploymentWorker, sha256, validateClaims, verifyGitHubIdentity } from './worker.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const ORIGIN = 'https://mediport-pocket.abuzz-moth-0863.chatgpt.site';
const NOW = Date.UTC(2026, 10, 6, 10);
const COMMIT = 'a'.repeat(40);
const VERSION = 'pocket-public-' + '1'.repeat(12);
const encode = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
const claims = (extra = {}) => ({ iss: 'https://token.actions.githubusercontent.com', aud: ORIGIN, repository: 'Amlck/mediport-pocket', repository_id: '1448023125', repository_owner_id: '107248218', ref: 'refs/heads/main', event_name: 'push', workflow_ref: 'Amlck/mediport-pocket/.github/workflows/ci.yml@refs/heads/main', environment: 'production', sub: 'repo:Amlck/mediport-pocket:environment:production', sha: COMMIT, run_id: '42189521262', run_number: '12', run_attempt: '1', iat: NOW / 1000 - 10, nbf: NOW / 1000 - 10, exp: NOW / 1000 + 290, ...extra });

class MemoryBucket {
  constructor() { this.objects = new Map(); this.sequence = 0; this.activeRace = null; }
  async get(key) {
    const value = this.objects.get(key); if (!value) return null;
    const bytes = value.bytes.slice();
    return { size: bytes.byteLength, etag: value.etag, async arrayBuffer() { return bytes.buffer; } };
  }
  async put(key, data, options = {}) {
    if (key.endsWith('active.json') && this.activeRace) { const race = this.activeRace; this.activeRace = null; await race(key, this); }
    const previous = this.objects.get(key);
    if (options.onlyIf?.etagDoesNotMatch === '*' && previous) return null;
    if (options.onlyIf?.etagMatches !== undefined && previous?.etag !== options.onlyIf.etagMatches) return null;
    const bytes = typeof data === 'string' ? encode(data) : new Uint8Array(data).slice();
    const value = { bytes, etag: 'etag-' + ++this.sequence }; this.objects.set(key, value); return { etag: value.etag };
  }
}

async function fixture({ version = VERSION, commit = COMMIT } = {}) {
  const release = { version, builtAt: '2026-11-06T10:00:00.000Z', releaseNotes: { date: '2026-11-06', label: 'Test release', changes: ['Fictional fixture'] }, profile: 'public-share', source: { repository: 'https://github.com/Amlck/mediport-pocket', commit, dirty: false } };
  const files = new Map([
    ['index.html', encode('<!doctype html><html><body>Pocket</body></html>')],
    ['offline-shell.txt', encode('<!doctype html><html><body>Pocket</body></html>')],
    ['release.json', encode(release)], ['app.js', encode('export const fixture = true;')],
    ['images/clip.mp4', encode('0123456789')],
    ['_headers', encode("/*\n Content-Security-Policy: default-src 'self'\n")],
  ]);
  const worker = `const RELEASE = ${JSON.stringify({ version, builtAt: release.builtAt, releaseNotes: release.releaseNotes })};\nconst ASSETS = [];\n// fixture`;
  files.set('sw.js', encode(worker));
  const assets = await Promise.all([...files].filter(([name]) => !['sw.js', '_headers'].includes(name)).map(async ([path, bytes]) => ({ path, sha256: await sha256(bytes) })));
  const inventory = { release, assets, workerSha256: await sha256(files.get('sw.js')), headersSha256: await sha256(files.get('_headers')) };
  files.set('bundle-inventory.json', encode(inventory));
  const manifest = { version, sourceCommit: commit, inventorySha256: await sha256(files.get('bundle-inventory.json')), files: await Promise.all([...files].map(async ([path, bytes]) => ({ path, sha256: await sha256(bytes), size: bytes.byteLength }))) };
  return { release, files, manifest, inventory };
}
function harness({ identity = claims(), bootstrap = null, main = COMMIT, bucket = new MemoryBucket(), bootstrapFiles } = {}) {
  const calls = [];
  const worker = createDeploymentWorker({
    now: () => NOW,
    verifyIdentity: async token => { if (token !== 'fixture-token') throw Error('bad token'); return identity; },
    bootstrap,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.redirect, 'manual', 'edge subrequests must leave redirects unfollowed');
      if (url === 'https://api.github.com/repos/Amlck/mediport-pocket/git/ref/heads/main') return new Response(JSON.stringify({ object: { sha: main } }));
      if (bootstrapFiles && url.startsWith('https://raw.githubusercontent.com/Amlck/mediport-pocket/')) {
        const name = url.split('/').slice(6).join('/');
        const bytes = bootstrapFiles.get(name); return new Response(bytes || 'missing', { status: bytes ? 200 : 404 });
      }
      throw Error('Unexpected network request');
    },
  });
  async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    return worker.fetch(new Request(ORIGIN + path, { method, headers: { ...(auth ? { Authorization: 'Bearer fixture-token' } : {}), ...headers }, ...(body !== undefined ? { body: body instanceof Uint8Array ? body : JSON.stringify(body) } : {}) }), { BUCKET: bucket });
  }
  return { request, bucket, calls };
}
async function upload(h, f, except = '') {
  const prepared = await h.request('/__deploy/prepare', { method: 'POST', body: f.manifest });
  assert.ok([200, 201].includes(prepared.status), await prepared.text());
  for (const [path, bytes] of f.files) if (path !== except) assert.ok([200, 201].includes((await h.request('/__deploy/releases/' + f.release.version + '/' + path, { method: 'PUT', body: bytes })).status));
}

const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'worker-test-key', alg: 'RS256', use: 'sig' };
const base64url = bytes => Buffer.from(bytes).toString('base64url');
async function token(body, header = { alg: 'RS256', kid: jwk.kid }) {
  const input = base64url(encode(header)) + '.' + base64url(encode(body));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, encode(input));
  return input + '.' + base64url(signature);
}

test('production authentication verifies real RS256 signatures and the fixed GitHub JWKS only', async () => {
  const calls = [];
  const jwt = await token(claims());
  const verified = await verifyGitHubIdentity(jwt, { now: NOW, fetchImpl: async (url, options) => { assert.equal(options.redirect, 'manual'); calls.push(url); return new Response(JSON.stringify({ keys: [jwk] })); } });
  assert.equal(verified.sha, COMMIT);
  assert.deepEqual(calls, ['https://token.actions.githubusercontent.com/.well-known/jwks']);
  await assert.rejects(verifyGitHubIdentity(jwt.slice(0, -10) + 'AAAAAAAAAA', { now: NOW }), /signature/i);
  await assert.rejects(verifyGitHubIdentity(await token(claims(), { alg: 'none', kid: jwk.kid }), { now: NOW }), /signature/i);
  await assert.rejects(verifyGitHubIdentity(await token(claims(), { alg: 'RS256', kid: jwk.kid, jku: 'https://attacker.invalid' }), { now: NOW }), /signature/i);
});

test('identity rejects another repository, owner, workflow, PR/ref, audience, environment and expired or excessive lifetime', () => {
  for (const extra of [ { repository: 'Other/mediport-pocket' }, { repository_id: '1' }, { repository_owner_id: '1' }, { workflow_ref: 'Amlck/mediport-pocket/.github/workflows/evil.yml@refs/heads/main' }, { event_name: 'pull_request' }, { ref: 'refs/heads/feature' }, { aud: ORIGIN + '/' }, { environment: 'preview' }, { sub: 'repo:Amlck/mediport-pocket:ref:refs/heads/main' }, { exp: NOW / 1000 - 1 }, { iat: NOW / 1000 - 1000 }, { exp: NOW / 1000 + 1000 }, { run_number: '0' }, { sha: '../main' } ]) assert.throws(() => validateClaims(claims(extra), NOW));
});

test('immutable GitHub subject binds the exact numeric repository and owner IDs', async () => {
  const identity = claims({ sub: 'repo:Amlck@107248218/mediport-pocket@1448023125:environment:production' });
  assert.equal(validateClaims(identity, NOW).sourceCommit, COMMIT);
  const verified = await verifyGitHubIdentity(await token(identity), { now: NOW });
  assert.equal(verified.sub, identity.sub);
  for (const sub of [
    'repo:Amlck@1/mediport-pocket@1448023125:environment:production',
    'repo:Amlck@107248218/mediport-pocket@1:environment:production',
    'repo:Amlck@107248218/mediport-pocket@1448023125:environment:preview',
  ]) assert.throws(() => validateClaims(claims({ sub }), NOW));
});

test('all deployment operations require authorized identities and declared bounded files', async () => {
  const h = harness(); const f = await fixture();
  assert.equal((await h.request('/__deploy/prepare', { method: 'POST', body: f.manifest, auth: false })).status, 401);
  assert.equal((await h.request('/__deploy/prepare', { method: 'POST', body: { ...f.manifest, files: [...f.manifest.files, f.manifest.files[0]] } })).status, 400);
  assert.equal((await h.request('/__deploy/prepare', { method: 'POST', body: { ...f.manifest, files: f.manifest.files.map((file, i) => i ? file : { ...file, path: '../secret.json' }) } })).status, 400);
  assert.equal((await h.request('/__deploy/prepare', { method: 'POST', body: { ...f.manifest, files: f.manifest.files.map((file, i) => i ? file : { ...file, size: 9 * 1024 * 1024 }) } })).status, 400);
  await upload(h, f);
  assert.equal((await h.request('/__deploy/releases/' + VERSION + '/undeclared.js', { method: 'PUT', body: encode('x') })).status, 400);
  assert.equal((await h.request('/__deploy/releases/' + VERSION + '/app.js', { method: 'PUT', body: encode('bad') })).status, 400);
});

test('complete verified release activates once and serves only allowlisted bytes with security headers and media ranges', async () => {
  const h = harness(); const f = await fixture(); await upload(h, f);
  const response = await h.request('/__deploy/activate', { method: 'POST', body: { version: VERSION } });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).active.sourceCommit, COMMIT);
  assert.equal((await (await h.request('/')).text()), '<!doctype html><html><body>Pocket</body></html>');
  const head = await h.request('/app.js', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(head.headers.get('Cache-Control'), 'no-store'); assert.equal(head.headers.get('X-Content-Type-Options'), 'nosniff');
  const partial = await h.request('/images/clip.mp4', { headers: { Range: 'bytes=2-4' } });
  assert.equal(partial.status, 206); assert.equal(await partial.text(), '234'); assert.equal(partial.headers.get('Content-Range'), 'bytes 2-4/10');
  assert.equal((await h.request('/images/clip.mp4', { headers: { Range: 'bytes=100-' } })).status, 416);
  for (const path of ['/api/patients', '/.env', '/_headers', '/app.js?private=x', '/__releases/' + VERSION + '/undeclared.js']) assert.equal((await h.request(path)).status, 404);
  assert.equal((await h.request('/__releases/' + VERSION + '/app.js')).status, 200);
  const repeated = await h.request('/__deploy/activate', { method: 'POST', body: { version: VERSION } });
  assert.equal((await repeated.json()).activated, false);
});

test('missing or tampered upload never replaces a usable active pointer', async () => {
  const h = harness(); const f = await fixture(); await upload(h, f, 'app.js');
  const pointerKey = 'mediport-pocket/deploy-v1/active.json';
  await h.bucket.put(pointerKey, JSON.stringify({ version: 'pocket-public-' + '0'.repeat(12), sourceCommit: 'b'.repeat(40), runNumber: 10, runId: '1', runAttempt: 1 }));
  const before = h.bucket.objects.get(pointerKey).bytes.slice();
  assert.equal((await h.request('/__deploy/activate', { method: 'POST', body: { version: VERSION } })).status, 400);
  assert.deepEqual(h.bucket.objects.get(pointerKey).bytes, before);
  await h.bucket.put('mediport-pocket/deploy-v1/releases/' + VERSION + '/files/app.js', encode('tampered'));
  assert.equal((await h.request('/__deploy/activate', { method: 'POST', body: { version: VERSION } })).status, 400);
  assert.deepEqual(h.bucket.objects.get(pointerKey).bytes, before);
});

test('stale source and out-of-order runs are rejected, including a conditional pointer race', async () => {
  const f = await fixture();
  const stale = harness({ main: 'b'.repeat(40) });
  const rejected = await stale.request('/__deploy/prepare', { method: 'POST', body: f.manifest });
  assert.equal(rejected.status, 409); assert.equal((await rejected.json()).code, 'stale_source');
  const h = harness(); await upload(h, f);
  const pointerKey = 'mediport-pocket/deploy-v1/active.json';
  h.bucket.activeRace = async (key, bucket) => bucket.put(key, JSON.stringify({ version: 'pocket-public-' + '2'.repeat(12), sourceCommit: 'c'.repeat(40), runNumber: 13, runId: '2', runAttempt: 1 }));
  const activation = await h.request('/__deploy/activate', { method: 'POST', body: { version: VERSION } });
  assert.equal(activation.status, 409); assert.equal((await activation.json()).code, 'stale_source');
  assert.equal(JSON.parse(new TextDecoder().decode(h.bucket.objects.get(pointerKey).bytes)).runNumber, 13);
});

test('prepare and upload are immutable, and release source metadata is checked before activation', async () => {
  const h = harness(); const f = await fixture(); await upload(h, f);
  const changed = { ...f.manifest, files: f.manifest.files.map(file => file.path === 'app.js' ? { ...file, sha256: 'f'.repeat(64) } : file) };
  assert.equal((await h.request('/__deploy/prepare', { method: 'POST', body: changed })).status, 409);
  const bad = await fixture({ version: 'pocket-public-' + '3'.repeat(12) });
  const release = { ...bad.release, source: { ...bad.release.source, dirty: true } };
  bad.files.set('release.json', encode(release));
  const entry = bad.manifest.files.find(file => file.path === 'release.json'); entry.sha256 = await sha256(bad.files.get('release.json')); entry.size = bad.files.get('release.json').byteLength;
  await upload(h, bad);
  assert.equal((await h.request('/__deploy/activate', { method: 'POST', body: { version: bad.release.version } })).status, 400);
});

test('empty storage serves the exact fixed immutable bootstrap and active corruption never falls back', async () => {
  const f = await fixture();
  const h = harness({ bootstrap: { repository: 'Amlck/mediport-pocket', commit: 'd'.repeat(40) }, bootstrapFiles: f.files });
  const response = await h.request('/'); assert.equal(response.status, 200, await response.clone().text());
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), f.files.get('index.html'));
  assert.equal((await h.request('/__releases/' + VERSION + '/app.js')).status, 200);
  assert.equal((await h.request('/__releases/pocket-public-' + '9'.repeat(12) + '/app.js')).status, 404);
  assert.ok(h.calls.every(call => call.url.startsWith('https://raw.githubusercontent.com/Amlck/mediport-pocket/' + 'd'.repeat(40) + '/')));
  await h.bucket.put('mediport-pocket/deploy-v1/active.json', JSON.stringify({ version: VERSION }));
  assert.equal((await h.request('/')).status, 503);
  assert.throws(() => createDeploymentWorker({ bootstrap: { repository: 'Other/repo', commit: 'main' } }));
});

test('corrupt bootstrap bytes fail closed and hostile public URLs never become an arbitrary proxy', async () => {
  const f = await fixture();
  const corrupted = new Map(f.files); corrupted.set('app.js', encode('changed after the immutable receipt'));
  const h = harness({ bootstrap: { repository: 'Amlck/mediport-pocket', commit: 'd'.repeat(40) }, bootstrapFiles: corrupted });
  assert.equal((await h.request('/app.js')).status, 503);
  for (const path of ['/.env', '/__deploy/other', '/https://example.org/x.js', '/__releases/' + VERSION + '/app.js?x=1']) {
    const response = await h.request(path, { auth: false });
    assert.ok([401, 404].includes(response.status));
  }
  assert.ok(h.calls.every(call => call.url.startsWith('https://raw.githubusercontent.com/Amlck/mediport-pocket/' + 'd'.repeat(40) + '/')));
});


test('bootstrap redirects remain unfollowed and cannot supply a release', async () => {
  const calls = [];
  const worker = createDeploymentWorker({ bootstrap: { repository: 'Amlck/mediport-pocket', commit: 'b'.repeat(40) }, fetchImpl: async (url, options) => {
    calls.push({url, options});
    assert.equal(options.redirect, 'manual');
    return new Response(null, {status:302, headers:{Location:'https://attacker.invalid/pack'}});
  } });
  const response = await worker.fetch(new Request(ORIGIN + '/'), {BUCKET:new MemoryBucket()});
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'bootstrap_unavailable');
  assert.equal(calls.length,1);
});
