import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { build, files, hash, ROOT, safeOutput } from '../scripts/build.mjs';
import { validAssetPath, verify } from '../scripts/verify.mjs';

const BUILT_AT = '2026-11-06T00:00:00.000Z';
const SOURCE = '0123456789abcdef0123456789abcdef01234567';
async function temporary(t) {
  const directory = path.join(ROOT, '.test-builds', randomUUID());
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('identical source/date/commit builds reproduce every distributed byte', async t => {
  const root = await temporary(t);
  const first = await build({ directory: path.join(root, 'first'), builtAt: BUILT_AT, sourceCommit: SOURCE });
  const second = await build({ directory: path.join(root, 'second'), builtAt: BUILT_AT, sourceCommit: SOURCE });
  assert.equal(first.release.version, second.release.version);
  assert.equal(first.release.source.commit, SOURCE);
  assert.equal(first.release.source.repository, 'https://github.com/Amlck/mediport-pocket');
  assert.deepEqual(await files(first.directory), await files(second.directory));
  for (const file of await files(first.directory)) assert.equal(hash(await readFile(path.join(first.directory, file))), hash(await readFile(path.join(second.directory, file))), file);
  const checked = await verify(first.directory);
  assert.equal(checked.assets.length, first.assets.length);
  assert.equal(hash(await readFile(path.join(first.directory, 'index.html'))), hash(await readFile(path.join(first.directory, 'offline-shell.txt'))));
  const worker = await readFile(path.join(first.directory, 'sw.js'), 'utf8');
  assert.match(worker, /"path":"index\.html","sha256":"[a-f0-9]+","downloadPath":"offline-shell\.txt","contentType":"text\/html; charset=utf-8"/);
  const reference = JSON.parse(await readFile(path.join(first.directory, 'data/reference.json')));
  assert.equal(Object.hasOwn(reference, 'guideResources'), false);
  assert.equal(checked.release.references.drugCount, reference.drugs.length);
});

test('source epoch gives repeatable packaging dates and rejects invalid build metadata', async t => {
  const directory = await temporary(t);
  const previous = process.env.SOURCE_DATE_EPOCH;
  t.after(() => { if (previous === undefined) delete process.env.SOURCE_DATE_EPOCH; else process.env.SOURCE_DATE_EPOCH = previous; });
  process.env.SOURCE_DATE_EPOCH = '1793923200';
  const result = await build({ directory: path.join(directory, 'epoch'), sourceCommit: SOURCE });
  assert.equal(result.release.builtAt, new Date(1793923200 * 1000).toISOString());
  process.env.SOURCE_DATE_EPOCH = 'not-a-time';
  await assert.rejects(build({ directory: path.join(directory, 'invalid'), sourceCommit: SOURCE }), /SOURCE_DATE_EPOCH/);
  await assert.rejects(build({ directory: path.join(directory, 'invalid'), builtAt: 'not-a-date', sourceCommit: SOURCE }), /builtAt/);
  await assert.rejects(build({ directory: path.join(directory, 'invalid'), builtAt: BUILT_AT, sourceCommit: 'main' }), /sourceCommit/);
});

test('build destinations cannot overwrite source, repository root or another directory', async t => {
  for (const output of [ROOT, path.dirname(ROOT), path.join(ROOT, 'src'), path.join(ROOT, 'scripts'), path.join(ROOT, 'tests'), path.join(ROOT, '.git'), path.join(ROOT, '.test-builds')]) await assert.rejects(safeOutput(output), /Output|Tests/);
  const root = await temporary(t);
  await mkdir(root, { recursive: true });
  const link = path.join(root, 'linked');
  await symlink(path.join(ROOT, 'src'), link, 'dir');
  await assert.rejects(build({ directory: path.join(link, 'would-overwrite'), builtAt: BUILT_AT, sourceCommit: SOURCE }), /symbolic link/);
  assert.equal(await safeOutput(path.join(root, 'safe')), path.join(root, 'safe'));
});

test('integrity gate detects changed assets, changed workers and unexpected files', async t => {
  const root = await temporary(t);
  const result = await build({ directory: path.join(root, 'pack'), builtAt: BUILT_AT, sourceCommit: SOURCE });
  const asset = result.assets.find(entry => entry.path === 'data/reference.json');
  const original = await readFile(path.join(result.directory, asset.path));
  await writeFile(path.join(result.directory, asset.path), '{}');
  await assert.rejects(verify(result.directory), /Pack hash mismatch/);
  await writeFile(path.join(result.directory, asset.path), original);
  const worker = await readFile(path.join(result.directory, 'sw.js'));
  await writeFile(path.join(result.directory, 'sw.js'), Buffer.concat([worker, Buffer.from('\n// unexpected mutation')]));
  await assert.rejects(verify(result.directory), /Worker hash mismatch/);
  await writeFile(path.join(result.directory, 'sw.js'), worker);
  await writeFile(path.join(result.directory, '.env'), 'not-a-real-secret');
  await assert.rejects(verify(result.directory), /inventory mismatch/);
});

test('inventory paths reject traversal, hidden paths, queries and duplicates', () => {
  for (const name of ['../.env', '/app.js', 'shared/../app.js', '.env', 'images//file.png', 'app.js?x=1', 'shared\\engine.mjs']) assert.equal(validAssetPath(name), false, name);
  for (const name of ['index.html', 'shared/abg.mjs', 'images/pocus/lung-example.png']) assert.equal(validAssetPath(name), true, name);
});
