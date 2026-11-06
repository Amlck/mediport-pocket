import { h } from '../lib/ui.js';
import { TONE, branches, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Kidney and sodium pages: FENa and FEUrea (CALCULATOR_FORMULAS), Na / free
// water and the hyponatremia helper (registry functions copied into
// shared/calculators.mjs as REGISTRY_CALCULATORS). The registry helpers return
// prose fields; the pages show them in steps and branch on the exact strings
// the registry emits, which the pack parity test pins.

const formulasSource = (ctx, fn, cite) => sourceCard([
  `${cite} — portal-calculator-formulas.js :: ${fn}().`,
  `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
]);
const registrySource = (ctx, fn) => sourceCard([
  `portal-calculator-registry.js :: ${fn}(), copied by function body; the desktop card calls the same function.`,
  `registry sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.registry.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
]);

const FE_BRANCHES = (unit, cut) => [
  { id: 'prerenal', label: `< ${cut[0]}${unit}`, rule: 'prerenal physiology · sodium/urea avidly retained' },
  { id: 'indeterminate', label: `${cut[0]}–${cut[1]}${unit}`, rule: 'indeterminate' },
  { id: 'intrinsic', label: `> ${cut[1]}${unit}`, rule: 'intrinsic (tubular) injury pattern' },
];

export const FENA = {
  id: 'fena',
  title: 'Fractional excretion of sodium',
  shortTitle: 'FENa',
  subtitle: 'Prerenal vs intrinsic AKI · not under diuretics',
  groups: [
    { title: 'Serum', fields: [
      { key: 'serumSodium', label: 'Serum Na', unit: 'mmol/L', placeholder: '140', shared: 'sodium' },
      { key: 'serumCreatinine', label: 'Serum Cr', unit: 'mg/dL', placeholder: '2.0', shared: 'creatinine' },
    ] },
    { title: 'Urine · same time', fields: [
      { key: 'urineSodium', label: 'Urine Na', unit: 'mmol/L', placeholder: '20', shared: 'urineSodium' },
      { key: 'urineCreatinine', label: 'Urine Cr', unit: 'mg/dL', placeholder: '100', shared: 'urineCreatinine' },
    ] },
  ],
  limits: { serumSodium: { min: 100, max: 200 }, serumCreatinine: { min: 0.1, max: 30 }, urineSodium: { min: 0.1, max: 400 }, urineCreatinine: { min: 0.1, max: 1000 } },
  footnote: 'Under loop or thiazide diuretics use FEUrea instead.',
  related: () => [
    { href: '#/guides/aki', label: 'Acute kidney injury guide', why: 'staging, escalation and referral' },
    { href: '#/calc/feurea', label: 'FEUrea', why: 'when the patient is on diuretics' },
  ],
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.fena(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(step(1, 'Fractional excretion', TONE[r.severity], [
      formula(r.formula),
      values(`(${r.inputs.urineSodium} × ${r.inputs.serumCreatinine}) / (${r.inputs.serumSodium} × ${r.inputs.urineCreatinine}) × 100 = ${r.fena}%`),
      branches(FE_BRANCHES('%', [1, 2]), r.read),
    ])),
    conclusion(`FENa ${r.fena}% · ${{ prerenal: 'prerenal pattern', indeterminate: 'indeterminate', intrinsic: 'intrinsic renal pattern' }[r.read]}`),
    caveats(r.caveats),
    formulasSource(ctx, 'fena', 'Espinel 1976; Miller 1978'),
  ],
};

export const FEUREA = {
  id: 'feurea',
  title: 'Fractional excretion of urea',
  shortTitle: 'FEUrea',
  subtitle: 'Prerenal vs intrinsic AKI · valid under diuretics',
  groups: [
    { title: 'Serum', fields: [
      { key: 'serumUrea', label: 'Serum urea / BUN', unit: 'mg/dL · same analyte as urine', placeholder: '40', shared: 'serumUrea' },
      { key: 'serumCreatinine', label: 'Serum Cr', unit: 'mg/dL', placeholder: '2.0', shared: 'creatinine' },
    ] },
    { title: 'Urine · same time', fields: [
      { key: 'urineUrea', label: 'Urine urea / BUN', unit: 'mg/dL · same analyte as serum', placeholder: '300', shared: 'urineUrea' },
      { key: 'urineCreatinine', label: 'Urine Cr', unit: 'mg/dL', placeholder: '60', shared: 'urineCreatinine' },
    ] },
  ],
  choices: [{ key: 'ureaBasis', label: 'Paired analyte and units', options: [['bun', 'Both BUN in mg/dL'], ['urea', 'Both urea in mg/dL']], initial: '', required: true, shared: 'ureaBasis', hint: 'Choose the analyte reported for both samples. Changing this choice does not convert either value; verify both entries.' }],
  limits: { serumUrea: { min: 0.1, max: 500 }, serumCreatinine: { min: 0.1, max: 30 }, urineUrea: { min: 0.1, max: 5000 }, urineCreatinine: { min: 0.1, max: 1000 } },
  footnote: 'Enter serum and urine urea in the same unit (both urea or both BUN); the ratio cancels it.',
  related: () => [{ href: '#/guides/aki', label: 'Acute kidney injury guide', why: 'staging, escalation and referral' }],
  compute: (v, choices, engines) => {
    const result = engines.CALCULATOR_FORMULAS.feUrea(v);
    return result && { ...result, ureaBasis: choices.ureaBasis };
  },
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(step(1, 'Fractional excretion', TONE[r.severity], [
      formula(r.formula),
      summary(`Confirmed paired analyte: ${r.ureaBasis === 'bun' ? 'BUN' : 'urea'}, both in mg/dL. No unit conversion is performed.`),
      values(`(${r.inputs.urineUrea} × ${r.inputs.serumCreatinine}) / (${r.inputs.serumUrea} × ${r.inputs.urineCreatinine}) × 100 = ${r.feUrea}%`),
      branches(FE_BRANCHES('%', [35, 50]), r.read),
    ])),
    conclusion(`FEUrea ${r.feUrea}% · ${{ prerenal: 'prerenal pattern', indeterminate: 'indeterminate', intrinsic: 'tubular injury pattern' }[r.read]}`),
    caveats(r.caveats),
    formulasSource(ctx, 'feUrea', 'Carvounis 2002'),
  ],
};

