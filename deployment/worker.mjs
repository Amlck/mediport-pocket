// Deployment bridge for the public Pocket edition. No standing deployment secret.
// GitHub Actions OIDC authorizes only this repository's main push workflow.
const ORIGIN = 'https://mediport-pocket.abuzz-moth-0863.chatgpt.site';
const REPOSITORY = 'Amlck/mediport-pocket';
const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS_URL = ISSUER + '/.well-known/jwks';
const MAIN_URL = 'https://api.github.com/repos/' + REPOSITORY + '/git/ref/heads/main';
const PREFIX = 'mediport-pocket/deploy-v1/';
const MAX_FILES = 300;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 32 * 1024 * 1024;
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const VERSION = /^pocket-public-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const TYPES = { html: 'text/html; charset=utf-8', txt: 'text/plain; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png', mp4: 'video/mp4' };
const ACTIVE_KEY = PREFIX + 'active.json';
const DEPLOYMENT_SUBJECTS = new Set([
  'repo:Amlck/mediport-pocket:environment:production',
  'repo:Amlck@107248218/mediport-pocket@1448023125:environment:production',
]);
const BOOTSTRAP = Object.freeze({ repository: REPOSITORY, commit: '5082d0d42456662812012b8bed42e000208d51d2' });
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
let jwksCache = null;

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function error(status, code, message) { throw new HttpError(status, code, message); }
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
export function validPath(value) {
  return typeof value === 'string' && value.length <= 240
    && (value === '_headers' || /^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(value))
    && !value.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))
    && !value.includes('\\') && !value.startsWith('__')
    && (value === '_headers' || Object.hasOwn(TYPES, value.split('.').at(-1)));
}
function number(value, label) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) error(401, 'invalid_identity', 'Invalid GitHub ' + label + '.');
  return Number(value);
}
export function validateClaims(claims, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  if (!claims || claims.iss !== ISSUER || claims.aud !== ORIGIN
    || claims.repository !== REPOSITORY || String(claims.repository_id) !== '1448023125'
    || String(claims.repository_owner_id) !== '107248218'
    || claims.ref !== 'refs/heads/main' || claims.event_name !== 'push'
    || claims.workflow_ref !== REPOSITORY + '/.github/workflows/ci.yml@refs/heads/main'
    || claims.environment !== 'production' || !DEPLOYMENT_SUBJECTS.has(claims.sub) || !SHA.test(claims.sha)) {
    error(401, 'invalid_identity', 'Only the approved GitHub main push workflow may deploy.');
  }
  if (![claims.iat, claims.nbf, claims.exp].every(Number.isInteger)
    || claims.exp <= seconds || claims.nbf > seconds + 30 || claims.iat > seconds + 30
    || claims.iat < seconds - 600 || claims.exp <= claims.iat || claims.exp - claims.iat > 600
    || claims.nbf > claims.exp) error(401, 'expired_identity', 'The deployment identity is expired or not yet valid.');
  return { sourceCommit: claims.sha, runId: String(number(claims.run_id, 'run ID')), runNumber: number(claims.run_number, 'run number'), runAttempt: number(claims.run_attempt, 'run attempt') };
}
function decodePart(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) error(401, 'invalid_identity', 'Malformed deployment identity.');
  try { return Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')), c => c.charCodeAt(0)); }
  catch { error(401, 'invalid_identity', 'Malformed deployment identity.'); }
}
async function boundedBytes(message, limit) {
  const declared = message.headers?.get('Content-Length');
  if (declared !== null && declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > limit)) error(413, 'payload_too_large', 'Deployment payload exceeds its limit.');
  if (!message.body) return new Uint8Array();
  const reader = message.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); error(413, 'payload_too_large', 'Deployment payload exceeds its limit.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size); let at = 0;
  for (const chunk of chunks) { all.set(chunk, at); at += chunk.byteLength; }
  return all;
}
async function parseJSON(message, limit = 1024 * 1024) {
  try { return JSON.parse(decoder.decode(await boundedBytes(message, limit))); }
  catch (e) { if (e instanceof HttpError) throw e; error(400, 'invalid_json', 'Invalid deployment JSON.'); }
}
export async function verifyGitHubIdentity(token, { fetchImpl = fetch, now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length > 20000) error(401, 'invalid_identity', 'Missing deployment identity.');
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0].length > 2048) error(401, 'invalid_identity', 'Malformed deployment identity.');
  let header, claims;
  try { header = JSON.parse(decoder.decode(decodePart(parts[0]))); claims = JSON.parse(decoder.decode(decodePart(parts[1]))); }
  catch { error(401, 'invalid_identity', 'Malformed deployment identity.'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid || header.kid.length > 200 || header.jku || header.jwk || header.x5u) error(401, 'invalid_identity', 'Unsupported deployment signature.');
  validateClaims(claims, now);
  if (!jwksCache || now - jwksCache.at > 300000 || (!jwksCache.keys.some(key => key.kid === header.kid) && now - jwksCache.at > 60000)) {
    const response = await fetchImpl(JWKS_URL, { redirect: 'manual', headers: { Accept: 'application/json' } });
    if (!response.ok) error(503, 'identity_unavailable', 'GitHub identity verification is unavailable.');
    const body = await parseJSON(response, 65536);
    if (!Array.isArray(body.keys) || body.keys.length > 20) error(503, 'identity_unavailable', 'GitHub identity verification is unavailable.');
    jwksCache = { at: now, keys: body.keys };
  }
  const jwk = jwksCache.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
  if (!jwk) error(401, 'invalid_identity', 'Unknown deployment signature.');
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodePart(parts[2]), encoder.encode(parts[0] + '.' + parts[1]));
    if (!ok) error(401, 'invalid_identity', 'Invalid deployment signature.');
  } catch (e) { if (e instanceof HttpError) throw e; error(401, 'invalid_identity', 'Invalid deployment signature.'); }
  return claims;
}
function validateManifest(body) {
  if (!body || !VERSION.test(body.version) || !SHA.test(body.sourceCommit) || !HASH.test(body.inventorySha256)
    || !Array.isArray(body.files) || body.files.length < 6 || body.files.length > MAX_FILES) error(400, 'invalid_manifest', 'Invalid public release manifest.');
  const names = new Set(); let total = 0;
  const files = body.files.map(file => {
    if (!file || !validPath(file.path) || !HASH.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE || names.has(file.path)) error(400, 'invalid_manifest', 'Invalid release file.');
    names.add(file.path); total += file.size;
    return { path: file.path, sha256: file.sha256, size: file.size };
  }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (total > MAX_TOTAL) error(413, 'payload_too_large', 'The public release is too large.');
  for (const required of ['index.html', 'offline-shell.txt', 'release.json', 'sw.js', 'bundle-inventory.json', '_headers']) if (!names.has(required)) error(400, 'invalid_manifest', 'Required release file missing.');
  if (files.find(file => file.path === 'bundle-inventory.json').sha256 !== body.inventorySha256) error(400, 'invalid_manifest', 'Inventory hash differs from the file list.');
  return { version: body.version, sourceCommit: body.sourceCommit, inventorySha256: body.inventorySha256, files };
}
const releaseKey = version => PREFIX + 'releases/' + version + '/';
async function objectBytes(bucket, key, limit = MAX_FILE) {
  const object = await bucket.get(key); if (!object) return null;
  if (object.size > limit) error(503, 'invalid_storage', 'Stored release data is invalid.');
  const bytes = new Uint8Array(await object.arrayBuffer());
  if (bytes.byteLength > limit) error(503, 'invalid_storage', 'Stored release data is invalid.');
  return bytes;
}
async function objectJSON(bucket, key) {
  const bytes = await objectBytes(bucket, key, 1024 * 1024);
  if (!bytes) return null;
  try { return JSON.parse(decoder.decode(bytes)); } catch { error(503, 'invalid_storage', 'Stored release metadata is invalid.'); }
}
async function recordJSON(bucket, key) {
  const object = await bucket.get(key); if (!object) return null;
  if (typeof object.etag !== 'string' || !object.etag) error(503, 'invalid_storage', 'Stored release revision is unavailable.');
  try { return { value: JSON.parse(decoder.decode(new Uint8Array(await object.arrayBuffer()))), etag: object.etag }; }
  catch { error(503, 'invalid_storage', 'Stored release metadata is invalid.'); }
}
async function putImmutable(bucket, key, bytes) {
  const written = await bucket.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' } });
  if (!written) {
    const existing = await objectBytes(bucket, key);
    if (!existing || await sha256(existing) !== await sha256(bytes)) error(409, 'immutable_release', 'The immutable release data already differs.');
  }
}
function parseStored(bytes, label) {
  try { return JSON.parse(decoder.decode(bytes)); } catch { error(400, 'invalid_release', 'Invalid ' + label + '.'); }
}
function requestSourceToken(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(value)) error(400, 'invalid_source_token', 'Invalid request-local GitHub source credential.');
  return value;
}
async function verifyRelease(manifest, load) {
  const received = new Map();
  // R2 reads incur network latency. Verify a bounded group concurrently while
  // retaining only the small metadata/shell files needed for cross-checks.
  // Activation below still waits for every declared file to pass its hash.
  let next = 0; let failed = false;
  async function verifyFiles() {
    while (!failed && next < manifest.files.length) {
      const file = manifest.files[next++];
      try {
        const bytes = await load(file.path);
        if (!bytes) error(400, 'incomplete_release', 'The release is missing a required file.');
        if (bytes.byteLength !== file.size || await sha256(bytes) !== file.sha256) error(400, 'hash_mismatch', 'A release file failed verification.');
        if (['release.json', 'bundle-inventory.json', 'sw.js', '_headers', 'index.html', 'offline-shell.txt'].includes(file.path)) received.set(file.path, bytes);
      } catch (e) { failed = true; throw e; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, manifest.files.length) }, verifyFiles));
  const inventory = parseStored(received.get('bundle-inventory.json'), 'inventory');
  const release = parseStored(received.get('release.json'), 'release metadata');
  if (release.version !== manifest.version || release.profile !== 'public-share' || release.source?.commit !== manifest.sourceCommit
    || release.source?.repository !== 'https://github.com/' + REPOSITORY || release.source?.dirty !== false
    || JSON.stringify(inventory.release) !== JSON.stringify(release) || !Array.isArray(inventory.assets) || inventory.assets.length > MAX_FILES) error(400, 'invalid_release', 'Release identity does not match the approved source.');
  const declared = new Map(manifest.files.map(file => [file.path, file]));
  const names = new Set();
  for (const asset of inventory.assets) {
    if (!asset || !validPath(asset.path) || names.has(asset.path) || !HASH.test(asset.sha256) || declared.get(asset.path)?.sha256 !== asset.sha256) error(400, 'invalid_release', 'Invalid inventory asset.');
    names.add(asset.path);
  }
  const expected = [...names, 'sw.js', 'bundle-inventory.json', '_headers'].sort();
  if (JSON.stringify(expected) !== JSON.stringify([...declared.keys()].sort())
    || inventory.workerSha256 !== declared.get('sw.js').sha256 || inventory.headersSha256 !== declared.get('_headers').sha256
    || await sha256(received.get('index.html')) !== await sha256(received.get('offline-shell.txt'))) error(400, 'invalid_release', 'The release inventory is inconsistent.');
  const worker = decoder.decode(received.get('sw.js'));
  if (!worker.startsWith(`const RELEASE = ${JSON.stringify({ version: release.version, builtAt: release.builtAt, releaseNotes: release.releaseNotes })};\n`)) error(400, 'invalid_release', 'Worker release metadata differs.');
  return { ...manifest, publicPaths: [...names, 'sw.js', 'bundle-inventory.json'].sort() };
}
function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || size < 1) return null;
  let start, end;
  if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix < 1) return null; start = Math.max(0, size - suffix); end = size - 1; }
  else { start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1; if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return null; end = Math.min(end, size - 1); }
  return [start, end];
}
function serve(bytes, filename, request) {
  const headers = new Headers({ 'Content-Type': TYPES[filename.split('.').at(-1)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  if (filename.endsWith('.mp4')) {
    headers.set('Accept-Ranges', 'bytes');
    const requested = request.headers.get('Range');
    if (requested !== null) {
      const range = parseRange(requested, bytes.byteLength);
      if (!range) { headers.set('Content-Range', `bytes */${bytes.byteLength}`); return new Response(null, { status: 416, headers }); }
      const [start, end] = range;
      headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`); headers.set('Content-Length', String(end - start + 1));
      return new Response(request.method === 'HEAD' ? null : bytes.slice(start, end + 1), { status: 206, headers });
    }
  }
  headers.set('Content-Length', String(bytes.byteLength));
  return new Response(request.method === 'HEAD' ? null : bytes, { status: 200, headers });
}

/** Test seams are code-owned; requests and environment variables cannot replace authentication. */
export function createDeploymentWorker({ verifyIdentity, fetchImpl = (...args) => fetch(...args), now = () => Date.now(), bootstrap = BOOTSTRAP } = {}) {
  if (bootstrap && (bootstrap.repository !== REPOSITORY || !SHA.test(bootstrap.commit))) throw new Error('Bootstrap must be an immutable commit in the public Pocket repository.');
  let bootstrapPromise;
  const bootstrapBytes = new Map(); let bootstrapSize = 0;
  async function bootstrapFile(filename, digest) {
    if (bootstrapBytes.has(filename)) return bootstrapBytes.get(filename);
    const url = 'https://raw.githubusercontent.com/' + REPOSITORY + '/' + bootstrap.commit + '/' + filename;
    const response = await fetchImpl(url, { redirect: 'manual' });
    if (!response.ok) error(503, 'bootstrap_unavailable', 'The initial public release is unavailable.');
    const bytes = await boundedBytes(response, MAX_FILE);
    if (digest && await sha256(bytes) !== digest) error(503, 'bootstrap_unavailable', 'The initial public release failed verification.');
    if (bootstrapSize + bytes.byteLength <= 24 * 1024 * 1024) { bootstrapBytes.set(filename, bytes); bootstrapSize += bytes.byteLength; }
    return bytes;
  }
  async function initialRelease() {
    if (!bootstrap) return null;
    if (!bootstrapPromise) bootstrapPromise = (async () => {
      const inventoryBytes = await bootstrapFile('bundle-inventory.json');
      const inventory = parseStored(inventoryBytes, 'bootstrap inventory');
      if (!VERSION.test(inventory.release?.version) || inventory.release?.profile !== 'public-share' || !Array.isArray(inventory.assets) || inventory.assets.length > MAX_FILES) error(503, 'bootstrap_unavailable', 'Initial public metadata is invalid.');
      const paths = new Map();
      for (const asset of inventory.assets) {
        if (!validPath(asset.path) || !HASH.test(asset.sha256) || paths.has(asset.path)) error(503, 'bootstrap_unavailable', 'Initial public inventory is invalid.');
        paths.set(asset.path, asset.sha256);
      }
      if (!HASH.test(inventory.workerSha256) || !HASH.test(inventory.headersSha256)) error(503, 'bootstrap_unavailable', 'Initial worker fingerprints are missing.');
      paths.set('sw.js', inventory.workerSha256); paths.set('_headers', inventory.headersSha256); paths.set('bundle-inventory.json', await sha256(inventoryBytes));
      return { version: inventory.release.version, sourceCommit: inventory.release.source?.commit, paths, publicPaths: [...paths.keys()].filter(name => name !== '_headers') };
    })().catch(e => { bootstrapPromise = null; throw e; });
    return bootstrapPromise;
  }
  async function identity(request) {
    const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('Authorization') || '');
    if (!match) error(401, 'invalid_identity', 'A GitHub Actions deployment identity is required.');
    const claims = verifyIdentity ? await verifyIdentity(match[1]) : await verifyGitHubIdentity(match[1], { fetchImpl, now: now() });
    return validateClaims(claims, now());
  }
  async function requireMain(sourceCommit, sourceToken) {
    const response = await fetchImpl(MAIN_URL, { redirect: 'manual', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mediport-Pocket-Deploy', 'Cache-Control': 'no-cache', ...(sourceToken ? { Authorization: 'Bearer ' + sourceToken } : {}) } });
    if (!response.ok) error(503, 'source_unavailable', 'Could not verify the current GitHub main commit.');
    const body = await parseJSON(response, 65536);
    if (body.object?.sha !== sourceCommit) error(409, 'stale_source', 'This release is no longer the current main commit.');
  }
  async function fetchRequest(request, env) {
    const url = new URL(request.url);
    if (url.origin !== ORIGIN || url.search) error(404, 'not_found', 'Not part of Mediport Pocket.');
    if (!env?.BUCKET) error(503, 'storage_unavailable', 'Release storage is unavailable.');
    const bucket = env.BUCKET;
    if (url.pathname.startsWith('/__deploy/')) {
      const who = await identity(request);
      if (request.method === 'POST' && url.pathname === '/__deploy/prepare') {
        const body = await parseJSON(request);
        const sourceToken = requestSourceToken(body?.sourceToken);
        // Normalize only release metadata; this request-local credential must
        // never enter manifests, active pointers, public responses or storage.
        const manifest = validateManifest(body);
        if (manifest.sourceCommit !== who.sourceCommit) error(401, 'source_mismatch', 'The release source differs from the deployment identity.');
        await requireMain(who.sourceCommit, sourceToken);
        const key = releaseKey(manifest.version) + 'manifest.json';
        const previous = await objectJSON(bucket, key);
        if (previous && JSON.stringify(previous) !== JSON.stringify(manifest)) error(409, 'immutable_release', 'This release version already identifies different files.');
        if (!previous) await putImmutable(bucket, key, encoder.encode(JSON.stringify(manifest)));
        return json({ version: manifest.version, sourceCommit: manifest.sourceCommit, prepared: true, files: manifest.files.length }, previous ? 200 : 201);
      }
      const upload = /^\/__deploy\/releases\/(pocket-public-[a-f0-9]{12})\/(.+)$/.exec(url.pathname);
      if (request.method === 'PUT' && upload && validPath(upload[2])) {
        const manifest = await objectJSON(bucket, releaseKey(upload[1]) + 'manifest.json');
        if (!manifest) error(400, 'unprepared_release', 'Prepare the release before uploading.');
        if (manifest.sourceCommit !== who.sourceCommit) error(401, 'source_mismatch', 'The release source differs from the deployment identity.');
        const declared = manifest.files.find(file => file.path === upload[2]);
        if (!declared) error(400, 'undeclared_file', 'The file is outside the prepared release.');
        const bytes = await boundedBytes(request, Math.min(declared.size, MAX_FILE));
        if (bytes.byteLength !== declared.size || await sha256(bytes) !== declared.sha256) error(400, 'hash_mismatch', 'The uploaded file failed verification.');
        const key = releaseKey(upload[1]) + 'files/' + upload[2];
        const previous = await objectBytes(bucket, key);
        if (previous && await sha256(previous) !== declared.sha256) error(409, 'immutable_release', 'An immutable release file differs.');
        if (!previous) await putImmutable(bucket, key, bytes);
        return json({ uploaded: upload[2], version: upload[1] }, previous ? 200 : 201);
      }
      if (request.method === 'POST' && url.pathname === '/__deploy/activate') {
        const body = await parseJSON(request, 8192);
        const sourceToken = requestSourceToken(body?.sourceToken);
        if (!VERSION.test(body?.version)) error(400, 'invalid_manifest', 'Invalid public release version.');
        const manifest = await objectJSON(bucket, releaseKey(body.version) + 'manifest.json');
        if (!manifest) error(400, 'unprepared_release', 'Prepare the release before activation.');
        if (manifest.sourceCommit !== who.sourceCommit) error(401, 'source_mismatch', 'The release source differs from the deployment identity.');
        await requireMain(who.sourceCommit, sourceToken);
        const active = await objectJSON(bucket, ACTIVE_KEY);
        if (active && (who.runNumber < active.runNumber || who.runNumber === active.runNumber && who.runAttempt < active.runAttempt)) error(409, 'stale_source', 'A newer workflow run has already published.');
        const verified = await verifyRelease(manifest, file => objectBytes(bucket, releaseKey(body.version) + 'files/' + file));
        await requireMain(who.sourceCommit, sourceToken);
        const next = { version: manifest.version, sourceCommit: manifest.sourceCommit, runNumber: who.runNumber, runId: who.runId, runAttempt: who.runAttempt };
        if (active?.version === next.version && active?.sourceCommit === next.sourceCommit) return json({ active, activated: false });
        await putImmutable(bucket, releaseKey(body.version) + 'verified.json', encoder.encode(JSON.stringify(verified)));
        for (let attempt = 0; attempt < 3; attempt++) {
          const latest = await recordJSON(bucket, ACTIVE_KEY);
          if (latest && (next.runNumber < latest.value.runNumber || next.runNumber === latest.value.runNumber && next.runAttempt < latest.value.runAttempt)) error(409, 'stale_source', 'A newer workflow run has already published.');
          if (latest?.value.version === next.version && latest.value.sourceCommit === next.sourceCommit) return json({ active: latest.value, activated: false });
          await requireMain(who.sourceCommit, sourceToken);
          const written = await bucket.put(ACTIVE_KEY, JSON.stringify(next), { onlyIf: latest ? { etagMatches: latest.etag } : { etagDoesNotMatch: '*' } });
          if (written) return json({ active: next, activated: true });
        }
        error(409, 'activation_conflict', 'Another deployment changed the active release. Retry after checking main.');
      }
      error(404, 'not_found', 'Unknown deployment operation.');
    }
    if (!['GET', 'HEAD'].includes(request.method)) error(404, 'not_found', 'Not part of Mediport Pocket.');
    const pinned = /^\/__releases\/(pocket-public-[a-f0-9]{12})\/(.+)$/.exec(url.pathname);
    const filename = url.pathname === '/' ? 'index.html' : pinned ? pinned[2] : url.pathname.slice(1);
    if (!validPath(filename) || filename === '_headers' || url.pathname.startsWith('/__') && !pinned) error(404, 'not_found', 'Not part of Mediport Pocket.');
    const active = pinned ? null : await objectJSON(bucket, ACTIVE_KEY);
    let selected = pinned ? await objectJSON(bucket, releaseKey(pinned[1]) + 'verified.json') : active ? await objectJSON(bucket, releaseKey(active.version) + 'verified.json') : null;
    if (!pinned && active && !selected) error(503, 'invalid_storage', 'The active release is incomplete.');
    if (selected) {
      if (!selected.publicPaths.includes(filename)) error(404, 'not_found', 'Not part of Mediport Pocket.');
      const expected = selected.files.find(file => file.path === filename);
      const bytes = await objectBytes(bucket, releaseKey(selected.version) + 'files/' + filename);
      if (!bytes || bytes.byteLength !== expected.size || await sha256(bytes) !== expected.sha256) error(503, 'invalid_storage', 'The active reference file is unavailable.');
      return serve(bytes, filename, request);
    }
    const initial = await initialRelease();
    if (!initial || pinned && pinned[1] !== initial.version || !initial.publicPaths.includes(filename)) error(404, 'not_found', 'Not part of Mediport Pocket.');
    return serve(await bootstrapFile(filename, initial.paths.get(filename)), filename, request);
  }
  return { async fetch(request, env, ctx) { void ctx; try { return await fetchRequest(request, env); } catch (e) {
    if (!(e instanceof HttpError)) console.error('Pocket deployment bridge runtime error', { name: e?.name, message: e?.message, bucketGetType: typeof env?.BUCKET?.get });
    return json({ code: e instanceof HttpError ? e.code : 'deployment_unavailable', error: e instanceof HttpError ? e.message : 'The public release service is unavailable.' }, e instanceof HttpError ? e.status : 503);
  } } };
}
export default createDeploymentWorker();
