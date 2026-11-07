import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildSearchIndex, drugBrowseResults, searchIndex } from '../src/app/lib/search.js';

const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url), 'utf8'));
const ntuh = JSON.parse(await readFile(new URL('../src/data/ntuh-index.json', import.meta.url), 'utf8'));
const index = buildSearchIndex({ drugs: reference.drugs, drugIndicationLookup: reference.drugIndicationLookup, ntuh,
  guides: [{ id: 'fictional-injection', title: 'Injection Augmentin', quickReference: { summary: 'Fictional search-kind fixture' } }],
  calculators: [{ id: 'fictional-injection', title: 'Injection Augmentin' }],
});

test('Drugs browsing exposes every monograph and public listing once in alphabetical order', () => {
  const { monographs, listings } = drugBrowseResults(index, '  ');
  assert.equal(monographs.length, 179);
  assert.equal(listings.length, 2289);
  for (const [hits, kind] of [[monographs, 'drug'], [listings, 'ntuh']]) {
    assert.ok(hits.every(hit => hit.entry.kind === kind && hit.where === null));
    assert.equal(new Set(hits.map(hit => hit.entry.id)).size, hits.length);
    for (let position = 1; position < hits.length; position++) {
      const before = hits[position - 1].entry, after = hits[position].entry;
      const order = before.title.localeCompare(after.title);
      assert.ok(order < 0 || (order === 0 && before.id.localeCompare(after.id) <= 0));
    }
  }
});

test('Drugs searches retain every broad-query hit beyond a display limit and exclude other reference kinds', () => {
  const expected = searchIndex(index, 'injection', { kinds: ['drug', 'ntuh'], limitPerSection: Infinity });
  const found = drugBrowseResults(index, 'injection');
  assert.ok(found.listings.length > 200);
  assert.deepEqual(found.listings, expected.sections.find(section => section.kind === 'ntuh').items);
  assert.deepEqual(found.monographs, expected.sections.find(section => section.kind === 'drug').items);
  assert.ok([...found.monographs, ...found.listings].every(hit => ['drug', 'ntuh'].includes(hit.entry.kind)));
  assert.ok(searchIndex(index, 'injection').sections.some(section => section.kind === 'guide'), 'fixture would match outside the Drugs kinds');
});

test('Drugs searches accept product, generic, Chinese and code queries without inferring monograph associations', () => {
  const listing = ntuh.entries.find(entry => entry.generic === 'Tocilizumab' && entry.chinese);
  assert.equal(listing.monograph, null);
  const productName = listing.product.split(/\s+/)[0];
  for (const query of [productName, listing.product, listing.generic, listing.chinese, listing.code]) {
    const hit = drugBrowseResults(index, query).listings.find(item => item.entry.id === listing.code);
    assert.ok(hit, `listing found by ${query}`);
    assert.equal(hit.entry.monograph, null, 'a matching name is an external listing, not a reviewed clinical link');
  }
  const browsed = drugBrowseResults(index);
  assert.equal(browsed.listings.filter(hit => hit.entry.monograph).length, 9);
  for (const listing of ntuh.entries.filter(entry => entry.monograph)) {
    const hit = browsed.listings.find(item => item.entry.id === listing.code);
    assert.equal(hit.entry.monograph.id, listing.monograph);
    assert.equal(hit.entry.monograph.name, reference.drugs.find(drug => drug.id === listing.monograph).name);
  }
});

test('pasted complete labels recover exact identities ahead of partial matches without duplicating or bypassing filters', () => {
  const actemra = ntuh.entries.find(entry => entry.product === 'Actemra for SC Injection 162 mg/0.9 mL/pen');
  assert.ok(actemra);
  const found = drugBrowseResults(index, actemra.product);
  assert.equal(found.listings[0].entry.id, actemra.code);
  assert.equal(found.listings.filter(hit => hit.entry.id === actemra.code).length, 1);
  assert.equal(found.listings[0].entry.monograph, null);

  const fictional = buildSearchIndex({ drugs: [
    { id: 'exact', name: 'Example 10 mg', class: 'Example class' },
    { id: 'partial', name: 'Example 10 mg capsule', class: 'Magnesium class' },
  ] });
  assert.deepEqual(drugBrowseResults(fictional, 'Example 10 mg').monographs.map(hit => hit.entry.id), ['exact', 'partial']);
  assert.deepEqual(drugBrowseResults(fictional, 'Example 10 mg', { drugIds: ['partial'] }).monographs.map(hit => hit.entry.id), ['partial']);
  const augmentin = drugBrowseResults(index, 'Augmentin');
  assert.equal(new Set(augmentin.listings.map(hit => hit.entry.id)).size, augmentin.listings.length);
});

