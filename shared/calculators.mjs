// Maintained public source, initially extracted from Mediport Medical.
// See UPSTREAM_PROVENANCE.json for original source hashes and extraction notes.
// Public profile omits captured product identities and uncleared ECG images; the
// module-local `window` receives what they attach to the browser global. The
// registry block is extracted by function body from portal-calculator-registry.js.

export const CALCULATOR_SOURCES = Object.freeze({
  formulas: Object.freeze({ originalFile: "portal/static/js/portal-calculator-formulas.js", sha256: "e88b0249743ec68c90050e0a19212aef81c6d31900939f9a8d4ed3ae28d1b6de" }),
  scores: Object.freeze({ originalFile: "portal/static/js/portal-calculator-scores.js", sha256: "c5bea5ed02017796edabeeb86f093102f5aca49a4cb7daa729e4ab72e28bfe95" }),
  cockcroftGault: Object.freeze({ originalFile: "portal/static/js/portal-cockcroft-gault.js", sha256: "e6a7f41454c991ad7b140070c19ca4e641204b299b223223c5113331b53d1cf6" }),
  ekgEngine: Object.freeze({ originalFile: "portal/static/js/portal-ekg-engine.js", sha256: "b38e19dff0d25cc69830ae44d17f9d15cda360f5e09de97b5069029d32649e2b" }),
  registry: Object.freeze({ originalFile: 'portal/static/js/portal-calculator-registry.js', sha256: "c1e07bb498d59a3663d3f642b4614ff21232d05f0cb252a6490026f323f7cecb", functions: ["correctedSodium","sodiumFreeWater","hyponatremia"] }),
});

const window = {};

