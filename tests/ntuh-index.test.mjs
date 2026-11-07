import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertNtuhIndex, NTUH_DETAIL_URL } from '../scripts/build.mjs';
import { buildNtuhIndex, cleanProduct, cleanChineseName, catalogFromIndex, monographForListing } from '../scripts/generate-ntuh-index.mjs';
import { buildSearchIndex, ntuhDetailUrl, searchIndex } from '../src/app/lib/search.js';

const reference = JSON.parse(await readFile(new URL('../src/data/reference.json', import.meta.url), 'utf8'));
const ntuh = JSON.parse(await readFile(new URL('../src/data/ntuh-index.json', import.meta.url), 'utf8'));

// Fictional catalog rows shaped like the public NTUH pharmacology scrape.
const row = (code, genericName, tradeLabel, extra = {}) => ({
  code, genericName, tradeLabel, chineseName: '測試錠', maxDose: '4 g/day',
  pharmacologyPath: ['I. Test Drugs', '1. Examples'], ...extra,
});

test('product cleanup removes NTUH-internal annotations and keeps product facts', () => {
  assert.deepEqual(cleanProduct('@(管2) Alfentanil Injection 1 mg/2 mL/amp (PPCD)不計價常備藥'), { product: 'Alfentanil Injection 1 mg/2 mL/amp', schedule: 2 });
  assert.equal(cleanProduct('Plavix Film-Coated Tablet 300 mg/tab (限急診開方)').product, 'Plavix Film-Coated Tablet 300 mg/tab');
  assert.equal(cleanProduct('(Free) Zithromax Tablet 250 mg azithromycin/tab (CDC)').product, 'Zithromax Tablet 250 mg azithromycin/tab');
  assert.equal(cleanProduct('Baritop LV 99.5%(W/W) 300 g/btl 常備藥').product, 'Baritop LV 99.5%(W/W) 300 g/btl');
  assert.equal(cleanProduct('Epicin Injection 10 mg/5 mL/vial 化療注射(起&#30129;性)').product, 'Epicin Injection 10 mg/5 mL/vial');
  assert.equal(cleanProduct('《F》 Dexmedetomidine 200 mcg/2 mL/amp').product, 'Dexmedetomidine 200 mcg/2 mL/amp');
  // Notes describing the product itself survive.
  assert.match(cleanProduct('(管2) Opiodur Transdermal Patch 12 mcg/hr (實際劑量12.5 mcg/hr)').product, /實際劑量12\.5 mcg\/hr/);
  assert.match(cleanProduct('Refero Film-coated Tablet 550 mg/tab (原名Xifaxan)').product, /原名Xifaxan/);
});

test('index omits unlisted products, merges classes and never copies dose content', () => {
  const catalog = { generatedAt: '2026-08-28T03:36:27Z', drugs: [
    row('AAA1AA01', 'Exampleol', 'Exampleol Tablet 10 mg/tab'),
    row('AAA1AA01', 'Exampleol', 'Exampleol Tablet 10 mg/tab', { pharmacologyPath: ['II. Other', '1. Second class'] }),
    row('BBB1AA01', 'Exampleol', 'Exampleol Tablet 20 mg/tab (DC)'),
    row('CCC1AA01', 'Exampleol', 'Exampleol Tablet 30 mg/tab (關機)'),
    row('DDD1AA01', 'Novelumab', '恩慈 Novelumab Injection 100 mg/vial'),
    row('EEE1AA01', 'Sodium Chloride', 'Normal-Saline Solution for Irrigation 0.9% 500 mL/btl'),
    row('FFF1AA01', 'Insulin Glargine', 'Glargine Pen 300 U/3 mL/pen'),
  ] };
  const formulary = { drugs: {
    'insulin-long': { status: 'listed', presentations: [{ drugCode: 'FFF1AA01' }] },
    'normal-saline': { status: 'listed', presentations: [{ drugCode: 'EEE1AA01' }] },
  } };
  const drugs = [
    { id: 'exampleol', name: 'Exampleol' },
    { id: 'insulin-glargine', name: 'Insulin Glargine (Lantus)' },
    { id: 'insulin-long', name: 'Long-Acting Insulin' },
    { id: 'normal-saline', name: 'Normal Saline 0.9%' },
  ];
  const index = buildNtuhIndex({ catalog, formulary, drugs });
  assert.deepEqual(index.entries.map((entry) => entry.code), ['AAA1AA01', 'FFF1AA01', 'EEE1AA01']);
  assert.deepEqual(index.counts, { listed: 3, withMonograph: 0, notListedOmitted: 3 });
  const exampleol = index.entries.find((entry) => entry.code === 'AAA1AA01');
  assert.equal(exampleol.classes.length, 2);
  assert.equal(exampleol.monograph, null, 'an exact generic name alone does not establish product compatibility');
  assert.equal(index.entries.find((entry) => entry.code === 'FFF1AA01').monograph, null, 'an audit match is not an approved formulation mapping');
  assert.equal(index.entries.find((entry) => entry.code === 'EEE1AA01').monograph, null, 'irrigation never inherits a systemic monograph');
  assert.doesNotMatch(JSON.stringify(index), /maxDose|4 g\/day/);
  assert.equal(index.source.snapshotDate, '2026-08-28');
});

