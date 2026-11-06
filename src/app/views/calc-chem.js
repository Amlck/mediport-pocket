import { TONE, branches, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Chemistry pages: anion gap (same codes as the ABG page's anion-gap step, from
// CALCULATOR_FORMULAS.anionGap) and albumin-corrected calcium.

const GAP_BRANCHES = [
  { id: 'normal', label: 'Corrected AG ≤ 12', rule: 'normal anion gap' },
  { id: 'high', label: 'Corrected AG > 12', rule: 'high anion gap' },
];
const DELTA_BRANCHES = [
  { id: 'normal-gap-predominant', label: 'Ratio < 0.4', rule: 'predominant normal-gap component' },
  { id: 'mixed-high-and-normal-gap', label: 'Ratio 0.4–1', rule: 'mixed high-gap + normal-gap' },
  { id: 'high-gap', label: 'Ratio 1–2', rule: 'pure high anion gap acidosis' },
  { id: 'high-gap-plus-alkalosis', label: 'Ratio > 2', rule: 'high-gap acidosis + metabolic alkalosis' },
];
const PATTERN_TEXT = {
  normal: 'Normal anion gap with bicarbonate ≥ 22: no gap acidosis suggested by the chemistry alone.',
  'normal-gap': 'Normal-gap (hyperchloraemic) metabolic acidosis: think diarrhoea, renal tubular acidosis, saline load, acetazolamide, ureteral diversion. The urine anion gap workup on the ABG page separates renal from GI causes.',
  'elevated-without-acidosis': 'Elevated anion gap with bicarbonate ≥ 24: no concurrent metabolic acidosis to compute a delta ratio against; review lactate, ketones, renal function, toxins and the albumin correction.',
  'normal-gap-predominant': 'The bicarbonate fall is out of proportion to the small gap rise: predominant normal-gap component.',
  'mixed-high-and-normal-gap': 'Mixed high-gap and normal-gap metabolic acidosis pattern.',
  'high-gap': 'High anion gap metabolic acidosis pattern: lactate, ketones, uraemia, toxic alcohols, salicylate, medications.',
  'high-gap-plus-alkalosis': 'High-gap acidosis plus a metabolic alkalosis or a chronically raised bicarbonate.',
};
const PATTERN_SHORT = {
  normal: 'normal anion gap', 'normal-gap': 'NAGMA', 'elevated-without-acidosis': 'elevated AG without acidosis',
  'normal-gap-predominant': 'predominant NAGMA', 'mixed-high-and-normal-gap': 'HAGMA + NAGMA', 'high-gap': 'HAGMA', 'high-gap-plus-alkalosis': 'HAGMA + metabolic alkalosis',
};

export const ANION_GAP = {
  id: 'ag',
  title: 'Anion gap and delta ratio',
  shortTitle: 'Anion gap',
  subtitle: 'Albumin-corrected gap · Δ ratio pattern',
  groups: [
    { title: 'Chemistry', fields: [
      { key: 'sodium', label: 'Na⁺', unit: 'mmol/L', placeholder: '140', shared: 'sodium' },
      { key: 'chloride', label: 'Cl⁻', unit: 'mmol/L', placeholder: '104', shared: 'chloride' },
      { key: 'bicarbonate', label: 'HCO₃⁻', unit: 'mmol/L', placeholder: '24', shared: 'bicarbonate' },
    ] },
    { title: 'Albumin · optional', fields: [
      { key: 'albumin', label: 'Albumin', unit: 'g/dL · default 4.0', placeholder: '4.0', required: false, shared: 'albumin' },
    ] },
  ],
  related: (r) => [
    ...(['high-gap', 'mixed-high-and-normal-gap', 'high-gap-plus-alkalosis'].includes(r.pattern) ? [{ href: '#/guides/dka-hhs', label: 'DKA / HHS guide', why: 'ketoacidosis is one cause of a high-gap acidosis' }] : []),
    { href: '#/calc/abg', label: 'ABG interpretation', why: r.pattern === 'normal-gap' || r.pattern === 'normal-gap-predominant' ? 'urine anion gap workup for a normal-gap acidosis' : 'pH, compensation and the osmolar-gap workup' },
  ],
  limits: { sodium: { min: 1, max: 300 }, chloride: { min: 1, max: 300 }, bicarbonate: { min: 0.1, max: 150 }, albumin: { min: 0.1, max: 10 } },
  footnote: 'Same conventions as the ABG page: expected gap 12, +2.5 per g/dL of albumin below 4.0. Pair with a blood gas for pH and compensation.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.anionGap(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Anion gap', r.gapRead === 'high' ? 'attention' : 'ok', [
        formula('AG = Na⁺ − (Cl⁻ + HCO₃⁻) · corrected AG = AG + 2.5 × (4.0 − albumin)'),
        values(`${r.inputs.sodium} − (${r.inputs.chloride} + ${r.inputs.bicarbonate}) = ${r.ag} · corrected ${r.correctedAg} (albumin ${r.inputs.albumin}${r.albuminAssumed ? ' assumed' : ''})`),
        branches(GAP_BRANCHES, r.gapRead),
      ]),
      r.deltaRatio !== null
        ? step(2, 'Delta ratio', TONE[r.severity], [
          formula('Δ ratio = (corrected AG − 12) / (24 − HCO₃⁻)'),
          values(`(${r.correctedAg} − 12) / (24 − ${r.inputs.bicarbonate}) = ${r.deltaGap} / ${r.deltaBicarbonate} = ${r.deltaRatio}`),
          branches(DELTA_BRANCHES, r.pattern),
        ])
        : step(2, 'Delta ratio', TONE[r.severity], [summary(PATTERN_TEXT[r.pattern])], { muted: r.pattern === 'normal' })),
    conclusion(PATTERN_SHORT[r.pattern] || r.pattern),
    r.deltaRatio !== null ? summary(PATTERN_TEXT[r.pattern]) : null,
    caveats(r.caveats),
    sourceCard([
      'portal-calculator-formulas.js :: anionGap(), mirroring the anion-gap step of interpretABG in the calculator registry (Figge 1998 albumin correction; delta-ratio bands after Berend 2014).',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};

const CA_BRANCHES = [
  { id: 'low', label: 'Corrected Ca < 8.5', rule: 'hypocalcaemia range' },
  { id: 'normal', label: '8.5 – 10.5 mg/dL', rule: 'reference range' },
  { id: 'high', label: 'Corrected Ca > 10.5', rule: 'hypercalcaemia range' },
];

export const CORRECTED_CALCIUM = {
  id: 'ca',
  title: 'Albumin-corrected calcium',
  shortTitle: 'Corrected Ca',
  subtitle: 'Payne correction · reference 8.5–10.5 mg/dL',
  groups: [{ title: 'Serum values', fields: [
    { key: 'calcium', label: 'Total Ca', unit: 'mg/dL', placeholder: '8.0', shared: 'calcium' },
    { key: 'albumin', label: 'Albumin', unit: 'g/dL', placeholder: '2.5', shared: 'albumin' },
  ] }],
  related: (r) => [
    ...(r.read === 'low' ? [{ href: '#/guides/hypocalcemia', label: 'Acute hypocalcaemia guide', why: 'corrected calcium below 8.5' }] : []),
    ...(r.read === 'high' ? [{ href: '#/guides/hypercalcemia', label: 'Acute hypercalcaemia guide', why: 'corrected calcium above 10.5' }] : []),
  ],
  limits: { calcium: { min: 1, max: 25 }, albumin: { min: 0.1, max: 10 } },
  footnote: 'mg/dL and g/dL. Ionised calcium is the reference when it matters clinically.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.correctedCalcium(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(step(1, 'Correction', TONE[r.severity], [
      formula(r.formula),
      values(`${r.inputs.calcium} + 0.8 × (4.0 − ${r.inputs.albumin}) = ${r.inputs.calcium} ${r.correction >= 0 ? '+' : '−'} ${Math.abs(r.correction)} = ${r.corrected} mg/dL`),
      branches(CA_BRANCHES, r.read),
    ])),
    conclusion(`Corrected Ca ${r.corrected} mg/dL · ${r.read === 'normal' ? 'within reference' : r.read === 'low' ? 'low' : 'high'}`),
    caveats(r.caveats),
    sourceCard([
      'portal-calculator-formulas.js :: correctedCalcium() (Payne et al., BMJ 1973).',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};
