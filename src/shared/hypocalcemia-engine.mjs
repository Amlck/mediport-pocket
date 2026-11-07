// Compact, source-reviewed decision support for adult hypocalcaemia.
// This data module deliberately has no local order, patient-record, or HIS behavior.

export const SOCIETY_ACUTE_SOURCE = 'https://doi.org/10.1530/EC-16-0056';
export const SOCIETY_ADDENDUM_SOURCE = 'https://doi.org/10.1530/EC-16-0056a';
export const DAILYMED_GLUCONATE_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=13d7cfc9-ff7a-437e-8c21-d9709ac07d48&type=display';
export const ESE_HYPOPT_SOURCE = 'https://doi.org/10.1093/ejendo/lvaf222';
export const KDIGO_CKDMBD_SOURCE = 'https://kdigo.org/guidelines/ckd-mbd/';

const source = {
  society: {
    label: 'Society for Endocrinology acute hypocalcaemia emergency guidance (2016)',
    url: SOCIETY_ACUTE_SOURCE,
  },
  addendum: {
    label: 'Society for Endocrinology acute hypocalcaemia addendum — calcium-salt equivalence (2019)',
    url: SOCIETY_ADDENDUM_SOURCE,
  },
  gluconate: {
    label: 'DailyMed calcium gluconate injection label — revised May 2026',
    url: DAILYMED_GLUCONATE_SOURCE,
  },
  ese: {
    label: 'European Society of Endocrinology chronic hypoparathyroidism guideline (2025)',
    url: ESE_HYPOPT_SOURCE,
  },
  kdigo: {
    label: 'KDIGO CKD-MBD guideline suite — current listed guideline is 2017',
    url: KDIGO_CKDMBD_SOURCE,
  },
};

const fields = [
  {
    key: 'calciumStatus',
    label: 'Verified calcium status?',
    help: 'The Society acute threshold uses albumin-adjusted calcium. Ionised calcium can confirm hypocalcaemia, but an unadjusted total-calcium value is not assigned a treatment band here.',
    options: [
      ['unknown', 'Unknown / not confirmed'],
      ['severe', 'Adjusted Ca <1.9 mmol/L'],
      ['low', 'Below range; adjusted ≥1.9'],
      ['ionizedLow', 'Ionised low; adjusted unclear'],
      ['notLow', 'Within / above reference'],
    ],
  },
  {
    key: 'urgentFeature',
    label: 'Symptoms / ECG feature?',
    help: 'Emergency features include seizure, laryngospasm, prolonged QT or arrhythmia. Other symptoms include tetany, carpopedal spasm and paraesthesia. “None” requires active assessment.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['emergency', 'Seizure / laryngospasm / ECG risk'],
      ['symptomatic', 'Tetany / spasm / paraesthesia'],
      ['none', 'No symptom / ECG risk assessed'],
    ],
  },
  {
    key: 'treatmentPhase',
    label: 'IV calcium treatment phase?',
    help: 'Choose a documented phase. “Resolved” means symptoms improved after IV calcium; it does not establish normocalcaemia or a completed cause-treatment plan.',
    options: [
      ['unknown', 'Not entered'],
      ['notStarted', 'Not started'],
      ['ivActive', 'IV active / response pending'],
      ['resolved', 'Symptoms resolved after IV'],
      ['persistent', 'Still symptomatic after IV'],
    ],
  },
  {
    key: 'oralRoute',
    label: 'Oral route safe?',
    help: 'Safe requires an appropriate swallow, GI absorption and an available formulation. An unsafe or unknown route is not converted into an automatic IV-calcium indication for otherwise mild asymptomatic hypocalcaemia.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['safe', 'Safe / functioning'],
      ['unsafe', 'Unsafe / unavailable'],
    ],
  },
  {
    key: 'renalState',
    label: 'Renal / dialysis status?',
    help: 'Dialysis includes end-stage kidney failure on dialysis. It blocks this guide’s large-volume infusion and chronic oral/active-vitamin-D resource links; it does not make severe symptoms benign.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['dialysis', 'ESRF / dialysis'],
      ['impaired', 'Renal impairment'],
      ['noRisk', 'No dialysis / impairment assessed'],
    ],
  },
  {
    key: 'magnesium',
    label: 'Magnesium status?',
    help: 'Low magnesium can impair PTH secretion and action. Correcting a documented deficit is part of cause treatment, but must not delay urgent calcium rescue for a severe symptomatic presentation.',
    options: [
      ['unknown', 'Unknown / not checked'],
      ['low', 'Low / deficit documented'],
      ['notLow', 'Not low — reviewed'],
    ],
  },
  {
    key: 'causeContext',
    label: 'Likely cause context?',
    help: 'Use a reviewed context, not a diagnosis made by this aid. The source work-up includes phosphate, PTH, vitamin D, magnesium and kidney function alongside calcium and albumin/ionised calcium.',
    options: [
      ['unknown', 'PTH / vitamin D not reviewed'],
      ['postOpOrLowPTH', 'Post-neck surgery / low PTH'],
      ['vitaminDDeficiency', 'Vitamin D deficiency'],
      ['acuteProcess', 'Pancreatitis / rhabdo / transfusion'],
      ['otherReviewed', 'Other cause reviewed'],
    ],
  },
];

