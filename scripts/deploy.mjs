import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verify } from './verify.mjs';
import { files, hash } from './build.mjs';

export const DEPLOY_ORIGIN = 'https://mediport-pocket.abuzz-moth-0863.chatgpt.site';
export const REPOSITORY = 'Amlck/mediport-pocket';
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_RELEASE_BYTES = 32 * 1024 * 1024;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function deploymentAllowed(eventName, ref) {
  return eventName === 'push' && ref === 'refs/heads/main';
}

export function deploymentOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('Deployment origin must be a bare HTTPS origin.');
  return url.origin;
}

export class StaleDeployment extends Error {
  constructor() { super('A newer main commit or deployment superseded this release.'); this.name = 'StaleDeployment'; }
}

function safeCode(value) { return typeof value === 'string' && /^[a-z0-9_]{1,64}$/.test(value) ? value : 'request_failed'; }

async function request(fetchImpl, url, options, { sleep = wait, attempts = 4, timeoutMs = 30_000 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try { response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) }); }
    catch {
      if (attempt + 1 === attempts) throw new Error('Deployment network request failed after bounded retries.');
      await sleep(1000 * 2 ** attempt); continue;
    }
    if (response.ok) return response;
    if ([408, 429, 500, 502, 503, 504].includes(response.status) && attempt + 1 < attempts) {
      await sleep(1000 * 2 ** attempt); continue;
    }
    let code, detail = '';
    try {
      const body = await response.json();
      code = safeCode(body.code);
      if (response.status === 401 && ['A GitHub Actions deployment identity is required.', 'Only the approved GitHub main push workflow may deploy.', 'Invalid deployment signature.', 'Unknown deployment signature.', 'Unsupported deployment signature.', 'Malformed deployment identity.'].includes(body.error)) detail = ' ' + body.error;
    } catch { code = 'request_failed'; }
    if (response.status === 409 && code === 'stale_source') throw new StaleDeployment();
    throw new Error(`Deployment request failed (${response.status}, ${code}).${detail}`);
  }
}

export async function requestOidcToken({ audience, env = process.env, fetchImpl = fetch } = {}) {
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL || 'https://invalid.example');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.actions.githubusercontent.com') || url.username || url.password || url.port || url.hash || !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error('GitHub Actions OIDC request configuration is unavailable.');
  url.searchParams.set('audience', deploymentOrigin(audience));
  const response = await fetchImpl(url.href, {
    headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub Actions OIDC request failed (${response.status}).`);
  const result = await response.json();
  if (typeof result.value !== 'string' || !result.value) throw new Error('GitHub Actions did not return an OIDC token.');
  return result.value;
}

export function oidcProvider({ audience, env = process.env, fetchImpl = fetch } = {}) {
  let token = null, expiresAt = 0, pending = null;
  return async function getToken(refresh = false) {
    if (!refresh && token && Date.now() < expiresAt - 120_000) return token;
    if (!pending) pending = requestOidcToken({ audience, env, fetchImpl }).then(value => {
      token = value;
      try {
        const identity = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
        expiresAt = identity.exp * 1000;
        // Public workflow identity only; never log the bearer, signature or jti.
        const fields = ['iss', 'aud', 'sub', 'repository', 'repository_id', 'repository_owner_id', 'ref', 'event_name', 'workflow_ref', 'environment', 'sha'];
        console.log('Deployment identity:', JSON.stringify(Object.fromEntries(fields.filter(key => identity[key] !== undefined).map(key => [key, identity[key]]))));
      }
      catch { expiresAt = Date.now() + 180_000; }
      if (!Number.isFinite(expiresAt)) expiresAt = Date.now() + 180_000;
      return value;
    }).finally(() => { pending = null; });
    return pending;
  };
}

export async function mainHead({ fetchImpl = fetch, token = process.env.GITHUB_TOKEN } = {}) {
  const response = await request(fetchImpl, `https://api.github.com/repos/${REPOSITORY}/git/ref/heads/main`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const result = await response.json();
  if (!/^[a-f0-9]{40}$/.test(result.object?.sha || '')) throw new Error('Could not verify the current main commit.');
  return result.object.sha;
}

export async function artifactManifest(directory, sourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || '')) throw new Error('Expected source must be a full GitHub commit SHA.');
  const checked = await verify(directory);
  if (checked.release.source?.commit !== sourceCommit || checked.release.source?.dirty !== false || checked.release.source?.repository !== `https://github.com/${REPOSITORY}`) throw new Error('Artifact is not bound to the clean tested source commit.');
  if (!/^pocket-public-[a-f0-9]{12}$/.test(checked.release.version)) throw new Error('Unexpected public release version.');
  const entries = [];
  let total = 0;
  for (const name of await files(checked.directory)) {
    const bytes = await readFile(path.join(checked.directory, name));
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error(`Release file exceeds its size limit: ${name}`);
    total += bytes.length;
    if (total > MAX_RELEASE_BYTES) throw new Error('Release exceeds the total upload size limit.');
    entries.push({ path: name, sha256: hash(bytes), size: bytes.length, bytes });
  }
  if (entries.length > 300) throw new Error('Release exceeds the file-count limit.');
  return { checked, entries, body: {
    version: checked.release.version, sourceCommit,
    files: entries.map(({ path, sha256, size }) => ({ path, sha256, size })),
    inventorySha256: entries.find(entry => entry.path === 'bundle-inventory.json').sha256,
  } };
}

