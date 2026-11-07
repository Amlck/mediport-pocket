// Generates src/data/ntuh-index.json: a search index of NTUH's public
// pharmacology catalog that links each product to NTUH's own public detail
// page. Only names, drug class and the code needed for that link are kept;
// NTUH's clinical content (max dose, dose adjustment, package inserts) stays
// on NTUH's site and is never copied here.
//
// Usage:
//   node scripts/generate-ntuh-index.mjs <ntuh-pharmacology-catalog.json> [ntuh-formulary-data.js]
//   node scripts/generate-ntuh-index.mjs --from-index src/data/ntuh-index.json
//
// The catalog is the public scrape of
// https://dept.ntuh.gov.tw/phar/WebAp/QueryDrugInfoPhr.aspx. The optional
// formulary argument is accepted for compatibility but no longer read: search
// audit matches cannot establish clinical product equivalence. Only explicitly
// reviewed product associations below may link to a monograph.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DETAIL_URL = 'https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=';
export const CATALOG_URL = 'https://dept.ntuh.gov.tw/phar/WebAp/QueryDrugInfoPhr.aspx';

// Products that are not ordinary formulary listings: discontinued (DC, 關機,
// 停產), compassionate-use single-patient supply (恩慈) and items the
// pharmacy does not dispense (不發藥). Their public pages may still exist, but
// a listing would mislead, so they are left out.
const OMIT = /[（(]\s*DC\s*[）)]|關機|停產|恩慈|不發藥/i;

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
const SCHEDULE = /\(管([1-4])\)\s*/;