const stages = [
  {id: 'assess', title: 'Verify & triage', empty: 'Confirm calcium physiology and urgent features.'},
  {id: 'route', title: 'Choose calcium route', empty: 'Select a route only from established severity and phase.'},
  {id: 'safeguard', title: 'Protect IV / renal care', empty: 'Verify the line, monitoring and renal context.'},
  {id: 'correct', title: 'Correct cause & cofactors', empty: 'Review magnesium, PTH, vitamin D and cause.'},
  {id: 'reassess', title: 'Reassess response', empty: 'Record symptoms, calcium and the follow-up plan.'},
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

function action(id, stage, title, summary, detail, sourceKey = 'society', extra = {}) {
  const citation = source[sourceKey];
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: citation.url,
    sourceLabel: citation.label,
    ...extra,
  };
}

function result(values, actions) {
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions};
}

function hasConfirmedLowCalcium(values) {
  return ['severe', 'low', 'ionizedLow'].includes(values.calciumStatus);
}

function hasEnteredSymptom(values) {
  return ['emergency', 'symptomatic'].includes(values.urgentFeature);
}

function needsAcuteCalciumPath(values) {
  return values.calciumStatus === 'severe'
    || (hasConfirmedLowCalcium(values) && hasEnteredSymptom(values));
}

function isPostIvPhase(values) {
  return ['ivActive', 'resolved', 'persistent'].includes(values.treatmentPhase);
}