test('ingredient substrings, audit matches and generic equality cannot imply product equivalence', () => {
  const incorrectLinks = {
    ABR1CC38: 'albumin', DIG1QB37: 'digoxin', MIR1EC35: 'polyethylene-glycol',
    FUN1AL01: 'amphotericin-b', HUM1LB84: 'insulin-lispro', KCL1FAF9: 'd5w',
    BOW5HC21: 'mag-oxide', OZU1UC42: 'dexamethasone', 'AT 2UB13': 'atropine',
    SAN1LD27: 'octreotide', SER4IB42: 'quetiapine',
  };
  const entries = ntuh.entries.filter(entry => Object.hasOwn(incorrectLinks, entry.code));
  assert.equal(entries.length, Object.keys(incorrectLinks).length);
  const formulary = { drugs: Object.fromEntries(Object.entries(incorrectLinks).map(([code, id]) => [id, {
    status: 'listed', presentations: [{ drugCode: code }],
  }])) };
  const catalog = catalogFromIndex({ ...ntuh, counts: { notListedOmitted: 0 }, entries });
  const generated = buildNtuhIndex({ catalog, formulary, drugs: reference.drugs });
  for (const entry of generated.entries) assert.equal(entry.monograph, null, `${entry.code} ${entry.generic} must not inherit ${incorrectLinks[entry.code]}`);
  for (const code of ['ABR1CC38', 'DIG1QB37', 'MIR1EC35', 'FUN1AL01', 'HUM1LB84', 'KCL1FAF9']) {
    assert.equal(ntuh.entries.find(entry => entry.code === code).monograph, null, `${code}: committed index correction`);
  }
});

test('reviewed links bind exact product qualifiers and the monograph clinical scope', () => {
  for (const entry of ntuh.entries.filter(item => item.monograph)) assert.equal(monographForListing(entry, reference.drugs), entry.monograph);
  const amoxicillin = ntuh.entries.find(entry => entry.code === 'AMO4AA16');
  assert.equal(monographForListing(amoxicillin, reference.drugs), 'amoxicillin');
  for (const product of ['Amoxicillin Cream 250 mg/g', 'Amoxicillin Extended-Release Capsule 250 mg/cap', 'Amoxicillin and Clavulanate Capsule 250 mg/cap', amoxicillin.product + ' (modified release)']) {
    assert.equal(monographForListing({ ...amoxicillin, product }, reference.drugs), null);
  }
  assert.equal(monographForListing({ ...amoxicillin, code: 'NEW4AA01' }, reference.drugs), null, 'new codes require a product review');
  const changed = reference.drugs.map(drug => drug.id === 'amoxicillin' ? { ...drug, dose: { standard: 'Changed scope' } } : drug);
  assert.equal(monographForListing(amoxicillin, changed), null, 'a changed monograph scope requires review');
  const liposomal = ntuh.entries.find(entry => entry.code === 'AMB1AL18');
  assert.equal(monographForListing(liposomal, reference.drugs), 'amphotericin-b');
  assert.equal(monographForListing({ ...liposomal, generic: 'Amphotericin B' }, reference.drugs), null, 'liposomal qualifier is part of identity');
});

