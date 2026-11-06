import { TONE, branches, chipRows, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// NEWS2 (per-parameter points from CALCULATOR_FORMULAS.news2) and QTc.

const POINT_TONE = { 0: 'ok', 1: '', 2: 'attention', 3: 'urgent' };

function pointsList(items) {
  return chipRows(items.map((item) => ({
    label: `${item.label} · ${item.unit ? `${item.value} ${item.unit}` : item.value === 'cvpu' ? 'CVPU' : item.value === 'yes' ? 'supplemental O₂' : item.value}`,
    rule: item.scale,
    chip: `${item.points} pt${item.points === 1 ? '' : 's'}`,
    tone: POINT_TONE[item.points] || '',
  })));
}

export const NEWS2 = {
  id: 'news2',
  title: 'NEWS2',
  subtitle: 'Per-parameter points · aggregate band · response',
  groups: [
    { title: 'Observations', fields: [
      { key: 'respiratoryRate', label: 'Resp. rate', unit: '/min', placeholder: '18', inputmode: 'numeric', shared: 'respiratoryRate' },
      { key: 'spo2', label: 'SpO₂', unit: '%', placeholder: '96', inputmode: 'numeric', shared: 'spo2' },
      { key: 'temperature', label: 'Temp', unit: '°C', placeholder: '37.0', shared: 'temperature' },
      { key: 'systolicBp', label: 'Systolic BP', unit: 'mmHg', placeholder: '120', inputmode: 'numeric', shared: 'systolicBp' },
      { key: 'heartRate', label: 'Pulse', unit: '/min', placeholder: '80', inputmode: 'numeric', shared: 'heartRate' },
    ] },
  ],
  choices: [
    { key: 'supplementalOxygen', label: 'Air or oxygen', options: [['no', 'Room air'], ['yes', 'Supplemental O₂']], initial: 'no', required: true },
    { key: 'consciousness', label: 'Consciousness', options: [['alert', 'Alert'], ['cvpu', 'Confusion / V / P / U']], initial: 'alert', required: true },
  ],
  limits: { respiratoryRate: { min: 1, max: 80 }, spo2: { min: 40, max: 100 }, temperature: { min: 25, max: 45 }, systolicBp: { min: 30, max: 300 }, heartRate: { min: 10, max: 300 } },
  action: 'Score',
  related: (r) => [
    ...(r.band !== 'low' ? [{ href: '#/guides/sepsis-septic-shock', label: 'Sepsis / septic shock guide', why: `NEWS2 ${r.total}: assess infection likelihood and organ dysfunction` }] : []),
    { href: '#/calc/qsofa', label: 'qSOFA', why: 'bedside prompt for organ dysfunction' },
    ...(r.band === 'high' || r.band === 'medium' ? [{ href: '#/calc/sofa', label: 'SOFA', why: 'quantify organ dysfunction' }] : []),
  ],
  footnote: 'SpO₂ Scale 1. A single parameter scoring 3 raises the response to low–medium even at a low aggregate.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.news2({ ...v, ...choices }),
  render: (r, ctx) => [
    resultsHead(`NEWS2 ${r.total}`, r.severity),
    timeline(
      step(1, 'Parameter points', r.singleParameterThree ? 'urgent' : r.total ? 'attention' : 'ok', [pointsList(r.items)]),
      step(2, 'Aggregate and clinical response', TONE[r.severity], [
        values(`Aggregate ${r.total}${r.singleParameterThree ? ' · a single parameter scores 3' : ''}`),
        branches(r.bands.map((b) => ({ id: b.code, label: `${b.label} · ${b.rule}`, rule: b.response })), r.band),
      ])),
    conclusion(`NEWS2 ${r.total} · ${r.bandLabel}`),
    summary(r.response),
    caveats(r.caveats),
    sourceCard([
      'Royal College of Physicians, National Early Warning Score 2 (2017), Scale 1 — portal-calculator-formulas.js :: news2(); totals are tested equal to the registry scorer the sepsis pathway uses.',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};

const FORMULA_BRANCHES = [
  { id: 'bazett', label: 'Bazett read', rule: 'heart rate 60–100/min' },
  { id: 'fridericia', label: 'Fridericia read', rule: 'heart rate < 60 or > 100/min' },
];
function readBranches(r) {
  const t = r.threshold;
  const list = [
    { id: 'normal', label: `Below ${t} ms`, rule: r.inputs.sex ? 'within the sex-specific limit' : 'below the female limit' },
    { id: 'prolonged', label: `${t}–499 ms`, rule: `prolonged (≥ ${t} ms ${r.inputs.sex === 'M' ? 'men' : 'women'})` },
    { id: 'markedly-prolonged', label: '≥ 500 ms', rule: 'markedly prolonged · torsades risk' },
  ];
  if (!r.inputs.sex) list.splice(1, 0, { id: 'prolonged-if-male', label: '450–459 ms', rule: 'prolonged for a man · sex not entered' });
  return list;
}
const READ_TEXT = { normal: 'within limits', 'prolonged-if-male': 'prolonged if male', prolonged: 'prolonged', 'markedly-prolonged': 'markedly prolonged' };

export const QTC = {
  id: 'qtc',
  title: 'Corrected QT',
  shortTitle: 'QTc',
  subtitle: 'Bazett and Fridericia · sex-specific limits',
  groups: [{ title: 'ECG', fields: [
    { key: 'qtMs', label: 'QT', unit: 'ms', placeholder: '400', inputmode: 'numeric', shared: 'qtMs' },
    { key: 'heartRate', label: 'Heart rate', unit: '/min', placeholder: '70', inputmode: 'numeric', shared: 'heartRate' },
  ] }],
  choices: [{ key: 'sex', label: 'Sex (threshold)', options: [['', 'Not entered'], ['M', 'Male'], ['F', 'Female']], initial: '', shared: 'sex' }],
  related: (r) => [
    ...(r.read !== 'normal' ? [
      { href: '#/calc/electrolytes', label: 'Electrolyte screen', why: 'potassium and magnesium prolong the QT' },
      { href: '#/guides/hypokalemia', label: 'Hypokalaemia guide', why: 'replete K⁺ above 4 mmol/L when the QTc is long' },
      { href: '#/guides/hypomagnesemia', label: 'Hypomagnesaemia guide', why: 'magnesium for torsades risk' },
    ] : []),
    ...(r.inputs.heartRate > 100 ? [{ href: '#/guides/tachycardia-with-pulse', label: 'Tachycardia with a pulse', why: 'rate above 100' }] : []),
    ...(r.inputs.heartRate < 60 ? [{ href: '#/guides/bradycardia', label: 'Bradycardia with a pulse', why: 'rate below 60' }] : []),
  ],
  limits: { qtMs: { min: 100, max: 800 }, heartRate: { min: 20, max: 250 } },
  footnote: 'Measure QT in lead II or V5 from QRS onset to the end of the T wave; exclude U waves.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.qtc({ ...v, sex: choices.sex }),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Corrections', r.preferred === 'fridericia' ? 'attention' : 'ok', [
        formula(r.formula),
        values(`RR ${r.rrSeconds} s · Bazett ${r.bazett} ms · Fridericia ${r.fridericia} ms`),
        branches(FORMULA_BRANCHES, r.preferred),
      ]),
      step(2, 'Read', TONE[r.severity], [
        values(`${r.preferred === 'bazett' ? 'Bazett' : 'Fridericia'} QTc ${r.qtc} ms · limit ${r.threshold} ms`),
        branches(readBranches(r), r.read),
      ])),
    conclusion(`QTc ${r.qtc} ms (${r.preferred}) · ${READ_TEXT[r.read]}`),
    caveats(r.caveats),
    sourceCard([
      'AHA/ACCF/HRS 2009 QT thresholds (Rautaharju et al.) and Fridericia preference outside 60–100/min (Vandenberk 2016) — portal-calculator-formulas.js :: qtc().',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};
