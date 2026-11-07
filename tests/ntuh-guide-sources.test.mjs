import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url)));
const review = JSON.parse(await readFile(new URL('../docs/ntuh-guide-source-review.json', import.meta.url)));
const root = new URL('../src/shared/', import.meta.url);

test('the seventeen anonymous identity checks use exact public product URLs and separate access from clinical review', async () => {
  assert.equal(review.checkedAt, '2026-11-07');
  assert.equal(review.snapshotDate, '2026-08-28');
  assert.equal(review.products.length, 17);
  assert.equal(new Set(review.products.map(product => product.code)).size, 17);
  const products = new Map(review.products.map(product => [product.code, product]));
  for (const guide of reference.guides.filter(guide => Object.hasOwn(review.guideProducts, guide.id))) {
    const module = await import(new URL(path.basename(guide.engine.module), root));
    assert.deepEqual(guide.sources, [...module.config.sources]);
    assert.deepEqual(guide.reviewLimitations, [...module.config.reviewLimitations]);
    assert.match(guide.reviewLimitations[0], /identity and label strength only/);
    assert.match(guide.reviewLimitations[0], /do not establish current stock, absence of an alternative/);
    for (const code of review.guideProducts[guide.id]) {
      const product = products.get(code);
      assert.ok(product?.generic && product?.product, code);
      assert.equal(product.url, 'https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=' + code);
      const source = guide.sources.find(source => source.url === product.url);
      assert.equal(source?.accessedAt, review.checkedAt, code);
      assert.match(source.scope, /not clinical dosing authority or current availability/);
    }
  }
});

test('dated catalog evidence cannot imply product absence or automatic tablet/ampoule quantities', async () => {
  const corticosteroid = await readFile(new URL('systemic-corticosteroid-engine.mjs', root), 'utf8');
  const seizure = await readFile(new URL('seizure-engine.mjs', root), 'utf8');
  assert.doesNotMatch(corticosteroid, /lists no oral hydrocortisone|only the Solu-Cortef|so 50 µg is half a tablet|20 mg dose is four ampoules/);
  assert.match(corticosteroid, /cannot establish current oral-product availability or absence/);
  assert.match(corticosteroid, /whether tablet splitting is suitable/);
  assert.doesNotMatch(corticosteroid, /Some local protocols still pair|That wording reflects the earlier Surviving Sepsis remark/);
  assert.doesNotMatch(seizure, /but no fosphenytoin product|stored phenytoin row/);
  assert.match(seizure, /neither that identity nor the dated catalog establishes current availability or absence/);
  assert.match(seizure, /do not convert that mg-PE regimen to phenytoin/);
});

test('all seven reviewed guide modules retain exact output hashes and original-source provenance', async () => {
  for (const guide of reference.guides.filter(guide => Object.hasOwn(review.guideProducts, guide.id))) {
    const filename = path.basename(guide.engine.module);
    const digest = createHash('sha256').update(await readFile(new URL(filename, root))).digest('hex');
    assert.equal(guide.engine.sha256, digest, guide.id);
    assert.equal(guide.engine.files.find(file => file.path.endsWith('/' + filename)).sha256, digest, guide.id);
    const transform = reference.sources.transformations.find(transform => transform.sourcePath === guide.engine.sourcePath);
    assert.equal(transform.outputSha256, digest, guide.id);
    assert.equal(transform.originalSha256, reference.sources.hashes[guide.engine.sourcePath], guide.id);
  }
});
