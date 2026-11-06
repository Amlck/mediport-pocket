import { h, note } from '../lib/ui.js';
import { TONE, branches, chipRows, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Anemia helper and the electrolyte replacement screen (CALCULATOR_FORMULAS).

const source = (ctx, fn, cite) => sourceCard([
  `${cite} — portal-calculator-formulas.js :: ${fn}(); the desktop card renders the same object.`,
  `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
]);

const RPI_BRANCHES = [
  { id: 'inadequate', label: 'RPI < 2', rule: 'inadequate marrow response for the degree of anaemia' },
  { id: 'borderline', label: 'RPI 2–3', rule: 'borderline · interpret with trend and acuity' },
  { id: 'appropriate', label: 'RPI ≥ 3', rule: 'appropriate or brisk response · bleeding or haemolysis' },
];
const MCV_BRANCHES = [
  { id: 'microcytic', label: 'MCV < 80 fL', rule: 'iron deficiency, thalassaemia trait, chronic disease, sideroblastic' },
  { id: 'normocytic', label: 'MCV 80–100 fL', rule: 'use the RPI to separate hypoproliferation from loss/haemolysis' },
  { id: 'macrocytic', label: 'MCV > 100 fL', rule: 'B12/folate, liver, thyroid, alcohol, drugs, myelodysplasia' },
];

export const ANEMIA = {
  id: 'anemia',
  title: 'Anaemia helper',
  shortTitle: 'Anaemia',
  subtitle: 'RPI · MCV pattern · targeted labs · haemolysis · transfusion review',
  groups: [
    { title: 'CBC', fields: [
      { key: 'hemoglobin', label: 'Hgb', unit: 'g/dL', placeholder: '7.5', required: false, shared: 'hemoglobin' },
      { key: 'hematocrit', label: 'Hct', unit: '% · est. 3×Hgb', placeholder: '25', required: false, shared: 'hematocrit' },
      { key: 'reticPercent', label: 'Retic', unit: '%', placeholder: '5', required: false, shared: 'reticPercent' },
      { key: 'mcv', label: 'MCV', unit: 'fL', placeholder: '90', required: false, shared: 'mcv' },
    ] },
    { title: 'Iron studies · optional', fields: [
      { key: 'iron', label: 'Iron', unit: 'µg/dL', placeholder: '', required: false, shared: 'iron' },
      { key: 'tsat', label: 'TSAT', unit: '%', placeholder: '', required: false, shared: 'tsat' },
      { key: 'ferritin', label: 'Ferritin', unit: 'ng/mL', placeholder: '', required: false, shared: 'ferritin' },
    ] },
    { title: 'B12 / folate · optional', fields: [
      { key: 'b12', label: 'B12', unit: 'pg/mL', placeholder: '', required: false, shared: 'b12' },
      { key: 'folate', label: 'Folate', unit: 'ng/mL', placeholder: '', required: false, shared: 'folate' },
    ] },
    { title: 'Haemolysis labs · optional', fields: [
      { key: 'ldh', label: 'LDH', unit: 'U/L', placeholder: '', required: false, shared: 'ldh' },
      { key: 'totalBilirubin', label: 'Total bili', unit: 'mg/dL', placeholder: '', required: false, shared: 'totalBilirubin' },
      { key: 'haptoglobin', label: 'Haptoglobin', unit: 'mg/dL', placeholder: '', required: false, shared: 'haptoglobin' },
    ] },
  ],
  choices: [
    { key: 'sex', label: 'Reference Hct', options: [['M', 'Male · 45%'], ['F', 'Female · 42%']], initial: '', required: true, shared: 'sex' },
    { key: 'context', label: 'Clinical context', options: [['stable', 'Stable'], ['symptoms', 'Symptoms / bleeding'], ['cardiac', 'Cardiac ischaemia']], initial: '', required: true, shared: 'anemiaContext' },
  ],
  limits: { hemoglobin: { min: 1, max: 25 }, hematocrit: { min: 3, max: 75 }, reticPercent: { min: 0, max: 50 }, mcv: { min: 40, max: 160 }, iron: { min: 0, max: 1000 }, tsat: { min: 0, max: 100 }, ferritin: { min: 0, max: 100000 }, b12: { min: 0, max: 10000 }, folate: { min: 0, max: 100 }, ldh: { min: 0, max: 20000 }, totalBilirubin: { min: 0, max: 60 }, haptoglobin: { min: 0, max: 1000 } },
  action: 'Interpret',
  related: (r) => [
    ...(r.inputs.context === 'symptoms' || (r.inputs.hemoglobin !== null && r.inputs.hemoglobin < 7) ? [{ href: '#/guides/gi-bleed', label: 'Acute GI bleeding guide', why: 'if bleeding is the suspected source' }] : []),
    ...(r.inputs.context === 'cardiac' ? [{ href: '#/guides/acute-chest-pain-acs', label: 'Acute chest pain / ACS guide', why: 'anaemia with cardiac ischaemia' }] : []),
  ],
  emptyMessage: 'Enter at least Hgb, Hct, retic % or MCV.',
  footnote: 'Enter at least Hgb, Hct, retic or MCV. Prompts order the workup; they do not diagnose.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.anemiaHelper({ ...v, ...choices }),
  render: (r, ctx) => [
    resultsHead('Interpretation', r.severity),
    timeline(
      step(1, 'Reticulocyte production index', r.rpi === null ? '' : TONE[r.rpiRead === 'appropriate' ? 'success' : 'warn'], [
        formula(r.formula),
        r.rpi === null
          ? summary('Enter retic % plus Hct (or Hgb to estimate Hct) to calculate the RPI.')
          : values(`${r.inputs.reticPercent}% × (${r.hct} / ${r.normalHct}) = ${r.correctedRetic}% · / ${r.maturation} = RPI ${r.rpi}${r.hctEstimated ? ` · Hct estimated from Hgb` : ''}`),
        r.rpi === null ? null : branches(RPI_BRANCHES, r.rpiRead),
      ], { muted: r.rpi === null }),
      step(2, 'Red-cell size', r.mcvPattern === 'not-entered' ? '' : r.mcvPattern === 'normocytic' ? 'ok' : 'attention', [
        r.mcvPattern === 'not-entered' ? summary('MCV not entered.') : branches(MCV_BRANCHES, r.mcvPattern),
      ], { muted: r.mcvPattern === 'not-entered' }),
      step(3, 'Haemolysis clues', r.hemolysisClues.length >= 2 ? 'urgent' : r.hemolysisClues.length ? 'attention' : '', [
        summary(r.hemolysisClues.length ? `${r.hemolysisClues.join(', ')} — ${r.hemolysisClues.length >= 2 ? 'haemolysis-compatible: smear, DAT, haptoglobin trend, bilirubin fractionation' : 'partial clue: complete the haemolysis labs if clinically compatible'}.` : 'No haemolysis clue entered (LDH ≥ 600, bilirubin ≥ 2, haptoglobin < 30).'),
      ], { muted: !r.hemolysisClues.length })),
    conclusion(`${r.inputs.hemoglobin !== null ? `Hgb ${r.inputs.hemoglobin} · ` : ''}${r.mcvPattern !== 'not-entered' ? `${r.mcvPattern} · ` : ''}${r.rpi !== null ? `RPI ${r.rpi} ${r.rpiRead}` : 'RPI not calculated'}`),
    r.prompts.length ? h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Review prompts'), h('ul', { class: 'checks' }, r.prompts.map((p) => h('li', null, p)))) : null,
    r.transfusion.map((t) => note(r.severity === 'danger' ? 'urgent' : 'attention', t)),
    caveats(r.caveats),
    source(ctx, 'anemiaHelper', 'RPI after Hillman & Finch; restrictive threshold 7 g/dL after AABB 2023'),
  ],
};

const READ_LABEL = { 'severe-low': 'Severe low', low: 'Low', normal: 'Normal', high: 'High' };
const READ_TONE = { 'severe-low': 'urgent', low: 'attention', normal: 'ok', high: 'urgent' };

export const ELECTROLYTES = {
  id: 'electrolytes',
  title: 'Electrolyte replacement screen',
  shortTitle: 'Electrolytes',
  subtitle: 'K · Mg · phosphate bands · renal caution',
  groups: [
    { title: 'Serum', fields: [
      { key: 'potassium', label: 'K⁺', unit: 'mmol/L', placeholder: '3.2', required: false, shared: 'potassium' },
      { key: 'magnesium', label: 'Mg²⁺', unit: 'mg/dL', placeholder: '1.6', required: false, shared: 'magnesium' },
      { key: 'phosphate', label: 'Phosphate', unit: 'mg/dL', placeholder: '2.4', required: false, shared: 'phosphate' },
    ] },
    { title: 'Kidney · optional', fields: [
      { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73 m²', placeholder: '60', required: false, shared: 'egfr' },
    ] },
  ],
  limits: { potassium: { min: 1, max: 10 }, magnesium: { min: 0.1, max: 10 }, phosphate: { min: 0.1, max: 15 }, egfr: { min: 1, max: 200 } },
  action: 'Screen',
  related: (r) => {
    const read = (key) => r.items.find((i) => i.key === key)?.read;
    return [
      ...(read('potassium') === 'high' ? [{ href: '#/guides/hyperkalemia', label: 'Hyperkalaemia guide', why: 'K⁺ at or above 5.5' }] : []),
      ...(['low', 'severe-low'].includes(read('potassium')) ? [{ href: '#/guides/hypokalemia', label: 'Hypokalaemia guide', why: 'replacement by severity and route' }] : []),
      ...(['low', 'severe-low'].includes(read('magnesium')) ? [{ href: '#/guides/hypomagnesemia', label: 'Hypomagnesaemia guide', why: 'magnesium before or with potassium' }] : []),
      ...(['low', 'severe-low'].includes(read('potassium')) || ['low', 'severe-low'].includes(read('magnesium')) ? [{ href: '#/calc/qtc', label: 'Corrected QT', why: 'low K⁺ or Mg²⁺ prolongs the QT' }] : []),
    ];
  },
  emptyMessage: 'Enter at least one of K, Mg or phosphate.',
  footnote: 'Doses, routes and rates are in the hypokalaemia, hypomagnesaemia and hypophosphataemia guides.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.electrolyteScreen(v),
  render: (r, ctx) => [
    resultsHead('Screen', r.severity),
    timeline(
      step(1, 'Bands', TONE[r.severity], [
        chipRows(r.items.map((item) => ({ label: `${item.label} · ${item.value} ${item.unit}`, rule: item.note || 'within the screen’s reference band', chip: READ_LABEL[item.read], tone: READ_TONE[item.read] }))),
        formula('K < 3.0 severe · 3.0–3.4 low · ≥ 5.5 high · Mg < 1.2 severe · < 1.8 low · phosphate < 1.0 severe · < 2.0 low'),
      ]),
      step(2, 'Kidney function', r.renalCaution ? 'attention' : r.inputs.egfr === null ? '' : 'ok', [
        summary(r.renalCaution ? `eGFR ${r.inputs.egfr}: renal-adjusted replacement and repeat labs.` : r.inputs.egfr === null ? 'eGFR not entered.' : `eGFR ${r.inputs.egfr}: no renal adjustment flagged by the screen.`),
      ], { muted: r.inputs.egfr === null })),
    conclusion(r.notes.length ? r.items.filter((i) => i.read !== 'normal').map((i) => `${i.label} ${READ_LABEL[i.read].toLowerCase()}`).join(' · ') || 'renal caution only' : 'No replacement flag from the entered values'),
    caveats(r.caveats),
    source(ctx, 'electrolyteScreen', 'Screen bands as used by the desktop Calculator card'),
  ],
};
