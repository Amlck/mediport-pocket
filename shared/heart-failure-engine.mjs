// Source-reviewed, data-only decision support for adult inpatient heart failure.
// The renderer owns session state and the existing HF dose/GDMT/discharge
// workspaces. This module turns only explicit categorical findings into
// reviewable actions; it never creates an order, calculates a dose, or marks
// a patient ready for discharge.

export const AHA_ACC_HFSA_2022_SOURCE = 'https://www.heart.org/-/media/832EA0F4E73948848612F228F7FA2D35.pdf';
export const ACC_HOSPITALIZED_HF_2024_SOURCE = 'https://www.jacc.org/doi/10.1016/j.jacc.2024.06.002';

const aha2022 = Object.freeze({
  label: '2022 AHA/ACC/HFSA Heart Failure guideline',
  url: AHA_ACC_HFSA_2022_SOURCE,
});
const acc2024 = Object.freeze({
  label: '2024 ACC pathway for hospitalized heart failure',
  url: ACC_HOSPITALIZED_HF_2024_SOURCE,
});

const STAGE_ORDER = Object.freeze(['assess', 'stabilize', 'decongest', 'optimize', 'transition']);

function option(value, label) {
  return Object.freeze([value, label]);
}

function field(key, label, options, extra = {}) {
  return Object.freeze({
    key,
    label,
    options: Object.freeze(options.map(([value, optionLabel]) => option(value, optionLabel))),
    ...extra,
  });
}

export const HEART_FAILURE_FIELDS = Object.freeze([
  field('phase', 'Review lane', [
    ['unknown', 'Not selected'],
    ['acute-initial', 'Initial decompensation / congestion review'],
    ['acute-reassessment', 'After decongestion intervention'],
    ['stable-optimization', 'Stable chronic optimization review'],
    ['discharge-review', 'Discharge / transition review'],
  ], {
    essential: 'Emergency findings override the lane.',
  }),
  field('emergencyFinding', 'Emergency finding now?', [
    ['unknown', 'Not fully assessed'],
    ['present', 'Present — shock, severe respiratory failure, ischemia, unstable rhythm, or mechanical concern'],
    ['not-present-after-assessment', 'No immediate emergency finding after assessment'],
  ], {
    threshold: 'Assess ABCs, perfusion, escalating support, ischemia, rhythm and mechanical concern.',
  }),
  field('hfWorkingDiagnosis', 'HF working route?', [
    ['unknown', 'Not established'],
    ['known-or-likely-hf', 'Known or likely HF / decompensation'],
    ['not-established-or-alternative-likely', 'Not established / alternative likely'],
  ], {
    threshold: 'This is a working route, not a diagnosis; reconcile current evidence and alternatives.',
  }),
  field('congestion', 'Congestion now?', [
    ['unknown', 'Not fully assessed'],
    ['present', 'Present after assessment'],
    ['not-present-after-assessment', 'Not present after assessment'],
  ], {
    threshold: 'Use symptoms, examination, weight/fluids and objective data in context.',
  }),
  field('perfusion', 'Perfusion now?', [
    ['unknown', 'Not fully assessed'],
    ['adequate', 'Adequate / warm after assessment'],
    ['hypoperfusion-concern', 'Cold / hypoperfusion concern'],
  ], {
    threshold: 'Use BP with mentation, extremities, urine output, lactate and organ trajectory.',
  }),
  field('precipitantReview', 'Trigger review?', [
    ['unknown', 'Not completed'],
    ['identified-being-managed', 'Identified and being managed in parallel'],
    ['not-identified-after-assessment', 'No trigger identified after assessment'],
  ], {
    threshold: 'Review ischemia, rhythm, BP, infection, medicines, renal change, PE and mechanical causes.',
  }),
  field('loopExposure', 'Loop exposure?', [
    ['unknown', 'Not reconciled'],
    ['none-confirmed', 'No prior/current loop exposure confirmed'],
    ['prior-home-loop-reconciled', 'Home drug, daily dose, route and last dose/time reconciled'],
    ['recent-iv-loop-reconciled', 'Recent IV total dose, time and response window reconciled'],
    ['uncertain-or-multiple-exposure', 'Recent/multiple exposure or timing uncertain'],
  ], {
    threshold: 'Never infer loop-naive status; reconcile agent, total dose, route, time, delivery and response.',
  }),
  field('loopSafety', 'Loop safety?', [
    ['unknown', 'Not fully reviewed'],
    ['reviewed-suitable', 'Suitable after review'],
    ['unsafe-or-specialist-route', 'Concern / incomplete / individualized route'],
  ], {
    threshold: 'Review perfusion/BP, renal/electrolytes, dialysis, allergy, exposure/delivery and local protocol.',
  }),
  field('diureticResponse', 'Response to recent IV loop?', [
    ['unknown', 'Not assessed / response window uncertain'],
    ['adequate', 'Adequate response documented'],
    ['inadequate', 'Inadequate response documented'],
    ['worsening-or-new-instability', 'Worsening or new instability concern'],
  ], {
    threshold: 'Before another action, record symptoms, support, output, balance, weight, perfusion and renal/electrolytes.',
  }),
  field('nitratePattern', 'Hypertensive pulmonary-edema pattern?', [
    ['unknown', 'Not assessed'],
    ['hypertensive-pulmonary-edema-pattern', 'Yes — reviewed hypertensive pulmonary-edema / afterload pattern'],
    ['no-hypertensive-vasodilator-pattern', 'No — this pattern is not established'],
  ], {
    threshold: 'Nitrates are not routine; review pattern, BP, perfusion and cause first.',
  }),
  field('nitrateSafety', 'Nitrate safety?', [
    ['unknown', 'Not fully reviewed'],
    ['reviewed-suitable', 'No systemic hypotension or other entered contraindication after review'],
    ['contraindication-or-incomplete', 'Hypotension / contraindication concern or review incomplete'],
  ], {
    threshold: 'Confirm pressure/perfusion, contraindications, interactions and monitored local setup.',
  }),
  field('phenotype', 'Phenotype for legacy GDMT?', [
    ['unknown', 'Not established'],
    ['hfrEF-confirmed', 'HFrEF explicitly confirmed by the treating team'],
    ['other-or-uncertain', 'Other phenotype or phenotype remains uncertain'],
  ], {
    threshold: 'Use the documented phenotype and LVEF source/date; no cut-off is computed here.',
  }),
  field('gdmtReadiness', 'Stable GDMT window?', [
    ['unknown', 'Not fully reviewed'],
    ['stable-window-confirmed', 'Compensated / stable window confirmed'],
    ['active-decompensation-or-not-ready', 'Active decompensation, hypotension/hypoperfusion, or other blocker remains'],
  ], {
    threshold: 'The legacy workspace checks four pillars, exact drug/formulation, safety, tolerance and ownership.',
  }),
  field('dischargeReview', 'Transition plan?', [
    ['unknown', 'Not completed'],
    ['reconciled-with-open-items-owned', 'Plan reconciled; remaining items have a named owner and review date'],
    ['residual-congestion-or-unresolved-gap', 'Residual congestion or unresolved transition gap'],
  ], {
    threshold: 'Review congestion, oral plan, medicines, labs, education/access and named early follow-up.',
  }),
]);

