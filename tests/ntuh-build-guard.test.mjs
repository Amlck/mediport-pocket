import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertNtuhIndex } from '../scripts/build.mjs';

const index = JSON.parse(await readFile(new URL('../src/data/ntuh-index.json', import.meta.url)));
const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url)));
const changedEntry = (code, patch) => ({ ...index, entries: index.entries.map(entry => entry.code === code ? { ...entry, ...patch } : entry) });

test('build refuses incorrect clinical associations even when the target monograph exists', () => {
  assert.throws(() => assertNtuhIndex(changedEntry('ABR1CC38', { monograph: 'albumin' }), reference), /reviewed product/);
  assert.throws(() => assertNtuhIndex(changedEntry('AMO4AA16', { product: 'Amoxicillin Cream 250 mg/g' }), reference), /reviewed product/);
  const updatedScope = { ...reference, drugs: reference.drugs.map(drug => drug.id === 'amoxicillin' ? { ...drug, dose: { standard: 'Changed route/scope' } } : drug) };
  assert.throws(() => assertNtuhIndex(index, updatedScope), /reviewed product/);
});

test('build refuses stale Chinese status and malformed index metadata', () => {
  assert.throws(() => assertNtuhIndex(changedEntry('AMO4AA16', { chinese: '測試膠囊（關機）' }), reference), /unlisted status/);
  assert.throws(() => assertNtuhIndex(changedEntry('AMO4AA16', { chinese: '測試膠囊 (供外籍無健保者憑單領藥)' }), reference), /internal annotation/);
  assert.throws(() => assertNtuhIndex(changedEntry('AMO4AA16', { classes: null }), reference), /class reference/);
  assert.throws(() => assertNtuhIndex({ ...index, counts: { ...index.counts, listed: 0 } }, reference), /counts disagree/);
  assert.throws(() => assertNtuhIndex({ ...index, source: { ...index.source, catalogUrl: 'http://intranet.invalid/catalog' } }, reference), /public detail page/);
});
