// Compact, source-reviewed decision support for adult hypermagnesaemia.
// It deliberately separates immediate toxicity antagonism from magnesium removal
// and does not create a fluid, diuretic, calcium, dialysis, or order regimen.

export const QUEENSLAND_HYPER_SOURCE = 'https://www.health.qld.gov.au/clinical-practice/guidelines-procedures/medicines/safety/electrolyte-disturbances/hyper';
export const MAGNESIUM_SULFATE_SMPC = 'https://www.medicines.org.uk/emc/product/1990/smpc';

const QUEENSLAND = {
  label: 'Queensland Health HYPER-electrolyte disturbances — Hypermagnesaemia (updated May 2026)',
  url: QUEENSLAND_HYPER_SOURCE,
};
const SMPC = {
  label: 'UK magnesium sulfate 50% SmPC — toxicity manifestations and treatment',
  url: MAGNESIUM_SULFATE_SMPC,
};

const fields = [
  {
    key: 'magnesium',
    label: 'Magnesium result?',
    options: [
      ['unknown', 'Not verified'],
      ['elevated', '>1.05 to 2.5 mmol/L'],
      ['severe', '>2.5 mmol/L'],
      ['highUnbanded', 'High result; band not entered'],
      ['notHigh', '≤1.05 mmol/L / not high'],
    ],
    help: 'Queensland Health calls severe hypermagnesaemia above 2.5 mmol/L. The magnesium-sulfate SmPC notes that manifestations overlap across concentrations; a result alone does not replace assessment of reflexes, breathing, consciousness, blood pressure or ECG.',
  },
  {
    key: 'toxicity',
    label: 'Neuro / respiratory toxicity?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present / suspected'],
      ['no', 'Absent · assessed'],
    ],
    help: 'Concerning findings include loss of deep-tendon reflexes, weakness or paralysis, respiratory depression, reduced consciousness and hypotension. These require emergency assessment; they are not automatically explained by a magnesium value.',
  },
  {
    key: 'ecg',
    label: 'ECG / conduction concern?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present / suspected'],
      ['no', 'Absent · assessed'],
    ],
    help: 'The SmPC describes bradycardia, conduction/ECG change, arrhythmia and cardiac arrest with magnesium toxicity. A reviewed ECG finding changes urgency; an unknown ECG does not mean a normal ECG.',
  },
  {
    key: 'source',
    label: 'Mg exposure / obstetric therapy?',
    options: [
      ['unknown', 'Not established'],
      ['obstetric', 'Obstetric magnesium therapy'],
      ['other', 'Supplement, antacid, enema or drug'],
      ['none', 'No source found after review'],
    ],
    help: 'Queensland Health advises reviewing magnesium-containing antacids, enemas, supplements and medicines. Magnesium can be deliberately used in pregnancy for eclampsia/pre-eclampsia; contact the obstetric team before altering prescribed maternal therapy.',
  },
  {
    key: 'renalClearance',
    label: 'Renal dysfunction / dialysis?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present / receiving dialysis'],
      ['no', 'No severe dysfunction reviewed'],
    ],
    help: 'Severe renal dysfunction limits magnesium elimination. The SmPC says peritoneal dialysis or haemodialysis rapidly lowers magnesium in this setting; it does not make dialysis an automatic action for every elevated result.',
  },
  {
    key: 'volumeUrine',
    label: 'Volume / urine clearance state?',
    options: [
      ['unknown', 'Not assessed'],
      ['ready', 'Euvolaemic · safe to trial saline'],
      ['lowOutput', 'After saline · urine <60 mL/hour'],
      ['notReady', 'Not euvolaemic / unsafe to force'],
      ['oliguric', 'Oliguria / anuria'],
    ],
    help: 'Queensland Health uses sodium chloride to promote kidney excretion only in an appropriate fluid/urine context, aiming for at least 60 mL/hour. Select “After saline” only when a clinician has assessed volume tolerance and a saline strategy has not achieved that urine target. Fluid overload, hypovolaemia, oliguria and severe renal dysfunction need a separate plan.',
  },
];

