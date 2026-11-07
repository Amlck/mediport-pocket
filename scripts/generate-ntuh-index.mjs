// Generates src/data/ntuh-index.json: a search index of NTUH's public
// pharmacology catalog that links each product to NTUH's own public detail
// page. Only names, drug class and the code needed for that link are kept;
// NTUH's clinical content (max dose, dose adjustment, package inserts) stays
// on NTUH's site and is never copied here.
//
// Usage:
//   node scripts/generate-ntuh-index.mjs <ntuh-pharmacology-catalog.json> [ntuh-formulary-data.js]
//
// The catalog is the public scrape of
// https://dept.ntuh.gov.tw/phar/WebAp/QueryDrugInfoPhr.aspx. The optional
// formulary file is the public QueryDrug.aspx audit that maps monograph ids to
// NTUH codes. Both are produced outside this repository; only the derived index
// is committed.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DETAIL_URL = 'https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=';
export const CATALOG_URL = 'https://dept.ntuh.gov.tw/phar/WebAp/QueryDrugInfoPhr.aspx';

// Products that are not ordinary formulary listings: discontinued (DC, 關機,
// 停產), compassionate-use single-patient supply (恩慈) and items the
// pharmacy does not dispense (不發藥). Their public pages may still exist, but
// a listing would mislead, so they are left out.
const OMIT = /\(DC\)|\(關機[^)]*\)|停產|恩慈|不發藥/;

// NTUH's local annotations: billing, supplier, ward-stock and dispensing
// markers, stock state, and local prescribing restrictions (clinic-, team- or
// indication-only notes). They describe NTUH practice rather than the product,
// so they are removed. The Chinese product name is kept as its own field.
// Two kinds of Chinese note describe the product itself and are kept: a former
// name (原名) and the actual delivered dose (實際劑量).
const KEEP_NOTE = /原名|實際劑量/;
const CJK = /[㐀-鿿]/;
const INTERNAL = [
  /^@\s*/,
  /《[^》]*》\s*/g,
  /\((?:PPCD|Cash|Free|CDC|家\d+)\)\s*/gi,
];
const NOT_SYSTEMIC = /\bfor irrigation\b/i;
// Fixed-ratio combinations whose dosing differs from the single-agent monograph.
const UNLINKED_GENERICS = new Set(['Insulin Glargine and Lixisenatide', 'Insulin Degludec and Liraglutide']);
const SCHEDULE = /\(管([1-4])\)\s*/;

const decodeEntities = (text) => text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

export function cleanProduct(label) {
  let text = decodeEntities(String(label || ''));
  let schedule = null;
  const match = text.match(SCHEDULE);
  if (match) { schedule = Number(match[1]); text = text.replace(SCHEDULE, ' '); }
  for (const pattern of INTERNAL) text = text.replace(pattern, ' ');
  // Bracketed notes go whole; a bracket keeps its Latin content when it only
  // wraps a short Chinese prefix, e.g. "(for癌醫)" is removed entirely.
  text = text.replace(/[(\[（]([^()\[\]（）]*)[)\]）]/g, (all, inner) => CJK.test(inner) && !KEEP_NOTE.test(inner) ? ' ' : all);
  // Bare Chinese words outside brackets (常備藥, 化療注射, 免費, 粉, 新, 內含…).
  text = text.replace(/[^\s()\[\]]*[㐀-鿿][^\s()\[\]]*/g, (word) => KEEP_NOTE.test(word) ? word : ' ');
  text = text.replace(/\(\s*\)/g, ' ').replace(/\s+([,/)])/g, '$1').replace(/\s+/g, ' ').trim();
  return { product: text, schedule };
}

const fold = (text) => String(text ?? '').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function parseFormularyData(source) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Formulary data has no JSON object.');
  return JSON.parse(source.slice(start, end + 1));
}

/**
 * Build the index from parsed inputs. `drugs` are the public monographs
 * (id, name, shortName, aliases) so listings can point at an existing monograph.
 */
