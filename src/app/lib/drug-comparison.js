import { buildSearchIndex, searchIndex } from './search.js';

export const comparableDrugs = (drugs = []) => drugs.filter((drug) => drug?.id && drug.category !== 'fluid');

export function resolveDrugPair(drugs, leftId, rightId) {
  const available = new Map(comparableDrugs(drugs).map((drug) => [drug.id, drug]));
  const left = leftId ? available.get(leftId) || null : null;
  const right = rightId ? available.get(rightId) || null : null;
  return {
    left, right,
    leftError: leftId && !left ? `Drug A “${leftId}” is not a comparable monograph in this pack.` : null,
    rightError: rightId && !right ? `Drug B “${rightId}” is not a comparable monograph in this pack.` : null,
    samePair: Boolean(left && right && left.id === right.id),
  };
}

export function drugCompareHref(leftId, rightId) {
  const ids = [leftId, rightId].filter(Boolean);
  return `#/drugs/compare${ids.length ? `/${ids.map(encodeURIComponent).join('/')}` : ''}`;
}

export function comparisonSearch(drugs, query, indicationLookup = {}) {
  const available = comparableDrugs(drugs);
  if (!String(query || '').trim()) return available.slice().sort((a, b) => a.name.localeCompare(b.name));
  const byId = new Map(available.map((drug) => [drug.id, drug]));
  const index = buildSearchIndex({ drugs: available, drugIndicationLookup: indicationLookup });
  return (searchIndex(index, query, { kinds: ['drug'] }).sections[0]?.items || [])
    .map((hit) => ({ drug: byId.get(hit.entry.id), hit }))
    .filter((result) => result.drug);
}

export const recordedText = (value) => typeof value === 'string' && value.trim() ? value : null;
export const recordedList = (value) => Array.isArray(value) ? value.filter(recordedText) : recordedText(value) ? [value] : [];

export function doseEntries(drug) {
  return Object.entries(drug?.dose || {})
    .filter(([, value]) => recordedText(value))
    .map(([key, value]) => ({ label: ({ standard: 'Standard', loading: 'Loading' })[key] || key, value }));
}

export function renalEntries(drug) {
  return Array.isArray(drug?.renalAdj) ? drug.renalAdj
    .filter((row) => recordedText(row?.crcl) || recordedText(row?.regimen))
    .map((row) => ({ crcl: row.crcl || 'Band not recorded', regimen: row.regimen || 'Regimen not recorded' })) : [];
}

export function reviewDate(drug) {
  return [drug?.reviewedAt, drug?.sourceMetadata?.reviewedAt].find(recordedText) || null;
}

export function reviewLabel(drug) {
  const date = reviewDate(drug);
  if (!date) return null;
  const scope = recordedText(drug?.sourceMetadata?.reviewScope);
  return scope ? `${scope} · reviewed ${date}` : `Source review date: ${date}`;
}

export function referenceTexts(drug) {
  return referenceEntries(drug).map((reference) => reference.text);
}

export function referenceEntries(drug) {
  return (Array.isArray(drug?.references) ? drug.references : [])
    .filter((reference) => recordedText(reference?.text))
    .map((reference) => ({
      text: reference.text,
      url: typeof reference.url === 'string' && reference.url.startsWith('https://') ? reference.url : null,
    }));
}

// Navigation state holds only public reference IDs, disclosure names and a
// screen position. It is bounded, in memory, and invalidated by New patient.
const readingByPair = new Map();
let readingGeneration = 0;
const readingKey = (leftId, rightId) => `${leftId}\u0000${rightId}`;
export const comparisonReading = {
  generation: () => readingGeneration,
  get(leftId, rightId) {
    const state = readingByPair.get(readingKey(leftId, rightId));
    return state ? { openSections: [...state.openSections], scrollTop: state.scrollTop } : null;
  },
  save(leftId, rightId, state, generation = readingGeneration) {
    if (generation !== readingGeneration || !leftId || !rightId || leftId === rightId) return;
    const key = readingKey(leftId, rightId);
    readingByPair.delete(key);
    readingByPair.set(key, {
      openSections: [...new Set((state.openSections || []).filter((section) => typeof section === 'string'))],
      scrollTop: Number.isFinite(state.scrollTop) ? Math.max(0, state.scrollTop) : 0,
    });
    if (readingByPair.size > 12) readingByPair.delete(readingByPair.keys().next().value);
  },
  clear() { readingByPair.clear(); readingGeneration += 1; },
};
