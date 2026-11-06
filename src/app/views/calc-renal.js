import { h, note } from '../lib/ui.js';
import { TONE, branches, chipRows, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Kidney-function pages. eGFR maps CALCULATOR_FORMULAS.egfrCkdEpi2021; CrCl maps
// the provenance-aware COCKCROFT_GAULT estimator (the same module the desktop
// Calculator card and renal dosing use). Codes in, branches out.

const SEX = [['M', 'Male'], ['F', 'Female']];

function stageBranches(stages) {
  return stages.map((s) => ({
    id: s.code,
    label: `${s.code} · ${s.label}`,
    rule: s.max === null ? `≥ ${s.min}` : s.min === 0 ? `< ${s.max}` : `${s.min}–${s.max - 1}`,
  }));
}

export const EGFR = {
  id: 'egfr',
  title: 'eGFR (CKD-EPI 2021)',
  shortTitle: 'eGFR',
  subtitle: 'Race-free creatinine equation · KDIGO G category',
  groups: [{ title: 'Serum creatinine and age', fields: [
    { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', placeholder: '1.0', shared: 'creatinine' },
    { key: 'age', label: 'Age', unit: 'years', placeholder: '60', inputmode: 'numeric', shared: 'age' },
  ] }],
  choices: [{ key: 'sex', label: 'Sex (equation coefficient)', options: SEX, initial: '', required: true, shared: 'sex' }],
  publish: (r) => ({ egfr: r.egfr }),
  related: (r) => [
    { href: '#/calc/crcl', label: 'Cockcroft-Gault CrCl', why: 'drug tables that specify creatinine clearance' },
    ...(r.stage.min < 45 ? [{ href: '#/calc/electrolytes', label: 'Electrolyte screen', why: 'potassium and phosphate accumulate as GFR falls' }] : []),
    { href: '#/guides/aki', label: 'Acute kidney injury guide', why: 'if the creatinine is new or rising rather than chronic' },
  ],
  limits: { creatinine: { min: 0.1, max: 30 }, age: { min: 18, max: 120 } },
  footnote: 'Indexed to 1.73 m². For drug tables that specify creatinine clearance use the Cockcroft-Gault page.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.egfrCkdEpi2021({ creatinine: v.creatinine, age: v.age, sex: choices.sex }),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Equation', TONE[r.severity], [
        formula(r.formula),
        values(`κ ${r.kappa} · α ${r.alpha} · sex factor ${r.sexFactor} · Scr ${r.inputs.creatinine} · age ${r.inputs.age}`),
        summary(`Scr/κ = ${(r.inputs.creatinine / r.kappa).toFixed(2)} → the ${r.inputs.creatinine / r.kappa < 1 ? 'min' : 'max'} term carries the exponent.`),
      ]),
      step(2, 'GFR category (KDIGO)', TONE[r.severity], [
        values(`eGFR ${r.egfr} ${r.unit}`),
        branches(stageBranches(r.stages), r.stage.code),
      ])),
    conclusion(`eGFR ${r.egfr} ${r.unit} · ${r.stage.code} ${r.stage.label}`),
    caveats(r.caveats),
    sourceCard([
      'CKD-EPI 2021 creatinine equation (Inker et al., NEJM 2021) and KDIGO 2012 G categories, from portal-calculator-formulas.js :: egfrCkdEpi2021().',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};

const WEIGHT_METHODS = [['actual', 'Actual'], ['ideal', 'Ideal'], ['adjusted', 'Adjusted']];
const METHOD_RULE = {
  actual: 'measured weight as entered',
  ideal: 'Devine IBW from height and sex',
  adjusted: 'IBW + 0.4 × (actual − IBW) · when actual > IBW',
};

// The estimator wants provenance-tagged facts; a manual Pocket entry is a
// confirmed manual fact observed now, exactly as the desktop Calculator card sends it.
function fact(value, unit) {
  const observedAt = new Date().toISOString();
  return { value, unit, source: 'Manual Pocket entry', observedAt, confirmed: true };
}

function issueList(items, tone) {
  return items.length ? items.map((item) => note(tone, item.message)) : null;
}

export const CRCL = {
  id: 'crcl',
  title: 'Creatinine clearance (Cockcroft-Gault)',
  shortTitle: 'CrCl',
  subtitle: 'Dosing-weight method · alternatives · dose-band cutoffs',
  groups: [
    { title: 'Patient', fields: [
      { key: 'age', label: 'Age', unit: 'years', placeholder: '65', inputmode: 'numeric', shared: 'age' },
      { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', placeholder: '1.2', shared: 'creatinine' },
    ] },
    { title: 'Weight and height', fields: [
      { key: 'weight', label: 'Actual weight', unit: 'kg', placeholder: '70', shared: 'weightKg' },
      { key: 'height', label: 'Height', unit: 'cm · optional', placeholder: '170', required: false, shared: 'heightCm' },
    ] },
  ],
  choices: [
    { key: 'sex', label: 'Sex (formula coefficient)', options: SEX, initial: '', required: true, shared: 'sex' },
    { key: 'method', label: 'Dosing weight', options: WEIGHT_METHODS, initial: 'actual', required: true },
  ],
  publish: (r) => (r.estimate ? { crcl: r.estimate.value } : {}),
  related: (r) => [
    ...(r.estimate ? [{ href: '#/drugs', label: 'Drug reference', why: `renal tables now highlight the row for CrCl ${r.estimate.value} mL/min` }] : []),
    { href: '#/calc/egfr', label: 'eGFR (CKD-EPI 2021)', why: 'for CKD staging rather than drug dosing' },
  ],
  limits: { age: { min: 18, max: 120 }, creatinine: { min: 0.1, max: 30 }, weight: { min: 20, max: 350 }, height: { min: 100, max: 250 } },
  action: 'Estimate',
  footnote: 'Ideal and adjusted weight need height. The estimate is for drug tables that specify Cockcroft-Gault; do not substitute eGFR.',
  compute: (v, choices, engines) => engines.COCKCROFT_GAULT.calculate({
    referenceTime: new Date().toISOString(),
    age: fact(v.age, 'years'),
    formulaSex: { ...fact(choices.sex, null), source: 'Manual Pocket formula coefficient' },
    serumCreatinine: fact(v.creatinine, 'mg/dL'),
    height: v.height === null ? undefined : fact(v.height, 'cm'),
    weights: [{ id: 'pocket-actual', method: 'actual', ...fact(v.weight, 'kg') }],
    weightMethod: choices.method,
    doseBandCutoffs: [15, 30, 50],
    context: {},
  }),
  render: (r, ctx) => {
    const est = r.estimate;
    const severity = !est ? 'warn' : est.value >= 60 ? 'success' : est.value >= 30 ? 'warn' : 'danger';
    const alternatives = r.alternatives.map((a) => ({ id: a.method, label: `${a.methodLabel.replace(/ \(.*\)$/, '')} · ${a.weightKg} kg`, rule: `${a.value} mL/min` }));
    const selected = r.alternatives.find((a) => a.selected);
    const cutoffs = r.cutoffAssessment || [];
    return [
      resultsHead(r.status === 'blocked' ? 'Blocked' : 'Estimate', severity),
      issueList(r.blockers, 'urgent'),
      est ? timeline(
        step(1, 'Equation', TONE[severity], [
          formula(r.formula.equation),
          values(`(140 − ${r.inputs.age.value}) × ${est.weightKg} kg / (72 × ${r.inputs.serumCreatinine.value})${/^f/i.test(String(r.inputs.formulaSex.value)) ? ' × 0.85' : ''} = ${est.value} mL/min`),
          summary(`Dosing weight: ${est.weightMethodLabel}.`),
        ]),
        step(2, 'Weight method', TONE[severity], [
          branches(alternatives.length ? alternatives : [{ id: est.weightMethod, label: est.weightMethodLabel, rule: `${est.value} mL/min` }], selected ? selected.method : est.weightMethod),
          r.range && r.range.min !== r.range.max ? summary(`Plausible methods span ${r.range.min}–${r.range.max} mL/min. ${METHOD_RULE[est.weightMethod]}.`) : summary(`Enter height to compare ideal and adjusted weight. ${METHOD_RULE[est.weightMethod]}.`),
        ]),
        step(3, 'Dose-band cutoffs', cutoffs.some((c) => c.straddledByAlternatives) ? 'urgent' : cutoffs.some((c) => c.near) ? 'attention' : 'ok', [
          chipRows(cutoffs.map((c) => ({
            label: `${c.cutoff} mL/min`,
            rule: c.straddledByAlternatives ? 'weight methods fall on both sides of this boundary' : c.near ? `nearest estimate within ${c.nearestDistance} mL/min` : 'all estimates clear of this boundary',
            chip: c.straddledByAlternatives ? 'Crosses' : c.near ? 'Near' : 'Clear',
            tone: c.straddledByAlternatives ? 'urgent' : c.near ? 'attention' : 'ok',
          }))),
          summary('Common renal-dosing table boundaries; confirm the exact boundary in the drug-specific table.'),
        ])) : null,
      est ? conclusion(`CrCl ${est.value} mL/min · ${est.weightMethodLabel.replace(/ \(.*\)$/, '')}${r.status === 'review-required' ? ' · review required' : ''}`) : null,
      issueList(r.reviews, 'attention'),
      issueList(r.warnings, 'plain'),
      caveats([r.boundary, r.formula.interpretationSource.note]),
      sourceCard([
        `${r.formula.label} (${r.formula.source.authors}, ${r.formula.source.year}) from portal-cockcroft-gault.js :: calculate(), engine ${r.engineVersion}.`,
        `cockcroft-gault sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.cockcroftGault.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
      ]),
    ];
  },
};