// ---- portal/static/js/portal-calculator-formulas.js ----
// DOM-independent clinical formulas shared by the desktop Calculator cards and
// Mediport Pocket (copied byte-for-byte at pack build). Each function takes plain
// values and returns structured codes plus the substituted arithmetic, so a
// renderer can list every branch and light the fired one without re-deriving a
// threshold. Missing required inputs return null; nothing here reads the DOM.
//
// Kept separate from portal-calculator-registry.js on purpose: the registry
// carries the management-guide pathway evaluators, which another workstream
// edits. Load this file before portal-calculators.js.
(function initCalculatorFormulas(global) {
  'use strict';

  const FORMULAS_VERSION = 'calculator-formulas-v5';
  // Scores live in portal-calculator-scores.js (CALCULATOR_SCORES), loaded next to this file.

  const num = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const round = (value, digits = 1) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };
  const formulaSex = (value) => {
    const text = String(value || '').trim().toUpperCase();
    return text === 'M' || text === 'F' ? text : null;
  };

  // ---------------------------------------------------------------------------
  // eGFR — CKD-EPI 2021 creatinine equation (race-free).
  // Inker LA et al. N Engl J Med 2021;385:1737-49. doi:10.1056/NEJMoa2102953
  // GFR categories: KDIGO 2012 CKD guideline. doi:10.1038/kisup.2012.73
  // ---------------------------------------------------------------------------
  const GFR_STAGES = Object.freeze([
    { code: 'G1', label: 'Normal or high', min: 90, max: null },
    { code: 'G2', label: 'Mildly decreased', min: 60, max: 90 },
    { code: 'G3a', label: 'Mildly to moderately decreased', min: 45, max: 60 },
    { code: 'G3b', label: 'Moderately to severely decreased', min: 30, max: 45 },
    { code: 'G4', label: 'Severely decreased', min: 15, max: 30 },
    { code: 'G5', label: 'Kidney failure', min: 0, max: 15 },
  ]);

  function egfrCkdEpi2021({ creatinine, age, sex }) {
    const cr = num(creatinine);
    const years = num(age);
    const fs = formulaSex(sex);
    if (cr === null || cr <= 0 || years === null || years <= 0 || !fs) return null;
    const kappa = fs === 'F' ? 0.7 : 0.9;
    const alpha = fs === 'F' ? -0.241 : -0.302;
    const sexFactor = fs === 'F' ? 1.012 : 1;
    const ratio = cr / kappa;
    const egfr = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.2) * Math.pow(0.9938, years) * sexFactor;
    const value = round(egfr, 1);
    const stage = GFR_STAGES.find((s) => value >= s.min && (s.max === null || value < s.max)) || GFR_STAGES[GFR_STAGES.length - 1];
    const caveats = [
      'Indexed to 1.73 m² body surface area; it is not a Cockcroft-Gault creatinine clearance and the two are not interchangeable for drug tables.',
      'Assumes steady-state creatinine. Not valid during acute kidney injury or a rapidly changing creatinine.',
      'Creatinine-based estimates are biased by muscle mass (cachexia, amputation, bodybuilding), diet and some drugs (trimethoprim, cimetidine).',
    ];
    if (years < 18) caveats.push('CKD-EPI 2021 is an adult equation; use a paediatric equation below 18 years.');
    if (value >= 60) caveats.push('A single eGFR ≥ 60 does not establish or exclude CKD; the G category needs albuminuria and chronicity for staging.');
    return {
      formula: 'eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1.200 × 0.9938^age × 1.012 [if female]',
      inputs: { creatinine: cr, age: years, sex: fs },
      kappa,
      alpha,
      sexFactor,
      egfr: value,
      unit: 'mL/min/1.73 m²',
      stage: { code: stage.code, label: stage.label, min: stage.min, max: stage.max },
      stages: GFR_STAGES,
      severity: value >= 60 ? 'success' : value >= 30 ? 'warn' : 'danger',
      caveats,
    };
  }

  // ---------------------------------------------------------------------------
  // Anion gap, albumin correction and delta ratio. Conventions match interpretABG
  // in portal-calculator-registry.js (expected AG 12, +2.5 per g/dL albumin below
  // 4, delta ratio = (corrected AG − 12) / (24 − HCO₃⁻)).
  // Figge J et al. Crit Care Med 1998;26:1807-10 (albumin correction).
  // Berend K et al. N Engl J Med 2014;371:1434-45 (delta ratio bands).
  // ---------------------------------------------------------------------------
  function anionGap({ sodium, chloride, bicarbonate, albumin }) {
    const na = num(sodium);
    const cl = num(chloride);
    const hco3 = num(bicarbonate);
    if (na === null || cl === null || hco3 === null) return null;
    const albEntered = num(albumin);
    const albuminAssumed = albEntered === null;
    const alb = albuminAssumed ? 4 : albEntered;
    const ag = na - cl - hco3;
    const corrected = ag + 2.5 * (4 - alb);
    const gapRead = corrected > 12 ? 'high' : 'normal';
    let deltaRatio = null;
    let pattern = 'normal';
    if (hco3 < 24 && corrected > 12) {
      deltaRatio = round((corrected - 12) / (24 - hco3), 2);
      pattern = deltaRatio < 0.4 ? 'normal-gap-predominant' : deltaRatio < 1 ? 'mixed-high-and-normal-gap' : deltaRatio <= 2 ? 'high-gap' : 'high-gap-plus-alkalosis';
    } else if (hco3 < 22 && corrected <= 12) {
      pattern = 'normal-gap';
    } else if (corrected > 12) {
      pattern = 'elevated-without-acidosis';
    }
    const caveats = [
      'The delta ratio is only meaningful when a high-gap acidosis is present (corrected AG > 12 and HCO₃⁻ < 24); it assumes a baseline AG of 12 and HCO₃⁻ of 24.',
      'Bicarbonate here is the chemistry HCO₃⁻; pair with a blood gas for the pH and compensation.',
    ];
    if (albuminAssumed) caveats.push('Albumin was not entered; 4.0 g/dL was assumed. Hypoalbuminaemia lowers the observed gap by about 2.5 per g/dL and can hide a high-gap acidosis.');
    if (na > 0 && (cl > na || hco3 > na)) caveats.push('Chloride or bicarbonate exceeds sodium; check the units and the sample.');
    return {
      formula: 'AG = Na⁺ − (Cl⁻ + HCO₃⁻) · corrected AG = AG + 2.5 × (4.0 − albumin) · Δ ratio = (corrected AG − 12) / (24 − HCO₃⁻)',
      inputs: { sodium: na, chloride: cl, bicarbonate: hco3, albumin: alb },
      albuminAssumed,
      ag: round(ag, 1),
      correctedAg: round(corrected, 1),
      gapRead,
      deltaGap: round(corrected - 12, 1),
      deltaBicarbonate: round(24 - hco3, 1),
      deltaRatio,
      pattern,
      severity: pattern === 'normal' ? 'success' : pattern === 'elevated-without-acidosis' || pattern === 'normal-gap' ? 'warn' : 'danger',
      caveats,
    };
  }

  // ---------------------------------------------------------------------------
  // Albumin-corrected calcium (Payne). Payne RB et al. BMJ 1973;4:643-6.
  // Reference range 8.5–10.5 mg/dL as used by the desktop card.
  // ---------------------------------------------------------------------------
  function correctedCalcium({ calcium, albumin }) {
    const ca = num(calcium);
    const alb = num(albumin);
    if (ca === null || ca <= 0 || alb === null || alb < 0) return null;
    const correction = 0.8 * (4 - alb);
    const corrected = ca + correction;
    const value = round(corrected, 1);
    const read = value < 8.5 ? 'low' : value > 10.5 ? 'high' : 'normal';
    const caveats = [
      'Ionised calcium is the reference when it matters (critical illness, pH disturbance, transfusion, kidney failure, paraproteinaemia); the Payne correction performs poorly in those settings.',
      'Units: total calcium in mg/dL and albumin in g/dL. Multiply mmol/L calcium by 4.0 to convert.',
    ];
    if (alb >= 4) caveats.push('Albumin is at or above 4.0 g/dL, so the correction is zero or negative; measured calcium already reflects the free fraction.');
    return {
      formula: 'corrected Ca = measured Ca + 0.8 × (4.0 − albumin)',
      inputs: { calcium: ca, albumin: alb },
      correction: round(correction, 2),
      corrected: value,
      unit: 'mg/dL',
      range: { min: 8.5, max: 10.5 },
      read,
      severity: read === 'normal' ? 'success' : read === 'high' ? 'danger' : 'warn',
      caveats,
    };
  }

  // ---------------------------------------------------------------------------
  // NEWS2 — Royal College of Physicians, National Early Warning Score 2 (2017),
  // SpO₂ Scale 1. Escalation bands: 0–4 low; 3 in any single parameter
  // low-medium; 5–6 medium; ≥ 7 high.
  // https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/
  // Totals agree with calculateNews2 in portal-calculator-registry.js.
  // ---------------------------------------------------------------------------
  const NEWS2_ITEMS = Object.freeze([
    { key: 'respiratoryRate', label: 'Respiration rate', unit: '/min', bands: [[8, 3], [11, 1], [20, 0], [24, 2], [Infinity, 3]], scale: '≤8 → 3 · 9–11 → 1 · 12–20 → 0 · 21–24 → 2 · ≥25 → 3' },
    { key: 'spo2', label: 'SpO₂ (Scale 1)', unit: '%', bands: [[91, 3], [93, 2], [95, 1], [Infinity, 0]], scale: '≤91 → 3 · 92–93 → 2 · 94–95 → 1 · ≥96 → 0' },
    { key: 'supplementalOxygen', label: 'Air or oxygen', unit: '', choice: { no: 0, yes: 2 }, scale: 'air → 0 · any supplemental oxygen → 2' },
    { key: 'temperature', label: 'Temperature', unit: '°C', bands: [[35, 3], [36, 1], [38, 0], [39, 1], [Infinity, 2]], scale: '≤35.0 → 3 · 35.1–36.0 → 1 · 36.1–38.0 → 0 · 38.1–39.0 → 1 · ≥39.1 → 2' },
    { key: 'systolicBp', label: 'Systolic BP', unit: 'mmHg', bands: [[90, 3], [100, 2], [110, 1], [219, 0], [Infinity, 3]], scale: '≤90 → 3 · 91–100 → 2 · 101–110 → 1 · 111–219 → 0 · ≥220 → 3' },
    { key: 'heartRate', label: 'Pulse', unit: '/min', bands: [[40, 3], [50, 1], [90, 0], [110, 1], [130, 2], [Infinity, 3]], scale: '≤40 → 3 · 41–50 → 1 · 51–90 → 0 · 91–110 → 1 · 111–130 → 2 · ≥131 → 3' },
    { key: 'consciousness', label: 'Consciousness', unit: '', choice: { alert: 0, cvpu: 3 }, scale: 'alert → 0 · new confusion, voice, pain or unresponsive → 3' },
  ]);
  const NEWS2_BANDS = Object.freeze([
    { code: 'low', label: 'Low', rule: 'aggregate 0–4', response: 'Continue routine monitoring; minimum 12-hourly observations.' },
    { code: 'low-medium', label: 'Low–medium', rule: '3 in any single parameter', response: 'Urgent ward-based review by a clinician competent to assess acute illness; minimum hourly observations.' },
    { code: 'medium', label: 'Medium', rule: 'aggregate 5–6', response: 'Urgent review by a clinician or team competent in acute illness; consider critical-care outreach; minimum hourly observations.' },
    { code: 'high', label: 'High', rule: 'aggregate ≥ 7', response: 'Emergency assessment by a team with critical-care competencies, usually in a higher-level care area; continuous monitoring.' },
  ]);

  function news2Points(item, raw) {
    if (item.choice) {
      const key = String(raw || '').trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(item.choice, key) ? { value: key, points: item.choice[key] } : null;
    }
    const value = num(raw);
    if (value === null) return null;
    const band = item.bands.find(([upper]) => value <= upper);
    return { value, points: band[1] };
  }

  function news2(input) {
    const values = input && typeof input === 'object' ? input : {};
    const items = [];
    for (const item of NEWS2_ITEMS) {
      const scored = news2Points(item, values[item.key]);
      if (!scored) return null;
      items.push({ key: item.key, label: item.label, unit: item.unit, scale: item.scale, value: scored.value, points: scored.points });
    }
    const total = items.reduce((sum, item) => sum + item.points, 0);
    const singleParameterThree = items.some((item) => item.points === 3);
    const band = total >= 7 ? 'high' : total >= 5 ? 'medium' : singleParameterThree ? 'low-medium' : 'low';
    const bandInfo = NEWS2_BANDS.find((b) => b.code === band);
    const caveats = [
      'Scale 1 SpO₂ scoring. Use Scale 2 only for patients with a confirmed hypercapnic respiratory failure target of 88–92%, and only when that has been prescribed.',
      'NEWS2 supports, never replaces, clinical judgement; escalate any patient who worries you regardless of the score.',
      'Not validated in children under 16 or in pregnancy.',
    ];
    if (values.supplementalOxygen === 'yes') caveats.push('Supplemental oxygen scores 2 regardless of flow or device; record the device and flow alongside the score.');
    return {
      inputs: Object.fromEntries(items.map((item) => [item.key, item.value])),
      items,
      total,
      singleParameterThree,
      band,
      bandLabel: bandInfo.label,
      response: bandInfo.response,
      bands: NEWS2_BANDS,
      severity: band === 'high' ? 'danger' : band === 'low' ? 'success' : 'warn',
      caveats,
    };
  }

  // ---------------------------------------------------------------------------
  // Corrected QT. Bazett: QT / √RR; Fridericia: QT / ∛RR (RR in seconds).
  // Thresholds: AHA/ACCF/HRS 2009 (Rautaharju PM et al. Circulation
  // 2009;119:e241-50, doi:10.1161/CIRCULATIONAHA.108.191096): prolonged ≥ 450 ms
  // men, ≥ 460 ms women; ≥ 500 ms markedly prolonged. Fridericia is preferred
  // outside 60–100/min because Bazett over-corrects at fast and under-corrects at
  // slow rates (Vandenberk B et al. J Am Heart Assoc 2016;5:e003264).
  // ---------------------------------------------------------------------------
  function qtc({ qtMs, heartRate, sex }) {
    const qt = num(qtMs);
    const hr = num(heartRate);
    if (qt === null || qt <= 0 || hr === null || hr <= 0) return null;
    const fs = formulaSex(sex);
    const rr = 60 / hr;
    const bazett = Math.round(qt / Math.sqrt(rr));
    const fridericia = Math.round(qt / Math.cbrt(rr));
    const preferred = hr < 60 || hr > 100 ? 'fridericia' : 'bazett';
    const value = preferred === 'fridericia' ? fridericia : bazett;
    const threshold = fs === 'M' ? 450 : 460;
    const read = value >= 500 ? 'markedly-prolonged' : value >= threshold ? 'prolonged' : fs === null && value >= 450 ? 'prolonged-if-male' : 'normal';
    const caveats = [
      'Measure QT from QRS onset to the end of the T wave (tangent method) in lead II or V5; exclude U waves. Automated QT can be wrong at low amplitude or with a flat T wave.',
      'With a wide QRS (bundle branch block, paced rhythm) the QTc overstates repolarisation; use a QRS-adjusted method or the JT interval.',
      'Irregular rhythms (atrial fibrillation) need an averaged RR over several beats.',
      'A prolonged QTc prompts review of potassium, magnesium, calcium, bradycardia and QT-prolonging drugs; it is not by itself a diagnosis.',
    ];
    if (preferred === 'fridericia') caveats.push(`Heart rate ${hr}/min is outside 60–100; Fridericia is used for the read because Bazett ${hr > 100 ? 'over' : 'under'}-corrects here.`);
    if (fs === null) caveats.push('Sex not entered: the female threshold (460 ms) was applied; 450–459 ms would already count as prolonged for a man.');
    return {
      formula: 'RR = 60 / HR · Bazett QTc = QT / √RR · Fridericia QTc = QT / ∛RR',
      inputs: { qtMs: qt, heartRate: hr, sex: fs },
      rrSeconds: round(rr, 3),
      bazett,
      fridericia,
      preferred,
      qtc: value,
      threshold,
      read,
      severity: read === 'markedly-prolonged' ? 'danger' : read === 'normal' ? 'success' : 'warn',
      caveats,
    };
  }


  // MELD and MELD-Na as implemented by OPTN/UNOS (Kamath 2001; Kim 2008
  // MELD-Na, policy since 2016): laboratory values below 1 are set to 1,
  // creatinine capped at 4 (or set to 4 with dialysis twice in the week), sodium
  // bounded 125–137, MELD(i) rounded to the tenth before the sodium term, the
  // final score rounded to a whole number and capped at 40.
  function meld({ bilirubin, creatinine, inr, sodium, dialysis }) {
    const bili = num(bilirubin);
    const cr = num(creatinine);
    const inrValue = num(inr);
    if (bili === null || cr === null || inrValue === null || bili < 0 || cr < 0 || inrValue < 0) return null;
    const onDialysis = dialysis === true || dialysis === 'yes' || dialysis === '1';
    const na = num(sodium);
    const used = {
      bilirubin: Math.max(bili, 1),
      creatinine: onDialysis ? 4 : Math.min(Math.max(cr, 1), 4),
      inr: Math.max(inrValue, 1),
      sodium: na === null ? null : Math.min(Math.max(na, 125), 137),
    };
    const meldI = Math.round((0.957 * Math.log(used.creatinine) + 0.378 * Math.log(used.bilirubin) + 1.12 * Math.log(used.inr) + 0.643) * 10) / 10 * 10;
    const meldInitial = Math.round(meldI);
    let meldNa = null;
    if (used.sodium !== null) {
      meldNa = meldI > 11 ? meldI + 1.32 * (137 - used.sodium) - 0.033 * meldI * (137 - used.sodium) : meldI;
      meldNa = Math.min(Math.round(meldNa), 40);
    }
    const score = meldNa === null ? Math.min(meldInitial, 40) : meldNa;
    const bands = [
      { code: 'low', label: 'Lower', rule: 'MELD < 15 · below the usual transplant-benefit threshold', min: 0, max: 14 },
      { code: 'intermediate', label: 'Intermediate', rule: 'MELD 15–24', min: 15, max: 24 },
      { code: 'high', label: 'High', rule: 'MELD ≥ 25 · high 90-day mortality', min: 25, max: null },
    ];
    const band = bands.find((b) => score >= b.min && (b.max === null || score <= b.max)) || bands[bands.length - 1];
    const clamps = [];
    if (bili < 1) clamps.push('bilirubin raised to 1');
    if (cr < 1) clamps.push('creatinine raised to 1');
    if (!onDialysis && cr > 4) clamps.push('creatinine capped at 4');
    if (onDialysis) clamps.push('creatinine set to 4 for dialysis');
    if (inrValue < 1) clamps.push('INR raised to 1');
    if (na !== null && na < 125) clamps.push('sodium raised to 125');
    if (na !== null && na > 137) clamps.push('sodium lowered to 137');
    const caveats = [
      'OPTN/UNOS arithmetic: values < 1 count as 1, creatinine caps at 4 (dialysis ≥ 2×/week counts as 4), sodium is bounded 125–137, the sodium term applies only when MELD(i) > 11, and the score caps at 40.',
      'MELD 3.0 (2023, adds sex and albumin) is not implemented here; check which version a transplant programme or trial uses.',
      'Not validated for acute liver failure or after TIPS in the same way; INR is unreliable on anticoagulants.',
    ];
    if (na === null) caveats.push('Sodium not entered: the score shown is MELD(i) without the sodium adjustment.');
    return {
      formula: 'MELD(i) = 10 × [0.957 ln(Cr) + 0.378 ln(bilirubin) + 1.120 ln(INR) + 0.643] · MELD-Na = MELD(i) + 1.32 × (137 − Na) − 0.033 × MELD(i) × (137 − Na)',
      inputs: { bilirubin: bili, creatinine: cr, inr: inrValue, sodium: na, dialysis: onDialysis },
      used,
      clamps,
      meldInitial,
      meldNa,
      score,
      version: meldNa === null ? 'MELD(i)' : 'MELD-Na',
      band: { code: band.code, label: band.label, rule: band.rule },
      bands,
      severity: band.code === 'high' ? 'danger' : band.code === 'intermediate' ? 'warn' : 'success',
      caveats,
    };
  }

  // ===========================================================================
  // Renal and bedside formulas (batch 3).
  // ===========================================================================

  // Fractional excretion of sodium. Espinel CH. JAMA 1976;236:579-81;
  // Miller TR et al. Ann Intern Med 1978;89:47-50. Indeterminate zone 1–2% as
  // the desktop card used.
  function fena({ serumSodium, serumCreatinine, urineSodium, urineCreatinine }) {
    const sna = num(serumSodium); const scr = num(serumCreatinine); const una = num(urineSodium); const ucr = num(urineCreatinine);
    if ([sna, scr, una, ucr].some((v) => v === null || v <= 0)) return null;
    const value = round((una * scr) / (sna * ucr) * 100, 2);
    const read = value < 1 ? 'prerenal' : value <= 2 ? 'indeterminate' : 'intrinsic';
    return {
      formula: 'FENa = (urine Na × serum Cr) / (serum Na × urine Cr) × 100',
      inputs: { serumSodium: sna, serumCreatinine: scr, urineSodium: una, urineCreatinine: ucr },
      fena: value,
      unit: '%',
      read,
      severity: read === 'prerenal' ? 'success' : read === 'indeterminate' ? 'warn' : 'danger',
      caveats: [
        'Interpretable only in oliguric AKI without diuretics: loop or thiazide diuretics, CKD, and a sodium load raise FENa despite a prerenal state; use FEUrea under diuretics.',
        'FENa < 1% also occurs in contrast nephropathy, rhabdomyolysis/pigment injury, early obstruction, acute glomerulonephritis and hepatorenal or cardiorenal syndromes.',
        'Spot urine and serum should be drawn at the same time.',
      ],
    };
  }

  // Fractional excretion of urea. Carvounis CP et al. Kidney Int 2002;62:2223-9
  // (< 35% prerenal, including under diuretics).
  function feUrea({ serumUrea, urineUrea, serumCreatinine, urineCreatinine }) {
    const su = num(serumUrea); const uu = num(urineUrea); const scr = num(serumCreatinine); const ucr = num(urineCreatinine);
    if ([su, uu, scr, ucr].some((v) => v === null || v <= 0)) return null;
    const value = round((uu * scr) / (su * ucr) * 100, 1);
    const read = value < 35 ? 'prerenal' : value <= 50 ? 'indeterminate' : 'intrinsic';
    return {
      formula: 'FEUrea = (urine urea × serum Cr) / (serum urea × urine Cr) × 100',
      inputs: { serumUrea: su, urineUrea: uu, serumCreatinine: scr, urineCreatinine: ucr },
      feUrea: value,
      unit: '%',
      read,
      severity: read === 'prerenal' ? 'success' : read === 'indeterminate' ? 'warn' : 'danger',
      caveats: [
        'Use the same units for serum and urine urea (both urea or both BUN); the ratio cancels the unit.',
        'Retains its discrimination under loop diuretics, unlike FENa; osmotic diuresis, high protein load and sepsis can still confound it.',
        'The 35–50% zone is indeterminate; > 50% favours acute tubular injury.',
      ],
    };
  }

  // Alveolar–arterial oxygen gradient at sea level (P_atm 760, P_H2O 47, R 0.8).
  // Age-expected upper limit ≈ age/4 + 4 (Mellemgaard K. Acta Physiol Scand 1966).
  function aaGradient({ fio2Percent, pao2, paco2, age }) {
    const fio2 = num(fio2Percent); const pa = num(pao2); const pc = num(paco2); const years = num(age);
    if (fio2 === null || pa === null || pc === null || fio2 <= 0 || fio2 > 100 || pa <= 0 || pc <= 0) return null;
    const pAO2 = (fio2 / 100) * (760 - 47) - pc / 0.8;
    const gradient = round(pAO2 - pa, 1);
    const expected = years !== null && years > 0 ? Math.round(years / 4 + 4) : null;
    const read = expected === null ? 'no-age' : gradient > expected ? 'elevated' : 'normal';
    const caveats = [
      'Sea-level constants (760 mmHg, water vapour 47 mmHg, respiratory quotient 0.8); altitude lowers the alveolar PO₂.',
      'FiO₂ from a nasal cannula or simple mask is an estimate; the gradient is reliable on room air or a measured FiO₂ (ventilator, Venturi).',
      'A normal gradient with hypoxaemia points to hypoventilation or low inspired oxygen; an elevated gradient to V/Q mismatch, shunt or diffusion limitation.',
    ];
    if (expected === null) caveats.push('Age not entered: the age-expected limit (≈ age/4 + 4 mmHg) could not be applied.');
    return {
      formula: 'PAO₂ = FiO₂ × (760 − 47) − PaCO₂ / 0.8 · A-a = PAO₂ − PaO₂ · expected ≈ age / 4 + 4',
      inputs: { fio2Percent: fio2, pao2: pa, paco2: pc, age: years },
      pAO2: round(pAO2, 1),
      gradient,
      unit: 'mmHg',
      expected,
      read,
      severity: read === 'elevated' ? 'warn' : 'success',
      caveats,
    };
  }

  // Mean arterial pressure. Target ≥ 65 mmHg in shock (Surviving Sepsis 2021).
  function map({ systolicBp, diastolicBp }) {
    const sbp = num(systolicBp); const dbp = num(diastolicBp);
    if (sbp === null || dbp === null || sbp <= 0 || dbp <= 0 || dbp > sbp) return null;
    const value = Math.round(dbp + (sbp - dbp) / 3);
    const read = value < 65 ? 'low' : value <= 110 ? 'normal' : 'high';
    return {
      formula: 'MAP = DBP + (SBP − DBP) / 3',
      inputs: { systolicBp: sbp, diastolicBp: dbp },
      pulsePressure: sbp - dbp,
      map: value,
      unit: 'mmHg',
      read,
      severity: read === 'low' ? 'danger' : read === 'high' ? 'warn' : 'success',
      caveats: [
        'The one-third rule assumes a normal heart rate; at tachycardia the true MAP is closer to the arithmetic mean, and an arterial line reads it directly.',
        '65 mmHg is a resuscitation floor, not a target for everyone; chronic hypertension may need more, and a lower MAP can be acceptable with preserved perfusion.',
      ],
    };
  }

  // Body mass index with WHO categories.
  function bmi({ weightKg, heightCm }) {
    const wt = num(weightKg); const ht = num(heightCm);
    if (wt === null || ht === null || wt <= 0 || ht <= 0) return null;
    const value = round(wt / Math.pow(ht / 100, 2), 1);
    const read = value < 18.5 ? 'underweight' : value < 25 ? 'normal' : value < 30 ? 'overweight' : value < 35 ? 'obese-1' : value < 40 ? 'obese-2' : 'obese-3';
    return {
      formula: 'BMI = weight (kg) / height (m)²',
      inputs: { weightKg: wt, heightCm: ht },
      bmi: value,
      unit: 'kg/m²',
      read,
      severity: read === 'normal' ? 'success' : ['underweight', 'overweight'].includes(read) ? 'warn' : 'danger',
      caveats: [
        'WHO categories; Asian-population action points are lower (overweight ≥ 23, obese ≥ 27.5 kg/m²).',
        'Does not distinguish muscle from fat and is distorted by oedema, ascites and amputation; use waist circumference or body composition where it matters.',
      ],
    };
  }

  // Harris-Benedict resting energy expenditure, Roza & Shizgal 1984 revision.
  function harrisBenedict({ weightKg, heightCm, age, sex }) {
    const wt = num(weightKg); const ht = num(heightCm); const years = num(age); const fs = formulaSex(sex);
    if (wt === null || ht === null || years === null || wt <= 0 || ht <= 0 || years <= 0 || !fs) return null;
    const ree = fs === 'M'
      ? 88.362 + 13.397 * wt + 4.799 * ht - 5.677 * years
      : 447.593 + 9.247 * wt + 3.098 * ht - 4.330 * years;
    const value = Math.round(ree);
    const activity = [
      { code: 'sedentary', label: 'Sedentary', factor: 1.2, kcal: Math.round(ree * 1.2) },
      { code: 'light', label: 'Light activity', factor: 1.375, kcal: Math.round(ree * 1.375) },
      { code: 'moderate', label: 'Moderate activity', factor: 1.55, kcal: Math.round(ree * 1.55) },
      { code: 'stress', label: 'Illness / stress 1.2–1.5', factor: null, kcal: null },
    ];
    return {
      formula: fs === 'M'
        ? 'REE = 88.362 + 13.397 × weight + 4.799 × height − 5.677 × age'
        : 'REE = 447.593 + 9.247 × weight + 3.098 × height − 4.330 × age',
      inputs: { weightKg: wt, heightCm: ht, age: years, sex: fs },
      ree: value,
      unit: 'kcal/day',
      perKg: round(ree / wt, 1),
      activity,
      severity: 'success',
      caveats: [
        'Roza & Shizgal 1984 coefficients (the desktop card previously used the 1919 originals; results differ by a few percent).',
        'Predictive equations are ±10–15% at best; indirect calorimetry is preferred in critical illness. Most ICU guidelines use 25–30 kcal/kg/day as a simpler check.',
        'Use actual weight unless BMI ≥ 30, where adjusted weight or a hypocaloric target is usual.',
      ],
    };
  }


  // ===========================================================================
  // Anemia helper: reticulocyte production index, MCV pattern, targeted-lab
  // prompts, haemolysis clues and transfusion-threshold review. RPI after
  // Hillman & Finch (maturation factor by haematocrit); restrictive threshold
  // 7 g/dL after AABB 2023. Same rules as the desktop card had inline.
  // ===========================================================================
  function anemiaMaturationFactor(hct) {
    if (!Number.isFinite(hct) || hct <= 0) return null;
    if (hct >= 36) return 1;
    if (hct >= 26) return 1.5;
    if (hct >= 16) return 2;
    return 2.5;
  }

  function anemiaHelper({ hemoglobin, hematocrit, reticPercent, mcv, sex, iron, tsat, ferritin, b12, folate, ldh, totalBilirubin, haptoglobin, context = 'stable' }) {
    const hgb = num(hemoglobin); const enteredHct = num(hematocrit); const retic = num(reticPercent); const mcvValue = num(mcv);
    if (hgb === null && enteredHct === null && retic === null && mcvValue === null) return null;
    const ironValue = num(iron); const tsatValue = num(tsat); const ferritinValue = num(ferritin); const b12Value = num(b12); const folateValue = num(folate);
    const ldhValue = num(ldh); const biliValue = num(totalBilirubin); const haptoValue = num(haptoglobin);
    const hctEstimated = enteredHct === null && hgb !== null ? round(hgb * 3, 1) : null;
    const hct = enteredHct !== null ? enteredHct : hctEstimated;
    const normalHct = formulaSex(sex) === 'F' ? 42 : 45;
    const maturation = anemiaMaturationFactor(hct);
    let rpi = null; let correctedRetic = null; let rpiRead = 'not-calculable';
    if (retic !== null && hct !== null && maturation) {
      correctedRetic = round(retic * (hct / normalHct), 1);
      rpi = round((retic * (hct / normalHct)) / maturation, 2);
      rpiRead = rpi < 2 ? 'inadequate' : rpi >= 3 ? 'appropriate' : 'borderline';
    }
    const mcvPattern = mcvValue === null ? 'not-entered' : mcvValue < 80 ? 'microcytic' : mcvValue > 100 ? 'macrocytic' : 'normocytic';
    const prompts = [];
    if (mcvPattern === 'microcytic') {
      if (ferritinValue !== null && ferritinValue < 30) prompts.push(`low ferritin ${ferritinValue}: iron deficiency pattern`);
      else if (tsatValue !== null && tsatValue < 20) prompts.push(`low TSAT ${tsatValue}%: iron-restricted erythropoiesis possible`);
      else if (ironValue !== null && ironValue < 50) prompts.push(`low iron ${ironValue}: complete ferritin/TIBC/TSAT review`);
      else prompts.push('microcytic: check ferritin, iron/TIBC/TSAT, bleeding source, inflammation/CKD context');
    } else if (mcvPattern === 'macrocytic') {
      if (b12Value !== null && b12Value < 200) prompts.push(`low B12 ${b12Value}: deficiency-compatible`);
      if (folateValue !== null && folateValue < 4) prompts.push(`low folate ${folateValue}: deficiency-compatible`);
      if (b12Value === null && folateValue === null) prompts.push('macrocytic: check B12, folate, liver/thyroid/drug/alcohol context');
    } else if (mcvPattern === 'normocytic') {
      prompts.push('normocytic: use RPI to separate hypoproliferation from bleeding/hemolysis response');
    }
    if (rpiRead === 'inadequate') prompts.push('low RPI: review iron/B12/folate, CKD/EPO deficiency, inflammation, marrow suppression, or recent onset');
    if (rpiRead === 'appropriate') prompts.push('high RPI: review bleeding or hemolysis and confirm clinical timing');
    const hemolysisClues = [
      ldhValue !== null && ldhValue >= 600 ? `LDH ${ldhValue}` : '',
      biliValue !== null && biliValue >= 2 ? `TBili ${biliValue}` : '',
      haptoValue !== null && haptoValue < 30 ? `low haptoglobin ${haptoValue}` : '',
    ].filter(Boolean);
    if (hemolysisClues.length >= 2) prompts.push(`hemolysis-compatible clues: ${hemolysisClues.join(', ')}; check smear, DAT, haptoglobin trend, and bilirubin fractionation`);
    else if (hemolysisClues.length) prompts.push(`partial hemolysis clue: ${hemolysisClues.join(', ')}; complete hemolysis labs if clinically compatible`);
    const transfusion = [];
    if (hgb !== null && hgb < 7) transfusion.push('Hgb <7: restrictive-transfusion threshold review; assess symptoms, bleeding, ischemia, volume status, and goals.');
    else if (hgb !== null && hgb < 8 && (context === 'cardiac' || context === 'symptoms')) transfusion.push('Hgb 7-8 with symptoms/bleeding/cardiac context: review transfusion threshold and urgency.');
    else if (hgb !== null && hgb < 8) transfusion.push('Hgb 7-8: monitor trend and symptoms; many stable adults use restrictive thresholds.');
    if (context === 'symptoms') transfusion.push('Active bleeding/symptoms: prioritize source control and hemodynamics, not Hgb alone.');
    if (context === 'cardiac') transfusion.push('Cardiac ischemia/high CV risk: threshold may be higher; correlate with ECG/troponin/symptoms.');
    let severity = 'warn';
    if ((hgb !== null && hgb < 7) || hemolysisClues.length >= 2) severity = 'danger';
    else if (rpiRead === 'appropriate' && (hgb === null || hgb >= 8) && !hemolysisClues.length) severity = 'success';
    return {
      formula: 'corrected retic = retic % × (Hct / normal Hct) · RPI = corrected retic / maturation factor (1.0 at Hct ≥ 36, 1.5 at 26–35, 2.0 at 16–25, 2.5 below)',
      inputs: { hemoglobin: hgb, hematocrit: enteredHct, reticPercent: retic, mcv: mcvValue, sex: formulaSex(sex), context },
      hct, hctEstimated: hctEstimated !== null, normalHct, maturation, correctedRetic, rpi, rpiRead,
      mcvPattern, prompts, hemolysisClues, transfusion, severity,
      caveats: [
        'RPI assumes a steady state; a rising reticulocyte count after acute blood loss or repletion lags by days.',
        'Hct estimated as 3 × Hgb when not entered; enter the measured value when available.',
        'Prompts order the workup; they do not diagnose. Correlate with the smear, trend and clinical context.',
      ],
    };
  }

  // ===========================================================================
  // ===========================================================================
  // Systemic glucocorticoid equivalence.
  //
  // Equivalent anti-inflammatory doses are the conventional table reproduced in
  // the major prescribing references: hydrocortisone 20 mg = prednisone or
  // prednisolone 5 mg = methylprednisolone 4 mg = dexamethasone 0.75 mg.
  //
  // This converts ANTI-INFLAMMATORY potency only. Mineralocorticoid activity and
  // duration of action are reported alongside because they do NOT convert with
  // it: swapping hydrocortisone for an equivalent dexamethasone dose removes
  // essentially all mineralocorticoid effect. Fludrocortisone is deliberately
  // absent — it is prescribed for its mineralocorticoid effect and has no place
  // in a glucocorticoid equivalence table.
  //
  // The prednisolone-equivalent daily dose is returned so the ≥20 mg/day for
  // ≥4 weeks Pneumocystis-prophylaxis and adrenal-suppression threshold can be
  // checked; that threshold is a prophylaxis trigger, never a dose target.
  // ===========================================================================
  const GLUCOCORTICOIDS = Object.freeze([
    { key: 'hydrocortisone', label: 'Hydrocortisone', equivalentDose: 20, potency: 1, mineralocorticoid: 'high', duration: 'short (8–12 h)' },
    { key: 'cortisone', label: 'Cortisone acetate', equivalentDose: 25, potency: 0.8, mineralocorticoid: 'high', duration: 'short (8–12 h)' },
    { key: 'prednisone', label: 'Prednisone', equivalentDose: 5, potency: 4, mineralocorticoid: 'low', duration: 'intermediate (12–36 h)' },
    { key: 'prednisolone', label: 'Prednisolone', equivalentDose: 5, potency: 4, mineralocorticoid: 'low', duration: 'intermediate (12–36 h)' },
    { key: 'methylprednisolone', label: 'Methylprednisolone', equivalentDose: 4, potency: 5, mineralocorticoid: 'minimal', duration: 'intermediate (12–36 h)' },
    { key: 'triamcinolone', label: 'Triamcinolone', equivalentDose: 4, potency: 5, mineralocorticoid: 'none', duration: 'intermediate (12–36 h)' },
    { key: 'dexamethasone', label: 'Dexamethasone', equivalentDose: 0.75, potency: 27, mineralocorticoid: 'none', duration: 'long (36–72 h)' },
    { key: 'betamethasone', label: 'Betamethasone', equivalentDose: 0.6, potency: 30, mineralocorticoid: 'none', duration: 'long (36–72 h)' },
  ]);
  // Internal product identities are omitted from the shared edition.
  const GLUCOCORTICOID_PRODUCTS = Object.freeze([]);
  const PROLONGED_EXPOSURE_PREDNISOLONE_MG = 20;

  function glucocorticoid(key) {
    return GLUCOCORTICOIDS.find((item) => item.key === key) || null;
  }

  function steroidEquivalence({ drug, dose, dosesPerDay = 1 }) {
    const source = glucocorticoid(String(drug || '').trim().toLowerCase());
    const singleDose = num(dose);
    const perDay = num(dosesPerDay);
    if (!source || singleDose === null || singleDose <= 0) return null;
    if (perDay === null || perDay <= 0 || perDay > 24) return null;

    const dailyDose = round(singleDose * perDay, 2);
    const conversions = GLUCOCORTICOIDS.map((target) => {
      const converted = (singleDose * target.equivalentDose) / source.equivalentDose;
      // Sub-milligram targets need two decimals to stay meaningful.
      const digits = target.equivalentDose < 1 ? 2 : 1;
      return {
        key: target.key,
        label: target.label,
        dose: round(converted, digits),
        dailyDose: round(converted * perDay, digits),
        unit: 'mg',
        mineralocorticoid: target.mineralocorticoid,
        duration: target.duration,
        isSource: target.key === source.key,
        math: `${singleDose} mg × (${target.equivalentDose} ÷ ${source.equivalentDose})`,
      };
    });
    const prednisoloneEquivalentDaily = conversions.find((item) => item.key === 'prednisolone').dailyDose;
    const hydrocortisoneEquivalentDaily = conversions.find((item) => item.key === 'hydrocortisone').dailyDose;

    const products = GLUCOCORTICOID_PRODUCTS.map((product) => {
      const converted = conversions.find((item) => item.key === product.drug);
      return {
        ...product,
        dose: converted.dose,
        units: round(converted.dose / product.strength, 2),
      };
    });

    const mineralocorticoidShift = source.mineralocorticoid !== 'high'
      ? null
      : 'Converting away from hydrocortisone or cortisone removes most or all mineralocorticoid effect. In adrenal insufficiency that matters: an equivalent dexamethasone or methylprednisolone dose does not replace it.';

    return {
      inputs: { drug: source.key, dose: singleDose, dosesPerDay: perDay },
      source,
      dailyDose,
      conversions,
      products,
      prednisoloneEquivalentDaily,
      hydrocortisoneEquivalentDaily,
      prolongedExposureThresholdMg: PROLONGED_EXPOSURE_PREDNISOLONE_MG,
      meetsProlongedExposureDose: prednisoloneEquivalentDaily >= PROLONGED_EXPOSURE_PREDNISOLONE_MG,
      mineralocorticoidShift,
      basis: 'Anti-inflammatory equivalence: hydrocortisone 20 mg = prednisolone 5 mg = methylprednisolone 4 mg = dexamethasone 0.75 mg.',
      caveats: Object.freeze([
        'Equivalence converts anti-inflammatory potency only. Mineralocorticoid activity and duration of action do not convert with it.',
        'Fludrocortisone is not on this table: it is given for mineralocorticoid effect and has no glucocorticoid equivalence use.',
        'An equivalent dose is not an interchangeable regimen. Indication, route, dosing interval and duration come from the indication’s own source.',
        `A prednisolone-equivalent of ${PROLONGED_EXPOSURE_PREDNISOLONE_MG} mg/day sustained for 4 weeks or more is the conventional Pneumocystis-prophylaxis and adrenal-suppression trigger. It is a threshold, not a target.`,
      ]),
    };
  }

  // Electrolyte replacement screen (K, Mg, phosphate, with eGFR caution). Bands
  // match the desktop card; replacement itself belongs to the management guides.
  // ===========================================================================
  const ELECTROLYTE_RULES = Object.freeze([
    { key: 'potassium', label: 'Potassium', unit: 'mmol/L', bands: [[3, 'severe-low', 'K < 3.0: severe hypokalemia review; check Mg and ECG context.'], [3.5, 'low', 'K 3.0–3.4: mild/moderate replacement review.'], [5.5, 'normal', null], [Infinity, 'high', 'K ≥ 5.5: hyperkalemia safety pathway, ECG/med review.']] },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg/dL', bands: [[1.2, 'severe-low', 'Mg < 1.2: severe hypomagnesemia review.'], [1.8, 'low', 'Mg < 1.8: replacement review, especially with low K/QT risk.'], [Infinity, 'normal', null]] },
    { key: 'phosphate', label: 'Phosphate', unit: 'mg/dL', bands: [[1, 'severe-low', 'Phos < 1.0: severe hypophosphatemia review.'], [2, 'low', 'Phos < 2.0: replacement/nutrition/refeeding review.'], [Infinity, 'normal', null]] },
  ]);
  function electrolyteScreen({ potassium, magnesium, phosphate, egfr }) {
    const inputs = { potassium: num(potassium), magnesium: num(magnesium), phosphate: num(phosphate), egfr: num(egfr) };
    if (inputs.potassium === null && inputs.magnesium === null && inputs.phosphate === null) return null;
    const items = ELECTROLYTE_RULES.filter((rule) => inputs[rule.key] !== null).map((rule) => {
      const value = inputs[rule.key];
      const band = rule.bands.find(([upper]) => value < upper);
      return { key: rule.key, label: rule.label, unit: rule.unit, value, read: band[1], note: band[2] };
    });
    const notes = items.map((item) => item.note).filter(Boolean);
    if (inputs.egfr !== null && inputs.egfr < 30) notes.unshift('eGFR < 30: use renal-adjusted replacement and repeat labs.');
    const severity = items.some((item) => ['severe-low', 'high'].includes(item.read)) ? 'danger' : items.some((item) => item.read === 'low') ? 'warn' : 'success';
    return {
      inputs, items, notes, severity,
      renalCaution: inputs.egfr !== null && inputs.egfr < 30,
      caveats: [
        'A screen for which replacement discussions to open; doses, routes and rates are in the hypokalaemia, hypomagnesaemia and hypophosphataemia management guides.',
        'Replete magnesium before or with potassium; hypomagnesaemia makes hypokalaemia refractory.',
        'Phosphate < 1.0 mg/dL or a refeeding context needs IV replacement review; check calcium and renal function first.',
      ],
    };
  }

  // ===========================================================================
  // Renal-adjustment table matching: which row of a monograph's renalAdj table a
  // Cockcroft-Gault estimate lands on, with near-cutoff and alternative-weight
  // handling. Moved from portal-drugs.js on 2026-09-22 so Pocket's drug pages
  // highlight the same row the desktop panel does.
  // ===========================================================================
  function parseRenalAdjustmentBounds(label) {
    const text = String(label || '').trim();
    if (!text || !/\d/.test(text)) return null;

    const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      return {
        min: parseFloat(rangeMatch[1]),
        max: parseFloat(rangeMatch[2]),
        inclusiveMin: true,
        inclusiveMax: true,
      };
    }

    const comparatorMatch = text.match(/^(≥|<=|≤|>=|>|<)\s*(\d+(?:\.\d+)?)/);
    if (comparatorMatch) {
      const value = parseFloat(comparatorMatch[2]);
      switch (comparatorMatch[1]) {
        case '≥':
        case '>=':
          return { min: value, max: Infinity, inclusiveMin: true, inclusiveMax: true };
        case '>':
          return { min: value, max: Infinity, inclusiveMin: false, inclusiveMax: true };
        case '≤':
        case '<=':
          return { min: -Infinity, max: value, inclusiveMin: true, inclusiveMax: true };
        case '<':
          return { min: -Infinity, max: value, inclusiveMin: true, inclusiveMax: false };
      }
    }

    return null;
  }

  function renalBoundsContainValue(bounds, value) {
    if (!bounds || value === null || value === undefined || Number.isNaN(value)) return false;
    const aboveMin = bounds.inclusiveMin ? value >= bounds.min : value > bounds.min;
    const belowMax = bounds.inclusiveMax ? value <= bounds.max : value < bounds.max;
    return aboveMin && belowMax;
  }

  function matchRenalAdjustmentRow(rows, renalEstimate) {
    if (!Array.isArray(rows) || renalEstimate === null || renalEstimate === undefined || Number.isNaN(renalEstimate)) {
      return { index: -1, message: '', tone: 'info' };
    }

    let sawSpecialRow = false;
    for (let index = 0; index < rows.length; index += 1) {
      const parsed = parseRenalAdjustmentBounds(rows[index].crcl);
      if (!parsed) {
        sawSpecialRow = true;
        continue;
      }
      if (renalBoundsContainValue(parsed, renalEstimate)) {
        return {
          index,
          tone: renalEstimate < 30 ? 'warn' : 'info',
          message: `Candidate row from confirmed Cockcroft–Gault CrCl ${renalEstimate}: ${rows[index].crcl} — ${rows[index].regimen || 'regimen not recorded'}. Verify the derivation, indication, formulation, and dosing-table source before use.`,
        };
      }
    }

    return {
      index: -1,
      tone: sawSpecialRow ? 'warn' : 'info',
      message: sawSpecialRow
        ? `Active-patient CrCl ${renalEstimate} is available, but dialysis/special renal rows are not auto-matched.`
        : `Active-patient CrCl ${renalEstimate} did not map cleanly to a renal-adjustment row.`,
    };
  }

  function buildConfirmedRenalRowPresentation(rows, review) {
    const estimate = review && review.result && review.result.estimate
      ? Number(review.result.estimate.value)
      : null;
    const base = matchRenalAdjustmentRow(rows, estimate);
    if (!Number.isFinite(estimate) || base.index < 0) return { ...base, adjacentIndices: [] };

    const adjacent = new Set();
    const alternativeValues = review.result && Array.isArray(review.result.alternatives)
      ? review.result.alternatives.map((item) => Number(item.value)).filter(Number.isFinite)
      : [];
    alternativeValues.forEach((value) => {
      const candidate = matchRenalAdjustmentRow(rows, value);
      if (candidate.index >= 0 && candidate.index !== base.index) {
        adjacent.add(base.index);
        adjacent.add(candidate.index);
      }
    });

    rows.forEach((row) => {
      const bounds = parseRenalAdjustmentBounds(row.crcl);
      if (!bounds) return;
      [bounds.min, bounds.max].filter(Number.isFinite).forEach((boundary) => {
        if (Math.abs(estimate - boundary) > Math.max(2, Math.abs(boundary) * 0.1)) return;
        const below = matchRenalAdjustmentRow(rows, boundary - 0.01);
        const above = matchRenalAdjustmentRow(rows, boundary + 0.01);
        if (below.index >= 0 && above.index >= 0 && below.index !== above.index) {
          adjacent.add(below.index);
          adjacent.add(above.index);
        }
      });
    });

    if (adjacent.size > 1) {
      const indices = [...adjacent].sort((left, right) => left - right);
      const range = review.result.range;
      const rangeText = range && range.min !== range.max
        ? ` Plausible reviewed-weight estimates span ${range.min}–${range.max} mL/min.`
        : '';
      return {
        index: -1,
        adjacentIndices: indices,
        tone: 'warn',
        message: `Confirmed Cockcroft–Gault estimate ${estimate} mL/min is near a cutoff or alternative reviewed weights cross dosing rows.${rangeText} Adjacent candidate rows are shown without selecting one; reconcile the intended weight method and exact table boundary.`,
      };
    }
    return { ...base, adjacentIndices: [] };
  }

  const api = Object.freeze({
    version: FORMULAS_VERSION,
    egfrCkdEpi2021,
    anionGap,
    correctedCalcium,
    news2,
    qtc,
    meld,
    fena,
    feUrea,
    aaGradient,
    map,
    bmi,
    harrisBenedict,
    anemiaHelper,
    electrolyteScreen,
    steroidEquivalence,
    renalTable: Object.freeze({ parseRenalAdjustmentBounds, renalBoundsContainValue, matchRenalAdjustmentRow, buildConfirmedRenalRowPresentation }),
    GLUCOCORTICOIDS,
    GLUCOCORTICOID_PRODUCTS,
    GFR_STAGES,
    NEWS2_BANDS,
  });
  global.CALCULATOR_FORMULAS = api;
})(typeof window !== 'undefined' ? window : globalThis);

