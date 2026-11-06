// Compact, source-reviewed data and decision engine for adult inpatient hypoglycaemia.
// UI rendering and local-catalog linking intentionally live elsewhere.

export const JBDS_SOURCE = 'https://abcd.care/sites/default/files/site_uploads/JBDS_Guidelines_Current/JBDS_01_Hypo_Guideline_with_QR_code_January_2023.pdf';
export const JBDS_LISTING = 'https://abcd.care/resource/current/jbds-01-hospital-management-hypoglycaemia-adults-diabetes-mellitus';
const SOURCE_LABEL = 'JBDS 01 · revised January 2023';

const fields = [
  {
    key: 'glucose',
    label: 'Glucose',
    options: [
      ['below4', 'Below 4.0 mmol/L (≈72 mg/dL)'],
      ['fourToSix', '4.0–6.0 mmol/L (≈72–108 mg/dL)'],
      ['aboveSix', 'Above 6.0 mmol/L (≈108 mg/dL)'],
      ['unknown', 'Unknown / not yet checked'],
    ],
  },
  {
    key: 'rescuePhase',
    label: 'Rescue phase / current response?',
    options: [
      ['unknown', 'Not established'],
      ['initial', 'Initial rescue not yet given'],
      ['awaiting-recheck', 'Rescue given · recheck due'],
      ['persistent-below4', 'Still below 4.0 mmol/L after recheck'],
      ['recovered-current-above4', 'Current glucose >4.0 mmol/L and recovered'],
      ['refractory-3cycles', 'Still <4.0 after 3 cycles / 30–45 min'],
    ],
    help: 'Glucose remains the current measured result. JBDS recovery wording requires glucose above 4.0 mmol/L and clinical recovery; do not select recovery while the current result is below 4.0 mmol/L or repeat an initial rescue while a recheck is still due.',
  },
  {
    key: 'safety',
    label: 'Consciousness / swallow safety',
    options: [
      ['safe', 'Alert · safe swallow'],
      ['impairedButSwallow', 'Confused · can swallow'],
      ['unsafe', 'Unconscious / seizure / unsafe'],
      ['unknown', 'Not established'],
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition route',
    options: [
      ['oral', 'Oral permitted'],
      ['npo', 'Nil by mouth / fasting'],
      ['enteral', 'Enteral feed route in use and usable'],
      ['tpn', 'TPN / oral not permitted'],
      ['unknown', 'NPO / feed status unknown'],
    ],
  },
  {
    key: 'ivAccess',
    label: 'IV access now?',
    options: [
      ['yes', 'Yes'],
      ['no', 'No'],
      ['unknown', 'Unknown / not established'],
    ],
  },
  {
    key: 'insulinInfusion',
    label: 'Insulin infusion running?',
    options: [
      ['yes', 'Yes'],
      ['no', 'No'],
      ['unknown', 'Unknown'],
    ],
  },
  {
    key: 'prolongedRisk',
    label: 'Long-acting insulin / sulfonylurea?',
    options: [
      ['yes', 'Yes / likely'],
      ['no', 'No — reviewed'],
      ['unknown', 'Unknown'],
    ],
  },
];

const stages = [
  {id: 'assess', title: 'Confirm & make safe'},
  {id: 'stop', title: 'Insulin infusion'},
  {id: 'rescue', title: 'Choose a safe rescue route'},
  {id: 'recheck', title: 'Recheck & escalate'},
  {id: 'prevent', title: 'Recover & prevent recurrence'},
];
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function normalized(input = {}) {
  return Object.fromEntries(fields.map(field => {
    const valid = new Set(field.options.map(([value]) => value));
    return [field.key, valid.has(input[field.key]) ? input[field.key] : 'unknown'];
  }));
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(action => action.stage === stage);
  if (values.glucose === 'unknown') {
    return {
      stop: 'Confirm current glucose before infusion action.',
      rescue: 'No rescue regimen is inferred from missing glucose; do not delay emergency bedside treatment while obtaining a result.',
      recheck: 'Set the route-specific recheck after a measured glucose and rescue state are established.',
      prevent: 'Do not begin recovery prevention while current glucose is unverified.',
    };
  }
  if (values.glucose !== 'below4') {
    if (values.rescuePhase === 'recovered-current-above4') {
      const notes = {
        stop: 'Review any insulin infusion requirement and dose before restart.',
        rescue: 'Recovery is recorded; do not start or repeat a rescue from this phase.',
        recheck: 'Continue glucose monitoring to the active treatment and clinical plan.',
      };
      if (!hasStage('prevent')) {
        notes.prevent = values.safety === 'unknown'
          ? 'Confirm consciousness and swallow safety before recovery actions.'
          : 'Clinical recovery remains unresolved while safety is impaired.';
      }
      return notes;
    }
    if (values.rescuePhase === 'unknown') {
      return {
        stop: 'Review current diabetes treatment in the clinical context.',
        rescue: 'Current glucose does not trigger the below-4.0 mmol/L rescue regimen.',
        recheck: 'Clarify whether this is a post-rescue result before repeating any rescue treatment.',
        prevent: 'Set a prevention plan if treatment becomes necessary.',
      };
    }
    return {
      stop: 'Confirm glucose and route before infusion action.',
      rescue: 'Choose rescue only if the below-4.0 pathway applies.',
      recheck: 'Set timing after a rescue route is selected.',
      prevent: 'Set a recovery plan if treatment becomes necessary.',
    };
  }
  const notes = {};
  if (!hasStage('stop')) notes.stop = values.insulinInfusion === 'no' ? 'No insulin infusion reported.' : 'Confirm insulin infusion status.';
  if (!hasStage('rescue')) {
    if (values.rescuePhase === 'awaiting-recheck') notes.rescue = 'A rescue is already recorded; do not repeat it before the scheduled recheck.';
    else if (values.rescuePhase === 'unknown') notes.rescue = 'Confirm the rescue phase before assuming an initial or repeat route.';
    else if (values.rescuePhase === 'recovered-current-above4') notes.rescue = 'Current low glucose conflicts with recovery; urgently re-establish the rescue phase.';
    else notes.rescue = values.safety === 'unknown' ? 'Confirm safety before choosing a rescue route.' : 'Confirm the nutrition route before choosing rescue.';
  }
  if (!hasStage('recheck')) {
    notes.recheck = values.rescuePhase === 'unknown'
      ? 'Set the route-specific recheck after the rescue phase is established.'
      : 'Set recheck timing once a rescue route is selected.';
  }
  if (!hasStage('prevent')) {
    notes.prevent = values.rescuePhase === 'awaiting-recheck'
      ? 'Do not begin recovery prevention until the scheduled recheck confirms recovery.'
      : values.rescuePhase === 'unknown'
        ? 'Do not begin recovery prevention until the rescue phase and current result are established.'
        : 'Set recovery and recurrence plans after treatment.';
  }
  return notes;
}

function result(values, actions) {
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

function action(id, stage, title, summary, detail, {
  tone,
  resourceGroup,
  related,
  sourceUrl = JBDS_SOURCE,
  sourceLabel = SOURCE_LABEL,
} = {}) {
  return {id, stage, title, summary, detail, sourceUrl, sourceLabel, ...(tone ? {tone} : {}), ...(resourceGroup ? {resourceGroup} : {}), ...(related ? {related} : {})};
}

function addInfusionActions(actions, values) {
  if (values.insulinInfusion === 'yes') {
    actions.push(action(
      'stop-insulin-infusion',
      'stop',
      'Stop the active insulin infusion',
      'Stop now; restart only after review.',
      'JBDS directs that an insulin infusion in situ is stopped immediately. Restart only once the event is fully treated, after reviewing the indication and dose.',
      {tone: 'urgent'},
    ));
  } else if (values.insulinInfusion === 'unknown') {
    actions.push(action(
      'confirm-insulin-infusion',
      'stop',
      'Check for an active insulin infusion',
      'If running, stop it immediately.',
      'Do not assume an infusion is absent. The source instructs stopping an infusion in situ, then reviewing its requirement and dose before restart.',
      {tone: 'attention'},
    ));
  }
}

function addIVGlucoseRoute(actions) {
  actions.push(action(
    'iv-glucose',
    'rescue',
    'Use IV glucose',
    '20% 100 mL IV or 10% 200 mL IV over 15 min.',
    'Use an infusion pump when available, but do not delay the infusion while waiting for one. Confirm the local product and pump setting; use the smallest practical volume in renal or cardiac failure.',
    {tone: 'urgent', resourceGroup: 'iv-glucose'},
  ));
  actions.push(action(
    'iv-recheck',
    'recheck',
    'Recheck glucose in 10 min',
    'If still below 4.0 mmol/L, repeat IV rescue.',
    'The source specifies a 10-minute capillary check after parenteral treatment. A larger glucose bag must not be accidentally infused in full.',
    {resourceGroup: 'monitoring'},
  ));
}

function addInitialIMGlucagonRoute(actions) {
  actions.push(action(
    'im-glucagon',
    'rescue',
    'Use IM glucagon while obtaining IV access',
    '1 mg IM once; continue gaining IV access.',
    'JBDS uses IM glucagon when IV access is unavailable. It may take up to 15 minutes and can be less effective with sulfonylurea exposure, malnutrition/prolonged starvation, alcohol excess, or chronic liver disease.',
    {tone: 'urgent', resourceGroup: 'glucagon'},
  ));
  actions.push(action(
    'glucagon-recheck',
    'recheck',
    'Recheck glucose in 10 min',
    'If still below 4.0 mmol/L, obtain IV access.',
    'Algorithm C sends persistent hypoglycaemia back through the severe pathway while IV access is pursued. Supporting evidence cautions that repeated glucagon has poor response; this engine does not choose a repeat dose—use urgent medical review and local policy.',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

function addInitialParenteralRoute(actions, values) {
  if (values.ivAccess === 'yes') {
    addIVGlucoseRoute(actions);
  } else if (values.ivAccess === 'no') {
    addInitialIMGlucagonRoute(actions);
  } else {
    actions.push(action(
      'establish-iv-access',
      'rescue',
      'Establish the parenteral route now',
      'IV availability is unknown.',
      'For unsafe swallowing, seizure, unconsciousness or very aggressive behaviour, the source routes treatment to IV glucose when access is available and IM glucagon when it is not. Request immediate assistance while this is established.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }
}

function addEscalatedParenteralRoute(actions, values) {
  if (values.ivAccess === 'yes') {
    addIVGlucoseRoute(actions);
    return;
  }
  actions.push(action(
    'urgent-iv-access-after-persistent-hypoglycemia',
    'rescue',
    'Obtain IV access for persistent hypoglycaemia',
    'Do not automatically repeat IM glucagon.',
    'After a persistent or refractory low result, seek urgent medical help and establish IV access for the severe pathway. The source cautions that repeated IM glucagon has poor response; this guide does not select a repeat dose when prior route history is incomplete.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function addOralRoute(actions, kind = 'oral') {
  if (kind === 'gel') {
    actions.push(action(
      'glucose-gel',
      'rescue',
      'Use buccal glucose gel',
      '2 tubes of 40% glucose gel buccally.',
      'This is the JBDS route for a person who is confused, uncooperative or aggressive but is still able to swallow. If it is ineffective, the source moves to IM glucagon or IV glucose as appropriate.',
      {resourceGroup: 'oral-glucose'},
    ));
    actions.push(action(
      'gel-recheck',
      'recheck',
      'Recheck glucose in 10–15 min',
      'If still below 4.0 mmol/L, repeat; maximum 3 cycles.',
      'If glucose remains below 4.0 mmol/L after 30–45 minutes or 3 cycles, call for medical assistance and move to parenteral rescue.',
      {resourceGroup: 'monitoring'},
    ));
  } else {
    actions.push(action(
      'oral-glucose',
      'rescue',
      'Give rapid-acting oral carbohydrate',
      '15–20 g rapid carbohydrate.',
      'This is the source treatment for a conscious, orientated person who can swallow and is not fasting. Select a locally available product that supplies the stated carbohydrate amount.',
      {resourceGroup: 'oral-glucose'},
    ));
    actions.push(action(
      'oral-recheck',
      'recheck',
      'Recheck glucose in 10–15 min',
      'If still below 4.0 mmol/L, repeat; maximum 3 cycles.',
      'If glucose remains below 4.0 mmol/L after 30–45 minutes or 3 cycles, call for medical assistance and use parenteral rescue as appropriate.',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function addEnteralRecovery(actions) {
  actions.push(action(
    'restart-enteral-feed',
    'prevent',
    'Restore carbohydrate after recovery',
    'Restart feed; add a 20 g-carbohydrate bolus if needed.',
    'The source also lists 10% IV glucose at 100 mL/hour when clinically appropriate. Check the feed interruption, tube position and diabetes-treatment timing before the next dose.',
    {resourceGroup: 'monitoring'},
  ));
}

function addEnteralRoute(actions) {
  actions.push(action(
    'enteral-glucose',
    'rescue',
    'Use the enteral feeding route',
    '15–20 g via feed tube; flush 40–50 mL water.',
    'The JBDS enteral pathway includes glucose gel, juice, an appropriate feed product, or restarting feed as options. Do not use a TPN line for rescue treatment.',
    {resourceGroup: 'oral-glucose'},
  ));
  actions.push(action(
    'enteral-recheck',
    'recheck',
    'Recheck glucose in 10–15 min',
    'If still below 4.0 mmol/L, repeat; maximum 3 cycles.',
    'If glucose remains below 4.0 mmol/L after 30–45 minutes or 3 cycles, move to IV glucose and obtain urgent clinical support.',
    {resourceGroup: 'monitoring'},
  ));
}

function addRecoveryPlan(actions, values) {
  if (values.nutrition === 'npo') {
    actions.push(action(
      'npo-glucose-bridge',
      'prevent',
      'Bridge the NPO period after recovery',
      'After recovery: consider 10% glucose 100 mL/hour until review.',
      'This is the JBDS NPO pathway. The ongoing rate and volume need the patient’s clinical context and local policy; it is not an automatic standing order.',
      {resourceGroup: 'iv-glucose'},
    ));
  } else if (values.nutrition === 'enteral') {
    addEnteralRecovery(actions);
  } else if (values.nutrition === 'tpn') {
    actions.push(action(
      'tpn-review',
      'prevent',
      'Do not use the TPN line for rescue',
      'Use IV rescue; involve nutrition and diabetes teams.',
      'This selection means TPN with oral intake not permitted. JBDS states that TPN-associated hypoglycaemia is treated orally or intravenously as appropriate, not through the TPN line. If oral intake becomes permitted, select the oral-permitted route; otherwise review IV support, TPN interruption and diabetes-treatment timing.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.nutrition === 'oral') {
    actions.push(action(
      'long-acting-carbohydrate',
      'prevent',
      'Replace longer-acting carbohydrate after recovery',
      'Once >4.0 mmol/L and recovered: 20 g; 40 g after glucagon.',
      'Use a snack or a carbohydrate-containing meal that fits the person’s dietary requirements. Only give it when the person is recovered and can safely take it.',
      {resourceGroup: 'oral-glucose'},
    ));
  } else {
    actions.push(action(
      'confirm-recovery-nutrition',
      'prevent',
      'Confirm the post-rescue nutrition plan',
      'Set oral/NPO/feed plan before the next diabetes dose.',
      'The source uses different recovery plans for oral intake, NPO status, enteral feed and TPN. Set the plan from the actual nutrition route before the next diabetes treatment.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addPreventionActions(actions, values) {
  actions.push(action(
    'postepisode-glucose-monitoring',
    'prevent',
    'Continue post-episode glucose monitoring',
    'Continue regular capillary glucose monitoring for 24–48 h.',
    'JBDS includes this after successful treatment across Algorithms A–E. The actual frequency still depends on the active treatment, nutrition route, glucose trend and local policy.',
    {resourceGroup: 'monitoring'},
  ));

  actions.push(action(
    'review-cause-and-treatment',
    'prevent',
    'Review the active cause before the next diabetes dose',
    'Review the dose active at the event, nutrition and illness.',
    'Do not automatically omit the next insulin injection. JBDS instead advises reviewing the dose that was active at the time of the event and adjusting the regimen with the diabetes team when needed.',
  ));

  if (values.prolongedRisk === 'yes') {
    actions.push(action(
      'prolonged-recurrence-monitoring',
      'prevent',
      'Plan prolonged recurrence monitoring',
      'Risk may persist 24–36 h after the last dose.',
      'This source warning applies after sulfonylurea or long-acting insulin exposure, especially with renal impairment. It adds a prolonged-risk window to the generic post-episode monitoring action above; severe or recurrent events warrant medical or diabetes specialist review.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.prolongedRisk === 'unknown') {
    actions.push(action(
      'confirm-prolonged-risk',
      'prevent',
      'Confirm long-acting insulin or sulfonylurea exposure',
      'Check last insulin/sulfonylurea dose before reducing monitoring.',
      'Review the medication record, last doses, renal function and the episode timeline before deciding monitoring can be reduced.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addUrgentNutritionRouteResolution(actions) {
  actions.push(action(
    'urgent-nutrition-route-resolution',
    'rescue',
    'Confirm the safe rescue route now',
    'Below 4.0 mmol/L: do not delay urgent clinical response for nutrition status.',
    'Do not assume oral carbohydrate is permitted when fasting, feed or TPN status is unknown. Establish the route immediately; if it cannot be confirmed promptly, summon urgent clinical support and establish a parenteral route under local policy. This guide does not select oral or IV glucose from an unknown nutrition status.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function routeForLowGlucoseRescue(actions, values) {
  if (values.safety === 'unknown') {
    actions.push(action(
      'confirm-oral-safety',
      'assess',
      'Confirm consciousness and swallow safety',
      'Do not assume a safe oral route.',
      'The route depends on whether the person is alert and cooperative, confused but able to swallow, or has an unsafe oral route. If they are unconscious, having a seizure, very aggressive, or cannot safely swallow, request immediate assistance and use the parenteral pathway.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.safety === 'unsafe') {
    actions.push(action(
      'urgent-assistance',
      'assess',
      'Request immediate medical assistance',
      'Unsafe oral route: choose parenteral rescue.',
      'Perform ABCDE while treatment is being arranged. Do not use oral carbohydrate until recovery and swallow safety are established.',
      {tone: 'urgent'},
    ));
    addInitialParenteralRoute(actions, values);
    return;
  }

  if (values.nutrition === 'unknown') {
    addUrgentNutritionRouteResolution(actions);
    return;
  }

  if (values.nutrition === 'npo' || values.nutrition === 'tpn') {
    addInitialParenteralRoute(actions, values);
    return;
  }

  if (values.nutrition === 'enteral') {
    addEnteralRoute(actions);
    return;
  }

  if (values.safety === 'impairedButSwallow') {
    addOralRoute(actions, 'gel');
  } else {
    addOralRoute(actions);
  }
}

function addUnknownRescuePhase(actions) {
  actions.push(action(
    'confirm-rescue-phase',
    'assess',
    'Confirm whether rescue has started',
    'Current glucose remains below 4.0 mmol/L: urgent clinician review now.',
    'Record whether initial treatment has not started, a route-specific recheck is due, the result remains low after a recheck, or the three-cycle/30–45-minute escalation point has been reached. Do not repeat an initial rescue dose or give recovery carbohydrate from an unknown phase.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function addUnsafePhaseUrgency(actions) {
  actions.push(action(
    'urgent-assistance-during-unresolved-rescue-phase',
    'assess',
    'Request immediate medical assistance',
    'Unsafe consciousness or swallowing: continue ABCDE while rescue state is clarified.',
    'Do not attribute an unsafe state solely to hypoglycaemia, but do not delay emergency assessment while checking whether a rescue dose has been given or a recheck is due. Do not give oral carbohydrate until recovery and swallow safety are established.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function addAwaitingRecheck(actions) {
  actions.push(action(
    'complete-scheduled-glucose-recheck',
    'recheck',
    'Complete the scheduled capillary-glucose recheck',
    'Oral/buccal/enteral: 10–15 min; IV glucose or IM glucagon: 10 min.',
    'This phase means that a rescue has already been given. Do not issue or repeat an initial rescue before the time-linked recheck. If the current result remains below 4.0 mmol/L, record persistent hypoglycaemia; if it is above 4.0 mmol/L and the person has recovered, record recovery.',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

function addPersistentRescue(actions, values) {
  actions.push(action(
    'repeat-hypoglycemia-rescue-cycle',
    'rescue',
    'Repeat the appropriate rescue cycle',
    'Current glucose remains below 4.0 mmol/L after a recheck.',
    'Repeat the route-specific rescue and recheck, keeping a count of treatment cycles. JBDS limits initial-route treatment to three cycles; if glucose remains below 4.0 mmol/L after 30–45 minutes or three cycles, record the refractory phase and call for medical assistance.',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
  if (values.safety === 'unknown') {
    actions.push(action(
      'confirm-oral-safety',
      'assess',
      'Confirm consciousness and swallow safety',
      'Do not assume a safe oral route.',
      'The route depends on whether the person is alert and cooperative, confused but able to swallow, or has an unsafe oral route. If they are unconscious, having a seizure, very aggressive, or cannot safely swallow, request immediate assistance and use the parenteral pathway.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.safety === 'unsafe') {
    actions.push(action(
      'urgent-assistance',
      'assess',
      'Request immediate medical assistance',
      'Unsafe oral route: choose parenteral rescue.',
      'Perform ABCDE while treatment is being arranged. Do not use oral carbohydrate until recovery and swallow safety are established.',
      {tone: 'urgent'},
    ));
    addEscalatedParenteralRoute(actions, values);
  } else if (values.nutrition === 'unknown') {
    addUrgentNutritionRouteResolution(actions);
  } else if (values.nutrition === 'npo' || values.nutrition === 'tpn' || values.safety === 'impairedButSwallow') {
    addEscalatedParenteralRoute(actions, values);
  } else if (values.nutrition === 'enteral') {
    addEnteralRoute(actions);
  } else {
    addOralRoute(actions);
  }
}

function addRefractoryEscalation(actions, values) {
  actions.push(action(
    'urgent-refractory-hypoglycemia',
    'assess',
    'Call for medical assistance now',
    'Still below 4.0 mmol/L after 30–45 minutes or 3 treatment cycles.',
    'JBDS directs escalation at this point. Use the severe parenteral pathway while urgent medical help is obtained; the IV or IM action below remains subject to current access and local emergency policy.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
  addEscalatedParenteralRoute(actions, values);
}

function addSuccessfulRecovery(actions, values) {
  actions.push(action(
    'confirm-hypoglycemia-recovery',
    'assess',
    'Confirm successful hypoglycaemia recovery',
    'Current glucose is above 4.0 mmol/L and the person has recovered.',
    'JBDS recovery actions begin only after both conditions are met. This is not an instruction to treat a still-low current glucose as recovered.',
    {resourceGroup: 'monitoring'},
  ));
  addRecoveryPlan(actions, values);
  addPreventionActions(actions, values);
}

function addRecoveryIfSafe(actions, values) {
  if (values.safety === 'unsafe') {
    actions.push(action(
      'unsafe-state-blocks-hypoglycemia-recovery',
      'assess',
      'Unsafe state needs urgent assessment',
      'A glucose above 4.0 mmol/L alone does not establish recovery.',
      'Do not give recovery carbohydrate or reduce surveillance while consciousness or swallow safety is unsafe. Continue urgent ABCDE assessment and establish the non-hypoglycaemic cause of the unsafe state.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (values.safety === 'impairedButSwallow') {
    actions.push(action(
      'impaired-safety-blocks-hypoglycemia-recovery',
      'assess',
      'Confirm clinical recovery before prevention',
      'Confusion or impaired cooperation conflicts with a recovered phase entry.',
      'A glucose above 4.0 mmol/L does not by itself establish clinical recovery. Reassess consciousness, cooperation and swallow safety before giving recovery carbohydrate or reducing surveillance.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (values.safety === 'unknown') {
    actions.push(action(
      'confirm-recovery-safety',
      'assess',
      'Confirm recovery and swallow safety',
      'A glucose above 4.0 mmol/L alone does not establish recovery.',
      'Confirm consciousness, swallow safety and clinical recovery before giving recovery carbohydrate or moving to recurrence prevention.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  addSuccessfulRecovery(actions, values);
}

function addCurrentLowOverridesRecovery(actions) {
  actions.push(action(
    'current-low-overrides-recovery-phase',
    'assess',
    'Current result is not recovery',
    'Glucose is below 4.0 mmol/L despite a recovered phase entry.',
    'A current low glucose result takes precedence. Do not give recovery carbohydrate or reduce surveillance from this conflicting entry; urgently establish whether the next state is initial treatment, an overdue recheck, persistent hypoglycaemia, or refractory escalation.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function addUnsafeNonHypoAssessment(actions) {
  actions.push(action(
    'continue-urgent-abcde',
    'assess',
    'Continue urgent ABCDE assessment',
    'Unsafe state with no source hypo trigger.',
    'The JBDS source makes capillary glucose part of ABCDE for an acutely unwell person with diabetes. A result at or above 4.0 mmol/L does not explain away impaired consciousness, seizure or unsafe swallowing.',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];

  if (values.glucose === 'unknown') {
    actions.push(action(
      'verify-glucose',
      'assess',
      'Check capillary glucose and ABCDE',
      'Glucose is not established.',
      'Measure promptly when it is safe to do so. If a person is having a seizure or is otherwise unsafe and a measurement is difficult, JBDS says treatment must not be delayed while urgent assistance is obtained.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    if (values.safety === 'unsafe') {
      actions.push(action(
        'urgent-assistance-unverified',
        'assess',
        'Request immediate assistance',
        'Unsafe consciousness or swallowing.',
        'Do not attribute all impaired consciousness to hypoglycaemia, but do not delay emergency assessment while the capillary result is obtained.',
        {tone: 'urgent'},
      ));
    }
    return result(values, actions);
  }

  if (values.glucose === 'below4') {
    actions.push(action(
      'treat-confirmed-hypoglycemia',
      'assess',
      'Treat this as a hospital hypoglycaemia emergency',
      'Below 4.0 mmol/L: treat now alongside ABCDE.',
      'JBDS uses 4.0 mmol/L as the adult inpatient treatment threshold, with or without symptoms. Do not delay treatment to finish a checklist.',
      {tone: 'urgent'},
    ));
    addInfusionActions(actions, values);
    switch (values.rescuePhase) {
      case 'initial':
        routeForLowGlucoseRescue(actions, values);
        break;
      case 'awaiting-recheck':
        addAwaitingRecheck(actions);
        if (values.safety === 'unsafe') addUnsafePhaseUrgency(actions);
        break;
      case 'persistent-below4':
        addPersistentRescue(actions, values);
        break;
      case 'refractory-3cycles':
        addRefractoryEscalation(actions, values);
        break;
      case 'recovered-current-above4':
        addCurrentLowOverridesRecovery(actions);
        break;
      default:
        addUnknownRescuePhase(actions);
        if (values.safety === 'unsafe') addUnsafePhaseUrgency(actions);
        if (values.nutrition === 'unknown') addUrgentNutritionRouteResolution(actions);
    }
    return result(values, actions);
  }

  if (values.rescuePhase === 'recovered-current-above4') {
    addRecoveryIfSafe(actions, values);
    return result(values, actions);
  }

  if (values.glucose === 'aboveSix') {
    actions.push(action(
      'no-jbds-hypo-trigger',
      'assess',
      'This result does not trigger the JBDS hypo algorithm',
      'Above 6.0 mmol/L: no source rescue trigger.',
      'If symptoms are thought to be hypoglycaemia despite this result, JBDS allows a small carbohydrate snack only when oral intake is permitted and safe. Recheck if the clinical picture is discordant; impaired consciousness, seizure, or acute illness still needs an appropriate ABCDE assessment and differential diagnosis.',
      {resourceGroup: 'monitoring'},
    ));
    if (values.safety === 'unsafe') addUnsafeNonHypoAssessment(actions);
    return result(values, actions);
  }

  if (values.glucose === 'fourToSix') {
    actions.push(action(
      'looming-hypoglycemia',
      'assess',
      'Review for looming hypoglycaemia',
      '4.0–6.0 mmol/L: individualise prevention, not rescue.',
      'JBDS advises an individualised plan, especially for people on insulin or insulin secretagogues. Review trend, food/feeds and treatment timing. If symptoms occur at or above 4.0 mmol/L, a small carbohydrate snack is for symptom relief only when oral intake is permitted and safe; it is not an automatic NPO or parenteral rescue order.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    if (values.safety === 'unsafe') addUnsafeNonHypoAssessment(actions);
    return result(values, actions);
  }
}

export const config = {
  id: 'hypoglycemia',
  title: 'Hypoglycemia',
  reviewedAt: '2026-09-15',
  scope: 'Adult inpatient diabetes hypoglycaemia; JBDS 01 <4.0 mmol/L pathway.',
  reviewLimitations: [
    'Uses JBDS 01’s below-4.0 mmol/L threshold, 10–15-minute oral/enteral recheck and 10-minute parenteral recheck; it does not mix ADA 70/54 mg/dL thresholds or a 15-minute-only rule.',
    'Covers non-pregnant adults aged 16 years or older with diabetes in hospital, not pregnancy, paediatric-team care, or hypoglycaemia without diabetes.',
    'Local products, concentrations, pump settings, nutrition plans, prescription authority and order-set reconciliation remain local-policy work. The general-admission glucometer resource is not a hypoglycaemia set and does not replace the JBDS timing.',
    'The TPN option means oral intake is not permitted. Select “Oral permitted” if oral rescue is actually available; the engine otherwise asks for a parenteral route.',
    'The 4.0–6.0 mmol/L band is individualised prevention guidance, not an automatic rescue regimen.',
    'The rescue phase is an assessment state, not a medication-administration record, dose counter, timestamp, or authorization. Unknown phase, nutrition or safety keeps urgent clinician review explicit rather than assuming an initial or repeat dose.',
  ],
  sources: [
    {label: 'JBDS 01 Hospital Management of Hypoglycaemia in Adults with Diabetes Mellitus — revised January 2023', url: JBDS_SOURCE},
    {label: 'ABCD current resource listing for JBDS 01', url: JBDS_LISTING},
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'JBDS adult inpatient pathway: below 4.0 mmol/L is the treatment threshold. Choose a safe route, recheck to recovery, then prevent recurrence.',
    recognition: [
      'Treat any glucose below 4.0 mmol/L in this source population, with or without symptoms.',
      '4.0–6.0 mmol/L is “looming” hypoglycaemia: review risk and individualise; it is not the same rescue threshold.',
      'Check ABCDE and capillary glucose promptly; do not delay urgent treatment when a seizure or unsafe state prevents immediate measurement.',
    ],
    redFlags: [
      'Unconsciousness, seizure, very aggressive behaviour, unsafe swallow, or persistent altered consciousness.',
      'Glucose still below 4.0 mmol/L after 30–45 minutes or 3 rescue cycles.',
      'Severe or recurrent event, long-acting insulin or sulfonylurea exposure, renal impairment, interrupted nutrition, or prolonged fasting.',
    ],
    steps: [
      {role: 'Check', text: 'ABCDE; stop an active insulin infusion during confirmed hypoglycaemia.'},
      {role: 'Safe oral route', text: '15–20 g rapid carbohydrate; recheck in 10–15 min; no more than 3 cycles.', dosingNote: 'Below 4.0 mmol/L only.'},
      {role: 'Unsafe or NPO route', text: 'IV: 20% glucose 100 mL or 10% glucose 200 mL over 15 min. No IV: glucagon 1 mg IM while obtaining access.', dosingNote: 'Confirm local product, concentration and pump setting.', tools: ['iv-glucose', 'glucagon']},
      {role: 'Recover', text: 'When above 4.0 mmol/L and recovered: 20 g longer-acting carbohydrate; 40 g after glucagon. NPO requires a separate IV-glucose bridge plan.', tools: ['oral-glucose']},
      {role: 'Prevent recurrence', text: 'Review active treatment, meals/feeds and illness. Do not automatically omit the next insulin dose; continue regular glucose monitoring 24–48 h.', tools: ['monitoring']},
    ],
    monitoring: [
      'Oral, buccal or enteral rescue: recheck capillary glucose after 10–15 minutes; maximum 3 treatment cycles before escalation.',
      'IV glucose or IM glucagon: recheck capillary glucose after 10 minutes.',
      'After sulfonylurea or long-acting insulin, recurrence may persist 24–36 hours; this adds prolonged risk to the general 24–48-hour monitoring plan.',
    ],
    sources: [
      {label: 'JBDS 01 — Algorithms A–E and successful-treatment guidance', url: JBDS_SOURCE},
    ],
  },
};

export default config;