test('partial product or generic strength queries retain literal mg/mL tokens and their boundaries', () => {
  const actemra = ntuh.entries.find(entry => entry.product === 'Actemra for SC Injection 162 mg/0.9 mL/pen');
  for (const query of ['Actemra 162 mg', 'Tocilizumab 162 mg', 'Actemra 0.9 mL']) {
    assert.ok(drugBrowseResults(index, query).listings.some(hit => hit.entry.id === actemra.code), query);
  }
  assert.equal(drugBrowseResults(index, 'Actemra 16 mg').listings.length, 0);
  assert.equal(drugBrowseResults(index, 'Actemra 162 mcg').listings.length, 0);
  const fictional = buildSearchIndex({ drugs: [
    { id: 'milligram', name: 'Example 10 mg', class: 'Example class' },
    { id: 'microgram', name: 'Example 10 mcg', class: 'Example class' },
    { id: 'hundred', name: 'Example 100 mg', class: 'Example class' },
    { id: 'concentrated', name: 'Example 10 mg/mL', class: 'Example class' },
    { id: 'dilute', name: 'Example 10 mg/2 mL', class: 'Example class' },
  ] });
  assert.deepEqual(drugBrowseResults(fictional, 'Example 10 mg').monographs.map(hit => hit.entry.id), ['milligram', 'concentrated', 'dilute']);
  assert.deepEqual(drugBrowseResults(fictional, 'Example 10 mg/mL').monographs.map(hit => hit.entry.id), ['concentrated']);
  const shared = searchIndex(index, 'mg', { kinds: ['drug', 'ntuh'], limitPerSection: Infinity });
  const shorthand = drugBrowseResults(index, 'mg');
  assert.deepEqual(shorthand.monographs, shared.sections.find(section => section.kind === 'drug')?.items || []);
  assert.deepEqual(shorthand.listings, shared.sections.find(section => section.kind === 'ntuh')?.items || []);
});

test('NTUH quantity lookups require literal label names and preserve decimal, numeric and unit boundaries', () => {
  for (const query of ['Actemra 0.9 mL', 'Actemra 0.9mL', 'Actemra0.9mL']) {
    assert.deepEqual(drugBrowseResults(index, query).listings.map(hit => hit.entry.id), ['ACT1NB73'], query);
  }
  for (const query of ['Actemra 9 mL', 'Actemra 0.09 mL', 'Actemra 162 mL', 'Actemra 162 g']) {
    assert.deepEqual(drugBrowseResults(index, query).listings, [], query);
  }
  const actual = ntuh.entries.find(entry => entry.code === 'ACT1NB73');
  assert.deepEqual(drugBrowseResults(index, `${actual.chinese} 162 mg`).listings.map(hit => hit.entry.id), ['ACT1NB73']);
  assert.ok(drugBrowseResults(index, actual.code).listings.some(hit => hit.entry.id === actual.code), 'code-only lookup keeps alphanumeric identity intact');

  const products = {
    FIC1AA01: 'Example 0.9 mL', FIC1AA02: 'Example 9 mL', FIC1AA03: 'Example 0.09 mL',
    FIC1AA04: 'Example 10 mg/mL', FIC1AA05: 'Example 10 mg/2 mL', FIC1AA06: 'Example 100 mg/mL',
    FIC1AA07: 'Example 10 mcg/mL',
  };
  const fictional = buildSearchIndex({ ntuh: { source: ntuh.source, classes: ['Example class'],
    entries: Object.entries(products).map(([code, product]) => ({ code, product, generic: 'Example', chinese: '測試製劑', classes: [0], monograph: null })),
  } });
  const codes = query => drugBrowseResults(fictional, query).listings.map(hit => hit.entry.id);
  for (const [query, expected] of [
    ['Example 0.9 mL', ['FIC1AA01']], ['Example 9 mL', ['FIC1AA02']], ['Example 0.09 mL', ['FIC1AA03']],
    ['Example 10 mg/mL', ['FIC1AA04']], ['Example 10 mg/2 mL', ['FIC1AA05']], ['Example 100 mg/mL', ['FIC1AA06']],
    ['Example 10 mcg/mL', ['FIC1AA07']], ['Example 1 mg/mL', []], ['Unrelated 10 mg/mL', []],
  ]) assert.deepEqual(codes(query), expected, query);
});

