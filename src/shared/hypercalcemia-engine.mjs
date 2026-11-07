// Source-reviewed compact decision engine for adult acute hypercalcaemia.
// It emits review actions only. Rendering, product lookup, authority,
// and all order entry remain in the integrating layer.

export const SOCIETY_EMERGENCY_SOURCE = 'https://www.endocrinology.org/media/4277/emergency-guidance_acute-hypercalcaemia-in-adults.pdf';
export const SOCIETY_GUIDANCE_INDEX = 'https://www.endocrinology.org/clinical-practice/clinical-guidance/society-for-endocrinology-guidance/';
export const ENDO_HCM_GUIDELINE = 'https://academic.oup.com/jcem/article/108/3/507/6916871';
export const ENDO_HCM_INDEX = 'https://www.endocrine.org/clinical-practice-guidelines/hypercalcemia';

const societySource = {
  label: 'Society for Endocrinology emergency guidance — acute hypercalcaemia in adults (2016)',
  url: SOCIETY_EMERGENCY_SOURCE,
};
const hcmSource = {
  label: 'Endocrine Society guideline — treatment of hypercalcemia of malignancy in adults (2022/2023)',
  url: ENDO_HCM_GUIDELINE,
};

const fields = [
  {
    key: 'calcium',
    label: 'Verified adjusted calcium?',
    help: 'Use albumin-adjusted total calcium when available. The mild band is only for a result above the local reference range and below 3.0 mmol/L; do not convert ionized calcium into a total-calcium band here.',
    options: [
      ['unknown', 'Not established'],
      ['unconfirmed', 'Measure/context unresolved'],
      ['notHigh', 'Not above local reference range'],
      ['below3', 'Above range to <3.0 mmol/L'],
      ['moderate', '3.0–3.5 mmol/L'],
      ['severe', 'Above 3.5 mmol/L'],
    ],
  },
  {
    key: 'urgency',
    label: 'Urgent clinical features?',
    help: 'Crisis features include coma, marked confusion, dysrhythmia, major conduction change or hemodynamic instability. Other symptoms include thirst/polyuria, nausea, constipation, weakness and cognitive change.',
    options: [
      ['unknown', 'Not assessed'],
      ['crisis', 'Coma/confusion/arrhythmia'],
      ['symptomatic', 'Symptoms without crisis feature'],
      ['none', 'No urgent feature — assessed'],
    ],
  },
  {
    key: 'hydration',
    label: 'Volume / fluid tolerance?',
    help: 'The emergency saline range applies only to documented depletion when vigorous rehydration is tolerable. “Rehydrated; high Ca persists” needs a timed calcium response, current fluid tolerance and renal assessment. Heart failure or existing overload needs a response-guided plan.',
    options: [
      ['unknown', 'Not assessed'],
      ['depleted', 'Depleted; saline tolerated'],
      ['euvolemic', 'No volume deficit documented'],
      ['rehydrated', 'Rehydrated; high Ca persists'],
      ['overloadRisk', 'HF / overload risk'],
      ['overloaded', 'Fluid overload present'],
    ],
  },
  {
    key: 'renal',
    label: 'Renal reserve / dialysis?',
    help: 'Assess current kidney function before IV bisphosphonate. Severe renal failure or dialysis changes both fluid and antiresorptive decisions.',
    options: [
      ['unknown', 'Not established'],
      ['adequate', 'No impairment found · assessed'],
      ['reduced', 'Renal impairment'],
      ['severeOrDialysis', 'Severe renal failure / dialysis'],
    ],
  },
  {
    key: 'cause',
    label: 'Cause / malignancy context?',
    help: 'PTH-dependent and PTH-independent causes need different plans. Select malignancy only when the clinical team accepts it as the cause; do not infer HCM from cancer history alone.',
    options: [
      ['unknown', 'Not established'],
      ['nonHcm', 'Non-HCM cause accepted'],
      ['hcm', 'Malignancy-related HCM'],
      ['calcitriolHcm', 'Calcitriol-mediated HCM'],
    ],
  },
  {
    key: 'antiresorptiveStatus',
    label: 'Antiresorptive / response?',
    help: 'Reconcile the actual agent and timing. “Persistent after IV BP” is a clinician-documented HCM response state, not an inferred lack of response.',
    options: [
      ['unknown', 'Not reconciled'],
      ['notGiven', 'No antiresorptive given'],
      ['recent', 'Given; response pending'],
      ['improving', 'Improving after treatment'],
      ['persistentAfterBp', 'Persistent after IV BP'],
    ],
  },
  {
    key: 'calcitoninStatus',
    label: 'Calcitonin exposure?',
    help: 'Calcitonin is a short bridge, not a recurring default. The HCM guideline limits it to 48–72 hours because tachyphylaxis develops.',
    options: [
      ['unknown', 'Not reconciled'],
      ['notGiven', 'Not given'],
      ['under48', 'Started under 48 h ago'],
      ['hours48to72', '48–72 h course'],
      ['beyond72', '72 h or longer'],
    ],
  },
];