test('Chinese status markers omit products and administrative cleanup preserves Chinese product names', () => {
  assert.equal(cleanChineseName('@ 麻佳因注射液'), '麻佳因注射液');
  assert.equal(cleanChineseName('組織修復凝合劑(第二代) (常備查核用線上不開機)'), '組織修復凝合劑(第二代)');
  assert.equal(cleanChineseName('倍拉維膜衣錠 (供外籍無健保者憑單領藥)'), '倍拉維膜衣錠');
  assert.equal(cleanChineseName('無正式中文名(供外籍無健保者憑單領藥)'), null);
  assert.equal(cleanChineseName('測試注射液10% (實際劑量12.5 mg) [PP軟袋]'), '測試注射液10% (實際劑量12.5 mg) [PP軟袋]');
  const catalog = { generatedAt: '2026-08-28', drugs: [
    row('SAL1FAB4', 'Sodium Chloride', 'Saline 0.45% 500 mL/bag (7.7 mEq/100 mL)', { chineseName: '沙林注射液0.45% [PP軟袋] (關機)' }),
    row('DUP1AA01', 'Exampleol', 'Exampleol Tablet', { chineseName: '測試錠' }),
    row('DUP1AA01', 'Exampleol', 'Exampleol Tablet', { chineseName: '測試錠（DC）' }),
    row('KEEPAA01', 'Exampleol', 'Exampleol Tablet', { chineseName: '測試錠(第二代)' }),
  ] };
  const result = buildNtuhIndex({ catalog });
  assert.deepEqual(result.entries.map(entry => entry.code), ['KEEPAA01'], 'any source row marked discontinued excludes that code');
  assert.ok(!ntuh.entries.some(entry => entry.code === 'SAL1FAB4'));
  assert.doesNotMatch(JSON.stringify(ntuh.entries.map(entry => entry.chinese)), /常備|計價|供外籍|憑單領藥|@/);
});

test('public-index regeneration preserves source date, products and classes without a private capture', () => {
  const rebuilt = buildNtuhIndex({ catalog: catalogFromIndex(ntuh), drugs: reference.drugs });
  assert.deepEqual(rebuilt, ntuh);
});

test('committed NTUH index is a link list that passes the build guard', () => {
  assertNtuhIndex(ntuh, reference);
  assert.equal(ntuh.source.detailUrl, NTUH_DETAIL_URL);
  assert.ok(ntuh.entries.length > 2000);
  assert.doesNotMatch(JSON.stringify(ntuh), /maxDose|不計價|常備藥|恩慈|PPCD/);
  assert.throws(() => assertNtuhIndex({ ...ntuh, entries: [{ ...ntuh.entries[0], maxDose: '1 g' }] }, reference), /non-link field/);
  assert.throws(() => assertNtuhIndex({ ...ntuh, entries: [{ ...ntuh.entries[0], product: '@ Hidden 常備藥' }] }, reference), /internal annotation/);
  assert.throws(() => assertNtuhIndex({ ...ntuh, source: { ...ntuh.source, detailUrl: 'https://example.invalid/?code=' } }, reference), /public detail page/);
});

test('search finds NTUH listings by product, generic and Chinese name and keeps monographs first', () => {
  const index = buildSearchIndex({ drugs: reference.drugs, drugIndicationLookup: reference.drugIndicationLookup, ntuh });
  const tocilizumab = searchIndex(index, 'tocilizumab');
  const listing = tocilizumab.sections.find((section) => section.kind === 'ntuh').items[0].entry;
  assert.equal(listing.href, ntuhDetailUrl(ntuh, listing.id));
  assert.match(listing.href, /^https:\/\/reg\.ntuh\.gov\.tw\/pharmacyoutside\/QueryDrugDetail\.aspx\?Drug_Code=[A-Z0-9%]+$/);
  assert.equal(listing.external, true);
  const chinese = ntuh.entries.find((entry) => entry.chinese && entry.generic === 'Tocilizumab').chinese;
  assert.ok(searchIndex(index, chinese).sections.some((section) => section.kind === 'ntuh'));
  // NTUH's product name matches "Augmentin" more literally than the monograph alias.
  const augmentin = searchIndex(index, 'augmentin').sections;
  assert.deepEqual(augmentin.map((section) => section.kind), ['drug', 'ntuh']);
  assert.ok(augmentin[1].best < augmentin[0].best);
  assert.deepEqual(searchIndex(index, 'tocilizumab', { kinds: ['drug'] }).sections, []);
});
