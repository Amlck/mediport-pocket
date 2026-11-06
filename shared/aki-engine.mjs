// Source-reviewed, data-only configuration for the compact adult AKI guide.
// It deliberately exposes uncertainty and routes local resources; it does not
// calculate an AKI stage, prescribe a bolus, or create orders.

export const KDIGO_FINAL_SOURCE = 'https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf';
export const NICE_AKI_SOURCE = 'https://www.nice.org.uk/guidance/ng148/chapter/Recommendations';
export const KDIGO_STATUS_SOURCE = 'https://kdigo.org/guidelines/acute-kidney-injury/';
export const KDIGO_2026_DRAFT = 'https://kdigo.org/wp-content/uploads/2026/03/KDIGO-2026-AKI-AKD-Guideline-Public-Review-Draft-Mar-2026.pdf';

const KDIGO_FINAL = {
  label: 'KDIGO AKI guideline (2012 final)',
  url: KDIGO_FINAL_SOURCE,
};
const NICE_CURRENT = {
  label: 'NICE NG148 Acute kidney injury (updated October 2024)',
  url: NICE_AKI_SOURCE,
};

const fields = [
  {
    key: 'akiStatus',
    label: 'AKI status?',
    options: [
      ['unknown', 'Not verified'],
      ['confirmed', 'Criteria met · creatinine or urine'],
      ['possible', 'Change; timing/reference incomplete'],
      ['not-established', 'No AKI criteria established'],
    ],
    help: 'AKI needs time-linked evidence: creatinine rise at least 0.3 mg/dL within 48 hours, at least 1.5 times a known baseline within 7 days, or urine output below 0.5 mL/kg/hour for 6 hours. Do not invent a baseline or urine-output interval.',
  },
  {
    key: 'immediateComplication',
    label: 'Refractory life threat?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present'],
      ['no', 'Absent · assessed'],
    ],
    help: 'For this field, a refractory life threat means hyperkalaemia, metabolic acidosis, uraemic complications, fluid overload or pulmonary oedema that is not responding to medical management. It requires immediate escalation.',
  },
  {
    key: 'volumeState',
    label: 'Volume / perfusion picture?',
    options: [
      ['unknown', 'Unclear / mixed / not assessed'],
      ['depleted', 'Depletion likely (not haemorrhagic shock)'],
      ['shock', 'Shock / vasomotor shock'],
      ['overloaded', 'Congestion / fluid overload likely'],
      ['neither', 'Neither depletion nor congestion'],
    ],
    help: 'Choose this from the current physiology, not from AKI alone. The depletion option excludes haemorrhagic shock, which needs its own emergency haemorrhage pathway. Congestion does not make diuretics a treatment for AKI itself.',
  },
  {
    key: 'obstructionConcern',
    label: 'Obstruction or cause concern?',
    options: [
      ['unknown', 'Not assessed'],
      ['pyonephrosis', 'Suspected pyonephrosis'],
      ['risk-or-unknown-cause', 'Unknown cause or obstruction risk'],
      ['no', 'Cause identified; no obstruction risk'],
    ],
    help: 'Suspected pyonephrosis means possible infected upper-tract obstruction and needs immediate action. In AKI, an unknown cause or obstruction risk calls for urinary-tract ultrasound within 24 hours; suspected pyonephrosis needs ultrasound within 6 hours.',
  },
  {
    key: 'referralFeature',
    label: 'Nephrology referral feature?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present'],
      ['no', 'Absent · clear responding cause'],
    ],
    help: 'NICE advises nephrology discussion within 24 hours for possible specialist kidney disease (such as vasculitis, glomerulonephritis, tubulointerstitial nephritis or myeloma), no clear cause, inadequate response, AKI complications, stage 3 AKI, transplant, or CKD stage 4–5. A clear cause that responds promptly usually does not need routine referral, except in transplant recipients.',
  },
  {
    key: 'medicineRisk',
    label: 'Medicine / contrast risk?',
    options: [
      ['unknown', 'Not reconciled'],
      ['yes', 'Yes / possible'],
      ['no', 'No — reviewed'],
    ],
    help: 'Review potentially kidney-harmful or renally cleared medicines, interactions, therapeutic-drug monitoring needs and recent contrast. A changing creatinine does not prove stable drug clearance.',
  },
];

