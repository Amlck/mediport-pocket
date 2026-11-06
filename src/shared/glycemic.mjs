// Maintained public source, initially extracted from Mediport Medical.
// See UPSTREAM_PROVENANCE.json for original source hashes and extraction notes.
export const GLYCEMIC_SOURCE = {"originalFile":"portal/static/js/portal-glycemic.js","sha256":"03bef97c296b84d9170b057f742c5f4d05e70c2ddedf7858b5c3dc5dcde8c105"};
const window = {}; const globalThis = {};
// ---------------------------------------------------------------------------
// Shared glycemic crisis / hypoglycemia classification
// ---------------------------------------------------------------------------
(function initGlycemicControl(root) {
  const has = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const num = (value) => (has(value) ? Number(value) : null);

  function normalizeKetones(value) {
    if (value === null || value === undefined || value === '') return 'unknown';
    if (typeof value === 'number') {
      if (value >= 2) return 'positive';
      if (value < 1) return 'negative';
      return 'trace';
    }
    const text = String(value).trim().toLowerCase();
    if (!text || text === 'unknown') return 'unknown';
    if (/neg|none|absent/.test(text)) return 'negative';
    if (/trace|\+\/-|small/.test(text)) return 'trace';
    const numeric = text.match(/(\d+(?:\.\d+)?)\s*\+?/);
    if (numeric) return parseFloat(numeric[1]) >= 2 ? 'positive' : 'trace';
    if (/pos|moderate|large|>=?\s*2\+|2\+/.test(text)) return 'positive';
    return 'unknown';
  }

  function classifyGlycemicState(input = {}) {
    const glucose = num(input.glucose ?? input.Glu);
    const na = num(input.na ?? input.Na);
    const k = num(input.k ?? input.K);
    const ph = num(input.ph ?? input.pH);
    const hco3 = num(input.hco3 ?? input.HCO3);
    const bhb = num(input.bhb ?? input.BHB);
    const bun = num(input.bun ?? input.BUN);
    const measuredOsm = num(input.measuredOsm ?? input.osm ?? input.Osm);
    const ketones = normalizeKetones(input.ketones ?? input.Ketones);
    const mental = input.mental || 'alert';
    const knownDiabetes = Boolean(input.knownDiabetes);

    const correctedNa = has(na) && has(glucose)
      ? na + (glucose > 100 ? 1.6 * ((glucose - 100) / 100) : 0)
      : null;
    const effectiveOsm = has(na) && has(glucose) ? 2 * na + glucose / 18 : null;
    const estimatedTotalOsm = has(effectiveOsm) && has(bun) ? effectiveOsm + bun / 2.8 : null;

    const ketonesPositive = (has(bhb) && bhb >= 3) || ketones === 'positive';
    const ketonesAbsent = (has(bhb) && bhb < 3) || ketones === 'negative' || ketones === 'trace';
    const acidosis = (has(ph) && ph < 7.3) || (has(hco3) && hco3 < 18);
    const hhsAcidosisAbsent = has(ph) && ph >= 7.3 && has(hco3) && hco3 >= 15;
    const hyperosmolarity = (has(effectiveOsm) && effectiveOsm > 300) || (has(estimatedTotalOsm) && estimatedTotalOsm > 320) || (has(measuredOsm) && measuredOsm > 320);
    const diabetesOrHyperglycemia = knownDiabetes || (has(glucose) && glucose >= 200);

    const hypoglycemiaLevel = has(glucose) && glucose < 54 ? 2 : has(glucose) && glucose < 70 ? 1 : 0;
    const dkaConfirmed = hypoglycemiaLevel === 0 && diabetesOrHyperglycemia && ketonesPositive && acidosis;
    const dkaPossible = hypoglycemiaLevel === 0 && diabetesOrHyperglycemia && acidosis && !has(bhb) && ketones === 'unknown';
    const euglycemicDkaConcern = hypoglycemiaLevel === 0 && has(glucose) && glucose < 200 && ketonesPositive && acidosis;
    const hhsCompatible = hypoglycemiaLevel === 0 && has(glucose) && glucose >= 600 && hyperosmolarity && ketonesAbsent && hhsAcidosisAbsent;
    const hhsPossible = hypoglycemiaLevel === 0 && has(glucose) && glucose >= 600 && hyperosmolarity && !hhsCompatible && !dkaConfirmed;
    const mixedOverlap = dkaConfirmed && has(glucose) && glucose >= 600 && hyperosmolarity;
    const severeHyperglycemia = hypoglycemiaLevel === 0 && has(glucose) && glucose >= 400 && !dkaConfirmed && !mixedOverlap && !hhsCompatible;
    const hyperglycemiaWithoutCrisis = hypoglycemiaLevel === 0 && has(glucose) && glucose >= 200 && !dkaConfirmed && !dkaPossible && !mixedOverlap && !hhsCompatible && !hhsPossible;

    let pattern = 'No deterministic DKA/HHS pattern';
    if (hypoglycemiaLevel === 2) pattern = 'Level 2 hypoglycemia';
    else if (hypoglycemiaLevel === 1) pattern = 'Level 1 hypoglycemia';
    else if (mixedOverlap) pattern = 'Mixed DKA/HHS-compatible pattern';
    else if (dkaConfirmed) pattern = 'DKA-compatible pattern';
    else if (euglycemicDkaConcern) pattern = 'Euglycemic DKA-compatible pattern';
    else if (dkaPossible) pattern = 'Possible DKA: acidosis present, confirm beta-hydroxybutyrate/ketones';
    else if (hhsCompatible) pattern = 'HHS-compatible pattern';
    else if (hhsPossible) pattern = 'Possible HHS: hyperglycemia with hyperosmolality; confirm ketones and acid-base status';
    else if (severeHyperglycemia) pattern = 'Severe hyperglycemia without confirmed DKA/HHS';
    else if (hyperglycemiaWithoutCrisis) pattern = 'Hyperglycemia without DKA/HHS-range criteria';

    let severity = 'Severity incomplete';
    if (hypoglycemiaLevel === 2) severity = 'Clinically significant hypoglycemia';
    else if (hypoglycemiaLevel === 1) severity = 'Hypoglycemia alert value';
    else if (dkaConfirmed || dkaPossible || mixedOverlap) {
      severity = 'Mild/early DKA range';
      if ((has(ph) && ph < 7.0) || (has(hco3) && hco3 < 10) || (has(bhb) && bhb > 6) || mental === 'stupor') {
        severity = 'Severe DKA range';
      } else if ((has(ph) && ph < 7.25) || (has(hco3) && hco3 < 15) || mental === 'drowsy') {
        severity = 'Moderate DKA range';
      }
    } else if (hhsCompatible || hhsPossible) {
      severity = mental === 'alert' ? 'HHS physiology; mental status preserved' : 'HHS physiology with altered mentation';
    } else if (euglycemicDkaConcern) {
      severity = 'Euglycemic DKA concern: check SGLT2 inhibitor, starvation, pregnancy, alcohol, or insulin omission';
    } else if (severeHyperglycemia) {
      severity = 'Severe hyperglycemia; crisis criteria incomplete or not met';
    }

    let tone = 'success';
    if (hypoglycemiaLevel === 2 || dkaConfirmed || dkaPossible || hhsCompatible || hhsPossible || mixedOverlap || severity.startsWith('Severe') || (has(k) && k < 3.5)) tone = 'danger';
    else if (hypoglycemiaLevel === 1 || severeHyperglycemia || hyperglycemiaWithoutCrisis || euglycemicDkaConcern || !has(bhb) || !has(na)) tone = 'warn';

    return {
      glucose,
      na,
      k,
      ph,
      hco3,
      bhb,
      bun,
      measuredOsm,
      ketones,
      correctedNa,
      effectiveOsm,
      estimatedTotalOsm,
      hyperosmolarity,
      ketonesPositive,
      ketonesAbsent,
      acidosis,
      hypoglycemiaLevel,
      dkaConfirmed,
      dkaPossible,
      euglycemicDkaConcern,
      hhsCompatible,
      hhsPossible,
      mixedOverlap,
      severeHyperglycemia,
      hyperglycemiaWithoutCrisis,
      pattern,
      severity,
      tone,
    };
  }

  const api = { classifyGlycemicState, normalizeKetones };
  root.GlycemicControl = api;
  if (typeof globalThis !== 'undefined') globalThis.GlycemicControl = api;
})(typeof window !== 'undefined' ? window : globalThis);

export const classifyGlycemicState = window.GlycemicControl.classifyGlycemicState;