const VALID_VALUES = Object.freeze(Object.fromEntries(
  HEART_FAILURE_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));

const CORE_FIELD_KEYS = Object.freeze(['phase', 'emergencyFinding']);
const ACUTE_PHASES = new Set(['acute-initial', 'acute-reassessment']);
const CHRONIC_PHASES = new Set(['stable-optimization', 'discharge-review']);

export function normalizeHeartFailure(input = {}) {
  return Object.freeze(Object.fromEntries(HEART_FAILURE_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ])));
}

function hasEmergency(values) {
  return values.emergencyFinding === 'present';
}

function knownHf(values) {
  return values.hfWorkingDiagnosis === 'known-or-likely-hf';
}

function stableCongested(values) {
  return knownHf(values)
    && values.congestion === 'present'
    && values.perfusion === 'adequate'
    && values.emergencyFinding === 'not-present-after-assessment';
}

function stableForOptimization(values) {
  return knownHf(values)
    && values.congestion === 'not-present-after-assessment'
    && values.perfusion === 'adequate'
    && values.emergencyFinding === 'not-present-after-assessment';
}

/**
 * Emergency findings are intentionally visible before a phase is chosen.
 * Acute loop details only follow confirmed congestion plus adequate perfusion;
 * chronic medication work follows a separate stable window.
 */