const SEX = [['M', 'Male'], ['F', 'Female']];
const NA_SEVERITY_LABEL = { danger: 'Marked derangement', warn: 'Abnormal', success: 'Within reference' };

export const SODIUM_FREE_WATER = {
  id: 'na-free-water',
  title: 'Corrected sodium and free-water deficit',
  shortTitle: 'Na / free water',
  subtitle: 'Glucose correction · effective osmolality · deficit to target',
  groups: [
    { title: 'Serum', fields: [
      { key: 'sodium', label: 'Na⁺', unit: 'mmol/L', placeholder: '150', shared: 'sodium' },
      { key: 'glucose', label: 'Glucose', unit: 'mg/dL · optional', placeholder: '100', required: false, shared: 'glucose' },
    ] },
    { title: 'Deficit · optional', fields: [
      { key: 'weightKg', label: 'Weight', unit: 'kg', placeholder: '70', required: false, shared: 'weightKg' },
      { key: 'targetSodium', label: 'Target Na', unit: 'mmol/L · default 145', placeholder: '145', required: false },
    ] },
  ],
  choices: [{ key: 'sex', label: 'Sex (total body water factor)', options: SEX, initial: 'M', required: true, shared: 'sex' }],
  related: (r) => [
    ...(r.correctedSodium >= 150 ? [{ href: '#/guides/hypernatremia', label: 'Hypernatraemia guide', why: 'corrected Na at or above 150' }] : []),
    ...(r.correctedSodium < 135 ? [{ href: '#/calc/hyponatremia', label: 'Hyponatraemia helper', why: 'tonicity and urine pattern' }, { href: '#/guides/hyponatremia', label: 'Hyponatraemia guide', why: 'staged management' }] : []),
  ],
  limits: { sodium: { min: 100, max: 200 }, glucose: { min: 0, max: 3000 }, weightKg: { min: 20, max: 350 }, targetSodium: { min: 120, max: 160 } },
  footnote: 'Deficit needs a weight and a corrected Na above target. Rate limits and ongoing losses are clinical decisions.',
  compute: (v, choices, engines) => engines.REGISTRY_CALCULATORS.sodiumFreeWater({ sodium: v.sodium, glucose: v.glucose, weightKg: v.weightKg, sex: choices.sex, targetSodium: v.targetSodium ?? 145 }),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Glucose-corrected sodium', TONE[r.severity], [
        formula('corrected Na = measured Na + 1.6 × (glucose − 100) / 100 [glucose > 100] · effective osm = 2 × Na + glucose / 18'),
        values(`${r.measuredSodium} + ${Math.round(r.glucoseCorrection * 10) / 10} = ${Math.round(r.correctedSodium * 10) / 10} mmol/L · effective osm ${Math.round(r.effectiveOsmolality)}`),
        branches([
          { id: 'danger', label: 'Na < 125 or ≥ 160', rule: 'marked derangement' },
          { id: 'warn', label: 'Na 125–129 or 150–159', rule: 'abnormal' },
          { id: 'success', label: 'Na 130–149', rule: 'within the helper’s reference band' },
        ], r.severity),
      ]),
      step(2, 'Free-water deficit', r.deficitLiters === null ? '' : 'attention', [
        formula('deficit (L) = TBW factor × weight × (corrected Na / target − 1) · TBW 0.6 men, 0.5 women'),
        r.deficitLiters === null
          ? summary(r.correctedSodium > r.targetSodium ? 'Enter weight to estimate the deficit.' : `Corrected Na is not above the target of ${r.targetSodium}; no free-water deficit to estimate.`)
          : values(`${r.tbwFactor} × weight × (${Math.round(r.correctedSodium * 10) / 10} / ${r.targetSodium} − 1) = ${Math.round(r.deficitLiters * 10) / 10} L`),
      ], { muted: r.deficitLiters === null })),
    conclusion(`Corrected Na ${Math.round(r.correctedSodium * 10) / 10} mmol/L${r.deficitLiters !== null ? ` · deficit ${Math.round(r.deficitLiters * 10) / 10} L to ${r.targetSodium}` : ''} · ${NA_SEVERITY_LABEL[r.severity]}`),
    caveats([
      'The deficit is a starting estimate of total-body water loss; it says nothing about the rate. Chronic hypernatraemia is corrected slowly (commonly ≤ 10–12 mmol/L per 24 h) with ongoing losses added.',
      'Glucose correction uses 1.6 mmol/L per 100 mg/dL above 100; some use 2.4 at glucose > 400 mg/dL.',
    ]),
    registrySource(ctx, 'sodiumFreeWater'),
  ],
};

