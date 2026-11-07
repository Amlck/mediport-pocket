// Compact, source-reviewed decision support for adult hypernatraemia.
// It emits bounded review actions only; the integrating layer owns rendering,
// local resources, authority, and all clinical-system behavior.

export const KJIM_HYPERNATREMIA_SOURCE = 'https://doi.org/10.3904/kjim.2022.346';
export const KJIM_HYPERNATREMIA_PDF = 'https://www.kjim.org/upload/kjim-2022-346.pdf';
export const NHSAAA_HYPERNATREMIA_SOURCE = 'https://aaamedicines.org.uk/guidelines/electrolyte-disturbances/management-of-hypernatraemia/';
export const SOCIETY_CDI_SOURCE = 'https://www.endocrinology.org/media/scplexuf/guidelines-for-the-inpatient-management-of-cranial-diabetes-insipidus.pdf';
export const SOCIETY_CDI_INDEX = 'https://www.endocrinology.org/clinical-practice/clinical-guidance/arginine-vasopressin-deficiency-diabetes-insipidus/diabetes-insipidus-arginine-vasopressin-deficiency-information/';
export const EVIDENCE_GAP_SOURCE = 'https://pubmed.ncbi.nlm.nih.gov/41084129/';
export const ACUTE_SODIUM_GAIN_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8878611/';

const clinicalReviewSource = {
  label: 'Yun, Baek & Kim — adult hypernatraemia clinical perspectives (2023)',
  url: KJIM_HYPERNATREMIA_SOURCE,
};
const currentHospitalSource = {
  label: 'NHS Ayrshire & Arran hypernatraemia guidance — reviewed Jan 2026, updated May 2026',
  url: NHSAAA_HYPERNATREMIA_SOURCE,
};
const cdiSource = {
  label: 'Society for Endocrinology inpatient cranial DI guidance (2018; established CDI only)',
  url: SOCIETY_CDI_SOURCE,
};
const evidenceGapSource = {
  label: 'Wichmann et al. adult hospital hypernatraemia scoping review (2025)',
  url: EVIDENCE_GAP_SOURCE,
};
const acuteSodiumGainSource = {
  label: 'Goshima et al. acute sodium-overload systematic review (2022)',
  url: ACUTE_SODIUM_GAIN_SOURCE,
};

const fields = [
  {
    key: 'sodium',
    label: 'Sodium band · mmol/L',
    help: 'Use a current credible serum sodium result. The adult clinical review defines hypernatraemia as above 145 mmol/L and lists 146–150, 151–155 and above 155 mmol/L bands. This guide combines the middle bands; a result at or below 145 mmol/L does not activate a hypernatraemia fluid branch.',
    options: [
      ['unknown', 'Unknown / not confirmed'],
      ['notHigh', '≤145 / not high'],
      ['elevated', '>145 to 155'],
      ['above155', '>155'],
    ],
  },
  {
    key: 'neurologic',
    label: 'Urgent neurologic feature?',
    help: 'Present means seizure, coma, marked confusion, reduced consciousness, focal deficit, or a clearly acute neurologic deterioration. It triggers emergency assessment but does not prove that sodium is its cause. Absent requires an active assessment.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['yes', 'Seizure, coma, or marked confusion'],
      ['no', 'Absent — assessed'],
    ],
  },
  {
    key: 'fluidState',
    label: 'Perfusion / fluid-risk state?',
    help: 'Choose shock only for documented hypotension or poor perfusion. “Depleted, perfused” requires review of congestion and renal fluid tolerance. “No depletion” also requires that no major fluid-risk concern was reviewed. The high-risk option includes fluid overload, decompensated heart failure, advanced or changing renal dysfunction, oliguria, or dialysis.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['shock', 'Shock / hypotension'],
      ['depletedPerfused', 'Depleted, perfused / risk reviewed'],
      ['noDeficitReviewed', 'No depletion / risk reviewed'],
      ['overloadOrRenalRisk', 'Overload / renal-HF-dialysis risk'],
    ],
  },
  {
    key: 'duration',
    label: 'Duration of high sodium?',
    help: 'Acute means a documented onset within 48 hours. Chronic means more than 48 hours. Unknown is handled with the chronic/unknown correction safeguard; it is not evidence of acute onset.',
    options: [
      ['unknown', 'Unknown — use chronic guard'],
      ['acute', '≤48 h documented'],
      ['chronic', '>48 h documented'],
    ],
  },
  {
    key: 'waterRoute',
    label: 'Water route available?',
    help: 'Oral/NG usable means the patient can safely receive and retain enteral water. IV needed means enteral water is not currently usable but IV access and fluid tolerance have been reviewed. Unknown does not select a route.',
    options: [
      ['unknown', 'Unknown / not established'],
      ['enteral', 'Oral / NG route usable'],
      ['iv', 'IV route needed'],
    ],
  },
  {
    key: 'cause',
    label: 'Cause / urine pattern?',
    help: 'Use only a reviewed pattern. Dilute polyuria can raise concern for DI but does not establish central DI or a desmopressin indication. Known CDI means an established diagnosis and existing specialist plan. Hypertonic sodium gain is distinct from water-loss hypernatraemia.',
    options: [
      ['unknown', 'Unknown / no paired review'],
      ['waterLoss', 'Water access / extrarenal loss'],
      ['osmoticLoss', 'Osmotic / renal solute loss'],
      ['dilutePolyuria', 'Dilute polyuria; DI unconfirmed'],
      ['knownCdi', 'Known CDI / DDAVP plan'],
      ['sodiumGain', 'Hypertonic sodium gain'],
    ],
  },
  {
    key: 'correctionState',
    label: 'Correction state?',
    help: 'Not started means no sodium-lowering water or DDAVP treatment is currently being given for this episode. Active requires a reviewed route, rate, timed sodium total and response. The fast-fall option is clinician-entered when sodium is falling faster than the agreed rate or 24-hour ceiling; missing serial values never establish that finding.',
    options: [
      ['unknown', 'Unknown / current fluids unclear'],
      ['notStarted', 'Not started'],
      ['activeWithinPlan', 'Active; rate / total reviewed'],
      ['tooFast', 'Na falling faster / ceiling exceeded'],
    ],
  },
];