export function visibleFieldKeys(input = {}) {
  const values = normalizeHeartFailure(input);
  if (values.emergencyFinding !== 'not-present-after-assessment' || values.phase === 'unknown') return CORE_FIELD_KEYS;

  const fields = [...CORE_FIELD_KEYS, 'hfWorkingDiagnosis', 'congestion', 'perfusion'];
  if (!knownHf(values)) return Object.freeze(fields);

  if (ACUTE_PHASES.has(values.phase)) {
    fields.push('precipitantReview');
    if (!stableCongested(values)) return Object.freeze(fields);

    fields.push('loopExposure');
    if (values.loopExposure !== 'unknown') {
      fields.push('loopSafety');
      if (values.phase === 'acute-reassessment' && values.loopExposure === 'recent-iv-loop-reconciled') {
        fields.push('diureticResponse');
      }
    }
    fields.push('nitratePattern');
    if (values.nitratePattern === 'hypertensive-pulmonary-edema-pattern') fields.push('nitrateSafety');
    return Object.freeze(fields);
  }

  if (CHRONIC_PHASES.has(values.phase) && stableForOptimization(values)) {
    fields.push('phenotype', 'gdmtReadiness');
    if (values.phase === 'discharge-review'
      && values.phenotype !== 'unknown'
      && values.gdmtReadiness === 'stable-window-confirmed') fields.push('dischargeReview');
  }
  return Object.freeze(fields);
}

function action(id, stage, title, summary, detail, source, extra = {}) {
  return Object.freeze({
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...extra,
  });
}

function sortActions(actions) {
  return actions.sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage));
}

function gapsFor(values) {
  const visible = visibleFieldKeys(values);
  return Object.freeze(visible
    .filter(key => values[key] === 'unknown')
    .map(key => HEART_FAILURE_FIELDS.find(item => item.key === key).label));
}

function entryFor(values) {
  if (hasEmergency(values)) {
    return Object.freeze({
      title: 'Emergency HF finding',
      summary: 'Emergency physiology takes priority over routine decongestion, nitrate, GDMT or discharge review.',
      status: 'urgent',
      source: aha2022,
    });
  }
  if (values.phase === 'unknown') {
    return Object.freeze({
      title: 'Heart-failure review lane not selected',
      summary: 'First assess emergency physiology, then choose acute assessment, acute reassessment, stable optimization, or transition review.',
      status: 'unknown',
      source: acc2024,
    });
  }
  if (!knownHf(values)) {
    return Object.freeze({
      title: 'HF route not established',
      summary: 'Do not infer congestion treatment or chronic-HF medication eligibility while the syndrome or alternative cause remains uncertain.',
      status: 'unknown',
      source: acc2024,
    });
  }
  if (ACUTE_PHASES.has(values.phase)) {
    return Object.freeze({
      title: values.phase === 'acute-reassessment' ? 'Acute decongestion reassessment' : 'Acute HF / congestion review',
      summary: 'Current congestion, perfusion, actual loop exposure and observed response determine whether a local strategy can be reviewed.',
      status: stableCongested(values) ? 'met' : 'unknown',
      source: aha2022,
    });
  }
  return Object.freeze({
    title: values.phase === 'discharge-review' ? 'HF transition review' : 'Stable HF optimization review',
    summary: 'Chronic optimization remains separate from active decompensation and does not establish discharge readiness.',
    status: stableForOptimization(values) ? 'met' : 'unknown',
    source: acc2024,
  });
}

function addEmergencyActions(values, actions) {
  if (values.emergencyFinding === 'unknown') {
    actions.push(action(
      'hf-emergency-screen',
      'assess',
      'Check for emergency physiology now',
      'Do not wait for the selected review lane before assessing shock, respiratory failure, ischemia, unstable rhythm, altered mentation or acute mechanical concern.',
      'This is an assessment prompt. Unknown does not mean the absence of an emergency finding.',
      aha2022,
      {tone: 'attention', resourceGroup: 'hf-evaluation'},
    ));
  }
  if (!hasEmergency(values)) return false;
  actions.push(action(
    'hf-emergency-escalation',
    'stabilize',
    'Emergency HF finding: escalate and support now',
    'Activate urgent senior/cardiology/critical-care assessment and treat the time-critical syndrome in parallel.',
    'Reassess airway, breathing, circulation, perfusion, rhythm and ischemia immediately. This guide does not select ventilation, inotropes, vasopressors, mechanical support, or their doses.',
    aha2022,
    {tone: 'urgent', resourceGroup: 'hf-evaluation'},
  ));
  actions.push(action(
    'hf-emergency-withhold-routine-branches',
    'stabilize',
    'Routine loop, nitrate, GDMT and discharge branches are withheld',
    'A stale chronic or decongestion plan cannot override current emergency physiology.',
    'Once the emergency is stabilized, enter a new current assessment. Do not infer that a previous response, medication list, or selected phase remains appropriate.',
    acc2024,
    {tone: 'urgent', resourceGroup: 'hf-evaluation'},
  ));
  return true;
}

