// Compact, source-reviewed decision support for adult DKA, HHS and mixed crisis.
// It presents reviewed decision branches and links to local resource identities.
// It does not create orders, calculate an individual dose, or configure a pump.

export const HYPERGLYCEMIC_CRISES_SOURCE = 'https://diabetesjournals.org/care/article/47/8/1257/156808/Hyperglycemic-Crises-in-Adults-With-Diabetes-A';
export const ADA_HOSPITAL_2026_SOURCE = 'https://diabetesjournals.org/care/article/49/Supplement_1/S339/163925/16-Diabetes-Care-in-the-Hospital-Standards-of-Care';

const consensus = {
  label: 'ADA/EASD/JBDS/AACE/DTS adult hyperglycaemic-crises consensus (2024)',
  url: HYPERGLYCEMIC_CRISES_SOURCE,
};
const currentAdaHospital = {
  label: 'ADA Standards of Care in Diabetes — hospital care (2026)',
  url: ADA_HOSPITAL_2026_SOURCE,
};

const fields = [
  {
    key: 'pattern',
    label: 'Reviewed treatment pattern?',
    options: [
      ['unknown', 'Criteria not yet verified'],
      ['dka', 'DKA treatment criteria met'],
      ['hhs', 'Isolated-HHS treatment criteria met'],
      ['mixed', 'Mixed DKA/HHS treatment criteria met'],
    ],
    help: 'DKA recognition needs diabetes or glucose at least 200 mg/dL, ketonaemia (beta-hydroxybutyrate at least 3.0 mmol/L or urine ketones at least 2+) and metabolic acidosis (pH below 7.3 and/or bicarbonate below 18 mmol/L). HHS recognition needs all four: glucose at least 600 mg/dL, hyperosmolality, no significant ketonaemia and pH at least 7.3 with bicarbonate at least 15 mmol/L. For the 0.05 isolated-HHS insulin branch, confirm beta-hydroxybutyrate below 3.0 mmol/L (or urine ketones below 2+), pH at least 7.3 and bicarbonate at least 18 mmol/L. If ketones/acidosis meet the mixed rule, select mixed; it receives the 0.1 DKA-rate branch. Unknown does not establish a non-crisis state.',
  },
  {
    key: 'criticalFeature',
    label: 'Critical feature present?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Yes'],
      ['no', 'No — assessed'],
    ],
    help: 'Select yes for shock, major haemodynamic compromise, altered consciousness, severe DKA, or a critical precipitating illness. Confirmed HHS has its own ICU-level destination action even when no additional critical feature is recorded.',
  },
  {
    key: 'volumeState',
    label: 'Perfusion / volume state?',
    options: [
      ['unknown', 'Not assessed'],
      ['depleted', 'Depleted; no cardiac concern'],
      ['highRisk', 'Overload / cardiac-risk context'],
      ['repleted', 'Initial volume restored'],
    ],
    help: 'A depletion choice records bedside assessment, not a generic fluid indication. Renal/urine context is entered separately. High risk includes fluid overload, heart failure or a setting where a standard initial rate is unsafe. After intravascular restoration, choose subsequent fluid from blood pressure, heart rate, input/output and sodium rather than carrying forward an initial rate.',
  },
  {
    key: 'renalUrine',
    label: 'Kidney function / urine output?',
    options: [
      ['unknown', 'Not established'],
      ['adequate', '>0.5 mL/kg/h; no major renal risk'],
      ['impaired', 'Oliguria, dialysis or major renal risk'],
    ],
    help: 'Adequate means observed urine output above 0.5 mL/kg/hour over a reviewed interval, with no major renal-risk context. Exactly 0.5 does not meet the HHS resolution endpoint; keep the endpoint unresolved for review. Oliguria, dialysis or advanced kidney disease needs a cautious fluid and potassium plan. This field does not estimate drug clearance.',
  },
  {
    key: 'potassium',
    label: 'Potassium (mmol/L)?',
    options: [
      ['unknown', 'Not verified'],
      ['below3_5', 'Below 3.5'],
      ['at3_5', 'Exactly 3.5 / boundary'],
      ['above3_5toBelow5', 'Above 3.5 to below 5.0'],
      ['at5', 'Exactly 5.0 / boundary'],
      ['above5', 'Above 5.0'],
    ],
    help: 'For potassium below 3.5 mmol/L, the consensus says start replacement at 10 mmol/hour and delay insulin until potassium is above 3.5. Exactly 3.5 does not prove a previously low result has risen above 3.5; confirm the trend before restarting insulin. Routine replacement starts only after potassium falls below 5.0, with a usual target of 4–5 mmol/L.',
  },
  {
    key: 'glucosePhase',
    label: 'Glucose / dextrose phase?',
    options: [
      ['unknown', 'Not confirmed'],
      ['hypoglycemia', 'Below 70 mg/dL / 3.9 mmol/L'],
      ['below200', '70 to below 200 mg/dL'],
      ['from200to250', '200 to below 250 mg/dL'],
      ['atOrAbove250', 'At least 250 mg/dL'],
    ],
    help: 'These are glucose bands, not diagnostic labels. Euglycaemic DKA is derived only when verified DKA presents initially below 200 mg/dL with ketosis and acidosis. During active DKA or mixed crisis, glucose below 250 mg/dL triggers dextrose support so insulin can continue for ketosis. HHS may pass through the lower bands during active treatment; this guide exposes its dextrose review only with an in-limit trajectory, safe potassium, adequate renal/urine context and ongoing insulin need. Glucose alone never establishes resolution. A true hypoglycaemic value needs its own immediate rescue assessment.',
  },
  {
    key: 'hhsTrajectory',
    label: 'HHS correction trajectory?',
    options: [
      ['unknown', 'Not yet checked'],
      ['withinLimits', 'Within source limits'],
      ['tooFast', 'Above correction limits'],
      ['notFalling', 'Osmolality not falling'],
    ],
    help: 'For HHS, keep glucose decline no faster than 90–120 mg/dL/hour, sodium decline no faster than 10 mmol/L in 24 hours, and osmolality fall within 3–8 mOsm/kg/hour. A sodium rise during early glucose correction alone is not an indication for hypotonic fluid. Enter a neurologic change under critical features; it does not itself prove a measured correction limit was exceeded. This finding applies to HHS or mixed presentations only.',
  },
  {
    key: 'carePhase',
    label: 'Care phase?',
    options: [
      ['unknown', 'Not established'],
      ['initial', 'Initial treatment / not started'],
      ['active', 'IV treatment active; not resolved'],
      ['dkaResolved', 'DKA criteria resolved'],
      ['hhsResolved', 'HHS criteria resolved'],
      ['transition', 'Transition planned; criteria met'],
    ],
    help: 'DKA resolution requires beta-hydroxybutyrate below 0.6 mmol/L and venous pH at least 7.3 or bicarbonate at least 18 mmol/L; glucose below 200 mg/dL is ideal. HHS resolution requires osmolality below 300 mOsm/kg, glucose below 250 mg/dL, urine output above 0.5 mL/kg/hour and improved cognition. For mixed crisis, document both relevant endpoints before transition.',
  },
];