test('NTUH literal quantities preserve microgram symbols and leading decimals without equating grams or whole numbers', () => {
  const products = {
    MIC1AA01: 'Microexample 10 µg/mL', MIC1AA02: 'Microexample 10 μg/mL',
    MIC1AA03: 'Microexample 10 mcg/mL', MIC1AA04: 'Microexample 10 g/mL',
    DEC1AA01: 'Decimalexample .5 mg/mL', DEC1AA02: 'Decimalexample 0.5 mg/mL',
    DEC1AA03: 'Decimalexample 5 mg/mL', DEC1AA04: 'Decimalexample 0.05 mg/mL',
  };
  const fictional = buildSearchIndex({ ntuh: { source: ntuh.source, classes: ['Example class'],
    entries: Object.entries(products).map(([code, product]) => ({ code, product, generic: 'Example', classes: [0], monograph: null })),
  } });
  const codes = query => drugBrowseResults(fictional, query).listings.map(hit => hit.entry.id).sort();
  for (const query of ['Microexample 10µg/mL', 'Microexample 10μg/mL', 'Microexample 10 mcg/mL']) {
    assert.deepEqual(codes(query), ['MIC1AA01', 'MIC1AA02', 'MIC1AA03'], query);
  }
  assert.deepEqual(codes('Microexample 10 g/mL'), ['MIC1AA04']);
  for (const query of ['Decimalexample .5mg/mL', 'Decimalexample 0.5 mg/mL']) {
    assert.deepEqual(codes(query), ['DEC1AA01', 'DEC1AA02'], query);
  }
  assert.deepEqual(codes('Decimalexample 5 mg/mL'), ['DEC1AA03']);
  assert.deepEqual(codes('Decimalexample 0.05 mg/mL'), ['DEC1AA04']);
});

test('monograph filters never suppress formulary browse or search results', () => {
  const ids = reference.drugs.filter(drug => drug.category === 'antimicrobial').map(drug => drug.id);
  const full = drugBrowseResults(index);
  const filtered = drugBrowseResults(index, '', { drugIds: ids });
  assert.equal(filtered.monographs.length, ids.length);
  assert.ok(filtered.monographs.every(hit => ids.includes(hit.entry.id)));
  assert.deepEqual(filtered.listings, full.listings);
  const searched = drugBrowseResults(index, 'injection');
  const noMonographs = drugBrowseResults(index, 'injection', { drugIds: new Set() });
  assert.deepEqual(noMonographs.monographs, []);
  assert.deepEqual(noMonographs.listings, searched.listings);
});

test('Drugs browsing works without an optional NTUH index, including empty monograph filters', () => {
  const monographIndex = buildSearchIndex({ drugs: reference.drugs, drugIndicationLookup: reference.drugIndicationLookup });
  const found = drugBrowseResults(monographIndex);
  assert.equal(found.monographs.length, 179);
  assert.deepEqual(found.listings, []);
  assert.deepEqual(drugBrowseResults(monographIndex, '', { drugIds: [] }), { monographs: [], listings: [] });
  assert.deepEqual(drugBrowseResults(monographIndex, 'Actemra 162 mg', { drugIds: new Set() }), { monographs: [], listings: [] });
});
