import { h, icon, starButton, note, disclosure } from '../lib/ui.js';
import { SEVERITY, tile, branches, formula, values, step, caveats, segmentedRow, sessionBanner, relatedCard, editValuesButton, calculatorScrollBehavior, sourceCard } from './calc-parts.js';
import { patientSession } from '../lib/session.js';

// Gas bicarbonate and chemistry bicarbonate are distinct measurements.
const SHARED = { ph: 'ph', paco2: 'paco2', hco3: 'bloodGasBicarbonate', na: 'sodium', cl: 'chloride', alb: 'albumin' };

function abgRelated(result) {
  const i = result.interpretation;
  const items = [];
  if (['high-gap', 'mixed-high-and-normal-gap', 'high-gap-plus-alkalosis'].includes(i.anionGap.pattern)) items.push({ href: '#/guides/dka-hhs', label: 'DKA / HHS guide', why: 'ketoacidosis is one cause of a high-gap acidosis' });
  if (/respiratory-acidosis/.test(i.primary.code) || i.compensation.verdict === 'concurrent-respiratory-acidosis') items.push({ href: '#/guides/acute-hypoxemia-dyspnea', label: 'Acute hypoxaemia / dyspnoea guide', why: 'hypoventilation with CO₂ retention' });
  items.push({ href: '#/calc/aa-gradient', label: 'A-a gradient', why: 'oxygenation read of the same gas' });
  return items;
}

// Every clinical decision on this page comes from the extracted registry functions
// (interpretABG, osmolarGap, urineAnionGap, metabolicAlkalosisUrineChloride).
// The UI only maps the returned codes onto visible branch lists.