const stages = [
  {id: 'confirm', title: 'Confirm pattern', empty: 'Verify the crisis pattern and treatment phase.'},
  {id: 'stabilize', title: 'Stabilize volume & urgency', empty: 'Assess critical features, perfusion and fluid tolerance.'},
  {id: 'treat', title: 'Protect potassium & treat', empty: 'Use verified potassium and glucose findings before a regimen branch.'},
  {id: 'reassess', title: 'Reassess trajectory', empty: 'Set serial monitoring and HHS rate guards.'},
  {id: 'transition', title: 'Resolve & transition', empty: 'Use the endpoint that matches the documented crisis pattern.'},
];

const stageOrder = new Map(stages.map(({id}, index) => [id, index]));
const validValues = Object.fromEntries(fields.map(field => [field.key, new Set(field.options.map(([value]) => value))]));

function normalized(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, {
  tone,
  resourceGroup,
  related,
  source = consensus,
} = {}) {
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...(tone ? {tone} : {}),
    ...(resourceGroup ? {resourceGroup} : {}),
    ...(related ? {related} : {}),
  };
}

function hasCrisis(values) {
  return ['dka', 'hhs', 'mixed'].includes(values.pattern);
}

function isDkaPattern(values) {
  return values.pattern === 'dka';
}

function isHhsPattern(values) {
  return ['hhs', 'mixed'].includes(values.pattern);
}

function hasRoutinePhase(values) {
  return ['initial', 'active'].includes(values.carePhase);
}

function isHhsRateGuardBlockingRoutineActions(values) {
  if (!isHhsPattern(values)) return false;
  if (values.hhsTrajectory === 'tooFast' || values.hhsTrajectory === 'notFalling') return true;
  return values.carePhase === 'active' && values.hhsTrajectory === 'unknown';
}

function isPotassiumBlocked(values) {
  return ['unknown', 'below3_5', 'at3_5'].includes(values.potassium);
}

function needsRenalInsulinReview(values) {
  return ['unknown', 'impaired'].includes(values.renalUrine);
}