const VOLUME = [['unknown', 'Not clear'], ['hypovolemic', 'Hypovolaemic'], ['euvolemic', 'Euvolaemic'], ['hypervolemic', 'Hypervolaemic']];
const CHRONICITY = [['unknown', 'Unknown / chronic'], ['acute', 'Acute (< 48 h)'], ['chronic', 'Chronic (≥ 48 h)']];
const SYMPTOMS = [['none', 'None / mild'], ['moderate', 'Moderate'], ['severe', 'Seizure / coma / severe']];
const ODS = [['standard', 'Standard'], ['high', 'High risk']];
const TONICITY_BRANCHES = [
  { id: 'Hypotonic hyponatremia likely', label: 'Osm < 275', rule: 'hypotonic hyponatraemia' },
  { id: 'Isotonic or non-hypotonic pattern', label: 'Osm 275–294', rule: 'isotonic / pseudohyponatraemia' },
  { id: 'Hypertonic / translocational pattern', label: 'Osm ≥ 295', rule: 'hypertonic / translocational' },
];

export const HYPONATREMIA = {
  id: 'hyponatremia',
  title: 'Hyponatraemia helper',
  shortTitle: 'Hyponatraemia',
  subtitle: 'Tonicity · urine pattern · correction guardrail',
  groups: [
    { title: 'Serum', fields: [
      { key: 'sodium', label: 'Na⁺', unit: 'mmol/L', placeholder: '125', shared: 'sodium' },
      { key: 'glucose', label: 'Glucose', unit: 'mg/dL · optional', placeholder: '100', required: false, shared: 'glucose' },
      { key: 'serumOsmolality', label: 'Serum osm', unit: 'mOsm/kg · optional', placeholder: '260', required: false, shared: 'serumOsmolality' },
    ] },
    { title: 'Urine · optional', fields: [
      { key: 'urineOsmolality', label: 'Urine osm', unit: 'mOsm/kg', placeholder: '400', required: false },
      { key: 'urineSodium', label: 'Urine Na', unit: 'mmol/L', placeholder: '40', required: false, shared: 'urineSodium' },
    ] },
  ],
  choices: [
    { key: 'volumeStatus', label: 'Volume status', options: VOLUME, initial: 'unknown', required: true },
    { key: 'chronicity', label: 'Chronicity', options: CHRONICITY, initial: 'unknown', required: true },
    { key: 'symptoms', label: 'Symptoms', options: SYMPTOMS, initial: 'none', required: true },
    { key: 'odsRisk', label: 'Osmotic demyelination risk', options: ODS, initial: 'standard', required: true },
  ],
  limits: { sodium: { min: 100, max: 160 }, glucose: { min: 0, max: 3000 }, serumOsmolality: { min: 150, max: 450 }, urineOsmolality: { min: 10, max: 1500 }, urineSodium: { min: 0, max: 400 } },
  action: 'Interpret',
  related: () => [
    { href: '#/guides/hyponatremia', label: 'Hyponatraemia guide', why: 'staged management and correction limits' },
    { href: '#/calc/na-free-water', label: 'Corrected Na / free water', why: 'glucose correction and effective osmolality' },
  ],
  footnote: 'High ODS risk: Na ≤ 105, hypokalaemia, alcohol use disorder, malnutrition, advanced liver disease.',
  compute: (v, choices, engines) => engines.REGISTRY_CALCULATORS.hyponatremia({ ...v, ...choices }),
  render: (r, ctx) => [
    resultsHead('Interpretation', r.severity),
    timeline(
      step(1, 'Tonicity', TONE[r.severity], [
        values(`Corrected Na ${Math.round(r.correctedSodium * 10) / 10} mmol/L · ${r.toneDetail}`),
        branches(TONICITY_BRANCHES, r.tonicity),
      ]),
      step(2, 'Urine', r.urineOsmolality === null && r.urineSodium === null ? '' : 'attention', [
        summary(`${r.urineOsmText}.`),
        summary(`${r.urineNaText}.`),
      ], { muted: r.urineOsmolality === null && r.urineSodium === null }),
      step(3, 'Likely pattern', TONE[r.severity], [summary(r.likely)]),
      step(4, 'Correction guardrail', r.severity === 'danger' ? 'urgent' : 'attention', [summary(r.correctionText)])),
    conclusion(r.tonicity),
    r.nextChecks.length ? h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Next checks'), h('ul', { class: 'checks' }, r.nextChecks.map((c) => h('li', null, c)))) : null,
    caveats([
      'The helper orders the workup; it does not choose a therapy. Severe symptoms need the hypertonic saline protocol regardless of the pattern.',
      'Urine studies before any saline or diuretic; a spot urine Na is uninterpretable after diuretics.',
    ]),
    registrySource(ctx, 'hyponatremia'),
  ],
};