function addHfEntryActions(values, actions) {
  if (!knownHf(values)) {
    actions.push(action(
      'hf-establish-working-route',
      'assess',
      'Establish the HF working route and competing causes',
      'Do not derive a loop, nitrate or GDMT action from a prior label alone.',
      'Reconcile the current presentation with examination, ECG/rhythm, imaging, biomarkers and the clinical trajectory as appropriate. Alternative causes still need their own urgent pathways when indicated.',
      acc2024,
      {tone: 'attention', resourceGroup: 'hf-evaluation'},
    ));
    return false;
  }
  if (values.congestion === 'unknown' || values.perfusion === 'unknown') {
    actions.push(action(
      'hf-assess-congestion-and-perfusion',
      'assess',
      'Assess congestion and perfusion together',
      'Unknown congestion or perfusion does not support a routine loop, nitrate or stable-GDMT action.',
      'Review symptoms, examination, weight/fluid history, oxygen/support, blood pressure, mentation, extremity findings, urine output and organ trajectory in context.',
      acc2024,
      {tone: 'attention', resourceGroup: 'hf-evaluation'},
    ));
  }
  if (values.perfusion === 'hypoperfusion-concern') {
    actions.push(action(
      'hf-hypoperfusion-escalation',
      'stabilize',
      'Hypoperfusion concern: urgent haemodynamic review',
      'Do not use a routine loop, nitrate or chronic-titration branch as a substitute for escalation.',
      'Reassess the cause of low output, congestion, blood pressure, ischemia, rhythm and end-organ trajectory with the treating team. The shock route requires individualized monitored management.',
      aha2022,
      {tone: 'urgent', resourceGroup: 'hf-evaluation'},
    ));
  }
  return true;
}

function addPrecipitantAction(values, actions) {
  if (values.precipitantReview === 'unknown') {
    actions.push(action(
      'hf-precipitant-review',
      'assess',
      'Review precipitant and alternative causes in parallel',
      'Decongestion does not replace ischemia, rhythm, infection, blood-pressure, renal, pulmonary-embolism or mechanical-cause review.',
      'A trigger can coexist with congestion. Record whether it has been identified and is being managed rather than treating a missing entry as a negative finding.',
      acc2024,
      {tone: 'attention', resourceGroup: 'hf-evaluation'},
    ));
  } else {
    actions.push(action(
      'hf-precipitant-status',
      'assess',
      values.precipitantReview === 'identified-being-managed' ? 'Continue the identified precipitant plan in parallel' : 'No precipitant identified: keep the differential open',
      values.precipitantReview === 'identified-being-managed'
        ? 'Treat the documented trigger while reassessing congestion and perfusion.'
        : 'A completed first review does not rule out an evolving ischemic, rhythm, infectious, renal, pulmonary or mechanical driver.',
      'The engine does not diagnose or close a trigger investigation. Reopen the cause review for a changing trajectory or inconsistent findings.',
      acc2024,
      {resourceGroup: 'hf-evaluation'},
    ));
  }
}