// ---- portal/static/js/portal-calculator-scores.js ----
// DOM-independent clinical scores shared by the desktop Calculator cards and
// Mediport Pocket (copied byte-for-byte at pack build). Each score is data —
// items with [value, label, points] options and published bands — run through
// one tally(): an unanswered item returns null, never zero. Companion to
// portal-calculator-formulas.js; load both before portal-calculators.js.
(function initCalculatorScores(global) {
  'use strict';

  const SCORES_VERSION = 'calculator-scores-v1';
  const num = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // ===========================================================================
  // Scores. Each definition lists its items with the exact option values and
  // points; tally() maps an input object {itemKey: optionValue} onto points and
  // returns null when any item is unanswered (an unanswered item is never scored
  // as zero). Bands are the published cut-offs; the desktop cards and Pocket
  // pages render the same items and bands.
  // ===========================================================================
  const YES_NO = (points) => Object.freeze([['no', 'No', 0], ['yes', 'Yes', points]]);
  const optionValue = (raw) => (raw === null || raw === undefined ? '' : String(raw).trim());

  function tally(definition, input) {
    const values = input && typeof input === 'object' ? input : {};
    const items = [];
    for (const item of definition.items) {
      const value = optionValue(values[item.key]);
      // Option code first; the desktop selects carry the points as their values,
      // so a unique points match is accepted too ('1' → yes, '-2' → yes on Wells).
      const byPoints = item.options.filter((o) => String(o[2]) === value);
      const option = item.options.find((o) => o[0] === value) || (byPoints.length === 1 ? byPoints[0] : null);
      if (!option) return null;
      items.push({ key: item.key, label: item.label, value: option[0], optionLabel: option[1], points: option[2], hint: item.hint || null });
    }
    const total = items.reduce((sum, item) => sum + item.points, 0);
    const max = definition.items.reduce((sum, item) => sum + Math.max(...item.options.map((o) => o[2])), 0);
    return { items, total: Math.round(total * 10) / 10, max };
  }
  const bandFor = (bands, total) => bands.find((b) => total >= b.min && (b.max === null || total <= b.max)) || bands[bands.length - 1];
  const scoreResult = (definition, tallied, band, severity, caveats, extra) => ({
    id: definition.id,
    label: definition.label,
    items: tallied.items,
    total: tallied.total,
    max: tallied.max,
    band: { code: band.code, label: band.label, rule: band.rule, detail: band.detail || null },
    bands: definition.bands,
    severity,
    caveats,
    ...(extra || {}),
  });

  // CHA₂DS₂-VASc. Lip GY et al. Chest 2010;137:263-72. Annual stroke rates per
  // point as used by the desktop card (Lip 2010 / Friberg 2012 cohorts).
  const CHADS2_VASC = Object.freeze({
    id: 'chads2-vasc', label: 'CHA₂DS₂-VASc',
    items: [
      { key: 'chf', label: 'Congestive heart failure / LV dysfunction', options: YES_NO(1) },
      { key: 'hypertension', label: 'Hypertension', options: YES_NO(1) },
      { key: 'age', label: 'Age', options: [['under65', 'Under 65', 0], ['65to74', '65–74', 1], ['75plus', '75 or over', 2]] },
      { key: 'diabetes', label: 'Diabetes mellitus', options: YES_NO(1) },
      { key: 'stroke', label: 'Prior stroke, TIA or thromboembolism', options: YES_NO(2) },
      { key: 'vascular', label: 'Vascular disease (MI, PAD, aortic plaque)', options: YES_NO(1) },
      { key: 'sex', label: 'Sex', options: [['male', 'Male', 0], ['female', 'Female', 1]] },
    ],
    bands: [
      { code: 'low', label: 'Low', rule: 'score 0 (men) or 1 from sex alone (women)', min: 0, max: 0 },
      { code: 'intermediate', label: 'Intermediate', rule: 'score 1 (men) or 2 (women)', min: 1, max: 1 },
      { code: 'high', label: 'High', rule: 'score ≥ 2 (men) or ≥ 3 (women)', min: 2, max: null },
    ],
  });
  const CHADS2_VASC_ANNUAL_STROKE = Object.freeze({ 0: '0.2%', 1: '0.6%', 2: '2.2%', 3: '3.2%', 4: '4.8%', 5: '7.2%', 6: '9.7%', 7: '11.2%', 8: '10.8%', 9: '12.2%' });
  function chads2Vasc(input) {
    const t = tally(CHADS2_VASC, input);
    if (!t) return null;
    const female = t.items.find((i) => i.key === 'sex').value === 'female';
    // Female sex is a modifier, not a risk factor on its own: band on the score excluding it.
    const nonSexScore = t.total - (female ? 1 : 0);
    const band = bandFor(CHADS2_VASC.bands, nonSexScore);
    return scoreResult(CHADS2_VASC, t, band, band.code === 'high' ? 'danger' : band.code === 'intermediate' ? 'warn' : 'success', [
      'Female sex raises the score by 1 but is not a stroke risk factor on its own; the band uses the non-sex score (ESC 2020 / ACC 2023 approach).',
      'Applies to non-valvular AF. Moderate-to-severe mitral stenosis or a mechanical valve are anticoagulation indications regardless of the score.',
      'Annual stroke rates are cohort estimates without anticoagulation; individual risk varies with age and comorbidity.',
    ], { nonSexScore, annualStrokeRisk: CHADS2_VASC_ANNUAL_STROKE[t.total] || '> 12%' });
  }

  // HAS-BLED. Pisters R et al. Chest 2010;138:1093-100. ≥ 3 = high bleeding risk.
  const HAS_BLED = Object.freeze({
    id: 'has-bled', label: 'HAS-BLED',
    items: [
      { key: 'hypertension', label: 'Uncontrolled hypertension (SBP > 160 mmHg)', options: YES_NO(1) },
      { key: 'renal', label: 'Abnormal renal function (dialysis, transplant, Cr > 2.26 mg/dL)', options: YES_NO(1) },
      { key: 'liver', label: 'Abnormal liver function (cirrhosis, bilirubin > 2× ULN or AST/ALT > 3× ULN)', options: YES_NO(1) },
      { key: 'stroke', label: 'Prior stroke', options: YES_NO(1) },
      { key: 'bleeding', label: 'Prior major bleeding or bleeding predisposition', options: YES_NO(1) },
      { key: 'labileInr', label: 'Labile INR (TTR < 60%)', options: YES_NO(1) },
      { key: 'elderly', label: 'Age > 65', options: YES_NO(1) },
      { key: 'drugs', label: 'Antiplatelet or NSAID use', options: YES_NO(1) },
      { key: 'alcohol', label: 'Alcohol ≥ 8 drinks per week', options: YES_NO(1) },
    ],
    bands: [
      { code: 'low', label: 'Low', rule: 'score 0–1', min: 0, max: 1 },
      { code: 'moderate', label: 'Moderate', rule: 'score 2', min: 2, max: 2 },
      { code: 'high', label: 'High', rule: 'score ≥ 3', min: 3, max: null },
    ],
  });
  function hasBled(input) {
    const t = tally(HAS_BLED, input);
    if (!t) return null;
    const band = bandFor(HAS_BLED.bands, t.total);
    return scoreResult(HAS_BLED, t, band, band.code === 'high' ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'A high score identifies modifiable bleeding risks (blood pressure, labile INR, antiplatelets/NSAIDs, alcohol) to correct; it is not by itself a reason to withhold anticoagulation.',
      'Validated for warfarin-treated AF cohorts; applied to DOACs by extension.',
    ]);
  }

  // Wells DVT. Wells PS et al. Lancet 1997;350:1795-8 (three-level) and
  // N Engl J Med 2003;349:1227-35 (two-level).
  const WELLS_DVT = Object.freeze({
    id: 'wells-dvt', label: 'Wells score for DVT',
    items: [
      { key: 'cancer', label: 'Active cancer (treatment within 6 months or palliative)', options: YES_NO(1) },
      { key: 'paralysis', label: 'Paralysis, paresis or recent plaster immobilisation of a leg', options: YES_NO(1) },
      { key: 'bedridden', label: 'Bedridden > 3 days or major surgery within 12 weeks', options: YES_NO(1) },
      { key: 'tenderness', label: 'Localised tenderness along the deep venous system', options: YES_NO(1) },
      { key: 'legSwollen', label: 'Entire leg swollen', options: YES_NO(1) },
      { key: 'calfSwelling', label: 'Calf swelling > 3 cm versus the other leg', options: YES_NO(1) },
      { key: 'pittingEdema', label: 'Pitting oedema confined to the symptomatic leg', options: YES_NO(1) },
      { key: 'collateralVeins', label: 'Collateral superficial (non-varicose) veins', options: YES_NO(1) },
      { key: 'alternativeDiagnosis', label: 'Alternative diagnosis at least as likely as DVT', options: [['no', 'No', 0], ['yes', 'Yes', -2]] },
    ],
    bands: [
      { code: 'low', label: 'Low probability', rule: 'score ≤ 0 · ~5% prevalence', min: -Infinity, max: 0 },
      { code: 'moderate', label: 'Moderate probability', rule: 'score 1–2 · ~17%', min: 1, max: 2 },
      { code: 'high', label: 'High probability', rule: 'score ≥ 3 · ~53%', min: 3, max: null },
    ],
  });
  function wellsDvt(input) {
    const t = tally(WELLS_DVT, input);
    if (!t) return null;
    const band = bandFor(WELLS_DVT.bands, t.total);
    const twoLevel = t.total >= 2 ? 'likely' : 'unlikely';
    return scoreResult(WELLS_DVT, t, band, band.code === 'high' ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'Two-level rule: ≤ 1 DVT unlikely (D-dimer first), ≥ 2 DVT likely (proceed to ultrasound).',
      'Derived in outpatients with a first suspected DVT; less reliable in inpatients, pregnancy and prior DVT.',
    ], { twoLevel });
  }

  // Wells PE. Wells PS et al. Thromb Haemost 2000;83:416-20; two-level cut-off
  // (> 4 likely) from the Christopher study, JAMA 2006;295:172-9.
  const WELLS_PE = Object.freeze({
    id: 'wells-pe', label: 'Wells score for PE',
    items: [
      { key: 'dvtSigns', label: 'Clinical signs and symptoms of DVT', options: YES_NO(3) },
      { key: 'peMostLikely', label: 'PE is the most likely diagnosis', options: YES_NO(3) },
      { key: 'tachycardia', label: 'Heart rate > 100/min', options: YES_NO(1.5) },
      { key: 'immobilisation', label: 'Immobilisation ≥ 3 days or surgery within 4 weeks', options: YES_NO(1.5) },
      { key: 'priorVte', label: 'Previous DVT or PE', options: YES_NO(1.5) },
      { key: 'haemoptysis', label: 'Haemoptysis', options: YES_NO(1) },
      { key: 'malignancy', label: 'Malignancy (treatment within 6 months or palliative)', options: YES_NO(1) },
    ],
    bands: [
      { code: 'low', label: 'Low probability', rule: 'score < 2', min: 0, max: 1.5 },
      { code: 'moderate', label: 'Moderate probability', rule: 'score 2–6', min: 2, max: 6 },
      { code: 'high', label: 'High probability', rule: 'score > 6', min: 6.5, max: null },
    ],
  });
  function wellsPe(input) {
    const t = tally(WELLS_PE, input);
    if (!t) return null;
    const band = bandFor(WELLS_PE.bands, t.total);
    const twoLevel = t.total > 4 ? 'likely' : 'unlikely';
    return scoreResult(WELLS_PE, t, band, twoLevel === 'likely' ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'Two-level rule: ≤ 4 PE unlikely (D-dimer; age-adjusted cut-off over 50), > 4 PE likely (CT pulmonary angiography).',
      'Not validated in pregnancy; the PERC rule applies only to low-probability patients.',
    ], { twoLevel });
  }

  // CURB-65. Lim WS et al. Thorax 2003;58:377-82. 30-day mortality by score.
  const CURB65 = Object.freeze({
    id: 'curb-65', label: 'CURB-65',
    items: [
      { key: 'confusion', label: 'New confusion', options: YES_NO(1) },
      { key: 'urea', label: 'Urea > 7 mmol/L (BUN > 19 mg/dL)', options: YES_NO(1) },
      { key: 'respiratoryRate', label: 'Respiratory rate ≥ 30/min', options: YES_NO(1) },
      { key: 'bloodPressure', label: 'SBP < 90 or DBP ≤ 60 mmHg', options: YES_NO(1) },
      { key: 'age', label: 'Age ≥ 65', options: YES_NO(1) },
    ],
    bands: [
      { code: 'low', label: 'Low severity', rule: 'score 0–1 · mortality 0.7–3.2% · consider home treatment', min: 0, max: 1 },
      { code: 'moderate', label: 'Moderate severity', rule: 'score 2 · mortality ~13% · hospital-supervised treatment', min: 2, max: 2 },
      { code: 'high', label: 'High severity', rule: 'score 3–5 · mortality 17–57% · admit; 4–5 consider critical care', min: 3, max: null },
    ],
  });
  const CURB65_MORTALITY = Object.freeze({ 0: '0.7%', 1: '3.2%', 2: '13%', 3: '17%', 4: '41.5%', 5: '57%' });
  function curb65(input) {
    const t = tally(CURB65, input);
    if (!t) return null;
    const band = bandFor(CURB65.bands, t.total);
    return scoreResult(CURB65, t, band, band.code === 'high' ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'Severity, not a diagnosis: confirm community-acquired pneumonia and review oxygenation, comorbidity and social factors alongside the score.',
      'Derived for CAP in adults; performs less well in the very old, immunosuppressed and nursing-home populations.',
    ], { thirtyDayMortality: CURB65_MORTALITY[t.total] });
  }

  // qSOFA. Seymour CW et al. JAMA 2016;315:762-74 (Sepsis-3).
  const QSOFA = Object.freeze({
    id: 'qsofa', label: 'qSOFA',
    items: [
      { key: 'respiratoryRate', label: 'Respiratory rate ≥ 22/min', options: YES_NO(1) },
      { key: 'mentation', label: 'Altered mentation (GCS < 15)', options: YES_NO(1) },
      { key: 'systolicBp', label: 'Systolic BP ≤ 100 mmHg', options: YES_NO(1) },
    ],
    bands: [
      { code: 'negative', label: 'qSOFA negative', rule: 'score 0–1', min: 0, max: 1 },
      { code: 'positive', label: 'qSOFA positive', rule: 'score ≥ 2 · higher risk of poor outcome', min: 2, max: null },
    ],
  });
  function qsofa(input) {
    const t = tally(QSOFA, input);
    if (!t) return null;
    const band = bandFor(QSOFA.bands, t.total);
    return scoreResult(QSOFA, t, band, band.code === 'positive' ? 'danger' : t.total === 1 ? 'warn' : 'success', [
      'A prompt to look for organ dysfunction, not a screening test: Surviving Sepsis 2021 recommends against qSOFA alone for screening (use NEWS2 / SIRS / MEWS) because of its low sensitivity.',
      'A negative qSOFA does not exclude sepsis.',
    ]);
  }

  // SOFA. Vincent JL et al. Intensive Care Med 1996;22:707-10; mortality bands
  // after Ferreira FL et al. JAMA 2001;286:1754-8 (as the desktop card shows).
  const SOFA = Object.freeze({
    id: 'sofa', label: 'SOFA',
    items: [
      { key: 'respiration', label: 'Respiration · PaO₂/FiO₂ (mmHg)', options: [['0', '≥ 400', 0], ['1', '300–399', 1], ['2', '200–299', 2], ['3', '< 200 with ventilatory support', 3], ['4', '< 100 with ventilatory support', 4]] },
      { key: 'coagulation', label: 'Coagulation · platelets (×10³/µL)', options: [['0', '≥ 150', 0], ['1', '100–149', 1], ['2', '50–99', 2], ['3', '20–49', 3], ['4', '< 20', 4]] },
      { key: 'liver', label: 'Liver · bilirubin (mg/dL)', options: [['0', '< 1.2', 0], ['1', '1.2–1.9', 1], ['2', '2.0–5.9', 2], ['3', '6.0–11.9', 3], ['4', '≥ 12.0', 4]] },
      { key: 'cardiovascular', label: 'Cardiovascular · MAP or vasoactives (µg/kg/min)', options: [['0', 'MAP ≥ 70', 0], ['1', 'MAP < 70', 1], ['2', 'Dopamine ≤ 5 or any dobutamine', 2], ['3', 'Dopamine > 5 or epinephrine/norepinephrine ≤ 0.1', 3], ['4', 'Dopamine > 15 or epinephrine/norepinephrine > 0.1', 4]] },
      { key: 'cns', label: 'Central nervous system · GCS', options: [['0', '15', 0], ['1', '13–14', 1], ['2', '10–12', 2], ['3', '6–9', 3], ['4', '< 6', 4]] },
      { key: 'renal', label: 'Renal · creatinine (mg/dL) or urine output', options: [['0', '< 1.2', 0], ['1', '1.2–1.9', 1], ['2', '2.0–3.4', 2], ['3', '3.5–4.9 or < 500 mL/day', 3], ['4', '≥ 5.0 or < 200 mL/day', 4]] },
    ],
    bands: [
      { code: 'minimal', label: 'Minimal', rule: 'score 0–1 · mortality < 5%', min: 0, max: 1 },
      { code: 'low', label: 'Low', rule: 'score 2–6 · mortality < 10%', min: 2, max: 6 },
      { code: 'moderate', label: 'Moderate', rule: 'score 7–9 · mortality 15–20%', min: 7, max: 9 },
      { code: 'high', label: 'High', rule: 'score 10–12 · mortality 40–50%', min: 10, max: 12 },
      { code: 'very-high', label: 'Very high', rule: 'score ≥ 13 · mortality > 80% at ≥ 15', min: 13, max: null },
    ],
  });
  function sofa(input) {
    const t = tally(SOFA, input);
    if (!t) return null;
    const band = bandFor(SOFA.bands, t.total);
    return scoreResult(SOFA, t, band, ['high', 'very-high'].includes(band.code) ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'Sepsis-3 defines organ dysfunction as an acute SOFA rise of ≥ 2 points from baseline (assume 0 if unknown); the absolute total tracks severity.',
      'Mortality figures are ICU-cohort estimates for the score on admission; the trend over 48 h predicts better than a single value.',
      'Score each system with the worst value in the past 24 h; the CNS score uses the GCS without sedation where possible.',
    ]);
  }

  // Glasgow Coma Scale. Teasdale G, Jennett B. Lancet 1974;2:81-4.
  const GCS = Object.freeze({
    id: 'gcs', label: 'Glasgow Coma Scale',
    items: [
      { key: 'eye', label: 'Eye opening', options: [['4', 'Spontaneous', 4], ['3', 'To sound', 3], ['2', 'To pressure', 2], ['1', 'None', 1]] },
      { key: 'verbal', label: 'Verbal response', options: [['5', 'Oriented', 5], ['4', 'Confused', 4], ['3', 'Words', 3], ['2', 'Sounds', 2], ['1', 'None', 1]] },
      { key: 'motor', label: 'Best motor response', options: [['6', 'Obeys commands', 6], ['5', 'Localising', 5], ['4', 'Normal flexion', 4], ['3', 'Abnormal flexion', 3], ['2', 'Extension', 2], ['1', 'None', 1]] },
    ],
    bands: [
      { code: 'severe', label: 'Severe', rule: 'GCS 3–8 · airway protection likely needed', min: 3, max: 8 },
      { code: 'moderate', label: 'Moderate', rule: 'GCS 9–12', min: 9, max: 12 },
      { code: 'mild', label: 'Mild', rule: 'GCS 13–15', min: 13, max: 15 },
    ],
  });
  function gcs(input) {
    const t = tally(GCS, input);
    if (!t) return null;
    const band = bandFor(GCS.bands, t.total);
    const components = Object.fromEntries(t.items.map((i) => [i.key, i.points]));
    return scoreResult(GCS, t, band, band.code === 'severe' ? 'danger' : band.code === 'moderate' ? 'warn' : 'success', [
      'Record the three components (E V M), not just the sum; the motor score carries most of the prognostic information.',
      'Untestable components (intubation, swollen eyes, aphasia) should be recorded as NT rather than scored 1.',
      'Confounders: sedation, intoxication, hypoglycaemia, hypotension, hypothermia and post-ictal state.',
    ], { notation: `E${components.eye}V${components.verbal}M${components.motor}` });
  }

  // Child-Pugh. Pugh RN et al. Br J Surg 1973;60:646-9. One-year survival by
  // class from Infante-Rivard C et al. Hepatology 1987;7:660-4 (~100/80/45%).
  const CHILD_PUGH = Object.freeze({
    id: 'child-pugh', label: 'Child-Pugh',
    items: [
      { key: 'bilirubin', label: 'Bilirubin (mg/dL)', options: [['1', '< 2', 1], ['2', '2–3', 2], ['3', '> 3', 3]] },
      { key: 'albumin', label: 'Albumin (g/dL)', options: [['1', '> 3.5', 1], ['2', '2.8–3.5', 2], ['3', '< 2.8', 3]] },
      { key: 'inr', label: 'INR', options: [['1', '< 1.7', 1], ['2', '1.7–2.3', 2], ['3', '> 2.3', 3]] },
      { key: 'ascites', label: 'Ascites', options: [['1', 'None', 1], ['2', 'Mild or diuretic-controlled', 2], ['3', 'Moderate to severe', 3]] },
      { key: 'encephalopathy', label: 'Hepatic encephalopathy', options: [['1', 'None', 1], ['2', 'Grade 1–2 (or controlled)', 2], ['3', 'Grade 3–4 (or refractory)', 3]] },
    ],
    bands: [
      { code: 'A', label: 'Class A', rule: 'score 5–6 · one-year survival ~100%', min: 5, max: 6 },
      { code: 'B', label: 'Class B', rule: 'score 7–9 · one-year survival ~80%', min: 7, max: 9 },
      { code: 'C', label: 'Class C', rule: 'score 10–15 · one-year survival ~45%', min: 10, max: 15 },
    ],
  });
  function childPugh(input) {
    const t = tally(CHILD_PUGH, input);
    if (!t) return null;
    const band = bandFor(CHILD_PUGH.bands, t.total);
    return scoreResult(CHILD_PUGH, t, band, band.code === 'C' ? 'danger' : band.code === 'B' ? 'warn' : 'success', [
      'Ascites and encephalopathy are graded clinically and are the subjective components.',
      'Survival figures are historical cohort values for cirrhosis; MELD-Na is used for transplant allocation.',
      'For primary biliary cholangitis the original bilirubin cut-offs were 4 and 10 mg/dL.',
    ]);
  }

  // Padua Prediction Score. Barbar S et al. J Thromb Haemost 2010;8:2450-7.
  const PADUA = Object.freeze({
    id: 'padua', label: 'Padua Prediction Score',
    items: [
      { key: 'activeCancer', label: 'Active cancer (metastases or chemo/radiotherapy within 6 months)', options: YES_NO(3) },
      { key: 'previousVte', label: 'Previous VTE (excluding superficial thrombophlebitis)', options: YES_NO(3) },
      { key: 'reducedMobility', label: 'Reduced mobility (bed rest with bathroom privileges ≥ 3 days)', options: YES_NO(3) },
      { key: 'thrombophilia', label: 'Known thrombophilic condition', options: YES_NO(3) },
      { key: 'traumaSurgery', label: 'Recent (≤ 1 month) trauma or surgery', options: YES_NO(2) },
      { key: 'elderly', label: 'Age ≥ 70', options: YES_NO(1) },
      { key: 'cardiorespiratoryFailure', label: 'Heart or respiratory failure', options: YES_NO(1) },
      { key: 'miStroke', label: 'Acute myocardial infarction or ischaemic stroke', options: YES_NO(1) },
      { key: 'infectionRheum', label: 'Acute infection or rheumatological disorder', options: YES_NO(1) },
      { key: 'obesity', label: 'Obesity (BMI ≥ 30)', options: YES_NO(1) },
      { key: 'hormonal', label: 'Ongoing hormonal treatment', options: YES_NO(1) },
    ],
    bands: [
      { code: 'low', label: 'Low VTE risk', rule: 'score < 4 · ~0.3% symptomatic VTE without prophylaxis', min: 0, max: 3 },
      { code: 'high', label: 'High VTE risk', rule: 'score ≥ 4 · ~11% without prophylaxis', min: 4, max: null },
    ],
  });
  function padua(input) {
    const t = tally(PADUA, input);
    if (!t) return null;
    const band = bandFor(PADUA.bands, t.total);
    return scoreResult(PADUA, t, band, band.code === 'high' ? 'warn' : 'success', [
      'Medical inpatients only; surgical patients use Caprini. Pair with a bleeding-risk assessment (IMPROVE) before choosing pharmacological prophylaxis.',
      'Derived in a single Italian centre; external validation shows moderate discrimination.',
    ]);
  }

  // IMPROVE bleeding risk score. Decousus H et al. Chest 2011;139:69-79.
  const IMPROVE_BLEEDING = Object.freeze({
    id: 'improve-bleeding', label: 'IMPROVE bleeding risk',
    items: [
      { key: 'gastroduodenalUlcer', label: 'Active gastroduodenal ulcer', options: YES_NO(4.5) },
      { key: 'recentBleeding', label: 'Bleeding in the 3 months before admission', options: YES_NO(4) },
      { key: 'thrombocytopenia', label: 'Platelets < 50 ×10³/µL', options: YES_NO(4) },
      { key: 'age', label: 'Age', options: [['under40', 'Under 40', 0], ['40to84', '40–84', 1.5], ['85plus', '85 or over', 3.5]] },
      { key: 'hepaticFailure', label: 'Hepatic failure (INR > 1.5)', options: YES_NO(2.5) },
      { key: 'renal', label: 'Renal function (GFR, mL/min/1.73 m²)', options: [['60plus', '≥ 60', 0], ['30to59', '30–59', 1], ['under30', '< 30', 2.5]] },
      { key: 'icu', label: 'ICU or CCU stay', options: YES_NO(2.5) },
      { key: 'centralCatheter', label: 'Central venous catheter', options: YES_NO(2) },
      { key: 'rheumatic', label: 'Rheumatic disease', options: YES_NO(2) },
      { key: 'cancer', label: 'Current cancer', options: YES_NO(2) },
      { key: 'male', label: 'Male sex', options: YES_NO(1) },
    ],
    bands: [
      { code: 'not-high', label: 'Not high', rule: 'score < 7 · major bleeding ~0.4%', min: 0, max: 6.5 },
      { code: 'high', label: 'High bleeding risk', rule: 'score ≥ 7 · major bleeding ~4%', min: 7, max: null },
    ],
  });
  function improveBleeding(input) {
    const t = tally(IMPROVE_BLEEDING, input);
    if (!t) return null;
    const band = bandFor(IMPROVE_BLEEDING.bands, t.total);
    return scoreResult(IMPROVE_BLEEDING, t, band, band.code === 'high' ? 'danger' : 'success', [
      'A high score favours mechanical prophylaxis over anticoagulant prophylaxis while the bleeding risk persists; reassess as it changes.',
      'Derived from the IMPROVE registry of medical inpatients; not a surgical bleeding score.',
    ]);
  }

  // Desktop convenience: the combined Padua/IMPROVE card enters totals directly.
  function paduaImproveRead({ paduaTotal, improveTotal }) {
    const p = num(paduaTotal);
    const i = num(improveTotal);
    if (p === null || i === null) return null;
    const vte = bandFor(PADUA.bands, p);
    const bleed = bandFor(IMPROVE_BLEEDING.bands, i);
    return {
      padua: { total: p, band: { code: vte.code, label: vte.label, rule: vte.rule } },
      improve: { total: i, band: { code: bleed.code, label: bleed.label, rule: bleed.rule } },
      severity: bleed.code === 'high' ? 'danger' : vte.code === 'high' ? 'warn' : 'success',
    };
  }


  const SCORES = Object.freeze({
    'chads2-vasc': CHADS2_VASC, 'has-bled': HAS_BLED, 'wells-dvt': WELLS_DVT, 'wells-pe': WELLS_PE, 'curb-65': CURB65,
    qsofa: QSOFA, sofa: SOFA, gcs: GCS, 'child-pugh': CHILD_PUGH, padua: PADUA, 'improve-bleeding': IMPROVE_BLEEDING,
  });

  global.CALCULATOR_SCORES = Object.freeze({
    version: SCORES_VERSION,
    chads2Vasc,
    hasBled,
    wellsDvt,
    wellsPe,
    curb65,
    qsofa,
    sofa,
    gcs,
    childPugh,
    padua,
    improveBleeding,
    paduaImproveRead,
    SCORES,
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ---- portal/static/js/portal-cockcroft-gault.js ----
// DOM-independent, provenance-aware Cockcroft-Gault creatinine-clearance estimator.
// UI callers must keep input confirmation and dose-band selection as separate steps.
(function initCockcroftGault(global) {
  'use strict';

  const ENGINE_VERSION = 'cockcroft-gault-core-v1';
  const FORMULA = Object.freeze({
    id: 'cockcroft-gault-1976',
    version: 'conventional-scr-ml-min-v1',
    label: 'Cockcroft-Gault estimated creatinine clearance',
    equation: '((140 - ageYears) × weightKg) / (72 × serumCreatinineMgDl), multiplied by 0.85 for formula sex female',
    outputUnit: 'mL/min',
    source: {
      title: 'Prediction of creatinine clearance from serum creatinine',
      authors: 'Cockcroft DW, Gault MH',
      year: 1976,
      doi: '10.1159/000180580',
      url: 'https://doi.org/10.1159/000180580',
    },
    interpretationSource: {
      title: 'Determining Drug Dosing in Adults with Chronic Kidney Disease',
      organization: 'US National Institute of Diabetes and Digestive and Kidney Diseases',
      url: 'https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/ckd-drug-dosing-providers',
      note: 'Use the kidney-function method specified by the drug reference or label; eGFR and Cockcroft-Gault CrCl are not interchangeable.',
    },
  });

  const WEIGHT_METHODS = Object.freeze({
    actual: 'Actual body weight',
    ideal: 'Ideal body weight (Devine)',
    adjusted: 'Adjusted body weight (IBW + 0.4 × (ABW - IBW))',
    dry: 'Documented dry weight',
    manual: 'Manually reviewed dosing weight',
  });

  const hasValue = (value) => value !== null && value !== undefined && value !== '';
  const finiteNumber = (value) => hasValue(value) && Number.isFinite(Number(value)) ? Number(value) : null;
  const round = (value, digits = 1) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };
  const normalizeText = (value) => String(value || '').trim();
  const codeFor = (value) => normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const canonicalWeightMethod = (value) => {
    const method = normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (method === 'actual' || method === 'abw') return 'actual';
    if (method === 'ideal' || method === 'ibw') return 'ideal';
    if (method === 'adjusted' || method === 'adjustedbodyweight' || method === 'adjbw') return 'adjusted';
    if (method === 'dry' || method === 'dryweight') return 'dry';
    if (method === 'manual' || method === 'reviewed') return 'manual';
    return method;
  };

  function issue(code, message, field, extra) {
    return { code, message, ...(field ? { field } : {}), ...(extra || {}) };
  }

  function fact(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    return { value };
  }

  function parseTimestamp(value, referenceTime) {
    const text = normalizeText(value);
    if (!text) return { value: null, ageHours: null, state: 'missing' };
    const millis = Date.parse(text);
    if (!Number.isFinite(millis)) return { value: text, ageHours: null, state: 'invalid' };
    const referenceMillis = Date.parse(referenceTime);
    const ageHours = Number.isFinite(referenceMillis) ? (referenceMillis - millis) / 3600000 : null;
    return {
      value: new Date(millis).toISOString(),
      ageHours: ageHours === null ? null : round(ageHours, 1),
      state: ageHours !== null && ageHours < -0.05 ? 'future' : 'valid',
    };
  }

  function provenanceFor(rawFact, field, referenceTime, warnings, reviews) {
    const input = fact(rawFact);
    const fieldCode = codeFor(field);
    const source = normalizeText(input.source);
    const timestamp = parseTimestamp(input.observedAt || input.timestamp, referenceTime);
    const confirmed = input.confirmed === true;
    if (!source) reviews.push(issue(`${fieldCode}-source-missing`, `Confirm the source of ${field}.`, field));
    if (timestamp.state === 'missing') reviews.push(issue(`${fieldCode}-timestamp-missing`, `Confirm when ${field} was observed.`, field));
    if (timestamp.state === 'invalid') reviews.push(issue(`${fieldCode}-timestamp-invalid`, `The ${field} timestamp is not valid.`, field));
    if (timestamp.state === 'future') warnings.push(issue(`${fieldCode}-timestamp-future`, `The ${field} timestamp is in the future relative to the review time.`, field));
    if (!confirmed) reviews.push(issue(`${fieldCode}-unconfirmed`, `Confirm ${field} before using the estimate for a dosing decision.`, field));
    return {
      source: source || null,
      observedAt: timestamp.value,
      ageHours: timestamp.ageHours,
      confirmed,
    };
  }

  function normalizeAge(raw, referenceTime, blockers, warnings, reviews) {
    const input = fact(raw);
    const value = finiteNumber(input.value);
    const unit = normalizeText(input.unit || 'years').toLowerCase();
    if (value === null) {
      blockers.push(issue('age-missing', 'Age is required.', 'age'));
      return null;
    }
    const years = unit === 'years' || unit === 'year' || unit === 'y'
      ? value
      : unit === 'months' || unit === 'month' || unit === 'mo'
        ? value / 12
        : null;
    if (years === null) {
      blockers.push(issue('age-unit-unsupported', `Age unit "${unit || 'missing'}" is not supported.`, 'age'));
      return null;
    }
    if (years < 18 || years > 120) {
      blockers.push(issue('age-implausible', 'Cockcroft-Gault is an adult estimate; age must be between 18 and 120 years.', 'age'));
      return null;
    }
    if (years >= 95) warnings.push(issue('age-extreme', 'Very advanced age increases uncertainty from muscle mass and creatinine generation.', 'age'));
    return {
      value: round(years, 2),
      unit: 'years',
      provenance: provenanceFor(input, 'age', referenceTime, warnings, reviews),
    };
  }

  function normalizeFormulaSex(raw, referenceTime, blockers, warnings, reviews) {
    const input = fact(raw);
    const value = normalizeText(input.value).toLowerCase();
    const normalized = value === 'f' || value === 'female'
      ? 'female'
      : value === 'm' || value === 'male'
        ? 'male'
        : null;
    if (!normalized) {
      blockers.push(issue(
        'formula-sex-missing',
        'A reviewed male or female Cockcroft-Gault formula coefficient is required; do not infer it from name, title, or gender identity.',
        'formulaSex',
      ));
      return null;
    }
    return {
      value: normalized,
      coefficient: normalized === 'female' ? 0.85 : 1,
      unit: null,
      provenance: provenanceFor(input, 'formula sex', referenceTime, warnings, reviews),
    };
  }

  function normalizeCreatinine(raw, referenceTime, blockers, warnings, reviews) {
    const input = fact(raw);
    const value = finiteNumber(input.value);
    const unit = normalizeText(input.unit || 'mg/dL').toLowerCase().replace(/\s+/g, '');
    if (value === null || value <= 0) {
      blockers.push(issue('creatinine-missing', 'A positive serum creatinine is required.', 'serumCreatinine'));
      return null;
    }
    const mgDl = ['mg/dl', 'mgdl'].includes(unit)
      ? value
      : ['µmol/l', 'μmol/l', 'umol/l', 'mcmol/l'].includes(unit)
        ? value / 88.4
        : null;
    if (mgDl === null) {
      blockers.push(issue('creatinine-unit-unsupported', `Serum creatinine unit "${unit || 'missing'}" is not supported.`, 'serumCreatinine'));
      return null;
    }
    if (mgDl < 0.2 || mgDl > 20) {
      blockers.push(issue('creatinine-implausible', 'Serum creatinine is outside the supported plausibility range of 0.2–20 mg/dL.', 'serumCreatinine'));
      return null;
    }
    if (mgDl < 0.4 || mgDl > 10) warnings.push(issue('creatinine-extreme', 'Extreme serum creatinine increases uncertainty; verify the value, unit, timing, and clinical context.', 'serumCreatinine'));
    const provenance = provenanceFor(input, 'serum creatinine', referenceTime, warnings, reviews);
    if (provenance.ageHours !== null && provenance.ageHours > 48) {
      warnings.push(issue('creatinine-stale', `Serum creatinine is ${round(provenance.ageHours / 24, 1)} days old; verify that it represents the dosing decision time.`, 'serumCreatinine'));
    }
    return {
      value: round(mgDl, 4),
      originalValue: value,
      originalUnit: input.unit || 'mg/dL',
      unit: 'mg/dL',
      provenance,
    };
  }

  function normalizeHeight(raw, referenceTime, blockers, warnings, reviews, required) {
    if (!hasValue(raw) || (typeof raw === 'object' && !hasValue(raw.value))) {
      if (required) blockers.push(issue('height-missing', 'Height is required for ideal or adjusted body weight.', 'height'));
      return null;
    }
    const input = fact(raw);
    const value = finiteNumber(input.value);
    const unit = normalizeText(input.unit || 'cm').toLowerCase();
    const cm = value === null ? null
      : unit === 'cm' ? value
        : unit === 'm' ? value * 100
          : unit === 'in' || unit === 'inch' || unit === 'inches' ? value * 2.54
            : null;
    if (cm === null) {
      blockers.push(issue('height-unit-unsupported', `Height unit "${unit || 'missing'}" is not supported.`, 'height'));
      return null;
    }
    if (cm < 100 || cm > 250) {
      blockers.push(issue('height-implausible', 'Height is outside the supported plausibility range of 100–250 cm.', 'height'));
      return null;
    }
    if (cm < 152.4) warnings.push(issue('ibw-short-stature', 'Devine ideal body weight is less certain below 5 feet (152.4 cm).', 'height'));
    return {
      value: round(cm, 2),
      originalValue: value,
      originalUnit: input.unit || 'cm',
      unit: 'cm',
      provenance: provenanceFor(input, 'height', referenceTime, warnings, reviews),
    };
  }

  function normalizeWeightCandidate(raw, index, referenceTime, warnings, reviews) {
    const input = fact(raw);
    const value = finiteNumber(input.value);
    const unit = normalizeText(input.unit || 'kg').toLowerCase();
    const kg = value === null ? null
      : unit === 'kg' ? value
        : unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds' ? value * 0.45359237
          : null;
    const method = canonicalWeightMethod(input.method || input.kind || 'actual');
    const id = normalizeText(input.id) || `weight-${index + 1}`;
    if (!Object.prototype.hasOwnProperty.call(WEIGHT_METHODS, method)) {
      return { error: issue('weight-method-unsupported', `Weight candidate "${id}" uses unsupported method "${method || 'missing'}".`, 'weights') };
    }
    if (method === 'ideal' || method === 'adjusted') {
      return { error: issue('derived-weight-supplied', `Weight candidate "${id}" must not directly supply an ideal or adjusted weight; provide height and actual weight so the estimator can derive it, or label a separately reviewed value as manual.`, 'weights') };
    }
    if (kg === null) {
      return { error: issue('weight-unit-unsupported', `Weight candidate "${id}" uses unsupported unit "${unit || 'missing'}".`, 'weights') };
    }
    if (kg < 20 || kg > 350) {
      return { error: issue('weight-implausible', `Weight candidate "${id}" is outside the supported plausibility range of 20–350 kg.`, 'weights') };
    }
    const provenance = provenanceFor(input, `weight ${id}`, referenceTime, warnings, reviews);
    if (provenance.ageHours !== null && provenance.ageHours > 24 * 30) {
      warnings.push(issue('weight-stale', `Weight candidate "${id}" is more than 30 days old.`, 'weights', { candidateId: id }));
    }
    return {
      id,
      method,
      methodLabel: WEIGHT_METHODS[method],
      value: round(kg, 3),
      originalValue: value,
      originalUnit: input.unit || 'kg',
      unit: 'kg',
      provenance,
    };
  }

  function idealBodyWeight(heightCm, formulaSex) {
    const inchesOverFiveFeet = (heightCm / 2.54) - 60;
    const base = formulaSex === 'female' ? 45.5 : 50;
    return base + (2.3 * inchesOverFiveFeet);
  }

  function estimateCrCl(ageYears, weightKg, creatinineMgDl, formulaSex) {
    const coefficient = formulaSex === 'female' ? 0.85 : 1;
    return ((140 - ageYears) * weightKg * coefficient) / (72 * creatinineMgDl);
  }

  function selectCandidate(candidates, method, candidateId, blockers) {
    const matches = candidates.filter((candidate) => candidate.method === method);
    if (candidateId) {
      const selected = matches.find((candidate) => candidate.id === candidateId);
      if (!selected) blockers.push(issue('weight-candidate-not-found', `Weight candidate "${candidateId}" was not found for method "${method}".`, 'weights'));
      return selected || null;
    }
    if (!matches.length) {
      blockers.push(issue('weight-candidate-missing', `A ${WEIGHT_METHODS[method] || method} candidate is required.`, 'weights'));
      return null;
    }
    if (matches.length > 1) {
      blockers.push(issue('weight-candidate-ambiguous', `Multiple ${WEIGHT_METHODS[method]} candidates are available; select one explicitly.`, 'weights'));
      return null;
    }
    return matches[0];
  }

  function assessClinicalContext(context, selectedMethod, blockers, warnings, reviews) {
    const dialysis = context.crrt === true
      ? 'crrt'
      : context.peritonealDialysis === true || context.pd === true
        ? 'pd'
        : context.hemodialysis === true || context.hd === true
          ? 'hd'
          : normalizeText(context.dialysis || 'none').toLowerCase();
    if (dialysis !== 'none' && dialysis !== 'no') {
      blockers.push(issue('dialysis-special-population', `Cockcroft-Gault dose-band matching is blocked for ${dialysis.toUpperCase()}; use the drug's dialysis-specific guidance.`, 'context.dialysis'));
    }
    if (context.nonSteadyState === true || context.acuteKidneyInjury === true || context.rapidCreatinineChange === true) {
      blockers.push(issue('non-steady-state-creatinine', 'Creatinine is not at steady state; Cockcroft-Gault must not drive automatic dose-band selection.', 'context.nonSteadyState'));
    }
    if (context.amputation === true || (context.amputation && context.amputation !== 'none')) {
      blockers.push(issue('amputation-special-population', 'Amputation makes standard body-weight selection unreliable; obtain an explicitly reviewed specialist dosing weight/method.', 'context.amputation'));
    }
    const fluidDistortion = context.edema === true || context.edema === 'significant' || context.ascites === true || context.ascites === 'significant';
    if (fluidDistortion && !['dry', 'manual'].includes(selectedMethod)) {
      blockers.push(issue('fluid-weight-distortion', 'Edema or ascites can distort measured weight; select a confirmed dry or manually reviewed dosing weight.', 'context'));
    } else if (fluidDistortion) {
      warnings.push(issue('fluid-weight-reviewed', 'Edema or ascites is present; verify that the selected dry/manual weight reflects the intended dosing weight.', 'context'));
    }
    const composition = normalizeText(context.bodyComposition || 'typical').toLowerCase();
    if (['low-muscle', 'high-muscle', 'cachexia', 'muscular'].includes(composition)) {
      warnings.push(issue('body-composition-creatinine-bias', 'Atypical muscle mass can bias creatinine-based estimates; interpret CrCl with clinical and drug-specific context.', 'context.bodyComposition'));
    }
    if (composition === 'extreme-obesity') {
      reviews.push(issue('extreme-obesity-weight-review', 'Extreme obesity requires explicit review of the dosing-weight method and plausible alternative estimates.', 'context.bodyComposition'));
    }
  }

  function evaluateCutoffs(estimates, cutoffs) {
    const values = estimates.map((item) => item.value).filter(Number.isFinite);
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [...new Set((cutoffs || []).map(Number).filter((value) => Number.isFinite(value) && value > 0))]
      .sort((left, right) => left - right)
      .map((cutoff) => {
        const nearestDistance = Math.min(...values.map((value) => Math.abs(value - cutoff)));
        return {
          cutoff,
          unit: 'mL/min',
          straddledByAlternatives: min < cutoff && max >= cutoff,
          near: nearestDistance <= Math.max(2, cutoff * 0.1),
          nearestDistance: round(nearestDistance, 1),
        };
      });
  }

  function calculate(input) {
    const values = input && typeof input === 'object' ? input : {};
    const blockers = [];
    const warnings = [];
    const reviews = [];
    const referenceTime = normalizeText(values.referenceTime) || new Date().toISOString();
    const selectedMethod = canonicalWeightMethod(values.weightMethod || (values.weightSelection && values.weightSelection.method));
    const selectedCandidateId = normalizeText(values.weightCandidateId || (values.weightSelection && values.weightSelection.candidateId));

    if (!Object.prototype.hasOwnProperty.call(WEIGHT_METHODS, selectedMethod)) {
      blockers.push(issue('weight-method-not-selected', 'Select an explicit Cockcroft-Gault dosing-weight method.', 'weightMethod'));
    }

    const age = normalizeAge(values.age, referenceTime, blockers, warnings, reviews);
    const formulaSex = normalizeFormulaSex(values.formulaSex, referenceTime, blockers, warnings, reviews);
    const creatinine = normalizeCreatinine(values.serumCreatinine, referenceTime, blockers, warnings, reviews);
    const heightRequired = selectedMethod === 'ideal' || selectedMethod === 'adjusted';
    const height = normalizeHeight(values.height, referenceTime, blockers, warnings, reviews, heightRequired);
    const rawWeights = Array.isArray(values.weights)
      ? values.weights
      : hasValue(values.weight)
        ? [values.weight]
        : [];
    const candidates = [];
    rawWeights.forEach((raw, index) => {
      const normalized = normalizeWeightCandidate(raw, index, referenceTime, warnings, reviews);
      if (normalized.error) blockers.push(normalized.error);
      else candidates.push(normalized);
    });

    let ibw = null;
    if (height && formulaSex) {
      ibw = idealBodyWeight(height.value, formulaSex.value);
      if (ibw < 20 || ibw > 200) blockers.push(issue('ideal-weight-implausible', 'Derived ideal body weight is outside the supported plausibility range.', 'height'));
    }

    const derived = [];
    if (ibw !== null && ibw >= 20 && ibw <= 200) {
      derived.push({
        id: 'derived-ideal',
        method: 'ideal',
        methodLabel: WEIGHT_METHODS.ideal,
        value: round(ibw, 3),
        unit: 'kg',
        derivedFrom: ['height', 'formulaSex'],
        provenance: {
          source: 'Derived by estimator',
          observedAt: referenceTime,
          ageHours: 0,
          confirmed: Boolean(height.provenance.confirmed && formulaSex.provenance.confirmed),
        },
      });
      const actualCandidates = candidates.filter((candidate) => candidate.method === 'actual');
      actualCandidates.forEach((actual) => {
        if (actual.value > ibw) {
          derived.push({
            id: `derived-adjusted-${actual.id}`,
            method: 'adjusted',
            methodLabel: WEIGHT_METHODS.adjusted,
            value: round(ibw + (0.4 * (actual.value - ibw)), 3),
            unit: 'kg',
            derivedFrom: ['height', 'formulaSex', actual.id],
            provenance: {
              source: `Derived from ${actual.id}`,
              observedAt: actual.provenance.observedAt,
              ageHours: actual.provenance.ageHours,
              confirmed: Boolean(height.provenance.confirmed && formulaSex.provenance.confirmed && actual.provenance.confirmed),
            },
          });
        }
      });
    }

    const allWeightOptions = [...candidates, ...derived];
    let selectedWeight = null;
    if (Object.prototype.hasOwnProperty.call(WEIGHT_METHODS, selectedMethod)) {
      selectedWeight = selectCandidate(allWeightOptions, selectedMethod, selectedCandidateId, blockers);
    }

    if (selectedMethod === 'adjusted' && selectedWeight && ibw !== null) {
      const actualId = (selectedWeight.derivedFrom || []).find((id) => String(id).startsWith('weight-') || candidates.some((candidate) => candidate.id === id));
      const actual = candidates.find((candidate) => candidate.id === actualId);
      if (actual && actual.value < ibw * 1.2) {
        reviews.push(issue('adjusted-weight-not-obese', 'Adjusted body weight was selected although actual weight is less than 120% of ideal body weight; review the method.', 'weightMethod'));
      }
    }

    assessClinicalContext(values.context || {}, selectedMethod, blockers, warnings, reviews);

    const canCalculate = Boolean(age && formulaSex && creatinine && selectedWeight);
    const alternativeEstimates = age && formulaSex && creatinine
      ? allWeightOptions.map((weightOption) => ({
          weightId: weightOption.id,
          method: weightOption.method,
          methodLabel: weightOption.methodLabel,
          weightKg: round(weightOption.value, 1),
          value: round(estimateCrCl(age.value, weightOption.value, creatinine.value, formulaSex.value), 1),
          unit: 'mL/min',
          selected: Boolean(selectedWeight && selectedWeight.id === weightOption.id),
        })).sort((left, right) => left.value - right.value)
      : [];
    const calculatedValue = canCalculate
      ? round(estimateCrCl(age.value, selectedWeight.value, creatinine.value, formulaSex.value), 1)
      : null;
    const rangeValues = alternativeEstimates.map((item) => item.value);
    const range = rangeValues.length
      ? { min: Math.min(...rangeValues), max: Math.max(...rangeValues), unit: 'mL/min' }
      : null;
    const cutoffAssessment = evaluateCutoffs(alternativeEstimates, values.doseBandCutoffs || [15, 30, 50]);
    if (cutoffAssessment.some((item) => item.straddledByAlternatives)) {
      reviews.push(issue('weight-method-crosses-dose-band', 'Plausible weight methods cross a supplied dose-band cutoff; confirm the intended method before selecting a regimen.', 'weightMethod'));
    } else if (cutoffAssessment.some((item) => item.near)) {
      warnings.push(issue('estimate-near-dose-band', 'At least one estimate is near a supplied dose-band cutoff; verify inputs and follow the referenced table boundary exactly.', 'doseBandCutoffs'));
    }

    const status = blockers.length ? 'blocked' : reviews.length ? 'review-required' : 'ready';
    return {
      engineVersion: ENGINE_VERSION,
      formula: FORMULA,
      status,
      usableForDoseBand: status === 'ready',
      estimate: calculatedValue === null ? null : {
        value: calculatedValue,
        unit: 'mL/min',
        weightMethod: selectedMethod,
        weightMethodLabel: WEIGHT_METHODS[selectedMethod],
        weightId: selectedWeight.id,
        weightKg: round(selectedWeight.value, 1),
      },
      range,
      alternatives: alternativeEstimates,
      cutoffAssessment,
      inputs: {
        age,
        formulaSex,
        serumCreatinine: creatinine,
        height,
        weights: allWeightOptions,
        selectedWeightId: selectedWeight ? selectedWeight.id : null,
      },
      blockers,
      warnings,
      reviews,
      reviewedAt: referenceTime,
      boundary: 'Estimate only. Confirm every input, clinical applicability, dosing-weight method, and the drug-specific renal table before use. Do not substitute eGFR for a table labeled CrCl.',
    };
  }

  const api = Object.freeze({
    version: ENGINE_VERSION,
    formula: FORMULA,
    weightMethods: WEIGHT_METHODS,
    calculate,
  });

  global.COCKCROFT_GAULT = api;
  global.__cockcroftGaultTestApi = Object.freeze({
    calculate,
    estimateCrCl,
    idealBodyWeight,
    evaluateCutoffs,
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ---- portal/static/js/portal-ekg-engine.js ----
// portal-ekg-engine.js
// DOM-independent EKG interpretation engine shared by the desktop EKG wizard
// (portal-ekg-wizard.js) and Mediport Pocket: the step definitions (questions,
// options, reference sections), the branching sequence, and the summary
// builder (alerts, chips, narrative, copy text). No DOM access; the wizard and
// the Pocket page render what this returns. Public API: window.EKG_GUIDE.

(function initEkgGuide(global) {
  'use strict';

  const ENGINE_VERSION = 'ekg-guide-v1';

  // ============================================================
  // STEP DEFINITIONS
  // Each step: id, label, q (question), sub (hint), opts[], ref[]
  // opts: { v (value), l (label), s (sub), c (css class), badge? }
  // ref sections: { t (title), items?, formula? }
  // ============================================================
  const STEPS = {

    rate: {
      id: 'rate', label: 'Rate',
      q: 'What is the ventricular rate?',
      sub: 'Count large squares between consecutive R waves: rate ≈ 300 ÷ (# large squares)',
      opts: [
        { v: 'brady',  l: 'Bradycardia',  s: '< 60 bpm',      c: 'ekw-c-warn' },
        { v: 'normal', l: 'Normal',        s: '60 – 100 bpm',  c: 'ekw-c-green' },
        { v: 'tachy',  l: 'Tachycardia',  s: '> 100 bpm',     c: '' },
      ],
      ref: [
        { t: 'Quick Estimation (memorize)', items: [
          '1 large sq → 300 bpm', '2 → 150', '3 → 100', '4 → 75', '5 → 60', '6 → 50'
        ]},
        { t: 'Precise Method', formula: 'Rate = 60,000 ÷ RR (ms)\nor 1,500 ÷ (# small squares)' },
      ]
    },

    rhythm: {
      id: 'rhythm', label: 'Rhythm',
      q: 'What is the rhythm?',
      sub: 'Are R-R intervals regular? Is there a P wave before every QRS?',
      opts: [
        { v: 'sinus',   l: 'Regular Sinus',         s: 'P before every QRS · constant PR · regular R-R',          c: 'ekw-c-green' },
        { v: 'afib',    l: 'Irregularly Irregular',  s: 'No distinct P waves · fibrillatory baseline · variable R-R', c: 'ekw-c-warn',
          badge: { txt: 'A-Fib', type: 'warn' } },
        { v: 'reg_irr', l: 'Regularly Irregular',   s: 'Sawtooth flutter waves at 300 bpm, or grouped beats',       c: 'ekw-c-warn' },
        { v: 'no_p',    l: 'No P Waves',             s: 'Junctional, ventricular, or AV dissociation',              c: '' },
      ],
      ref: [
        { t: 'P Wave Assessment', items: [
          'Normal: upright in I, II, aVF — inverted in aVR',
          'Sawtooth 300 bpm + 2:1 or variable block → atrial flutter',
          'No distinct P + irregular R-R → atrial fibrillation',
        ]},
        { t: 'AFib Rate', items: [
          'Controlled: ventricular rate 60–100 bpm',
          'Uncontrolled: ventricular rate > 100 bpm',
          'Slow AFib (< 60): dig toxicity, BB/CCB excess, AV block',
        ]},
      ]
    },

    pr: {
      id: 'pr', label: 'PR Interval',
      q: 'What is the PR interval?',
      sub: 'Measure from onset of P wave to onset of QRS complex',
      opts: [
        { v: 'normal',   l: 'Normal',              s: '120 – 200 ms (3 – 5 small squares)',                         c: 'ekw-c-green' },
        { v: 'long',     l: 'Prolonged',           s: '> 200 ms → 1st-degree AV block',                            c: 'ekw-c-warn' },
        { v: 'short_d',  l: 'Short + Delta Wave',  s: '< 120 ms + slurred upstroke → WPW pre-excitation',          c: 'ekw-c-warn',
          badge: { txt: 'WPW?', type: 'warn' } },
        { v: 'variable', l: 'Variable / Dropped',  s: 'PR lengthens then drops (Mobitz I) or fixed then drops (Mobitz II)', c: 'ekw-c-warn',
          badge: { txt: 'AV Block', type: 'warn' } },
      ],
      ref: [
        { t: 'PR Norms', items: ['Normal: 120–200 ms = 3–5 small squares'] },
        { t: 'AV Block', items: [
          '1°: PR > 200 ms, all P waves conduct — benign',
          '2° Mobitz I: progressive PR ↑ until one P drops (AV node)',
          '2° Mobitz II: fixed PR, sudden non-conducted P — higher risk',
          '3° (complete): no AV conduction, escape QRS',
        ]},
        { t: 'Short PR', items: [
          'WPW: delta wave + short PR + wide QRS',
          'Junctional: PR < 120 ms if P is retrograde',
        ]},
      ]
    },

    qrs_width: {
      id: 'qrs_width', label: 'QRS Width',
      q: 'What is the QRS duration?',
      sub: 'Measure earliest onset to latest offset across all leads',
      opts: [
        { v: 'narrow',     l: 'Narrow',      s: '< 110 ms (< 2.75 small squares)',        c: 'ekw-c-green' },
        { v: 'borderline', l: 'Borderline',  s: '110 – 119 ms — possible IVCD',           c: 'ekw-c-warn' },
        { v: 'wide',       l: 'Wide',        s: '≥ 120 ms — BBB · paced · VT · metabolic', c: 'ekw-c-warn',
          badge: { txt: 'Branches →', type: 'info' } },
      ],
      ref: [
        { t: 'Wide QRS Differential', items: [
          'RBBB: rSR\' in V1/V2, wide S in I and V6',
          'LBBB: broad R in I/aVL/V5-6, no Q in I/V5-6',
          'Paced: pacemaker spike before wide QRS',
          'VT: AV dissociation ± fusion/capture beats',
          'Metabolic/drug: diffuse widening (hyperK, Na-channel)',
        ]},
        { t: 'Normal V1 / V6 Example', images: []},
      ]
    },

    qrs_type: {
      id: 'qrs_type', label: 'Wide QRS Type',
      q: 'Wide QRS — what is the morphology?',
      sub: 'Look at V1 (rSR\' vs broad R), V6 (S wave), leads I, aVL; check for pacemaker spike',
      opts: [
        { v: 'rbbb',  l: 'RBBB',              s: 'rSR\' in V1/V2 · wide slurred S in I and V6',                   c: '' },
        { v: 'lbbb',  l: 'LBBB',              s: 'Broad monophasic R in I/aVL/V5-6 · absent Q in I/V5-6',         c: '' },
        { v: 'paced', l: 'Paced Rhythm',      s: 'Pacemaker spike before QRS · LBBB-like if RV-paced',            c: 'ekw-c-warn' },
        { v: 'vt',    l: 'VT / Uncertain',   s: 'AV dissociation · concordance · NW axis · Brugada criteria',    c: 'ekw-c-warn',
          badge: { txt: 'Urgent', type: 'danger' } },
        { v: 'meta',  l: 'Metabolic / Drug', s: 'Diffuse widening · no clear BBB · sine-wave (hyperK)',           c: 'ekw-c-warn' },
      ],
      ref: [
        { t: 'RBBB Criteria (all)', items: [
          'QRS ≥ 120 ms',
          'rSR\' (M-shape) in V1 or V2',
          'Wide slurred S in I and V6',
        ], images: []},
        { t: 'LBBB Criteria (all)', items: [
          'QRS ≥ 120 ms',
          'Broad monophasic R in I, aVL, V5-V6',
          'Absent Q in I, V5-V6 · QS or rS in V1',
          'LBBB invalidates standard LVH and STEMI criteria',
        ], images: []},
        { t: 'VT vs. SVT-Aberrancy', items: [
          'AV dissociation → VT',
          'Positive concordance (all R) V1-V6 → VT',
          'NW axis (neg I and aVF) → VT',
          'Rate > 170, no preceding P → treat as VT',
        ]},
      ]
    },

    narrow_tach: {
      id: 'narrow_tach', label: 'Narrow Tachycardia',
      q: 'Narrow-complex tachycardia — what pattern best fits?',
      sub: 'Use onset, regularity, P-wave location, flutter waves, and response to vagal maneuvers or adenosine.',
      opts: [
        { v: 'sinus',      l: 'Sinus Tachycardia',       s: 'Gradual onset · sinus P before each QRS · usually < 150 bpm', c: 'ekw-c-green' },
        { v: 'avnrt_avrt', l: 'AVNRT / Orthodromic AVRT', s: 'Abrupt on/off · regular · P hidden in QRS or retrograde after QRS', c: 'ekw-c-warn' },
        { v: 'flutter',    l: 'Atrial Flutter',          s: 'Sawtooth F waves · often ventricular rate near 150 with 2:1 block', c: 'ekw-c-warn' },
        { v: 'af_mat',     l: 'AF / MAT',                s: 'Irregular narrow tachycardia · AF has no P waves; MAT has ≥3 P morphologies', c: 'ekw-c-warn' },
        { v: 'uncertain',  l: 'Uncertain SVT',           s: 'If unstable, treat per ACLS; otherwise capture rhythm strip and compare priors', c: '' },
      ],
      ref: [
        { t: 'Narrow Tachycardia Clues', items: [
          'Gradual onset favors sinus tachycardia; abrupt start/stop favors reentry.',
          'Regular narrow tachycardia without visible P waves favors AVNRT.',
          'Short RP with retrograde inferior P waves suggests AVNRT/AVRT.',
          'Flutter often conducts 2:1, producing a ventricular rate near 150.',
          'Irregular narrow tachycardia suggests AF, flutter with variable block, or MAT.',
        ]},
        { t: 'Adenosine / Vagal Response', items: [
          'AVNRT/AVRT may terminate abruptly.',
          'AF/flutter/atrial tachycardia may slow and reveal atrial activity.',
          'Avoid AV-nodal blockers if an accessory pathway with pre-excited AF is suspected.',
        ]},
      ]
    },

    wct: {
      id: 'wct', label: 'Wide Tachycardia',
      q: 'Wide-complex tachycardia — which risk pattern is present?',
      sub: 'For a fast wide rhythm, assume VT until proven otherwise; rate and blood pressure alone do not reliably distinguish VT from SVT with aberrancy.',
      opts: [
        { v: 'vt_likely',     l: 'VT Likely',              s: 'AV dissociation · capture/fusion beats · concordance · extreme axis · prior MI/CMP', c: 'ekw-c-warn',
          badge: { txt: 'Treat as VT', type: 'danger' } },
        { v: 'svt_aberrancy', l: 'SVT with Aberrancy',     s: 'Typical BBB morphology · known baseline BBB · no VT clues identified', c: '' },
        { v: 'preexcited_af', l: 'Pre-excited AF Concern', s: 'Irregular wide tachycardia · very rapid/variable QRS · WPW pattern or delta wave history', c: 'ekw-c-warn',
          badge: { txt: 'Avoid AVN blockers', type: 'danger' } },
        { v: 'torsades',      l: 'Polymorphic / TdP',      s: 'Beat-to-beat QRS morphology changes · twisting axis · prolonged QT or pause-dependent runs', c: 'ekw-c-warn',
          badge: { txt: 'Mg + QT review', type: 'warn' } },
        { v: 'paced_device',  l: 'Paced / Device Rhythm',  s: 'Pacemaker spikes or device-mediated wide rhythm; compare with device history', c: '' },
      ],
      ref: [
        { t: 'VT-Favoring ECG Criteria', items: [
          'AV dissociation, capture beats, or fusion beats prove VT.',
          'Positive or negative concordance across V1-V6 favors VT.',
          'Extreme / northwest axis favors VT.',
          'Very wide QRS: >140 ms RBBB-type or >160 ms LBBB-type favors VT.',
          'Atypical BBB morphology: monophasic R in V1, r/S <1 in V6, q wave in V6, or slow initial forces.',
        ]},
        { t: 'Irregular Wide Tachycardia', items: [
          'AF with aberrancy: irregular but QRS morphology usually similar beat-to-beat.',
          'Pre-excited AF: very rapid, irregular, variable wide QRS; avoid beta-blockers, diltiazem/verapamil, digoxin, adenosine.',
          'Polymorphic VT/TdP: changing QRS morphology; review QTc, K, Mg, Ca, and QT-prolonging meds.',
        ]},
        { t: 'Clinical Guardrail', items: [
          'If unstable: synchronized cardioversion per ACLS.',
          'When uncertain, manage as VT while escalating.',
        ]},
      ]
    },

    brady_av: {
      id: 'brady_av', label: 'Brady / AV Block',
      q: 'Bradycardia or AV block — what pattern best fits?',
      sub: 'Look for P waves, the P:QRS relationship, PR behavior, dropped beats, and whether the escape QRS is narrow or wide.',
      opts: [
        { v: 'sinus_brady', l: 'Sinus Bradycardia',       s: 'Sinus P before every QRS · constant PR · slow but conducted rhythm', c: 'ekw-c-green' },
        { v: 'junctional',  l: 'Junctional Escape',       s: 'No visible P or retrograde/inverted P · usually narrow QRS · rate 40-60', c: '' },
        { v: 'first_deg',   l: '1st-degree AV Block',     s: 'PR > 200 ms · every P conducts to QRS', c: 'ekw-c-warn' },
        { v: 'mobitz_i',    l: 'Mobitz I / Wenckebach',   s: 'Progressive PR lengthening until a dropped QRS · often grouped beating', c: 'ekw-c-warn' },
        { v: 'mobitz_ii',   l: 'Mobitz II / High-grade',  s: 'Fixed PR with dropped QRS, or ≥2 dropped P waves in a row · often infranodal', c: 'ekw-c-warn',
          badge: { txt: 'Pacing risk', type: 'danger' } },
        { v: 'complete',    l: 'Complete Heart Block',    s: 'AV dissociation · P waves and QRS march independently · junctional or ventricular escape', c: 'ekw-c-warn',
          badge: { txt: 'Urgent', type: 'danger' } },
        { v: 'reversible',  l: 'Reversible / Medication', s: 'Beta-blocker, CCB, digoxin, amiodarone, ischemia, hyperK, hypothermia, OSA, hypothyroid', c: '' },
      ],
      ref: [
        { t: 'AV Block Pattern Check', items: [
          '1st degree: PR > 200 ms and all P waves conduct.',
          'Mobitz I: PR progressively lengthens before the dropped QRS.',
          'Mobitz II: PR stays fixed before dropped QRS; wide QRS raises infranodal concern.',
          '2:1 AV block cannot be typed by PR behavior alone; use QRS width, context, and prior tracings.',
          'Complete heart block: atria and ventricles are independent; escape may be narrow junctional or wide ventricular.',
        ]},
        { t: 'Bradycardia Safety Check', items: [
          'If unstable: atropine while preparing pacing/vasopressor support per ACLS.',
          'Review reversible causes: beta-blockers, non-DHP CCBs, digoxin, amiodarone, hyperkalemia, inferior MI, hypothermia, hypothyroidism.',
          'Mobitz II, high-grade AV block, complete heart block, or wide unstable escape rhythm deserves urgent escalation.',
        ]},
      ]
    },

    axis: {
      id: 'axis', label: 'Axis',
      q: 'What is the frontal QRS axis?',
      sub: 'Check net QRS deflection in leads I and aVF — then use II to confirm LAD boundary',
      opts: [
        { v: 'normal',  l: 'Normal',                 s: '0° to +90° · positive in both I and aVF',          c: 'ekw-c-green' },
        { v: 'lad',     l: 'Left Axis Deviation',    s: 'Beyond −30° · positive I · negative aVF · S > R in II', c: 'ekw-c-warn' },
        { v: 'rad',     l: 'Right Axis Deviation',   s: 'Beyond +90° · negative I · positive aVF',          c: 'ekw-c-warn' },
        { v: 'extreme', l: 'Extreme / NW Axis',      s: '−90° to ±180° · negative I and negative aVF',     c: '' },
      ],
      ref: [
        { t: 'Axis Quick-Check Grid', items: [
          'I(+), aVF(+) → Normal (0° to +90°)',
          'I(+), aVF(−) → LAD (confirm: S > R in II)',
          'I(−), aVF(+) → RAD (> +90°)',
          'I(−), aVF(−) → Extreme / NW axis',
        ], images: []},
        { t: 'LAD Causes', items: ['LVH · LBBB · inferior MI · WPW · LAFB'] },
        { t: 'LAFB Criteria', items: [
          'LAD −45° to −90°', 'qR in aVL', 'rS in II, III, aVF', 'QRS < 120 ms',
        ]},
        { t: 'RAD Causes', items: ['RVH · PE · COPD · lateral MI · WPW · LPFB · septal defect'] },
      ]
    },

    qtc: {
      id: 'qtc', label: 'QTc',
      q: 'What is the corrected QT interval (QTc)?',
      sub: 'Bazett: QTc = QT ÷ √RR (seconds). Measure in lead II or V5.',
      opts: [
        { v: 'normal',     l: 'Normal QTc',    s: '< 440 ms (♂) · < 460 ms (♀)',              c: 'ekw-c-green' },
        { v: 'borderline', l: 'Borderline',    s: '440 – 499 ms — monitor, review meds',       c: 'ekw-c-warn' },
        { v: 'prolonged',  l: 'Prolonged QTc', s: '≥ 500 ms — Torsades de Pointes risk',       c: 'ekw-c-warn',
          badge: { txt: 'TdP Risk', type: 'danger' } },
        { v: 'short',      l: 'Short QTc',     s: '< 360 ms — hypercalcemia · digoxin · SQTS', c: '' },
      ],
      ref: [
        { t: 'Bazett Formula', formula: 'QTc = QT ÷ √RR\n(RR in seconds)' },
        { t: 'Normal Limits', items: ['♂ < 440 ms · ♀ < 460 ms · > 500 ms = TdP risk'] },
        { t: 'QTc Prolongation Causes', items: [
          'Drugs: amio, sotalol, haloperidol, methadone, macrolides, FQs',
          'Electrolytes: ↓K⁺, ↓Mg²⁺, ↓Ca²⁺',
          'CNS: stroke, SAH, head trauma',
          'Congenital LQTS',
        ]},
      ]
    },

    chamber: {
      id: 'chamber', label: 'Chamber / Voltage',
      q: 'Any chamber enlargement or voltage abnormality?',
      sub: 'Check LVH/RVH voltage criteria and P-wave duration/amplitude',
      opts: [
        { v: 'none',   l: 'None',                 s: 'No LVH, RVH, atrial enlargement, or low voltage',       c: 'ekw-c-green' },
        { v: 'lvh',    l: 'LVH',                  s: 'Sokolow: S(V1)+R(V5/V6) ≥ 35 mm · Cornell criteria',    c: '' },
        { v: 'rvh',    l: 'RVH',                  s: 'R > S in V1 · RAD ≥ 110° · RV strain in V1-V3',         c: 'ekw-c-warn' },
        { v: 'atrial', l: 'Atrial Enlargement',   s: 'P > 120 ms (LAA) · P ≥ 2.5 mm in II (RAA)',             c: '' },
        { v: 'low_v',  l: 'Low Voltage',          s: 'All QRS < 5 mm limb or < 10 mm precordial leads',       c: 'ekw-c-warn' },
      ],
      ref: [
        { t: 'LVH Voltage Criteria', items: [
          'Sokolow-Lyon: S(V1) + R(V5 or V6) ≥ 35 mm',
          'Cornell: R(aVL) + S(V3) > 28 mm (♂) or > 20 mm (♀)',
          'LVH strain: downsloping ST↓ + T-inv in I, aVL, V5-V6',
        ]},
        { t: 'RVH Criteria', items: [
          'R > S in V1 (or R > 7 mm)', 'RAD ≥ 110°',
          'RV strain: ST↓ + T-inv V1-V3, II, III, aVF',
        ]},
        { t: 'Low Voltage DDx', items: [
          'Pericardial effusion/tamponade (urgent echo)',
          'Hypothyroidism · obesity · COPD · amyloidosis',
        ]},
      ]
    },

    q_waves: {
      id: 'q_waves', label: 'Q Waves / R Progression',
      q: 'Q-wave abnormalities or poor R-wave progression?',
      sub: 'Pathologic Q: width ≥ 30 ms OR depth > 25% of R-wave height in ≥ 2 contiguous leads',
      opts: [
        { v: 'normal',   l: 'Normal',               s: 'Septal q in I/aVL/V5-6 OK · R grows V1 → V5',         c: 'ekw-c-green' },
        { v: 'prwp',     l: 'Poor R Progression',   s: 'R wave ≤ 3 mm in V3 · fails to grow V1 → V4',         c: 'ekw-c-warn' },
        { v: 'path_q',   l: 'Pathologic Q Waves',   s: '≥ 30 ms wide or > 25% R-height in ≥ 2 contiguous leads', c: 'ekw-c-warn',
          badge: { txt: 'Prior MI?', type: 'warn' } },
        { v: 'dom_r_v1', l: 'Dominant R in V1-V2',  s: 'R > S in V1 — posterior MI · RVH · RBBB · WPW',       c: '' },
      ],
      ref: [
        { t: 'Pathologic Q Criteria', items: [
          'Width ≥ 30 ms (0.03 s), OR depth > 25% of R-wave',
          'In ≥ 2 contiguous leads',
          'Normal septal q: narrow (< 40 ms) in I, aVL, V5-V6',
        ]},
        { t: 'Q Territory → Vessel', items: [
          'II, III, aVF → inferior (RCA)',
          'I, aVL → high lateral (diagonal/LCx)',
          'V1-V4 → anterior (LAD)',
          'V5-V6 → apical/lateral',
          'Dominant R in V1-V2 → posterior',
        ]},
        { t: 'PRWP DDx', items: [
          'Anterior MI · LBBB · LVH · COPD · lead misplacement',
        ]},
      ]
    },

    st: {
      id: 'st', label: 'ST Segment',
      q: 'ST segment changes?',
      sub: 'Measure at the J-point. Compare with TP baseline.',
      opts: [
        { v: 'normal',  l: 'No ST Changes',          s: 'Isoelectric · minor variation acceptable V1-V2',        c: 'ekw-c-green' },
        { v: 'stemi',   l: 'STE — Contiguous Leads', s: 'Convex STE ≥ 1 mm in ≥ 2 contiguous limb leads, or ≥ 2 mm V2-V3', c: 'ekw-c-warn',
          badge: { txt: 'STEMI / Equiv', type: 'danger' } },
        { v: 'std',     l: 'ST Depression',          s: '≥ 0.5 mm J-point depression — ischemia · posterior MI · strain', c: 'ekw-c-warn' },
        { v: 'peri',    l: 'Diffuse STE + PR↓',      s: 'Concave STE most leads + PR depression → pericarditis', c: 'ekw-c-warn' },
        { v: 'brugada', l: 'Brugada Pattern',        s: 'Coved Type 1 STE ≥ 2 mm + negative T in V1-V2',        c: 'ekw-c-warn',
          badge: { txt: 'Brugada', type: 'danger' } },
        { v: 'early_r', l: 'Early Repolarization',  s: 'Concave STE + J-point notching V2-V5 in young patients', c: '' },
        { v: 'strain',  l: 'Strain Pattern',         s: 'Downsloping ST↓ + T-inv in LVH/RVH territory (secondary)', c: '' },
      ],
      ref: [
        { t: 'STEMI Territory', items: [
          'V1-V4: anterior (LAD)',
          'II, III, aVF: inferior (RCA)',
          'I, aVL: lateral (LCx/diagonal)',
          'V7-V9 (or STD V1-V3 + dominant R): posterior',
          'aVR STE + diffuse STD: left main or proximal LAD',
        ]},
        { t: 'Pericarditis vs. STEMI', items: [
          'Pericarditis: diffuse, concave, PR↓, no reciprocal STD, evolves days',
          'STEMI: territorial, convex, reciprocal STD, evolves hours',
        ]},
        { t: 'ST Depression DDx', items: [
          'Subendocardial ischemia · posterior MI equivalent',
          'Digoxin effect (scooping) · hypokalemia · LVH/LBBB strain',
        ]},
      ]
    },

    t_waves: {
      id: 't_waves', label: 'T Waves',
      q: 'T-wave abnormalities?',
      sub: 'Normal: upright in I, II, V3-V6; inverted in aVR; variable in III, V1-V2',
      opts: [
        { v: 'normal',   l: 'Normal T Waves',        s: 'Upright I/II/V3-V6 · inverted aVR · no focal change',     c: 'ekw-c-green' },
        { v: 'inv',      l: 'T-Wave Inversion',      s: 'Focal TWI — ischemia · RVH strain · cardiomyopathy',      c: 'ekw-c-warn' },
        { v: 'deep_sym', l: 'Deep Symmetric TWI',    s: 'V2-V4 deep symmetric inversions — Wellens pattern',       c: 'ekw-c-warn',
          badge: { txt: 'Wellens?', type: 'danger' } },
        { v: 'peaked',   l: 'Peaked / Hyperacute',   s: 'Tall broad symmetric T — hyperK · hyperacute MI · de Winter', c: 'ekw-c-warn',
          badge: { txt: 'Check K⁺', type: 'warn' } },
        { v: 'flat_u',   l: 'Flat T + Prominent U',  s: 'Hypokalemia · hypomagnesemia · bradycardia',              c: 'ekw-c-warn' },
      ],
      ref: [
        { t: 'Wellens Syndrome', items: [
          'Type A: biphasic T in V2-V3',
          'Type B: deep symmetric TWI V2-V4 (more common)',
          'After chest pain resolves — critical proximal LAD stenosis',
          'Do NOT stress test → urgent coronary angiography',
        ]},
        { t: 'Peaked T Waves', items: [
          'Early hyperK: peaked narrow T (check K⁺ urgently)',
          'Hyperacute STEMI: tall broad T early in MI',
          'de Winter pattern: upsloping STD + tall T V1-V6 = LAD occlusion equivalent',
        ]},
        { t: 'Hyperkalemia EKG Sequence', items: [
          'K⁺ 5.5–6.5: peaked narrow T', 'K⁺ 6.5–7.5: PR ↑, QRS widens',
          'K⁺ > 7.5: sine-wave pattern → arrest risk',
        ]},
      ]
    },

    comparison: {
      id: 'comparison', label: 'Prior Comparison',
      q: 'Compared with prior EKG?',
      sub: 'New vs old changes often determine urgency. Use "no prior" if unavailable.',
      opts: [
        { v: 'no_prior',  l: 'No Prior Available',      s: 'No baseline tracing available for comparison',       c: '' },
        { v: 'unchanged', l: 'No Meaningful Change',    s: 'Findings appear unchanged compared with prior EKG',   c: 'ekw-c-green' },
        { v: 'new',       l: 'New / Dynamic Change',    s: 'New ischemic, conduction, rhythm, or interval change', c: 'ekw-c-warn',
          badge: { txt: 'Attention', type: 'warn' } },
      ],
      ref: [
        { t: 'Comparison Pearls', items: [
          'New ST-T, Q-wave, rhythm, conduction, or QTc changes deserve higher attention.',
          'Old LBBB, LVH strain, early repolarization, and prior Q waves can prevent over-calling acute ischemia.',
          'If no prior is available, document that uncertainty explicitly.',
        ]},
      ]
    },

  };

  // ============================================================
  // SEQUENCE BUILDER (handles branching)
  // ============================================================
  function buildSequence(ans) {
    const seq = ['rate', 'rhythm'];
    if (ans.rhythm !== 'afib' && ans.rhythm !== 'no_p') seq.push('pr');
    seq.push('qrs_width');
    if (ans.qrs_width === 'wide') seq.push('qrs_type');
    if (ans.rate === 'brady' || ans.pr === 'long' || ans.pr === 'variable' || ans.rhythm === 'no_p') seq.push('brady_av');
    if (ans.rate === 'tachy' && ans.qrs_width && ans.qrs_width !== 'wide') seq.push('narrow_tach');
    if (ans.rate === 'tachy' && ans.qrs_width === 'wide') seq.push('wct');
    seq.push('axis', 'qtc', 'chamber', 'q_waves', 'st', 't_waves', 'comparison', 'summary');
    return seq;
  }

  function buildSummary(answers, finalNote) {
    var a = answers || {};
    var alerts = [], chips = [], narrative = [];

    var rateLabels = { brady: 'Bradycardia (< 60 bpm)', normal: 'Normal rate (60–100 bpm)', tachy: 'Tachycardia (> 100 bpm)' };
    if (a.rate) {
      narrative.push('Rate: ' + (rateLabels[a.rate] || a.rate) + '.');
      chips.push({ l: rateLabels[a.rate] || a.rate, cls: a.rate === 'normal' ? 'ok' : 'caution' });
    }

    var rhythmLabels = { sinus: 'Regular sinus rhythm', afib: 'Atrial fibrillation (irregularly irregular, no P waves)',
      reg_irr: 'Regularly irregular rhythm (atrial flutter or grouped beats)',
      no_p: 'No clear P waves (junctional or ventricular rhythm)' };
    if (a.rhythm) {
      narrative.push('Rhythm: ' + (rhythmLabels[a.rhythm] || a.rhythm) + '.');
      chips.push({ l: (rhythmLabels[a.rhythm] || a.rhythm).split(' (')[0], cls: a.rhythm === 'sinus' ? 'ok' : 'caution' });
      if (a.rhythm === 'afib') {
        alerts.push({ sev: 'caution', title: 'Atrial Fibrillation',
          body: 'Assess rate control vs rhythm control. Calculate CHA₂DS₂-VASc for anticoagulation decision.' });
      }
    }

    var prLabels = { normal: 'Normal PR (120–200 ms)', long: '1st-degree AV block (PR > 200 ms)',
      short_d: 'Short PR with delta wave (WPW pre-excitation)', variable: '2nd-degree AV block (variable or dropped beats)' };
    if (a.pr) {
      narrative.push('PR interval: ' + (prLabels[a.pr] || a.pr) + '.');
      if (a.pr !== 'normal') {
        chips.push({ l: (prLabels[a.pr] || a.pr).split(' (')[0], cls: 'caution' });
        if (a.pr === 'short_d') {
          alerts.push({ sev: 'caution', title: 'WPW Pre-excitation',
            body: 'Avoid AV node blockers (adenosine, digoxin, verapamil) if AFib develops — risk of rapid accessory conduction → VF. Electrophysiology referral.' });
        }
        if (a.pr === 'variable') {
          alerts.push({ sev: 'caution', title: 'AV Block',
            body: 'Classify: Mobitz I (Wenckebach — usually benign) vs Mobitz II (infranodal — higher risk, may need pacing). 3° AV block requires urgent cardiology.' });
        }
      } else {
        chips.push({ l: 'Normal PR', cls: 'ok' });
      }
    }

    var qrsLabels = { narrow: 'Narrow QRS (< 110 ms)', borderline: 'Borderline QRS (110–119 ms)', wide: 'Wide QRS (≥ 120 ms)' };
    if (a.qrs_width) {
      narrative.push('QRS: ' + (qrsLabels[a.qrs_width] || a.qrs_width) + '.');
      chips.push({ l: qrsLabels[a.qrs_width] || a.qrs_width, cls: a.qrs_width === 'narrow' ? 'ok' : 'caution' });
    }

    var qrsTypeLabels = { rbbb: 'RBBB morphology', lbbb: 'LBBB morphology', paced: 'Paced rhythm',
      vt: 'VT or SVT with aberrancy', meta: 'Metabolic/drug-effect wide QRS' };
    if (a.qrs_type) {
      narrative.push('Wide QRS pattern: ' + (qrsTypeLabels[a.qrs_type] || a.qrs_type) + '.');
      chips.push({ l: qrsTypeLabels[a.qrs_type] || a.qrs_type, cls: a.qrs_type === 'vt' ? 'alert' : 'note' });
      if (a.qrs_type === 'vt') {
        alerts.push({ sev: 'danger', title: 'Possible Ventricular Tachycardia',
          body: 'Treat as VT until proven otherwise. If unstable: synchronized cardioversion. If stable: antiarrhythmic + cardiology.' });
      }
      if (a.qrs_type === 'lbbb') {
        alerts.push({ sev: 'info', title: 'LBBB — Important Caveats',
          body: 'LBBB or paced rhythm can obscure ischemia. Apply Sgarbossa/modified Sgarbossa criteria and correlate with symptoms, troponin trend, and prior EKG. LBBB invalidates standard LVH voltage criteria.' });
      }
    }

    var narrowTachLabels = {
      sinus: 'Sinus tachycardia pattern',
      avnrt_avrt: 'Regular re-entrant SVT pattern (AVNRT/AVRT)',
      flutter: 'Atrial flutter pattern',
      af_mat: 'Irregular narrow tachycardia (AF/MAT)',
      uncertain: 'Uncertain narrow-complex tachycardia',
    };
    if (a.narrow_tach) {
      narrative.push('Narrow tachycardia branch: ' + (narrowTachLabels[a.narrow_tach] || a.narrow_tach) + '.');
      chips.push({ l: narrowTachLabels[a.narrow_tach] || a.narrow_tach, cls: a.narrow_tach === 'sinus' ? 'ok' : 'caution' });
      if (a.narrow_tach === 'avnrt_avrt') {
        alerts.push({ sev: 'caution', title: 'Regular Re-entrant SVT',
          body: 'Look for abrupt onset/offset and hidden or retrograde P waves. Vagal maneuvers or adenosine may terminate AVNRT/orthodromic AVRT if no pre-excitation concern.' });
      }
      if (a.narrow_tach === 'flutter') {
        alerts.push({ sev: 'caution', title: 'Atrial Flutter Pattern',
          body: 'Search inferior leads and V1 for sawtooth flutter waves, especially when the ventricular rate is near 150 bpm.' });
      }
    }

    var wctLabels = {
      vt_likely: 'Wide-complex tachycardia: VT likely',
      svt_aberrancy: 'Wide-complex tachycardia: SVT with aberrancy possible',
      preexcited_af: 'Irregular wide tachycardia: pre-excited AF concern',
      torsades: 'Polymorphic VT / torsades concern',
      paced_device: 'Paced or device-mediated wide tachycardia',
    };
    if (a.wct) {
      narrative.push('Wide tachycardia branch: ' + (wctLabels[a.wct] || a.wct) + '.');
      chips.push({ l: wctLabels[a.wct] || a.wct, cls: (a.wct === 'vt_likely' || a.wct === 'preexcited_af' || a.wct === 'torsades') ? 'alert' : 'caution' });
      if (a.wct === 'vt_likely') {
        alerts.push({ sev: 'danger', title: 'Wide-Complex Tachycardia — Treat as VT',
          body: 'VT is the default diagnosis for undifferentiated regular WCT. AV dissociation, capture/fusion beats, concordance, extreme axis, or prior MI/CMP strengthen VT concern.' });
      }
      if (a.wct === 'preexcited_af') {
        alerts.push({ sev: 'danger', title: 'Pre-excited AF Concern',
          body: 'Irregular very rapid wide-complex rhythm with variable QRS can deteriorate to VF. Avoid AV-nodal blockers and escalate urgently.' });
      }
      if (a.wct === 'torsades') {
        alerts.push({ sev: 'danger', title: 'Polymorphic VT / Torsades Concern',
          body: 'Review QTc, stop QT-prolonging meds, replete electrolytes, and give magnesium when clinically appropriate.' });
      }
    }

    var bradyLabels = {
      sinus_brady: 'Sinus bradycardia',
      junctional: 'Junctional escape rhythm',
      first_deg: '1st-degree AV block',
      mobitz_i: 'Mobitz I / Wenckebach',
      mobitz_ii: 'Mobitz II or high-grade AV block',
      complete: 'Complete heart block',
      reversible: 'Possible reversible or medication-related bradycardia',
    };
    if (a.brady_av) {
      narrative.push('Brady/AV block branch: ' + (bradyLabels[a.brady_av] || a.brady_av) + '.');
      chips.push({ l: bradyLabels[a.brady_av] || a.brady_av, cls: (a.brady_av === 'mobitz_ii' || a.brady_av === 'complete') ? 'alert' : (a.brady_av === 'sinus_brady' ? 'ok' : 'caution') });
      if (a.brady_av === 'mobitz_i') {
        alerts.push({ sev: 'caution', title: 'Mobitz I / Wenckebach',
          body: 'Progressive PR lengthening before a dropped beat usually localizes to the AV node. Correlate with symptoms, medications, inferior ischemia, and vagal tone.' });
      }
      if (a.brady_av === 'mobitz_ii') {
        alerts.push({ sev: 'danger', title: 'Mobitz II / High-grade AV Block',
          body: 'Fixed PR with dropped QRS or consecutive dropped P waves suggests infranodal disease. Place pacing pads and escalate urgently, especially with wide QRS or symptoms.' });
      }
      if (a.brady_av === 'complete') {
        alerts.push({ sev: 'danger', title: 'Complete Heart Block',
          body: 'P waves and QRS complexes march independently. Assess stability, prepare pacing support, review reversible causes, and involve cardiology urgently.' });
      }
      if (a.brady_av === 'reversible') {
        alerts.push({ sev: 'caution', title: 'Reversible Bradycardia Check',
          body: 'Review beta-blockers, non-DHP calcium channel blockers, digoxin, amiodarone, hyperkalemia, inferior MI, hypothermia, hypothyroidism, and sleep apnea.' });
      }
    }

    var axisLabels = { normal: 'Normal axis (0° to +90°)', lad: 'Left axis deviation', rad: 'Right axis deviation', extreme: 'Extreme/NW axis' };
    if (a.axis) {
      narrative.push('Axis: ' + (axisLabels[a.axis] || a.axis) + '.');
      chips.push({ l: axisLabels[a.axis] || a.axis, cls: a.axis === 'normal' ? 'ok' : 'caution' });
    }

    var qtcLabels = { normal: 'Normal QTc', borderline: 'Borderline QTc (monitor)', prolonged: 'Prolonged QTc ≥ 500 ms', short: 'Short QTc (< 360 ms)' };
    if (a.qtc) {
      narrative.push('QTc: ' + (qtcLabels[a.qtc] || a.qtc) + '.');
      if (a.qtc === 'prolonged') {
        chips.push({ l: 'QTc ≥ 500 ms — TdP risk', cls: 'alert' });
        alerts.push({ sev: 'danger', title: 'Prolonged QTc — Torsades Risk',
          body: 'Hold QT-prolonging meds. Replete K⁺ > 4 mEq/L and Mg²⁺ > 2 mg/dL. Continuous cardiac monitoring. Electrophysiology if symptomatic.' });
      } else if (a.qtc === 'borderline') {
        chips.push({ l: 'Borderline QTc — monitor', cls: 'caution' });
      } else if (a.qtc === 'short') {
        chips.push({ l: 'Short QTc', cls: 'caution' });
      } else {
        chips.push({ l: 'Normal QTc', cls: 'ok' });
      }
    }

    var chamberLabels = { none: 'No chamber abnormalities', lvh: 'LVH', rvh: 'RVH', atrial: 'Atrial enlargement', low_v: 'Low voltage' };
    if (a.chamber) {
      if (a.chamber !== 'none') {
        narrative.push('Chamber/voltage: ' + (chamberLabels[a.chamber] || a.chamber) + '.');
        chips.push({ l: chamberLabels[a.chamber] || a.chamber, cls: a.chamber === 'low_v' ? 'caution' : 'note' });
        if (a.chamber === 'low_v') {
          alerts.push({ sev: 'caution', title: 'Low Voltage',
            body: 'Consider pericardial effusion/tamponade (urgent bedside echo), hypothyroidism, amyloidosis, COPD, or obesity.' });
        }
      } else {
        chips.push({ l: 'No chamber abnormality', cls: 'ok' });
      }
    }

    var qLabels = { normal: 'Normal Q waves / R progression', prwp: 'Poor R-wave progression',
      path_q: 'Pathologic Q waves (possible prior MI)', dom_r_v1: 'Dominant R in V1-V2' };
    if (a.q_waves) {
      if (a.q_waves !== 'normal') {
        narrative.push('Q waves/R progression: ' + (qLabels[a.q_waves] || a.q_waves) + '.');
        chips.push({ l: qLabels[a.q_waves] || a.q_waves, cls: 'caution' });
        if (a.q_waves === 'path_q') {
          alerts.push({ sev: 'caution', title: 'Pathologic Q Waves',
            body: 'Suggests prior MI in corresponding territory. Correlate with clinical history, troponin, and prior EKG.' });
        }
      } else {
        chips.push({ l: 'Normal Q / R progression', cls: 'ok' });
      }
    }

    var stLabels = { normal: 'No ST changes', stemi: 'ST elevation — contiguous leads (STEMI pattern)',
      std: 'ST depression', peri: 'Diffuse STE with PR depression (pericarditis)',
      brugada: 'Brugada pattern (coved STE V1-V2)', early_r: 'Early repolarization pattern', strain: 'Strain pattern (secondary)' };
    if (a.st) {
      if (a.st !== 'normal') narrative.push('ST segment: ' + (stLabels[a.st] || a.st) + '.');
      if (a.st === 'stemi') {
        chips.push({ l: 'STEMI / Equivalent', cls: 'alert' });
        alerts.push({ sev: 'danger', title: 'STEMI / STEMI-Equivalent',
          body: 'Activate STEMI protocol immediately. Aspirin 325 mg + P2Y12. Target door-to-balloon < 90 min. Do not delay for labs.' });
      } else if (a.st === 'brugada') {
        chips.push({ l: 'Brugada Pattern', cls: 'alert' });
        alerts.push({ sev: 'danger', title: 'Brugada Pattern (Type 1)',
          body: 'Coved STE ≥ 2 mm in V1-V2 = sudden cardiac death risk. Urgent electrophysiology referral. Avoid Na-channel blockers, fever, large meals.' });
      } else if (a.st === 'peri') {
        chips.push({ l: 'Pericarditis Pattern', cls: 'caution' });
        alerts.push({ sev: 'caution', title: 'Pericarditis Pattern',
          body: 'Confirm with echo to exclude effusion/tamponade. NSAIDs + colchicine × 3 months. Activity restriction.' });
      } else if (a.st === 'normal') {
        chips.push({ l: 'No ST changes', cls: 'ok' });
      } else {
        chips.push({ l: stLabels[a.st] || a.st, cls: 'caution' });
      }
    }

    var tLabels = { normal: 'Normal T waves', inv: 'T-wave inversion',
      deep_sym: 'Deep symmetric TWI (Wellens pattern)', peaked: 'Peaked/hyperacute T waves', flat_u: 'Flat T + prominent U waves' };
    if (a.t_waves) {
      if (a.t_waves !== 'normal') narrative.push('T waves: ' + (tLabels[a.t_waves] || a.t_waves) + '.');
      if (a.t_waves === 'deep_sym') {
        chips.push({ l: 'Wellens Pattern', cls: 'alert' });
        alerts.push({ sev: 'danger', title: 'Possible Wellens Syndrome',
          body: 'Deep symmetric TWI V2-V4 after chest pain = critical proximal LAD stenosis. Avoid stress testing. Urgent coronary angiography.' });
      } else if (a.t_waves === 'peaked') {
        chips.push({ l: 'Peaked T Waves — check K⁺', cls: 'caution' });
        alerts.push({ sev: 'caution', title: 'Peaked T Waves',
          body: 'Early hyperkalemia (check K⁺ urgently) or hyperacute MI / de Winter pattern. Correlate clinically.' });
      } else if (a.t_waves === 'flat_u') {
        chips.push({ l: 'Hypokalemia Pattern', cls: 'caution' });
        alerts.push({ sev: 'caution', title: 'Flat T + Prominent U Waves',
          body: 'Check K⁺ and Mg²⁺. Dangerous if concurrent QTc prolongation (TdP risk).' });
      } else if (a.t_waves === 'normal') {
        chips.push({ l: 'Normal T waves', cls: 'ok' });
      } else {
        chips.push({ l: tLabels[a.t_waves] || a.t_waves, cls: 'caution' });
      }
    }

    var comparisonLabels = {
      no_prior: 'No prior EKG available for comparison',
      unchanged: 'No meaningful change compared with prior EKG',
      new: 'New or dynamic change compared with prior EKG',
    };
    if (a.comparison) {
      narrative.push('Comparison: ' + (comparisonLabels[a.comparison] || a.comparison) + '.');
      chips.push({
        l: a.comparison === 'new' ? 'New/dynamic change' : (comparisonLabels[a.comparison] || a.comparison),
        cls: a.comparison === 'new' ? 'caution' : (a.comparison === 'unchanged' ? 'ok' : 'note'),
      });
      if (a.comparison === 'new') {
        alerts.push({ sev: 'caution', title: 'New / Dynamic EKG Change',
          body: 'Correlate with symptoms, vitals, electrolytes, troponin trend, and medication changes; escalate based on the specific finding.' });
      }
    }

    if (!chips.length) chips.push({ l: 'No findings recorded', cls: 'note' });

    var copyText = '=== EKG Systematic Interpretation ===\n' +
      narrative.join('\n') +
      (finalNote ? '\n\nClinical context / note:\n' + finalNote : '') +
      (alerts.length ? '\n\nALERTS:\n' + alerts.map(function (al) { return '• ' + al.title + ': ' + al.body; }).join('\n') : '');

    return { alerts: alerts, chips: chips, narrative: narrative, copyText: copyText };
  }

  global.EKG_GUIDE = Object.freeze({
    version: ENGINE_VERSION,
    STEPS: STEPS,
    buildSequence: buildSequence,
    buildSummary: buildSummary,
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ---- portal/static/js/portal-calculator-registry.js :: correctedSodium, sodiumFreeWater, hyponatremia ----
// eslint-disable-next-line no-unused-vars
const hasNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const numberOrNull = (value) => hasNumber(value) ? Number(value) : null;
const round1 = (value) => Math.round(value * 10) / 10;
function correctedSodium({ sodium, glucose }) {
    const na = numberOrNull(sodium);
    const glu = numberOrNull(glucose);
    if (na === null || na <= 0) return null;
    const glucoseCorrection = glu !== null && glu > 100 ? 1.6 * ((glu - 100) / 100) : 0;
    return {
      measuredSodium: na,
      glucose: glu,
      glucoseCorrection,
      correctedSodium: na + glucoseCorrection,
      effectiveOsmolality: (2 * na) + ((glu || 0) / 18),
    };
  }
function sodiumFreeWater({ sodium, glucose, weightKg, sex, targetSodium = 145 }) {
    const sodiumResult = correctedSodium({ sodium, glucose });
    if (!sodiumResult) return null;
    const weight = numberOrNull(weightKg);
    const target = numberOrNull(targetSodium) || 145;
    const tbwFactor = String(sex || '').toUpperCase() === 'F' ? 0.5 : 0.6;
    const deficitLiters = weight !== null && weight > 0 && sodiumResult.correctedSodium > target
      ? Math.max(0, tbwFactor * weight * ((sodiumResult.correctedSodium / target) - 1))
      : null;
    const corrected = sodiumResult.correctedSodium;
    return {
      ...sodiumResult,
      targetSodium: target,
      tbwFactor,
      deficitLiters,
      severity: corrected >= 160 || corrected < 125 ? 'danger' : corrected >= 150 || corrected < 130 ? 'warn' : 'success',
    };
  }
function hyponatremia({
    sodium, glucose, serumOsmolality, urineOsmolality, urineSodium,
    volumeStatus = 'unknown', chronicity = 'unknown', symptoms = 'none', odsRisk = 'standard',
  }) {
    const sodiumResult = correctedSodium({ sodium, glucose });
    if (!sodiumResult) return null;
    const serumOsm = numberOrNull(serumOsmolality);
    const urineOsm = numberOrNull(urineOsmolality);
    const urineNa = numberOrNull(urineSodium);
    const osmForTone = serumOsm !== null ? serumOsm : sodiumResult.effectiveOsmolality;
    const osmSource = serumOsm !== null ? 'measured serum osm' : 'effective osm estimate';

    let tonicity = 'Hypotonic hyponatremia likely';
    let toneDetail = `${osmSource} ${Math.round(osmForTone)} mOsm/kg`;
    if (osmForTone >= 295) {
      tonicity = 'Hypertonic / translocational pattern';
      toneDetail += ' — glucose or other effective osmoles can lower measured Na';
    } else if (osmForTone >= 275) {
      tonicity = 'Isotonic or non-hypotonic pattern';
      toneDetail += ' — consider pseudohyponatremia or non-hypotonic causes';
    }

    const urineOsmText = urineOsm === null
      ? 'Urine osm not entered'
      : urineOsm < 100
        ? `Uosm ${urineOsm}: ADH suppressed; think primary polydipsia, low solute intake, or reset after water load`
        : `Uosm ${urineOsm}: ADH active; interpret with volume status and urine sodium`;
    const urineNaText = urineNa === null
      ? 'Urine Na not entered'
      : urineNa < 30
        ? `UNa ${urineNa}: sodium avidity / low effective arterial volume pattern`
        : `UNa ${urineNa}: renal sodium loss, SIADH-like, endocrine, renal failure, or diuretic pattern`;

    let likely = 'Pattern incomplete: start with serum osm, urine osm, urine Na, volume exam, medication review.';
    if (osmForTone >= 295) {
      likely = 'Likely non-hypotonic/translocational hyponatremia; treat the effective osmole problem rather than chasing Na alone.';
    } else if (osmForTone >= 275) {
      likely = 'Non-hypotonic or pseudohyponatremia pattern; verify measured serum osm and consider lipids/protein or lab artifact.';
    } else if (urineOsm !== null && urineOsm < 100) {
      likely = 'Dilute urine pattern: excess water intake, low solute intake, or beer/tea-toast physiology is more likely than persistent SIADH.';
    } else if (volumeStatus === 'hypovolemic') {
      likely = urineNa !== null && urineNa >= 30
        ? 'Hypovolemic with higher urine Na: consider diuretics, mineralocorticoid deficiency, salt wasting, or renal losses.'
        : 'Hypovolemic pattern: GI/skin/third-space losses are common; monitor closely for rapid auto-correction after volume is restored.';
    } else if (volumeStatus === 'euvolemic') {
      likely = urineNa !== null && urineNa >= 30
        ? 'Euvolemic hypotonic pattern with concentrated urine: SIADH-like physiology; also check TSH, morning cortisol, meds, pain/nausea, pulmonary/CNS triggers.'
        : 'Euvolemic pattern with low urine sodium is less classic; re-check volume status, solute intake, and urine studies.';
    } else if (volumeStatus === 'hypervolemic') {
      likely = urineNa !== null && urineNa < 30
        ? 'Hypervolemic low-effective-volume pattern: HF, cirrhosis, nephrotic syndrome, or advanced renal disease context.'
        : 'Hypervolemic pattern with higher urine Na: consider renal failure, diuretics, or mixed physiology.';
    } else if (urineOsm !== null && urineOsm >= 100 && urineNa !== null && urineNa >= 30) {
      likely = 'Concentrated urine + UNa >=30: SIADH-like, endocrine, renal salt loss, renal failure, or diuretic-associated pattern.';
    } else if (urineOsm !== null && urineOsm >= 100 && urineNa !== null && urineNa < 30) {
      likely = 'Concentrated urine + UNa <30: low effective arterial volume pattern; decide hypovolemic vs hypervolemic clinically.';
    }

    const correctionText = odsRisk === 'high'
      ? 'High ODS risk: target rise 4-6 mmol/L in 24 h; do not exceed 8 mmol/L in 24 h.'
      : 'Standard risk: target rise 4-8 mmol/L in 24 h; avoid >10 mmol/L in 24 h; many use 8 as a conservative ward target.';
    const nextChecks = [];
    if (serumOsm === null) nextChecks.push('measure serum osm to confirm hypotonicity');
    if (urineOsm === null) nextChecks.push('send urine osm');
    if (urineNa === null) nextChecks.push('send urine sodium');
    if (osmForTone < 275 && volumeStatus === 'unknown') nextChecks.push('document volume status');
    if (osmForTone < 275 && (urineOsm === null || urineOsm >= 100)) nextChecks.push('review thiazides/SSRIs/antiepileptics, TSH, and morning cortisol');
    if (symptoms === 'severe') nextChecks.push('severe symptoms: urgent hypertonic saline protocol / expert escalation');
    if (chronicity !== 'acute') nextChecks.push('trend Na and urine output during active correction');
    const corrected = sodiumResult.correctedSodium;
    const reasoning = [
      `Corrected Na ${round1(corrected)} mmol/L${sodiumResult.glucoseCorrection ? ` (measured ${sodiumResult.measuredSodium}, +${round1(sodiumResult.glucoseCorrection)} glucose correction)` : ` (measured ${sodiumResult.measuredSodium})`}.`,
      `${tonicity} — ${toneDetail}.`,
    ];
    if (osmForTone < 275) {
      reasoning.push(`Volume status: ${volumeStatus === 'unknown' ? 'not documented' : volumeStatus}.`);
      reasoning.push(urineOsmText + '.');
      reasoning.push(urineNaText + '.');
    }
    reasoning.push(likely);

    return {
      ...sodiumResult,
      serumOsmolality: serumOsm,
      urineOsmolality: urineOsm,
      urineSodium: urineNa,
      osmForTone,
      tonicity,
      toneDetail,
      urineOsmText,
      urineNaText,
      likely,
      correctionText,
      nextChecks,
      reasoning,
      severity: symptoms === 'severe' || corrected < 120 ? 'danger' : corrected < 130 || symptoms === 'moderate' ? 'warn' : 'success',
    };
  }

export const CALCULATOR_FORMULAS = window.CALCULATOR_FORMULAS;
export const CALCULATOR_SCORES = window.CALCULATOR_SCORES;
export const COCKCROFT_GAULT = window.COCKCROFT_GAULT;
export const EKG_GUIDE = window.EKG_GUIDE;
export const REGISTRY_CALCULATORS = Object.freeze({ correctedSodium, sodiumFreeWater, hyponatremia });

export const PUBLIC_SOURCE_TRANSFORMATIONS = [{"drugId":"colistin","field":"monitoring.1","transformation":"Remove only the institutional service attribution; preserve the complete clinical monitoring target.","originalSha256":"c4d65a2062bed3c54aeec3a2cef9b9185704a6b75661d97fe0295768715b1b0f","outputSha256":"a9d57e3ff09a0c02457afd67b7a831b5bf9585c362308c336a129282e2857272"},{"drugId":"vancomycin","field":"monitoring.0","transformation":"Remove only the institutional service attribution; preserve the complete clinical monitoring target.","originalSha256":"d99cf6fffcb2ea49e63817020933ac02bce4d8a67aa35a1335624a87ee97d7a4","outputSha256":"e3855156a625dc356f8a10a22887d6642aa02cb02a608c5202ec3b6126b09a03"},{"drugId":"voriconazole","field":"monitoring.0","transformation":"Remove only the institutional service attribution; preserve the complete clinical monitoring target.","originalSha256":"bace825da23f6bcc5986ef67a330f0d7ebd50baa311616c1bdddf59594b330a2","outputSha256":"f8b721c7dac38814a861a73d40ec4a1780ceec5e527830bbb24821a4ea21dd88"},{"sourcePath":"portal/static/js/portal-calculator-formulas.js","transformation":"Omit captured glucocorticoid product identity table; clinical equivalence formulas are unchanged.","originalSha256":"e88b0249743ec68c90050e0a19212aef81c6d31900939f9a8d4ed3ae28d1b6de","outputSha256":"2121e98dc1a44b9a048c470d2cc90ccb7c622745456c27e7f8e5780e12dd81d2"},{"sourcePath":"portal/static/js/portal-ekg-engine.js","transformation":"Omit four ECG illustration references without recorded redistribution provenance; retain textual criteria.","originalSha256":"b38e19dff0d25cc69830ae44d17f9d15cda360f5e09de97b5069029d32649e2b","outputSha256":"99107a8cdb098d534b1ab49bb4c7567fc36dfced7419af359650314cf54d984b"},{"sourcePath":"portal/static/js/management-guides/lab-review-entry.mjs","transformation":"Omit guided numeric-entry bridge and its desktop registry import closure; standard calculator lab review remains available."}];