async function parallel(items, count, apply) {
  let next = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(count, items.length) }, async () => {
    while (next < items.length) await apply(items[next++]);
  }));
  const rejected = results.find(result => result.status === 'rejected');
  if (rejected) throw rejected.reason;
}

export async function verifyLive({ origin, manifest, fetchImpl = fetch, sleep = wait }) {
  // _headers is private deployment configuration and is verified at activation.
  // HTML may be transformed by the edge, so verify the exact plain-text shell.
  await parallel(manifest.entries.filter(entry => entry.path !== '_headers'), 4, async entry => {
    const pathname = entry.path === 'index.html' ? 'offline-shell.txt' : entry.path;
    const response = await request(fetchImpl, `${origin}/__releases/${manifest.body.version}/${pathname}`, { headers: { 'Cache-Control': 'no-cache' } }, { sleep });
    if (hash(Buffer.from(await response.arrayBuffer())) !== entry.sha256) throw new Error(`Live release hash mismatch: ${entry.path}`);
  });
  const response = await request(fetchImpl, `${origin}/release.json`, { headers: { 'Cache-Control': 'no-cache' } }, { sleep });
  const live = await response.json();
  if (live.version !== manifest.body.version || live.source?.commit !== manifest.body.sourceCommit) throw new Error('Live app is not bound to the tested source release.');
}

