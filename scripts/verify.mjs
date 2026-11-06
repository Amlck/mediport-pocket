import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { files, hash } from './build.mjs';

export function validAssetPath(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(name)
    && !name.split('/').some(part => !part || part === '.' || part === '..')
    && !name.startsWith('/') && !name.includes('\\');
}

export async function verify(directory) {
  const selected = path.resolve(directory);
  if ((await lstat(selected)).isSymbolicLink()) throw new Error('Pack directory must not be a symbolic link.');
  const root = await realpath(selected);
  const inventory = JSON.parse(await readFile(path.join(root, 'bundle-inventory.json'), 'utf8'));
  if (!Array.isArray(inventory.assets) || !inventory.assets.length) throw new Error('Invalid asset inventory.');
  const seen = new Set();
  for (const asset of inventory.assets) {
    if (!validAssetPath(asset.path) || !/^[a-f0-9]{64}$/.test(asset.sha256) || seen.has(asset.path)) throw new Error('Invalid or duplicated inventory asset.');
    seen.add(asset.path);
  }
  const expected = [...seen, 'sw.js', 'bundle-inventory.json', '_headers'].sort();
  if (JSON.stringify(await files(root)) !== JSON.stringify(expected)) throw new Error('Pack file inventory mismatch.');
  for (const asset of inventory.assets) {
    if (hash(await readFile(path.join(root, asset.path))) !== asset.sha256) throw new Error(`Pack hash mismatch: ${asset.path}`);
  }
  const release = JSON.parse(await readFile(path.join(root, 'release.json'), 'utf8'));
  if (JSON.stringify(release) !== JSON.stringify(inventory.release)) throw new Error('Release metadata differs from inventory.');
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  if (hash(worker) !== inventory.workerSha256) throw new Error('Worker hash mismatch.');
  if (hash(await readFile(path.join(root, '_headers'))) !== inventory.headersSha256) throw new Error('Security headers hash mismatch.');
  if (!worker.startsWith(`const RELEASE = ${JSON.stringify({ version: release.version, builtAt: release.builtAt, releaseNotes: release.releaseNotes })};\n`)) throw new Error('Worker release metadata differs from inventory.');
  return { directory: root, release, assets: inventory.assets };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await verify(process.argv[2] || 'dist');
  console.log(`Verified ${result.release.version}: ${result.assets.length} assets.`);
}