export function buildNtuhIndex({ catalog, formulary = null, drugs = [] }) {
  if (!Array.isArray(catalog?.drugs)) throw new Error('Catalog needs a drugs array.');
  const monographIds = new Set(drugs.map((drug) => drug.id));
  const byCode = new Map();
  if (formulary?.drugs) {
    for (const [id, record] of Object.entries(formulary.drugs)) {
      if (!monographIds.has(id) || !['listed', 'group-match'].includes(record.status)) continue;
      for (const presentation of record.presentations || []) {
        if (presentation.drugCode && !byCode.has(presentation.drugCode)) byCode.set(presentation.drugCode, id);
      }
    }
  }
  // Exact generic-name equality is the only fallback; partial matches would
  // attach combination products or salts to the wrong monograph.
  const byName = new Map();
  for (const drug of drugs) {
    for (const name of [drug.name, drug.shortName, ...(drug.aliases || [])]) {
      const key = fold(String(name || '').replace(/\s*\(.*\)\s*$/, ''));
      if (key && !byName.has(key)) byName.set(key, drug.id);
    }
  }

  const entries = new Map();
  let omitted = 0;
  for (const row of catalog.drugs) {
    const code = String(row.code || '').trim();
    if (!/^[A-Z0-9 ]{8}$/.test(code)) throw new Error(`Unexpected NTUH code: ${JSON.stringify(row.code)}`);
    if (OMIT.test(decodeEntities(row.tradeLabel || ''))) { omitted += 1; continue; }
    const path = (row.pharmacologyPath || []).map((part) => String(part).trim()).filter(Boolean);
    const existing = entries.get(code);
    if (existing) {
      const key = path.join(' > ');
      if (path.length && !existing.classes.some((item) => item.join(' > ') === key)) existing.classes.push(path);
      continue;
    }
    const { product, schedule } = cleanProduct(row.tradeLabel);
    const chinese = /[㐀-鿿]/.test(row.chineseName || '') && row.chineseName !== '無正式中文名' ? row.chineseName.trim() : null;
    const generic = String(row.genericName || '').trim();
    entries.set(code, {
      code, generic, product: product || generic, chinese,
      ...(schedule ? { schedule } : {}),
      classes: path.length ? [path] : [],
      // A monograph named exactly for the generic outranks a group monograph
      // from the search audit (Insulin Glargine before Long-Acting Insulin).
      // Non-systemic products never inherit a systemic monograph.
      monograph: NOT_SYSTEMIC.test(product) || UNLINKED_GENERICS.has(generic) ? null : byName.get(fold(generic)) || byCode.get(code) || null,
    });
  }
  const list = [...entries.values()].sort((a, b) => a.generic.localeCompare(b.generic, 'en') || a.product.localeCompare(b.product, 'en') || a.code.localeCompare(b.code, 'en'));
  // Class breadcrumbs repeat across hundreds of products; entries reference a
  // shared table by index to keep the offline pack small.
  const classes = [...new Set(list.flatMap((item) => item.classes.map((parts) => parts.join(' > '))))].sort((a, b) => a.localeCompare(b, 'en'));
  const classIndex = new Map(classes.map((name, index) => [name, index]));
  for (const item of list) item.classes = item.classes.map((parts) => classIndex.get(parts.join(' > ')));
  return {
    schemaVersion: 1,
    source: {
      label: 'NTUH Pharmacy public drug catalog',
      catalogUrl: CATALOG_URL,
      detailUrl: DETAIL_URL,
      snapshotDate: String(catalog.generatedAt || '').slice(0, 10),
    },
    notice: 'Names, drug class and NTUH codes only, for linking to NTUH’s public pages. A listing is a snapshot: it does not confirm current availability, formulation, dose or suitability. Products NTUH marked discontinued, compassionate-use only or not dispensed are left out.',
    counts: { listed: list.length, withMonograph: list.filter((item) => item.monograph).length, notListedOmitted: omitted },
    classes,
    entries: list,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [catalogPath, formularyPath] = process.argv.slice(2);
  if (!catalogPath) throw new Error('Usage: node scripts/generate-ntuh-index.mjs <catalog.json> [formulary-data.js]');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const formulary = formularyPath ? parseFormularyData(await readFile(formularyPath, 'utf8')) : null;
  const reference = JSON.parse(await readFile(path.join(ROOT, 'src/data/reference.json'), 'utf8'));
  const index = buildNtuhIndex({ catalog, formulary, drugs: reference.drugs });
  await writeFile(path.join(ROOT, 'src/data/ntuh-index.json'), JSON.stringify(index) + '\n');
  console.log(`${index.counts.listed} listings (${index.counts.withMonograph} with monographs, ${index.counts.notListedOmitted} unlisted rows omitted)`);
}
