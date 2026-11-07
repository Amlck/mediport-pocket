// One search over everything in the pack: guides, POCUS topics, calculators, drug names,
// brands, aliases (including Chinese ones), and maintained indication tags.
// DOM-free and deterministic so
// pocket/search.test.mjs can exercise the ranking directly.
//
// No indication is inferred here: the builder supplies both the literal tags
// and the curated phrase-to-tag lookup. QUERY_ALIASES remains a short list of
// navigation shorthands so that typing "K" reaches the potassium pages.

// Folding makes British and American spellings, accents, superscripts and
// punctuation compare equal: haemoglobin/hemoglobin, K⁺/K+, Na⁺/Na.
// CJK is left intact (drug aliases such as 大塚3號 are searched as substrings).
export function foldText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/(ae|oe)/g, 'e')
    .replace(/[^a-z0-9㐀-鿿]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Navigation shorthands only. These are deliberately directional: a short,
// ambiguous entry such as "K" expands to potassium-related pages, but typing
// the full word "potassium" must not also search every title containing "k".
const QUERY_ALIASES = {
  k: ['potassium', 'hyperkalemia', 'hypokalemia'],
  na: ['sodium', 'hypernatremia', 'hyponatremia'],
  mg: ['magnesium', 'hypermagnesemia', 'hypomagnesemia'],
  ca: ['calcium', 'hypercalcemia', 'hypocalcemia'],
  cl: ['chloride'],
  hco3: ['bicarbonate'],
  ecg: ['ekg'], ekg: ['ecg'],
  egfr: ['gfr'], gfr: ['egfr'],
  crcl: ['creatinine clearance', 'cockcroft'],
  bp: ['blood pressure'], hr: ['heart rate'],
  abg: ['blood gas'], af: ['atrial fibrillation'], afib: ['atrial fibrillation'],
  mi: ['myocardial infarction'], acs: ['chest pain'],
  dm: ['diabetes'], ckd: ['kidney'], aki: ['kidney injury'],
  gi: ['gastrointestinal'], ivf: ['fluid'], abx: ['antibiotic'],
};

function variantsFor(token) {
  const aliases = (QUERY_ALIASES[token] || []).map(foldText).filter(Boolean);
  // Two-character clinical shorthands are too broad as literal substring
  // searches ("K" used to put Ketorolac ahead of potassium pages). They retain
  // their intended navigation expansion while longer terms keep both forms.
  return aliases.length && token.length <= 2 ? aliases : [token, ...aliases];
}

export const SECTIONS = [
  { kind: 'guide', label: 'Management guides' },
  { kind: 'pocus', label: 'POCUS' },
  { kind: 'calculator', label: 'Calculators' },
  { kind: 'drug', label: 'Drug reference' },
  { kind: 'ntuh', label: 'NTUH formulary listings' },
];

// These helpers make the hash route contract testable without loading a view.
// An unknown or missing route parameter deliberately means the all-pack view.
export function normalizeSearchScope(kind) {
  return SECTIONS.some((section) => section.kind === kind) ? kind : 'all';
}

export function searchScopeHref(kind) {
  const scope = normalizeSearchScope(kind);
  return scope === 'all' ? '#/search' : `#/search/${scope}`;
}

export function kindsForSearchScope(kind) {
  const scope = normalizeSearchScope(kind);
  return scope === 'all' ? null : [scope];
}

// Browsing a long catalogue needs only a neutral way to break the list into
// shorter runs. These labels are alphabetical, never clinical classifications.
export const BROWSE_BUCKETS = [
  { id: 'a-f', label: 'A–F', first: 'a', last: 'f' },
  { id: 'g-m', label: 'G–M', first: 'g', last: 'm' },
  { id: 'n-s', label: 'N–S', first: 'n', last: 's' },
  { id: 't-z', label: 'T–Z', first: 't', last: 'z' },
];

const defaultTitleOf = (entry) => entry?.title || entry?.name || entry?.id || '';
function browseBucketFor(title) {
  const first = foldText(title).replace(/\s/g, '')[0] || '';
  return BROWSE_BUCKETS.find((bucket) => first >= bucket.first && first <= bucket.last) || { id: 'other', label: '#' };
}

/**
 * Return every supplied entry once in neutral alphabetical buckets. Views own
 * the markup; this stays DOM-free so Guides and Calculators share one browse
 * contract without creating a second clinical taxonomy.
 */
export function groupBrowseEntries(entries, { titleOf = defaultTitleOf, sort = true } = {}) {
  const groups = new Map([...BROWSE_BUCKETS, { id: 'other', label: '#' }].map((bucket) => [bucket.id, { id: bucket.id, label: bucket.label, entries: [] }]));
  for (const entry of entries || []) groups.get(browseBucketFor(titleOf(entry)).id).entries.push(entry);
  const compare = (left, right) => foldText(titleOf(left)).localeCompare(foldText(titleOf(right))) || String(titleOf(left)).localeCompare(String(titleOf(right)));
  if (sort) for (const group of groups.values()) group.entries.sort(compare);
  return [...BROWSE_BUCKETS.map((bucket) => groups.get(bucket.id)), groups.get('other')].filter((group) => group.entries.length);
}

// Where a token matched, best first. The weight decides the ranking; the label
// is what the result row says under the title.
const EXACT = 0, PRIMARY_PREFIX = 1, ALIAS_PREFIX = 2, PRIMARY_WORD = 3,
  PRIMARY_PART = 4, ALIAS_PART = 5, INDICATION = 5.5, BODY = 6, NO_MATCH = -1;

const fields = (values) => values.filter(Boolean).map((raw) => ({ raw: String(raw), folded: foldText(raw) }));
const joinText = (values) => foldText(values.filter(Boolean).flat(Infinity).join(' '));
const guideTerms = (guide) => (guide.fields || []).flatMap((field) => [field.label, field.key]);
const calculatorTerms = (calculator) => (calculator.groups || []).flatMap((group) => [
  group.title,
  ...(group.fields || []).flatMap((field) => [field.label, field.key, field.shared]),
]);

function guideEntry(guide) {
  const quick = guide.quickReference || {};
  return {
    kind: 'guide', id: guide.id, title: guide.title,
    sub: 'Management guide', href: `#/guides/${guide.id}`, icon: 'book', favoriteId: `guide:${guide.id}`,
    primary: fields([guide.title]),
    aliases: fields([guide.id, ...(guide.stages || []).map((stage) => stage.title), ...guideTerms(guide)]),
    body: joinText([guide.scope, quick.summary, quick.recognition, quick.redFlags, guide.reviewLabel]),
  };
}

function calculatorEntry(calculator) {
  return {
    kind: 'calculator', id: calculator.id, title: calculator.title,
    sub: calculator.subtitle || 'Calculator', href: calculator.href || `#/calc/${calculator.id}`, icon: 'calc', favoriteId: `calc:${calculator.id}`,
    primary: fields([calculator.title, calculator.shortTitle]),
    aliases: fields([...(calculator.searchTerms || []), ...calculatorTerms(calculator)]),
    body: joinText([calculator.subtitle, calculator.footnote]),
  };
}

function pocusEntry(topic, scope) {
  const detail = (title, sub, href, context, primary, body = '', aliases = []) => ({
    kind: 'pocus', id: topic.id, title, sub, href, context, icon: 'book',
    favoriteId: `pocus:${topic.id}`, isPocusDetail: true,
    primary: fields([primary]), aliases: fields(aliases), body: joinText([body]),
  });
  const details = [];
  const measurementIds = pocusMeasurementIds(topic.measurements || []);
  (topic.measurements || []).forEach((measurement, index) => {
    const aliases = [];
    if (/^LV ejection fraction/.test(measurement.name)) aliases.push('EF', 'LVEF');
    if (measurement.name === 'Common bile duct') aliases.push('CBD');
    details.push(detail(measurement.name, `${topic.title} · Measurement`,
      `#/pocus/${topic.id}/measurement/${measurementIds[index]}`, measurement.value,
      measurement.name, [measurement.value, measurement.technique, measurement.context], aliases));
  });
  for (const section of topic.atlas || []) {
    details.push(detail(section.title, `${topic.title} · Atlas section`,
      `#/pocus/${topic.id}/atlas/${section.id}`, '', section.title,
      [section.intro, section.caution]));
    for (const item of section.items || []) details.push(detail(item.title, `${topic.title} · ${section.title}`,
      `#/pocus/${topic.id}/atlas/${item.id}`, section.title, item.title,
      [item.criteria, item.caution]));
  }
  return {
    kind: 'pocus', id: topic.id, title: topic.title,
    sub: topic.group ? `POCUS · ${topic.group}` : 'POCUS reference',
    href: `#/pocus/${topic.id}`, icon: 'book', favoriteId: `pocus:${topic.id}`,
    primary: fields([topic.title]),
    aliases: fields(['POCUS', 'ultrasound', ...(topic.aliases || [])]),
    details,
    body: joinText([
      scope, topic.group, topic.summary,
      (topic.steps || []).flatMap((step) => [step.title, step.text]),
      (topic.findings || []).flatMap((finding) => [finding.term, finding.meaning, finding.caution]),
      (topic.measurements || []).flatMap((measurement) => [measurement.name, measurement.value, measurement.technique, measurement.context]),
      (topic.atlas || []).flatMap((section) => [section.title, section.intro, section.caution,
        section.items.flatMap((item) => [item.title, ...item.criteria, item.caution])]),
      topic.pitfalls,
      (topic.checklist || []).flatMap((item) => [item.label, item.detail]),
    ]),
  };
}

// Measurement names are authored in the shared catalogue; repeated names get
// an occurrence suffix while unrelated insertions leave existing links alone.
export function pocusMeasurementIds(measurements) {
  const seen = new Map();
  return measurements.map((measurement) => {
    const slug = foldText(measurement.name).replace(/\s+/g, '-') || 'measurement';
    const count = (seen.get(slug) || 0) + 1;
    seen.set(slug, count);
    return count === 1 ? slug : `${slug}-${count}`;
  });
}

function drugEntry(drug, indicationLookup) {
  return {
    kind: 'drug', id: drug.id, title: drug.name,
    sub: drug.class, href: `#/drugs/${drug.id}`, icon: 'pill', favoriteId: `drug:${drug.id}`,
    primary: fields([drug.name, drug.shortName]),
    aliases: fields(drug.aliases || []),
    body: joinText([drug.class, drug.spectrum]),
    indicationTags: fields(drug.indicationTags || []),
    indicationLookup,
  };
}

// An NTUH listing is a link to NTUH's own public product page, never a
// monograph. Its rows open externally; `monograph` names a Pocket monograph for
// the same product when one exists. Product and generic names rank like drug
// names; the Chinese name and code are aliases and the class is body text.
export function ntuhDetailUrl(index, code) {
  return `${index.source.detailUrl}${encodeURIComponent(code)}`;
}

function ntuhEntry(listing, index, drugNames) {
  const classes = listing.classes.map((value) => index.classes[value]).filter(Boolean);
  const leaf = classes[0]?.split(' > ').at(-1) || '';
  return {
    kind: 'ntuh', id: listing.code, title: listing.product,
    sub: [listing.generic, listing.chinese, leaf].filter(Boolean).join(' · '),
    href: ntuhDetailUrl(index, listing.code), external: true, icon: 'external', favoriteId: null,
    monograph: listing.monograph ? { id: listing.monograph, name: drugNames.get(listing.monograph) || listing.monograph } : null,
    schedule: listing.schedule || null,
    primary: fields([listing.product, listing.generic]),
    aliases: fields([listing.chinese, listing.code]),
    body: joinText(classes),
  };
}

function normalizedIndicationLookup(lookup) {
  const synonyms = new Map();
  for (const [phrase, tags] of Object.entries(lookup?.synonyms || {})) {
    const key = foldText(phrase);
    if (!key || !Array.isArray(tags)) continue;
    // Folding can merge spellings. Keep only tags endorsed by every collided
    // phrase so an explicit [] cannot turn into a positive match.
    const previous = synonyms.get(key);
    synonyms.set(key, previous ? new Set(tags.filter((tag) => previous.has(tag))) : new Set(tags));
  }
  return synonyms;
}

export function buildSearchIndex({ drugs = [], guides = [], pocus = [], pocusScope = '', calculators = [], drugIndicationLookup = {}, ntuh = null } = {}) {
  const indicationLookup = normalizedIndicationLookup(drugIndicationLookup);
  const drugNames = new Map(drugs.map((drug) => [drug.id, drug.name]));
  const index = [
    ...guides.map(guideEntry),
    ...pocus.map((topic) => pocusEntry(topic, pocusScope)),
    ...calculators.map(calculatorEntry),
    ...drugs.map((drug) => drugEntry(drug, indicationLookup)),
    ...(ntuh?.entries || []).map((listing) => ntuhEntry(listing, ntuh, drugNames)),
  ];
  // Search scope can be guides/calculators alone, so keep the phrase vocabulary
  // on the index as well as the drug entries.
  Object.defineProperty(index, 'indicationLookup', { value: indicationLookup });
  return index;
}

// A known phrase, even one mapped to [], owns its entire query. Unknown phrases
// may match literal tag wording at word boundaries; neither path can turn one
// token of a symptom phrase into a different indication.
function matchedIndications(entry, foldedQuery) {
  if (entry.kind !== 'drug' || !entry.indicationTags?.length) return [];
  const known = entry.indicationLookup?.get(foldedQuery);
  if (known) return entry.indicationTags.filter((tag) => known.has(tag.raw)).map((tag) => tag.raw);
  if (entry.indicationLookup?.has(foldedQuery)) return [];
  return entry.indicationTags.filter((tag) =>
    tag.folded === foldedQuery || tag.folded.startsWith(`${foldedQuery} `)
    || tag.folded.endsWith(` ${foldedQuery}`) || tag.folded.includes(` ${foldedQuery} `)
  ).map((tag) => tag.raw);
}

function scoreField(field, variant) {
  if (field.folded === variant) return EXACT;
  if (field.folded.startsWith(variant)) return PRIMARY_PREFIX;
  if (field.folded.includes(` ${variant}`)) return PRIMARY_WORD;
  if (field.folded.includes(variant)) return PRIMARY_PART;
  return NO_MATCH;
}

function scoreWholeName(entry, foldedQuery) {
  let best = { weight: NO_MATCH, where: null };
  const take = (weight, where) => {
    if (weight !== NO_MATCH && (best.weight === NO_MATCH || weight < best.weight)) best = { weight, where };
  };
  for (const field of entry.primary) take(scoreField(field, foldedQuery), null);
  for (const field of entry.aliases) {
    const weight = scoreField(field, foldedQuery);
    if (weight !== NO_MATCH) take(weight <= PRIMARY_PREFIX ? ALIAS_PREFIX : ALIAS_PART, field.raw);
  }
  return best;
}

// An authored indication synonym owns the complete query. Word boundaries
// prevent short forms such as PE from matching Pepcid or pethidine, and keep
// punctuation-folded N/V from becoming unrelated "n" + "v" token matches.
function scoreKnownPhrase(entry, foldedQuery) {
  const variants = [foldedQuery, ...(QUERY_ALIASES[foldedQuery] || []).map(foldText)];
  let best = { weight: NO_MATCH, where: null };
  const take = (weight, where) => {
    if (weight !== NO_MATCH && (best.weight === NO_MATCH || weight < best.weight)) best = { weight, where };
  };
  for (const variant of variants) {
    const wholeFieldScore = (field) => {
      if (field.folded === variant) return EXACT;
      if (field.folded.startsWith(`${variant} `)) return PRIMARY_PREFIX;
      if (field.folded.includes(` ${variant} `) || field.folded.endsWith(` ${variant}`)) return PRIMARY_WORD;
      return NO_MATCH;
    };
    for (const field of entry.primary) take(wholeFieldScore(field), null);
    for (const field of entry.aliases) {
      const weight = wholeFieldScore(field);
      if (weight !== NO_MATCH) take(weight <= PRIMARY_PREFIX ? ALIAS_PREFIX : ALIAS_PART, field.raw);
    }
    if (` ${entry.body} `.includes(` ${variant} `)) take(BODY, 'text');
  }
  return best;
}

// Best weight for one query token against one entry, plus where it matched.
function scoreToken(entry, token) {
  let best = NO_MATCH;
  let where = null;
  const take = (weight, label) => {
    if (weight === NO_MATCH || (best !== NO_MATCH && weight >= best)) return;
    best = weight; where = label;
  };
  for (const variant of variantsFor(token)) {
    for (const field of entry.primary) take(scoreField(field, variant), null);
    for (const field of entry.aliases) {
      const weight = scoreField(field, variant);
      if (weight === NO_MATCH) continue;
      take(weight <= PRIMARY_PREFIX ? ALIAS_PREFIX : ALIAS_PART, field.raw);
    }
    if ((entry.kind === 'pocus' && variant.length <= 2
      ? ` ${entry.body} `.includes(` ${variant} `)
      : entry.body.includes(variant))) take(BODY, 'text');
  }
  return { weight: best, where };
}

function pocusDetailHit(entry, foldedQuery, tokens, topicScore) {
  if (!entry.details?.length || ['pocus', 'ultrasound'].includes(foldedQuery)
      || entry.primary.some((field) => field.folded === foldedQuery)) return null;
  const primaryTopicMatch = entry.primary.some((field) => scoreField(field, foldedQuery) !== NO_MATCH);
  if (primaryTopicMatch) return null;
  const matches = [];
  for (const candidate of entry.details) {
    let score = 0;
    let where = null;
    let matched = true;
    for (const token of tokens) {
      const result = scoreToken(candidate, token);
      // A short fragment in criteria text is too likely to be incidental.
      if (result.weight === NO_MATCH || (result.weight === BODY && token.length < 3
          && !(` ${candidate.body} `.includes(` ${token} `)))) { matched = false; break; }
      score += result.weight;
      if (!where && result.where) where = result.where;
    }
    if (matched) matches.push({ entry: candidate, score, where });
  }
  matches.sort((a, b) => a.score - b.score
    || Number(b.entry.sub.includes('Measurement')) - Number(a.entry.sub.includes('Measurement'))
    || a.entry.title.localeCompare(b.entry.title));
  const best = matches[0];
  if (!best) return null;
  // A named card or measurement is useful even when the topic also lists the
  // term as an alias. Text-only detail matches need a specific phrase.
  if (best.score < BODY || (foldedQuery.length >= 4 && best.score <= topicScore)) return best;
  return null;
}

/**
 * Rank every entry against the query. Tokens are ANDed: a result must match all
 * of them somewhere. `limitPerSection` caps what a section returns while its
 * `total` still reports everything that matched.
 */
export function searchIndex(index, query, { limitPerSection = Infinity, kinds = null } = {}) {
  const foldedQuery = foldText(query);
  const tokens = foldedQuery.split(' ').filter(Boolean);
  if (!tokens.length) return { query: '', tokens, total: 0, sections: [] };
  const knownPhrase = index.indicationLookup?.has(foldedQuery);

  const hits = [];
  for (const entry of index) {
    if (kinds && !kinds.includes(entry.kind)) continue;
    const indications = matchedIndications(entry, foldedQuery);
    if (knownPhrase) {
      const direct = scoreKnownPhrase(entry, foldedQuery);
      if (indications.length && (direct.weight === NO_MATCH || direct.weight > INDICATION)) {
        hits.push({ entry, score: INDICATION, where: 'indication', matchedIndications: indications });
      } else if (direct.weight !== NO_MATCH) {
        hits.push({ entry, score: direct.weight, where: direct.where });
      }
      continue;
    }
    let score = 0;
    let where = null;
    let matched = true;
    for (const token of tokens) {
      const { weight, where: hitWhere } = scoreToken(entry, token);
      if (weight === NO_MATCH) { matched = false; break; }
      score += weight;
      if (where === null && hitWhere) where = hitWhere;
    }
    if (indications.length) {
      const directName = scoreWholeName(entry, foldedQuery);
      if (directName.weight !== NO_MATCH && (!matched || directName.weight < score)) {
        score = directName.weight;
        where = directName.where;
        matched = true;
      }
      if (!matched || score > INDICATION) {
        hits.push({ entry, score: INDICATION, where: 'indication', matchedIndications: indications });
        continue;
      }
    }
    if (entry.kind === 'pocus') {
      const detail = pocusDetailHit(entry, foldedQuery, tokens, matched ? score : Infinity);
      if (detail) { hits.push(detail); continue; }
    }
    if (matched && !(entry.kind === 'pocus' && tokens.every((token) => token.length <= 2)
      && where === 'text')) hits.push({ entry, score, where });
  }
  hits.sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title));

  const sections = SECTIONS.map(({ kind, label }) => {
    const items = hits.filter((hit) => hit.entry.kind === kind);
    return { kind, label, total: items.length, best: items.length ? items[0].score : Infinity, items: items.slice(0, limitPerSection) };
  }).filter((section) => section.total > 0);
  sections.sort((a, b) => a.best - b.best);
  // Pocket's own monographs come before NTUH's external listings for the same
  // query, even when a product name matches more literally (Lantus SoloStar).
  const drugAt = sections.findIndex((section) => section.kind === 'drug');
  const ntuhAt = sections.findIndex((section) => section.kind === 'ntuh');
  if (drugAt > ntuhAt && ntuhAt >= 0) sections.splice(drugAt, 0, ...sections.splice(ntuhAt, 1));

  return { query, tokens, total: hits.length, sections };
}