function addAssessment(actions, values) {
  actions.push(action(
    'confirm-calcium-physiology-and-ecg',
    'assess',
    'Confirm calcium physiology and assess ECG urgency',
    'Use albumin-adjusted or ionised calcium; an unadjusted total result is insufficient.',
    'The Society guidance lists adjusted calcium, phosphate, PTH, urea/electrolytes, vitamin D and magnesium in the initial assessment. It describes symptoms as rate-dependent and usually appearing at adjusted calcium around 1.9 mmol/L, but a fixed number cannot replace symptom, ECG and trajectory assessment.',
    'society',
    {resourceGroup: 'workup'},
  ));

  if (values.urgentFeature === 'unknown') {
    actions.push(action(
      'assess-neuromuscular-and-cardiac-features',
      'assess',
      'Assess seizure, airway, tetany and QT/rhythm features',
      'Unknown is not an absent symptom or ECG concern.',
      'The Society guidance lists peri-oral/digital paraesthesia, Trousseau/Chvostek signs, tetany, carpopedal spasm, laryngospasm, prolonged QT, arrhythmia and seizure. Complete the emergency assessment while obtaining the calcium result; this guide does not infer a benign state from a missing finding.',
      'society',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (needsAcuteCalciumPath(values)) {
    actions.push(action(
      'urgent-hypocalcemia-response',
      'assess',
      'Escalate the acute hypocalcaemia response',
      values.calciumStatus === 'severe'
        ? 'Adjusted calcium <1.9 mmol/L is an emergency source threshold.'
        : 'Symptoms or ECG risk with confirmed low calcium need urgent monitored care.',
      'The Society guidance defines severe hypocalcaemia as adjusted calcium <1.9 mmol/L and/or symptoms at any calcium below the reference range. This is a medical emergency. Do not let cause testing, magnesium review, or an incomplete treatment-phase entry delay emergency clinical assessment and ECG-capable monitoring.',
      'society',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.urgentFeature === 'none') {
    actions.push(action(
      'no-entered-symptom-emergency',
      'assess',
      'No symptom or ECG emergency entered',
      'This does not establish that calcium physiology or cause is safe.',
      'The Society “mild” branch is asymptomatic adjusted calcium above 1.9 mmol/L. Continue confirmation, cause assessment and follow-up; a missing trend, PTH, vitamin D, renal context or magnesium result is not a negative finding.',
      'society',
      {resourceGroup: 'workup'},
    ));
  }
}

function addRoute(actions, values) {
  const acute = needsAcuteCalciumPath(values);

  if (acute) {
    if (values.treatmentPhase === 'notStarted') {
      if (values.renalState === 'dialysis') {
        actions.push(action(
          'urgent-dialysis-calcium-plan',
          'route',
          'Use an urgent renal/dialysis-directed calcium plan',
          'Severe symptoms remain an emergency; large-volume infusion is not selected here.',
          'The Society emergency source starts with 10–20 mL of 10% calcium gluconate diluted in 50–100 mL of 5% dextrose over 10 minutes with ECG monitoring, repeated under clinician reassessment until asymptomatic. It separately warns not to use large-volume calcium infusions in end-stage renal failure or dialysis. This guide therefore exposes no local calcium-product link in this branch; urgent renal and monitored-care review must select the actual regimen.',
          'society',
          {tone: 'urgent', resourceGroup: 'monitoring'},
        ));
      } else {
        actions.push(action(
          'initial-iv-calcium-gluconate',
          'route',
          'Start the monitored IV calcium-gluconate response',
          'Source reminder: 10–20 mL 10% calcium gluconate in 50–100 mL D5W IV over 10 min with ECG monitoring.',
          'For severe hypocalcaemia or symptoms below the reference range, Society guidance uses 10–20 mL of 10% calcium gluconate in 50–100 mL of 5% dextrose IV over 10 minutes with ECG monitoring; repeat only under reassessment until asymptomatic. Its 2019 addendum states that each 10 mL 10% calcium-gluconate vial contains 2.2 mmol calcium. This is a source reminder, not an order: verify the actual calcium-gluconate product, elemental-calcium content, dilution, line, pump, monitoring and local authority.',
          'addendum',
          {tone: 'urgent', resourceGroup: 'iv-calcium-gluconate'},
        ));
      }
      return;
    }

    if (values.treatmentPhase === 'unknown') {
      actions.push(action(
        'confirm-iv-treatment-phase-without-delay',
        'route',
        'Urgently establish whether IV calcium has started',
        'Missing phase is not proof that no calcium has been given or that symptoms resolved.',
        'The acute source dose is 10–20 mL of 10% calcium gluconate in 50–100 mL of 5% dextrose over 10 minutes with ECG monitoring. Confirm current treatment, serial calcium, symptoms, ECG and access immediately so a previous dose is not duplicated or an active emergency is missed. This state intentionally exposes monitoring rather than a local calcium-product link.',
        'society',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (values.treatmentPhase === 'ivActive') {
      actions.push(action(
        'review-active-iv-calcium-cycle',
        'route',
        'Review the active IV-calcium cycle',
        'An IV response is active; do not display a new initial bolus.',
        'Record the administered calcium salt, concentration, elemental calcium, dilution, start/finish time, symptoms, ECG and serial calcium. The Society pathway repeats emergency treatment only under reassessment, and the calcium-gluconate label requires calcium and ECG monitoring during IV use.',
        'gluconate',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      return;
    }

    if (values.treatmentPhase === 'resolved') {
      if (values.renalState === 'dialysis') {
        actions.push(action(
          'post-iv-dialysis-continuation-review',
          'route',
          'Do not select a large-volume post-IV infusion in dialysis',
          'Improved symptoms do not establish normocalcaemia or a safe dialysis plan.',
          'The Society source says the acute bolus is followed by a calcium-gluconate infusion, but separately says large-volume calcium infusions should not be used in end-stage renal failure or dialysis. Reconcile serial calcium, phosphate, dialysis prescription and cause with renal/specialist care rather than converting the general infusion recipe into a dialysis regimen.',
          'society',
          {tone: 'attention', resourceGroup: 'monitoring'},
        ));
      } else {
        actions.push(action(
          'post-iv-calcium-gluconate-continuation-review',
          'route',
          'Review post-bolus calcium-gluconate continuation',
          'Symptoms improved; do not restart the initial bolus as if untreated.',
          'After emergency boluses, the Society source describes 100 mL of 10% calcium gluconate in 1 L normal saline or 5% dextrose at 50–100 mL/hour, titrated to normocalcaemia while cause treatment takes effect. This is source detail, not a local infusion prescription. Confirm actual concentration, elemental calcium, fluid tolerance, renal status, access and monitored protocol before any continuation.',
          'society',
          {resourceGroup: 'iv-calcium-gluconate'},
        ));
      }
      return;
    }

    if (values.renalState === 'dialysis') {
      actions.push(action(
        'persistent-symptoms-dialysis-escalation',
        'route',
        'Escalate persistent symptoms with renal/dialysis review',
        'Do not use a generic repeat or large-volume infusion branch.',
        'Persistent symptoms after IV calcium require immediate reassessment of calcium, ECG, airway, cause and dialysis context. Society guidance permits repetition under clinician reassessment until asymptomatic but prohibits large-volume calcium infusions in end-stage renal failure or dialysis; this guide does not select a product or regimen.',
        'society',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'persistent-symptoms-after-iv-calcium',
        'route',
        'Escalate persistent symptoms after IV calcium',
        'Reassess calcium, ECG, airway and alternative contributors before any repeat treatment.',
        'Society guidance allows the 10–20 mL 10% calcium-gluconate emergency dose to be repeated under ECG-monitored clinical reassessment until asymptomatic, then followed by an infusion. This is not a duplicate initial-bolus instruction or an automatic repeat order; reconcile administered elemental calcium, product, dilution, response and renal status with urgent senior/endocrine or critical-care review.',
        'society',
        {tone: 'urgent', resourceGroup: 'iv-calcium-gluconate'},
      ));
    }
    return;
  }

  if (values.urgentFeature === 'unknown') {
    actions.push(action(
      'confirm-symptoms-before-mild-route',
      'route',
      'Confirm symptoms before selecting a mild oral route',
      'Unknown symptoms do not establish asymptomatic hypocalcaemia.',
      'The Society oral branch is only for asymptomatic adjusted calcium above 1.9 mmol/L. Establish symptoms, ECG context and calcium physiology before using that branch; this guide does not convert an incomplete symptom screen into oral or IV treatment.',
      'society',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.treatmentPhase === 'unknown') {
    actions.push(action(
      'confirm-mild-treatment-timeline',
      'route',
      'Confirm whether calcium treatment has already started',
      'A missing treatment phase does not establish an untreated mild branch.',
      'Clarify whether calcium was already given, which salt and elemental amount were used, the current calcium trend, symptoms and ECG context. This compact state does not infer that IV calcium is indicated, that no treatment has occurred, or that an oral product should be selected.',
      'society',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.treatmentPhase !== 'notStarted') {
    actions.push(action(
      'resolve-nonacute-treatment-timeline',
      'route',
      'Resolve the entered treatment timeline',
      'A known post-IV phase conflicts with a source acute-IV indication that is not currently established.',
      'Document the original indication, calcium measurements, symptoms, route and response. This compact state does not infer that IV calcium was appropriate, that symptoms resolved from calcium treatment, or that a new oral or IV calcium regimen should be selected.',
      'society',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.calciumStatus === 'ionizedLow') {
    actions.push(action(
      'confirm-adjusted-severity-after-ionized-low',
      'route',
      'Confirm adjusted-calcium severity before a mild route',
      'A low ionised result confirms hypocalcaemia but does not place it above the source adjusted-calcium threshold.',
      'The Society mild branch is asymptomatic adjusted calcium above 1.9 mmol/L. Confirm albumin-adjusted calcium, the ionised-calcium context, symptoms, ECG and trend before treating this as a mild oral branch. A symptomatic low ionised result already enters the urgent monitored pathway; this state does not infer a routine oral or IV regimen.',
      'society',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.oralRoute !== 'safe') {
    actions.push(action(
      'confirm-safe-oral-route-for-mild-hypocalcemia',
      'route',
      'Confirm a safe oral route for mild hypocalcaemia',
      'A missing or unsafe oral route does not create an automatic IV indication.',
      'For asymptomatic calcium above the Society severe threshold, establish swallow, absorption, formulation and the responsible treatment plan. The source reserves IV calcium for severe hypocalcaemia or symptoms; route difficulty alone must be reviewed in its clinical context rather than converted into an unsupervised IV-calcium regimen.',
      'society',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (values.renalState === 'dialysis') {
    actions.push(action(
      'individualize-mild-dialysis-calcium-plan',
      'route',
      'Individualize mild hypocalcaemia in dialysis',
      'Do not expose a generic oral-calcium or active-vitamin-D regimen.',
      'KDIGO frames calcium, phosphate and PTH in CKD-MBD as serial, jointly interpreted measurements and advises avoiding hypercalcaemia in adults. The ESE chronic HypoPT evidence base excluded studies primarily selecting end-stage renal disease. Use renal/dialysis review for the cause, dialysis prescription and calcium/phosphate plan rather than treating this selection as a standard outpatient supplement regimen.',
      'kdigo',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renalState === 'unknown') {
    actions.push(action(
      'confirm-renal-state-before-oral-calcium-plan',
      'route',
      'Confirm renal status before an oral calcium plan',
      'Do not assume this is outside CKD-MBD or dialysis care.',
      'Confirm kidney function, dialysis status, phosphate and current calcium/vitamin-D exposure. This guide withholds a local oral-calcium resource link until the renal context is established because calcium loading and active vitamin-D plans need different oversight in advanced kidney disease.',
      'kdigo',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'review-oral-calcium-for-mild-hypocalcemia',
    'route',
    'Review oral calcium for the mild asymptomatic branch',
    'Oral calcium is the Society source branch for asymptomatic adjusted Ca >1.9 mmol/L.',
    'The Society source begins oral calcium supplements for its mild branch. For established chronic hypoparathyroidism, the 2025 ESE guideline suggests adequate dietary elemental calcium of about 800–1000 mg/day and says supplemental elemental calcium above 500 mg/day should be divided. Calcium carbonate is about 40% elemental calcium; the local calcium-carbonate row is an identity reference (0.5 g salt = 200 mg elemental calcium), not a source-approved tablet count or prescription.',
    'ese',
    {resourceGroup: 'oral-calcium'},
  ));
}

function addSafeguards(actions, values) {
  if (values.renalState === 'unknown') {
    actions.push(action(
      'confirm-renal-and-dialysis-context',
      'safeguard',
      'Confirm renal function and dialysis context',
      'Unknown renal status is not evidence that calcium exposure is uncomplicated.',
      'Check current creatinine/eGFR, urine output, dialysis status, phosphate, calcium trend and current calcium/vitamin-D exposure. The calcium-gluconate label uses the lowest recommended dose range and serum-calcium monitoring every 4 hours in renal impairment; this guide does not derive a dose from an unknown renal state.',
      'gluconate',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.renalState === 'impaired') {
    actions.push(action(
      'renal-calcium-gluconate-safeguard',
      'safeguard',
      'Use renal calcium safeguards',
      'Renal impairment requires lower-end dosing and serial calcium review.',
      'The May 2026 calcium-gluconate label says to initiate at the lowest dose of its recommended range in renal impairment and monitor serum calcium every 4 hours. It does not establish a local dose, infusion volume or repeat schedule; review phosphate, eGFR, calcium trend and fluid context with the responsible team.',
      'gluconate',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.renalState === 'dialysis') {
    actions.push(action(
      'avoid-large-volume-calcium-in-dialysis',
      'safeguard',
      'Avoid the generic large-volume calcium infusion in dialysis',
      'Severe hypocalcaemia remains urgent, but the general infusion recipe is not selected.',
      'The Society acute guidance specifically says large-volume calcium infusions should not be used in end-stage renal failure or dialysis. Escalate the symptomatic emergency while the renal/dialysis team determines the calcium, phosphate, fluid and dialysis plan; this guide does not present a local product or volume.',
      'society',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (needsAcuteCalciumPath(values) || isPostIvPhase(values)) {
    const ivSafetyResource = ['notStarted', 'resolved', 'persistent'].includes(values.treatmentPhase)
      && ['impaired', 'noRisk'].includes(values.renalState)
      ? 'iv-calcium-gluconate'
      : 'monitoring';
    actions.push(action(
      'iv-calcium-line-and-monitoring-safeguard',
      'safeguard',
      'Use secure-line, dilution and ECG safeguards',
      'Do not use an unreviewed rapid injection or an incompatible line.',
      'The current calcium-gluconate label requires a secure IV line, dilution in 5% dextrose or normal saline and slow administration with vital-sign and ECG monitoring. Do not mix with bicarbonate- or phosphate-containing fluids; assess extravasation promptly because tissue necrosis/calcinosis can occur. Cardiac glycosides require slow small amounts and close ECG monitoring if calcium is necessary.',
      'gluconate',
      {tone: 'attention', resourceGroup: ivSafetyResource},
    ));
  }
}

function addCauseAndCofactors(actions, values) {
  if (values.magnesium === 'unknown') {
    actions.push(action(
      'check-magnesium-before-naming-refractory-cause',
      'correct',
      'Check magnesium with the calcium cause work-up',
      'Unknown magnesium cannot exclude functional hypoparathyroidism.',
      'The Society work-up includes magnesium. The 2025 ESE guideline explains that magnesium depletion can impair PTH secretion and action; correct it before diagnosing chronic hypoparathyroidism. In a severe symptomatic calcium emergency, obtain magnesium in parallel and do not delay urgent calcium response for the result.',
      'ese',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.magnesium === 'low') {
    actions.push(action(
      'correct-documented-magnesium-deficit',
      'correct',
      'Correct the documented magnesium deficit',
      'Low magnesium can sustain hypocalcaemia and mimic a PTH problem.',
      'The Society guidance treats hypomagnesaemia as a cause of hypocalcaemia, and the ESE guideline says low magnesium can cause functional hypoparathyroidism. Use the local magnesium protocol with renal review; this guide does not translate the source magnesium regimen into a local dose. Do not delay urgent calcium rescue when severe symptoms or the <1.9 mmol/L threshold are present.',
      'ese',
      {resourceGroup: 'magnesium', related: ['hypomagnesemia']},
    ));
  }

  switch (values.causeContext) {
    case 'postOpOrLowPTH':
      if (values.renalState === 'dialysis') {
        actions.push(action(
          'postop-pth-dialysis-specialist-review',
          'correct',
          'Use renal/endocrine review for PTH-related dialysis care',
          'Do not expose a generic active-vitamin-D product plan in dialysis.',
          'Post-neck surgery and low or inappropriately normal PTH are important contexts, but the ESE chronic HypoPT evidence base excluded studies primarily selecting end-stage renal disease. Reconcile PTH, phosphate, calcium, dialysis prescription and current vitamin-D therapy with renal/endocrine care rather than selecting alfacalcidol from this compact aid.',
          'ese',
          {tone: 'attention', resourceGroup: 'workup'},
        ));
      } else if (values.renalState === 'unknown') {
        actions.push(action(
          'pTH-cause-awaits-renal-context',
          'correct',
          'Complete renal context before an active-vitamin-D plan',
          'PTH-related cause is entered, but renal/dialysis status remains unknown.',
          'The Society source uses alfacalcidol or calcitriol for post-operative hypocalcaemia and other hypoparathyroidism after urgent stabilisation, but its large-volume and chronic-treatment safeguards differ in end-stage renal failure/dialysis. Confirm renal context, phosphate and calcium trend before exposing a local active-vitamin-D product link.',
          'society',
          {tone: 'attention', resourceGroup: 'workup'},
        ));
      } else {
        actions.push(action(
          'review-active-vitamin-d-for-pth-context',
          'correct',
          'Review activated vitamin D for PTH-related hypocalcaemia',
          'After stabilization, Society guidance starts alfacalcidol or calcitriol at about 0.25–0.5 micrograms/day.',
          'For post-operative hypocalcaemia and other hypoparathyroidism, the Society source describes alfacalcidol or calcitriol starting at approximately 0.25–0.5 micrograms/day and frequent tests during stabilization. The 2025 ESE guideline recommends an activated vitamin-D analogue for established chronic HypoPT. The local alfacalcidol 0.25-microgram capsule is an identity reference only; select dose, route, duration and monitoring through the responsible team.',
          'ese',
          {resourceGroup: 'active-vitamin-d'},
        ));
      }
      break;
    case 'vitaminDDeficiency':
      actions.push(action(
        'treat-confirmed-vitamin-d-deficiency',
        'correct',
        'Treat confirmed vitamin-D deficiency with the cause plan',
        'The Society source example is about 300,000 units over 6–10 weeks.',
        'The Society acute guidance gives a cholecalciferol or ergocalciferol loading example of about 300,000 units over 6–10 weeks when vitamin-D deficiency is the cause. This guide does not map that example to a local product, choose a loading schedule, or apply it automatically in dialysis/advanced CKD; verify product, renal context, phosphate and follow-up with the responsible team.',
        'society',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'acuteProcess':
      actions.push(action(
        'treat-acute-hypocalcemia-driver',
        'correct',
        'Treat the acute driver alongside calcium support',
        'Pancreatitis, rhabdomyolysis and large-volume transfusion are source-listed causes.',
        'The Society guidance lists pancreatitis, rhabdomyolysis and large-volume blood transfusion among acute causes. Treat the underlying process in parallel with calcium assessment; this selection does not establish a replacement total, transfusion plan or diagnosis.',
        'society',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'otherReviewed':
      actions.push(action(
        'continue-reviewed-cause-treatment',
        'correct',
        'Continue the reviewed cause-directed plan',
        'A cause context is entered; avoid treating calcium alone as the endpoint.',
        'The Society guidance stresses that underlying-cause treatment should begin as early as possible. Keep calcium, phosphate, magnesium, renal function, medicines and the clinical process aligned with the responsible treatment plan; this aid does not diagnose or change therapy.',
        'society',
        {resourceGroup: 'workup'},
      ));
      break;
    default:
      actions.push(action(
        'complete-cause-panel-for-hypocalcemia',
        'correct',
        'Complete PTH, vitamin D, magnesium and phosphate cause review',
        'Cause is not established; do not label this as isolated calcium deficiency.',
        'The Society initial work-up includes adjusted calcium, phosphate, PTH, urea/electrolytes, vitamin D and magnesium. Review neck surgery, drugs including proton-pump inhibitors/cytotoxic agents, pancreatitis, rhabdomyolysis and transfusion context. Draw or document relevant results without delaying emergency stabilization when indicated.',
        'society',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
  }
}

function addReassessment(actions, values) {
  const acute = needsAcuteCalciumPath(values);

  if (acute) {
    if (values.treatmentPhase === 'notStarted') {
      actions.push(action(
        'record-iv-calcium-response-and-monitoring-plan',
        'reassess',
        'Record calcium, symptoms, ECG and infusion response',
        'Set serial review before repeating or continuing IV calcium.',
        'The current calcium-gluconate label measures serum calcium every 4–6 hours during intermittent infusion and every 1–4 hours during continuous infusion. Society guidance uses ECG monitoring during the emergency dose and continuous ECG monitoring with arrhythmia or digoxin context. These are source monitoring points, not automatically scheduled observations.',
        'gluconate',
        {resourceGroup: 'monitoring'},
      ));
      return;
    }
    if (values.treatmentPhase === 'unknown') {
      actions.push(action(
        'reconcile-acute-calcium-timeline',
        'reassess',
        'Reconcile the acute calcium timeline now',
        'Do not infer improvement, normocalcaemia or an untreated state.',
        'Document the initial calcium, albumin/ionised result, calcium salt and elemental amount, dilution, time, symptoms, ECG, renal/dialysis context and repeat result. A missing treatment-phase entry cannot safely select a repeat bolus, infusion, oral plan or discharge follow-up.',
        'society',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      return;
    }
    if (values.treatmentPhase === 'resolved') {
      actions.push(action(
        'symptom-resolution-is-not-calcium-normalization',
        'reassess',
        'Do not equate symptom resolution with normocalcaemia',
        'Continue serial calcium and cause-directed review after improved symptoms.',
        'The Society source describes continuation calcium support after the acute bolus while underlying therapy takes effect. Reassess calcium, phosphate, magnesium, renal function, ECG and cause; symptom resolution alone does not prove calcium normalization, a stable trend or a safe chronic regimen.',
        'society',
        {resourceGroup: 'monitoring'},
      ));
      return;
    }
    if (values.treatmentPhase === 'ivActive') {
      actions.push(action(
        'monitor-active-iv-calcium-response',
        'reassess',
        'Monitor the active IV-calcium response',
        'IV calcium is active; document symptoms, ECG and serial calcium before changing course.',
        'The calcium-gluconate label calls for serum-calcium monitoring every 4–6 hours during intermittent infusion and every 1–4 hours during continuous infusion. Record the administered salt, elemental amount, dilution, timing, symptoms, ECG and current calcium trend. This is a monitored-response state, not evidence of persistent symptoms or a new initial dose.',
        'gluconate',
        {resourceGroup: 'monitoring'},
      ));
      return;
    }
    actions.push(action(
      'monitor-persistent-hypocalcemia-emergency',
      'reassess',
      'Use high-acuity reassessment for persistent symptoms',
      'Persistent symptoms require serial calcium, ECG and cause reassessment.',
      'Continue clinician-led emergency review of airway, seizure/rhythm risk, calcium trend, administered elemental calcium, magnesium, phosphate, renal status and alternative causes. This guide does not infer that a repeat dose, infusion rate or a non-calcium explanation is safe without the measured response.',
      'society',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.calciumStatus === 'low' && values.urgentFeature === 'none' && values.treatmentPhase === 'notStarted') {
    actions.push(action(
      'set-mild-hypocalcemia-response-review',
      'reassess',
      'Set calcium, symptom and cause follow-up',
      'Mild/asymptomatic management still needs a measured response.',
      'For established chronic HypoPT, the 2025 ESE guideline recommends calcium, phosphate, magnesium and creatinine/eGFR monitoring after therapy changes every 1–2 weeks, then regularly (for example every 3–6 months) when stable. The Society post-thyroidectomy mild branch repeats calcium at 24 hours. Apply neither interval as an automatic schedule outside its source context.',
      'ese',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'set-response-review-after-context-resolved',
    'reassess',
    'Set response review after unresolved findings are completed',
    'Document calcium, symptoms, cause and route before declaring a stable response.',
    'Calcium follow-up depends on severity, renal/dialysis context, route, active vitamin-D exposure, magnesium and the causal process. Do not infer stability from an unknown symptom screen, route, treatment phase or serial calcium result.',
    'ese',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

export function evaluate(input = {}) {
  const values = normalize(input);
  const actions = [];

  if (values.calciumStatus === 'unknown') {
    actions.push(action(
      'confirm-calcium-result-and-physiology',
      'assess',
      'Confirm calcium result, albumin and ionised context',
      'Unknown calcium does not select a calcium dose or route.',
      'Obtain a credible calcium result with albumin adjustment or ionised-calcium context, and review phosphate, PTH, magnesium, vitamin D and kidney function. In a clinically unstable person, urgent assessment continues while the result is clarified; this guide does not infer a calcium prescription from an unknown value.',
      'society',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    if (hasEnteredSymptom(values)) {
      actions.push(action(
        'urgent-feature-with-unconfirmed-calcium',
        'assess',
        'Escalate the urgent clinical feature',
        'Do not explain seizure, laryngospasm or arrhythmia with an unconfirmed calcium result.',
        'Urgent airway, neurologic and ECG/rhythm assessment with a broad differential is required. This compact aid withholds a local calcium-product link until calcium physiology, treatment phase and monitoring context are established.',
        'society',
        {tone: values.urgentFeature === 'emergency' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
    } else if (values.urgentFeature === 'unknown') {
      actions.push(action(
        'assess-danger-with-unconfirmed-calcium',
        'assess',
        'Assess neurologic, airway and ECG danger',
        'Unknown is not a negative emergency screen.',
        'Assess seizure, laryngospasm, tetany, prolonged QT and arrhythmia while confirming calcium physiology. This guide does not label an incomplete entry as mild or safe.',
        'society',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return result(values, actions);
  }

  if (values.calciumStatus === 'notLow') {
    actions.push(action(
      'outside-hypocalcemia-threshold',
      'assess',
      'This result does not trigger hypocalcaemia treatment',
      'A confirmed non-low calcium result is outside this pathway.',
      'Review the measurement context, trend, albumin/ionised-calcium interpretation, treatment already given and the broader clinical problem. This pathway does not add calcium treatment for a result that is not low.',
      'ese',
      {resourceGroup: 'workup'},
    ));
    if (values.urgentFeature !== 'none') {
      actions.push(action(
        'urgent-feature-not-explained-by-nonlow-calcium',
        'assess',
        values.urgentFeature === 'emergency' ? 'Escalate the urgent clinical feature' : 'Complete the urgent-feature assessment',
        values.urgentFeature === 'emergency' ? 'The entered emergency remains urgent.' : 'Do not infer that urgent features are absent.',
        'A non-low calcium result does not explain away seizure, laryngospasm, tetany, prolonged QT or arrhythmia. Assess and treat the active clinical problem through the appropriate emergency pathway; this guide does not add calcium replacement.',
        'society',
        {tone: values.urgentFeature === 'emergency' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return result(values, actions);
  }

  addAssessment(actions, values);
  addRoute(actions, values);
  addSafeguards(actions, values);
  addCauseAndCofactors(actions, values);
  addReassessment(actions, values);
  return result(values, actions);
}

export const config = {
  id: 'hypocalcemia',
  title: 'Hypocalcemia',
  reviewedAt: '2026-09-15',
  scope: 'Adult hypocalcaemia: triage, route, safeguards, cause review and reassessment.',
  reviewLimitations: [
    'This is compact adult decision support, not a local electrolyte prescription, infusion-pump protocol, order set, diagnosis engine or patient-specific plan.',
    'The Society acute guidance (2016) and its 2019 addendum govern the emergency wording; the 2025 ESE guideline is used only for established chronic hypoparathyroidism and explicitly excludes studies primarily selecting end-stage renal disease.',
    'The 2019 addendum makes calcium salts non-volume-equivalent. This module exposes only calcium-gluconate source actions and never treats local calcium chloride as a gluconate equivalent or selects a chloride product.',
    'The IV route is source detail, not an order. This aid never selects an infusion pump, line, dilution, volume, repeat dose, calcium-chloride conversion, local concentration or automatic replacement schedule.',
    'End-stage renal failure/dialysis blocks the general large-volume infusion and chronic oral/active-vitamin-D resource links. Severe symptoms remain urgent and require renal/monitored-care decisions outside this engine.',
    'A product listing establishes only product identity, not availability, suitability, dose, route safety, prescribing authorization or an approved local regimen.',
  ],
  sources: Object.values(source),
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Verify calcium physiology, triage symptoms and ECG, distinguish monitored IV rescue from mild oral review, then correct the cause and measure the response.',
    recognition: [
      'Society guidance defines severe hypocalcaemia as adjusted calcium <1.9 mmol/L and/or symptoms at any low calcium value. Symptoms may be rate-dependent, so a number alone does not prove safety.',
      'Urgent features include seizure, laryngospasm, tetany/carpopedal spasm, prolonged QT and arrhythmia. Assess airway, neurologic state and ECG while confirming calcium physiology.',
      'Initial cause work-up includes adjusted or ionised calcium context, phosphate, PTH, kidney function, vitamin D and magnesium.',
    ],
    redFlags: [
      'Adjusted calcium <1.9 mmol/L, seizure, laryngospasm, tetany, prolonged QT, arrhythmia, or a rapidly deteriorating clinical state.',
      'Current or recent IV calcium with missing calcium trend, treatment phase, elemental-calcium amount, ECG result, line details or response.',
      'Dialysis/end-stage kidney failure, renal impairment, hypomagnesaemia, hyperphosphataemia, post-neck surgery, low/inappropriately normal PTH, vitamin-D deficiency, pancreatitis, rhabdomyolysis or large-volume transfusion.',
    ],
    steps: [
      {
        role: 'Verify & triage',
        text: 'Use albumin-adjusted or ionised calcium and assess seizure, airway, tetany and QT/rhythm features. Do not let cause work-up delay emergency assessment.',
        tools: ['workup', 'monitoring'],
      },
      {
        role: 'Severe / symptomatic',
        text: 'Society guidance uses 10–20 mL 10% calcium gluconate in 50–100 mL 5% dextrose IV over 10 minutes with ECG monitoring, repeated only under reassessment until asymptomatic.',
        dosingNote: 'Source reminder only: confirm the actual gluconate product, elemental calcium, dilution, line, pump, renal status and local authority.',
        tools: ['iv-calcium-gluconate', 'monitoring'],
      },
      {
        role: 'Mild / asymptomatic',
        text: 'The Society mild branch uses oral calcium when adjusted calcium is above 1.9 mmol/L and symptoms are absent. For established chronic HypoPT, ESE advises adequate elemental calcium intake and splitting supplemental elemental calcium above 500 mg/day.',
        dosingNote: 'Do not convert source elemental-calcium guidance into a local tablet count without product and renal review.',
        tools: ['oral-calcium', 'monitoring'],
      },
      {
        role: 'Protect the route',
        text: 'Use secure-line, dilution and ECG safeguards for IV calcium. Do not mix calcium gluconate with bicarbonate- or phosphate-containing fluids. Dialysis blocks the generic large-volume infusion branch.',
        tools: ['iv-calcium-gluconate', 'monitoring'],
      },
      {
        role: 'Correct causes & response',
        text: 'Check and correct magnesium, clarify PTH/vitamin-D/acute-process causes, and document serial calcium, symptoms, ECG and renal context. Symptom improvement does not prove normocalcaemia.',
        tools: ['magnesium', 'active-vitamin-d', 'workup', 'monitoring'],
      },
    ],
    monitoring: [
      'During intermittent calcium-gluconate infusion, the May 2026 label measures serum calcium every 4–6 hours; during continuous infusion, every 1–4 hours. These are source points, not auto-scheduled observations.',
      'Use ECG monitoring during emergency IV calcium; continuous ECG monitoring is specifically called for with arrhythmia or digoxin context in the Society guidance.',
      'For established chronic HypoPT after a treatment change, the 2025 ESE guideline recommends biochemical reassessment every 1–2 weeks, then regular calcium/phosphate/magnesium/creatinine review when stable. Dialysis needs its own renal plan.',
    ],
    sources: Object.values(source),
  },
};

export default config;
