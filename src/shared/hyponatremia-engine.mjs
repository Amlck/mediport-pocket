// Source-reviewed data and decision engine for adult hyponatraemia.
// It deliberately exposes findings and source-linked review actions only.
// Rendering, product lookup, clinical authority, and order entry live elsewhere.

export const SOCIETY_EMERGENCY_SOURCE = 'https://www.endocrinology.org/media/xhrhxhxm/emergency-management-of-severe-and-moderately-severely-symptomatic-hyponatraemia-in-adult-patients-2022.pdf';
export const SOCIETY_GUIDANCE_INDEX = 'https://www.endocrinology.org/clinical-practice/clinical-guidance/society-for-endocrinology-guidance/';
export const EUROPEAN_GUIDELINE_SOURCE = 'https://academic.oup.com/ejendo/article/170/3/G1/6668028';
export const EUROPEAN_FIELD_VERSION = 'https://www.european-renal-best-practice.org/sites/default/files/u33/short%20version%20hyponatraemia%20English%20FINAL.pdf';
export const ESE_ERA_2026_STATUS = 'https://www.era-online.org/era-guidance/';
export const ODS_RISK_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10843202/';

const societySource = {
  label: 'Society for Endocrinology emergency guidance — severe and moderately severe symptomatic hyponatraemia (2022)',
  url: SOCIETY_EMERGENCY_SOURCE,
};
const europeanSource = {
  label: 'European clinical practice guideline on diagnosis and treatment of hyponatraemia (2014; corrected July 2014)',
  url: EUROPEAN_GUIDELINE_SOURCE,
};
const odsRiskSource = {
  label: 'Sterns et al., Treatment Guidelines for Hyponatremia: Stay the Course (CJASN 2024) — ODS risk synthesis',
  url: ODS_RISK_SOURCE,
};

const fields = [
  {
    key: 'sodium',
    label: 'Verified serum sodium?',
    help: 'European biochemical bands: mild 130 to <135, moderate 125 to <130, profound <125 mmol/L.',
    options: [
      ['unknown', 'Not established'],
      ['notConfirmed', 'Unverified / possible sample issue'],
      ['notLow', '≥135 mmol/L / not low'],
      ['mild', '130 to <135 mmol/L · mild'],
      ['moderate', '125 to <130 mmol/L · moderate'],
      ['profound', '<125 mmol/L · profound'],
    ],
  },
  {
    key: 'symptoms',
    label: 'Urgent symptom class?',
    help: 'Severe: vomiting, cardio-respiratory distress, deep somnolence, seizure or coma. Moderately severe: nausea without vomiting, confusion or headache.',
    options: [
      ['unknown', 'Not assessed'],
      ['severe', 'Severe symptoms'],
      ['moderate', 'Moderately severe symptoms'],
      ['none', 'No severe/moderate symptoms'],
    ],
  },
  {
    key: 'attribution',
    label: 'Symptoms due to hyponatraemia?',
    help: 'Symptoms are non-specific. Accept the causal relation only after clinical assessment, particularly when sodium is mildly low.',
    options: [
      ['unknown', 'Attribution not assessed'],
      ['accepted', 'Accepted after clinical assessment'],
      ['uncertain', 'Uncertain / another cause possible'],
      ['notApplicable', 'Not applicable · no urgent symptoms'],
    ],
  },
  {
    key: 'acuity',
    label: 'Documented time course?',
    help: 'Acute is documented <48 hours; chronic is ≥48 hours. Unknown duration uses chronic correction safeguards in the European guideline.',
    options: [
      ['unknown', 'Not established · use chronic safeguards'],
      ['acuteUnquantified', '<48 h · fall not quantified'],
      ['acuteLargeDrop', '<48 h · >10 mmol/L fall'],
      ['chronic', '≥48 hours documented'],
    ],
  },
  {
    key: 'treatmentResponse',
    label: 'After-treatment response?',
    help: 'First identify whether initial treatment has not started, is active, or has a documented response. An incomplete entry never implies a response.',
    options: [
      ['unknown', 'Treatment phase not entered'],
      ['notStarted', 'Not started · initial response needed'],
      ['inProgress', 'In progress · 5 mmol/L not documented'],
      ['fiveRiseImproved', '≈5 rise + symptoms improve'],
      ['fiveRiseNoImprove', '≈5 rise + no symptom improvement'],
    ],
  },
  {
    key: 'correctionStatus',
    label: 'Cumulative Na correction?',
    help: 'Track the dated total sodium rise against 10 mmol/L in the first 24 hours and 8 mmol/L later, or a clinician-agreed lower ODS-risk ceiling.',
    options: [
      ['unknown', 'No serial total / cannot calculate'],
      ['withinCeiling', 'Within source ceiling; ODS unresolved'],
      ['risingUnclear', 'Rising · total/timing unclear'],
      ['exceeded', 'Above source / individualized ceiling'],
    ],
  },
  {
    key: 'hypotonicPattern',
    label: 'Tonicity / urine pattern?',
    help: 'In hypotonic hyponatraemia, interpret paired urine osmolality first and urine sodium second. Diuretics and kidney disease can confound this sequence.',
    options: [
      ['unknown', 'Not established'],
      ['nonHypotonicPossible', 'Non-hypotonic cause not excluded'],
      ['hypotonicPendingUrine', 'Hypotonic · urine studies pending'],
      ['waterExcess', 'Hypotonic · urine osm ≤100'],
      ['lowEffectiveVolume', 'Uosm >100 · UNa ≤30'],
      ['highUrineSodiumOrConfounded', 'Uosm >100 · UNa >30 / confounded'],
    ],
  },
];