function addLoopActions(values, actions) {
  if (!stableCongested(values)) {
    if (values.congestion === 'not-present-after-assessment') {
      actions.push(action(
        'hf-no-congestion-no-loop',
        'decongest',
        'No current congestion: do not select a routine loop strategy',
        'A historical HF diagnosis, edema history or stale dose plan does not establish today’s decongestion indication.',
        'Continue cause and trajectory review; reassess if signs or symptoms evolve. This is not a discharge or medication-continuation decision.',
        aha2022,
        {resourceGroup: 'loop-diuretic'},
      ));
    }
    return;
  }

  if (values.loopExposure === 'unknown') {
    actions.push(action(
      'hf-reconcile-loop-exposure',
      'decongest',
      'Reconcile loop agent, total exposure, route and timing',
      'Do not infer loop-naive status or repeat a dose from an incomplete medication history.',
      'Record the exact loop drug, home/current total dose, route, last dose/time, delivery and response window before using the existing local dose workspace.',
      aha2022,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.phase === 'acute-reassessment'
    && (values.loopExposure === 'none-confirmed' || values.loopExposure === 'prior-home-loop-reconciled')) {
    actions.push(action(
      'hf-reassessment-reconcile-intervention',
      'decongest',
      'Reassessment: reconcile whether an IV loop was actually given',
      'Do not surface an initial loop reference during reassessment without a reconciled current intervention and response window.',
      'Confirm actual administration, route, total dose, time, delivery and response. If no intervention was given, reopen the initial decompensation review rather than treating a stale home regimen as a new IV action.',
      acc2024,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.loopSafety !== 'reviewed-suitable') {
    actions.push(action(
      'hf-loop-safety-review',
      'decongest',
      'Complete the loop safety and local-protocol review',
      'No dose or repeat action is selected while the safety review is incomplete or concerning.',
      'Review current perfusion/BP, kidney and electrolyte trajectory, dialysis, allergy, actual exposure/delivery and local protocol. A single creatinine or eGFR value does not determine this route.',
      aha2022,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }

  if (values.phase === 'acute-initial' && values.loopExposure === 'none-confirmed') {
    actions.push(action(
      'hf-loop-naive-local-dose-review',
      'decongest',
      'Loop-naive: furosemide 40–80 mg IV total initial daily dose',
      '2024 ACC workflow reference only after confirmed congestion, adequate perfusion and safety review; not a bolus schedule or order.',
      'Use the existing local dose workspace for the monitored plan and local protocol. Recheck symptoms, urine output, balance, weight, BP/perfusion and kidney/electrolyte trajectory before any further dose.',
      acc2024,
      {resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.phase === 'acute-initial' && values.loopExposure === 'prior-home-loop-reconciled') {
    actions.push(action(
      'hf-prior-loop-local-dose-review',
      'decongest',
      'Prior loop: 1–2.5× home total daily furosemide-equivalent IV',
      '2024 ACC workflow reference only after actual home agent, total daily dose, route and last-dose timing are reconciled; not a bolus or automatic repeat.',
      'Use the existing local dose workspace for the equivalence method and local protocol. The next strategy must follow current congestion, perfusion and observed response, not a copied home regimen.',
      acc2024,
      {resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.loopExposure === 'uncertain-or-multiple-exposure') {
    actions.push(action(
      'hf-loop-exposure-uncertain',
      'decongest',
      'Recent or multiple loop exposure is uncertain: withhold a repeat',
      'Reconcile actual administration, delivery, cumulative dose, time and response before another loop or adjunctive strategy.',
      'A missing timestamp or incomplete medication record cannot safely be treated as no prior exposure. Continue monitored congestion/perfusion assessment while reconciling the record.',
      acc2024,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }

  if (values.phase !== 'acute-reassessment' || values.diureticResponse === 'unknown') {
    actions.push(action(
      'hf-record-loop-response-before-repeat',
      'decongest',
      'Recent IV loop is reconciled: record response before another dose',
      'Do not automatically re-load or escalate while the response window is absent or uncertain.',
      'Record symptoms, oxygen/support, urine output, balance, weight, BP/perfusion and kidney/electrolyte trajectory. Reassess delivery and the likely cause of a poor response before changing strategy.',
      acc2024,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.diureticResponse === 'adequate') {
    actions.push(action(
      'hf-adequate-diuresis-reassess',
      'decongest',
      'Adequate response: continue monitored decongestion reassessment',
      'Adequate response does not authorize an automatic repeat, adjunct, chronic titration or discharge decision.',
      'Continue to assess congestion, intravascular tolerance, BP/perfusion, kidney/electrolytes and the trigger. Document the next response review before altering the plan.',
      acc2024,
      {resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  if (values.diureticResponse === 'inadequate') {
    actions.push(action(
      'hf-inadequate-diuresis-local-intensification-review',
      'decongest',
      'Inadequate response: reconcile delivery, then review a local intensification route',
      'AHA/ACC supports a reviewed higher-IV-loop or second-diuretic strategy when congestion persists; this engine does not choose either one or a dose.',
      'Before changing strategy, recheck congestion/perfusion, actual administration, output, balance, weight, renal/electrolytes and the local protocol. The 2024 operational escalation range is not a patient-independent ceiling, especially with renal impairment.',
      aha2022,
      {tone: 'attention', resourceGroup: 'loop-diuretic'},
    ));
    return;
  }
  actions.push(action(
    'hf-worsening-after-diuresis',
    'stabilize',
    'Worsening after the recent loop: reassess emergency physiology now',
    'Do not repeat the prior loop plan until current perfusion, respiratory status and the treatment record have been reviewed.',
    'Reassess shock, respiratory deterioration, ischemia, arrhythmia, alternative causes, exposure/delivery and kidney/electrolyte trajectory. Current worsening overrides a previous planned strategy.',
    acc2024,
    {tone: 'urgent', resourceGroup: 'hf-evaluation'},
  ));
}

function addNitrateActions(values, actions) {
  if (values.phase === 'acute-reassessment'
    && values.loopExposure === 'recent-iv-loop-reconciled'
    && values.diureticResponse === 'worsening-or-new-instability') return;
  if (!stableCongested(values)) return;
  if (values.nitratePattern === 'unknown') {
    actions.push(action(
      'hf-nitrate-pattern-review',
      'decongest',
      'Do not infer a nitrate route: review the acute pattern first',
      'Nitrates are not a default treatment for every congested patient.',
      'A reviewed hypertensive pulmonary-edema/afterload pattern and a separate contraindication/perfusion review are required before a nitrate can be considered as an adjunct.',
      aha2022,
      {resourceGroup: 'nitrate'},
    ));
    return;
  }
  if (values.nitratePattern !== 'hypertensive-pulmonary-edema-pattern') return;
  if (values.nitrateSafety === 'reviewed-suitable') {
    actions.push(action(
      'hf-nitrate-adjunct-consideration',
      'decongest',
      'Consider IV nitrate only as a reviewed adjunct to diuresis',
      'For decompensated HF without systemic hypotension, nitroglycerin or nitroprusside may be considered for dyspnea; use the monitored local protocol.',
      'This is not a nitrate order or dose. Reconfirm pressure/perfusion, contraindications, interactions, local preparation and monitoring. The acute loop/response review remains separate.',
      aha2022,
      {resourceGroup: 'nitrate'},
    ));
    return;
  }
  actions.push(action(
    'hf-nitrate-withheld-pending-safeguard',
    'decongest',
    'Nitrate route withheld pending the safety review',
    'Hypotension, a contraindication concern or incomplete review does not support a generic nitrate action.',
    'Reconcile current perfusion and the local contraindication/interaction/administration review. Treat emergency physiology on its own route when present.',
    aha2022,
    {tone: 'attention', resourceGroup: 'nitrate'},
  ));
}

function addChronicActions(values, actions) {
  if (!stableForOptimization(values)) {
    actions.push(action(
      'hf-active-state-blocks-routine-gdmt',
      'optimize',
      'Active congestion or non-adequate perfusion blocks routine chronic optimization',
      'Do not use the four-pillar or discharge checklist to bypass unresolved decompensation.',
      'Return to acute congestion/perfusion assessment and a current response review. Existing chronic therapy still needs patient-specific reconciliation; this engine does not advise automatic discontinuation.',
      acc2024,
      {tone: 'attention', resourceGroup: 'gdmt-reference'},
    ));
    return;
  }
  if (values.phenotype === 'unknown') {
    actions.push(action(
      'hf-phenotype-before-gdmt',
      'optimize',
      'Confirm phenotype before applying the legacy HFrEF matrix',
      'Do not infer the four-pillar route from a missing or old LVEF value.',
      'Use the documented phenotype, LVEF source/date, clinical context and prior trajectory. This compact guide does not calculate an EF phenotype or choose phenotype-specific therapy.',
      acc2024,
      {tone: 'attention', resourceGroup: 'gdmt-reference'},
    ));
    return;
  }
  if (values.gdmtReadiness !== 'stable-window-confirmed') {
    actions.push(action(
      'hf-gdmt-readiness-incomplete',
      'optimize',
      'Stable optimization window is not confirmed',
      'Complete the hemodynamic, congestion/perfusion, kidney/electrolyte, tolerance and ownership review before a chronic medication change.',
      'The existing readiness workspace preserves the detailed four-pillar check. This engine does not select, start, stop or titrate a medicine.',
      acc2024,
      {tone: 'attention', resourceGroup: 'gdmt-reference'},
    ));
    return;
  }
  if (values.phenotype === 'hfrEF-confirmed') {
    actions.push(action(
      'hf-open-legacy-hfref-readiness',
      'optimize',
      'Stable HFrEF: four-pillar source-linked dose review',
      'Review ARNI/ACEi/ARB, bisoprolol/carvedilol/metoprolol succinate, MRA and dapagliflozin/empagliflozin in the existing readiness workspace.',
      'That workspace retains 2022 AHA/ACC/HFSA Table 14 doses and eligibility: never co-administer ACEi with ARNI; MRA initiation needs eGFR >30 and K <5.0; review BP, heart rate, renal/electrolytes, tolerance, local product and follow-up. No prescription is generated here.',
      acc2024,
      {resourceGroup: 'gdmt-reference'},
    ));
  } else {
    actions.push(action(
      'hf-non-hfref-phenotype-reference',
      'optimize',
      'Other or uncertain phenotype: use phenotype-specific reference review',
      'Do not copy the HFrEF four-pillar matrix into another phenotype without an explicit clinical rationale.',
      'Continue congestion, comorbidity and cause management with the treating team. The existing reference remains available, but no generic chronic medication choice is made here.',
      acc2024,
      {resourceGroup: 'gdmt-reference'},
    ));
  }
}

function addTransitionActions(values, actions) {
  if (values.phase !== 'discharge-review' || !stableForOptimization(values)) return;
  if (values.phenotype === 'unknown' || values.gdmtReadiness !== 'stable-window-confirmed') return;
  if (values.dischargeReview === 'reconciled-with-open-items-owned') {
    actions.push(action(
      'hf-transition-plan-owned',
      'transition',
      'Transition plan reviewed: keep each remaining item owned',
      'A documented plan still does not establish discharge authorization or replace a current bedside assessment.',
      'Keep the achieved congestion state, oral loop plan, medication reconciliation, laboratory plan, education/access barriers and named early follow-up visible to the receiving team.',
      acc2024,
      {resourceGroup: 'gdmt-reference'},
    ));
    return;
  }
  actions.push(action(
    values.dischargeReview === 'residual-congestion-or-unresolved-gap'
      ? 'hf-transition-gap-remains'
      : 'hf-transition-review-incomplete',
    'transition',
    values.dischargeReview === 'residual-congestion-or-unresolved-gap'
      ? 'Residual congestion or transition gap remains'
      : 'Complete the transition and discharge-gap review',
    values.dischargeReview === 'residual-congestion-or-unresolved-gap'
      ? 'Do not treat a discharge checkbox as evidence that congestion, medication, laboratory or follow-up gaps are resolved.'
      : 'Confirm current congestion state, oral plan, medication reconciliation, laboratory follow-up, education/access and named early review.',
    'The existing HF GDMT and cardiovascular discharge workspaces remain the detailed local references. This guide does not create an order, close a task or authorize discharge.',
    acc2024,
    {tone: 'attention', resourceGroup: 'gdmt-reference'},
  ));
}

function result(values, actions, extra = {}) {
  return Object.freeze({
    values,
    entry: entryFor(values),
    actions: Object.freeze(sortActions(actions)),
    visibleStageIds: Object.freeze(STAGE_ORDER.filter(stage => actions.some(item => item.stage === stage))),
    stageNotes: Object.freeze({
      assess: 'Confirm emergency physiology, the HF working route, congestion, perfusion and competing causes.',
      stabilize: 'Escalate emergency or low-perfusion states; routine branches do not replace monitored haemodynamic care.',
      decongest: 'Use actual loop exposure, safety and observed response; never infer a repeat dose.',
      optimize: 'Use the existing source-linked readiness workspace only after a stable window is explicit.',
      transition: 'Make residual congestion, medication and follow-up gaps visible; this is not discharge authorization.',
    }),
    gaps: gapsFor(values),
    withheld: Object.freeze([
      'Diagnosis, bedside dose calculation, repeat-loop selection, adjunctive-diuretic selection, nitrate preparation, inotrope/vasopressor/ventilation/MCS selection, medication prescription, order, chart change and discharge authorization remain outside this guide.',
    ]),
    derived: Object.freeze({
      emergencyRoute: hasEmergency(values),
      stableCongestedRoute: stableCongested(values),
      stableOptimizationRoute: stableForOptimization(values),
      activeAcuteRoute: ACUTE_PHASES.has(values.phase),
      activeChronicRoute: CHRONIC_PHASES.has(values.phase),
      ...extra,
    }),
  });
}

export function evaluate(input = {}) {
  const values = normalizeHeartFailure(input);
  const actions = [];
  if (addEmergencyActions(values, actions)) return result(values, actions);
  if (values.emergencyFinding !== 'not-present-after-assessment') return result(values, actions);

  if (values.phase === 'unknown') {
    actions.push(action(
      'hf-select-review-lane',
      'assess',
      'Select the current review lane',
      'Acute assessment, acute reassessment, stable optimization and transition review answer different safety questions.',
      'Emergency findings remain active without this selection. Do not expose a routine treatment or discharge branch until the current lane is explicit.',
      acc2024,
      {tone: 'attention'},
    ));
    return result(values, actions);
  }
  if (!addHfEntryActions(values, actions)) return result(values, actions);

  if (ACUTE_PHASES.has(values.phase)) {
    addPrecipitantAction(values, actions);
    addLoopActions(values, actions);
    addNitrateActions(values, actions);
    return result(values, actions);
  }

  addChronicActions(values, actions);
  addTransitionActions(values, actions);
  return result(values, actions);
}

export const config = Object.freeze({
  id: 'heart-failure',
  title: 'Heart Failure',
  reviewedAt: '2026-09-19',
  scope: 'Adult inpatient HF review: emergency routing, congestion/perfusion, source-labelled loop references, cautious nitrate consideration, and a handoff to existing GDMT/discharge workspaces. It uses AHA/ACC 2022 and ACC 2024 sources; ESC 2026 review is pending. It is not a diagnosis engine, medication order interface, dose calculator, or discharge authority.',
  reviewLabel: 'Upgraded · ACC 2024 scope / ESC 2026 review pending',
  reviewLimitations: Object.freeze([
    'The current 2026 ESC material defines HFrEF as LVEF <50%, while the legacy 2022 US workspace uses ≤40%. A dedicated ESC 2026 source mode remains review pending; this engine does not claim ESC 2026 implementation.',
    'The engine intentionally retains the existing local HF dose, four-pillar readiness and cardiovascular discharge workspaces rather than duplicating their numeric catalogues or changing their behavior.',
    'No dedicated captured HF bundle was established in this batch. Resource groups expose exact catalog identities and related source rows for inspection; orderability, formulation and local protocol remain separate reviews.',
  ]),
  sources: Object.freeze([aha2022, acc2024]),
  entry: Object.freeze({
    title: 'Is there an emergency HF finding, current congestion, or a stable chronic-HF task?',
    guidance: 'Emergency physiology overrides phase. Acute decongestion and chronic optimization use separate current findings; unknown never means safe or absent.',
    source: aha2022,
  }),
  fields: HEART_FAILURE_FIELDS,
  visibleFieldKeys,
  evaluate,
  conflictActionIds: Object.freeze([
    'hf-emergency-withhold-routine-branches',
    'hf-active-state-blocks-routine-gdmt',
    'hf-worsening-after-diuresis',
  ]),
  stages: Object.freeze([
    Object.freeze({id: 'assess', title: 'Emergency, syndrome & profile', empty: 'Complete the current assessment.'}),
    Object.freeze({id: 'stabilize', title: 'Emergency / low-perfusion escalation', empty: 'Escalate urgent physiology before routine therapy.'}),
    Object.freeze({id: 'decongest', title: 'Congestion, exposure & response', empty: 'Reconcile actual loop exposure and response.'}),
    Object.freeze({id: 'optimize', title: 'Stable HFrEF readiness', empty: 'Complete the stable-window and phenotype review.'}),
    Object.freeze({id: 'transition', title: 'Transition gaps & ownership', empty: 'Complete the transition review.'}),
  ]),
  quickReference: Object.freeze({
    summary: 'Treat emergency physiology first. Review congestion and perfusion together, then reconcile actual loop exposure and response before a repeat or chronic-GDMT decision.',
    recognition: Object.freeze([
      'State the current review lane; acute treatment response and chronic optimization are separate states.',
      'Confirm current congestion and perfusion; a prior HF label or stale medication list is not enough.',
    ]),
    redFlags: Object.freeze([
      'Shock/hypoperfusion, altered mentation, severe respiratory failure or escalating support.',
      'Ongoing ischemia, unstable arrhythmia, syncope, or acute valvular/mechanical concern.',
      'Worsening after a recent loop, resistant congestion, or new renal/electrolyte concern.',
    ]),
    steps: Object.freeze([
      Object.freeze({role: 'Emergency', text: 'Escalate immediately; routine loop, nitrate, GDMT and discharge branches are withheld.'}),
      Object.freeze({role: 'Congestion', text: 'Require confirmed congestion, adequate perfusion, reconciled exposure and a safety review before a local loop plan.'}),
      Object.freeze({role: 'Response', text: 'Record symptoms, oxygen/support, urine output, balance, weight, BP/perfusion and renal/electrolytes before any repeat or intensification.'}),
      Object.freeze({role: 'Stable HFrEF', text: 'Use the existing four-pillar readiness workspace only after a compensated window is explicit.'}),
    ]),
    monitoring: Object.freeze([
      'Trend current congestion, oxygen/support, BP/perfusion, urine output, balance, weight and kidney/electrolyte trajectory at a frequency matched to severity.',
      'At transition, keep the oral plan, medication reconciliation, laboratory plan, education/access barriers and named early follow-up visible.',
    ]),
    sources: Object.freeze([aha2022, acc2024]),
  }),
});

export default config;