const decodeEntities = (text) => text.replace(/&#(?:x([a-f0-9]+)|(\d+));?/gi, (_, hex, decimal) => String.fromCodePoint(hex ? Number.parseInt(hex, 16) : Number(decimal)))
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

// Product-specific compatibility reviews, not fuzzy ingredient search results.
// Full labels retain route, mixture, release and formulation qualifiers. A source
// label or monograph dosing/scope change invalidates its association until review.
// This does not assert current stock, a matching dose, or fresh website access.
const MONOGRAPH_PRODUCT_LINKS = [
  { code: 'AMO4AA16', monograph: 'amoxicillin', generic: 'Amoxicillin Trihydrate', product: 'Amoxicillin Capsule 250 mg amoxicillin/cap', monographScopeSha256: 'fcd8e081661358be10aef8676899962e9d5310b7fe44ec0894998ee8405e7e35' },
  { code: 'DYN5AA40', monograph: 'amoxicillin', generic: 'Amoxicillin Trihydrate', product: 'Dyna Amoxycillin Oral Suspension 50 mg/1 mL, 60 mL/btl', monographScopeSha256: 'fcd8e081661358be10aef8676899962e9d5310b7fe44ec0894998ee8405e7e35' },
  { code: 'AUG5AA34', monograph: 'amoxicillin-clavulanate', generic: 'Amoxicillin and Clavulanate Potassium', product: 'Augmentin Powder for Oral Suspension 80 mg amoxicillin/mL, 2800 mg amoxicillin & 400 mg clavulanic acid/35 mL/btl', monographScopeSha256: 'e675b44ee1e42bf704f93c9f36cda0637e828062f546d2856825ddb53f659d39' },
  { code: 'AMB1AL18', monograph: 'amphotericin-b', generic: 'Amphotericin B Liposomal', product: 'AmBisome for Injection 50 mg/vial', monographScopeSha256: '367005d1e38e7f560defed9d43342d06040c6e1cb16e0c8c843a861768f2c198' },
  { code: 'ELI4EA49', monograph: 'apixaban', generic: 'Apixaban', product: 'Eliquis Film-Coated Tablet 5 mg/tab', monographScopeSha256: '7614d1e4b413f1fc08922e0a92cbd33c1cf319714dcd9bb39e3cc795d31cf95e' },
  { code: 'VFE1AL23', monograph: 'voriconazole', generic: 'Voriconazole', product: 'Vfend for Solution for Infusion 200 mg/vial', monographScopeSha256: 'c37b3214d1b605ba5fd270a22f034586e71b2ab051cd3f6357b0885130950545' },
  { code: 'VFE4AL23', monograph: 'voriconazole', generic: 'Voriconazole', product: 'Vfend Film-coated Tablet 200 mg/tab', monographScopeSha256: 'c37b3214d1b605ba5fd270a22f034586e71b2ab051cd3f6357b0885130950545' },
  { code: 'DEX1FA08', monograph: 'd10w', generic: 'Dextrose', product: 'Dextrose (Otsuka) 10% 500 mL/bag', monographScopeSha256: '84427670a593a7a92f0318545e8495acb6f3891341c20087e37d563bbc16c24d' },
  { code: 'GIB1FA08', monograph: 'd10w', generic: 'Dextrose', product: 'Gitose 10% 500 mL/bag', monographScopeSha256: '84427670a593a7a92f0318545e8495acb6f3891341c20087e37d563bbc16c24d' },
];

export function monographForListing(entry, drugs) {
  const identity = MONOGRAPH_PRODUCT_LINKS.find(item => item.code === entry.code && item.generic === entry.generic && item.product === entry.product);
  if (!identity) return null;
  const drug = drugs.find(item => item.id === identity.monograph);
  if (!drug) return null;
  const scope = JSON.stringify({ id: drug.id, name: drug.name, dose: drug.dose, contents: drug.contents ?? null });
  return createHash('sha256').update(scope).digest('hex') === identity.monographScopeSha256 ? drug.id : null;
}

const ADMIN_NOTE = /PPCD|(?:^|\b)(?:Cash|Free|CDC)(?:\b|$)|常備|計價|免費|供外籍|憑單領藥|限(?:急診|門診|診所|科|癌醫)|線上不開機/i;

export function cleanChineseName(label) {
  let text = decodeEntities(String(label || '')).replace(/^\s*@\s*/, '').replace(/《[^》]*》\s*/g, '');
  // Unlike the English-label cleanup, preserve ordinary Chinese product words
  // and clinical qualifiers; remove only identified administrative notes.
  text = text.replace(/[(\[（]([^()\[\]（）]*)[)\]）]/g, (all, inner) => ADMIN_NOTE.test(inner) ? ' ' : all);
  text = text.replace(/\s+/g, ' ').trim();
  if (!text || /^無正式中文名/.test(text) || !CJK.test(text)) return null;
  return text;
}

// Rebuild the already-public link index without importing a private capture.
// Its original snapshot date stays unchanged; this is not a fresh source scrape.
export function catalogFromIndex(index) {
  if (index?.schemaVersion !== 1 || !Array.isArray(index.entries) || !Array.isArray(index.classes)) throw new Error('Expected a public NTUH index.');
  return {
    generatedAt: index.source.snapshotDate,
    priorOmittedCount: index.counts?.notListedOmitted || 0,
    drugs: index.entries.map(entry => ({
      code: entry.code, genericName: entry.generic,
      tradeLabel: (entry.schedule ? `(管${entry.schedule}) ` : '') + entry.product,
      chineseName: entry.chinese,
      pharmacologyPaths: entry.classes.map(value => index.classes[value].split(' > ')),
    })),
  };
}

/**
 * Build the index from parsed inputs. `drugs` are the public monographs
 * (id, name, shortName, aliases) so listings can point at an existing monograph.
 */
export function buildNtuhIndex({ catalog, formulary = null, drugs = [] }) {
  if (!Array.isArray(catalog?.drugs)) throw new Error('Catalog needs a drugs array.');
  // Legacy search audits may suggest a component or an unrelated similarly
  // named drug. They are intentionally not a source of clinical identity links.
  void formulary;

  const entries = new Map();
  let omitted = Number.isSafeInteger(catalog.priorOmittedCount) && catalog.priorOmittedCount >= 0 ? catalog.priorOmittedCount : 0;
  const omittedCodes = new Set(catalog.drugs.filter(row => OMIT.test(decodeEntities([row.tradeLabel, row.chineseName].filter(Boolean).join(' ')))).map(row => String(row.code || '').trim()));
  for (const row of catalog.drugs) {
    const code = String(row.code || '').trim();
    if (!/^[A-Z0-9 ]{8}$/.test(code)) throw new Error(`Unexpected NTUH code: ${JSON.stringify(row.code)}`);
    if (omittedCodes.has(code)) { omitted += 1; continue; }
    const paths = (row.pharmacologyPaths || [row.pharmacologyPath || []]).map(parts => parts.map(part => String(part).trim()).filter(Boolean));
    const existing = entries.get(code);
    if (existing) {
      for (const parts of paths) if (parts.length && !existing.classes.some(item => item.join(' > ') === parts.join(' > '))) existing.classes.push(parts);
      continue;
    }
    const { product, schedule } = cleanProduct(row.tradeLabel);
    const chinese = cleanChineseName(row.chineseName);
    const generic = String(row.genericName || '').trim();
    entries.set(code, {
      code, generic, product: product || generic, chinese,
      ...(schedule ? { schedule } : {}),
      classes: paths.filter(parts => parts.length),
      monograph: monographForListing({ code, generic, product }, drugs),
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
  const args = process.argv.slice(2);
  const fromIndex = args[0] === '--from-index';
  const [catalogPath, formularyPath] = fromIndex ? args.slice(1) : args;
  if (!catalogPath) throw new Error('Usage: node scripts/generate-ntuh-index.mjs <catalog.json> [formulary-data.js]');
  const input = JSON.parse(await readFile(catalogPath, 'utf8'));
  const catalog = fromIndex ? catalogFromIndex(input) : input;
  if (formularyPath) console.warn('Legacy formulary audit input ignored: monograph associations require an explicit product compatibility review.');
  const reference = JSON.parse(await readFile(path.join(ROOT, 'src/data/reference.json'), 'utf8'));
  const index = buildNtuhIndex({ catalog, drugs: reference.drugs });
  await writeFile(path.join(ROOT, 'src/data/ntuh-index.json'), JSON.stringify(index) + '\n');
  console.log(`${index.counts.listed} listings (${index.counts.withMonograph} with monographs, ${index.counts.notListedOmitted} unlisted rows omitted)`);
}