const validValues = Object.fromEntries(fields.map(field => [field.key, new Set(field.options.map(([value]) => value))]));
const stages = [
  {id: 'triage', title: 'Classify urgency'},
  {id: 'initial', title: 'Initial response'},
  {id: 'reassess', title: 'Reassess response'},
  {id: 'workup', title: 'Confirm mechanism'},
  {id: 'guard', title: 'Guard correction'},
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
  source = europeanSource,
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

function hasVerifiedHyponatremia(values) {
  return ['mild', 'moderate', 'profound'].includes(values.sodium);
}

function hasUrgentSymptomClass(values) {
  return ['severe', 'moderate'].includes(values.symptoms);
}

function hasAcceptedSymptomaticHyponatremia(values) {
  return hasVerifiedHyponatremia(values)
    && hasUrgentSymptomClass(values)
    && values.attribution === 'accepted'
    && values.hypotonicPattern !== 'nonHypotonicPossible';
}

function hasEstablishedHypotonicPattern(values) {
  return [
    'hypotonicPendingUrine',
    'waterExcess',
    'lowEffectiveVolume',
    'highUrineSodiumOrConfounded',
  ].includes(values.hypotonicPattern);
}

function hasUnresolvedPostTreatmentCorrection(values) {
  return ['fiveRiseImproved', 'fiveRiseNoImprove'].includes(values.treatmentResponse)
    && ['unknown', 'risingUnclear'].includes(values.correctionStatus);
}

function suppressSodiumRaisingResourceLink(values) {
  return values.correctionStatus === 'exceeded'
    || hasUnresolvedPostTreatmentCorrection(values);
}

function addTriageActions(actions, values) {
  if (values.sodium === 'notLow') {
    actions.push(action('sodium-not-in-hyponatremia-range', 'triage',
      'Current sodium is not in the hyponatraemia range',
      'Na ≥135 mmol/L does not trigger sodium-raising treatment.',
      'Review whether this is a post-treatment value. A current non-low value does not erase a documented correction-limit breach or establish episode resolution. Investigate symptoms and alternative causes independently.',
      {resourceGroup: 'monitoring'}));
    if (values.symptoms === 'none') return;
  } else if (!hasVerifiedHyponatremia(values)) {
    actions.push(action(
      'verify-sodium-and-sample-context',
      'triage',
      'Verify serum sodium and sample context',
      'Confirm the result before a treatment decision.',
      'Confirm the result, comparison method, glucose and clinical context. The European guideline separates true hypotonic hyponatraemia from hyperglycaemic, pseudohyponatraemic and other non-hypotonic states; this guide cannot determine that distinction from a reported value alone.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }

  if (values.symptoms === 'unknown') {
    actions.push(action(
      'assess-symptom-class',
      'triage',
      'Assess neurologic and cardio-respiratory symptom class',
      'Classify symptoms before assigning emergency urgency.',
      'Assess for vomiting, cardio-respiratory distress, abnormal/deep somnolence, seizure, coma, nausea without vomiting, confusion and headache. Severe or moderately severe symptoms change the urgency only when their relation to hyponatraemia is clinically accepted.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (!hasUrgentSymptomClass(values)) {
    actions.push(action(
      'no-entered-symptom-emergency',
      'triage',
      'No severe or moderately severe symptom emergency entered',
      'Diagnostic and correction review remain needed.',
      'In the absence of a severe or moderately severe symptom class, the European guideline allows time for diagnostic assessment and cause-specific management. Moderate or profound biochemical hyponatraemia still needs active review; mild hyponatraemia is not treated solely to raise sodium in the European guideline.',
      {resourceGroup: 'workup'},
    ));
    return;
  }

  if (!hasVerifiedHyponatremia(values)) {
    actions.push(action(
      'urgent-symptoms-with-unverified-sodium',
      'triage',
      values.sodium === 'notLow' ? 'Urgently assess symptoms despite a non-low sodium' : 'Urgently assess the symptomatic emergency and verify sodium',
      'Treat the acute presentation while verifying sodium.',
      'Urgent ABC assessment and evaluation of alternative causes are required. This source-linked guide does not create a hypertonic-saline action when hyponatraemia itself has not been verified.',
      {tone: values.symptoms === 'severe' ? 'urgent' : 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.hypotonicPattern === 'nonHypotonicPossible') {
    actions.push(action(
      'nonhypotonic-discordance',
      'triage',
      'Do not apply the hypotonic-hyponatraemia pathway until this is resolved',
      'Resolve tonicity before using the hypotonic pathway.',
      'The European guideline specifically separates non-hypotonic hyponatraemia from the true hypotonic state addressed by this pathway. Escalate the acute illness and verify glucose, osmolality and sample context; this engine does not treat a non-hypotonic possibility as an automatic 3% saline indication.',
      {tone: values.symptoms === 'severe' ? 'urgent' : 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.attribution !== 'accepted') {
    actions.push(action(
      'confirm-symptom-attribution-and-alternatives',
      'triage',
      'Urgently evaluate other causes before attributing symptoms',
      values.attribution === 'uncertain' ? 'Another cause remains plausible.' : 'Symptom attribution has not been assessed.',
      'The European guideline stresses that these symptoms are non-specific and require clinical/anamnestic assessment of causality. Be especially cautious when the biochemical hyponatraemia is mild. This guide does not convert uncertain attribution into a hypertonic-saline decision.',
      {tone: values.symptoms === 'severe' ? 'urgent' : 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  actions.push(action(
    values.symptoms === 'severe' ? 'accepted-severe-symptomatic-hyponatremia' : 'accepted-moderate-symptomatic-hyponatremia',
    'triage',
    values.symptoms === 'severe' ? 'Severe symptoms accepted as hyponatraemia-related' : 'Moderately severe symptoms accepted as hyponatraemia-related',
    values.correctionStatus === 'exceeded'
      ? 'Urgently reassess the symptom emergency and the correction-limit breach.'
      : 'Use a closely monitored emergency response while cause assessment proceeds.',
    values.correctionStatus === 'exceeded'
      ? 'The Society for Endocrinology guidance treats severe and moderately severe symptoms as urgent when the clinician accepts the causal link. A documented correction-limit breach changes the immediate treatment priority: the guard stage directs stopping active sodium-raising treatment and urgent expert review while the symptom emergency and alternative causes are assessed.'
      : 'The Society for Endocrinology guidance treats severe and moderately severe symptoms as urgent when the clinician accepts the causal link. Diagnostic work-up should proceed in parallel; the compact guide does not adjudicate causality or replace emergency assessment.',
    {tone: values.symptoms === 'severe' ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: societySource},
  ));

  if (values.sodium === 'mild') {
    actions.push(action(
      'mild-biochemical-symptom-discordance',
      'triage',
      'Recheck the causal link in this mild-sodium exception',
      'Mild sodium makes the causal link less certain.',
      'The European guideline says severe or moderately severe symptoms can occur at any biochemical degree, but cautions that attribution at a mild sodium value should be exceptional. Keep alternative emergency causes active even when the clinical team accepts the link.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }
}

function addInitialActions(actions, values) {
  // A clinician-entered correction breach takes priority over every action that
  // could raise sodium. The guard stage supplies the stop/escalate response.
  if (values.correctionStatus === 'exceeded') return;

  const symptomaticPath = hasAcceptedSymptomaticHyponatremia(values);
  const acuteLargeDrop = values.symptoms === 'none'
    && values.acuity === 'acuteLargeDrop'
    && hasVerifiedHyponatremia(values);
  const establishedAcuteLargeDrop = acuteLargeDrop && hasEstablishedHypotonicPattern(values);
  const eligibleForInitialPath = symptomaticPath || establishedAcuteLargeDrop;

  if (eligibleForInitialPath && values.treatmentResponse === 'unknown') {
    actions.push(action(
      'confirm-treatment-phase-before-sodium-raising-action',
      'initial',
      'Confirm treatment phase before a new sodium-raising action',
      'Treatment phase is missing; do not infer a new or completed cycle.',
      'Choose the documented treatment phase before displaying a new source treatment action. An incomplete response field is not evidence that a first bolus has been given, that it is still running, or that symptoms improved.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (eligibleForInitialPath && values.treatmentResponse === 'inProgress') {
    actions.push(action(
      'review-active-emergency-cycle',
      'initial',
      'Review the active emergency cycle',
      'Review sodium and symptoms from the active cycle.',
      'The Society pathway checks sodium after 20 minutes while clinician-led intermittent-bolus treatment is under way. This state is for review of a documented active cycle, not a fresh treatment recommendation or a preselected additional bolus.',
      {tone: 'attention', resourceGroup: 'monitoring', source: societySource},
    ));
    return;
  }

  if (symptomaticPath && values.treatmentResponse === 'notStarted') {
    const severe = values.symptoms === 'severe';
    actions.push(action(
      severe ? 'severe-symptom-hypertonic-bolus' : 'moderate-symptom-hypertonic-bolus',
      'initial',
      severe ? 'Start the severe-symptom monitored response' : 'Start the moderately-severe-symptom monitored response',
      '3% saline 150 mL IV over 20 min · monitored setting.',
      'The Society for Endocrinology 2022 guidance uses intermittent 150 mL 3% hypertonic-saline boluses for accepted severe or moderately severe symptomatic hyponatraemia: check sodium after 20 minutes while the next bolus is begun, and repeat up to two further times or until a 5 mmol/L rise is achieved. This is a guideline reminder, not an order: local concentration, bag volume, access, monitoring capacity and clinical authority must be confirmed.',
      {tone: severe ? 'urgent' : 'attention', resourceGroup: 'hypertonic-saline', source: societySource},
    ));
    return;
  }

  if (acuteLargeDrop && !hasEstablishedHypotonicPattern(values) && values.treatmentResponse === 'notStarted') {
    actions.push(action(
      'complete-tonicity-before-acute-large-drop-decision',
      'initial',
      'Confirm the hypotonic context before the acute-drop branch',
      'Confirm tonicity before using this acute-drop branch.',
      'The European acute-without-severe-symptoms recommendation is for acute hypotonic hyponatraemia. Confirm glucose, osmolality and the sampling/comparison context before treating the reported fall as this pathway’s indication.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (establishedAcuteLargeDrop && values.treatmentResponse === 'notStarted') {
    actions.push(action(
      'acute-large-drop-single-bolus-review',
      'initial',
      'Escalate the documented acute >10 mmol/L fall for source-guided review',
      'The European guideline suggests one 150 mL 3% bolus over 20 min, then sodium after 4 h.',
      'This applies to acute hypotonic hyponatraemia without severe or moderately severe symptoms when a >10 mmol/L fall is documented. It is not an automatic prescription: verify the comparison method, hypotonic context, timing and local monitored-care process before treatment.',
      {tone: 'attention', resourceGroup: 'hypertonic-saline'},
    ));
  }
}

function addReassessmentActions(actions, values) {
  const symptomaticPath = hasAcceptedSymptomaticHyponatremia(values);
  if (values.correctionStatus === 'exceeded') return;

  if (!symptomaticPath) {
    if (!['unknown', 'notStarted'].includes(values.treatmentResponse)) {
      actions.push(action(
        'resolve-treatment-response-context',
        'reassess',
        'Resolve the treatment-response timeline',
        'A post-treatment response was entered without an accepted symptomatic pathway.',
        'Document the original indication, sodium measurements, symptoms and treatment separately. This compact state cannot infer that a 5 mmol/L rise was intended, achieved, or clinically beneficial outside a verified source pathway.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return;
  }

  if (values.treatmentResponse === 'inProgress') {
    actions.push(action(
      'continue-documented-first-hour-reassessment',
      'reassess',
      'Continue first-hour sodium and symptom reassessment',
      'The 5 mmol/L response has not yet been documented.',
      'Check serum sodium after 20 minutes while following the clinician-led active cycle and reassess the symptom trajectory. Do not pre-select “improved” or a correction status before serial findings are available.',
      {tone: 'attention', resourceGroup: 'monitoring', source: societySource},
    ));
  } else if (values.treatmentResponse === 'fiveRiseImproved') {
    if (values.correctionStatus !== 'withinCeiling') {
      actions.push(action(
        'stop-hypertonic-and-reconcile-correction',
        'reassess',
        'Stop hypertonic treatment; reconcile correction',
        'A documented response does not establish a safe correction trajectory.',
        'After a documented 5 mmol/L rise with symptom improvement, the Society 2022 figure advises stopping hypertonic saline. When the dated total correction is missing or unclear, urgently reconcile serial sodium, timing, interventions and urine output before exposing a local isotonic-fluid transition; do not treat the line-open instruction as an open-loop 0.9% saline recommendation.',
        {tone: 'urgent', resourceGroup: 'monitoring', source: societySource},
      ));
      return;
    }
    actions.push(action(
      'stop-hypertonic-after-documented-improvement',
      'reassess',
      'Stop hypertonic saline after documented response',
      'After a 5 mmol/L rise with symptom improvement, move to cause-specific treatment.',
      'The Society 2022 figure advises stopping hypertonic saline, keeping the IV line open with the minimum feasible 0.9% saline, then starting diagnosis-specific treatment. This is not a standing isotonic-fluid order; the source instruction must be applied to the current volume and haemodynamic context.',
      {resourceGroup: 'isotonic-fluid', source: societySource},
    ));
  } else if (values.treatmentResponse === 'fiveRiseNoImprove') {
    if (values.correctionStatus !== 'withinCeiling') {
      actions.push(action(
        'urgently-reconcile-response-and-correction',
        'reassess',
        'Urgently reconcile no response with the incomplete correction record',
        'Do not surface a continued hypertonic-saline action until the correction record is reviewed.',
        'A documented lack of symptom improvement after a 5 mmol/L rise requires urgent reassessment, but an unknown or untimed sodium trajectory can conceal excessive correction. Recheck the serial sodium record, timing, interventions and urine output with senior review before applying a source continued-treatment branch.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      return;
    }
    actions.push(action(
      'urgent-no-improvement-after-five-rise',
      'reassess',
      'Escalate no improvement after the documented 5 mmol/L rise',
      'Reassess symptoms, sodium trajectory and alternative causes urgently.',
      'The Society 2022 guidance advises an additional hypertonic-saline bolus to achieve a further 1 mmol/L rise when clinical status does not improve after the 5 mmol/L first-hour response. This engine does not calculate, stage or place that treatment; use urgent senior/endocrine or critical-care review and the local monitored protocol.',
      {tone: 'urgent', resourceGroup: 'hypertonic-saline', source: societySource},
    ));
  }
}

function addWorkupActions(actions, values) {
  if (!hasVerifiedHyponatremia(values)) {
    if (values.hypotonicPattern !== 'unknown') actions.push(action(
      'reconcile-mechanism-with-sodium', 'workup',
      'Reconcile the mechanism with the sodium result',
      'A selected urine pattern does not establish current hyponatraemia.',
      'Confirm the sodium and time-linked presentation context before applying this hypotonic-hyponatraemia mechanism. If sodium has already corrected, review the earlier result and active treatment rather than restarting a sodium-raising fluid branch.',
      {tone: 'attention', resourceGroup: 'workup'}));
    return;
  }
  switch (values.hypotonicPattern) {
    case 'unknown':
      actions.push(action(
        'confirm-tonicity-and-paired-urine-studies',
        'workup',
        'Confirm tonicity and obtain paired urine studies',
        'Glucose, osmolality, urine osmolality and urine sodium are not yet classified.',
        'Exclude hyperglycaemic and other non-hypotonic hyponatraemia. For hypotonic hyponatraemia, the European algorithm starts with spot urine osmolality, then urine sodium from a urine sample obtained with a blood sample; laboratory values need contemporaneous collection to be interpretable.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    case 'nonHypotonicPossible':
      actions.push(action(
        'route-nonhypotonic-explanation',
        'workup',
        'Resolve the non-hypotonic explanation',
        'Do not call this a confirmed hypotonic-hyponatraemia mechanism.',
        'Measure glucose and serum osmolality, then evaluate other effective osmoles or pseudohyponatraemia as appropriate. A non-hypotonic state needs its own cause-specific management and cannot be assigned the European hypotonic algorithm by this guide.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'hypotonicPendingUrine':
      actions.push(action(
        'obtain-contemporaneous-urine-osmolality-and-sodium',
        'workup',
        'Use the source urine sequence for hypotonic hyponatraemia',
        'Interpret urine osmolality first, then urine sodium from paired blood/urine sampling.',
        'The European guideline uses urine osmolality ≤100 mOsm/kg to support relative excess water intake. If it is >100 mOsm/kg, interpret urine sodium next; collect blood and urine contemporaneously and do not rely on volume examination alone.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'waterExcess':
      actions.push(action(
        'review-water-excess-or-low-solute-context',
        'workup',
        'Review relative excess-water / low-solute context',
        'Urine osmolality ≤100 mOsm/kg supports this mechanism in the source algorithm.',
        'The European guideline accepts relative excess water intake as the likely mechanism at this urine-osmolality threshold. Review intake, solute intake, acute context and serial sodium; this engine does not create an automatic fluid-restriction or solute prescription.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'lowEffectiveVolume':
      if (suppressSodiumRaisingResourceLink(values)) {
        actions.push(action(
          'review-low-effective-volume-with-correction-risk',
          'workup',
          'Reconcile low-volume findings with correction risk',
          'Do not surface a local isotonic-fluid link before this is reconciled.',
          'Urine sodium ≤30 mmol/L with urine osmolality >100 mOsm/kg still supports low effective arterial volume as a diagnostic possibility. A documented correction-limit breach, or a post-treatment response without a dated correction total, needs urgent clinician review of haemodynamics, current fluids, urine output and serial sodium. The engine intentionally withholds a sodium-raising fluid product link in this state; haemodynamic resuscitation remains a clinician-led decision under the applicable local protocol.',
          {tone: values.correctionStatus === 'exceeded' ? 'urgent' : 'attention', resourceGroup: 'workup'},
        ));
        break;
      }
      actions.push(action(
        'assess-low-effective-arterial-volume',
        'workup',
        'Assess low effective arterial volume before choosing fluid treatment',
        'Urine sodium ≤30 mmol/L with urine osmolality >100 mOsm/kg supports this possibility.',
        'The European guideline suggests accepting low effective arterial volume at this pattern. If contracted circulating volume is clinically established, it recommends 0.9% saline or a balanced crystalloid at 0.5–1.0 mL/kg/h; haemodynamic resuscitation can override correction risk during instability. This guide does not select a product, rate, volume or order, and volume restoration can trigger brisk auto-correction.',
        {resourceGroup: 'isotonic-fluid'},
      ));
      break;
    case 'highUrineSodiumOrConfounded':
      actions.push(action(
        'exclude-siad-mimics-and-confounders',
        'workup',
        'Assess extracellular-fluid status, diuretics and SIAD mimics',
        'Urine sodium >30 mmol/L or renal/diuretic confounding is not a standalone SIAD diagnosis.',
        'The European guideline calls for assessment of extracellular-fluid status and diuretic use, with consideration of adrenal, thyroid, pituitary and renal causes before assigning SIAD. Kidney disease and diuretics can make urine measures less reliable; do not use this selection to auto-prescribe fluid restriction, urea, salt or a vaptan.',
        {resourceGroup: 'workup'},
      ));
      break;
  }

  if (values.treatmentResponse === 'fiveRiseNoImprove' && hasAcceptedSymptomaticHyponatremia(values)) {
    actions.push(action(
      'seek-alternative-cause-after-no-response',
      'workup',
      'Investigate other causes of persistent symptoms',
      'No improvement after a documented sodium response is not proof that hyponatraemia was the cause.',
      'The European guideline recommends additional diagnostic exploration for other causes when symptoms do not improve after a sodium rise. Continue emergency assessment in parallel; this guide does not name or exclude a diagnosis.',
      {tone: 'urgent', resourceGroup: 'workup'},
    ));
  }
}

function addCorrectionGuardActions(actions, values) {
  if (values.sodium === 'notLow' && values.treatmentResponse === 'notStarted' && values.correctionStatus === 'unknown') return;
  if (values.acuity === 'unknown') {
    actions.push(action(
      'unknown-duration-use-chronic-correction-safeguards',
      'guard',
      'Use chronic correction safeguards while duration is unknown',
      'Unknown duration is not evidence of acute hyponatraemia.',
      'The European guideline considers unclassifiable hyponatraemia chronic unless clinical or historical evidence supports acute onset. This increases the importance of avoiding overly rapid correction and documenting the baseline/time window.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  actions.push(action(
    'maintain-correction-ceiling',
    'guard',
    'ODS guard: correction ceilings are not targets',
    '10 mmol/L first 24 h and 8 mmol/L later are limits, not safety clearance; higher risk needs a lower individualized ceiling.',
    'The European guideline uses 10 mmol/L in the first 24 hours and 8 mmol/L in later 24-hour periods as limits, not targets or a declaration of safety. A 2024 review summarizing the US/Irish expert panel identifies sodium ≤105 mmol/L, alcohol use disorder, hypokalaemia, malnutrition and advanced liver disease as higher-risk contexts, with an 8 mmol/L/24-hour limit discussed for that group. This guide does not determine whether those factors are present, calculate an individual ceiling, or prescribe a target; account for all sodium-raising inputs, potassium correction and spontaneous water diuresis with senior review and the applicable local protocol.',
    {tone: 'attention', resourceGroup: 'monitoring', source: odsRiskSource},
  ));

  switch (values.correctionStatus) {
    case 'unknown':
      actions.push(action(
        'calculate-dated-total-correction',
        'guard',
        'Calculate the dated total sodium change before declaring trajectory',
        'No overcorrection is inferred from a missing serial value.',
        'Use a documented presentation baseline, the relevant 24-hour window and repeat values from the same measurement method where possible. Missing timing or a zero parsed result cannot establish that the correction is within limit.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'risingUnclear':
      actions.push(action(
        'resolve-rising-sodium-timing',
        'guard',
        'Repeat and time the sodium measurements before estimating risk',
        'A rising trend without a dated total cannot be called within limit.',
        'Clarify the initial value, sampling times, interventions and urine output. After volume restoration, a sudden urine output >100 mL/hour can signal a rapid rise; the European advice is to check sodium every 2 hours until stable in that situation.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'withinCeiling':
      actions.push(action(
        'within-ceiling-is-not-a-safety-endpoint',
        'guard',
        'Continue monitoring; “within ceiling so far” is not a safety endpoint',
        'Keep the running total and next measurement visible.',
        'The correction limits remain active until sodium is stable under stable treatment. Do not infer that an entered within-ceiling result excludes later auto-correction, a new water diuresis, or osmotic-demyelination risk.',
        {resourceGroup: 'monitoring'},
      ));
      break;
    case 'exceeded':
      actions.push(action(
        'manage-documented-overcorrection',
        'guard',
        'Act on the documented correction-limit breach now',
        'Stop ongoing active sodium-raising treatment and obtain urgent expert guidance.',
        'This is a clinician-entered breach of the European 10 mmol/L first-24-hour or 8 mmol/L later-24-hour limit, or an individualized lower ceiling. The European guideline recommends discontinuing active treatment and discussing electrolyte-free water and IV desmopressin with an expert under strict monitoring. This engine does not auto-select or place a relowering regimen.',
        {tone: 'urgent', resourceGroup: 'monitoring', source: europeanSource},
      ));
      break;
  }

  if (values.correctionStatus !== 'exceeded'
    && hasAcceptedSymptomaticHyponatremia(values)
    && values.treatmentResponse === 'fiveRiseImproved'
    && values.correctionStatus === 'withinCeiling') {
    actions.push(action(
      'monitor-after-documented-response',
      'guard',
      'Monitor after the documented initial response',
      'Check sodium at 6 h, 12 h and daily until stable under stable treatment.',
      'This is the Society 2022 follow-up figure after a 5 mmol/L rise with clinical improvement. Use a more frequent local plan for active treatment, new symptoms, diuresis or other clinical concern.',
      {resourceGroup: 'monitoring', source: societySource},
    ));
  } else if (values.correctionStatus !== 'exceeded'
    && hasAcceptedSymptomaticHyponatremia(values)
    && values.treatmentResponse === 'fiveRiseNoImprove'
    && values.correctionStatus === 'withinCeiling') {
    actions.push(action(
      'monitor-continued-emergency-treatment',
      'guard',
      'Use a higher-frequency monitored plan during continued emergency treatment',
      'The exact schedule belongs to the active local emergency protocol.',
      'The European guideline suggests checking sodium every 4 hours while a 3% hypertonic-saline infusion continues. The Society 2022 response pathway uses further intermittent-bolus review; do not convert either statement into an automated monitoring order or assume a response absent a measured result.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.correctionStatus === 'withinCeiling'
    && !hasUrgentSymptomClass(values) && ['moderate', 'profound'].includes(values.sodium)) {
    actions.push(action(
      'monitor-moderate-or-profound-without-symptom-emergency',
      'guard',
      'Monitor moderate or profound hyponatraemia under stable treatment',
      'The European guideline suggests sodium every 6 h until stable under stable treatment.',
      'This is a monitoring recommendation for chronic hyponatraemia without severe or moderately severe symptoms. It does not validate the diagnosis, create treatment, or make an asymptomatic result “safe.”',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(item => item.stage === stage);
  const symptomaticPath = hasAcceptedSymptomaticHyponatremia(values);
  const acuteLargeDrop = values.symptoms === 'none'
    && values.acuity === 'acuteLargeDrop'
    && hasVerifiedHyponatremia(values);
  return {
    triage: hasStage('triage') ? undefined : 'Enter sodium and symptom findings before assigning urgency.',
    initial: hasStage('initial') ? undefined
      : values.correctionStatus === 'exceeded'
        ? 'A documented correction-limit breach supersedes all sodium-raising actions.'
        : (symptomaticPath || acuteLargeDrop) && values.treatmentResponse === 'fiveRiseImproved'
          ? 'A documented response is entered; do not restart an initial sodium-raising action.'
          : (symptomaticPath || acuteLargeDrop) && values.treatmentResponse === 'fiveRiseNoImprove'
            ? 'A documented non-response is entered; use the reassessment branch, not a new initial action.'
            : 'No source emergency-treatment indication has been established from these findings.',
    reassess: hasStage('reassess') ? undefined
      : values.correctionStatus === 'exceeded'
        ? 'Correction-limit management now takes priority over treatment-response branching.'
        : symptomaticPath && values.treatmentResponse === 'notStarted'
          ? 'After the clinician-led initial response, enter measured sodium and symptom findings.'
          : 'No treatment response is inferred; enter measured sodium and symptom response if treatment has begun.',
    workup: hasStage('workup') ? undefined : values.sodium === 'notLow' ? 'A non-low sodium does not enter the hyponatraemia mechanism sequence.' : 'Use the source tonicity and urine sequence before naming a mechanism.',
    guard: hasStage('guard') ? undefined : values.sodium === 'notLow' && values.treatmentResponse === 'notStarted' ? 'No sodium-raising treatment is indicated by this result.' : 'Document serial sodium, timing and all sodium-raising inputs before declaring trajectory.',
  };
}

export function evaluate(input = {}) {
  const values = valuesFor(input);
  const actions = [];
  addTriageActions(actions, values);
  addInitialActions(actions, values);
  addReassessmentActions(actions, values);
  addWorkupActions(actions, values);
  addCorrectionGuardActions(actions, values);
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'hyponatremia',
  title: 'Hyponatremia',
  reviewedAt: '2026-09-15',
  reviewLabel: 'Upgraded · source update check pending',
  sourceUpdatePending: true,
  scope: 'Adult hyponatraemia: symptom-led emergency response and correction safeguards.',
  reviewLimitations: [
    'This is a compact, source-linked adult decision aid, not a local protocol, prescription, sodium calculator, diagnosis engine, order set, or clinical-authority substitute.',
    'It follows the Society for Endocrinology 2022 emergency figure for accepted severe or moderately severe symptomatic hyponatraemia. The 2014 European guideline differs in its moderate-symptom detail; the response branch keeps that difference visible rather than silently combining a continuous-infusion regimen with the 2022 bolus figure.',
    'Symptoms must be clinically attributed. Mild biochemical hyponatraemia with major symptoms is an exceptional causal claim in the European guideline, so the engine retains alternative-cause review and never decides attribution itself.',
    'The 10 mmol/L first-24-hour and 8 mmol/L later-24-hour values are correction limits, not targets or a declaration of safety. Missing serial values never trigger an inferred “no overcorrection” conclusion.',
    'A 2026 ESE–ERA hyponatraemia update is listed publicly, but final publication/recommendation text was not verified in this review. Re-review this config against that publication and local governance before calling the 2014/2022 sources current local policy.',
    'No HIS connection, patient data, order staging, order submission, product-equivalence decision, or local formulary claim is contained in this data layer.',
  ],
  sources: [
    societySource,
    europeanSource,
    {label: 'Official ERBP English field version of the European guideline (2014)', url: EUROPEAN_FIELD_VERSION},
    {label: 'Society for Endocrinology live guidance index (2022 document listed when reviewed)', url: SOCIETY_GUIDANCE_INDEX},
    {label: 'ERA live guidance index (2026 ESE–ERA hyponatraemia update listed; final text not verified)', url: ESE_ERA_2026_STATUS},
    odsRiskSource,
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Symptoms and attribution set emergency urgency; sodium alone never proves safety.',
    recognition: [
      'The European biochemical bands are mild 130 to <135, moderate 125 to <130 and profound <125 mmol/L; they do not by themselves determine an emergency response.',
      'Severe symptoms include vomiting, cardio-respiratory distress, deep somnolence, seizures and coma. Moderately severe symptoms include nausea without vomiting, confusion and headache.',
      'Symptoms are non-specific. Confirm the clinical causal link and keep alternative causes active, especially with mild biochemical hyponatraemia.',
      'If duration is not established, use chronic correction safeguards unless clinical/history evidence supports acute onset.',
    ],
    redFlags: [
      'Accepted severe or moderately severe symptoms, rapid neurologic deterioration, seizure, coma, cardio-respiratory distress, or unsafe assessment context.',
      'A documented sodium rise >10 mmol/L in the first 24 h or >8 mmol/L in a later 24 h, or a higher-ODS-risk context such as sodium ≤105, alcohol use disorder, hypokalaemia, malnutrition or advanced liver disease.',
      'Rapid urine output after restoring volume, falling sodium despite treatment, or persistent symptoms after a documented sodium response.',
    ],
    steps: [
      {
        role: 'Classify urgency',
        text: 'Verify sodium, classify symptoms, and decide whether their causal relation to hyponatraemia is clinically accepted. Do not use a biochemical band alone as an emergency label.',
        tools: ['workup'],
      },
      {
        role: 'Accepted severe / moderate symptoms',
        text: 'In a close-monitoring environment, the Society 2022 emergency figure uses 150 mL 3% hypertonic saline over 20 minutes; check sodium after 20 minutes while the next bolus is begun, repeated up to two more times or until a 5 mmol/L rise.',
        dosingNote: 'Guideline reminder only; confirm local product, protocol and authority.',
        tools: ['hypertonic-saline', 'monitoring'],
      },
      {
        role: 'After response',
        text: 'After a documented 5 mmol/L rise with symptom improvement, stop hypertonic saline, use minimum feasible 0.9% saline to keep the line open, and begin cause-specific treatment. If symptoms do not improve, urgently reassess other causes and use the active emergency protocol.',
        tools: ['isotonic-fluid', 'monitoring'],
      },
      {
        role: 'Confirm mechanism',
        text: 'Exclude non-hypotonic causes. In hypotonic hyponatraemia, interpret paired urine osmolality first and urine sodium second; account for volume status, diuretics, renal disease and adrenal/pituitary/thyroid causes before assigning SIAD.',
        tools: ['workup'],
      },
      {
        role: 'Guard correction',
        text: 'Treat 10 mmol/L in the first 24 hours and 8 mmol/L in each later 24 hours as limits, not targets. Higher ODS-risk contexts need a lower individualized ceiling. Calculate a dated running total and respond to documented overcorrection with expert-guided relowering rather than an auto-generated regimen.',
        tools: ['monitoring'],
      },
    ],
    monitoring: [
      'During the Society emergency bolus sequence, check serum sodium after 20 minutes and reassess symptoms; do not infer the response if no serial result is entered.',
      'After a documented 5 mmol/L rise with symptom improvement, the Society figure says sodium at 6 hours, 12 hours and daily until stable under stable treatment.',
      'The European guideline suggests sodium every 6 hours for moderate/profound chronic hyponatraemia until stable; if active 3% infusion continues, it suggests every 4 hours.',
      'After volume restoration, sudden urine output >100 mL/hour can signal rapid auto-correction; the European guidance advises sodium every 2 hours until stable in that circumstance.',
    ],
    sources: [societySource, europeanSource, odsRiskSource],
  },
};

export default config;
