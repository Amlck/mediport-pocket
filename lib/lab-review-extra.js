// Optional lab families. Maintained engines own all formulas, thresholds and
// clinical prose. The caller parses the grouped entry before passing it here.
const numberField = (key, label, unit, min, max) => ({ key, label, unit, limits: { min, max } });
export const EXTRA_GROUPS = Object.freeze([
  { id: 'urine', title: 'Urine studies · optional', optional: true, fields: [
    numberField('urineSodium', 'Urine sodium', 'mmol/L', 0, 400),
    numberField('urinePotassium', 'Urine potassium', 'mmol/L', 0, 400),
    numberField('urineChloride', 'Urine chloride', 'mmol/L', 0, 400),
    numberField('urineCreatinine', 'Urine creatinine', 'mg/dL', 0.1, 1000),
    numberField('serumUrea', 'Serum urea / BUN for FEUrea', 'mg/dL · same analyte as urine', 0.1, 500),
    numberField('urineUrea', 'Urine urea / BUN for FEUrea', 'mg/dL · same analyte as serum', 0.1, 5000),
    { key: 'ureaBasis', label: 'FEUrea paired analyte and units', unit: '', options: [['bun', 'Both BUN in mg/dL'], ['urea', 'Both urea in mg/dL']] },
  ] },
  { id: 'oxygenation', title: 'Oxygenation · optional', optional: true, fields: [
    numberField('pao2', 'Arterial PaO₂', 'mmHg', 10, 700),
    numberField('fio2Percent', 'FiO₂ at gas sampling', '% · enter explicitly', 21, 100),
  ] },
  { id: 'cbc', title: 'CBC and context · optional', optional: true, fields: [
    numberField('hemoglobin', 'Hemoglobin', 'g/dL', 1, 25),
    numberField('hematocrit', 'Measured hematocrit', '%', 3, 75),
    numberField('reticPercent', 'Reticulocytes', '%', 0, 50),
    numberField('mcv', 'MCV', 'fL', 40, 160),
    { key: 'anemiaContext', label: 'Anaemia clinical context', unit: '', options: [['stable', 'Stable'], ['symptoms', 'Symptoms / bleeding'], ['cardiac', 'Cardiac ischaemia']] },
  ] },
  { id: 'anemia-studies', title: 'Anaemia studies · optional', optional: true, fields: [
    numberField('iron', 'Iron', 'µg/dL', 0, 1000),
    numberField('tsat', 'TSAT', '%', 0, 100),
    numberField('ferritin', 'Ferritin', 'ng/mL', 0, 100000),
    numberField('b12', 'B12', 'pg/mL', 0, 10000),
    numberField('folate', 'Folate', 'ng/mL', 0, 100),
    numberField('ldh', 'LDH', 'U/L', 0, 20000),
    numberField('totalBilirubin', 'Total bilirubin', 'mg/dL', 0, 60),
    numberField('haptoglobin', 'Haptoglobin', 'mg/dL', 0, 1000),
  ] },
]);
export const EXTRA_FIELDS = Object.freeze(EXTRA_GROUPS.flatMap((group) => group.fields));
const CBC = ['hemoglobin', 'hematocrit', 'reticPercent', 'mcv'];
const ANEMIA_FIELDS = [...CBC, 'iron', 'tsat', 'ferritin', 'b12', 'folate', 'ldh', 'totalBilirubin', 'haptoglobin'];
export const EXTRA_CHECKS = Object.freeze([
  { id: 'fena', title: 'Fractional excretion of sodium', group: 'Urine studies', required: ['sodium', 'creatinine', 'urineSodium', 'urineCreatinine'], triggers: ['urineSodium', 'urineCreatinine'] },
  { id: 'feurea', title: 'Fractional excretion of urea', group: 'Urine studies', required: ['serumUrea', 'urineUrea', 'creatinine', 'urineCreatinine', 'ureaBasis'], triggers: ['serumUrea', 'urineUrea', 'ureaBasis'] },
  { id: 'urine-anion-gap', title: 'Urine anion gap', group: 'Urine studies', required: ['urineSodium', 'urinePotassium', 'urineChloride'], triggers: ['urineSodium', 'urinePotassium', 'urineChloride'] },
  { id: 'aa-gradient', title: 'Arterial A-a oxygen gradient', group: 'Oxygenation', required: ['pao2', 'fio2Percent', 'paco2'], triggers: ['pao2', 'fio2Percent'] },
  { id: 'anemia', title: 'Anaemia and reticulocyte review', group: 'CBC / anaemia', required: ['sex', 'anemiaContext'], triggers: [...ANEMIA_FIELDS, 'anemiaContext'] },
]);
const LABELS = Object.fromEntries(EXTRA_FIELDS.map((field) => [field.key, field.label]));
Object.assign(LABELS, { sodium: 'serum sodium', creatinine: 'serum creatinine', sex: 'reference Hct sex', paco2: 'arterial PaCO₂', age: 'age' });
const present = (value) => value !== null && value !== undefined && value !== '';
const numeric = (value) => typeof value === 'number' && Number.isFinite(value);
const validValue = (v, key) => {
  if (key === 'sex') return ['M', 'F'].includes(v[key]);
  const field = EXTRA_FIELDS.find((item) => item.key === key);
  if (field?.options) return field.options.some(([code]) => v[key] === code);
  if (!numeric(v[key])) return false;
  if (field?.limits) return v[key] >= field.limits.min && v[key] <= field.limits.max;
  return true;
};
function incomplete(output, check, missing, message, active = true) {
  output.incomplete.push({ id: check.id, title: check.title, group: check.group, active, missing,
    message: message || `Not assessed: enter ${missing.map((key) => LABELS[key] || key).join(', ')}.` });
}
function push(output, check, result, summary, severity, details) {
  const item = { id: check.id, title: check.title, group: check.group, calculatorId: check.id,
    href: `#/calc/${check.id}`, result, summary, severity, details };
  (severity === 'success' ? output.checked : output.findings).push(item);
  output.results[check.id] = result;
}