const GAS = [
  { key: 'ph', label: 'pH', unit: '', placeholder: '7.40' },
  { key: 'paco2', label: 'PaCO₂', unit: 'mmHg', placeholder: '40' },
  { key: 'hco3', label: 'HCO₃⁻', unit: 'mmol/L', placeholder: '24' },
];
const CHEM = [
  { key: 'na', label: 'Na⁺', unit: 'mmol/L', placeholder: '140' },
  { key: 'cl', label: 'Cl⁻', unit: 'mmol/L', placeholder: '104' },
  { key: 'alb', label: 'Albumin', unit: 'g/dL · default 4.0', placeholder: '4.0' },
];
const OSM = [
  { key: 'measuredOsm', label: 'Measured Osm', unit: 'mOsm/kg', placeholder: '290' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', placeholder: '100' },
  { key: 'bun', label: 'BUN', unit: 'mg/dL', placeholder: '14' },
];
const UAG = [
  { key: 'urineSodium', label: 'Urine Na', unit: 'mEq/L', placeholder: '40' },
  { key: 'urinePotassium', label: 'Urine K', unit: 'mEq/L', placeholder: '30' },
  { key: 'urineChloride', label: 'Urine Cl', unit: 'mEq/L', placeholder: '50' },
];
const DIURETICS = [['unknown', 'Unknown'], ['none', 'None'], ['remote', 'Stopped'], ['current', 'Current']];
const BLOOD_PRESSURE = [['unknown', 'Unknown'], ['high', 'High'], ['normal-low', 'Normal / low']];
const UCL_RESISTANT_BRANCHES = [
  { id: 'mineralocorticoid-excess', label: 'Blood pressure high', rule: 'mineralocorticoid excess · aldosteronism, Cushing, Liddle' },
  { id: 'normotensive-resistant', label: 'Blood pressure normal or low', rule: 'Bartter / Gitelman · diuretics · K or Mg depletion' },
];

const PRIMARY_BRANCHES = [
  { id: 'a', label: 'Metabolic acidosis', rule: 'pH < 7.35 and HCO₃⁻ < 22', codes: ['metabolic-acidosis'] },
  { id: 'b', label: 'Respiratory acidosis', rule: 'pH < 7.35 and HCO₃⁻ ≥ 22', codes: ['respiratory-acidosis'] },
  { id: 'c', label: 'Metabolic alkalosis', rule: 'pH > 7.45 and HCO₃⁻ > 26', codes: ['metabolic-alkalosis'] },
  { id: 'd', label: 'Respiratory alkalosis', rule: 'pH > 7.45 and HCO₃⁻ ≤ 26', codes: ['respiratory-alkalosis'] },
  { id: 'e', label: 'Near-normal pH', rule: 'pH 7.35–7.45 · compensated or mixed', codes: null },
];
const PACO2_BRANCHES = [
  { id: 'concurrent-respiratory-alkalosis', label: 'Below expected range', rule: 'concurrent respiratory alkalosis' },
  { id: 'appropriate', label: 'Within expected range', rule: 'appropriate compensation' },
  { id: 'concurrent-respiratory-acidosis', label: 'Above expected range', rule: 'concurrent respiratory acidosis' },
];
const HCO3_BRANCHES = [
  { id: 'lower-than-expected', label: 'Below acute expectation', rule: 'concurrent metabolic acidosis or uncompensated' },
  { id: 'appropriate', label: 'Between acute and chronic', rule: 'appropriate compensation' },
  { id: 'higher-than-expected', label: 'Above chronic expectation', rule: 'concurrent metabolic alkalosis' },
];
const DELTA_BRANCHES = [
  { id: 'normal-gap-predominant', label: 'Ratio < 0.4', rule: 'predominant normal-gap component' },
  { id: 'mixed-high-and-normal-gap', label: 'Ratio 0.4–1', rule: 'mixed high-gap + normal-gap' },
  { id: 'high-gap', label: 'Ratio 1–2', rule: 'pure high anion gap acidosis' },
  { id: 'high-gap-plus-alkalosis', label: 'Ratio > 2', rule: 'high-gap acidosis + metabolic alkalosis' },
];
const OSM_BRANCHES = [
  { id: 'normal', label: 'Gap ≤ 10', rule: 'no unmeasured osmoles suggested' },
  { id: 'elevated', label: 'Gap > 10', rule: 'consider toxic alcohols' },
];
const UAG_BRANCHES = [
  { id: 'negative', label: 'UAG < −10', rule: 'intact renal NH₄⁺ excretion · GI bicarbonate loss' },
  { id: 'indeterminate', label: 'UAG −10 to +10', rule: 'indeterminate' },
  { id: 'positive', label: 'UAG > +10', rule: 'impaired renal NH₄⁺ excretion · RTA' },
];
const UCL_BRANCHES = [
  { id: 'chloride-responsive', label: 'Urine Cl < 20', rule: 'chloride-responsive · depletion' },
  { id: 'indeterminate', label: 'Urine Cl 20–40', rule: 'indeterminate' },
  { id: 'chloride-resistant', label: 'Urine Cl > 40', rule: 'chloride-resistant' },
];
const SHORT = {
  'metabolic-acidosis': 'Metabolic acidosis', 'respiratory-acidosis': 'Respiratory acidosis',
  'metabolic-alkalosis': 'Metabolic alkalosis', 'respiratory-alkalosis': 'Respiratory alkalosis',
  appropriate: 'appropriate compensation', 'concurrent-respiratory-acidosis': '+ respiratory acidosis',
  'concurrent-respiratory-alkalosis': '+ respiratory alkalosis', 'lower-than-expected': '+ metabolic acidosis',
  'higher-than-expected': '+ metabolic alkalosis', 'high-gap': 'HAGMA', 'mixed-high-and-normal-gap': 'HAGMA + NAGMA',
  'normal-gap-predominant': 'predominant NAGMA', 'high-gap-plus-alkalosis': 'HAGMA + metabolic alkalosis',
  'normal-gap': 'NAGMA', 'elevated-without-acidosis': 'elevated AG without acidosis',
};

const blank = (fields) => Object.fromEntries(fields.map((f) => [f.key, '']));
// Values stay in memory for the session. Nothing here is persisted or transmitted.
const session = {
  values: { ...blank(GAS), ...blank(CHEM) }, result: null, stale: false,
  osm: blank(OSM), uag: blank(UAG), uagCarried: {}, ucl: { urineChloride: '', diuretics: 'unknown', bloodPressure: 'unknown' },
};
function resetSession() {
  session.values = { ...blank(GAS), ...blank(CHEM) };
  session.osm = blank(OSM); session.uag = blank(UAG); session.uagCarried = {};
  session.ucl = { urineChloride: '', diuretics: 'unknown', bloodPressure: 'unknown' };
  session.result = null; session.stale = false;
}
patientSession.onReset(resetSession);
patientSession.onLabReview(resetSession);

function primaryStep(i) {
  const branch = PRIMARY_BRANCHES.find((b) => b.codes && b.codes.includes(i.primary.code)) || PRIMARY_BRANCHES[4];
  const sub = branch.id === 'e' ? i.primary.label : null;
  const tone = SEVERITY[i.severity]?.[0] || '';
  return step(1, 'Primary disorder', tone, [
    values(`pH ${i.inputs.ph} · PaCO₂ ${i.inputs.paco2} · HCO₃⁻ ${i.inputs.hco3} → ${i.phClass}`),
    branches(PRIMARY_BRANCHES, branch.id, sub, { showMatch: true }),
  ]);
}

function compensationStep(i) {
  const c = i.compensation;
  const tone = c.tone === 'danger' ? 'urgent' : c.tone === 'ok' ? 'ok' : 'attention';
  if (!c.expected) {
    return step(2, 'Compensation', tone, [h('p', { class: 'tsummary' }, c.text)]);
  }
  const isPaco2 = c.expected.type === 'paco2';
  return step(2, 'Compensation', tone, [
    formula(c.expected.formula),
    values(isPaco2
      ? `Expected PaCO₂ ${c.expected.low}–${c.expected.high} · observed ${c.observed}`
      : `Expected HCO₃⁻ acute ~${c.expected.acute} · chronic ~${c.expected.chronic} · observed ${c.observed}`),
    branches(isPaco2 ? PACO2_BRANCHES : HCO3_BRANCHES, c.verdict),
  ]);
}

function anionGapStep(i) {
  const g = i.anionGap;
  if (!g.available) {
    return step(3, 'Anion gap', '', [h('p', { class: 'tsummary muted' }, g.text)], { muted: true });
  }
  const high = g.tone === 'caution';
  const body = [
    formula('AG = Na⁺ − Cl⁻ − HCO₃⁻ · corrected = AG + 2.5 × (4 − Alb)'),
    values(`AG ${g.ag} · corrected ${g.corrected} (Alb ${g.albumin})`),
    branches([
      { id: 'normal', label: 'Corrected AG ≤ 12', rule: 'normal anion gap' },
      { id: 'high', label: 'Corrected AG > 12', rule: 'high anion gap' },
    ], high ? 'high' : 'normal'),
  ];
  if (g.deltaRatio !== null) {
    body.push(
      formula(`Δ ratio = (corrected AG − 12) / (24 − HCO₃⁻) = ${g.deltaRatio}`),
      branches(DELTA_BRANCHES, g.pattern));
  } else if (g.pattern === 'normal-gap' || g.pattern === 'elevated-without-acidosis') {
    body.push(h('p', { class: 'tsummary' }, g.deltaText || SHORT[g.pattern]));
  }
  return step(3, 'Anion gap', high ? 'attention' : 'ok', body);
}

function conclusionParts(i) {
  const parts = [SHORT[i.primary.code] || i.primary.label];
  if (i.compensation.expected) parts.push(SHORT[i.compensation.verdict] || i.compensation.verdict);
  if (i.anionGap.available && i.anionGap.pattern && i.anionGap.pattern !== 'normal') parts.push(SHORT[i.anionGap.pattern] || i.anionGap.pattern);
  return parts;
}

function conclusion(i) {
  return h('div', { class: 'conclusion' }, h('span', { class: 'k' }, 'Conclusion'), h('span', { class: 'v' }, conclusionParts(i).join(' · ')));
}

function interpretationSummary(result, onEdit) {
  const [primary, ...details] = conclusionParts(result.interpretation);
  const [tone, severityLabel] = SEVERITY[result.severity] || ['', ''];
  const albuminAssumption = result.assumptions.find((assumption) => assumption.field === 'alb');
  return h('section', { class: `abg-summary ${session.stale ? 'is-stale' : ''}`, 'aria-label': session.stale ? 'Outdated interpretation' : 'Current interpretation' },
    session.stale ? h('p', { class: 'abg-summary-eyebrow' }, 'Previous interpretation · values changed') : null,
    h('div', { class: 'abg-summary-head' },
      h('p', { class: 'abg-summary-primary' }, primary),
      severityLabel ? h('span', { class: `chip ${session.stale ? 'attention' : tone}` }, session.stale ? 'Outdated' : severityLabel) : null),
    details.length ? h('p', { class: 'abg-summary-secondary' }, details.join(' · ')) : null,
    h('div', { class: 'abg-summary-foot' },
      albuminAssumption ? h('p', { class: 'abg-summary-assumption' },
        result.interpretation.anionGap.available
          ? `Albumin assumed ${albuminAssumption.value.toFixed(1)} g/dL`
          : `Albumin not entered · ${albuminAssumption.value.toFixed(1)} g/dL default for corrected AG`) : null,
      editValuesButton(onEdit)));
}

function acidosisRelevant(i) {
  return ['metabolic-acidosis', 'compensated-metabolic-acidosis', 'near-normal-metabolic-acidosis-respiratory-alkalosis'].includes(i.primary.code)
    || ['high-gap', 'mixed-high-and-normal-gap', 'normal-gap-predominant', 'normal-gap', 'high-gap-plus-alkalosis'].includes(i.anionGap.pattern);
}
function alkalosisRelevant(i) {
  return ['metabolic-alkalosis', 'compensated-metabolic-alkalosis', 'near-normal-metabolic-alkalosis-respiratory-acidosis'].includes(i.primary.code)
    || i.anionGap.pattern === 'high-gap-plus-alkalosis' || i.compensation.verdict === 'higher-than-expected';
}

// ---- workups (Part 2 / Part 3) ---------------------------------------------

function workupPanel(title, tone, open, body) {
  return h('details', { class: `part ${tone}`, open },
    h('summary', null, h('span', null, title), icon('chevron', 20, 'chevron')),
    h('div', { class: 'part-body' }, body));
}

function osmBlock(engines) {
  const host = h('div', { class: 'wresult' });
  const render = () => {
    const r = engines.abg.computeOsmolarGap({ na: session.values.na, ...session.osm });
    if (r.status !== 'ok') {
      const fields = [...CHEM, ...OSM];
      host.replaceChildren(...(r.issues || []).map((issue) => h('p', { class: 'muted' },
        issue.field === 'na' && issue.code === 'required' ? 'Enter Na in the chemistry group above.'
          : issue.message.replace(new RegExp('^' + issue.field + '\\b'), fields.find((f) => f.key === issue.field)?.label || issue.field))));
      return;
    }
    const x = r.result;
    host.replaceChildren(
      formula('Calculated = 2 × Na + glucose / 18 + BUN / 2.8'),
      values(`Calculated ${x.calculated} mOsm/kg${x.gap !== null ? ` · measured ${x.measured} · gap ${x.gap}` : ''}`),
      x.gap !== null ? branches(OSM_BRANCHES, x.gapElevated ? 'elevated' : 'normal') : h('p', { class: 'muted' }, 'Enter measured osmolality to classify the gap.'));
  };
  const onInput = (key, value) => { patientSession.markActive(); session.osm = { ...session.osm, [key]: value }; render(); };
  render();
  return h('div', { class: 'wblock' },
    h('h4', null, 'Osmolar gap'),
    h('div', { class: 'tiles' }, OSM.map((f) => tile(f, session.osm[f.key], onInput, null, 'osm'))),
    host);
}

function uagBlock(engines) {
  for (const field of UAG) {
    if (session.uag[field.key] === '' && patientSession.has(field.key)) {
      session.uag[field.key] = String(patientSession.get(field.key));
      session.uagCarried[field.key] = patientSession.source(field.key);
    }
  }
  const banner = h('div');
  const host = h('div', { class: 'wresult' });
  let block;
  const renderBanner = () => {
    banner.replaceChildren(...[sessionBanner(session.uagCarried, () => patientSession.clear())].filter(Boolean));
    block?.querySelectorAll('.tile').forEach((t) => t.classList.toggle('carried', Boolean(session.uagCarried[t.dataset.field])));
  };
  const render = () => {
    renderBanner();
    const r = engines.abg.computeUrineAnionGap(session.uag);
    if (r.status !== 'ok') {
      host.replaceChildren(...(r.issues || []).map((issue) => h('p', { class: 'muted' },
        issue.message.replace(new RegExp('^' + issue.field + '\\b'), UAG.find((f) => f.key === issue.field)?.label || issue.field))));
      return;
    }
    const x = r.result;
    host.replaceChildren(
      formula('UAG = urine Na⁺ + K⁺ − Cl⁻'),
      values(x.label),
      branches(UAG_BRANCHES, x.read),
      h('p', { class: 'tsummary' }, x.text),
      caveats(x.caveats));
  };
  const onInput = (key, value) => {
    patientSession.markActive();
    session.uag = { ...session.uag, [key]: value };
    delete session.uagCarried[key];
    // The maintained wrapper validates every entered field even when other
    // required values are still missing. Publish only the edited validated
    // measurement; invalid or blank edits remove its previous shared value.
    const response = engines.abg.computeUrineAnionGap(session.uag);
    if (String(value).trim() && !response.issues?.some((issue) => issue.field === key)) {
      patientSession.publish({ [key]: Number(value) }, 'Urine anion gap');
    } else patientSession.forget([key]);
    render();
  };
  render();
  block = h('div', { class: 'wblock' },
    h('h4', null, 'Urine anion gap'),
    banner,
    h('div', { class: 'tiles' }, UAG.map((f) => tile(f, session.uag[f.key], onInput, null, 'uag'))),
    host);
  renderBanner();
  return block;
}

function urineChlorideBlock(engines) {
  const host = h('div', { class: 'wresult' });
  const controls = h('div', { class: 'stack' });
  const render = () => {
    controls.replaceChildren(
      segmentedRow('Diuretic exposure', DIURETICS, session.ucl.diuretics, (value) => { patientSession.markActive(); session.ucl = { ...session.ucl, diuretics: value }; render(); }),
      segmentedRow('Blood pressure', BLOOD_PRESSURE, session.ucl.bloodPressure, (value) => { patientSession.markActive(); session.ucl = { ...session.ucl, bloodPressure: value }; render(); }));
    const r = engines.abg.computeAlkalosisUrineChloride(session.ucl);
    if (r.status !== 'ok') {
      host.replaceChildren(
        ...(r.issues || []).map((issue) => h('p', { class: 'muted' }, issue.message.replace(/^urineChloride\b/, 'Urine Cl'))),
        h('p', { class: 'muted' }, 'Alkali gain (milk-alkali, absorbable antacids, bicarbonate load) is a separate category at any urine chloride.'));
      return;
    }
    const x = r.result;
    host.replaceChildren(
      values(x.label),
      branches(UCL_BRANCHES, x.read),
      ...(x.read === 'chloride-resistant' ? [branches(UCL_RESISTANT_BRANCHES, x.subRead)] : []),
      h('p', { class: 'tsummary' }, x.text),
      caveats(x.caveats));
  };
  const onInput = (key, value) => { patientSession.markActive(); session.ucl = { ...session.ucl, [key]: value }; render(); };
  render();
  return h('div', { class: 'wblock' },
    h('h4', null, 'Urine chloride'),
    h('div', { class: 'tiles' }, tile({ key: 'urineChloride', label: 'Urine Cl', unit: 'mEq/L', placeholder: '15' }, session.ucl.urineChloride, onInput, null, 'ucl')),
    controls,
    host);
}

// Independent routes reuse the exact live workup blocks from Parts 2 and 3.
// Their inputs share this in-memory ABG session, but no gas interpretation is
// needed to reach the chemistry or urine measurements.
const WORKUP_PAGES = {
  'osmolar-gap': {
    title: 'Osmolar gap',
    intro: 'Enter Na, glucose and BUN to calculate serum osmolality. Add measured osmolality to classify the gap.',
    render: osmBlock,
    clear() { session.values.na = ''; session.osm = blank(OSM); },
  },
  'urine-anion-gap': {
    title: 'Urine anion gap',
    intro: 'Urine Na + K − Cl for a normal-gap metabolic acidosis workup.',
    render: uagBlock,
    clear() { session.uag = blank(UAG); session.uagCarried = {}; patientSession.forget(UAG.map((field) => field.key)); },
  },
  'urine-chloride': {
    title: 'Urine chloride',
    intro: 'Urine chloride, diuretic exposure and blood-pressure context for a metabolic alkalosis workup.',
    render: urineChlorideBlock,
    clear() { session.ucl = { urineChloride: '', diuretics: 'unknown', bloodPressure: 'unknown' }; },
  },
};

export function abgWorkupView(ctx, [id]) {
  const page = WORKUP_PAGES[id];
  if (!page) return { title: 'Workup', el: h('div', { class: 'page' }, note('urgent', 'Workup unavailable.')) };
  const el = h('div', { class: 'page calculator-page abg-page' });
  const bannerHost = h('div');
  const workupHost = h('div');
  const carried = {};
  if (id === 'osmolar-gap' && session.values.na === '' && patientSession.has('sodium')) {
    session.values.na = String(patientSession.get('sodium'));
    carried.sodium = patientSession.source('sodium');
  }

  function renderWorkup() {
    const body = [
      h('p', { class: 'muted' }, page.intro),
      id === 'osmolar-gap'
        ? h('div', { class: 'tiles' }, tile(CHEM[0], session.values.na, (key, value) => {
          patientSession.markActive();
          session.values.na = value;
          if (session.result) session.stale = true;
          if (carried.sodium) { delete carried.sodium; renderBanner(); }
          workupHost.querySelector('.wblock')?.replaceWith(osmBlock(ctx.engines));
        }, null, 'workup'))
        : null,
      page.render(ctx.engines),
    ];
    workupHost.replaceChildren(h('div', { class: 'card calculator-inputs' }, body));
    renderBanner();
  }
  function renderBanner() {
    bannerHost.replaceChildren(...[sessionBanner(carried, () => patientSession.clear())].filter(Boolean));
    workupHost.querySelector('.tile[data-field="na"]')?.classList.toggle('carried', Boolean(carried.sodium));
  }
  function clear() {
    page.clear();
    if (id === 'osmolar-gap' && session.result) session.stale = true;
    for (const key of Object.keys(carried)) delete carried[key];
    renderWorkup();
    workupHost.querySelector('input')?.focus();
  }
  const unsubscribeReset = patientSession.onReset(() => {
    for (const key of Object.keys(carried)) delete carried[key];
    renderWorkup();
  });
  const unsubscribeLabReview = patientSession.onLabReview(() => {
    for (const key of Object.keys(carried)) delete carried[key];
    if (id === 'osmolar-gap' && patientSession.has('sodium')) {
      session.values.na = String(patientSession.get('sodium'));
      carried.sodium = patientSession.source('sodium');
    }
    renderWorkup();
  });
  el.append(
    bannerHost,
    workupHost,
    sourceCard([
      `portal-calculator-registry.js :: ${id === 'osmolar-gap' ? 'osmolarGap' : id === 'urine-anion-gap' ? 'urineAnionGap' : 'metabolicAlkalosisUrineChloride'}() — the same maintained function used in the ABG workup.`,
      `registry sha256 ${ctx.engines.abg.ABG_SOURCE.sha256.slice(0, 16)}… · pack ${ctx.release.version}; packaging date is not a clinical review date.`,
      id === 'urine-anion-gap' ? 'Urine anion gap thresholds were drafted 2026-09-18 from Batlle 1988 and Kamel 2021; clinician review pending.'
        : id === 'urine-chloride' ? 'Urine chloride thresholds were drafted 2026-09-18 from Galla 2000 and Emmett 2020; clinician review pending.' : null,
    ].filter(Boolean)),
    h('a', { class: 'btn-ghost pad-x', href: '#/calc/abg' }, 'Open full ABG interpretation'));
  renderWorkup();
  const footer = h('div', { class: 'actionbar' }, h('button', { class: 'btn-secondary', type: 'button', onclick: clear }, 'Clear'));
  return { title: page.title, el, right: starButton(`calc:${id}`, 'calculator favorite'), footer, onUnmount: () => { unsubscribeReset(); unsubscribeLabReview(); } };
}

// ---- results ----------------------------------------------------------------

function resultsSection(result, ctx, onEdit) {
  const i = result.interpretation;
  return h('section', { class: `results ${session.stale ? 'stale' : ''}`, id: 'plan' },
    interpretationSummary(result, onEdit),
    session.stale ? note('attention', 'Values changed since this interpretation. Tap Interpret to refresh.') : null,
    h('div', { class: 'results-head' }, h('h2', null, 'Part 1 · Diagnosis')),
    h('ol', { class: 'timeline', role: 'list' }, primaryStep(i), compensationStep(i), anionGapStep(i)),
    conclusion(i),
    h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Next checks'), h('ul', { class: 'checks' }, i.nextChecks.map((c) => h('li', null, c)))),
    result.assumptions.map((a) => note('info', a.reason)),
    result.inputNotices.map((n) => note('plain', n)),
    workupPanel('Part 2 · Metabolic acidosis workup', 'acid', acidosisRelevant(i), [
      h('p', { class: 'muted' }, acidosisRelevant(i) ? 'Opened because the diagnosis involves a metabolic acidosis component.' : 'Not indicated by this gas; available for review.'),
      osmBlock(ctx.engines), uagBlock(ctx.engines),
    ]),
    workupPanel('Part 3 · Metabolic alkalosis workup', 'alk', alkalosisRelevant(i), [
      h('p', { class: 'muted' }, alkalosisRelevant(i) ? 'Opened because the diagnosis involves a metabolic alkalosis component.' : 'Not indicated by this gas; available for review.'),
      urineChlorideBlock(ctx.engines),
    ]),
    h('div', { class: 'card calc-source-card' }, disclosure('Calculation source', [
      h('p', null, `Interpretation: ${result.source.originalFile} :: ${result.source.originalFunction}(), plus osmolar gap, urine anion gap and urine chloride from the same registry.`),
      h('p', { class: 'muted mono-small' }, `registry sha256 ${result.source.sha256.slice(0, 16)}… · renderer ${result.source.renderer.sha256.slice(0, 16)}…`),
      h('p', null, `Pack ${ctx.release.version}. Packaging date is not a clinical review date. Urine anion gap and urine chloride thresholds were drafted 2026-09-18 from Batlle 1988, Kamel 2021, Galla 2000 and Emmett 2020; clinician review pending.`),
    ], { className: 'calc-disclosure' })));
}

export function abgView(ctx) {
  const { computeABG } = ctx.engines.abg;
  const ALL = [...GAS, ...CHEM];
  const el = h('div', { class: 'page calculator-page abg-page' });
  const resultsHost = h('div');
  const issuesHost = h('div', { class: 'issues' });
  const bannerHost = h('div');
  const carried = {};
  function carryReviewed() {
    for (const [key, shared] of Object.entries(SHARED)) {
      if (session.values[key] === '' && patientSession.has(shared)) { session.values = { ...session.values, [key]: String(patientSession.get(shared)) }; carried[shared] = patientSession.source(shared); }
    }
  }
  carryReviewed();
  function renderBanner() {
    bannerHost.replaceChildren(...[sessionBanner(carried, () => { patientSession.clear(); for (const k of Object.keys(carried)) delete carried[k]; clear(); renderBanner(); })].filter(Boolean));
    el.querySelectorAll('.tile').forEach((t) => t.classList.toggle('carried', Boolean(carried[SHARED[t.dataset.field]])));
  }

  function issueText(issue) {
    const field = ALL.find((f) => f.key === issue.field);
    return field ? issue.message.replace(new RegExp('^' + issue.field + '\\b'), field.label) : issue.message;
  }
  function onInput(key, value) {
    patientSession.markActive();
    session.values = { ...session.values, [key]: value };
    if (carried[SHARED[key]]) { delete carried[SHARED[key]]; renderBanner(); }
    if (session.result && !session.stale) { session.stale = true; renderResults(); }
    clearIssues();
  }
  function onEnter(key) {
    const order = ALL.map((f) => f.key);
    const next = order[order.indexOf(key) + 1];
    if (next && key !== 'hco3' && key !== 'alb') el.querySelector(`#abg-${next}`)?.focus();
    else interpret();
  }
  function clearIssues() {
    issuesHost.replaceChildren();
    el.querySelectorAll('.tile.invalid').forEach((t) => t.classList.remove('invalid'));
  }
  function interpret() {
    document.activeElement?.blur?.();
    const result = computeABG(session.values);
    clearIssues();
    if (result.status !== 'ok') {
      for (const issue of result.issues) el.querySelector(`.tile[data-field="${issue.field}"]`)?.classList.add('invalid');
      issuesHost.replaceChildren(...result.issues.map((issue) => h('div', null, issueText(issue))));
      session.result = null;
      renderResults();
      return;
    }
    session.result = result;
    session.stale = false;
    patientSession.publish(Object.fromEntries(Object.entries(SHARED)
      .filter(([key]) => session.values[key]?.trim() && Number.isFinite(Number(session.values[key])))
      .map(([key, shared]) => [shared, Number(session.values[key])])), 'ABG');
    renderResults();
    resultsHost.firstChild?.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
  }
  function editValues() {
    el.querySelector('#abg-inputs')?.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
    el.querySelector('#abg-ph')?.focus({ preventScroll: true });
  }
  function clear() {
    resetSession();
    patientSession.forget([...Object.values(SHARED), ...UAG.map(field => field.key)]);
    el.querySelectorAll('.tile input').forEach((input) => { input.value = ''; });
    clearIssues();
    renderResults();
    el.querySelector('#abg-ph')?.focus();
  }
  function renderResults() {
    resultsHost.replaceChildren(...(session.result ? [resultsSection(session.result, ctx, editValues), relatedCard(abgRelated(session.result), ctx)] : []).filter(Boolean));
  }
  const unsubscribeLabReview = patientSession.onLabReview(() => {
    for (const key of Object.keys(carried)) delete carried[key];
    carryReviewed();
    for (const field of ALL) {
      const input = el.querySelector(`#abg-${field.key}`);
      if (input) input.value = session.values[field.key];
    }
    clearIssues(); renderResults(); renderBanner();
  });

  el.append(
    bannerHost,
    h('div', { class: 'card calculator-inputs', id: 'abg-inputs' },
      h('div', { class: 'card-title' }, 'Blood gas'),
      h('div', { class: 'tiles' }, GAS.map((f) => tile(f, session.values[f.key], onInput, onEnter, 'abg')))),
    h('div', { class: 'card calculator-inputs' },
      h('div', { class: 'card-title' }, 'Chemistry · optional for anion gap'),
      h('div', { class: 'tiles' }, CHEM.map((f) => tile(f, session.values[f.key], onInput, onEnter, 'abg')))),
    issuesHost,
    resultsHost,
    h('p', { class: 'muted pad-x' }, 'Entries stay in memory on this device. Enter both Na and Cl for an anion gap; albumin defaults to 4.0 g/dL when blank.'));
  renderResults();
  renderBanner();

  const footer = h('div', { class: 'actionbar' },
    h('button', { class: 'btn-secondary', type: 'button', onclick: clear }, 'Clear'),
    h('button', { class: 'btn-primary', type: 'button', onclick: interpret }, 'Interpret'));
  return { title: 'ABG', el, right: starButton('calc:abg', 'calculator favorite'), footer, onUnmount: unsubscribeLabReview };
}
