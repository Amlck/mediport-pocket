import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url)));
const taita = reference.drugs.filter(drug => drug.id.startsWith('taita-'));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

test('Taita dosing uses identified manufacturer statements without invented renal/rate schedules', () => {
  assert.equal(taita.length, 4);
  for (const drug of taita) {
    assert.match(drug.dose.standard, /Manufacturer label statement/);
    assert.match(drug.dose.standard, /individualize|adjusted|Individualize/);
    assert.match(drug.dose.standard, drug.id === 'taita-5' ? /400–1200 mL/ : /500 mL/);
    assert.equal(drug.renalAdj.length, 1);
    assert.match(drug.renalAdj[0].crcl, /not established/);
    assert.match(drug.renalAdj[0].regimen, /not.*assertion that no adjustment is needed/);
    const clinical = JSON.stringify({ dose: drug.dose, renalAdj: drug.renalAdj, sideEffects: drug.sideEffects, monitoring: drug.monitoring });
    assert.doesNotMatch(clinical, /(?:\d[\d.–-]*\s*mL\/kg\/h|Q\d|30[–-]59|<30\s*\/\s*HD)/, drug.id);
    assert.match(drug.publicNotes.join(' '), /general adult.*only/);
    assert.match(drug.publicNotes.join(' '), /Clinician review.*pending/);
  }
});

test('Taita source review binds linked primary evidence, limited scope and exact public record hashes', () => {
  for (const drug of taita) {
    assert.equal(drug.sourceMetadata.reviewedAt, '2026-11-07');
    assert.equal(drug.sourceMetadata.accessCheckedAt, '2026-11-07');
    assert.match(drug.sourceMetadata.reviewScope, /Targeted source review/);
    assert.match(drug.sourceMetadata.evidenceLimits, /No product-specific/);
    assert.ok(drug.references.every(ref => typeof ref.url === 'string' && ref.url.startsWith('https://')));
    assert.ok(drug.references.some(ref => ref.url.startsWith('https://www.otsuka.com.tw/')));
    assert.ok(drug.references.some(ref => ref.url.startsWith('https://www.cth.org.tw/public/medi_news/') && /manufacturer insert/.test(ref.text)));
    assert.ok(drug.references.some(ref => ref.url === 'https://www.nice.org.uk/guidance/cg174/chapter/Recommendations' && /not product-specific or paediatric dosing/.test(ref.text)));
    const record = reference.sources.transformations.find(item => item.drugId === drug.id && item.field === '$record');
    assert.equal(record.valueEncoding, 'canonical-json-v1');
    assert.equal(record.outputSha256, hash(drug));
    assert.notEqual(record.originalSha256, record.outputSha256);
  }
});