/** Receives parsed canonical lab values; no persistence or implicit choices. */
export function reviewExtraLabs(v = {}, engines, { enteredKeys = [] } = {}) {
  if (!engines?.calculators?.CALCULATOR_FORMULAS || !engines?.abg?.computeUrineAnionGap) {
    throw new TypeError('reviewExtraLabs requires the Pocket calculators and ABG engines.');
  }
  const output = { findings: [], checked: [], incomplete: [], results: {} };
  const f = engines.calculators.CALCULATOR_FORMULAS;
  for (const check of EXTRA_CHECKS) {
    if (!check.triggers.some((key) => present(v[key]) || enteredKeys.includes(key))) {
      incomplete(output, check, [], 'Optional check not assessed: no associated measurements entered.', false);
      continue;
    }
    const missing = check.required.filter((key) => !validValue(v, key));
    if (check.id === 'anemia' && !CBC.some((key) => validValue(v, key))) missing.push(...CBC);
    if (missing.length) { incomplete(output, check, missing); continue; }
    let r;
    if (check.id === 'fena') {
      // This shared urine Na supports UAG zeroes; FENa has a narrower source
      // input contract. Never turn a rejected fraction into a negative finding.
      if (v.urineSodium < 0.1) {
        incomplete(output, check, ['urineSodium'], 'FENa not assessed: its maintained calculator requires urine sodium ≥ 0.1 mmol/L.');
        continue;
      }
      r = f.fena({ serumSodium: v.sodium, serumCreatinine: v.creatinine, urineSodium: v.urineSodium, urineCreatinine: v.urineCreatinine });
      if (r) push(output, check, r, `FENa ${r.fena}% · source ${r.read} pattern.`, r.severity,
        [r.formula, `Serum Na ${v.sodium} mmol/L; serum Cr ${v.creatinine} mg/dL; urine Na ${v.urineSodium} mmol/L; urine Cr ${v.urineCreatinine} mg/dL.`,
          'Interpretation depends on oliguric AKI, diuretic exposure and paired sampling; these are not established by this entry.', ...r.caveats]);
    } else if (check.id === 'feurea') {
      r = f.feUrea({ serumUrea: v.serumUrea, urineUrea: v.urineUrea, serumCreatinine: v.creatinine, urineCreatinine: v.urineCreatinine });
      if (r) push(output, check, r, `FEUrea ${r.feUrea}% · source ${r.read} pattern.`, r.severity,
        [r.formula, `Explicit paired analyte: ${v.ureaBasis === 'bun' ? 'BUN' : 'urea'}, both in mg/dL. Serum ${v.serumUrea}; urine ${v.urineUrea}; serum Cr ${v.creatinine} mg/dL; urine Cr ${v.urineCreatinine} mg/dL.`,
          'The chemistry BUN field is not automatically substituted; verify paired sampling and confounders.', ...r.caveats]);
    } else if (check.id === 'urine-anion-gap') {
      const response = engines.abg.computeUrineAnionGap({ urineSodium: v.urineSodium, urinePotassium: v.urinePotassium, urineChloride: v.urineChloride });
      if (response.status === 'ok') {
        r = response.result;
        push(output, check, r, r.label, r.tone, ['UAG = urine Na + urine K − urine Cl.',
          `Urine Na ${r.urineSodium}, K ${r.urinePotassium}, Cl ${r.urineChloride} mmol/L.`, r.text,
          'Interpret only in a confirmed normal-gap metabolic acidosis; clinical compatibility is not established here.',
          'Source thresholds drafted 2026-09-18; clinician review pending.', ...r.caveats]);
      }
    } else if (check.id === 'aa-gradient') {
      if (v.paco2 < 5 || v.paco2 > 200) {
        incomplete(output, check, ['paco2'], 'A-a gradient not assessed: its source input range is PaCO₂ 5–200 mmHg; the acid–base gas check is separate.');
        continue;
      }
      r = f.aaGradient({ fio2Percent: v.fio2Percent, pao2: v.pao2, paco2: v.paco2, age: numeric(v.age) ? v.age : null });
      if (r) {
        push(output, check, r, `A-a gradient ${r.gradient} mmHg${r.expected === null ? ' · age comparison not assessed' : ` · source ${r.read} for age`}.`, r.severity,
          [r.formula, `Arterial PaO₂ ${v.pao2} mmHg; PaCO₂ ${v.paco2} mmHg; explicit FiO₂ ${v.fio2Percent}%; alveolar PAO₂ ${r.pAO2} mmHg.`,
            r.expected === null ? 'Age not entered; a calculated gradient does not establish normal oxygenation.' : `Source age-expected upper limit ${r.expected} mmHg at age ${v.age}.`, ...r.caveats]);
        if (r.expected === null) incomplete(output, check, ['age'], 'Age comparison not assessed: enter age. The gradient is calculated with the source sea-level constants.');
      }
    } else {
      // Require both categorical choices before the source's male/stable
      // defaults can run. Optional numeric inputs remain explicitly null.
      const inputs = Object.fromEntries(ANEMIA_FIELDS.map((key) => [key, validValue(v, key) ? v[key] : null]));
      r = f.anemiaHelper({ ...inputs, sex: v.sex, context: v.anemiaContext });
      if (r) {
        const parts = [inputs.hemoglobin === null ? 'Hgb not entered' : `Hgb ${inputs.hemoglobin} g/dL`,
          r.mcvPattern === 'not-entered' ? 'MCV not assessed' : `${r.mcvPattern} pattern`,
          r.rpi === null ? 'RPI not assessed' : `RPI ${r.rpi} (${r.rpiRead})${r.hctEstimated ? ' · Hct estimated from Hgb' : ''}`];
        push(output, check, r, parts.join(' · '), r.severity, [r.formula,
          `Explicit reference sex ${v.sex} (source normal Hct ${r.normalHct}%); clinical context ${v.anemiaContext}.`,
          r.hct === null ? 'Hct not entered or estimated.' : `Hct ${r.hct}%${r.hctEstimated ? ' estimated as 3 × Hgb; measured Hct was not entered' : ' measured'}; maturation factor ${r.maturation}.`,
          ...r.prompts, ...r.transfusion,
          r.hemolysisClues.length ? `Entered haemolysis clues: ${r.hemolysisClues.join(', ')}.` : 'No source haemolysis flag among entered studies; missing studies are not negative findings.',
          ...r.caveats]);
        const unassessed = [];
        if (inputs.hemoglobin === null) unassessed.push('hemoglobin');
        if (inputs.mcv === null) unassessed.push('mcv');
        if (r.rpi === null) {
          if (inputs.reticPercent === null) unassessed.push('reticPercent');
          if (r.hct === null) unassessed.push('hematocrit');
        }
        for (const key of ['ldh', 'totalBilirubin', 'haptoglobin']) if (inputs[key] === null) unassessed.push(key);
        if (unassessed.length) incomplete(output, check, unassessed,
          `Partial anaemia review: ${unassessed.map((key) => LABELS[key]).join(', ')} not entered; their associated components are not fully assessed. Iron/B12/folate prompts use only entered studies.`);
      }
    }
    if (!r) incomplete(output, check, check.required, 'The maintained calculator could not interpret these entries; verify inputs and specimen.');
  }
  const priority = { danger: 0, warn: 1 };
  output.findings.sort((a, b) => (priority[a.severity] ?? 2) - (priority[b.severity] ?? 2));
  return output;
}