function addRenalInsulinReview(actions, values) {
  const impaired = values.renalUrine === 'impaired';
  actions.push(action(
    'review-insulin-with-renal-context',
    'treat',
    impaired ? 'Use a renal-aware insulin plan' : 'Review renal/urine context for insulin',
    impaired
      ? 'Oliguria/dialysis: do not auto-apply a generic IV insulin rate.'
      : 'Renal/urine context unknown: do not auto-apply a generic IV insulin rate.',
    impaired
      ? 'This compact guide does not encode a dialysis, oliguria or major-renal-risk insulin-infusion protocol. Use monitored specialist/local review of insulin, potassium, glucose and fluid exposure rather than treating the general 0.1 or 0.05 units/kg/hour source branches as an executable renal regimen.'
      : 'Do not wait for a prolonged urine-output collection before urgent clinician-led DKA/HHS treatment continues. Establish the available renal/urine context concurrently and use a monitored local insulin plan rather than treating the general 0.1 or 0.05 units/kg/hour source branches as an executable regimen while that safety context is unknown.',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

function stageNotes(values, actions) {
  const includes = stage => actions.some(item => item.stage === stage);
  return {
    confirm: includes('confirm') ? undefined : values.pattern === 'unknown' ? 'Verify the DKA/HHS components before choosing a regimen.' : 'The entered crisis pattern remains reviewable as findings change.',
    stabilize: includes('stabilize') ? undefined : values.criticalFeature === 'no' ? 'No critical feature is entered after assessment.' : 'Assess critical features and fluid tolerance.',
    treat: includes('treat') ? undefined : 'Potassium, glucose and phase must support a source treatment branch.',
    reassess: includes('reassess') ? undefined : 'Set treatment response checks before interpreting resolution.',
    transition: includes('transition') ? undefined : 'Resolution and transition must match the crisis pattern.',
  };
}

function addConfirmationActions(actions, values) {
  if (values.pattern === 'unknown') {
    actions.push(action(
      'verify-hyperglycemic-crisis-components',
      'confirm',
      'Verify DKA/HHS components',
      undefined,
      'Obtain time-linked glucose, electrolytes/renal function, measured or calculated osmolality, and the clinical context. The 2024 consensus requires all diagnostic components; do not infer a pure HHS or DKA branch from glucose alone.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    actions.push(action(
      'obtain-venous-gas-for-acidosis',
      'confirm',
      'Obtain a venous gas for acidosis',
      undefined,
      'Use pH and bicarbonate with ketones to distinguish DKA, HHS and overlap. The local resource is a venous blood-gas identity; specimen choice and timing remain a clinician-led decision.',
      {tone: 'attention', resourceGroup: 'blood-gas'},
    ));
    actions.push(action(
      'verify-quantitative-ketone-method',
      'confirm',
      'Verify quantitative beta-hydroxybutyrate',
      undefined,
      'The consensus uses beta-hydroxybutyrate thresholds for diagnosis and resolution. Confirm locally that the blood-ketone test reports quantitative beta-hydroxybutyrate in mmol/L before applying the thresholds.',
      {tone: 'attention', resourceGroup: 'ketones'},
    ));
  }

  if (hasCrisis(values) && values.carePhase === 'unknown') {
    actions.push(action(
      'establish-crisis-care-phase',
      'confirm',
      'Establish initial, active or resolved phase',
      undefined,
      'Do not duplicate an active infusion or treat a resolved episode as an initial crisis. Record whether treatment has not started, is active, or whether the full pattern-specific resolution criteria are met.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (hasCrisis(values) && hasRoutinePhase(values)) {
    actions.push(action(
      'identify-and-treat-precipitating-cause',
      'confirm',
      'Identify the precipitating cause',
      undefined,
      'Infection and insulin omission are frequent causes, but evaluate the clinical presentation for other triggers in parallel. The linked resources are a focused review context, not a blanket infection, imaging or culture order set.',
      {resourceGroup: 'workup'},
    ));
  }

}

function addUrgencyAndFluidActions(actions, values) {
  if (values.criticalFeature === 'yes') {
    actions.push(action(
      'escalate-critical-feature',
      'stabilize',
      'Escalate shock, coma or critical concern',
      'Use monitored critical-care assessment now.',
      hasCrisis(values)
        ? 'The consensus directs severe DKA, HHS, or a critical precipitating illness to ICU-level care. Treat ABC compromise and the precipitating emergency in parallel; do not wait for this guide to finish.'
        : 'Shock, altered consciousness or major haemodynamic compromise needs immediate emergency assessment even while the DKA/HHS pattern is still being confirmed. Do not infer that the metabolic findings are the sole cause.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.criticalFeature === 'unknown') {
    actions.push(action(
      'assess-critical-feature',
      'stabilize',
      'Assess shock, consciousness and critical trigger',
      undefined,
      'Check haemodynamics, mental status, work of breathing and a time-critical precipitant. Unknown is not an absence of severe DKA/HHS or a safe lower-acuity placement.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (
    isHhsPattern(values)
    && ['unknown', 'initial', 'active'].includes(values.carePhase)
    && values.criticalFeature !== 'yes'
  ) {
    actions.push(action(
      'route-hhs-or-mixed-crisis-to-icu-level-care',
      'stabilize',
      'Route HHS to ICU-level care',
      'HHS / mixed crisis: arrange ICU-level care.',
      'The consensus directs HHS to ICU-level care. A mixed DKA/HHS entry includes HHS and needs the same placement review. “No — assessed” for an additional critical feature does not downgrade a confirmed HHS presentation to lower-acuity care.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }

  if (!hasCrisis(values) || !hasRoutinePhase(values)) return;
  if (isHhsRateGuardBlockingRoutineActions(values)) return;

  if (values.carePhase === 'active') {
    actions.push(action(
      'reassess-active-fluid-plan',
      'stabilize',
      'Reassess the active fluid plan',
      'Do not carry forward the initial 2–4-hour rate.',
      'The 500–1,000 mL/hour statement is an initial-treatment range, not a continuing rate. During active treatment, review blood pressure, heart rate, input/output, sodium, renal/cardiac context and the observed response before changing fluid type, amount or rate. This compact guide does not prescribe an active-treatment rate.',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.volumeState === 'unknown') {
    actions.push(action(
      'assess-perfusion-and-fluid-tolerance',
      'stabilize',
      'Assess perfusion and fluid tolerance',
      undefined,
      'Before selecting an initial rate, document blood pressure, heart rate, examination, input/output, cardiac context and renal/urine status. A crisis does not make a standard fluid rate safe when these findings are unknown.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.volumeState === 'depleted' && values.renalUrine === 'adequate') {
    actions.push(action(
      'standard-isotonic-fluid-when-tolerated',
      'stabilize',
      'Use initial isotonic or balanced fluid',
      '500–1,000 mL/hour for the first 2–4 hours.',
      'This source rate applies to adults with DKA or HHS without renal or cardiac compromise. Reassess after intravascular restoration using blood pressure, heart rate, input/output and sodium. The linked local entries are isotonic fluid identities, not a bag, bolus or hourly prescription.',
      {resourceGroup: 'isotonic-fluid'},
    ));
  } else if (values.volumeState === 'depleted' && values.renalUrine === 'impaired') {
    actions.push(action(
      'cautious-isotonic-boluses-for-renal-risk',
      'stabilize',
      'Use cautious isotonic boluses',
      'Source example: 250 mL boluses with frequent reassessment.',
      'Oliguria, dialysis or major renal risk does not support automatically applying the 500–1,000 mL/hour source range. The consensus advises smaller isotonic or crystalloid boluses (for example, 250 mL) with frequent haemodynamic assessment in high fluid-overload-risk contexts.',
      {tone: 'attention', resourceGroup: 'isotonic-fluid'},
    ));
  } else if (values.volumeState === 'depleted') {
    actions.push(action(
      'confirm-renal-urine-context-before-standard-fluid-rate',
      'stabilize',
      'Confirm renal/urine context before a standard rate',
      undefined,
      'A depleted examination does not establish renal tolerance. Confirm urine output and renal context before applying the source standard rate; unknown is not the same as no renal compromise.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.volumeState === 'highRisk') {
    actions.push(action(
      'cautious-isotonic-boluses-for-fluid-risk',
      'stabilize',
      'Assess fluid need before a bolus',
      'If resuscitation is indicated: small boluses (e.g. 250 mL), reassess each.',
      'Fluid overload, heart failure or dialysis risk is not itself a bolus indication. If bedside assessment establishes resuscitation is needed, the consensus advises smaller isotonic or crystalloid boluses (for example, 250 mL) with frequent haemodynamic reassessment. This does not select a product amount, interval or a diuretic plan.',
      {tone: 'attention', resourceGroup: 'isotonic-fluid'},
    ));
  } else if (values.volumeState === 'repleted') {
    actions.push(action(
      'reassess-fluid-after-volume-restoration',
      'stabilize',
      'Reassess rather than continue an initial rate',
      undefined,
      'After intravascular restoration, fluid choice depends on hydration, blood pressure, heart rate, input/output and sodium. In HHS, an early sodium rise during glucose correction alone is not a reason to choose 0.45% sodium chloride.',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function addPotassiumActions(actions, values) {
  if (!hasCrisis(values)) return;

  if (values.potassium === 'unknown') {
    actions.push(action(
      'verify-potassium-before-insulin-branch',
      'treat',
      'Verify potassium before an insulin branch',
      undefined,
      'Insulin, correction of acidosis and volume expansion lower serum potassium. Do not treat an unverified potassium value as safe; obtain a time-linked result and set repeat monitoring before starting or advancing a source insulin branch.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.potassium === 'below3_5') {
    if (values.renalUrine === 'adequate') {
      actions.push(action(
        'hold-insulin-for-low-potassium',
        'treat',
        'Hold insulin; replace potassium first',
        'K below 3.5: 10 mmol/hour; do not start or restart insulin until K is above 3.5.',
        'The consensus directs potassium replacement at 10 mmol/hour when potassium is below 3.5 mmol/L and delays insulin until the concentration is above 3.5 mmol/L. Use monitored local preparation and access; the linked premix is 40 mEq/L and is not an automatic conversion to this rate.',
        {tone: 'urgent', resourceGroup: 'potassium'},
      ));
    } else {
      actions.push(action(
        'hold-insulin-low-potassium-with-renal-context',
        'treat',
        'Hold insulin; use a renal-aware potassium plan',
        'K below 3.5: hold insulin and urgently individualize replacement.',
        values.renalUrine === 'impaired'
          ? 'The source’s general 10 mmol/hour statement does not create a dialysis, oliguria or major-renal-risk replacement regimen. Hold insulin, use monitored local renal-aware replacement, and document a reviewed potassium above 3.5 mmol/L before restarting insulin.'
          : 'The source’s general 10 mmol/hour statement does not establish a safe fixed rate while renal function and urine output are unknown. Hold insulin, urgently establish that context, and use monitored local replacement rather than applying the general rate automatically.',
        {tone: 'urgent', resourceGroup: 'potassium'},
      ));
    }
    return;
  }

  if (values.potassium === 'at3_5') {
    actions.push(action(
      'confirm-potassium-above-boundary-before-insulin',
      'treat',
      'Confirm potassium is above the restart boundary',
      'At exactly 3.5, do not infer a prior low result is now above 3.5.',
      'The low-potassium branch permits insulin only after potassium increases to above 3.5 mmol/L. Exactly 3.5 may be an initial value or a post-replacement boundary; this guide does not decide that distinction or restart an infusion without a reviewed trend and local protocol.',
      {tone: 'attention', resourceGroup: 'potassium'},
    ));
    return;
  }

  if (values.potassium === 'above3_5toBelow5' && hasRoutinePhase(values) && !isHhsRateGuardBlockingRoutineActions(values)) {
    if (values.renalUrine === 'adequate') {
      actions.push(action(
        'potassium-maintenance-with-adequate-urine',
        'treat',
        'Replace potassium to maintain 4–5 mmol/L',
        'Consensus: 20–30 mmol potassium per litre of IV fluid.',
        'The consensus starts replacement once potassium falls below 5.0 mmol/L; for most DKA cases, 20–30 mmol/L of IV fluid maintains a 4–5 mmol/L target. This is not a local premix or pump setting. The linked KCl premix contains 40 mEq/L, so it cannot be substituted automatically for the source concentration.',
        {resourceGroup: 'potassium'},
      ));
    } else {
      actions.push(action(
        'individualize-potassium-with-renal-or-urine-gap',
        'treat',
        'Individualize potassium with renal/urine review',
        undefined,
        values.renalUrine === 'impaired'
          ? 'Oliguria, dialysis or major renal risk requires a careful potassium plan; do not apply the usual 20–30 mmol/L maintenance statement automatically.'
          : 'The source potassium target depends on renal handling and urine output. Confirm an observed urine-output interval before translating the maintenance statement into a local preparation.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
  }

  if (['at5', 'above5'].includes(values.potassium) && hasRoutinePhase(values)) {
    actions.push(action(
      'withhold-routine-potassium-at-or-above-five',
      'treat',
      'Do not add routine potassium yet',
      values.potassium === 'at5' ? 'At exactly 5.0, wait for a confirmed value below 5.0.' : 'Start routine replacement only after K falls below 5.0.',
      'The consensus starts potassium replacement after the serum concentration falls below 5.0 mmol/L. Insulin and correction commonly lower potassium, so establish serial surveillance rather than treating an initially high or boundary value as a reason to omit it.',
      {resourceGroup: 'monitoring'},
    ));
  }

  if (
    ['dka', 'mixed'].includes(values.pattern) &&
    hasRoutinePhase(values) &&
    !isPotassiumBlocked(values) &&
    !isHhsRateGuardBlockingRoutineActions(values)
  ) {
    actions.push(action(
      values.carePhase === 'initial' ? 'set-potassium-recheck-timing' : 'confirm-active-potassium-surveillance',
      'reassess',
      values.carePhase === 'initial' ? 'Set potassium recheck timing' : 'Confirm active potassium surveillance',
      values.carePhase === 'initial'
        ? 'Recheck K 2 hours after insulin starts, then every 4 hours.'
        : 'Confirm the 2-hour K check; continue at least every 4 hours.',
      values.carePhase === 'initial'
        ? 'The consensus explicitly gives this timing for DKA until resolution. For mixed crisis, retain the DKA potassium protection while also following the HHS correction checks. Review sooner for renal risk, an abnormal result or clinical deterioration.'
        : 'The active-phase field does not establish how long the infusion has been running. Confirm whether the source 2-hour potassium check occurred after insulin began, then continue at least every 4 hours until DKA resolution. For mixed crisis, retain the DKA potassium protection while also following the HHS correction checks.',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function addInsulinAndDextroseActions(actions, values) {
  if (!hasCrisis(values) || !hasRoutinePhase(values)) return;
  if (isHhsRateGuardBlockingRoutineActions(values)) return;
  if (isPotassiumBlocked(values) || values.glucosePhase === 'hypoglycemia') return;

  if (values.glucosePhase === 'unknown') {
    actions.push(action(
      'confirm-glucose-before-insulin-rate-branch',
      'treat',
      'Confirm glucose before choosing the rate branch',
      undefined,
      'Use a current glucose value and the DKA/HHS pattern together. The linked lab glucose is not a verified bedside capillary-monitoring order; set local point-of-care monitoring and response timing separately.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (isDkaPattern(values)) {
    if (needsRenalInsulinReview(values)) {
      addRenalInsulinReview(actions, values);
      return;
    }

    if (values.glucosePhase === 'atOrAbove250') {
      actions.push(action(
        'dka-fixed-rate-insulin',
        'treat',
        'Use the DKA fixed-rate IV insulin branch',
        '0.1 units/kg/hour IV fixed-rate infusion.',
        'For confirmed DKA, the consensus uses short-acting IV insulin at 0.1 units/kg/hour after potassium permits. This is source-rate information, not a prepared infusion concentration, vial amount, pump setting or automatic order. Continue until biochemical DKA resolution, not until glucose alone improves.',
        {resourceGroup: 'insulin-iv'},
      ));
    } else if (values.glucosePhase === 'below200' && values.carePhase === 'initial') {
      actions.push(action(
        'euglycemic-dka-insulin',
        'treat',
        'Use the DKA insulin branch after potassium permits',
        '0.1 units/kg/hour IV fixed-rate infusion.',
        'Verified DKA that presents below 200 mg/dL is euglycaemic DKA. Treat ketonaemia with the DKA insulin branch rather than waiting for a high glucose value. This is source-rate information only; verify the local infusion preparation and monitoring protocol.',
        {resourceGroup: 'insulin-iv'},
      ));
      actions.push(action(
        'euglycemic-dka-start-dextrose',
        'treat',
        'Start dextrose with initial DKA treatment',
        'Euglycaemic DKA: add 5–10% dextrose at the same time as 0.9% saline.',
        'The consensus specifies 5–10% dextrose added to IV fluid or started at the same time as 0.9% saline in euglycaemic DKA. It is not a substitute for treating true hypoglycaemia, and it does not override the potassium hold branch.',
        {resourceGroup: 'dextrose'},
      ));
    } else {
      actions.push(action(
        'dka-reduced-insulin-at-low-glucose',
        'treat',
        'Continue DKA insulin with glucose support',
        'At glucose below 250: reduce IV insulin to 0.05 units/kg/hour.',
        'Glucose often falls before ketoacidosis resolves. The consensus reduces the IV insulin rate to 0.05 units/kg/hour when glucose is below 250 mg/dL so insulin can continue to clear ketonaemia. This does not establish DKA resolution or select a local pump regimen.',
        {resourceGroup: 'insulin-iv'},
      ));
      actions.push(action(
        'dka-add-dextrose-below-250',
        'treat',
        'Add dextrose to continue ketosis treatment',
        'Use 5–10% dextrose with 0.9% saline when glucose is below 250.',
        'The consensus adds 5–10% dextrose to replacement fluid when glucose falls below 250 mg/dL to prevent hypoglycaemia while insulin continues until ketonaemia is corrected. The linked 5% and 10% bags are separate product identities; do not infer a bag-per-hour regimen or substitute a hyperkalaemia rescue ampoule.',
        {resourceGroup: 'dextrose'},
      ));
    }
    return;
  }

  if (values.pattern === 'mixed') {
    if (needsRenalInsulinReview(values)) {
      addRenalInsulinReview(actions, values);
      return;
    }

    if (values.glucosePhase === 'atOrAbove250') {
      actions.push(action(
        'mixed-dka-hhs-insulin',
        'treat',
        'Use the mixed DKA/HHS insulin branch',
        '0.1 units/kg/hour IV fixed-rate infusion.',
        'Significant ketonaemia and acidosis in HHS represents mixed DKA/HHS, for which the consensus uses 0.1 units/kg/hour. HHS correction-rate guards still apply; do not advance this routine branch if osmolality is falling too fast or the active trajectory is unassessed.',
        {resourceGroup: 'insulin-iv'},
      ));
    } else if (values.carePhase === 'initial') {
      actions.push(action(
        'mixed-initial-glucose-pattern-conflict',
        'treat',
        'Reconcile lower glucose with initial mixed crisis',
        undefined,
        'Mixed DKA/HHS includes the HHS hyperglycaemia/osmolality component. A lower glucose band can occur after treatment, but does not fit an initial mixed-crisis entry. Confirm treatment phase, trend, ketones, acid-base status and osmolality before selecting an insulin or dextrose branch.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'mixed-reduced-insulin-at-low-glucose',
        'treat',
        'Continue mixed-crisis insulin with glucose support',
        'At glucose below 250: reduce IV insulin to 0.05 units/kg/hour.',
        'During active mixed DKA/HHS, glucose can fall before ketonaemia and hyperosmolality resolve. Use the low-glucose insulin/dextrose approach only while the HHS correction trajectory remains within reviewed limits; this does not establish either resolution endpoint.',
        {resourceGroup: 'insulin-iv'},
      ));
      actions.push(action(
        'mixed-add-dextrose-below-250',
        'treat',
        'Add dextrose while treating mixed crisis',
        'Use 5–10% dextrose with 0.9% saline when glucose is below 250.',
        'The linked dextrose bags are product identities only. Use a clinician-reviewed fluid/insulin plan and keep HHS correction-rate guards visible; do not infer a bag-per-hour regimen.',
        {resourceGroup: 'dextrose'},
      ));
    }
    return;
  }

  if (values.pattern === 'hhs') {
    if (values.glucosePhase === 'atOrAbove250') {
      if (needsRenalInsulinReview(values)) {
        addRenalInsulinReview(actions, values);
      } else {
        actions.push(action(
          'isolated-hhs-insulin',
          'treat',
          'Use the isolated-HHS insulin branch',
          '0.05 units/kg/hour IV fixed-rate infusion.',
          'Use this branch only after reviewing beta-hydroxybutyrate below 3.0 mmol/L (or urine ketones below 2+), pH at least 7.3 and bicarbonate at least 18 mmol/L. The consensus uses 0.05 units/kg/hour for that isolated-HHS treatment pattern. If bicarbonate is 15–17 mmol/L or any DKA-overlap criterion is present, select the mixed 0.1 branch instead. Keep the HHS glucose, sodium and osmolality limits visible; this does not select a local pump preparation or make an unchecked active trajectory safe.',
          {resourceGroup: 'insulin-iv'},
        ));
      }
    } else if (values.carePhase === 'initial') {
      actions.push(action(
        'hhs-initial-glucose-pattern-conflict',
        'treat',
        'Reconcile lower glucose with initial HHS',
        undefined,
        'HHS diagnosis requires glucose at least 600 mg/dL. A lower band can be a treated or resolving HHS state, but it does not fit “initial treatment / not started.” Confirm timing, osmolality, ketones and acid-base status before choosing an insulin or dextrose branch.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'hhs-low-glucose-needs-endpoint-review',
        'treat',
        'Review HHS endpoint before changing treatment',
        'Glucose below 250 alone does not resolve HHS.',
        'HHS may move through the 200–250 mg/dL or lower bands during active treatment. Confirm measured osmolality, urine output, cognition and correction trajectory before changing fluid, dextrose or insulin. Glucose alone does not resolve HHS or select an insulin rate.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      if (values.renalUrine === 'adequate' && values.hhsTrajectory === 'withinLimits') {
        actions.push(action(
          'review-hhs-dextrose-support-below-250',
          'treat',
          'Review dextrose support while insulin remains needed',
          'At glucose below 250, review 5–10% dextrose with 0.9% saline.',
          'The consensus treatment table describes modifying fluid with 5–10% dextrose below 250 mg/dL to prevent hypoglycaemia. In this compact HHS branch, use that only after a reviewed in-limit trajectory, safe potassium and adequate urine/renal context, and only if ongoing insulin remains clinically indicated. This does not select a bag, rate or resolution endpoint.',
          {resourceGroup: 'dextrose'},
        ));
      }
      if (needsRenalInsulinReview(values)) addRenalInsulinReview(actions, values);
    }
  }
}

function addHhsAndMonitoringActions(actions, values) {
  if (values.glucosePhase === 'hypoglycemia') {
    actions.push(action(
      'treat-true-hypoglycemia-in-parallel',
      'treat',
      'Treat true hypoglycaemia first',
      'Glucose below 70 mg/dL (3.9 mmol/L): open the rescue pathway now.',
      'A glucose value below 70 mg/dL (3.9 mmol/L) is not the routine 5–10% dextrose branch. Use the dedicated hypoglycaemia rescue pathway urgently while a clinician reviews the active insulin/dextrose plan; do not blindly continue a fixed-rate crisis regimen.',
      {tone: 'urgent', related: ['hypoglycemia']},
    ));
  }

  if (isHhsPattern(values) && values.hhsTrajectory === 'tooFast') {
      actions.push(action(
        'urgent-hhs-correction-review',
        'reassess',
        'Urgently review overly rapid HHS correction',
        'Avoid glucose decline above 90–120 mg/dL/hour, sodium decline above 10 mmol/L/24 h, or osmolality fall above 8 mOsm/kg/hour.',
        'Rapid change risks neurological complications. Do not automatically continue, advance or substitute the routine fluid and insulin branches while this is present; use an urgent senior/critical-care review of measured trend, fluid balance, insulin exposure and neurologic state.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
  } else if (isHhsPattern(values) && hasRoutinePhase(values)) {
    if (values.hhsTrajectory === 'notFalling') {
      actions.push(action(
        'review-hhs-osmolality-prerequisites',
        'reassess',
        'Review HHS osmolality prerequisites',
        'Do not choose 0.45% saline until balance and insulin prerequisites are confirmed.',
        values.carePhase === 'active'
          ? 'An early sodium rise alone is not an indication for 0.45% sodium chloride. The consensus limits hypotonic fluid to osmolality failing to decline despite documented adequate positive fluid balance and appropriate insulin. This form does not record those two prerequisites, so it cannot link a local 0.45% product; review the measured trend, balance, insulin exposure and senior plan first.'
          : '“Osmolality not falling” is an active-treatment finding. Before changing fluid type, establish the measured trend, positive fluid balance, insulin exposure and phase. The source condition for 0.45% sodium chloride is not established by this form, so no product link is shown.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else if (values.hhsTrajectory === 'withinLimits') {
      actions.push(action(
        'maintain-hhs-correction-limits',
        'reassess',
        'Keep HHS correction within limits',
        'Glucose decline up to 90–120 mg/dL/hour; sodium decline up to 10 mmol/L/24 h; osmolality fall 3–8 mOsm/kg/hour.',
        'Trend each component rather than relying on a single glucose value. Use earlier review for neurological change or a changed fluid/insulin response. “Within limits” does not itself establish HHS resolution.',
        {resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'check-hhs-correction-trajectory',
        'reassess',
        'Check HHS glucose, sodium and osmolality trend',
        'Set HHS rate guards before calling the response safe.',
        'For HHS or mixed crisis, measure the correction trajectory. If treatment is active, an unknown trajectory is not equivalent to within source limits, so this guide withholds routine fluid/insulin continuation links until it is documented.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
  }

  if (hasCrisis(values) && hasRoutinePhase(values)) {
    actions.push(action(
      'set-serial-crisis-monitoring',
      'reassess',
      'Set serial glucose and biochemical checks',
      'Glucose every 1–2 h; electrolytes, creatinine, beta-hydroxybutyrate and venous pH every 4 h; HHS osmolality every 4 h.',
      'The consensus calls for hospital-calibrated capillary glucose monitoring during treatment and serial blood testing until resolution. Confirm the local bedside glucose workflow, venous-gas specimen and quantitative ketone assay.',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function addResolutionAndTransitionActions(actions, values) {
  if (!hasCrisis(values)) return;

  if (values.carePhase === 'unknown') {
    actions.push(action(
      'do-not-infer-resolution-from-glucose',
      'transition',
      'Do not infer resolution from glucose alone',
      undefined,
      'Record the treatment phase and the full endpoint matching DKA, HHS or mixed crisis. A lower glucose value can occur well before ketonaemia, acidosis or hyperosmolality resolves.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.carePhase === 'dkaResolved') {
    if (values.pattern === 'dka') {
      actions.push(action(
        'dka-resolution-criteria',
        'transition',
        'Confirm DKA biochemical resolution',
        'BOHB <0.6 mmol/L AND (pH ≥7.3 OR HCO3 ≥18 mmol/L); glucose <200 mg/dL ideal.',
        'Do not use anion gap or urine ketones alone as the DKA resolution endpoint. Urine ketones may rise as beta-hydroxybutyrate converts to acetoacetate during recovery. A verified DKA endpoint prepares, but does not itself execute, transition.',
        {resourceGroup: 'monitoring'},
      ));
    } else if (values.pattern === 'mixed') {
      actions.push(action(
        'mixed-dka-endpoint-needs-hhs-endpoint',
        'transition',
        'DKA endpoint alone does not resolve mixed crisis',
        undefined,
        'In mixed DKA/HHS, a documented DKA biochemical endpoint still needs the HHS endpoint: osmolality below 300 mOsm/kg, glucose below 250 mg/dL, urine output above 0.5 mL/kg/hour and improved cognition. Do not transition from IV treatment on one component alone.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'dka-resolution-pattern-conflict',
        'transition',
        'Reconcile DKA resolution with the HHS pattern',
        undefined,
        'The selected DKA endpoint does not match isolated HHS. Recheck the documented crisis classification and apply the corresponding resolution criteria before transition.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return;
  }

  if (values.carePhase === 'hhsResolved') {
    if (isHhsPattern(values) && values.glucosePhase === 'atOrAbove250') {
      actions.push(action(
        'hhs-resolution-glucose-conflict',
        'transition',
        'Current glucose conflicts with HHS resolution',
        'HHS resolution includes glucose below 250 mg/dL.',
        'A glucose value at or above 250 mg/dL does not meet the consensus HHS endpoint. Recheck osmolality, urine output and cognition as well; do not advance to transition from the resolution label alone.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (values.glucosePhase === 'hypoglycemia') {
      actions.push(action(
        'hhs-resolution-needs-hypoglycemia-review',
        'transition',
        'Treat hypoglycaemia before transition review',
        undefined,
        'A true hypoglycaemic result needs immediate rescue and review of active insulin/dextrose before any transition decision. It does not establish a safe HHS endpoint by itself.',
        {tone: 'urgent', resourceGroup: 'monitoring', related: ['hypoglycemia']},
      ));
      return;
    }

    if (values.pattern === 'hhs') {
      actions.push(action(
        'hhs-resolution-criteria',
        'transition',
        'Confirm HHS clinical resolution',
        'Osmolality below 300, glucose below 250, urine output above 0.5 mL/kg/hour, and cognition improved.',
        'There is no universal HHS resolution definition, but the consensus uses all four of these findings. A glucose threshold alone is insufficient. A verified HHS endpoint prepares, but does not itself execute, transition.',
        {resourceGroup: 'monitoring'},
      ));
    } else if (values.pattern === 'mixed') {
      actions.push(action(
        'mixed-hhs-endpoint-needs-dka-endpoint',
        'transition',
        'HHS endpoint alone does not resolve mixed crisis',
        undefined,
        'In mixed DKA/HHS, an HHS endpoint still needs the DKA endpoint: beta-hydroxybutyrate below 0.6 mmol/L and pH at least 7.3 or bicarbonate at least 18 mmol/L. Do not transition from IV treatment on one component alone.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'hhs-resolution-pattern-conflict',
        'transition',
        'Reconcile HHS resolution with the DKA pattern',
        undefined,
        'The selected HHS endpoint does not match isolated DKA. Recheck the documented crisis classification and apply the corresponding resolution criteria before transition.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return;
  }

  if (values.carePhase === 'transition') {
    if (values.criticalFeature !== 'no') {
      actions.push(action(
        'transition-needs-critical-feature-clearance',
        'transition',
        'Clear critical-feature status before transition',
        values.criticalFeature === 'yes' ? 'Active critical concern needs emergency management first.' : 'Unknown critical status is not a transition clearance.',
        values.criticalFeature === 'yes'
          ? 'Shock, altered consciousness, severe DKA/HHS or a critical precipitant needs monitored emergency management before any routine IV-to-subcutaneous transition. Reassess the crisis endpoint after the critical concern is addressed.'
          : 'Assess shock, consciousness and a critical precipitant before ending or changing IV treatment. An unknown urgent context is not equivalent to a reassuring assessment.',
        {tone: values.criticalFeature === 'yes' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (values.glucosePhase === 'unknown') {
      actions.push(action(
        'transition-needs-current-glucose-context',
        'transition',
        'Confirm current glucose before transition',
        undefined,
        'A transition label does not replace a time-linked glucose result. Record glucose with the DKA or HHS endpoint and current insulin/dextrose exposure before ending or changing IV treatment.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (isHhsPattern(values) && values.hhsTrajectory !== 'withinLimits') {
      actions.push(action(
        'transition-needs-hhs-trajectory-clearance',
        'transition',
        'Clear HHS trajectory before transition',
        values.hhsTrajectory === 'tooFast' ? 'Too-fast correction requires urgent review first.' : 'An unverified or abnormal HHS trajectory is not transition clearance.',
        values.hhsTrajectory === 'tooFast'
          ? 'Rapid glucose, sodium or osmolality change needs urgent review of fluid balance, insulin exposure and neurologic state. Do not end or change IV treatment through this transition branch until the correction is reassessed.'
          : 'For HHS or mixed crisis, document the glucose, sodium and osmolality trajectory before transition. An unknown trajectory is not evidence that correction stayed within the source limits, and a nonfalling osmolality entry needs its active-treatment review.',
        {tone: values.hhsTrajectory === 'tooFast' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (isHhsPattern(values) && values.glucosePhase === 'atOrAbove250') {
      actions.push(action(
        'transition-hhs-glucose-conflict',
        'transition',
        'Reconcile transition with current HHS glucose',
        'HHS requires glucose below 250 mg/dL before resolution.',
        'The selected HHS or mixed pattern has a glucose value at or above 250 mg/dL, which conflicts with the HHS resolution endpoint. Check osmolality, urine output and cognition too; do not end IV treatment from the transition label alone.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (values.glucosePhase === 'hypoglycemia') {
      actions.push(action(
        'transition-needs-hypoglycemia-review',
        'transition',
        'Treat hypoglycaemia before transition review',
        undefined,
        'A glucose value below 70 mg/dL needs immediate rescue and review of the active insulin/dextrose plan. It is not a safe signal to proceed with a routine IV-to-subcutaneous transition.',
        {tone: 'urgent', resourceGroup: 'monitoring', related: ['hypoglycemia']},
      ));
      return;
    }

    if (isPotassiumBlocked(values)) {
      actions.push(action(
        'transition-needs-potassium-clearance',
        'transition',
        'Clear potassium safety before transition',
        values.potassium === 'at3_5' ? 'At exactly 3.5, do not infer the post-low restart threshold is met.' : undefined,
        values.potassium === 'below3_5'
          ? 'Potassium below 3.5 mmol/L remains the consensus hold-insulin branch. Correct it under monitored local protocol and document a value above 3.5 before restarting or changing insulin treatment.'
          : values.potassium === 'at3_5'
            ? 'The source permits insulin after a low potassium result only once potassium is above 3.5 mmol/L. Exactly 3.5 does not establish that criterion; confirm the reviewed trend before ending or changing an insulin infusion.'
            : 'A transition plan requires current potassium safety. Obtain a time-linked result rather than assuming an unverified value permits ending or changing insulin treatment.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (isHhsPattern(values) && values.renalUrine !== 'adequate') {
      actions.push(action(
        'transition-needs-hhs-urine-endpoint',
        'transition',
        'Confirm the HHS urine-output endpoint',
        'HHS resolution needs urine output above 0.5 mL/kg/hour.',
        values.renalUrine === 'impaired'
          ? 'Oliguria, dialysis or major renal risk needs clinician-led reconciliation of the HHS endpoint and a specialist transition plan. Do not infer routine transition from the care-phase label.'
          : 'Unknown urine output does not establish the HHS resolution endpoint. Confirm the observed interval and renal context alongside osmolality, glucose and cognition before routine transition.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    actions.push(action(
      'overlap-subcutaneous-insulin-before-ending-iv',
      'transition',
      'Transition with subcutaneous-insulin overlap',
      'Give basal subcutaneous insulin at least 2 hours before ending IV insulin.',
      values.pattern === 'mixed'
        ? 'For mixed crisis, first document both DKA and HHS endpoints. The current ADA hospital standard directs basal subcutaneous insulin at least 2 hours before stopping IV insulin and requires 24-hour coverage. It does not provide a patient-specific total daily dose from this compact guide.'
        : 'Confirm the full endpoint matching the documented crisis pattern before ending IV insulin. The current ADA hospital standard directs basal subcutaneous insulin at least 2 hours before stopping IV insulin and requires 24-hour coverage. It does not provide a patient-specific total daily dose from this compact guide.',
      {resourceGroup: 'monitoring', source: currentAdaHospital},
    ));
  }
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];

  addConfirmationActions(actions, values);
  addUrgencyAndFluidActions(actions, values);
  addPotassiumActions(actions, values);
  addInsulinAndDextroseActions(actions, values);
  addHhsAndMonitoringActions(actions, values);
  addResolutionAndTransitionActions(actions, values);

  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'dka-hhs',
  title: 'DKA / HHS',
  reviewedAt: '2026-09-15',
  scope: 'Adult DKA/HHS acute-phase distinctions and reassessment.',
  reviewLimitations: [
    'This is an adult source-reviewed decision aid, not a paediatric, pregnancy, dialysis, ICU, emergency-resuscitation or patient-specific protocol.',
    'It does not calculate a fluid deficit, osmolarity, anion gap, insulin total daily dose, infusion preparation, potassium dilution/access, local pump setting, or an individual treatment order.',
    'The source considers bicarbonate only for severe acidaemia (pH below 7.0); this guide does not configure a bicarbonate regimen.',
    'This guide is not a DKA/HHS order bundle or proof of current product availability.',
    'Confirm locally that the blood-ketone test is a quantitative beta-hydroxybutyrate assay and that bedside capillary glucose monitoring is available before applying source thresholds or timing.',
  ],
  sources: [consensus, currentAdaHospital],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Verify the crisis pattern, protect potassium, use the correct DKA/HHS branch, then resolve the matching endpoint.',
    recognition: [
      'DKA needs diabetes or glucose at least 200 mg/dL, ketonaemia and metabolic acidosis. Euglycaemic DKA can occur below 200 mg/dL.',
      'HHS recognition needs glucose at least 600 mg/dL, hyperosmolality, no significant ketonaemia and bicarbonate at least 15. The 0.05 isolated-HHS branch additionally requires bicarbonate at least 18; otherwise review the mixed branch.',
      'Use quantitative beta-hydroxybutyrate when available. A test named “blood ketone” does not prove the assay reports the source units.',
    ],
    redFlags: [
      'Confirmed HHS, severe DKA, shock, altered consciousness or a critical precipitant: ICU-level care.',
      'Potassium below 3.5 mmol/L: replace first and do not start or restart insulin until above 3.5 mmol/L.',
      'HHS correction too fast, neurologic deterioration, oliguria/dialysis or fluid overload risk needs an immediate response-guided review.',
    ],
    steps: [
      {
        role: 'Confirm',
        text: 'Record glucose, beta-hydroxybutyrate, venous pH/bicarbonate, electrolytes/renal function and osmolality before declaring DKA, HHS or mixed crisis.',
        tools: ['blood-gas'],
      },
      {
        role: 'Restore perfusion safely',
        text: 'Without cardiac/renal compromise: isotonic saline or balanced crystalloid 500–1,000 mL/hour for the first 2–4 hours. Cardiac/renal-risk contexts need small response-guided boluses and frequent reassessment.',
        tools: ['isotonic-fluid'],
      },
      {
        role: 'Protect potassium',
        text: 'Below 3.5 mmol/L: potassium 10 mmol/hour and hold insulin until above 3.5. Below 5.0 with adequate urine output: usual source maintenance is 20–30 mmol/L of IV fluid to target 4–5.',
        tools: ['potassium'],
      },
      {
        role: 'Match insulin and glucose support',
        text: 'DKA or mixed: IV fixed-rate insulin 0.1 units/kg/hour. Isolated HHS: 0.05 units/kg/hour. At DKA glucose below 250, reduce insulin to 0.05 and add 5–10% dextrose; in active isolated HHS, review dextrose only when its trajectory, potassium, renal context and ongoing insulin need are documented.',
        tools: ['insulin-iv', 'dextrose'],
      },
      {
        role: 'Reassess and transition',
        text: 'Glucose every 1–2 hours; biochemical checks every 4 hours, with HHS osmolality every 4 hours. Use DKA ketone/pH/bicarbonate or HHS osmolality/glucose/urine/cognition endpoints, then give basal SC insulin at least 2 hours before ending IV insulin.',
        tools: ['hypoglycemia'],
      },
    ],
    monitoring: [
      'During treatment: hospital-calibrated capillary glucose every 1–2 hours; electrolytes, creatinine, beta-hydroxybutyrate and venous pH every 4 hours until DKA resolves. In HHS, measure serum osmolality every 4 hours.',
      'For HHS, keep glucose decline no faster than 90–120 mg/dL/hour, sodium decline no faster than 10 mmol/L in 24 hours, and osmolality fall within 3–8 mOsm/kg/hour.',
      'Check potassium 2 hours after insulin starts and every 4 hours thereafter until DKA resolution; use closer local monitoring when a critical or renal-risk context requires it.',
    ],
    sources: [consensus, currentAdaHospital],
  },
};

export default config;
