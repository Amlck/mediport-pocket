import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseByteRange } from '../src/byte-range.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = path.join(ROOT, 'dist');
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function files(directory, prefix = '') {
  const result = [];
  for (const entry of (await readdir(path.join(directory, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not distributable source: ${name}`);
    if (entry.isDirectory()) result.push(...await files(directory, name));
    else if (entry.isFile()) result.push(name);
    else throw new Error(`Unexpected source file type: ${name}`);
  }
  return result.sort();
}

export async function safeOutput(directory) {
  const output = path.resolve(directory);
  const relative = path.relative(ROOT, output);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Output must be a build directory inside this repository.');
  const first = relative.split(path.sep)[0];
  if (!['dist', '.test-builds'].includes(first)) throw new Error('Output must be dist/ or a child of .test-builds/. Source directories are never replaced.');
  if (first === '.test-builds' && relative === first) throw new Error('Tests require an individual child of .test-builds/.');
  // A parent symlink could otherwise redirect a validated path outside the repo.
  let current = ROOT;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    const info = await lstat(current).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (info?.isSymbolicLink()) throw new Error('Output may not traverse a symbolic link.');
    if (info && !info.isDirectory()) throw new Error('Output components must be directories.');
  }
  return output;
}

function gitIdentity() {
  try {
    const top = execFileSync('git', ['-C', ROOT, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (path.resolve(top) !== ROOT) return null;
    const commit = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const dirty = Boolean(execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    let tag = null;
    try { tag = execFileSync('git', ['-C', ROOT, 'describe', '--tags', '--exact-match', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
    return { commit, dirty, tag };
  } catch { return null; }
}

function buildDate(provided) {
  if (provided !== undefined) {
    const parsed = new Date(provided);
    if (!Number.isFinite(parsed.valueOf())) throw new Error('builtAt must be a valid date.');
    return parsed.toISOString();
  }
  if (process.env.SOURCE_DATE_EPOCH !== undefined) {
    if (!/^\d+$/.test(process.env.SOURCE_DATE_EPOCH)) throw new Error('SOURCE_DATE_EPOCH must be nonnegative integer seconds.');
    const parsed = new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000);
    if (!Number.isFinite(parsed.valueOf())) throw new Error('SOURCE_DATE_EPOCH is outside the supported date range.');
    return parsed.toISOString();
  }
  return new Date().toISOString();
}

async function sourceAssets() {
  const selected = [];
  const roots = [
    { directory: 'app', prefix: '', pattern: /\.(html|css|js|svg|png)$/ },
    { directory: 'shared', prefix: 'shared', pattern: /\.(mjs|js)$/ },
    { directory: 'data', prefix: 'data', pattern: /^reference\.json$/ },
    { directory: 'images', prefix: 'images', pattern: /\.(png|mp4)$/ },
  ];
  for (const root of roots) {
    const source = path.join(ROOT, 'src', root.directory);
    for (const file of await files(source)) {
      if (!root.pattern.test(file)) throw new Error(`Unexpected public source blocked from distribution: ${root.directory}/${file}`);
      selected.push({ source: path.join(source, file), path: path.posix.join(root.prefix, file) });
    }
  }
  return selected.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

export async function build({ directory = DIST, builtAt, sourceCommit } = {}) {
  const output = await safeOutput(directory);
  const date = buildDate(builtAt);
  const identity = sourceCommit === undefined ? gitIdentity() : null;
  const commit = sourceCommit === undefined ? identity?.dirty ? null : identity?.commit || null : sourceCommit;
  if (commit !== null && !/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('sourceCommit must be a full Git commit hash or null.');
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const releaseNotes = JSON.parse(await readFile(path.join(ROOT, 'release-notes.json'), 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseNotes.date) || !releaseNotes.label?.trim() || !Array.isArray(releaseNotes.changes) || !releaseNotes.changes.length || !releaseNotes.changes.every(value => typeof value === 'string' && value.trim())) throw new Error('Release notes need a date, label and nonempty change list.');
  const inputs = await sourceAssets();
  for (const required of ['index.html', 'app.js', 'icon-192.png', 'icon-512.png', 'data/reference.json', 'shared/abg.mjs', 'shared/calculators.mjs', 'shared/glycemic.mjs', 'shared/lab-review-entry.mjs']) if (!inputs.some(input => input.path === required)) throw new Error(`Required public source is missing: ${required}`);
  const reference = JSON.parse(await readFile(path.join(ROOT, 'src/data/reference.json'), 'utf8'));
  if (Object.hasOwn(reference, 'guideResources')) throw new Error('Internal hospital resource tables may not enter the public build.');
  const workerTemplate = `${parseByteRange.toString()}\n${await readFile(path.join(ROOT, 'src/sw-template.js'), 'utf8')}`;
  // A separate stage means failed source reads never remove a prior usable build.
  await mkdir(path.dirname(output), { recursive: true });
  const stage = path.join(ROOT, '.test-builds', `stage-${randomUUID()}`);
  await safeOutput(stage);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  try {
    for (const input of inputs) {
      await mkdir(path.dirname(path.join(stage, input.path)), { recursive: true });
      await copyFile(input.source, path.join(stage, input.path));
    }
    await copyFile(path.join(stage, 'index.html'), path.join(stage, 'offline-shell.txt'));
    const manifest = { id: './', name: 'Mediport Pocket', short_name: 'Mediport', description: 'Offline clinical reference', start_url: './', scope: './', display: 'standalone', background_color: '#f8fafc', theme_color: '#f8fafc', icons: [192, 512].map(size => ({ src: `./icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })) };
    await writeFile(path.join(stage, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
    const seedAssets = await Promise.all((await files(stage)).map(async name => ({ path: name, sha256: hash(await readFile(path.join(stage, name))) })));
    const source = { repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || null, commit, tag: identity?.dirty ? null : identity?.tag || null, packageVersion: pkg.version || null, dirty: Boolean(identity?.dirty) };
    // Derive identity before adding self-referential release URLs. The final
    // inventory below hashes the rewritten shell, avoiding a version/hash cycle.
    const version = 'pocket-public-' + hash(JSON.stringify({ assets: seedAssets, workerTemplate, releaseNotes, builtAt: date, source })).slice(0, 12);
    const shell = (await readFile(path.join(stage, 'index.html'), 'utf8'))
      .replace(/(<script\b[^>]*\bsrc=")\.\/([^"?#]+\.js)(")/g, `$1/__releases/${version}/$2$3`)
      .replace(/(<link\b[^>]*\brel="stylesheet"[^>]*\bhref=")\.\/([^"?#]+\.css)(")/g, `$1/__releases/${version}/$2$3`);
    await writeFile(path.join(stage, 'index.html'), shell);
    await writeFile(path.join(stage, 'offline-shell.txt'), shell);
    const assets = await Promise.all((await files(stage)).map(async name => ({ path: name, sha256: hash(await readFile(path.join(stage, name))) })));
    const release = {
      version, builtAt: date, releaseNotes, profile: 'public-share', publishingApproved: true, source,
      clinicalReviewNotice: 'Packaging date is not a clinical review date. Original reference review labels and uncertainties are retained.',
      references: {
        sourceHashes: {
          ...Object.fromEntries(await Promise.all(inputs.map(async input => [path.relative(ROOT, input.source).split(path.sep).join('/'), hash(await readFile(input.source))]))),
          'src/sw-template.js': hash(await readFile(path.join(ROOT, 'src/sw-template.js'))),
          'src/byte-range.mjs': hash(await readFile(path.join(ROOT, 'src/byte-range.mjs'))),
        },
        drugCount: reference.drugs.length, guideCount: reference.guides.length, pocusCount: reference.pocus?.topics?.length || 0,
        guides: reference.guides.map(guide => ({ id: guide.id, title: guide.title, reviewedAt: guide.reviewedAt, localRowCount: 0 })),
        excludedGuides: reference.excludedGuides || [], omittedReferenceCount: reference.publication?.referencePolicy?.omittedCount || 0,
        omittedReferencesByReason: reference.publication?.referencePolicy?.omittedByReason || {},
      },
    };
    await writeFile(path.join(stage, 'release.json'), JSON.stringify(release, null, 2) + '\n');
    assets.push({ path: 'release.json', sha256: hash(await readFile(path.join(stage, 'release.json'))) });
    // Every worker downloads its own immutable release, even if a later deploy
    // switches the root URL while this pack is still downloading or repairing.
    const workerAssets = assets.map(asset => ({
      ...asset,
      downloadPath: `__releases/${version}/${asset.path === 'index.html' ? 'offline-shell.txt' : asset.path}`,
      ...(asset.path === 'index.html' ? { contentType: 'text/html; charset=utf-8' } : {}),
    }));
    const worker = `const RELEASE = ${JSON.stringify({ version, builtAt: date, releaseNotes })};\nconst ASSETS = ${JSON.stringify(workerAssets)};\n${workerTemplate}`;
    const headers = `/*\n  Content-Security-Policy: ${CSP}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-cache\n`;
    await writeFile(path.join(stage, 'sw.js'), worker);
    await writeFile(path.join(stage, '_headers'), headers);
    await writeFile(path.join(stage, 'bundle-inventory.json'), JSON.stringify({ release, assets, workerSha256: hash(worker), headersSha256: hash(headers) }, null, 2) + '\n');
    await rm(output, { recursive: true, force: true });
    await rename(stage, output);
    return { directory: output, release, assets };
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await build();
  console.log(`${result.release.version}\n${result.assets.length} verified offline assets → ${result.directory}`);
}