const stages = [
  {id: 'assess', title: 'Confirm & triage'},
  {id: 'volume', title: 'Restore perfusion first'},
  {id: 'guard', title: 'Set correction safeguards'},
  {id: 'replace', title: 'Replace water and treat cause'},
  {id: 'reassess', title: 'Recheck active correction'},
];

const validValues = Object.fromEntries(fields.map(field => [
  field.key,
  new Set(field.options.map(([value]) => value)),
]));
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function normalize(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, {
  source = clinicalReviewSource,
  tone,
  resourceGroup,
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

function addIndependentSafetyActions(actions, values) {
  if (!['unknown', 'notHigh'].includes(values.sodium)) return;

  if (values.fluidState === 'shock') {
    actions.push(action(
      'escalate-shock-without-waiting-for-sodium-confirmation',
      'volume',
      'Escalate shock without waiting for sodium',
      'Do not defer immediate clinician-led resuscitation for sodium confirmation.',
      'Shock or hypotension is an independent emergency. The adult hypernatraemia review uses 0.9% saline or balanced crystalloid for shock resuscitation regardless of sodium, but this non-hypernatraemia branch deliberately exposes no local fluid-product link or water-replacement plan. Use the applicable emergency resuscitation process while confirming sodium, glucose, tonicity and the cause of shock.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }

  if (values.correctionState === 'tooFast') {
    actions.push(action(
      'urgent-fast-sodium-fall-needs-current-trend-review',
      'guard',
      'Urgently review the fast sodium fall',
      'A clinician-entered rapid fall needs current timed sodium review even if the latest value is not high.',
      'This finding is not inferred from missing data. Reconcile the time-stamped sodium sequence, current fluids, desmopressin exposure if applicable, urine output, neurologic state and perfusion with urgent senior support. Do not use an unknown or not-high latest sodium to declare correction safe, and do not infer a sodium-specific reversal or replacement prescription from this compact branch.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }
}

function result(values, actions) {
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

function addAssessmentActions(actions, values) {
  if (values.sodium === 'unknown') {
    actions.push(action(
      'confirm-sodium-and-tonicity-context',
      'assess',
      'Confirm sodium, glucose and tonicity context',
      'Unknown sodium does not choose a water or DDAVP plan.',
      'Confirm a current serum sodium and review glucose, serum osmolality, timing and trend. The adult review starts with excluding pseudohypernatraemia and checking glucose-corrected sodium when relevant; it then uses volume status, urine sodium, urine volume/osmolality, intake/output and the clinical history to direct cause review. This engine does not calculate a water deficit or infer treatment from an unconfirmed result.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    if (values.neurologic === 'yes') {
      actions.push(action(
        'urgent-neurologic-feature-with-unconfirmed-sodium',
        'assess',
        'Escalate the neurologic emergency',
        'Do not attribute a neurologic emergency to an unconfirmed sodium result.',
        'Seizure, coma, marked confusion or reduced consciousness needs immediate clinician-led emergency assessment and parallel differential diagnosis. Obtain the sodium context promptly, but do not use this guide to select water, saline or desmopressin before the result and perfusion context are established.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else if (values.neurologic === 'unknown') {
      actions.push(action(
        'assess-neurologic-urgency-with-unconfirmed-sodium',
        'assess',
        'Assess neurologic urgency',
        'Unknown is not an absent neurologic emergency screen.',
        'Assess consciousness, confusion, seizure activity and focal neurologic findings while confirming sodium and its measurement context. Hypernatraemia symptoms are more prominent with a larger or faster rise, but an incomplete neurologic entry cannot establish urgency or cause.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return false;
  }

  if (values.sodium === 'notHigh') {
    actions.push(action(
      'not-a-hypernatremia-treatment-band',
      'assess',
      'No high-sodium treatment band is entered',
      'A sodium at or below 145 mmol/L does not activate this guide.',
      'The reviewed adult clinical review defines hypernatraemia as serum sodium above 145 mmol/L. Review the trend, measurement context and the current clinical problem rather than using a not-high sodium result to infer a water deficit, treatment response or clinical safety.',
      {resourceGroup: 'workup'},
    ));
    if (values.neurologic === 'yes') {
      actions.push(action(
        'urgent-neurologic-feature-not-explained-by-not-high-sodium',
        'assess',
        'Escalate the neurologic emergency',
        'A not-high sodium result does not explain away the entered emergency.',
        'Treat the acute neurologic presentation through the appropriate emergency assessment while reviewing alternate metabolic, structural, toxicologic, infectious and other causes. This hypernatraemia guide intentionally exposes no water, saline or desmopressin action from this combination.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else if (values.neurologic === 'unknown') {
      actions.push(action(
        'assess-neurologic-context-with-not-high-sodium',
        'assess',
        'Assess neurologic context outside this guide',
        'A not-high sodium result is not a negative neurologic assessment.',
        'Establish the current neurologic examination and alternate cause as indicated. No hypernatraemia correction action is generated from a sodium at or below 145 mmol/L.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return false;
  }

  actions.push(action(
    'verify-trend-glucose-and-cause-context',
    'assess',
    'Verify trend, glucose, tonicity and losses',
    'Confirm the sodium trajectory before choosing a correction plan.',
    'The adult review directs clinicians to confirm measurement context, glucose, extracellular-fluid state, urine sodium, urine volume/osmolality, intake/output, access to water and renal or extrarenal losses. These data distinguish water loss, sodium gain, osmotic diuresis and a concentrating defect. A formula-derived deficit excludes ongoing losses and is deliberately not calculated here.',
    {resourceGroup: 'workup'},
  ));

  if (values.neurologic === 'unknown') {
    actions.push(action(
      'assess-neurologic-urgency',
      'assess',
      'Assess neurologic urgency',
      'Unknown is not an absent emergency screen.',
      'Assess consciousness, confusion, seizure activity, focal findings and the speed of sodium change. The adult review lists neurologic manifestations from lethargy and confusion through seizure and coma, especially with a large or rapid rise; do not presume the symptom is caused by sodium alone.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.neurologic === 'yes') {
    actions.push(action(
      'urgent-neurologic-hypernatremia-review',
      'assess',
      'Escalate neurologic deterioration',
      'Use monitored urgent assessment while sodium context is reconciled.',
      'A seizure, coma, marked confusion or reduced consciousness requires emergency assessment, serial sodium and parallel investigation of alternative causes. The source links neurologic manifestations to large or rapid sodium rises but does not make a sodium value alone the diagnosis of the acute presentation.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }

  if (values.sodium === 'above155') {
    actions.push(action(
      'prompt-review-for-sodium-above-155',
      'assess',
      'Sodium above 155 mmol/L needs prompt review',
      'Severity, trajectory, perfusion and symptoms determine the monitored plan.',
      'The reviewed clinical perspectives classify sodium above 155 mmol/L as severe, while cited adult mortality data emphasize concentrations above 160 mmol/L. This number increases concern but does not select a fluid, correction rate or monitoring setting without the duration, neurologic, volume and renal-fluid-risk context.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }
  return true;
}

function addCorrectionSafeguards(actions, values) {
  if (values.duration === 'unknown' || values.duration === 'chronic') {
    actions.push(action(
      'conservative-chronic-unknown-correction-guard',
      'guard',
      'Use ≤0.5 mmol/L/h and ≤10 mmol/L/24 h',
      'For chronic or unknown duration, these are conservative guards, not targets.',
      'The current NHS Ayrshire & Arran page says serum sodium should not fall more rapidly than about 10 mmol/L/day. Society for Endocrinology guidance for established cranial DI uses no more than 0.5 mmol/L/h and 10 mmol/L/24 h for no or mild symptoms. The 2023 adult clinical review describes a traditional <0.5 mmol/L/h and 12 mmol/L/day approach based chiefly on paediatric data and notes uncertain adult evidence. This prototype keeps the stricter 10 mmol/L/day guard until an individualized, time-stamped plan is documented; it never calls the limit a safe target.',
      {tone: 'attention', source: currentHospitalSource, resourceGroup: 'monitoring'},
    ));
  } else {
    actions.push(action(
      'acute-onset-needs-cause-specific-rate-review',
      'guard',
      'Acute onset needs a cause-specific monitored rate',
      'Documented acute water loss does not unlock a generic rapid-correction plan.',
      'The adult clinical review describes 1–2 mmol/L/h for the first 6–8 hours only in acute symptomatic hypernatraemia due to sodium loading. It is not a general water-loss regimen. The Society for Endocrinology cranial-DI guidance has a different, diagnosis-specific acute recommendation. Use urgent senior/endocrine or critical-care review to reconcile cause, symptoms, exposure, timing, monitoring capacity and the current sodium trajectory before setting a faster rate.',
      {tone: values.neurologic === 'yes' ? 'urgent' : 'attention', source: acuteSodiumGainSource, resourceGroup: 'monitoring'},
    ));
  }

  switch (values.correctionState) {
    case 'unknown':
      actions.push(action(
        'reconcile-current-fluids-and-timed-sodium-total',
        'guard',
        'Reconcile current fluids before a new plan',
        'Unknown treatment status is not a not-started state.',
        'Establish all current IV and enteral fluids, desmopressin exposure, urine output, sodium values and sampling times before adding a new water route. Missing serial results never establish that correction is within a ceiling or that prior therapy has ended.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return false;
    case 'activeWithinPlan':
      actions.push(action(
        'continue-reviewed-correction-cycle-without-duplication',
        'guard',
        'Review the active correction cycle',
        'Do not duplicate an initial water or DDAVP action.',
        'Keep the current route, rate, dated sodium total, urine output, glucose when relevant, fluid tolerance and response visible. Repeated sodium measurements are necessary to adjust treatment safely; an entered active state does not establish that the next response or cause has been resolved.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return false;
    case 'tooFast':
      actions.push(action(
        'urgent-rapid-correction-reconciliation',
        'guard',
        'Urgently reconcile rapid correction',
        'A documented fast fall or ceiling breach supersedes new water or DDAVP actions.',
        'This is a clinician-entered finding, never inferred from absent serial values. Recheck the time-stamped sodium sequence, all fluid and desmopressin exposure, urine output, neurologic state and perfusion with urgent senior support before adding replacement. The 2023 adult review says that therapeutic re-raising of sodium is not recommended when the target rate is inadvertently exceeded. This engine does not select a reversal, re-induction or replacement prescription.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      return false;
    default:
      return true;
  }
}

function addVolumeActions(actions, values) {
  switch (values.fluidState) {
    case 'unknown':
      actions.push(action(
        'classify-perfusion-and-fluid-risk-before-water',
        'volume',
        'Classify perfusion and fluid risk before water',
        'Do not infer dehydration, fluid tolerance or renal reserve.',
        'Assess blood pressure, perfusion, extracellular-fluid status, pulmonary congestion, urine output, renal trajectory and dialysis context before selecting free water or hypotonic saline. Hypernatraemia can accompany severe water deficit, but an empty fluid entry is not evidence of volume depletion or safe fluid tolerance.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return false;
    case 'shock':
      if (values.correctionState === 'tooFast') {
        actions.push(action(
          'urgent-shock-and-rapid-correction-review',
          'volume',
          'Escalate shock and rapid correction together',
          'Do not expose a routine fluid product while both emergencies are unresolved.',
          'Shock still requires immediate clinician-led resuscitation, but a documented excessive sodium fall changes the fluid record that must be reconciled. Use urgent monitored senior/critical-care review of perfusion, current fluids, sodium timing, urine output and fluid tolerance; this compact engine deliberately withholds a new isotonic, hypotonic or DDAVP product link in this contradictory state.',
          {tone: 'urgent', resourceGroup: 'monitoring'},
        ));
        return false;
      }
      actions.push(action(
        'restore-perfusion-before-free-water',
        'volume',
        'Restore perfusion before free water',
        'Use 0.9% saline or balanced crystalloid until volume is restored.',
        'For shock or hypotension, the adult review says to use 0.9% normal saline or balanced crystalloid for resuscitation regardless of serum sodium until volume restoration. This is a perfusion action, not a free-water prescription: choose volume, rate, reassessment and overload safeguards from the current hemodynamics and local resuscitation process. Do not add a parallel initial free-water, 0.45% saline or DDAVP action until the fluid state is re-entered after review.',
        {tone: 'urgent', resourceGroup: 'isotonic-fluid'},
      ));
      return false;
    case 'overloadOrRenalRisk':
      actions.push(action(
        'fluid-and-renal-risk-needs-specialist-plan',
        'volume',
        'Use a fluid and renal-directed plan',
        'Overload, changing renal function or dialysis withholds a generic IV-water plan.',
        'The adult review describes D5W plus diuretics for hypervolaemic hypernatraemia, but fluid tolerance, kidney function, dialysis status, sodium source and response must be individualized. Do not turn that statement into a default D5W, hypotonic-saline, diuretic or dialysis prescription. Reconcile congestion, urine output, renal trajectory, current replacement therapy and the sodium trend with the responsible team.',
        {tone: values.neurologic === 'yes' || values.sodium === 'above155' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
      return false;
    default:
      return true;
  }
}

function addCauseActions(actions, values, canStartWaterPlan) {
  switch (values.cause) {
    case 'unknown':
      actions.push(action(
        'obtain-paired-urine-and-cause-review',
        'replace',
        'Obtain paired urine and cause review',
        'Do not guess water loss, solute diuresis or DI from sodium alone.',
        'The adult review uses history, extracellular-fluid assessment, urine sodium, urine volume/osmolality, glucose and input/output to separate inadequate water access, extrarenal loss, osmotic diuresis, concentrating defects and sodium gain. Obtain urine studies close to the serum sample when clinically feasible and review ongoing losses; a local free-water-deficit formula is intentionally not used as an automatic prescription.',
        {tone: 'attention', resourceGroup: 'urine'},
      ));
      break;
    case 'waterLoss':
      actions.push(action(
        'address-water-access-and-extrarenal-loss',
        'replace',
        'Address water access and ongoing loss',
        'Review diarrhea, fever, insensible loss, access and the measured loss trajectory.',
        'The adult review directs treatment of ongoing causes in parallel with water replacement, including gastrointestinal losses, fever and impaired access to water. Quantify observed intake/output and revise the plan only after the sodium response and continuing losses are measured; this selection does not set a water-deficit total or rate.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'osmoticLoss':
      actions.push(action(
        'address-osmotic-or-renal-solute-loss',
        'replace',
        'Address osmotic or renal solute loss',
        'Review glucose/glycosuria, medicines, obstruction and renal trajectory.',
        'The reviewed adult approach includes controlling hyperglycaemia and glycosuria, reconciling diuretics or osmotic loads, relieving obstruction where applicable, and correcting contributors such as hypokalaemia or hypercalcaemia. This guide does not select an insulin, diuretic, electrolyte or water prescription from a urine-pattern label.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'dilutePolyuria':
      actions.push(action(
        'dilute-polyuria-needs-di-differential',
        'replace',
        'Use a DI differential; do not infer DDAVP',
        'Dilute polyuria prompts diagnosis review, not empiric desmopressin.',
        'In hypernatraemia, a urine osmolality below 300 mOsm/kg with polyuria suggests diabetes insipidus, but the adult review requires further differentiation of central versus nephrogenic DI and other concentrating defects. The current NHS page similarly treats urine osmolality below plasma osmolality as a prompt to look for DI. A urine osmolality below 300 alone is not treated as diagnostic of DI.',
        {tone: 'attention', resourceGroup: 'urine'},
      ));
      break;
    case 'knownCdi':
      if (canStartWaterPlan && values.waterRoute !== 'unknown') {
        actions.push(action(
          'known-cdi-reconcile-established-ddavp-plan',
          'replace',
          'Use the established CDI/DDAVP plan',
          'For known CDI with excessive dilute urine, review IV/IM DDAVP 1–2 micrograms with close monitoring.',
          'Society for Endocrinology guidance applies to established cranial DI, not initial diagnosis. In a decompensated known-CDI admission, fluid replacement takes priority and IV or IM DDAVP 1–2 micrograms may be used with close clinical and biochemical observation; further doses are considered when high-volume dilute urine returns. Verify the actual diagnosis, last dose, route, water access, urine output, sodium trend and endocrine plan. This is a local-resource review link, not an automatic dose or repeat order.',
          {tone: 'attention', source: cdiSource, resourceGroup: 'desmopressin'},
        ));
      } else {
        actions.push(action(
          'known-cdi-needs-specialist-reconciliation',
          'replace',
          'Reconcile known CDI before DDAVP changes',
          'Current correction, route or fluid-risk context does not support a new DDAVP action.',
          'The Society guidance is limited to established cranial DI and emphasizes fluid replacement, sodium and urine-output monitoring, and endocrine-team involvement. Confirm the diagnosis, prescribed dose, last administration, current fluids, urine output, sodium timing and access to water before changing desmopressin. This engine intentionally withholds the local DDAVP product link until a new initial plan is documented with an eligible fluid state and usable route.',
          {tone: 'attention', source: cdiSource, resourceGroup: 'monitoring'},
        ));
      }
      break;
    case 'sodiumGain':
      actions.push(action(
        'hypertonic-sodium-gain-needs-specialist-control',
        'replace',
        'Escalate confirmed hypertonic sodium gain',
        'Do not use a general water-loss template for sodium loading.',
        'Rapid correction evidence is limited to rare, documented hyperacute sodium-loading cases. The reviewed systematic review included 18 case reports with treatment started within 12 hours and explicitly excluded hypernatraemia from unreplaced water losses, hyperglycaemic states and DI. Urgently reconcile the exposure, timing, neurologic state, volume status, renal support and monitoring setting with senior/critical-care input; this engine does not place a D5W, dialysis or rapid-correction prescription.',
        {tone: 'urgent', source: acuteSodiumGainSource, resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addWaterRouteActions(actions, values, canStartWaterPlan, waterPlanEligible) {
  if (!canStartWaterPlan || !waterPlanEligible || values.cause === 'sodiumGain') return;

  if (values.waterRoute === 'unknown') {
    actions.push(action(
      'confirm-enteral-or-iv-water-route',
      'replace',
      'Confirm an enteral or IV water route',
      'Do not infer a route or fixed free-water volume.',
      'Oral or nasogastric water can be used when clinically safe; the adult review also lists D5W and 0.45% saline among hypotonic IV options. Choose route only after confirming airway/GI function, access, perfusion, fluid risk, ongoing losses and the next sodium-monitoring point. This guide does not calculate a deficit or rate.',
      {tone: 'attention'},
    ));
    return;
  }

  if (values.waterRoute === 'enteral') {
    actions.push(action(
      'review-enteral-free-water-plan',
      'replace',
      'Use a reviewed oral / NG water plan',
      'Enteral water is usable; set volume and timing from serial response.',
      'The adult review includes oral hydration as a replacement route, and Society for Endocrinology CDI guidance suggests oral or nasogastric water as soon as clinically safe because it can buffer overly rapid sodium changes. Confirm swallowing/GI safety, losses, glucose when relevant, fluid tolerance and the next sodium check. No fixed oral or NG volume is encoded.',
      {source: values.cause === 'knownCdi' ? cdiSource : clinicalReviewSource},
    ));
    return;
  }

  if (values.fluidState === 'depletedPerfused') {
    actions.push(action(
      'review-half-saline-after-perfusion-assessment',
      'replace',
      'Review 0.45% saline after perfusion assessment',
      '0.45% saline can provide water when depletion is reviewed and perfusion is adequate.',
      'The adult review lists 0.45% saline among hypotonic replacement options and says solution choice depends on history, blood pressure and volume status. Estimate its free-water contribution and use serial sodium, observed losses, glucose, renal trajectory and congestion checks to set a clinician-owned plan. The local 500 mL package identity does not establish a bag count, rate or prescription.',
      {resourceGroup: 'half-saline'},
    ));
    return;
  }

  actions.push(action(
    'review-d5w-free-water-plan',
    'replace',
    'Review D5W as an IV free-water option',
    'D5W provides electrolyte-free water after perfusion and fluid-risk review.',
    'The adult review lists 5% dextrose among hypotonic replacement options. Select volume and rate from the time-stamped sodium plan, observed deficit and ongoing losses, glucose monitoring, renal-fluid-risk review and serial response; no fixed bag, infusion rate or calculator output is supplied. A local D5W identity is a resource reference, not validated prescribing guidance.',
    {resourceGroup: 'free-water-iv'},
  ));
}

function addReassessmentActions(actions, values) {
  if (values.correctionState === 'tooFast') return;

  if (values.correctionState === 'activeWithinPlan') {
    actions.push(action(
      'measure-active-correction-response',
      'reassess',
      'Recheck sodium, I/O and response',
      values.cause === 'knownCdi'
        ? 'Known CDI: Na q4h in resuscitation; no less often than q12h until stable; closer by acuity.'
        : 'NHS severe pathway: Na review no later than q8h; sooner if unstable.',
      'The adult review requires repeated sodium measurements to adjust treatment. The current NHS page calls for reassessment and recording of blood results and clinical condition at least every 8 hours in its severe-case pathway; Society CDI guidance uses sodium every 4 hours during fluid resuscitation and no less often than every 12 hours until stable. Select the interval from the active acuity, route, neurologic state, urine output and local monitored-care plan.',
      {source: currentHospitalSource, resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.correctionState === 'unknown') {
    actions.push(action(
      'document-timed-baseline-before-response-claim',
      'reassess',
      'Document a timed baseline before claiming response',
      'Missing serial results cannot establish a correction response.',
      'Record the credible presentation sodium, sampling times, current fluids, DDAVP exposure if applicable, urine output and clinical state. Set the next sodium and input/output review through the responsible team after the current treatment record has been reconciled.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'set-serial-sodium-io-and-glucose-recheck',
    'reassess',
    'Set the next sodium, I/O and glucose recheck',
    values.cause === 'knownCdi'
      ? 'Known CDI: Na q4h in resuscitation; no less often than q12h until stable; closer by acuity.'
      : 'NHS severe pathway: Na review no later than q8h; sooner if unstable.',
    'The adult review says treatment must be adjusted with repeated sodium measurements. Current NHS guidance requests reassessment of blood results and clinical condition at least every 8 hours in severe cases; use more frequent monitoring for resuscitation, neurologic deterioration, high-volume urine loss, known CDI, changing renal function or a faster-than-expected sodium fall. Include urine output, fluid balance, glucose with D5W and the next time-stamped sodium result.',
    {source: currentHospitalSource, resourceGroup: 'monitoring'},
  ));
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(item => item.stage === stage);
  if (values.sodium === 'unknown') {
    return {
      volume: hasStage('volume') ? undefined : 'No sodium-specific replacement plan follows an unconfirmed sodium result.',
      guard: hasStage('guard') ? undefined : 'Confirm sodium and treatment context before assigning a correction safeguard.',
      replace: 'No water, saline or DDAVP branch is generated from an unknown sodium.',
      reassess: values.correctionState === 'tooFast'
        ? 'Urgent timed sodium and treatment review is the current reassessment action.'
        : 'Set a response plan after a credible sodium and clinical context are entered.',
    };
  }
  if (values.sodium === 'notHigh') {
    return {
      volume: hasStage('volume') ? undefined : 'No sodium-specific replacement plan follows a not-high sodium result.',
      guard: hasStage('guard') ? undefined : 'No hypernatraemia correction guard is generated.',
      replace: 'No water-replacement or CDI branch follows a not-high sodium result.',
      reassess: values.correctionState === 'tooFast'
        ? 'Urgent timed sodium and treatment review is the current reassessment action.'
        : 'Continue the current clinical review outside this guide.',
    };
  }

  return {
    assess: hasStage('assess') ? undefined : 'Enter sodium and neurologic findings before assigning urgency.',
    volume: hasStage('volume') ? undefined
      : values.correctionState === 'tooFast'
        ? 'Rapid-correction reconciliation supersedes a new fluid action.'
        : values.fluidState === 'depletedPerfused'
          ? 'Perfusion and fluid risk are reviewed; choose water only from serial response.'
          : 'No resuscitation branch is needed with the reviewed fluid state.',
    guard: hasStage('guard') ? undefined : 'Document duration and current correction state before assigning a rate safeguard.',
    replace: hasStage('replace') ? undefined
      : values.correctionState === 'tooFast'
        ? 'Rapid correction supersedes a new water or DDAVP action.'
        : values.correctionState !== 'notStarted'
          ? 'Current correction must be reconciled before adding an initial water or DDAVP action.'
          : values.fluidState === 'shock'
            ? 'Restore perfusion before selecting free water.'
            : values.fluidState === 'overloadOrRenalRisk'
              ? 'Fluid and renal risk need a specialist-directed plan before a generic IV-water action.'
              : 'Complete route and cause review before adding replacement.',
    reassess: hasStage('reassess') ? undefined
      : values.correctionState === 'tooFast'
        ? 'Urgent reconciliation of the rapid fall is the current reassessment action.'
        : 'Set the next measured sodium and clinical review after the active plan is reconciled.',
  };
}

export function evaluate(input = {}) {
  const values = normalize(input);
  const actions = [];
  addIndependentSafetyActions(actions, values);
  if (!addAssessmentActions(actions, values)) return result(values, actions);

  const canStartWaterPlan = addCorrectionSafeguards(actions, values);
  const waterPlanEligible = addVolumeActions(actions, values);
  addCauseActions(actions, values, canStartWaterPlan && waterPlanEligible);
  addWaterRouteActions(actions, values, canStartWaterPlan, waterPlanEligible);
  addReassessmentActions(actions, values);
  return result(values, actions);
}

export const config = {
  id: 'hypernatremia',
  title: 'Hypernatremia',
  reviewedAt: '2026-09-15',
  reviewLabel: 'Evidence-limited · adult review',
  scope: 'Adult hypernatraemia: triage, perfusion, correction safeguards, and cause review.',
  reviewLimitations: [
    'This is compact adult decision support, not a local protocol, prescription, fluid calculator, infusion plan, order set, or patient-specific treatment plan.',
    'The core adult source is a 2023 clinical review, not a national adult hypernatraemia guideline. A 2025 scoping review found only two randomized trials among 200 studies and concluded that current evidence cannot establish the safety or efficacy of specific therapies. The prototype therefore presents conservative safeguards and clinician-owned reassessment rather than a universal dose or rate.',
    'The current NHS Ayrshire & Arran page supports a general 10 mmol/L/day caution; Society for Endocrinology guidance is authoritative but limited to established cranial DI. Neither is represented as a universal local policy. The source differences are disclosed rather than silently harmonized.',
    'The engine never calculates free-water deficit, body-water fraction, maintenance need, ongoing loss, fluid rate, bag count, DDAVP dose, dialysis prescription or target sodium. It never treats a missing result as normal, a missing correction total as within ceiling, or a suspected DI pattern as central DI.',
    'Acute symptomatic sodium-loading hypernatraemia, severe/changing renal dysfunction, dialysis, fluid overload, shock, pregnancy, pediatric care, HHS/DKA, toxic ingestion and complex DI require condition-specific senior/endocrine/nephrology/critical-care management.',
    'A product listing establishes only product identity. It does not establish current availability, orderability, patient suitability, dose, route, monitoring requirements or authorization to prescribe.',
  ],
  sources: [
    clinicalReviewSource,
    currentHospitalSource,
    cdiSource,
    evidenceGapSource,
    acuteSodiumGainSource,
    {label: 'Society for Endocrinology current DI information page', url: SOCIETY_CDI_INDEX},
    {label: 'KJIM adult hypernatraemia review PDF', url: KJIM_HYPERNATREMIA_PDF},
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm sodium and urgency, restore perfusion first, then use a measured water and cause plan.',
    recognition: [
      'Hypernatraemia is serum sodium above 145 mmol/L. Review the current value, timing, trend, glucose, tonicity, neurologic state, water access, intake/output, volume and fluid-risk context before choosing treatment.',
      'For chronic or unknown duration, this prototype uses a conservative guard of no faster than 0.5 mmol/L/hour and no more than 10 mmol/L/24 hours. These are limits for a clinician-owned plan, not a declaration of safety or a correction target.',
      'Urgent neurologic deterioration, shock/hypotension, sodium above 155 mmol/L, sodium gain, severe/changing renal dysfunction, dialysis, overload and high-volume dilute urine require more than a simple water-deficit estimate.',
    ],
    redFlags: [
      'Seizure, coma, marked confusion, reduced consciousness or focal neurologic deterioration.',
      'Shock/hypotension, sodium above 155 mmol/L, rapidly changing sodium, documented fast sodium fall or a breached correction ceiling.',
      'Known CDI with missed/uncertain DDAVP, high-volume dilute urine, poor water access, fluid overload, decompensated heart failure, changing renal function or dialysis.',
    ],
    steps: [
      {
        role: 'Confirm & triage',
        text: 'Confirm a credible sodium result, glucose/tonicity context, trend and neurologic status. Urgent neurologic features need emergency assessment and should not be attributed to sodium by default.',
        tools: ['workup', 'monitoring'],
      },
      {
        role: 'Restore perfusion first',
        text: 'For shock or hypotension, use a monitored 0.9% saline or balanced-crystalloid resuscitation pathway until volume is restored, then re-enter the fluid state before choosing free water.',
        tools: ['isotonic-fluid', 'monitoring'],
      },
      {
        role: 'Set correction safeguards',
        text: 'For chronic or unknown duration, keep the rate at or below 0.5 mmol/L/hour and the 24-hour fall at or below 10 mmol/L. A documented fast fall or breached ceiling requires urgent reconciliation, not another default fluid action.',
        tools: ['monitoring'],
      },
      {
        role: 'Replace water and stop loss',
        text: 'After perfusion and fluid risk are reviewed, use a clinician-set oral/NG, D5W or 0.45% saline plan based on route, volume state, losses and serial sodium. Do not convert a package volume or deficit formula into an automatic rate.',
        tools: ['free-water-iv', 'half-saline'],
      },
      {
        role: 'Separate DI and reassess',
        text: 'Dilute polyuria requires a DI differential. Only established CDI with a reviewed plan can surface DDAVP resource review; repeat sodium, urine output, fluid balance and glucose when relevant before changing therapy.',
        tools: ['urine', 'desmopressin', 'monitoring'],
      },
    ],
    monitoring: [
      'Time-stamp baseline and repeat sodium values, every fluid and DDAVP exposure, urine output, fluid balance, neurologic status, perfusion and glucose with D5W. Missing serial values do not establish a safe correction trajectory.',
      'The current NHS page asks for reassessment and recording at least every 8 hours in its severe-case pathway. Society for Endocrinology CDI guidance uses sodium every 4 hours during fluid resuscitation and no less often than every 12 hours until stable. Select a more frequent local plan when acuity or loss requires it.',
      'Review renal trajectory, congestion, dialysis status and measured ongoing losses before changing water, saline or DDAVP exposure. Do not auto-repeat a prior product or declare the episode resolved from one result.',
    ],
    sources: [clinicalReviewSource, currentHospitalSource, cdiSource, evidenceGapSource, acuteSodiumGainSource],
  },
};

export default config;