const stages = [
  {id: 'recognize', title: 'Recognize', empty: 'Verify the AKI data before assigning a stage.'},
  {id: 'threats', title: 'Treat life threats', empty: 'No medical-refractory RRT trigger entered.'},
  {id: 'perfusion', title: 'Assess perfusion', empty: 'AKI alone does not select a fluid maneuver.'},
  {id: 'cause', title: 'Look for cause', empty: 'Continue cause-directed assessment.'},
  {id: 'monitor', title: 'Monitor & refer', empty: 'Set follow-up to the clinical trajectory.'},
];
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function normalized(input = {}) {
  return Object.fromEntries(fields.map(field => {
    const valid = new Set(field.options.map(([value]) => value));
    return [field.key, valid.has(input[field.key]) ? input[field.key] : 'unknown'];
  }));
}

function action(id, stage, title, summary, detail, {
  tone,
  resourceGroup,
  related,
  sourceUrl = KDIGO_FINAL.url,
  sourceLabel = KDIGO_FINAL.label,
} = {}) {
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl,
    sourceLabel,
    ...(tone ? {tone} : {}),
    ...(resourceGroup ? {resourceGroup} : {}),
    ...(related ? {related} : {}),
  };
}

function addRecognition(actions, values) {
  if (values.akiStatus === 'confirmed') {
    actions.push(action(
      'stage-confirmed-aki',
      'recognize',
      'Stage AKI from creatinine and urine output',
      'Use the worse creatinine or urine-output stage.',
      'KDIGO defines AKI by a creatinine rise of at least 0.3 mg/dL in 48 hours, at least 1.5 times baseline within 7 days, or urine output below 0.5 mL/kg/hour for 6 hours. Confirm time-stamped values and the observed urine window; this guide does not calculate a stage.',
      {resourceGroup: 'monitoring'},
    ));
  } else if (values.akiStatus === 'possible') {
    actions.push(action(
      'verify-aki-reference-data',
      'recognize',
      'Verify the time-linked creatinine and urine window',
      undefined,
      'A change without a credible reference value, timing or observed urine-output interval cannot be staged from this guide. Obtain the actual values and trend; do not invent a baseline creatinine.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.akiStatus === 'unknown') {
    actions.push(action(
      'measure-aki-data',
      'recognize',
      'Establish creatinine trend and urine-output window',
      undefined,
      'Measure serum creatinine and document a defined urine-output observation interval when AKI is possible. AKI status remains unresolved until the timing and reference context are reviewed.',
      {tone: 'attention', resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else {
    actions.push(action(
      'no-aki-criteria-entered',
      'recognize',
      'AKI is not established by these findings',
      undefined,
      'Do not label or stage AKI from this form alone. Continue surveillance if risk remains, and use the active acute-illness pathway for the current presentation.',
      {resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }
}

function addThreats(actions, values) {
  if (values.immediateComplication === 'yes') {
    actions.push(action(
      'urgent-rrt-discussion',
      'threats',
      'Urgent nephrology / critical-care RRT discussion',
      'Do not wait for a creatinine or BUN threshold.',
      'NICE calls for immediate renal replacement therapy referral when hyperkalaemia, metabolic acidosis, uraemic complications, fluid overload or pulmonary oedema are not responding to medical management. KDIGO likewise calls for emergency RRT with life-threatening fluid, electrolyte or acid-base change. Treat the immediate complication in parallel.',
      {tone: 'urgent', related: ['hyperkalemia', 'acute-hypoxemia-dyspnea'], sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.immediateComplication === 'unknown') {
    actions.push(action(
      'assess-aki-life-threats',
      'threats',
      'Check K, acid-base, pulmonary oedema/overload and uraemia',
      undefined,
      'These complications determine emergency escalation; AKI severity or a single creatinine value does not substitute for their assessment. Escalate immediately for a concerning clinical trajectory.',
      {tone: 'attention', resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }
}

function addPerfusion(actions, values) {
  switch (values.volumeState) {
    case 'depleted':
      actions.push(action(
        'response-guided-isotonic-fluid',
        'perfusion',
        'Use response-guided isotonic crystalloid only if depletion is credible',
        'No fixed AKI bolus.',
        'KDIGO suggests isotonic crystalloid rather than colloid for intravascular-volume expansion in AKI or AKI risk when haemorrhagic shock is absent. Choose amount, rate and reassessment from perfusion, cardiac reserve, congestion and response; stop if congestion appears or perfusion fails to improve.',
        {resourceGroup: 'isotonic-fluid'},
      ));
      break;
    case 'shock':
      actions.push(action(
        'shock-resuscitation',
        'perfusion',
        'Treat shock with the local resuscitation plan',
        'Fluids and vasopressors are complementary in vasomotor shock.',
        'KDIGO recommends vasopressors together with fluids in vasomotor shock with or at risk for AKI. Its crystalloid recommendation excludes haemorrhagic shock, which needs its own emergency haemorrhage protocol. Do not use this guide to prescribe volume or a vasopressor dose.',
        {tone: 'urgent', resourceGroup: 'isotonic-fluid', related: ['sepsis-septic-shock']},
      ));
      break;
    case 'overloaded':
      actions.push(action(
        'avoid-reflex-fluid-loading',
        'perfusion',
        'Avoid reflex fluid loading; assess congestion',
        'Diuretics do not treat AKI itself.',
        'KDIGO advises against diuretics to treat AKI except for volume-overload management. Use a monitored, cause-specific congestion plan; refractory fluid overload or pulmonary oedema is an urgent RRT/critical-care issue.',
        {tone: 'attention', resourceGroup: 'monitoring', related: ['heart-failure', 'acute-hypoxemia-dyspnea']},
      ));
      break;
    case 'unknown':
      actions.push(action(
        'clarify-perfusion-versus-congestion',
        'perfusion',
        'Clarify perfusion versus congestion before fluid',
        undefined,
        'AKI alone does not establish intravascular depletion or fluid responsiveness. Assess haemodynamics, exam, input/output, weight and the response to any intervention before choosing fluids, diuresis or escalation.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addCauseActions(actions, values, needsAkiWorkup) {
  if (needsAkiWorkup) {
    actions.push(action(
      'urinalysis-and-cause-review',
      'cause',
      'Urinalysis and reversible-cause review',
      'Urine dipstick: blood, protein, leucocytes, nitrites and glucose.',
      'NICE calls for dipstick testing as soon as AKI is suspected or detected, with action on abnormal results. Review sepsis, haemodynamics, medicines/toxins, obstruction and systemic or nephritic features in parallel.',
      {resourceGroup: 'urine', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }

  if (values.obstructionConcern === 'pyonephrosis') {
    actions.push(action(
      'urgent-infected-obstruction',
      'cause',
      'Urgent urinary ultrasound and urology',
      'Suspected pyonephrosis: ultrasound within 6 hours.',
      'NICE calls for immediate urinary-tract ultrasound, performed within 6 hours, when pyonephrosis is suspected. Upper-tract obstruction with pyonephrosis, bilateral obstruction, a solitary kidney or AKI complications needs immediate urology referral.',
      {tone: 'urgent', resourceGroup: 'obstruction', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.obstructionConcern === 'risk-or-unknown-cause' && needsAkiWorkup) {
    actions.push(action(
      'urgent-obstruction-ultrasound',
      'cause',
      'Urgent urinary ultrasound',
      'No cause identified or obstruction risk: within 24 hours.',
      'NICE calls for urinary-tract ultrasound within 24 hours of assessment when AKI has no identified cause or obstruction risk is present. This does not replace immediate imaging for suspected infected obstruction.',
      {tone: 'attention', resourceGroup: 'obstruction', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.obstructionConcern === 'risk-or-unknown-cause') {
    actions.push(action(
      'obstruction-concern-outside-aki-definition',
      'cause',
      'Escalate the obstruction concern',
      'AKI is not established by these entries.',
      'An obstruction concern remains clinically actionable even though this form has not established AKI. Use the active urology or acute-presentation pathway. The NICE 24-hour AKI ultrasound timing cannot be inferred until AKI is suspected or detected.',
      {tone: 'attention', resourceGroup: 'obstruction', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.obstructionConcern === 'unknown' && needsAkiWorkup) {
    actions.push(action(
      'check-obstruction-risk',
      'cause',
      'Check retention and obstruction risk',
      undefined,
      'Review urinary symptoms, bladder emptying, urological history and whether the AKI cause is identified. Do not order a routine renal ultrasound solely because AKI is present when a cause is already clear.',
      {tone: 'attention', resourceGroup: 'obstruction', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }

  if (!needsAkiWorkup) return;

  if (values.medicineRisk === 'yes') {
    actions.push(action(
      'medication-and-contrast-review',
      'cause',
      'Review medicines, nephrotoxins and contrast urgency',
      undefined,
      'Reconcile renally cleared and potentially kidney-harmful medicines with a pharmacist; use drug-specific acute guidance and therapeutic levels where relevant. Do not use a single eGFR or Cockcroft–Gault result during changing creatinine as proof of stable drug clearance. Emergency contrast imaging should not be delayed when the delay is clinically significant.',
      {resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.medicineRisk === 'unknown') {
    actions.push(action(
      'reconcile-aki-medications',
      'cause',
      'Reconcile kidney-relevant medicines and recent contrast',
      undefined,
      'Check nephrotoxins, renally cleared medicines, interactions, recent contrast and active therapeutic-drug monitoring needs. NICE recommends pharmacist advice for medicine optimisation and dosing in AKI or AKI risk.',
      {tone: 'attention', resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }
}

function addMonitoringAndReferral(actions, values, needsAkiWorkup) {
  if (needsAkiWorkup) {
    actions.push(action(
      'trend-kidney-function-and-urine',
      'monitor',
      'Set the next creatinine, electrolytes and urine-output window',
      'Daily creatinine is typical in hospital; increase to clinical need.',
      'Trend serum creatinine and a defined urine-output interval with potassium, acid-base state, volume balance and response to interventions. KDIGO recommends monitoring creatinine and urine output to stage severity; NICE says frequency varies with clinical need and daily creatinine is typical in hospital.',
      {resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }

  if (values.referralFeature === 'yes' && values.immediateComplication !== 'yes') {
    actions.push(action(
      'nephrology-discussion-within-24h',
      'monitor',
      'Discuss with nephrology within 24 hours',
      'Stage 3, unclear/nonresponsive, complication, transplant/CKD4–5 or specialist disease.',
      'NICE lists possible specialist disease (for example vasculitis, glomerulonephritis, tubulointerstitial nephritis or myeloma), no clear cause, inadequate response, AKI complications, stage 3 AKI, transplant and CKD stage 4–5 as reasons for discussion within 24 hours. Immediate RRT indications override this timing.',
      {tone: 'attention', resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  } else if (values.referralFeature === 'unknown' && needsAkiWorkup && values.immediateComplication !== 'yes') {
    actions.push(action(
      'check-nephrology-referral-criteria',
      'monitor',
      'Check nephrology-referral criteria',
      undefined,
      'Establish AKI stage, cause, response, complications, transplant status and advanced CKD status. A clear cause that responds promptly generally does not need routine nephrology referral, except in transplant recipients.',
      {tone: 'attention', resourceGroup: 'monitoring', sourceUrl: NICE_CURRENT.url, sourceLabel: NICE_CURRENT.label},
    ));
  }
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];
  const needsAkiWorkup = values.akiStatus !== 'not-established';

  addRecognition(actions, values);
  addThreats(actions, values);
  addPerfusion(actions, values);
  addCauseActions(actions, values, needsAkiWorkup);
  addMonitoringAndReferral(actions, values, needsAkiWorkup);

  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions};
}

export const config = {
  id: 'aki',
  title: 'Acute Kidney Injury',
  reviewedAt: '2026-09-15',
  scope: 'Adult AKI recognition, escalation, cause review and monitoring.',
  reviewLimitations: [
    'The final KDIGO AKI guideline currently available is the 2012 guideline. The KDIGO 2027 AKI/AKD document released for public review in March 2026 is a public-review draft whose own cover says it may change and should not be used beyond its review purpose; it is recorded for currency status, not used for clinical branches.',
    'NICE NG148 was last updated October 2024, with 2024 changes focused on iodinated-contrast risk assessment. It supplies current UK timing and referral recommendations used here.',
    'This is not a numeric AKI-stage calculator, a complete differential diagnosis, a fluid-order protocol, a diuretic order, an RRT modality/order interface, or a safe acute drug-dose calculator.',
    'A changing creatinine does not establish stable renal drug clearance. Medication choice, dose and monitoring require drug-specific acute guidance, pharmacist input and therapeutic levels where relevant.',
    'Local product availability, ultrasound access, medical/surgical/urology pathways, goals-of-care discussions and clinician validation remain outside this prototype.',
  ],
  sources: [
    KDIGO_FINAL,
    NICE_CURRENT,
    {label: 'KDIGO 2027 AKI/AKD — March 2026 public-review draft, not final guidance', url: KDIGO_STATUS_SOURCE},
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm actual creatinine/urine timing, treat complications first, choose fluid strategy from physiology, then find the cause and set monitoring/referral.',
    recognition: [
      'KDIGO AKI: creatinine rise ≥0.3 mg/dL in 48 h, ≥1.5× baseline within 7 days, or urine output <0.5 mL/kg/h for 6 h.',
      'Use the worse creatinine or urine-output stage; do not invent a baseline or a urine-output window.',
      'A changing creatinine is not a stable eGFR/CrCl drug-clearance estimate.',
    ],
    redFlags: [
      'Hyperkalaemia, metabolic acidosis, pulmonary oedema/fluid overload or uraemic complication not responding to medical management.',
      'Suspected infected obstruction/pyonephrosis, anuria, shock, rapidly worsening trajectory or impaired oxygenation.',
      'Stage 3, transplant, CKD stage 4–5, unclear/nonresponsive AKI, complication or suspected specialist kidney disease.',
    ],
    steps: [
      {role: 'Recognize', text: 'Confirm time-stamped creatinine and observed urine output; stage by the worse criterion.'},
      {role: 'Treat immediate threats', text: 'Escalate refractory potassium, acid-base, uraemic or pulmonary-oedema/fluid-overload complications without waiting for a creatinine threshold.', tools: ['hyperkalemia', 'acute-hypoxemia-dyspnea']},
      {role: 'Match perfusion strategy to physiology', text: 'Use isotonic crystalloid only for credible depletion and reassess response; avoid reflex fluid loading in congestion. Vasomotor shock requires a local fluids-plus-vasopressor plan.'},
      {role: 'Find cause', text: 'Urinalysis promptly; ultrasound within 6 h for suspected pyonephrosis and within 24 h for unknown cause/obstruction risk. Review medicines and contrast urgency.'},
      {role: 'Monitor and refer', text: 'Set creatinine, electrolyte and urine-output timing; discuss qualifying AKI with nephrology within 24 h, or immediately for RRT indications.'},
    ],
    monitoring: [
      'Monitor serum creatinine and a defined urine-output interval; daily creatinine is typical in hospital but frequency follows clinical need.',
      'Trend potassium, acid-base status, volume balance, weight/congestion and response to each intervention.',
      'After AKI, monitor creatinine based on stability and degree of recovery; NICE considers nephrology referral after recovery when eGFR is 30 mL/min/1.73 m² or less.',
    ],
    sources: [
      {label: 'KDIGO 2012 — AKI definition/staging, management and RRT criteria', url: KDIGO_FINAL_SOURCE},
      {label: 'NICE NG148 — detection, obstruction imaging, RRT and nephrology referral', url: NICE_AKI_SOURCE},
    ],
  },
};

export default config;
