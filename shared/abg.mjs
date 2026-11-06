// Maintained public source, initially extracted from Mediport Medical.
// See UPSTREAM_PROVENANCE.json for original source hashes and extraction notes.
// Function bodies below are extracted mechanically from the maintained Mediport sources.
// No parallel acid-base interpretation logic is maintained in the pocket app.

export const ABG_SOURCE = Object.freeze({
  originalFile: 'portal/static/js/portal-calculator-registry.js',
  originalFunction: 'interpretABG',
  sha256: 'c1e07bb498d59a3663d3f642b4614ff21232d05f0cb252a6490026f323f7cecb',
  renderer: Object.freeze({
    originalFile: 'portal/static/js/portal-calculators.js',
    originalFunction: 'renderABGResult',
    sha256: '8f23cb6a0e8734560ba60f40ee62ca5baddbfaafbbb4ac0a5428da265cbd6151',
  }),
});

// Broad plausibility bounds prevent malformed input from being interpreted. They are input guards, not clinical thresholds.
export const ABG_INPUT_LIMITS = Object.freeze({
  ph: Object.freeze({ min: 6.5, max: 8.0 }),
  paco2: Object.freeze({ min: 0.1, max: 300 }),
  hco3: Object.freeze({ min: 0.1, max: 150 }),
  na: Object.freeze({ min: 1, max: 300 }),
  cl: Object.freeze({ min: 1, max: 300 }),
  alb: Object.freeze({ min: 0.1, max: 10 }),
  glucose: Object.freeze({ min: 0, max: 3000 }),
  bun: Object.freeze({ min: 0, max: 400 }),
  measuredOsm: Object.freeze({ min: 100, max: 600 }),
  urineSodium: Object.freeze({ min: 0, max: 400 }),
  urinePotassium: Object.freeze({ min: 0, max: 400 }),
  urineChloride: Object.freeze({ min: 0, max: 400 }),
});

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function parseValue(value, field, required, issues) {
  if (isBlank(value)) {
    if (required) issues.push({ field, code: 'required', message: field + ' is required.' });
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    issues.push({ field, code: 'not-finite', message: field + ' must be a finite number.' });
    return null;
  }
  const limit = ABG_INPUT_LIMITS[field];
  if (numeric < limit.min || numeric > limit.max) {
    issues.push({ field, code: 'out-of-range', message: field + ' must be between ' + limit.min + ' and ' + limit.max + '.' });
    return null;
  }
  return numeric;
}

function textFromHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Maintained registry functions, mechanically extracted at bundle-build time.
function interpretABG(input) {

    const ph = Number(input && input.ph);
    const paco2 = Number(input && input.paco2);
    const hco3 = Number(input && input.hco3);
    const na = Number(input && input.na);
    const cl = Number(input && input.cl);
    const alb = Number(input && input.alb) || 4.0;
    if (!ph || !paco2 || !hco3) return null;

    const acidemia = ph < 7.35;
    const alkalemia = ph > 7.45;
    const nearNormal = !acidemia && !alkalemia;
    const primary = { code: 'mixed-near-normal', label: 'Mixed/near-normal acid-base pattern' };
    const compensation = {
      text: 'No single primary disorder is obvious; inspect PaCO2 and HCO3 direction for a compensated or mixed disorder.',
      tone: 'caution',
      expected: null,
      observed: null,
      verdict: 'not-assessed',
    };
    const nextChecks = [];
    if (acidemia) {
      if (hco3 < 22) {
        primary.code = 'metabolic-acidosis';
        primary.label = 'Primary metabolic acidosis';
        const expected = 1.5 * hco3 + 8;
        const low = expected - 2;
        const high = expected + 2;
        compensation.expected = { type: 'paco2', low: Math.round(low), high: Math.round(high), formula: 'Winter: PaCO2 = 1.5 x HCO3 + 8 +/- 2' };
        compensation.observed = paco2;
        if (paco2 > high) {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} by Winter formula; observed ${paco2}, suggesting concurrent respiratory acidosis.`;
          compensation.tone = 'danger';
          compensation.verdict = 'concurrent-respiratory-acidosis';
          nextChecks.push('assess ventilation, fatigue, CNS/airway disease, sedatives, or COPD overlap');
        } else if (paco2 < low) {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} by Winter formula; observed ${paco2}, suggesting concurrent respiratory alkalosis.`;
          compensation.tone = 'danger';
          compensation.verdict = 'concurrent-respiratory-alkalosis';
          nextChecks.push('look for sepsis, pain/anxiety, hypoxemia, liver disease, pregnancy, salicylates, or PE');
        } else {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} by Winter formula; observed ${paco2}, appropriate respiratory compensation.`;
          compensation.tone = 'ok';
          compensation.verdict = 'appropriate';
        }
      } else {
        primary.code = 'respiratory-acidosis';
        primary.label = 'Primary respiratory acidosis';
        const delta = paco2 - 40;
        const acute = 24 + delta / 10;
        const chronic = 24 + 3.5 * delta / 10;
        compensation.expected = { type: 'hco3', acute: Math.round(acute * 10) / 10, chronic: Math.round(chronic * 10) / 10, formula: 'HCO3 rises 1 (acute) or 3.5 (chronic) per 10 mmHg PaCO2 above 40' };
        compensation.observed = hco3;
        compensation.text = `Expected HCO3 acute ~${Math.round(acute * 10) / 10}, chronic ~${Math.round(chronic * 10) / 10}; observed ${hco3}.`;
        if (hco3 < acute - 2) {
          compensation.text += ' Lower than expected: concurrent metabolic acidosis or early/uncompensated process.';
          compensation.tone = 'danger';
          compensation.verdict = 'lower-than-expected';
        } else if (hco3 > chronic + 3) {
          compensation.text += ' Higher than expected: concurrent metabolic alkalosis or chronic CO2 retention with additional alkali.';
          compensation.tone = 'caution';
          compensation.verdict = 'higher-than-expected';
        } else {
          compensation.tone = 'ok';
          compensation.verdict = 'appropriate';
        }
        nextChecks.push('assess airway/ventilation, opioids/sedatives, neuromuscular weakness, COPD/asthma, and oxygenation');
      }
    } else if (alkalemia) {
      if (hco3 > 26) {
        primary.code = 'metabolic-alkalosis';
        primary.label = 'Primary metabolic alkalosis';
        const expected = 40 + 0.7 * (hco3 - 24);
        const low = expected - 5;
        const high = Math.min(expected + 5, 55);
        compensation.expected = { type: 'paco2', low: Math.round(low), high: Math.round(high), formula: 'PaCO2 = 40 + 0.7 x (HCO3 - 24) +/- 5, capped at 55' };
        compensation.observed = paco2;
        if (paco2 > high) {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} for metabolic alkalosis; observed ${paco2}, suggesting concurrent respiratory acidosis.`;
          compensation.tone = 'danger';
          compensation.verdict = 'concurrent-respiratory-acidosis';
        } else if (paco2 < low) {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} for metabolic alkalosis; observed ${paco2}, suggesting concurrent respiratory alkalosis.`;
          compensation.tone = 'danger';
          compensation.verdict = 'concurrent-respiratory-alkalosis';
        } else {
          compensation.text = `Expected PaCO2 ${Math.round(low)}-${Math.round(high)} for metabolic alkalosis; observed ${paco2}, appropriate compensation.`;
          compensation.tone = 'ok';
          compensation.verdict = 'appropriate';
        }
        nextChecks.push('review vomiting/NG suction, diuretics, volume/chloride depletion, mineralocorticoid excess, and K/Mg');
      } else {
        primary.code = 'respiratory-alkalosis';
        primary.label = 'Primary respiratory alkalosis';
        const delta = 40 - paco2;
        const acute = 24 - 2 * delta / 10;
        const chronic = 24 - 5 * delta / 10;
        compensation.expected = { type: 'hco3', acute: Math.round(acute * 10) / 10, chronic: Math.round(chronic * 10) / 10, formula: 'HCO3 falls 2 (acute) or 5 (chronic) per 10 mmHg PaCO2 below 40' };
        compensation.observed = hco3;
        compensation.text = `Expected HCO3 acute ~${Math.round(acute * 10) / 10}, chronic ~${Math.round(chronic * 10) / 10}; observed ${hco3}.`;
        if (hco3 > acute + 2) {
          compensation.text += ' Higher than expected: concurrent metabolic alkalosis or early/uncompensated process.';
          compensation.tone = 'caution';
          compensation.verdict = 'higher-than-expected';
        } else if (hco3 < chronic - 3) {
          compensation.text += ' Lower than expected: concurrent metabolic acidosis.';
          compensation.tone = 'danger';
          compensation.verdict = 'lower-than-expected';
        } else {
          compensation.tone = 'ok';
          compensation.verdict = 'appropriate';
        }
        nextChecks.push('look for hypoxemia, pain/anxiety, sepsis, pregnancy, liver disease, PE, or salicylates');
      }
    } else if (nearNormal) {
      if (hco3 < 22 && paco2 < 35) {
        primary.code = 'near-normal-metabolic-acidosis-respiratory-alkalosis';
        primary.label = 'Near-normal pH with metabolic acidosis + respiratory alkalosis pattern';
        compensation.text = 'Both HCO3 and PaCO2 are low; this may be mixed rather than simply compensated.';
        compensation.tone = 'danger';
        compensation.verdict = 'mixed';
        nextChecks.push('consider sepsis, salicylates, liver disease, pregnancy, or mixed shock physiology');
      } else if (hco3 > 26 && paco2 > 45) {
        primary.code = 'near-normal-metabolic-alkalosis-respiratory-acidosis';
        primary.label = 'Near-normal pH with metabolic alkalosis + respiratory acidosis pattern';
        compensation.text = 'Both HCO3 and PaCO2 are high; consider chronic CO2 retention plus alkalosis, or compensated respiratory acidosis.';
        compensation.tone = 'caution';
        compensation.verdict = 'mixed';
        nextChecks.push('review chronic hypercapnia, diuretics, vomiting/NG suction, chloride depletion, and volume status');
      } else if (hco3 < 22) {
        primary.code = 'compensated-metabolic-acidosis';
        primary.label = 'Compensated metabolic acidosis or mixed near-normal pattern';
      } else if (hco3 > 26) {
        primary.code = 'compensated-metabolic-alkalosis';
        primary.label = 'Compensated metabolic alkalosis or mixed near-normal pattern';
      } else if (paco2 > 45) {
        primary.code = 'compensated-respiratory-acidosis';
        primary.label = 'Compensated respiratory acidosis or mixed near-normal pattern';
      } else if (paco2 < 35) {
        primary.code = 'compensated-respiratory-alkalosis';
        primary.label = 'Compensated respiratory alkalosis or mixed near-normal pattern';
      }
    }

    const anionGap = { available: false, ag: null, corrected: null, albumin: alb, deltaRatio: null, pattern: null, text: 'Enter Na, Cl, and HCO3 to calculate anion gap.', deltaText: '', tone: 'note' };
    if (na && cl && hco3) {
      const ag = na - cl - hco3;
      const corrAg = ag + 2.5 * (4 - alb);
      anionGap.available = true;
      anionGap.ag = Math.round(ag * 10) / 10;
      anionGap.corrected = Math.round(corrAg * 10) / 10;
      anionGap.tone = corrAg > 12 ? 'caution' : 'ok';
      anionGap.text = `AG ${Math.round(ag * 10) / 10}, albumin-corrected ${Math.round(corrAg * 10) / 10} (Alb ${alb}).`;
      const highGapCheck = 'high AG: consider lactate, ketones, renal failure/uremia, toxins, salicylate, medication causes';
      const normalGapCheck = 'normal-gap acidosis: check diarrhea, renal tubular acidosis, saline load, acetazolamide, urinary diversion';
      // The delta ratio, not the raw corrected-AG threshold, decides which differential is
      // pushed: a low ratio means the HCO3 drop is not explained by the AG rise.
      if (hco3 < 24 && corrAg > 12) {
        const deltaRatio = (corrAg - 12) / (24 - hco3);
        const roundedDelta = Math.round(deltaRatio * 100) / 100;
        anionGap.deltaRatio = roundedDelta;
        if (deltaRatio < 0.4) {
          anionGap.pattern = 'normal-gap-predominant';
          anionGap.deltaText = `Delta ratio ${roundedDelta}: AG is mildly elevated, but the HCO3 drop is out of proportion to it -- predominant normal-gap (hyperchloremic) component.`;
          nextChecks.push(normalGapCheck);
        } else if (deltaRatio < 1) {
          anionGap.pattern = 'mixed-high-and-normal-gap';
          anionGap.deltaText = `Delta ratio ${roundedDelta}: mixed high-gap + normal-gap metabolic acidosis pattern.`;
          nextChecks.push(highGapCheck);
          nextChecks.push(normalGapCheck);
        } else if (deltaRatio <= 2) {
          anionGap.pattern = 'high-gap';
          anionGap.deltaText = `Delta ratio ${roundedDelta}: high anion gap metabolic acidosis pattern.`;
          nextChecks.push(highGapCheck);
        } else {
          anionGap.pattern = 'high-gap-plus-alkalosis';
          anionGap.deltaText = `Delta ratio ${roundedDelta}: high-gap acidosis plus metabolic alkalosis or chronic elevated bicarbonate pattern.`;
          nextChecks.push(highGapCheck);
        }
      } else if (hco3 < 22 && corrAg <= 12) {
        anionGap.pattern = 'normal-gap';
        anionGap.deltaText = 'Normal anion gap metabolic acidosis pattern: review diarrhea, RTA, saline load, ureteral diversion, acetazolamide.';
        nextChecks.push(normalGapCheck);
      } else if (corrAg > 12) {
        // Elevated AG without a concurrent metabolic acidosis to compute a delta ratio against.
        anionGap.pattern = 'elevated-without-acidosis';
        nextChecks.push(highGapCheck);
      } else {
        anionGap.pattern = 'normal';
      }
    }

    if (ph < 7.2 || ph > 7.55) nextChecks.push('severe pH derangement: reassess clinically and escalate if unstable');
    if (!nextChecks.length) nextChecks.push('correlate with clinical context and repeat if values do not fit the patient');

    let severity = 'warn';
    if (compensation.tone === 'danger' || ph < 7.2 || ph > 7.55) severity = 'danger';
    else if (compensation.tone === 'ok' && anionGap.tone === 'ok' && ph >= 7.35 && ph <= 7.45 && hco3 >= 22 && hco3 <= 26 && paco2 >= 35 && paco2 <= 45) severity = 'success';

    return {
      inputs: { ph, paco2, hco3, na: na || null, cl: cl || null, alb },
      phClass: acidemia ? 'acidemia' : alkalemia ? 'alkalemia' : 'normal',
      primary,
      compensation,
      anionGap,
      nextChecks: Array.from(new Set(nextChecks)),
      severity,
    };

}

function osmolarGap(input) {

    const values = input && typeof input === 'object' ? input : {};
    const entered = (value) => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
    const na = Number(values.sodium);
    const glu = Number(values.glucose);
    const bun = Number(values.bun);
    const measuredEntered = entered(values.measuredOsm);
    const measured = measuredEntered ? Number(values.measuredOsm) : null;
    if (!entered(values.sodium) || !entered(values.glucose) || !entered(values.bun)
      || !Number.isFinite(na) || na === 0 || !Number.isFinite(glu) || !Number.isFinite(bun)
      || measuredEntered && !Number.isFinite(measured)) return null;
    const calculated = Math.round(2 * na + glu / 18 + bun / 2.8);
    const result = { sodium: na, glucose: glu, bun, calculated, measured, gap: null, gapElevated: false, tone: (calculated >= 275 && calculated <= 295) ? 'success' : 'warn', text: `Calculated Osm: ${calculated} mOsm/kg` };
    if (measuredEntered) {
      result.gap = Math.round(measured - calculated);
      result.text += ` | Osmolar Gap: ${result.gap}`;
      if (result.gap > 10) { result.text += ' (elevated — consider toxic alcohols)'; result.tone = 'danger'; result.gapElevated = true; }
    }
    return result;

}

function urineAnionGap(input) {

    const una = Number(input && input.urineSodium);
    const uk = Number(input && input.urinePotassium);
    const ucl = Number(input && input.urineChloride);
    if (!Number.isFinite(una) || !Number.isFinite(uk) || !Number.isFinite(ucl) || !(input && input.urineSodium !== '' && input.urinePotassium !== '' && input.urineChloride !== '')) return null;
    const uag = Math.round(una + uk - ucl);
    const caveats = [];
    if (una < 25) caveats.push('Urine Na below 25 mEq/L limits NH4+ excretion regardless of cause; the gap is unreliable.');
    caveats.push('Not valid with unmeasured urinary anions (ketonuria, toluene/hippurate, penicillins) or bicarbonaturia; consider the urine osmolar gap instead.');
    caveats.push('Interpret only in a normal-gap metabolic acidosis; it does not classify high-gap acidosis.');
    let read = 'indeterminate';
    let label = `UAG ${uag}: near zero, indeterminate`;
    let text = 'A near-zero gap does not separate renal from extrarenal causes; use the urine osmolar gap or repeat with a fresh sample.';
    let tone = 'warn';
    if (uag < -10) {
      read = 'negative';
      label = `UAG ${uag}: negative`;
      text = 'Negative gap implies intact renal NH4+ excretion: gastrointestinal bicarbonate loss (diarrhea, fistula, ureteral diversion) or acid load with a renal response.';
      tone = 'success';
    } else if (uag > 10) {
      read = 'positive';
      label = `UAG ${uag}: positive`;
      text = 'Positive gap implies impaired renal NH4+ excretion: distal (type 1) renal tubular acidosis, hypoaldosteronism / type 4 RTA, or reduced nephron mass.';
      tone = 'warn';
    }
    return { urineSodium: una, urinePotassium: uk, urineChloride: ucl, uag, read, label, text, caveats, tone };

}

function metabolicAlkalosisUrineChloride(input) {

    const ucl = Number(input && input.urineChloride);
    if (!(input && input.urineChloride !== '' && input.urineChloride !== null && input.urineChloride !== undefined) || !Number.isFinite(ucl)) return null;
    const diuretics = input && typeof input.diuretics === 'string' ? input.diuretics : 'unknown';
    const bloodPressure = input && typeof input.bloodPressure === 'string' ? input.bloodPressure : 'unknown';
    const caveats = [];
    let subRead = null;
    let read = 'indeterminate';
    let label = `Urine Cl ${ucl}: 20-40 mEq/L, indeterminate`;
    let text = 'Repeat with volume status, blood pressure, potassium and medication review; neither category is established.';
    let tone = 'warn';
    if (ucl < 20) {
      read = 'chloride-responsive';
      label = `Urine Cl ${ucl}: below 20 mEq/L, chloride-responsive`;
      text = 'Chloride depletion pattern: vomiting or nasogastric loss, remote diuretic use, post-hypercapnia, villous adenoma, or low chloride intake. Expected to correct with chloride (saline) repletion when volume permits.';
      tone = 'success';
    } else if (ucl > 40) {
      read = 'chloride-resistant';
      label = `Urine Cl ${ucl}: above 40 mEq/L, chloride-resistant`;
      if (bloodPressure === 'high') {
        subRead = 'mineralocorticoid-excess';
        text = 'Chloride-resistant with hypertension: suspect mineralocorticoid excess (primary aldosteronism, Cushing syndrome, exogenous mineralocorticoid, Liddle syndrome). Assess potassium and renin/aldosterone; saline alone is not expected to correct it.';
      } else if (bloodPressure === 'normal-low') {
        subRead = 'normotensive-resistant';
        text = 'Chloride-resistant with normal or low blood pressure: current diuretic use, Bartter or Gitelman syndrome, or severe potassium/magnesium depletion. Saline alone is not expected to correct it.';
      } else {
        subRead = 'blood-pressure-unknown';
        text = 'Chloride-resistant pattern: current diuretic use, mineralocorticoid excess (primary aldosteronism, Cushing, exogenous), severe potassium depletion, Bartter or Gitelman syndrome, or alkali load. Blood pressure separates the hypertensive (mineralocorticoid) from the normotensive (Bartter/Gitelman, diuretic) causes; saline alone is not expected to correct it.';
      }
      tone = 'warn';
    }
    caveats.push('Alkali gain (milk-alkali syndrome, absorbable antacids, bicarbonate or citrate load, massive transfusion) can cause alkalosis at any urine chloride; review calcium and alkali intake.');
    if (diuretics === 'current') caveats.push('Current diuretic use raises urine chloride; a value above 40 does not exclude a chloride-responsive alkalosis. Reassess after the diuretic effect wanes.');
    if (diuretics === 'unknown') caveats.push('Confirm diuretic exposure and timing; it changes the interpretation of an elevated urine chloride.');
    caveats.push('Urine sodium is unreliable here because bicarbonaturia obligates sodium loss; chloride is the volume marker.');
    return { urineChloride: ucl, diuretics, bloodPressure, read, subRead, label, text, caveats, tone };

}

// Maintained portal renderer, mechanically extracted at bundle-build time.
function renderABGResult(result) {

  const { inputs, primary, compensation, anionGap, nextChecks } = result;
  return (
    '<div class="acidbase-result-main">' +
      `<div class="acidbase-chip"><strong>Primary</strong>${primary.label}. pH ${inputs.ph}, PaCO2 ${inputs.paco2}, HCO3 ${inputs.hco3}.</div>` +
      `<div class="acidbase-chip"><strong>Compensation</strong>${compensation.text}</div>` +
      `<div class="acidbase-chip"><strong>Anion gap</strong>${anionGap.text}${anionGap.deltaText ? ' ' + anionGap.deltaText : ''}</div>` +
    '</div>' +
    '<div class="acidbase-guide">' +
      '<strong>Next checks:</strong>' +
      `<ul>${nextChecks.map((item) => `<li>${item}</li>`).join('')}</ul>` +
    '</div>'
  );

}

/**
 * Pure wrapper around the source interpretation. Required: ph, paco2, hco3.
 * Optional: na and cl together for anion gap; alb defaults explicitly to 4.0 g/dL.
 * It neither persists nor transmits supplied values.
 */
export function computeABG(input = {}) {
  const requiredIssues = [];
  const ph = parseValue(input.ph, 'ph', true, requiredIssues);
  const paco2 = parseValue(input.paco2, 'paco2', true, requiredIssues);
  const hco3 = parseValue(input.hco3, 'hco3', true, requiredIssues);
  if (requiredIssues.length) {
    const status = requiredIssues.some((issue) => issue.code !== 'required') ? 'invalid' : 'incomplete';
    return { status, issues: requiredIssues, source: ABG_SOURCE };
  }

  const optionalIssues = [];
  const na = parseValue(input.na, 'na', false, optionalIssues);
  const cl = parseValue(input.cl, 'cl', false, optionalIssues);
  const enteredAlbumin = parseValue(input.alb, 'alb', false, optionalIssues);
  if (optionalIssues.length) return { status: 'invalid', issues: optionalIssues, source: ABG_SOURCE };

  const alb = enteredAlbumin === null ? 4.0 : enteredAlbumin;
  const assumptions = enteredAlbumin === null ? [{
    field: 'alb',
    value: 4.0,
    reason: 'Albumin was not entered; the original calculator uses 4.0 g/dL for corrected anion-gap calculation.',
  }] : [];
  const inputNotices = (na === null) !== (cl === null)
    ? ['Enter both Na and Cl to calculate an anion gap.']
    : [];

  const interpretation = interpretABG({ ph, paco2, hco3, na, cl, alb });
  const html = renderABGResult(interpretation);
  return {
    status: 'ok',
    source: ABG_SOURCE,
    inputs: { ph, paco2, hco3, na, cl, alb: enteredAlbumin, albuminUsed: alb },
    assumptions,
    inputNotices,
    interpretation,
    html,
    text: textFromHtml(html),
    className: 'calc-result rich ' + interpretation.severity,
    severity: interpretation.severity,
  };
}

function workup(fields, compute) {
  return (input = {}) => {
    const issues = [];
    const values = {};
    for (const [key, required] of fields) values[key] = parseValue(input[key], key, required, issues);
    if (issues.length) return { status: issues.some((issue) => issue.code !== 'required') ? 'invalid' : 'incomplete', issues, source: ABG_SOURCE };
    const result = compute(values, input);
    if (!result) return { status: 'incomplete', issues: [], source: ABG_SOURCE };
    return { status: 'ok', source: ABG_SOURCE, result };
  };
}

/** Calculated osmolality and osmolar gap. Required: na, glucose, bun; optional measuredOsm. */
export const computeOsmolarGap = workup([['na', true], ['glucose', true], ['bun', true], ['measuredOsm', false]],
  (v) => osmolarGap({ sodium: v.na, glucose: v.glucose, bun: v.bun, measuredOsm: v.measuredOsm }));

/** Urine anion gap. Required: urineSodium, urinePotassium, urineChloride. */
export const computeUrineAnionGap = workup([['urineSodium', true], ['urinePotassium', true], ['urineChloride', true]],
  (v) => urineAnionGap(v));

/** Metabolic alkalosis urine chloride. Required: urineChloride; optional diuretics ('unknown' | 'none' | 'remote' | 'current') and bloodPressure ('unknown' | 'high' | 'normal-low'). */
export const computeAlkalosisUrineChloride = workup([['urineChloride', true]],
  (v, raw) => metabolicAlkalosisUrineChloride({
    urineChloride: v.urineChloride,
    diuretics: typeof raw.diuretics === 'string' ? raw.diuretics : 'unknown',
    bloodPressure: typeof raw.bloodPressure === 'string' ? raw.bloodPressure : 'unknown',
  }));

export function formatABGText(result) {
  return result && result.status === 'ok' ? result.text : '';
}
