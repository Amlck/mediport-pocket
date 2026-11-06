// Grouped, manual lab review for Pocket. The source engines own every clinical
// calculation and threshold. This adapter validates entry and presents their
// returned codes; it does not read the DOM, persist values, or infer a diagnosis.
import { EXTRA_GROUPS, EXTRA_CHECKS, reviewExtraLabs } from './lab-review-extra.js';

export const LAB_GROUPS = Object.freeze([
  { title: 'Chemistry', fields: [
    { key: 'sodium', label: 'Sodium', unit: 'mmol/L', limits: { min: 100, max: 200 } },
    { key: 'potassium', label: 'Potassium', unit: 'mmol/L', limits: { min: 1, max: 10 } },
    { key: 'chloride', label: 'Chloride', unit: 'mmol/L', limits: { min: 1, max: 300 } },
    { key: 'bicarbonate', label: 'Chemistry HCO₃⁻', unit: 'mmol/L', limits: { min: 0.1, max: 150 } },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg/dL', limits: { min: 0.1, max: 10 } },
    { key: 'phosphate', label: 'Phosphate', unit: 'mg/dL', limits: { min: 0.1, max: 15 } },
    { key: 'calcium', label: 'Total calcium', unit: 'mg/dL', limits: { min: 1, max: 25 } },
    { key: 'albumin', label: 'Albumin', unit: 'g/dL', limits: { min: 0.1, max: 10 } },
  ] },
  { title: 'Glucose & osmolality', fields: [
    { key: 'glucose', label: 'Glucose', unit: 'mg/dL', limits: { min: 0, max: 3000 } },
    { key: 'bun', label: 'BUN', unit: 'mg/dL', limits: { min: 0, max: 400 } },
    { key: 'serumOsmolality', label: 'Measured serum osmolality', unit: 'mOsm/kg', limits: { min: 100, max: 600 } },
  ] },
  { title: 'Kidney estimate', fields: [
    { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', limits: { min: 0.1, max: 30 } },
    { key: 'age', label: 'Age', unit: 'years', limits: { min: 18, max: 120 } },
    { key: 'sex', label: 'Sex for equation', unit: '', options: [['M', 'Male'], ['F', 'Female']] },
  ] },
  { title: 'Arterial blood gas', fields: [
    { key: 'ph', label: 'pH', unit: '', limits: { min: 6.5, max: 8 } },
    { key: 'paco2', label: 'PaCO₂', unit: 'mmHg', limits: { min: 0.1, max: 300 } },
    { key: 'bloodGasBicarbonate', label: 'Blood gas HCO₃⁻', unit: 'mmol/L', limits: { min: 0.1, max: 150 } },
  ] },
  ...EXTRA_GROUPS,
]);

export const LAB_FIELDS = Object.freeze(LAB_GROUPS.flatMap((group) => group.fields));
const FIELD = Object.fromEntries(LAB_FIELDS.map((field) => [field.key, field]));
const AG_PATTERN_LABEL = Object.freeze({
  normal: 'normal anion-gap pattern',
  'normal-gap': 'normal-gap metabolic acidosis pattern',
  'elevated-without-acidosis': 'elevated gap without concurrent metabolic acidosis',
  'normal-gap-predominant': 'predominant normal-gap component',
  'mixed-high-and-normal-gap': 'mixed high-gap and normal-gap acidosis pattern',
  'high-gap': 'high-gap metabolic acidosis pattern',
  'high-gap-plus-alkalosis': 'high-gap acidosis plus metabolic alkalosis pattern',
});

export const CORE_CHECKS = Object.freeze([
  { id: 'electrolytes', title: 'K, Mg, phosphate replacement screen', href: '#/calc/electrolytes', required: ['potassium', 'magnesium', 'phosphate'] },
  { id: 'ca', title: 'Albumin-corrected calcium', href: '#/calc/ca', required: ['calcium', 'albumin'] },
  { id: 'ag', title: 'Chemistry anion gap', href: '#/calc/ag', required: ['sodium', 'chloride', 'bicarbonate', 'albumin'] },
  { id: 'na-free-water', title: 'Corrected sodium and effective osmolality', href: '#/calc/na-free-water', required: ['sodium', 'glucose'] },
  { id: 'osmolar-gap', title: 'Calculated osmolality and osmolar gap', href: '#/calc/osmolar-gap', required: ['sodium', 'glucose', 'bun'] },
  { id: 'egfr', title: 'eGFR (CKD-EPI 2021)', href: '#/calc/egfr', required: ['creatinine', 'age', 'sex'] },
  { id: 'abg', title: 'Arterial blood gas', href: '#/calc/abg', required: ['ph', 'paco2', 'bloodGasBicarbonate'] },
]);
export const LAB_CHECK_COUNT = CORE_CHECKS.length + EXTRA_CHECKS.length;

const FAMILIES = {
  electrolytes: ['Electrolytes', ['electrolytes', 'ca', 'guide-potassium', 'guide-sodium']],
  glucose: ['Glucose & tonicity', ['na-free-water', 'osmolar-gap', 'guide-glucose']],
  acidbase: ['Acid–base', ['ag', 'abg', 'urine-anion-gap']],
  renal: ['Kidney & urine indices', ['egfr', 'fena', 'feurea']],
  oxygenation: ['Oxygenation', ['aa-gradient']],
  blood: ['Blood count & anemia', ['anemia']],
};
export function groupLabFindings(findings) {
  const groups = [];
  for (const item of findings) {
    const [id, [title]] = Object.entries(FAMILIES).find(([, [, checks]]) => checks.includes(item.id)) || [item.id, [item.title]];
    let group = groups.find(group => group.id === id);
    if (!group) { group = { id, title, checks: [] }; groups.push(group); }
    group.checks.push(item);
  }
  return groups;
}

function blank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function parse(raw, issues) {
  const values = {};
  for (const field of LAB_FIELDS) {
    const original = raw?.[field.key];
    if (blank(original)) {
      values[field.key] = null;
      continue;
    }
    if (field.options) {
      const value = String(original).trim();
      const option = field.options.find(([code]) => code.toLowerCase() === value.toLowerCase());
      if (option) values[field.key] = option[0];
      else {
        values[field.key] = null;
        issues.push({ field: field.key, message: `${field.label}: choose one of the listed options.` });
      }
      continue;
    }
    const value = typeof original === 'number' || typeof original === 'string' ? Number(original) : NaN;
    const { min, max } = field.limits;
    if (!Number.isFinite(value) || value < min || value > max) {
      values[field.key] = null;
      issues.push({ field: field.key, message: `${field.label}: enter a finite value from ${min} to ${max} ${field.unit}`.trim() + '.' });
    } else values[field.key] = value;
  }
  return values;
}

function card(check, summary, severity, details, result) {
  return { id: check.id, title: check.title, summary, severity, href: check.href,
    details, result, calculatorId: check.id };
}

function pushCard(output, item) {
  (item.severity === 'success' ? output.checked : output.findings).push(item);
  output.results[item.id] = item.result;
}

function markIncomplete(output, check, missing, message) {
  if (missing.length) output.incomplete.push({ id: check.id, title: check.title, missing,
    message: message || `Not assessed: enter ${missing.map((key) => FIELD[key].label).join(', ')}.` });
}

function abgExpectedDetail(expected) {
  if (!expected) return null;
  const range = expected.type === 'paco2'
    ? `Expected PaCO₂ ${expected.low}–${expected.high} mmHg.`
    : `Expected HCO₃⁻ acute ${expected.acute}, chronic ${expected.chronic} mmol/L.`;
  return `${expected.formula}. ${range}`;
}

/** Review independent checks with the generated, maintained Pocket engines. */
export function reviewLabs(raw = {}, engines) {
  if (!engines?.calculators?.CALCULATOR_FORMULAS || !engines?.calculators?.REGISTRY_CALCULATORS
    || !engines?.abg?.computeABG || !engines?.abg?.computeOsmolarGap) {
    throw new TypeError('reviewLabs requires the Pocket calculators and ABG engines.');
  }
  const output = { issues: [], values: {}, findings: [], checked: [], incomplete: [], results: {} };
  const v = output.values = parse(raw, output.issues);
  const f = engines.calculators.CALCULATOR_FORMULAS;
  const registry = engines.calculators.REGISTRY_CALCULATORS;
  const [electrolytes, calcium, ag, sodium, osm, egfr, abg] = CORE_CHECKS;

  // The source screen is intentionally a K/Mg/phosphate replacement screen.
  // It does not classify high Mg or high phosphate.
  const electrolyteMissing = electrolytes.required.filter((key) => v[key] === null);
  const present = electrolytes.required.filter((key) => v[key] !== null);
  if (present.length) {
    const r = f.electrolyteScreen({ potassium: v.potassium, magnesium: v.magnesium,
      phosphate: v.phosphate });
    if (r) {
      const flagged = r.items.filter((item) => item.read !== 'normal');
      const summary = flagged.length
        ? flagged.map((item) => `${item.label} ${item.value} ${item.unit}: ${item.read.replace('-', ' ')}`).join(' · ')
        : `No replacement flag in entered ${r.items.map((item) => item.label).join(', ')}.`;
      const highScope = 'High magnesium and high phosphate are not assessed by this replacement screen.';
      pushCard(output, card(electrolytes, flagged.length ? summary : `${summary} ${highScope}`, r.severity,
        [...r.items.map((item) => `${item.label} ${item.value} ${item.unit}: ${item.read === 'normal' && item.key !== 'potassium' ? 'no low-replacement flag' : item.read}${item.note ? ` — ${item.note}` : ''}`),
          highScope,
          ...r.notes, ...r.caveats, ...(electrolyteMissing.length ? ['Other screen components were not entered.'] : [])], r));
    }
  }
  markIncomplete(output, electrolytes, electrolyteMissing,
    electrolyteMissing.length ? `Not assessed: ${electrolyteMissing.map((key) => FIELD[key].label).join(', ')}. The screen covers replacement flags; it does not rule out other electrolyte abnormalities.` : '');

  for (const check of [calcium, ag, sodium, osm, egfr, abg]) {
    const missing = check.required.filter((key) => v[key] === null);
    if (missing.length) {
      markIncomplete(output, check, missing);
      continue;
    }
    let r;
    if (check === calcium) {
      r = f.correctedCalcium({ calcium: v.calcium, albumin: v.albumin });
      if (r) pushCard(output, card(check, `Corrected Ca ${r.corrected} ${r.unit}: ${r.read}.`, r.severity,
        [r.formula, `Total Ca ${r.inputs.calcium} ${r.unit}; albumin ${r.inputs.albumin} g/dL; correction ${r.correction}; corrected ${r.corrected} ${r.unit}.`,
          `Source corrected-calcium reference range ${r.range.min}–${r.range.max} ${r.unit}.`, ...r.caveats], r));
    } else if (check === ag) {
      // Require measured albumin so the engine cannot silently assume 4 g/dL.
      r = f.anionGap({ sodium: v.sodium, chloride: v.chloride,
        bicarbonate: v.bicarbonate, albumin: v.albumin });
      if (r) pushCard(output, card(check, `AG ${r.ag}; albumin-corrected ${r.correctedAg}: ${AG_PATTERN_LABEL[r.pattern] || r.pattern}.`,
        r.severity, [r.formula,
          `Chemistry Na ${r.inputs.sodium}, Cl ${r.inputs.chloride}, HCO₃⁻ ${r.inputs.bicarbonate} mmol/L; albumin ${r.inputs.albumin} g/dL.`,
          `Uncorrected AG ${r.ag}; corrected AG ${r.correctedAg}; delta ratio ${r.deltaRatio ?? 'not calculated'}; source pattern ${r.pattern}.`,
          ...r.caveats], r));
    } else if (check === sodium) {
      // With no weight entered, the maintained helper reports sodium/tonicity
      // bands and never estimates a free-water treatment deficit. Its unused
      // TBW factor is deliberately excluded from this lab-only result.
      const source = registry.sodiumFreeWater({ sodium: v.sodium, glucose: v.glucose });
      r = source && { measuredSodium: source.measuredSodium, glucose: source.glucose,
        glucoseCorrection: source.glucoseCorrection, correctedSodium: source.correctedSodium,
        effectiveOsmolality: source.effectiveOsmolality, severity: source.severity,
        deficitLiters: null };
      if (r) pushCard(output, card(check,
        `Glucose-corrected Na ${Math.round(r.correctedSodium * 10) / 10} mmol/L; effective osm ${Math.round(r.effectiveOsmolality)} mOsm/kg.`,
        r.severity, [`Measured Na ${r.measuredSodium} mmol/L; glucose ${r.glucose} mg/dL; source glucose correction +${Math.round(r.glucoseCorrection * 10) / 10} mmol/L.`,
          `Source severity ${r.severity}. Measured glucose was required for effective osmolality.`,
          'No free-water deficit or treatment rate estimated.'], r));
    } else if (check === osm) {
      const response = engines.abg.computeOsmolarGap({ na: v.sodium, glucose: v.glucose,
        bun: v.bun, measuredOsm: v.serumOsmolality });
      if (response.status === 'ok') {
        r = response.result;
        pushCard(output, card(check, r.text, r.tone,
          [`Na ${r.sodium} mmol/L; glucose ${r.glucose} mg/dL; BUN ${r.bun} mg/dL; calculated osm ${r.calculated} mOsm/kg.`,
            v.serumOsmolality === null ? 'Measured osmolality not entered; the osmolar gap is not assessed.'
              : `Measured osm ${r.measured} mOsm/kg; gap ${r.gap}; source gap-elevated flag ${r.gapElevated}.`], r));
        if (v.serumOsmolality === null) markIncomplete(output, check, ['serumOsmolality'],
          'Osmolar gap not assessed: enter measured serum osmolality. Calculated osmolality is shown separately.');
      } else {
        markIncomplete(output, check, response.issues?.map((issue) => issue.field) || check.required);
      }
    } else if (check === egfr) {
      r = f.egfrCkdEpi2021({ creatinine: v.creatinine, age: v.age, sex: v.sex });
      if (r) pushCard(output, card(check, `eGFR ${r.egfr} ${r.unit}; ${r.stage.code} ${r.stage.label}.`,
        r.severity, [r.formula, `Creatinine ${r.inputs.creatinine} mg/dL; age ${r.inputs.age} years; equation sex ${r.inputs.sex}.`,
          `Source category ${r.stage.code} ${r.stage.label}.`,
          `Source GFR categories: ${r.stages.map((stage) => `${stage.code} ${stage.max === null ? `≥ ${stage.min}` : stage.min === 0 ? `< ${stage.max}` : `${stage.min}–< ${stage.max}`}`).join('; ')} ${r.unit}.`,
          ...r.caveats], r));
    } else {
      // Gas-only call: chemistry Na/Cl/HCO3 never enter the ABG anion-gap step.
      const response = engines.abg.computeABG({ ph: v.ph, paco2: v.paco2,
        hco3: v.bloodGasBicarbonate, alb: v.albumin });
      if (response.status === 'ok') {
        r = response.interpretation;
        const summary = r.compensation.verdict === 'not-assessed'
          ? `${r.primary.label}; compensation not assessed by the source for this gas pattern.`
          : `${r.primary.label}; ${r.compensation.text}`;
        pushCard(output, card(check, summary,
          response.severity, [`Gas pH ${v.ph}, PaCO₂ ${v.paco2} mmHg, gas HCO₃⁻ ${v.bloodGasBicarbonate} mmol/L.`,
            `Source primary pattern ${r.primary.code}; compensation ${r.compensation.verdict}.`,
            r.compensation.text, ...(r.compensation.expected ? [abgExpectedDetail(r.compensation.expected)] : []),
            'Gas bicarbonate used for compensation; chemistry anion gap is reviewed separately.',
            ...(response.assumptions?.length ? ['The source ABG wrapper assumes albumin 4.0 g/dL when blank; its anion-gap step is disabled here, so this does not affect the gas interpretation.'] : []),
            ...r.nextChecks], response));
      } else markIncomplete(output, check, response.issues?.map((issue) => issue.field === 'hco3' ? 'bloodGasBicarbonate' : issue.field) || check.required);
    }
    if (!r) markIncomplete(output, check, check.required, 'The source calculator could not interpret these values; verify the entries and specimen.');
  }
  const enteredKeys = LAB_FIELDS.filter(field => !blank(raw[field.key])).map(field => field.key);
  // Untouched optional tools belong in coverage, not a long missing-input list.
  for (const item of output.incomplete) {
    const check = CORE_CHECKS.find(check => check.id === item.id);
    item.active = check.required.some(key => !['age', 'sex'].includes(key) && enteredKeys.includes(key));
  }
  const extras = reviewExtraLabs(v, engines, { enteredKeys });
  output.findings.push(...extras.findings);
  output.checked.push(...extras.checked);
  output.incomplete.push(...extras.incomplete);
  Object.assign(output.results, extras.results);
  if (engines.labEntry?.reviewLabEntry) {
    const entry = engines.labEntry.reviewLabEntry(v, { classifyGlycemicState: engines.glycemic?.classifyGlycemicState });
    for (const check of entry.incomplete) {
      if (check.active === false && check.missing.some(key => enteredKeys.includes(key))) check.active = true;
    }
    output.findings.push(...entry.findings);
    output.checked.push(...entry.checked);
    output.incomplete.push(...entry.incomplete);
    Object.assign(output.results, entry.results);
  }
  // Stable sort retains source-check order within a severity tier.
  const priority = { danger: 0, warn: 1 };
  output.findings.sort((a, b) => (priority[a.severity] ?? 2) - (priority[b.severity] ?? 2));
  return output;
}