const validValues = Object.fromEntries(fields.map(field => [field.key, new Set(field.options.map(([value]) => value))]));
const stages = [
  {id: 'assess', title: 'Confirm urgency'},
  {id: 'volume', title: 'Protect volume status'},
  {id: 'cause', title: 'Separate the cause'},
  {id: 'lower', title: 'Review calcium-lowering therapy'},
  {id: 'reassess', title: 'Reassess without duplication'},
];
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function valuesFor(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, {
  tone,
  resourceGroup,
  source = societySource,
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
  };
}

function hasVerifiedCalciumMeasurement(values) {
  return ['notHigh', 'below3', 'moderate', 'severe'].includes(values.calcium);
}

function hasVerifiedHypercalcemia(values) {
  return ['below3', 'moderate', 'severe'].includes(values.calcium);
}

function hasClinicallyImportantHypercalcemia(values) {
  return ['moderate', 'severe'].includes(values.calcium);
}

function hasSevereHypercalcemia(values) {
  return values.calcium === 'severe';
}

function hasUrgentFeature(values) {
  return ['crisis', 'symptomatic'].includes(values.urgency);
}

function isHcm(values) {
  return ['hcm', 'calcitriolHcm'].includes(values.cause);
}

function isSevereHcm(values) {
  return hasSevereHypercalcemia(values) && isHcm(values);
}

function isHighUrgency(values) {
  return values.urgency === 'crisis' || hasSevereHypercalcemia(values);
}