const stages = [
  {id: 'assess', title: 'Confirm & expose risk', empty: 'Verify magnesium, reflexes, breathing, ECG and renal context.'},
  {id: 'stabilize', title: 'Stabilize toxicity', empty: 'Escalate documented toxicity; complete any unknown assessment.'},
  {id: 'source', title: 'Stop the source safely', empty: 'Clarify whether magnesium exposure is ongoing or obstetric.'},
  {id: 'clear', title: 'Lower magnesium safely', empty: 'Renal clearance strategy follows volume and urine assessment.'},
  {id: 'monitor', title: 'Monitor & escalate', empty: 'Set serial clinical and laboratory review from the trajectory.'},
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
  source = QUEENSLAND,
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

function hasHighMagnesium(values) {
  return ['elevated', 'severe', 'highUnbanded'].includes(values.magnesium);
}

function hasToxicConcern(values) {
  return values.toxicity === 'yes' || values.ecg === 'yes';
}

function addAssessment(actions, values) {
  if (values.magnesium === 'unknown') {
    actions.push(action(
      'confirm-magnesium-and-associated-context',
      'assess',
      'Confirm magnesium, renal function and associated electrolytes',
      undefined,
      'Obtain a time-linked magnesium result with renal function, calcium, potassium and clinical context. An unknown result is not a low-risk result; if acute toxicity is present, assess and support it in parallel.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.magnesium === 'highUnbanded') {
    actions.push(action(
      'assign-hypermagnesemia-band-and-trend',
      'assess',
      'Record the magnesium band and trend',
      undefined,
      'Queensland Health identifies >2.5 mmol/L as severe. Record the actual value, timing and trajectory rather than inferring severity from a nonspecific “high” result.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.magnesium === 'notHigh') {
    actions.push(action(
      'hypermagnesemia-not-established',
      'assess',
      'Hypermagnesaemia is not established by this result',
      undefined,
      'A reviewed result at or below 1.05 mmol/L does not support a magnesium-toxicity regimen from this guide. Continue the acute assessment if the patient has reflex, respiratory, ECG or consciousness concerns.',
      {resourceGroup: 'workup'},
    ));
  }

  if (values.toxicity === 'unknown') {
    actions.push(action(
      'assess-reflexes-respiration-and-consciousness',
      'assess',
      'Assess reflexes, breathing, weakness and consciousness',
      'Unknown toxicity is not an absence of toxicity.',
      'Queensland Health lists loss of deep-tendon reflexes, respiratory depression, paralysis and reduced consciousness as severe/symptomatic hypermagnesaemia indicators. The SmPC also describes hypotension and loss of tendon reflexes. Establish these findings promptly.',
      {tone: 'attention', resourceGroup: 'monitoring', source: SMPC},
    ));
  }

  if (hasHighMagnesium(values) && values.ecg === 'unknown') {
    actions.push(action(
      'assess-ecg-and-conduction',
      'assess',
      'Assess ECG and conduction concern',
      undefined,
      'The SmPC describes bradycardia, prolonged PR/QRS/QT intervals, arrhythmia and cardiac arrest with magnesium toxicity. Obtain/review an ECG when clinically indicated; do not infer a reassuring tracing from an unknown field.',
      {tone: 'attention', resourceGroup: 'monitoring', source: SMPC},
    ));
  }
}

function addStabilization(actions, values) {
  const high = hasHighMagnesium(values);
  const toxic = hasToxicConcern(values);

  if (toxic) {
    actions.push(action(
      'urgent-toxic-presentation',
      'stabilize',
      'Escalate the toxic presentation in monitored care',
      high ? 'Do not wait for a magnesium-clearance strategy.' : 'The magnesium result does not explain this presentation yet.',
      high
        ? 'Severe/symptomatic hypermagnesaemia can involve reflex loss, respiratory depression, paralysis, reduced consciousness and ECG/conduction abnormalities. Obtain urgent senior/critical-care support and manage breathing, circulation and rhythm in parallel. This guide does not select respiratory support or an emergency dose.'
        : 'A concerning respiratory, neuromuscular or ECG presentation needs urgent assessment even without a verified high magnesium result. Confirm magnesium in parallel; do not treat the form itself as proof that magnesium is the cause.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.magnesium === 'severe') {
    actions.push(action(
      'severe-magnesium-needs-senior-review',
      'stabilize',
      'Severe magnesium elevation needs senior review',
      'Queensland Health uses >2.5 mmol/L as the severe band.',
      'Even with entered absence of toxicity and ECG concern, a value above 2.5 mmol/L needs prompt review of symptoms, renal clearance, exposure and trajectory. Do not infer that an asymptomatic entry rules out progression.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (high && toxic) {
    actions.push(action(
      'calcium-antagonizes-toxic-effects',
      'stabilize',
      'Use IV calcium only under the local emergency protocol',
      'Queensland: 2.2 mmol calcium gluconate in 0.9% sodium chloride over 5 min; repeat if needed.',
      'For severe or symptomatic hypermagnesaemia, Queensland Health says one ampoule (2.2 mmol) of calcium gluconate in 0.9% sodium chloride should be administered over 5 minutes and repeated if necessary. With confirmed high magnesium, an entered ECG/conduction concern is treated as a symptomatic toxic presentation needing the same monitored local review. Calcium provides immediate but transient antagonism of toxic effects; it does not remove magnesium. Queensland’s “one ampoule” describes its source product: NTUH’s public formulary lists CAL1FA03 at 4.65 mEq (2.325 mmol elemental calcium) per ampoule, so they are not interchangeable. Confirm the local preparation and protocol rather than converting this source statement into an ampoule count or automatic order.',
      {tone: 'urgent', resourceGroup: 'calcium'},
    ));
  }
}

function addSourceActions(actions, values) {
  if (values.source === 'obstetric') {
    actions.push(action(
      'urgent-obstetric-coordination',
      'source',
      hasToxicConcern(values) ? 'Coordinate urgent toxicity care with obstetrics' : 'Coordinate prescribed magnesium with obstetrics',
      hasToxicConcern(values) ? 'Emergency support and obstetric review must proceed together.' : 'Magnesium may be deliberate in eclampsia/pre-eclampsia care.',
      'Queensland Health says magnesium may be deliberately used in pregnancy to treat or prevent eclampsia/severe pre-eclampsia and directs clinicians to contact the obstetrician. This applies even while the magnesium result is unknown or not high: the guide does not independently stop, resume or dose obstetric magnesium. Toxicity still needs urgent support.',
      {tone: hasToxicConcern(values) ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (!hasHighMagnesium(values)) return;

  switch (values.source) {
    case 'unknown':
      actions.push(action(
        'identify-ongoing-magnesium-exposure',
        'source',
        'Identify ongoing magnesium exposure',
        undefined,
        'Review prescribed, over-the-counter and administered magnesium, including antacids, enemas, supplements and relevant medicines. Queensland Health directs this review as part of lowering the magnesium level; do not assume no source from an unreviewed list.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    case 'other':
      actions.push(action(
        'hold-non-obstetric-magnesium-source',
        'source',
        'Hold the non-obstetric magnesium source and review exposure',
        undefined,
        'Review and stop/withhold the identified magnesium-containing product through the responsible prescriber/pharmacist context. Queensland Health specifically calls out antacids, enemas, supplements and medicines. This guide does not independently discontinue a prescribed treatment.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'none':
      actions.push(action(
        'review-renal-and-clinical-context-without-source',
        'source',
        'Review renal and clinical context when no exposure is found',
        undefined,
        'A reviewed absence of obvious supplement/antacid/enema/medicine exposure does not establish normal elimination or a benign cause. Continue renal-clearance, volume, urine and toxicity assessment rather than escalating a broad treatment bundle.',
        {resourceGroup: 'workup'},
      ));
      break;
  }
}

function addClearanceActions(actions, values) {
  if (!hasHighMagnesium(values)) return;
  const urgent = hasToxicConcern(values) || values.magnesium === 'severe';
  const activeClearanceIndicated = values.magnesium === 'severe' || hasToxicConcern(values);

  if (!activeClearanceIndicated) {
    actions.push(action(
      'do-not-force-clearance-for-nonsevere-unassessed-or-asymptomatic-result',
      'clear',
      'Do not force magnesium clearance yet',
      'Queensland’s saline/loop sequence is for severe or symptomatic HyperMg.',
      values.toxicity === 'unknown'
        ? 'The entered elevation is not in the severe band, and toxicity remains unassessed. Complete reflex, respiratory, consciousness and ECG assessment, establish the source and trend magnesium before deciding whether active clearance is needed. Do not turn an unknown symptom status into saline or diuresis.'
        : 'The entered elevation is not in the severe band and no neuromuscular/respiratory toxicity is entered. Queensland Health places its saline/loop clearance sequence under severe or symptomatic hypermagnesaemia; use clinical judgement, source control and serial review rather than reflex saline or diuresis.',
      {tone: values.toxicity === 'unknown' || values.ecg === 'unknown' ? 'attention' : undefined, resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renalClearance === 'unknown') {
    actions.push(action(
      'clarify-renal-clearance-before-forced-excretion',
      'clear',
      'Clarify renal clearance before fluid or diuresis',
      urgent ? 'Urgent review proceeds while renal status is assessed.' : undefined,
      'Severe renal dysfunction limits magnesium elimination. Unknown renal function is not evidence that a fluid-plus-diuretic strategy is safe. Review creatinine, urine output, fluid balance and dialysis context while escalating acute toxicity as needed.',
      {tone: urgent ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renalClearance === 'yes' || values.volumeUrine === 'oliguric') {
    actions.push(action(
      'renal-critical-care-discussion-for-limited-clearance',
      'clear',
      'Discuss urgent renal / critical-care clearance strategy',
      'Dialysis may be needed when clearance is limited.',
      'Queensland Health says dialysis may be needed in severe/symptomatic hypermagnesaemia. The SmPC says peritoneal dialysis or haemodialysis rapidly and effectively lower serum magnesium in severe renal dysfunction. This is an escalation decision based on the full clinical picture, not an automatic dialysis order.',
      {tone: urgent ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: SMPC},
    ));
    return;
  }

  switch (values.volumeUrine) {
    case 'unknown':
      actions.push(action(
        'assess-volume-and-urine-before-clearance-plan',
        'clear',
        'Assess volume tolerance and urine output before clearance plan',
        undefined,
        'Queensland Health’s renal-excretion strategy depends on an appropriate fluid and urine context. Do not infer euvolaemia, adequate urine output or safety of fluid/diuretic treatment from an unknown field.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'ready':
      actions.push(action(
      'support-renal-excretion-with-safe-fluid-plan',
      'clear',
      'Support renal excretion only with a safe fluid plan',
      'No fixed fluid volume or rate is selected here.',
      'For severe or symptomatic hypermagnesaemia, Queensland Health promotes kidney excretion with IV 0.9% sodium chloride, aiming for urine output of at least 60 mL/hour. Confirm fluid tolerance, renal function, cardiac status and actual urine response; the linked local saline product is identity only, not a default bolus or infusion.',
        {resourceGroup: 'isotonic-fluid'},
      ));
      break;
    case 'lowOutput':
      actions.push(action(
      'consider-loop-only-after-volume-review',
      'clear',
      'Consider a loop only after an assessed saline trial',
      'Only if saline has not achieved ≥60 mL/hour.',
      'For severe or symptomatic hypermagnesaemia, Queensland Health says IV frusemide can be added only when urine output cannot be achieved through the preceding sodium-chloride strategy. Reassess perfusion, volume status, kidney function and obstruction before choosing a loop diuretic; the local product link does not create a regimen.',
        {tone: 'attention', resourceGroup: 'diuretic'},
      ));
      break;
    case 'notReady':
      actions.push(action(
        'do-not-force-fluid-or-diuresis',
        'clear',
        'Do not force fluid or diuresis in an unsafe volume state',
        undefined,
        'The source excretion strategy is conditional on safe volume and urine status. Hypovolaemia, congestion or unclear fluid tolerance requires a clinician-led haemodynamic/renal plan rather than reflex saline or loop-diuretic use.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addMonitoring(actions, values) {
  if (!hasHighMagnesium(values) && !hasToxicConcern(values)) return;
  actions.push(action(
    'serial-magnesium-and-clinical-surveillance',
    'monitor',
    'Trend magnesium, renal function, ECG and clinical toxicity',
    'Set timing to severity, symptoms and the clearance strategy.',
    'Follow serial magnesium with renal function, calcium, potassium, reflexes, respiratory state, consciousness, blood pressure and ECG/rhythm when indicated. Calcium’s antagonism is transient, so an initial clinical response does not establish magnesium removal or safety. The selected sources do not provide one universal monitoring interval for every adult scenario.',
    {resourceGroup: 'monitoring', source: SMPC},
  ));
}

function stageNotes(values, actions) {
  const notes = {};
  if (!actions.some(item => item.stage === 'stabilize')) {
    if (values.toxicity === 'no' && values.ecg === 'no') {
      notes.stabilize = 'No toxicity or ECG concern is entered after assessment.';
    } else if (values.toxicity === 'unknown' || values.ecg === 'unknown') {
      notes.stabilize = 'Complete toxicity and ECG assessment before treating this stage as reassuring.';
    }
  }
  return notes;
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];
  addAssessment(actions, values);
  addStabilization(actions, values);
  addSourceActions(actions, values);
  addClearanceActions(actions, values);
  addMonitoring(actions, values);
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

const NTUH_PUBLIC_PRODUCT_SOURCES = Object.freeze([
  {
    "label": "NTUH product identity: Calglon Injection 10% (Ca 0.465 mEq/mL) 10 mL/amp (CAL1FA03; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=CAL1FA03",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  }
]);

export const config = {
  id: 'hypermagnesemia',
  title: 'Hypermagnesemia',
  reviewedAt: '2026-09-15',
  reviewLabel: 'Upgraded · hospital-source review',
  scope: 'Adult hypermagnesaemia toxicity, source control and clearance review.',
  reviewLimitations: [
    "NTUH public product pages were checked anonymously on 2026-11-07 for identity and label strength only. The catalog snapshot is dated 2026-08-28; these checks do not establish current stock, absence of an alternative, substitution, preparation, orderability or patient suitability.",
    'There is no current national-society HyperMg guideline used here. Queensland Health is a current state-health source and the UK SmPC is official product information; neither is a local NTUH protocol or a complete critical-care algorithm.',
    'This engine shows Queensland’s source calcium statement for severe/symptomatic toxicity, but does not translate it into a local ampoule, dilution, line, repeat dose, fluid volume, diuretic regimen or dialysis prescription.',
    'Fluid-supported excretion and furosemide are conditional on volume tolerance, urine output and renal function. The engine deliberately blocks a reflex fluid/diuretic action for oliguria, severe renal dysfunction, congestion/hypovolaemia or unknown clearance.',
    'Obstetric magnesium can be intentional for eclampsia/pre-eclampsia. Toxicity still requires emergency support, but the source directs obstetric coordination; this guide does not independently stop or alter maternal therapy.',
    'Calcium, furosemide and saline product listings establish product identity only, not orderability or a safe regimen.',
  ],
  sources: [QUEENSLAND, SMPC, ...NTUH_PUBLIC_PRODUCT_SOURCES],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm the high magnesium and toxicity, stabilize respiratory/cardiac risk, stop the source safely, then select clearance only after renal and volume review.',
    recognition: [
      'Queensland Health defines severe hypermagnesaemia as >2.5 mmol/L; clinical toxicity and trend remain decisive.',
      'Check reflexes, weakness/paralysis, respiratory state, consciousness, blood pressure, ECG/conduction, calcium, potassium and renal function.',
      'Review magnesium-containing prescribed, OTC and administered products, including antacids, enemas and supplements.',
    ],
    redFlags: [
      'Loss of deep-tendon reflexes, respiratory depression, paralysis, reduced consciousness, hypotension, bradycardia, conduction abnormality or arrhythmia.',
      'Magnesium >2.5 mmol/L, rapidly rising level, oliguria/anuria, severe renal dysfunction or dialysis context.',
      'Potential obstetric magnesium toxicity: obtain urgent support and coordinate with obstetrics before changing prescribed therapy.',
    ],
    steps: [
      {role: 'Confirm & expose risk', text: 'Verify magnesium and trend, then assess reflexes, breathing, consciousness, ECG and renal context. Unknown is not reassuring.'},
      {role: 'Stabilize toxicity', text: 'For confirmed high magnesium with toxicity, Queensland gives calcium gluconate 2.2 mmol in 0.9% sodium chloride over 5 minutes; repeat if needed. Its effect is immediate but transient and does not remove magnesium.'},
      {role: 'Stop source safely', text: 'Review and hold a non-obstetric magnesium source through the responsible team. In pregnancy/eclampsia context, contact obstetrics before altering prescribed therapy.'},
      {role: 'Lower magnesium safely', text: 'For severe or symptomatic HyperMg, use renal excretion measures only when volume tolerance and urine output are established. Consider a loop only after the source saline/urine strategy; limited clearance may need renal/critical-care discussion.'},
      {role: 'Monitor & escalate', text: 'Trend magnesium, calcium, potassium, renal function, reflexes, respiration and ECG/rhythm. Initial calcium response is not magnesium clearance.'},
    ],
    monitoring: [
      'Set serial magnesium and clinical observation timing to toxicity, kidney function and clearance strategy; do not apply one generic interval to every case.',
      'Document exposure cessation, urine output, fluid balance, ECG/rhythm, reflexes, respiratory state and changes in consciousness.',
      'For severe renal dysfunction, the SmPC says peritoneal dialysis or haemodialysis can rapidly lower magnesium, but the decision remains clinician-owned.',
    ],
    sources: [QUEENSLAND, SMPC, ...NTUH_PUBLIC_PRODUCT_SOURCES],
  },
};

export default config;
