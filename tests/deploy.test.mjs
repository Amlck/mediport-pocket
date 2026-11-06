import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { build, hash, ROOT } from '../scripts/build.mjs';
import { artifactManifest, deploy, deploymentAllowed, deploymentOrigin, requestOidcToken } from '../scripts/deploy.mjs';

const SOURCE = '0123456789abcdef0123456789abcdef01234567';
const NEWER = 'fedcba9876543210fedcba9876543210fedcba98';
const ORIGIN = 'https://pocket.example';
async function artifact(t) {
  const directory = path.join(ROOT, '.test-builds', 'deploy-' + randomUUID());
  t.after(() => rm(directory, { recursive: true, force: true }));
  return build({ directory, builtAt: '2026-11-06T00:00:00.000Z', sourceCommit: SOURCE });
}
function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }

function hostingFixture({ transient = false, stale = false, uploadFailure = false } = {}) {
  const uploads = new Map();
  const calls = [];
  let prepared = null, active = null, retried = false;
  const fetchImpl = async (url, options = {}) => {
    const pathname = new URL(url).pathname;
    calls.push({ pathname, method: options.method || 'GET', redirect: options.redirect });
    if (pathname === '/__deploy/prepare') {
      assert.equal(options.headers.Authorization, 'Bearer test-oidc');
      prepared = JSON.parse(options.body);
      if (stale) return json({ code: 'stale_source' }, 409);
      return json({ prepared: true }, 201);
    }
    if (pathname.startsWith('/__deploy/releases/')) {
      assert.equal(options.headers.Authorization, 'Bearer test-oidc');
      if (uploadFailure) return json({ code: 'hash_mismatch' }, 400);
      if (transient && !retried) { retried = true; return json({ code: 'temporarily_unavailable' }, 503); }
      const file = pathname.slice(('/__deploy/releases/' + prepared.version + '/').length);
      const expected = prepared.files.find(entry => entry.path === file);
      assert.equal(hash(options.body), expected.sha256);
      assert.equal(options.body.length, expected.size);
      uploads.set(file, Buffer.from(options.body));
      return json({ uploaded: true }, 201);
    }
    if (pathname === '/__deploy/activate') {
      assert.equal(uploads.size, prepared.files.length, 'activation follows every successful byte upload');
      active = { version: prepared.version, sourceCommit: prepared.sourceCommit };
      return json({ active, activated: true });
    }
    if (pathname.startsWith('/__releases/')) {
      const file = pathname.slice(('/__releases/' + prepared.version + '/').length);
      assert.ok(!['_headers', 'index.html'].includes(file), 'public verification avoids private headers and transformed HTML');
      return new Response(uploads.get(file));
    }
    if (pathname === '/release.json') return new Response(uploads.get('release.json'));
    throw new Error('Unexpected fixture request');
  };
  return { fetchImpl, calls, uploads, get active() { return active; }, get prepared() { return prepared; } };
}

const context = directory => ({ directory, origin: ORIGIN, sourceCommit: SOURCE, eventName: 'push', ref: 'refs/heads/main', getToken: async () => 'test-oidc', getHead: async () => SOURCE, sleep: async () => {} });

test('only main push events can publish; pull requests and tags never obtain credentials', async () => {
  assert.equal(deploymentAllowed('push', 'refs/heads/main'), true);
  for (const [eventName, ref] of [['pull_request', 'refs/pull/1/merge'], ['pull_request_target', 'refs/heads/main'], ['push', 'refs/tags/v1'], ['workflow_dispatch', 'refs/heads/main']]) {
    const result = await deploy({ eventName, ref, getToken: () => { throw new Error('Must not request a token'); } });
    assert.equal(result.status, 'skipped');
  }
  for (const value of ['http://pocket.example', 'https://user:secret@pocket.example', 'https://pocket.example/path', 'https://pocket.example/?x=1']) assert.throws(() => deploymentOrigin(value));
});

test('OIDC tokens are requested only from GitHub Actions with the exact HTTPS audience', async () => {
  const seen = [];
  const env = { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://pipelines.actions.githubusercontent.com/job/idtoken?api-version=2.0', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'ephemeral-request-token' };
  const token = await requestOidcToken({ audience: ORIGIN + '/', env, fetchImpl: async (url, options) => {
    seen.push({ url: new URL(url), options }); return json({ value: 'returned-oidc-token' });
  } });
  assert.equal(token, 'returned-oidc-token');
  assert.equal(seen[0].url.searchParams.get('audience'), ORIGIN);
  assert.equal(seen[0].options.redirect, 'error');
  await assert.rejects(requestOidcToken({ audience: ORIGIN, env: { ...env, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://attacker.example/idtoken' }, fetchImpl: () => { throw new Error('Unexpected network'); } }), /configuration/);
});

test('tested artifact uploads every exact file, survives a transient retry and verifies the active release', async t => {
  const pack = await artifact(t);
  const host = hostingFixture({ transient: true });
  const tokenRefresh = [];
  const result = await deploy({ ...context(pack.directory), fetchImpl: host.fetchImpl, getToken: async refresh => { tokenRefresh.push(refresh); return 'test-oidc'; } });
  assert.equal(result.status, 'deployed');
  assert.equal(result.version, pack.release.version);
  assert.equal(result.files, pack.assets.length + 3);
  assert.equal(host.prepared.inventorySha256, hash(await readFile(path.join(pack.directory, 'bundle-inventory.json'))));
  assert.equal(host.uploads.size, pack.assets.length + 3);
  assert.equal(host.active.sourceCommit, SOURCE);
  assert.equal(tokenRefresh.at(-1), true, 'activation obtains a fresh OIDC token');
  assert.ok(host.calls.every(call => call.redirect === 'error'));
});

test('an unbound or tampered artifact is rejected before any network upload', async t => {
  const pack = await artifact(t);
  await assert.rejects(artifactManifest(pack.directory, NEWER), /clean tested source/);
  await writeFile(path.join(pack.directory, 'app.js'), 'changed after testing');
  await assert.rejects(deploy({ ...context(pack.directory), fetchImpl: () => { throw new Error('Unexpected network'); } }), /hash mismatch/);
});

test('failed upload never activates an incomplete release', async t => {
  const pack = await artifact(t);
  const host = hostingFixture({ uploadFailure: true });
  await assert.rejects(deploy({ ...context(pack.directory), fetchImpl: host.fetchImpl }), /400, hash_mismatch/);
  assert.equal(host.active, null);
  assert.ok(!host.calls.some(call => call.pathname === '/__deploy/activate'));
});

test('stale runs skip without activation both before prepare and after uploads', async t => {
  const pack = await artifact(t);
  const before = hostingFixture();
  assert.equal((await deploy({ ...context(pack.directory), fetchImpl: before.fetchImpl, getHead: async () => NEWER })).reason, 'stale_source');
  assert.equal(before.calls.length, 0);
  const after = hostingFixture(); let checks = 0;
  assert.equal((await deploy({ ...context(pack.directory), fetchImpl: after.fetchImpl, getHead: async () => ++checks === 1 ? SOURCE : NEWER })).reason, 'stale_source');
  assert.equal(after.uploads.size, pack.assets.length + 3);
  assert.equal(after.active, null);
  const backend = hostingFixture({ stale: true });
  assert.equal((await deploy({ ...context(pack.directory), fetchImpl: backend.fetchImpl })).reason, 'stale_source');
  assert.equal(backend.active, null);
});