function addAssessmentActions(actions, values) {
  if (!hasVerifiedCalciumMeasurement(values)) {
    actions.push(action(
      'verify-calcium-measure-and-context',
      'assess',
      'Verify calcium measure and albumin context',
      'A reported value is not yet a treatment band.',
      'Confirm whether the result is total, albumin-adjusted or ionized calcium, and obtain albumin with total calcium when needed. The Society guidance uses albumin-adjusted calcium; this engine does not convert ionized calcium into a total-calcium value.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }

  if (values.urgency === 'unknown') {
    actions.push(action(
      'assess-neurologic-cardiac-and-volume-features',
      'assess',
      'Assess neurologic, cardiac and volume features',
      'Urgency is not established from calcium alone.',
      'Assess cognition/consciousness, rhythm and ECG (including shortened QT or conduction change), hemodynamics, fluid balance, polyuria/thirst, gastrointestinal symptoms and renal impairment. An empty symptom entry is not evidence that these features are absent.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (values.urgency === 'crisis') {
    actions.push(action(
      'urgent-clinical-instability-and-ecg-review',
      'assess',
      'Escalate the acute neurologic or cardiac emergency',
      'Use monitored urgent assessment while calcium and cause are reconciled.',
      'Coma, marked confusion, dysrhythmia, major conduction change or hemodynamic instability requires immediate clinician-led emergency assessment. Do not let an incomplete calcium field or a suspected cause delay ABC support, ECG review and treatment of alternative acute diagnoses.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    if (!hasClinicallyImportantHypercalcemia(values)) {
      actions.push(action(
        'reconcile-crisis-with-calcium-findings',
        'assess',
        'Reconcile the crisis with the calcium findings',
        'Do not infer a hypercalcaemia-drug indication from discordant entries.',
        'A not-high, mildly above-range or unverified calcium entry does not explain a documented crisis by itself. Verify timing and measurement context and keep alternative neurologic, cardiac, toxicologic and metabolic causes active.',
        {tone: 'urgent', resourceGroup: 'workup'},
      ));
    }
  }

  if (!hasVerifiedCalciumMeasurement(values)) return;

  if (values.calcium === 'notHigh') {
    actions.push(action(
      'no-verified-hypercalcemia-band',
      'assess',
      'No high calcium band is entered',
      'Do not use this acute hypercalcaemia guide to select treatment.',
      'A reviewed adjusted-calcium result that is not above the local reference range does not activate a hypercalcaemia treatment branch. Continue to evaluate the current symptoms, trend and alternative diagnoses; an explicit not-high result does not resolve an unrelated acute presentation.',
      {resourceGroup: 'workup'},
    ));
    return;
  }

  if (hasSevereHypercalcemia(values)) {
    actions.push(action(
      'urgent-severe-hypercalcemia-review',
      'assess',
      'Severe hypercalcaemia needs urgent correction review',
      'Above 3.5 mmol/L carries dysrhythmia and coma risk.',
      'The Society for Endocrinology guidance describes adjusted calcium above 3.5 mmol/L as requiring urgent correction. Assess symptoms, ECG, fluid balance, renal function and cause in parallel; the compact guide does not determine a patient-specific treatment order.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.calcium === 'moderate') {
    actions.push(action(
      'moderate-hypercalcemia-prompt-review',
      'assess',
      'Promptly review moderate hypercalcaemia',
      values.urgency === 'symptomatic' ? 'Symptoms make prompt correction review more important.' : '3.0–3.5 mmol/L may need prompt treatment.',
      'The Society guidance says 3.0–3.5 mmol/L may be well tolerated if slow in onset, but may be symptomatic and prompt treatment is usually indicated. Use symptoms, time course, volume status, kidney function and cause rather than the number alone.',
      {tone: values.urgency === 'symptomatic' ? 'attention' : undefined, resourceGroup: 'monitoring'},
    ));
  } else if (values.calcium === 'below3' && values.urgency !== 'crisis') {
    actions.push(action(
      'below-urgent-calcium-band',
      'assess',
      'Above-range calcium below 3.0 mmol/L',
      'This mild high-calcium band alone does not usually need urgent correction.',
      'This option is only for verified adjusted calcium above the local reference range but below 3.0 mmol/L. The Society guidance describes calcium below 3.0 mmol/L as often asymptomatic and not usually needing urgent correction. This does not settle symptoms, cause, trend or an unrelated acute illness.',
      {resourceGroup: 'workup'},
    ));
  }
}

function addVolumeActions(actions, values) {
  if (!hasClinicallyImportantHypercalcemia(values)) return;

  if (values.renal === 'severeOrDialysis') {
    actions.push(action(
      'renal-failure-fluid-and-dialysis-review',
      'volume',
      'Use a renal-directed fluid and dialysis plan',
      'Do not expose a fixed saline or standard bisphosphonate route.',
      'Severe renal failure or dialysis changes both volume and calcium-lowering decisions. The Society guidance says dialysis may need consideration in severe renal failure. Reconcile current volume, renal replacement status, ECG and calcium trajectory with nephrology/critical-care input; this engine does not select a fluid volume, dialysate calcium or antiresorptive regimen.',
      {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.hydration === 'rehydrated') {
    const renalUnresolved = values.renal === 'unknown';
    actions.push(action(
      'document-persistent-calcium-after-rehydration',
      'volume',
      'Confirm persistent calcium after rehydration',
      renalUnresolved
        ? 'Timed calcium and fluid tolerance are entered; renal review remains unresolved.'
        : 'Timed calcium, fluid tolerance and renal review are documented.',
      renalUnresolved
        ? 'The rehydrated state requires a timed calcium recheck that remains elevated and current fluid-tolerance review. The renal field is still unresolved, so it cannot support a product-specific decision. Confirm pulmonary findings, urine output and current renal function; this does not select a further fluid volume or a calcium-lowering product by itself.'
        : 'Use this state only when rehydration has been completed and a timed calcium recheck remains elevated. Reassess current fluid tolerance, pulmonary findings, urine output and renal function. This does not select a further fluid volume or a calcium-lowering product by itself.',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.hydration === 'unknown') {
    actions.push(action(
      'confirm-volume-status-and-fluid-tolerance',
      'volume',
      'Confirm volume status and fluid tolerance',
      'Do not assume dehydration or saline tolerance.',
      'Assess intake/output, examination, hemodynamics, pulmonary congestion, heart-failure context and renal function before using the emergency saline range. Hypercalcaemia can cause nephrogenic diabetes insipidus and volume depletion, but an unknown entry does not establish either condition.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.hydration === 'overloadRisk' || values.hydration === 'overloaded') {
    actions.push(action(
      'avoid-fixed-saline-with-overload-risk',
      'volume',
      'Avoid a fixed saline target with overload risk',
      'Use a response-guided plan; loop diuretics are not routine calcium therapy.',
      'The Society guidance requires monitoring for fluid overload with renal impairment or older age and says loop diuretics are rarely used, only when overload develops, and are not effective for lowering calcium. Heart failure, existing congestion or uncertain renal reserve needs clinician-led volume management rather than a default 4–6 L regimen.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.hydration === 'euvolemic') {
    actions.push(action(
      'no-fixed-rehydration-without-deficit',
      'volume',
      'No fixed rehydration target without a deficit',
      'No volume deficit is documented.',
      'The 0.9% saline range in the Society emergency guidance is for rehydration. Continue to assess urine output, renal function and evolving fluid balance; this guide does not turn a euvolemic selection into a standing saline regimen.',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renal === 'unknown') {
    actions.push(action(
      'confirm-renal-function-before-saline-range',
      'volume',
      'Confirm renal function before the saline range',
      'A documented deficit does not establish tolerance of vigorous rehydration.',
      'Obtain and review current renal function and the risk of congestion before using the Society 0.9% saline range. Renal impairment changes fluid monitoring and also affects IV bisphosphonate selection.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renal === 'reduced') {
    actions.push(action(
      'renal-limited-saline-review',
      'volume',
      'Use a renal-limited saline review',
      'Individualize 0.9% saline and monitor for overload.',
      'The Society guidance gives 0.9% saline 4–6 L in 24 hours for rehydration but specifically warns to monitor for overload with renal impairment. In this state, choose volume and rate from the current examination, urine output, renal trajectory and local monitored-care plan; no fixed volume is supplied here.',
      {tone: 'attention', resourceGroup: 'isotonic-fluid'},
    ));
    return;
  }

  actions.push(action(
    'source-saline-rehydration-range',
    'volume',
    'Use the source rehydration range with monitoring',
    '0.9% saline 4–6 L/24 h only if vigorous rehydration is tolerable.',
    'The Society emergency guidance uses intravenous 0.9% saline 4–6 L in 24 hours for rehydration. Reassess fluid balance, urine output, renal function, pulmonary findings and calcium during treatment; reduce or stop the plan if the deficit is corrected or overload develops. This is a source range, not an automatic fluid order.',
    {resourceGroup: 'isotonic-fluid'},
  ));
}

function addTreatmentRecordAction(actions, values, source) {
  if (values.antiresorptiveStatus !== 'unknown') return false;
  actions.push(action(
    'reconcile-antiresorptive-agent-and-timing',
    'lower',
    'Reconcile the antiresorptive agent and timing',
    'Do not infer that a dose was absent, completed or ineffective.',
    'Record whether an IV bisphosphonate or denosumab was given, its timing, the calcium trend and renal context before surfacing another antiresorptive action. A missing treatment entry is not evidence that repeat therapy is appropriate.',
    {tone: 'attention', resourceGroup: 'monitoring', source},
  ));
  return true;
}

function addAntiresorptiveResponseAction(actions, values, source) {
  if (!['recent', 'improving'].includes(values.antiresorptiveStatus)) return false;
  actions.push(action(
    values.antiresorptiveStatus === 'recent'
      ? 'await-documented-antiresorptive-response'
      : 'continue-documented-antiresorptive-response',
    'reassess',
    values.antiresorptiveStatus === 'recent'
      ? 'Await the documented antiresorptive response'
      : 'Continue monitoring the documented response',
    values.antiresorptiveStatus === 'recent'
      ? 'Do not duplicate therapy while the agent and timed response are being reconciled.'
      : 'Improvement does not establish that further antiresorptive therapy is needed.',
    'Document the actual agent, administration time, calcium trend, renal function and symptoms. The Society guidance notes that IV bisphosphonate calcium nadir occurs at 2–4 days; denosumab and cause-specific treatment have different timelines. This engine does not infer a repeat dose or a completed episode from a single response entry.',
    {tone: 'attention', resourceGroup: 'monitoring', source},
  ));
  return true;
}

function addGeneralBisphosphonateActions(actions, values) {
  if (addTreatmentRecordAction(actions, values, societySource)) return;
  if (addAntiresorptiveResponseAction(actions, values, societySource)) return;

  if (values.antiresorptiveStatus === 'persistentAfterBp') {
    actions.push(action(
      'persistent-nonhcm-hypercalcemia-specialist-review',
      'lower',
      'Escalate persistent non-HCM hypercalcaemia',
      'Do not infer a denosumab indication from a non-HCM response state.',
      'The Endocrine Society denosumab recommendation for refractory disease applies specifically to hypercalcaemia of malignancy after IV bisphosphonate. Reconfirm cause, volume, renal function, prior agent and timing with endocrine/renal input before changing therapy.',
      {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.antiresorptiveStatus !== 'notGiven' || (!hasSevereHypercalcemia(values) && !hasUrgentFeature(values))) return;

  if (values.hydration !== 'rehydrated') {
    const prerequisiteSummary = {
      unknown: 'Volume and post-rehydration response are not established.',
      depleted: 'Reassess the timed calcium response after rehydration first.',
      euvolemic: 'No post-rehydration persistent-high-calcium state is entered.',
      overloadRisk: 'Overload risk needs a response-guided plan first.',
      overloaded: 'Fluid overload needs a response-guided plan first.',
    }[values.hydration];
    actions.push(action(
      'confirm-rehydration-prerequisite-before-general-iv-bisphosphonate',
      'lower',
      'Confirm rehydration before IV bisphosphonate review',
      prerequisiteSummary,
      'The Society guidance considers IV bisphosphonate after rehydration when further treatment is required. A general non-HCM product link requires an explicit “Rehydrated; high Ca persists” state: a timed calcium recheck remains high, current fluid tolerance is reviewed, and renal reserve is assessed. The current hydration entry does not meet that prerequisite; this is not a fixed fluid plan or an IV bisphosphonate order.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renal !== 'adequate') {
    actions.push(action(
      'renal-safeguarded-bisphosphonate-review',
      'lower',
      'Review bisphosphonate renal safeguards first',
      'No standard IV bisphosphonate dose is shown with renal impairment.',
      'After rehydration, the Society guidance considers IV bisphosphonate when further treatment is required, but directs slower infusion and dose reduction in renal impairment. Confirm current renal function, the local adjustment protocol, competing causes and response before exposing a product-specific regimen.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'general-iv-bisphosphonate-review',
    'lower',
    'Review IV bisphosphonate after rehydration',
    'Zoledronate 4 mg IV/15 min; renal review first.',
    'For acute hypercalcaemia requiring further treatment after IV saline, the Society guidance lists zoledronic acid 4 mg over 15 minutes or pamidronate 30–90 mg at 20 mg/hour. Calcium nadir is expected at 2–4 days. This is a source-linked review action, not a selection between products or an order; check renal function, vitamin-D/PTH context and the local protocol first.',
    {resourceGroup: 'bisphosphonate'},
  ));
}

function addRenalSafeguardedHcmAction(actions, values, {refractory = false} = {}) {
  const renalUnknown = values.renal === 'unknown';
  actions.push(action(
    refractory
      ? 'renal-safeguarded-refractory-hcm-review'
      : 'renal-safeguarded-hcm-antiresorptive-review',
    'lower',
    refractory
      ? 'Resolve renal safeguards before refractory HCM treatment'
      : 'Resolve renal safeguards before HCM antiresorptive selection',
    renalUnknown
      ? 'Renal status is unresolved; no antiresorptive product route.'
      : 'Renal impairment needs a patient-specific antiresorptive review.',
    renalUnknown
      ? 'The HCM guideline calls for renal assessment before IV bisphosphonate use. Renal reserve is not established here, so IV bisphosphonate adjustment and calcium/mineral monitoring cannot be determined. Confirm current renal function, calcium, phosphate, magnesium, vitamin-D context and the specialist plan before choosing a product or route.'
      : 'The HCM guideline calls for renal assessment before IV bisphosphonate use and renal dosing when appropriate. With documented renal impairment, IV bisphosphonate dosing/infusion needs a local renal plan; denosumab is not automatically selected and needs calcium/mineral monitoring. Confirm the current renal and treatment context with oncology/endocrine/nephrology review before surfacing a product route.',
    {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: hcmSource},
  ));
}

function addHcmActions(actions, values) {
  if (values.cause === 'calcitriolHcm') {
    actions.push(action(
      'calcitriol-hcm-glucocorticoid-first',
      'lower',
      'Use glucocorticoid-first review for calcitriol HCM',
      'Prednisolone 40 mg/day is the Society source option for lymphoma context.',
      'The Endocrine Society recommends glucocorticoids first for calcitriol-mediated HCM, such as lymphoma-associated disease. The Society emergency guidance lists prednisolone 40 mg daily for lymphoma, granulomatous disease or vitamin-D intoxication, usually effective in 2–4 days. Confirm the mechanism, infection/oncology context and local regimen; this is not an automatic steroid order.',
      {resourceGroup: 'glucocorticoid', source: hcmSource},
    ));

    if ((hasSevereHypercalcemia(values) || hasUrgentFeature(values))
      && values.antiresorptiveStatus !== 'improving') {
      actions.push(action(
        'confirm-glucocorticoid-response-before-calcitriol-hcm-antiresorptive',
        'lower',
        'Confirm steroid response before adding an antiresorptive',
        'The HCM add-on recommendation needs persistent severe or symptomatic disease on glucocorticoid.',
        'For calcitriol-mediated HCM, the Endocrine Society suggests IV bisphosphonate or denosumab only when severe or symptomatic hypercalcaemia persists despite glucocorticoid treatment. This compact control does not establish steroid exposure or response, so it does not choose or link another antiresorptive here.',
        {tone: isHighUrgency(values) ? 'attention' : undefined, resourceGroup: 'monitoring', source: hcmSource},
      ));
    }

    addAntiresorptiveResponseAction(actions, values, hcmSource);
    return;
  }

  if (addTreatmentRecordAction(actions, values, hcmSource)) return;
  if (addAntiresorptiveResponseAction(actions, values, hcmSource)) return;

  if (values.antiresorptiveStatus === 'persistentAfterBp') {
    if (values.renal === 'severeOrDialysis') {
      actions.push(action(
        'renal-specialist-review-for-refractory-hcm',
        'lower',
        'Use specialist review for refractory HCM with severe renal disease',
        'Do not expose a denosumab product link in this renal state.',
        'The Endocrine Society suggests denosumab for refractory or recurrent HCM after IV bisphosphonate, but severe renal failure/dialysis adds hypocalcaemia and monitoring considerations. Reconcile the actual bisphosphonate exposure, calcium/phosphate/magnesium/vitamin-D context and renal plan with oncology/endocrine/nephrology input before selecting treatment.',
        {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: hcmSource},
      ));
      return;
    }
    if (values.renal !== 'adequate') {
      addRenalSafeguardedHcmAction(actions, values, {refractory: true});
      return;
    }
    actions.push(action(
      'denosumab-after-documented-iv-bisphosphonate-for-hcm',
      'lower',
      'Review denosumab for refractory HCM after IV bisphosphonate',
      'HCM only: persistent/recurrent disease after documented IV BP.',
      'The Endocrine Society suggests denosumab for refractory or recurrent HCM already treated with an IV bisphosphonate. Confirm the prior agent, timing, renal function and calcium/phosphate/magnesium trend; do not treat this response selection as an automatic repeat or concurrent regimen.',
      {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'denosumab', source: hcmSource},
    ));
    return;
  }

  if (values.antiresorptiveStatus !== 'notGiven') return;

  if (values.renal === 'severeOrDialysis') {
    actions.push(action(
      'specialist-antiresorptive-selection-for-hcm-with-severe-renal-disease',
      'lower',
      'Use specialist antiresorptive selection for HCM with severe renal disease',
      'Do not expose a standard bisphosphonate or denosumab route.',
      'The Endocrine Society recommends an IV bisphosphonate or denosumab for HCM, while kidney disease changes the safety and monitoring context. Assess renal function, calcium, phosphate, magnesium and vitamin-D status and use local oncology/endocrine/nephrology review; this engine does not choose a product in severe renal failure or dialysis.',
      {tone: isHighUrgency(values) ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: hcmSource},
    ));
    return;
  }

  if (values.renal !== 'adequate') {
    addRenalSafeguardedHcmAction(actions, values);
    return;
  }

  actions.push(action(
    'hcm-select-one-antiresorptive-after-renal-review',
    'lower',
    'Select one HCM antiresorptive after renal review',
    'HCM: review one of denosumab or IV bisphosphonate.',
    'The Endocrine Society recommends denosumab or an IV bisphosphonate for adults with HCM and suggests denosumab over IV bisphosphonate. This recommendation applies to HCM, not general hypercalcaemia. These are alternatives, not a combined antiresorptive regimen. Check dental health, vitamin-D status, renal function, calcium/phosphate/magnesium and local authorization before selecting a single agent.',
    {resourceGroup: 'antiresorptive', source: hcmSource},
  ));
}

function addCauseAndAntiresorptiveActions(actions, values) {
  if (!hasVerifiedHypercalcemia(values)) return;

  if (values.cause === 'unknown') {
    actions.push(action(
      'classify-pth-and-hypercalcemia-cause',
      'cause',
      'Classify PTH-dependent and independent causes',
      'Do not infer malignancy from calcium severity alone.',
      'The Society guidance requests adjusted calcium, phosphate, PTH and urea/electrolytes, with history/examination for malignancy, medicines/supplements and other causes. High calcium with high PTH points toward primary/tertiary hyperparathyroidism; high calcium with low PTH points toward malignancy or other non-PTH causes. Do not delay emergency stabilization for this work-up.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.cause === 'nonHcm') {
    actions.push(action(
      'continue-nonhcm-cause-directed-review',
      'cause',
      'Continue the accepted non-HCM cause review',
      'Denosumab HCM guidance does not apply to this cause selection.',
      'The acute Society guidance lists primary hyperparathyroidism, medicines/supplements, granulomatous disease, vitamin-D excess, thyroid disease, immobilisation and other causes. Confirm the accepted mechanism and specialty plan; a non-HCM selection never activates the Endocrine Society HCM denosumab branch.',
      {resourceGroup: 'workup'},
    ));
    if (hasClinicallyImportantHypercalcemia(values)) addGeneralBisphosphonateActions(actions, values);
    return;
  }

  actions.push(action(
    values.cause === 'calcitriolHcm'
      ? 'accepted-calcitriol-mediated-hcm'
      : 'accepted-hypercalcemia-of-malignancy',
    'cause',
    values.cause === 'calcitriolHcm'
      ? 'Calcitriol-mediated HCM entered'
      : 'Hypercalcaemia of malignancy entered',
    'Coordinate oncology care and treatment of the underlying malignancy.',
    'The Endocrine Society HCM guideline applies only after malignancy is accepted as the cause. Underlying anti-cancer treatment is crucial to control HCM and prevent recurrence. This engine does not infer malignancy from a cancer history, select oncologic therapy or place a referral.',
    {resourceGroup: 'workup', source: hcmSource},
  ));
  addHcmActions(actions, values);
}

function addCalcitoninActions(actions, values) {
  if (values.calcitoninStatus === 'beyond72') {
    actions.push(action(
      'review-calcitonin-beyond-72-hours',
      'lower',
      'Review calcitonin exposure beyond 72 hours',
      'Do not reset or extend the course by default.',
      'The Endocrine Society HCM guideline limits calcitonin to 48–72 hours because tachyphylaxis develops. Reconcile actual administration, calcium trajectory and the definitive/cause-directed plan; this guide does not prescribe an extension or repeat course.',
      {tone: 'attention', resourceGroup: 'monitoring', source: hcmSource},
    ));
    return;
  }

  if (values.calcitoninStatus === 'hours48to72') {
    actions.push(action(
      'complete-calcitonin-within-source-window',
      'lower',
      'Complete the calcitonin review within 72 hours',
      'Tachyphylaxis limits the source bridge to 48–72 hours.',
      'Confirm the course start time, calcium response and the antiresorptive/cause-directed plan. Do not treat the time band as permission for an open-ended course.',
      {tone: 'attention', resourceGroup: 'monitoring', source: hcmSource},
    ));
    return;
  }

  if (values.calcitoninStatus === 'under48') {
    actions.push(action(
      'monitor-active-calcitonin-bridge',
      'reassess',
      'Monitor the active calcitonin bridge',
      'Document response and remaining 48–72 hour window; do not duplicate it.',
      'Calcitonin is a temporary bridge while an antiresorptive or cause-directed treatment takes effect in severe HCM. Record the start time, calcium trend and symptoms; this entry does not imply that another dose or a longer course is appropriate.',
      {resourceGroup: 'monitoring', source: hcmSource},
    ));
    return;
  }

  if (values.calcitoninStatus === 'unknown') {
    if (isSevereHcm(values)) {
      actions.push(action(
        'reconcile-calcitonin-exposure-before-bridge-action',
        'lower',
        'Reconcile calcitonin exposure before another bridge action',
        'Do not infer that calcitonin has not already been given.',
        'For severe HCM, calcitonin is a short adjunct to an IV bisphosphonate or denosumab. Confirm actual administration and timing before surfacing a new course; missing documentation is not a negative exposure.',
        {tone: 'attention', resourceGroup: 'monitoring', source: hcmSource},
      ));
    }
    return;
  }

  if (hasSevereHypercalcemia(values)
    && values.cause === 'hcm'
    && values.antiresorptiveStatus === 'notGiven') {
    actions.push(action(
      'severe-hcm-calcitonin-bridge',
      'lower',
      'Use the severe-HCM calcitonin bridge review',
      'Initial HCM: calcitonin with one antiresorptive; 48–72 hours.',
      'For severe HCM (serum calcium above 3.5 mmol/L), the Endocrine Society suggests calcitonin together with an IV bisphosphonate or denosumab as initial treatment. It is a rapid bridge, not monotherapy or a recurring default. This compact action is limited to accepted non-calcitriol HCM with a documented no-antiresorptive state; confirm the active antiresorptive plan and local calcitonin regimen before use.',
      {tone: 'urgent', resourceGroup: 'calcitonin', source: hcmSource},
    ));
    return;
  }

  if (hasSevereHypercalcemia(values) && values.cause !== 'hcm' && values.cause !== 'calcitriolHcm') {
    actions.push(action(
      'specialist-calcitonin-review-outside-severe-hcm',
      'lower',
      'Use specialist review before calcitonin outside severe HCM',
      'The HCM bridge recommendation is not a general hypercalcaemia default.',
      'The Society emergency guidance lists calcitonin under specialist supervision when response to other measures is poor. A non-HCM or unclassified cause does not inherit the Endocrine Society severe-HCM calcitonin combination recommendation.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addReassessmentActions(actions, values) {
  if (!hasClinicallyImportantHypercalcemia(values)
    && !(hasVerifiedHypercalcemia(values) && isHcm(values))) return;
  actions.push(action(
    'trend-calcium-renal-function-and-electrolytes',
    'reassess',
    'Trend calcium, fluid balance, renal function, magnesium and phosphate',
    'Document timed response before declaring treatment effective or complete.',
    'During acute management, trend calcium, fluid balance and renal function. For HCM, the Endocrine Society good-practice statements also call for monitoring magnesium and phosphate and correcting them as appropriate. Reassess symptoms, ECG concerns and the underlying-cause plan; no fixed monitoring interval is generated by this compact guide.',
    {resourceGroup: 'monitoring', source: isHcm(values) ? hcmSource : societySource},
  ));
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(item => item.stage === stage);
  const notHigh = values.calcium === 'notHigh';
  const mildAboveRange = values.calcium === 'below3';
  return {
    assess: hasStage('assess') ? undefined : 'Enter a credible calcium band and urgent clinical features.',
    volume: hasStage('volume') ? undefined : notHigh
      ? 'No acute volume action follows a not-high calcium result.'
      : mildAboveRange && values.hydration !== 'unknown' && values.renal !== 'unknown'
        ? 'No fixed saline action follows this mild calcium band.'
        : 'Classify fluid tolerance and renal reserve before saline review.',
    cause: hasStage('cause') ? undefined : notHigh
      ? 'No hypercalcaemia cause branch follows a not-high result.'
      : 'Separate PTH-related, malignancy-related and other causes before cause-specific treatment.',
    lower: hasStage('lower') ? undefined : notHigh
      ? 'No calcium-lowering therapy follows a not-high calcium result.'
      : mildAboveRange && values.cause === 'nonHcm'
        ? 'No routine acute calcium-lowering branch follows mild non-HCM hypercalcaemia.'
        : ['recent', 'improving'].includes(values.antiresorptiveStatus)
          ? 'No additional calcium-lowering action is generated while response is documented.'
          : 'Classify the cause and treatment record before calcium-lowering therapy review.',
    reassess: hasStage('reassess') ? undefined : notHigh
      ? 'No hypercalcaemia treatment-response review is generated.'
      : mildAboveRange && values.cause === 'nonHcm'
        ? 'Follow the accepted cause and clinical course; no acute response branch is generated.'
        : 'Record timed calcium, renal and clinical response if active treatment begins.',
  };
}

export function evaluate(input = {}) {
  const values = valuesFor(input);
  const actions = [];
  addAssessmentActions(actions, values);
  addVolumeActions(actions, values);
  addCauseAndAntiresorptiveActions(actions, values);
  addCalcitoninActions(actions, values);
  addReassessmentActions(actions, values);
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'hypercalcemia',
  title: 'Hypercalcemia',
  reviewedAt: '2026-09-15',
  scope: 'Adult acute hypercalcaemia: urgency, fluid tolerance and cause-specific treatment review.',
  reviewLimitations: [
    'This is a compact, source-linked adult decision aid, not a local protocol, prescription, calculator, diagnosis engine, order set or clinical-authority substitute.',
    'The Society for Endocrinology acute guidance remains listed on its live guidance page; the Endocrine Society HCM resource remains listed as last updated December 2022. This review did not identify a later replacement on those official pages as checked 15 September 2026.',
    'The Endocrine Society denosumab/bisphosphonate recommendations apply to accepted hypercalcaemia of malignancy. The engine does not apply them to a general or non-HCM cause selection.',
    'A documented fluid deficit, assessed renal reserve, current treatment exposure and response are required before product-linked branches appear. General non-HCM IV bisphosphonate access also needs an explicit rehydrated-persistent-calcium state. Unknown entries never establish absence of overload, renal impairment, prior treatment or treatment failure.',
    'Calcitonin is only surfaced as a severe-HCM bridge with a documented non-exposure state and is limited to 48–72 hours because of tachyphylaxis. No dose, repeat course or product is auto-selected from a missing treatment record.',
    'No HIS connection, patient data, order staging, order submission, product-equivalence decision or local formulary claim is contained in this data layer.',
  ],
  sources: [
    societySource,
    {label: 'Society for Endocrinology live guidance index (acute hypercalcaemia document listed when reviewed)', url: SOCIETY_GUIDANCE_INDEX},
    hcmSource,
    {label: 'Endocrine Society HCM guideline resource page (last updated 21 December 2022 when reviewed)', url: ENDO_HCM_INDEX},
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Classify urgency, fluid tolerance and cause before adding a calcium-lowering treatment.',
    recognition: [
      'Use the below-3.0 band only for calcium above the local reference range; a reviewed not-high result does not activate this acute treatment guide. The Society bands then place 3.0–3.5 mmol/L in prompt review and above 3.5 mmol/L in urgent correction review.',
      'Coma, marked confusion, dysrhythmia, conduction change, hemodynamic instability, renal impairment and severe dehydration can override a reassuring-looking history or a single calcium result.',
      'Check calcium measurement context, albumin, phosphate, PTH, renal function, ECG, fluid balance, medicines/supplements and the likely cause. Do not infer HCM from cancer history alone.',
    ],
    redFlags: [
      'Adjusted calcium above 3.5 mmol/L; coma, marked confusion, arrhythmia, major conduction change or hemodynamic instability.',
      'Severe renal failure/dialysis, pulmonary congestion, heart failure or overload that makes the standard rehydration range unsafe.',
      'Persistent/recurrent accepted HCM after IV bisphosphonate, calcitonin beyond 72 hours, or a calcitriol-mediated HCM pattern without a documented glucocorticoid response.',
    ],
    steps: [
      {
        role: 'Confirm urgency',
        text: 'Verify the calcium measure and albumin context, assess cognition, ECG/rhythm, renal function and fluid balance, and escalate a crisis presentation immediately.',
        tools: ['workup', 'monitoring'],
      },
      {
        role: 'Correct documented depletion',
        text: 'The Society source uses 0.9% saline 4–6 L in 24 hours only for a depleted adult who can tolerate vigorous rehydration. For general non-HCM IV bisphosphonate review, document that rehydration was tolerated and calcium remains high on a timed recheck. Heart failure, overload or severe renal disease needs a response-guided plan rather than a fixed volume.',
        dosingNote: 'Loop diuretics are not routine calcium-lowering therapy; use them only for overload that develops.',
        tools: ['isotonic-fluid', 'monitoring'],
      },
      {
        role: 'Separate HCM from general causes',
        text: 'The HCM antiresorptive guideline applies after malignancy is accepted as the cause. Non-HCM and unclassified causes need their own mechanism and renal review; do not carry a denosumab recommendation across those branches.',
        tools: ['workup'],
      },
      {
        role: 'Use bounded treatment reviews',
        text: 'For general non-HCM IV bisphosphonate review, require the explicit post-rehydration persistent-calcium state and renal safeguards. Accepted HCM follows its distinct concurrent antiresorptive review; for refractory HCM after IV bisphosphonate, review denosumab. In calcitriol-mediated HCM, glucocorticoids come first.',
        tools: ['antiresorptive', 'bisphosphonate', 'denosumab', 'glucocorticoid'],
      },
      {
        role: 'Use calcitonin only as a bridge',
        text: 'For initial severe non-calcitriol HCM with documented no antiresorptive, calcitonin is an adjunct with one antiresorptive, limited to 48–72 hours. Reconcile exposure and response instead of repeating it by default.',
        tools: ['calcitonin', 'monitoring'],
      },
    ],
    monitoring: [
      'During active correction, trend calcium, fluid balance, renal function, symptoms and ECG concerns. No generic monitoring interval is safe for every acute presentation.',
      'The Society guidance expects IV bisphosphonate calcium nadir at 2–4 days; a recent treatment entry does not establish failure or justify a duplicate dose.',
      'For HCM, monitor magnesium and phosphate and replace as clinically appropriate; review dental health and vitamin-D status before antiresorptive treatment where time and clinical condition permit.',
    ],
    sources: [societySource, hcmSource],
  },
};

export default config;
