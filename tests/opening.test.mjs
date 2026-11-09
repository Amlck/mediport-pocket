import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/app/lib/opening-cinematic.js', import.meta.url), 'utf8');
const exported = JSON.parse(await readFile(new URL('../tools/opening/final-geometry.json', import.meta.url), 'utf8'));
const constant = (name) => JSON.parse(source.match(new RegExp(`const ${name} = (\\[.*?\\]);`))[1]);

test('the flat lockup uses the geometry exported from the final rendered frame', () => {
  const [w, h] = [720, 1280];
  for (const side of ['left', 'right']) {
    const app = constant(side.toUpperCase());
    assert.equal(app.length, exported[side].length, side);
    app.forEach(([x, y], i) => {
      assert.ok(Math.abs(x - exported[side][i][0] * w) < 0.11, `${side} x ${i}`);
      assert.ok(Math.abs(y - exported[side][i][1] * h) < 0.11, `${side} y ${i}`);
    });
  }
  const iris = source.match(/const IRIS = \{ cx: ([\d.]+), cy: ([\d.]+), r: ([\d.]+) \};/).slice(1).map(Number);
  assert.ok(Math.abs(iris[0] - exported.iris.cx * w) < 0.11);
  assert.ok(Math.abs(iris[1] - exported.iris.cy * h) < 0.11);
  assert.ok(Math.abs(iris[2] - exported.iris.diameter_of_width * w / 2) < 0.11);
});

test('the opening preference lives in the appearance key, defaults to cinematic and rejects unknown values', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.document = { documentElement: { dataset: {} }, querySelector: () => null };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  const { appearance, OPENINGS } = await import('../src/app/lib/theme.js');
  assert.deepEqual(OPENINGS.map((o) => o.id), ['cinematic', 'classic', 'off']);
  assert.equal(appearance.get().opening, 'cinematic');
  store.set('mediport-pocket-variant-b:appearance', JSON.stringify({ opening: 'fireworks' }));
  assert.equal(appearance.get().opening, 'cinematic');
  appearance.set({ opening: 'classic' });
  assert.equal(JSON.parse(store.get('mediport-pocket-variant-b:appearance')).opening, 'classic');
  assert.equal(appearance.get().theme, 'portal', 'other appearance fields keep their defaults');
  assert.deepEqual([...store.keys()], ['mediport-pocket-variant-b:appearance'], 'no new storage key');
});

test('the cinematic clip stays within the offline pack budget', async () => {
  const { size } = await stat(new URL('../src/images/opening/cinematic.mp4', import.meta.url));
  assert.ok(size > 50_000 && size < 2_500_000, `clip is ${size} bytes`);
});
