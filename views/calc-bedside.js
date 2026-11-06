import { TONE, branches, chipRows, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Bedside formulas: A-a gradient, MAP, BMI, Harris-Benedict (CALCULATOR_FORMULAS).

const source = (ctx, fn, cite) => sourceCard([
  `${cite} — portal-calculator-formulas.js :: ${fn}().`,
  `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
]);

export const AA_GRADIENT = {
  id: 'aa-gradient',
  title: 'Alveolar–arterial gradient',
  shortTitle: 'A-a gradient',
  subtitle: 'Sea-level alveolar gas equation · age-expected limit',
  searchTerms: ['Aa gradient', 'oxygenation'],
  groups: [
    { title: 'Blood gas', fields: [
      { key: 'fio2Percent', label: 'FiO₂', unit: '%', placeholder: '21', inputmode: 'numeric', shared: 'fio2Percent' },
      { key: 'pao2', label: 'PaO₂', unit: 'mmHg', placeholder: '80', shared: 'pao2' },
      { key: 'paco2', label: 'PaCO₂', unit: 'mmHg', placeholder: '40', shared: 'paco2' },
    ] },
    { title: 'Age · optional', fields: [
      { key: 'age', label: 'Age', unit: 'years', placeholder: '60', inputmode: 'numeric', required: false, shared: 'age' },
    ] },
  ],
  limits: { fio2Percent: { min: 21, max: 100 }, pao2: { min: 10, max: 700 }, paco2: { min: 5, max: 200 }, age: { min: 1, max: 120 } },
  related: (r) => [
    ...(r.read === 'elevated' ? [{ href: '#/guides/acute-hypoxemia-dyspnea', label: 'Acute hypoxaemia / dyspnoea guide', why: 'V/Q mismatch, shunt or diffusion limitation' }] : []),
    { href: '#/calc/abg', label: 'ABG interpretation', why: 'acid–base read of the same gas' },
  ],
  footnote: 'Room air is 21%. Nasal-cannula FiO₂ is an estimate; the gradient is most reliable on room air or a set FiO₂.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.aaGradient(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Alveolar oxygen', 'ok', [
        formula('PAO₂ = FiO₂ × (760 − 47) − PaCO₂ / 0.8'),
        values(`${r.inputs.fio2Percent / 100} × 713 − ${r.inputs.paco2} / 0.8 = ${r.pAO2} mmHg`),
      ]),
      step(2, 'Gradient', TONE[r.severity], [
        formula('A-a = PAO₂ − PaO₂ · expected upper limit ≈ age / 4 + 4'),
        values(`${r.pAO2} − ${r.inputs.pao2} = ${r.gradient} mmHg${r.expected !== null ? ` · expected < ${r.expected}` : ''}`),
        branches([
          { id: 'normal', label: 'Within the age-expected limit', rule: 'hypoxaemia, if present, from hypoventilation or low FiO₂' },
          { id: 'elevated', label: 'Above the age-expected limit', rule: 'V/Q mismatch, shunt or diffusion limitation' },
          { id: 'no-age', label: 'Age not entered', rule: 'no expected limit applied' },
        ], r.read),
      ])),
    conclusion(`A-a gradient ${r.gradient} mmHg${r.read === 'elevated' ? ' · elevated for age' : r.read === 'normal' ? ' · within expected' : ''}`),
    caveats(r.caveats),
    source(ctx, 'aaGradient', 'Alveolar gas equation; age limit after Mellemgaard 1966'),
  ],
};

export const MAP = {
  id: 'map',
  title: 'Mean arterial pressure',
  shortTitle: 'MAP',
  subtitle: 'One-third pulse pressure rule · 65 mmHg floor',
  groups: [{ title: 'Blood pressure', fields: [
    { key: 'systolicBp', label: 'Systolic', unit: 'mmHg', placeholder: '120', inputmode: 'numeric', shared: 'systolicBp' },
    { key: 'diastolicBp', label: 'Diastolic', unit: 'mmHg', placeholder: '80', inputmode: 'numeric', shared: 'diastolicBp' },
  ] }],
  limits: { systolicBp: { min: 30, max: 300 }, diastolicBp: { min: 10, max: 200 } },
  related: (r) => [
    ...(r.read === 'low' ? [{ href: '#/guides/hypotension', label: 'Acute hypotension guide', why: 'MAP below 65' }, { href: '#/guides/sepsis-septic-shock', label: 'Sepsis / septic shock guide', why: 'if infection is likely' }] : []),
    ...(r.read === 'high' ? [{ href: '#/guides/hypertensive-emergency', label: 'Severely elevated blood pressure guide', why: 'acute organ injury decides the route' }] : []),
  ],
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.map(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(step(1, 'Mean arterial pressure', TONE[r.severity], [
      formula(r.formula),
      values(`${r.inputs.diastolicBp} + (${r.inputs.systolicBp} − ${r.inputs.diastolicBp}) / 3 = ${r.map} mmHg · pulse pressure ${r.pulsePressure}`),
      branches([
        { id: 'low', label: 'MAP < 65', rule: 'below the resuscitation floor' },
        { id: 'normal', label: 'MAP 65–110', rule: 'usual perfusion range' },
        { id: 'high', label: 'MAP > 110', rule: 'elevated' },
      ], r.read),
    ])),
    conclusion(`MAP ${r.map} mmHg · ${r.read === 'low' ? 'below 65' : r.read === 'high' ? 'above 110' : 'within range'}`),
    caveats(r.caveats),
    source(ctx, 'map', 'MAP one-third rule; 65 mmHg target from Surviving Sepsis 2021'),
  ],
};

const BMI_BRANCHES = [
  { id: 'underweight', label: '< 18.5', rule: 'underweight' },
  { id: 'normal', label: '18.5–24.9', rule: 'normal range' },
  { id: 'overweight', label: '25–29.9', rule: 'overweight' },
  { id: 'obese-1', label: '30–34.9', rule: 'obese class I' },
  { id: 'obese-2', label: '35–39.9', rule: 'obese class II' },
  { id: 'obese-3', label: '≥ 40', rule: 'obese class III' },
];

export const BMI = {
  id: 'bmi',
  title: 'Body mass index',
  shortTitle: 'BMI',
  subtitle: 'WHO categories · Asian action points noted',
  groups: [{ title: 'Anthropometry', fields: [
    { key: 'weightKg', label: 'Weight', unit: 'kg', placeholder: '70', shared: 'weightKg' },
    { key: 'heightCm', label: 'Height', unit: 'cm', placeholder: '170', shared: 'heightCm' },
  ] }],
  limits: { weightKg: { min: 10, max: 400 }, heightCm: { min: 50, max: 250 } },
  related: (r) => [
    { href: '#/calc/harris-benedict', label: 'Resting energy expenditure', why: 'same weight and height' },
    ...(r.read.startsWith('obese') ? [{ href: '#/calc/crcl', label: 'Cockcroft-Gault CrCl', why: 'choose adjusted body weight for dosing' }] : []),
  ],
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.bmi(v),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(step(1, 'Body mass index', TONE[r.severity], [
      formula(r.formula),
      values(`${r.inputs.weightKg} / ${r.inputs.heightCm / 100}² = ${r.bmi} kg/m²`),
      branches(BMI_BRANCHES, r.read),
    ])),
    conclusion(`BMI ${r.bmi} kg/m² · ${BMI_BRANCHES.find((b) => b.id === r.read)?.rule}`),
    caveats(r.caveats),
    source(ctx, 'bmi', 'WHO BMI classification'),
  ],
};

export const HARRIS_BENEDICT = {
  id: 'harris-benedict',
  title: 'Resting energy expenditure',
  shortTitle: 'Harris-Benedict',
  subtitle: 'Roza & Shizgal 1984 revision · activity factors',
  searchTerms: ['REE', 'BMR', 'basal metabolic rate', 'calorie requirement'],
  groups: [{ title: 'Anthropometry', fields: [
    { key: 'weightKg', label: 'Weight', unit: 'kg', placeholder: '70', shared: 'weightKg' },
    { key: 'heightCm', label: 'Height', unit: 'cm', placeholder: '170', shared: 'heightCm' },
    { key: 'age', label: 'Age', unit: 'years', placeholder: '40', inputmode: 'numeric', shared: 'age' },
  ] }],
  choices: [{ key: 'sex', label: 'Sex (equation)', options: [['M', 'Male'], ['F', 'Female']], initial: '', required: true, shared: 'sex' }],
  related: () => [{ href: '#/calc/bmi', label: 'Body mass index', why: 'hypocaloric targets above BMI 30' }],
  limits: { weightKg: { min: 10, max: 400 }, heightCm: { min: 50, max: 250 }, age: { min: 1, max: 120 } },
  footnote: 'Predictive equations are ±10–15%; indirect calorimetry when it matters.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.harrisBenedict({ ...v, sex: choices.sex }),
  render: (r, ctx) => [
    resultsHead('Result', r.severity),
    timeline(
      step(1, 'Resting energy expenditure', 'ok', [
        formula(r.formula),
        values(`weight ${r.inputs.weightKg} · height ${r.inputs.heightCm} · age ${r.inputs.age} → REE ${r.ree} kcal/day (${r.perKg} kcal/kg)`),
      ]),
      step(2, 'Total energy by activity factor', 'ok', [
        chipRows(r.activity.map((a) => ({ label: a.label, rule: a.factor ? `× ${a.factor}` : 'multiply REE by the stress factor', chip: a.kcal ? `${a.kcal} kcal` : '—', tone: '' }))),
        summary('Illness and stress factors (1.2–1.5) are clinical judgements; guidelines for critical illness often use 25–30 kcal/kg/day instead.'),
      ])),
    conclusion(`REE ${r.ree} kcal/day`),
    caveats(r.caveats),
    source(ctx, 'harrisBenedict', 'Harris & Benedict 1919, coefficients revised by Roza & Shizgal 1984'),
  ],
};