export async function deploy({ directory = 'dist', sourceCommit = process.env.GITHUB_SHA, origin = DEPLOY_ORIGIN,
  eventName = process.env.GITHUB_EVENT_NAME, ref = process.env.GITHUB_REF, fetchImpl = fetch,
  sourceToken = process.env.GITHUB_TOKEN, getToken, getHead, sleep = wait } = {}) {
  if (!deploymentAllowed(eventName, ref)) return { status: 'skipped', reason: 'not_main_push' };
  const target = deploymentOrigin(origin);
  const manifest = await artifactManifest(directory, sourceCommit);
  if (sourceToken !== undefined && typeof sourceToken !== 'string') throw new Error('Read-only source authorization must be a string.');
  // This short-lived, contents:read token is transport-only authorization for
  // the host's fixed GitHub source lease check. Never add it to the artifact
  // manifest, uploaded files, deployment result, logs or persistent metadata.
  const sourceAuthorization = sourceToken ? { sourceToken } : {};
  const authorize = getToken || oidcProvider({ audience: target, fetchImpl });
  const head = getHead || (() => mainHead({ fetchImpl, token: sourceToken }));
  const ensureCurrent = async () => { if (await head() !== sourceCommit) throw new StaleDeployment(); };
  const authenticated = async (pathname, options, refresh = false) => request(fetchImpl, target + pathname, {
    ...options, headers: { ...options.headers, Authorization: `Bearer ${await authorize(refresh)}` },
  }, { sleep, timeoutMs: pathname === '/__deploy/activate' ? 90_000 : 30_000 });
  try {
    await ensureCurrent();
    await authenticated('/__deploy/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...manifest.body, ...sourceAuthorization }) });
    await parallel(manifest.entries, 4, entry => authenticated(`/__deploy/releases/${manifest.body.version}/${entry.path}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: entry.bytes,
    }));
    // Concurrency serializes publishing; this fresh lease also rejects an old
    // build which completed after a newer main commit. The server checks again.
    await ensureCurrent();
    const activated = await authenticated('/__deploy/activate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: manifest.body.version, ...sourceAuthorization }),
    }, true);
    const result = await activated.json();
    if (result.active?.version !== manifest.body.version || result.active?.sourceCommit !== sourceCommit) throw new Error('Hosting did not activate the requested tested release.');
    await verifyLive({ origin: target, manifest, fetchImpl, sleep });
    return { status: 'deployed', version: manifest.body.version, sourceCommit, files: manifest.entries.length, origin: target };
  } catch (error) {
    if (error instanceof StaleDeployment) return { status: 'skipped', reason: 'stale_source', version: manifest.body.version, sourceCommit };
    throw error;
  }
}

export async function offlineInstallDiagnostics(page, { timeoutMs = 5_000 } = {}) {
  let timer;
  try {
    return await Promise.race([
      page.evaluate(async () => {
        // Only known public status titles, lifecycle states and counts enter logs.
        // Do not return page HTML, inputs, URLs, cache keys or error messages.
        const state = worker => worker ? (['parsed', 'installing', 'installed', 'activating', 'activated', 'redundant'].includes(worker.state) ? worker.state : 'unknown') : null;
        const statusTitles = ['Checking the downloaded pack', 'Downloading the complete pack', 'Update ready · Offline copy verified', 'Offline copy verified', 'Offline copy incomplete', 'Offline status unavailable'];
        const snapshot = {
          packStatuses: Array.from(document.querySelectorAll('.page [role="status"]')).filter(node => node.checkVisibility()).slice(0, 3)
            .map(node => {
              const text = node.innerText.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
              return statusTitles.find(title => text.startsWith(title)) || 'Unrecognized pack status';
            }),
          worker: { controller: state(navigator.serviceWorker?.controller) },
        };
        try {
          const registration = await navigator.serviceWorker?.getRegistration();
          for (const name of ['installing', 'waiting', 'active']) snapshot.worker[name] = state(registration?.[name]);
        } catch { snapshot.worker.registration = 'unavailable'; }
        try {
          const keys = (await caches.keys()).filter(key => key.startsWith('mediport-pocket:'));
          snapshot.cacheCount = keys.length;
          snapshot.sampledCacheAssetCounts = await Promise.all(keys.slice(0, 3).map(async key => (await (await caches.open(key)).keys()).length));
        } catch { snapshot.cache = 'unavailable'; }
        return snapshot;
      }),
      new Promise(resolve => { timer = setTimeout(() => resolve({ diagnostics: 'timed_out' }), timeoutMs); }),
    ]);
  } catch { return { diagnostics: 'unavailable' }; }
  finally { clearTimeout(timer); }
}

export async function smoke({ origin = DEPLOY_ORIGIN, sourceCommit, version } = {}) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce', serviceWorkers: 'allow' });
    let page = await context.newPage();
    await page.goto(`${origin}/#/pack`);
    try {
      // A cold install downloads and hashes the whole pack sequentially.
      await page.locator('.page [role="status"]').first().filter({ hasText: 'Offline copy verified' }).waitFor({ timeout: 180_000 });
    } catch {
      const diagnostics = await offlineInstallDiagnostics(page);
      throw new Error(`Live offline installation was not verified. Public install diagnostics: ${JSON.stringify(diagnostics)}`);
    }
    const live = await page.evaluate(() => fetch('./release.json').then(response => response.json()));
    if (live.version !== version || live.source?.commit !== sourceCommit) throw new Error('Browser installed a different source release.');
    const exactSource = page.getByRole('link', { name: `Source for this version · ${sourceCommit.slice(0, 12)}` });
    if (await exactSource.getAttribute('href') !== `https://github.com/${REPOSITORY}/tree/${sourceCommit}`) throw new Error('Browser source link differs from the deployed commit.');
    await context.setOffline(true); await page.close(); page = await context.newPage();
    await page.goto(`${origin}/#/calc/abg`);
    await page.locator('#abg-ph').fill('7.20'); await page.locator('#abg-paco2').fill('30'); await page.locator('#abg-hco3').fill('12');
    await page.getByRole('button', { name: 'Interpret', exact: true }).click();
    await page.locator('.abg-summary[aria-label="Current interpretation"]').waitFor();
    await context.close();
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await deploy({ directory: process.argv[2] || 'dist' });
  if (result.status === 'deployed' && process.argv.includes('--smoke')) await smoke(result);
  // Only public deployment identity enters logs/output, never bearer tokens.
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `status=${result.status}\nversion=${result.version || ''}\nsource_commit=${result.sourceCommit || ''}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, result.status === 'deployed'
    ? `Published [${result.version}](${result.origin}) from [${result.sourceCommit.slice(0, 12)}](https://github.com/${REPOSITORY}/commit/${result.sourceCommit}). All uploaded hashes and offline browser checks passed.\n`
    : `Deployment skipped: ${result.reason}.\n`);
}
