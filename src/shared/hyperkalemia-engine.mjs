// Source-reviewed, data-only adapter for the Hyperkalemia prototype.
//
// It preserves the reviewed priority branches while separating the initial
// assessment from after-treatment surveillance. The renderer owns session
// state and local-reference presentation; this module makes no DOM, chart, or
// order changes.

export const HYPERKALEMIA_SOURCE = 'https://www.ukkidney.org/sites/default/files/documents/FINAL%20VERSION%20-%20UKKA%20CLINICAL%20PRACTICE%20GUIDELINE%20-%20MANAGEMENT%20OF%20HYPERKALAEMIA%20IN%20ADULTS%20-%20UPDATED%20JULY%202026_0.pdf';

const source = Object.freeze({
  label: 'UK Kidney Association Hyperkalaemia Guideline — July 2026; hospital recommendations 13–22 and Appendix 7',
  url: HYPERKALEMIA_SOURCE,
});

const INITIAL_FIELDS = Object.freeze([
  Object.freeze({
    key: 'instability',
    label: 'Airway, breathing, circulation or consciousness compromised?',
    options: Object.freeze([
      Object.freeze(['unknown', 'Uncertain / not assessed']),
      Object.freeze(['yes', 'Yes']),
      Object.freeze(['no', 'No — assessed']),
    ]),
  }),
  Object.freeze({
    key: 'potassium',
    label: 'Current credible potassium result (mmol/L)',
    options: Object.freeze([
      Object.freeze(['unknown', 'Unknown / result not yet verified']),
      Object.freeze(['below', 'Below 5.5']),
      Object.freeze(['mild', '5.5 to below 6.0']),
      Object.freeze(['moderate', '6.0 to below 6.5']),
      Object.freeze(['severe', '6.5 or higher']),
    ]),
  }),
  Object.freeze({
    key: 'ecg',
    label: 'ECG changes attributed to hyperkalemia?',
    options: Object.freeze([
      Object.freeze(['unknown', 'ECG not reviewed / uncertain']),
      Object.freeze(['yes', 'Present']),
      Object.freeze(['no', 'Absent on reviewed ECG']),
    ]),
  }),
  Object.freeze({
    key: 'trajectory',
    label: 'Clinically unwell or a rapid potassium rise anticipated?',
    options: Object.freeze([
      Object.freeze(['unknown', 'Uncertain / not assessed']),
      Object.freeze(['yes', 'Yes']),
      Object.freeze(['no', 'No — assessed']),
    ]),
  }),
  Object.freeze({
    key: 'dialysis',
    label: 'Does the patient receive maintenance hemodialysis?',
    options: Object.freeze([
      Object.freeze(['unknown', 'Unknown']),
      Object.freeze(['yes', 'Yes']),
      Object.freeze(['no', 'No']),
    ]),
  }),
]);

const FOLLOWUP_FIELDS = Object.freeze([
  Object.freeze({
    key: 'insulinGiven',
    label: 'Insulin/glucose given?',
    options: Object.freeze([
      Object.freeze(['unknown', 'Unknown']),
      Object.freeze(['yes', 'Yes']),
      Object.freeze(['no', 'No']),
    ]),
  }),
  Object.freeze({
    key: 'potassiumResponse',
    label: 'Potassium response',
    options: Object.freeze([
      Object.freeze(['unknown', 'Not checked / uncertain']),
      Object.freeze(['persistent', 'Persistent / recurrent']),
      Object.freeze(['improving', 'Improving']),
    ]),
  }),
]);

export const HYPERKALEMIA_FIELDS = Object.freeze([
  Object.freeze({
    key: 'phase',
    label: 'Review phase',
    options: Object.freeze([
      Object.freeze(['unknown', 'Not selected']),
      Object.freeze(['initial', 'Initial assessment']),
      Object.freeze(['followup', 'After treatment']),
    ]),
  }),
  ...INITIAL_FIELDS,
  ...FOLLOWUP_FIELDS,
]);

const validValues = Object.freeze(Object.fromEntries(
  HYPERKALEMIA_FIELDS.map(field => [field.key, new Set(field.options.map(([value]) => value))]),
));

const SOURCE_LABEL = source.label;
const INITIAL_STAGE_IDS = Object.freeze(['assess', 'protect', 'shift', 'remove', 'reassess']);
const FOLLOWUP_STAGE_IDS = Object.freeze(['reassess']);
const STAGE_BY_ACTION_ID = Object.freeze({
  emergency: 'assess',
  'assess-stability': 'assess',
  discordant: 'assess',
  monitor: 'assess',
  'monitor-context': 'assess',
  ecg: 'assess',
  verify: 'assess',
  mild: 'assess',
  below: 'assess',
  calcium: 'protect',
  shift: 'shift',
  dialysis: 'remove',
  renal: 'remove',
  removal: 'remove',
  'potassium-followup': 'reassess',
});
const RESOURCE_GROUP_BY_ACTION_ID = Object.freeze({
  calcium: 'calcium',
  monitor: 'monitoring',
  'monitor-context': 'monitoring',
  ecg: 'ecg',
  shift: 'shift',
  removal: 'removal',
  'potassium-followup': 'recheck',
  verify: 'workup',
  mild: 'workup',
});
const COMPACT_ACTION_TITLES = Object.freeze({
  emergency: 'Emergency support now',
  'assess-stability': 'Assess ABC / consciousness',
  discordant: 'Reconcile ECG and potassium urgently',
  calcium: 'IV calcium for hyperkalemic ECG changes',
  monitor: 'Continuous cardiac monitoring',
  'monitor-context': 'Assess illness / rapid-rise risk for monitoring',
  ecg: 'Urgent 12-lead ECG',
  dialysis: 'Urgent dialysis · maintenance HD + K ≥6.5',
  renal: 'Urgent renal / critical-care review',
  removal: 'Review SZC / patiromer and definitive removal',
  'potassium-followup': 'K: 1, 2, 4, 6 and 24 hours',
  mild: 'Review causes, trend and repeat K',
  verify: 'Verify potassium / sample quality',
  below: 'Review trend or post-treatment response',
});

export function normalizeHyperkalemia(input = {}) {
  return Object.fromEntries(HYPERKALEMIA_FIELDS.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

/**
 * Keeps the mutually exclusive initial and after-treatment assessments apart.
 * Hidden values stay in session state but cannot affect the active phase.
 */
export function visibleFieldKeys(input = {}) {
  const values = normalizeHyperkalemia(input);
  if (values.phase === 'initial') return Object.freeze(['phase', ...INITIAL_FIELDS.map(field => field.key)]);
  if (values.phase === 'followup') return Object.freeze(['phase', ...FOLLOWUP_FIELDS.map(field => field.key)]);
  return Object.freeze(['phase']);
}

function card(id, title, reason, text, section, tone = 'normal') {
  return { id, title, reason, text, section, tone };
}

function actionFromCard(item) {
  const resourceGroup = RESOURCE_GROUP_BY_ACTION_ID[item.id];
  const summary = item.id === 'shift'
    ? `${item.reason} Regular insulin 10 units IV + glucose 25 g IV. Check baseline glucose; arrange surveillance. Salbutamol 10–20 mg nebulized: adjunct only.`
    : item.reason;
  return {
    id: item.id,
    stage: STAGE_BY_ACTION_ID[item.id] || 'assess',
    title: COMPACT_ACTION_TITLES[item.id] || item.title,
    summary,
    detail: item.text,
    sourceUrl: source.url,
    sourceLabel: SOURCE_LABEL,
    sourceSection: item.section,
    ...(item.tone !== 'normal' ? { tone: item.tone } : {}),
    ...(resourceGroup ? { resourceGroup } : {}),
  };
}

function makeAction(id, title, summary, detail, section, extra = {}) {
  return {
    id,
    stage: 'reassess',
    title,
    ...(summary ? { summary } : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: SOURCE_LABEL,
    sourceSection: section,
    ...extra,
  };
}

/**
 * Exact clinical branch extraction from the reviewed compact prototype. It is
 * kept separate from rendering so the main app can use flat staged actions.
 */
export function hyperkalemiaInitialPriorities(input = {}) {
  const values = normalizeHyperkalemia({ ...input, phase: 'initial' });
  const cards = [];
  const withheld = [];
  const severe = values.potassium === 'severe';
  const moderate = values.potassium === 'moderate';
  const elevated = ['mild', 'moderate', 'severe'].includes(values.potassium);
  const toxic = values.ecg === 'yes';

  if (values.instability === 'yes') {
    cards.push(card(
      'emergency',
      'Activate emergency clinical support',
      'Compromised airway, breathing, circulation or consciousness takes priority.',
      'Begin immediate bedside resuscitation/escalation using the local emergency pathway. This adult hospital reference does not replace the cardiac-arrest algorithm. Do not wait to finish this form.',
      '19.3–19.4; 23–26',
      'urgent',
    ));
  } else if (values.instability === 'unknown') {
    cards.push(card(
      'assess-stability',
      'Assess immediate stability now',
      'Stability has not been established.',
      'Review airway, breathing, circulation and consciousness at the bedside; obtain complete observations and escalate on clinical concern. Unknown is not a negative finding.',
      '13.1–13.2',
      'attention',
    ));
  }

  if (severe && values.dialysis === 'yes') {
    cards.push(card(
      'dialysis',
      'Arrange urgent dialysis',
      'K ≥6.5 mmol/L in a maintenance-hemodialysis patient.',
      'Seek urgent renal input. If dialysis is not immediately available, use standard potassium-lowering medical therapy while arranging it. Toxic ECG changes still require IV calcium even when dialysis is immediately available.',
      '18.1–18.3',
      'urgent',
    ));
  } else if (severe) {
    cards.push(card(
      'renal',
      'Seek urgent renal / critical-care input',
      'K ≥6.5 mmol/L remains severe even with a reassuring ECG.',
      `Arrange monitored care and urgent specialist review. Life-threatening or treatment-resistant hyperkalemia requires an urgent specialist decision about renal replacement therapy.${values.dialysis === 'unknown' ? ' Clarify hemodialysis status; it changes the dialysis recommendation.' : ''}`,
      '19.1–19.6',
      'urgent',
    ));
  }

  if (values.potassium === 'below' && toxic) {
    cards.push(card(
      'discordant',
      'Reconcile the ECG and potassium findings urgently',
      'The selected ECG attribution conflicts with a K below 5.5 mmol/L.',
      'Review timing, sample validity, ECG interpretation and alternative causes with a senior clinician. This tool does not infer a hyperkalemia drug indication from discordant entries.',
      '13–15',
      'urgent',
    ));
  } else if (toxic && (elevated || values.potassium === 'unknown')) {
    cards.push(card(
      'calcium',
      'Protect the heart: IV calcium',
      'ECG changes attributed to hyperkalemia are present.',
      'UKKA suggests IV calcium for hyperkalemia with ECG changes (16.2a, grade 2C). The guideline-equivalent calcium dose is 6.8 mmol: calcium gluconate 10% 30 mL over 10 minutes outside resuscitation, or calcium chloride 10% 10 mL over 5 minutes in arrest/peri-arrest. Reassess the ECG. Calcium does not lower potassium. Confirm the actual local product, concentration and protocol before use.',
      '16.2a–b',
      'urgent',
    ));
  } else if (values.ecg === 'no') {
    withheld.push('IV calcium: not prioritized solely from the potassium value when ECG changes are absent. This does not reduce the urgency of severe hyperkalemia.');
  }

  if (severe || toxic || (moderate && values.trajectory === 'yes')) {
    cards.push(card(
      'monitor',
      'Use continuous cardiac monitoring',
      severe
        ? 'K ≥6.5 mmol/L.'
        : toxic
          ? 'Hyperkalemic ECG changes are present.'
          : 'K 6.0–6.4 mmol/L with clinical illness or anticipated rapid rise.',
      'UKKA specifies at least continuous 3-lead monitoring in an appropriately staffed setting. A 12-lead ECG and continuous monitoring serve different purposes.',
      '14.1–14.2',
    ));
  } else if (moderate && values.trajectory === 'unknown') {
    cards.push(card(
      'monitor-context',
      'Clarify the need for continuous monitoring',
      'K 6.0–6.4 mmol/L; illness/trajectory is unknown.',
      'Assess whether the patient is clinically unwell or a rapid rise is anticipated; either supports continuous monitoring in this potassium range.',
      '14.2',
      'attention',
    ));
  }

  if (values.ecg === 'unknown' && (severe || moderate || values.instability === 'yes')) {
    cards.push(card(
      'ecg',
      'Obtain and review the ECG',
      severe || moderate ? 'K ≥6.0 mmol/L requires an urgent 12-lead ECG.' : 'ECG status is unknown.',
      'Review for hyperkalemic toxicity promptly. In emergencies obtain point-of-care potassium while awaiting formal laboratory measurement. Do not let an unavailable ECG delay urgent management of severe hyperkalemia.',
      '14.1; 15.2',
      'attention',
    ));
  }

  if (severe || moderate) {
    cards.push(card(
      'shift',
      severe ? 'Lower potassium: insulin/glucose' : 'Consider insulin/glucose',
      severe
        ? 'K ≥6.5: UKKA recommends insulin/glucose (1B).'
        : 'K 6.0–6.4: UKKA suggests insulin/glucose (2C); this is not the same recommendation strength as severe hyperkalemia.',
      'Reference regimen: soluble insulin 10 units with glucose 25 g IV. Review baseline glucose and establish surveillance before treatment. If pretreatment glucose is <7 mmol/L (126 mg/dL), UKKA adds 10% glucose at 50 mL/hour for 5 hours. Nebulized salbutamol 10–20 mg is an adjunct (recommended in severe, suggested in moderate cases); never use it alone for severe hyperkalemia. Confirm local products and delivery protocol.',
      '16.3.1–16.4.3',
    ));
    cards.push(card(
      'removal',
      severe ? 'Plan potassium removal now' : 'Review potassium-removal options',
      'Insulin/glucose and salbutamol shift potassium temporarily; they do not remove it.',
      'UKKA recommends sodium zirconium cyclosilicate in severe cases and suggests considering it in moderate cases; patiromer is an option at K ≥6.0. Dialysis depends on urgency, kidney status and response. Binders do not replace immediate stabilization. IV bicarbonate and calcium resonium are not routine acute treatments. See full reference for binder details.',
      '16.5–16.6; 18–19',
    ));
    cards.push(card(
      'potassium-followup',
      'Schedule response and rebound checks',
      'Moderate/severe hyperkalemia needs early reassessment.',
      'UKKA suggests potassium measurements at least at 1, 2, 4, 6 and 24 hours after identification and treatment. Set actual times from the clinical episode; a generic Q6H schedule misses the early checks. Use the After treatment view for insulin-related glucose surveillance.',
      '17.1.1–17.2',
    ));
  } else if (values.potassium === 'mild') {
    cards.push(card(
      'mild',
      'Review causes and repeat-potassium plan',
      'K 5.5 to below 6.0 mmol/L; no severe potassium threshold has been entered.',
      'Review the sample, potassium trend, kidney function, acid-base/glucose context and contributory medicines. Choose monitoring and treatment using the whole clinical picture. Clinical instability or ECG toxicity still takes priority above.',
      '13; 15; 17.1.1; 21',
    ));
    withheld.push('Insulin/glucose: the moderate/severe potassium-band recommendation is not triggered by this value alone.');
  } else if (values.potassium === 'unknown') {
    cards.push(card(
      'verify',
      'Establish a credible potassium result',
      'Potassium severity is unresolved.',
      'Review sampling/hemolysis and trend. In emergencies use arterial or venous point-of-care potassium while awaiting formal laboratory measurement. For suspected pseudohyperkalemia, UKKA describes paired lithium-heparin and clotted-serum samples with prompt analysis. Do not delay emergency care when clinically indicated.',
      '15.1–15.3',
      'attention',
    ));
  } else {
    cards.push(card(
      'below',
      'Review the reason for this pathway',
      'The entered potassium band is below the hyperkalemia threshold.',
      'Check whether this is a post-treatment result, a changing trend or a sampling/interpretation issue. Use After treatment when reviewing response. This value alone does not establish that the episode is resolved.',
      '13; 17.1.1',
    ));
  }

  const priority = Object.freeze({
    emergency: 0,
    'assess-stability': 1,
    discordant: 1,
    calcium: 2,
    monitor: 3,
    dialysis: 4,
    renal: 4,
    ecg: 5,
    shift: 6,
    removal: 7,
    'potassium-followup': 8,
  });
  cards.sort((left, right) => (priority[left.id] ?? 5) - (priority[right.id] ?? 5));
  return {
    values,
    cards,
    withheld,
    gaps: Object.entries(values)
      .filter(([key, value]) => key !== 'phase' && value === 'unknown')
      .map(([key]) => HYPERKALEMIA_FIELDS.find(field => field.key === key).label),
  };
}

function initialStageNotes(values) {
  return Object.freeze({
    assess: 'Review ECG, sample, trend and causes.',
    protect: values.ecg === 'no'
      ? 'ECG changes absent: no calcium trigger from K alone.'
      : 'Review ECG to assess the need for IV calcium.',
    shift: values.potassium === 'mild'
      ? 'K 5.5–5.9: no insulin/glucose trigger from K alone.'
      : 'Select a credible K value to assess lowering therapy.',
    remove: 'Review causes and kidney function; removal depends on severity.',
    reassess: 'Set the next K check from severity and treatment.',
  });
}

function afterTreatmentActions(values) {
  const actions = [makeAction(
    'recheck',
    'K: 1, 2, 4, 6 and 24 hours',
    'After identification and treatment of moderate/severe hyperkalemia.',
    'UKKA suggests potassium checks at 1, 2, 4, 6 and 24 hours. Use actual episode times and watch for rebound.',
    '17.1.1–17.1.2',
    { resourceGroup: 'recheck' },
  )];

  if (values.insulinGiven === 'yes') {
    actions.push(makeAction(
      'glucose',
      'Glucose: 0, 30, 60, 90, 120, 180, 240, 300, 360 min',
      'After insulin/glucose administration.',
      'Check glucose at 0, 30, 60, 90, 120, 180, 240, 300 and 360 minutes after insulin/glucose. Repeated treatment or risk factors may need extended review.',
      '17.2',
      { tone: 'attention', resourceGroup: 'glucose' },
    ));
  } else if (values.insulinGiven === 'unknown') {
    actions.push(makeAction(
      'unknown-insulin',
      'Confirm whether insulin/glucose was given',
      'Administration is unresolved.',
      'Check administration records and actual timing before resolving glucose surveillance.',
      '17.2',
      { tone: 'attention', resourceGroup: 'glucose' },
    ));
  }

  if (values.potassiumResponse === 'persistent') {
    actions.push(makeAction(
      'failed',
      'Escalate persistent / recurrent hyperkalemia',
      'Persistent/recurrent potassium elevation.',
      'Seek prompt renal/critical-care review; reassess shifting therapy and definitive removal. Life-threatening or medically resistant hyperkalemia needs an urgent specialist RRT decision.',
      '19.3; 19.6',
      { tone: 'urgent' },
    ));
  }

  return actions;
}

export function evaluate(input = {}) {
  const values = normalizeHyperkalemia(input);
  if (values.phase === 'unknown') {
    return {
      values,
      actions: [
        {
          id: 'select-review-phase',
          stage: 'assess',
          title: 'Select the review phase',
          summary: 'Initial assessment and after-treatment surveillance use different findings.',
          detail: 'Choose whether this review is for the initial hyperkalemia assessment or after treatment. A phase that has not been selected does not establish an initial-treatment or post-treatment recommendation.',
          sourceUrl: source.url,
          sourceLabel: SOURCE_LABEL,
          sourceSection: '13–22',
          tone: 'attention',
        },
      ],
      stageNotes: Object.freeze({
        assess: 'Choose a phase before reviewing tailored actions.',
      }),
      visibleStageIds: Object.freeze(['assess']),
      withheld: Object.freeze([]),
      gaps: Object.freeze(['Review phase']),
    };
  }

  if (values.phase === 'followup') {
    const actions = afterTreatmentActions(values);
    return {
      values,
      actions,
      stageNotes: Object.freeze({
        reassess: values.potassiumResponse === 'improving'
          ? 'Continue rebound surveillance.'
          : values.potassiumResponse === 'unknown'
            ? 'Review a timed potassium result.'
            : 'Escalate the persistent or recurrent result while reviewing definitive removal.',
      }),
      visibleStageIds: FOLLOWUP_STAGE_IDS,
      withheld: Object.freeze(values.insulinGiven === 'no'
        ? ['Insulin/glucose not given; post-insulin schedule does not apply.']
        : []),
      gaps: Object.freeze(Object.entries(values)
        .filter(([key, value]) => ['insulinGiven', 'potassiumResponse'].includes(key) && value === 'unknown')
        .map(([key]) => HYPERKALEMIA_FIELDS.find(field => field.key === key).label)),
    };
  }

  const initial = hyperkalemiaInitialPriorities(values);
  return {
    values,
    actions: initial.cards.map(actionFromCard),
    stageNotes: initialStageNotes(values),
    visibleStageIds: INITIAL_STAGE_IDS,
    withheld: initial.withheld,
    gaps: initial.gaps,
  };
}

export const config = Object.freeze({
  id: 'hyperkalemia',
  title: 'Hyperkalemia',
  reviewedAt: '2026-09-09',
  scope: 'Adult acute hyperkalemia: initial priority review and separate after-treatment surveillance.',
  reviewLabel: 'Upgraded · source reviewed; historical local references',
  reviewLimitations: Object.freeze([
    'This is adult acute decision support, not a cardiac-arrest algorithm, local protocol, prescription, order set, medication-administration record, or authorization.',
    'The July 2026 UKKA source review guides this engine; local hyperkalaemia order sets require separate reconciliation.',
    'Product identity, current availability/orderability, prepared concentration, device/pump settings, route, dose, and patient-specific suitability require separate local verification.',
    'The phase selector intentionally keeps initial findings and post-treatment response apart; a potassium fall does not establish episode resolution or a safe disposition.',
  ]),
  sources: Object.freeze([source]),
  fields: HYPERKALEMIA_FIELDS,
  stages: Object.freeze([
    Object.freeze({ id: 'assess', title: 'Assess & monitor', empty: 'Review ECG, sample, trend and causes.' }),
    Object.freeze({ id: 'protect', title: 'Protect the heart', empty: 'Review ECG to assess the need for IV calcium.' }),
    Object.freeze({ id: 'shift', title: 'Shift potassium', empty: 'Select a credible K value to assess lowering therapy.' }),
    Object.freeze({ id: 'remove', title: 'Remove potassium', empty: 'Review causes and kidney function; removal depends on severity.' }),
    Object.freeze({ id: 'reassess', title: 'Reassess', empty: 'Set the next K check from severity and treatment.' }),
  ]),
  visibleFieldKeys,
  evaluate,
  quickReference: Object.freeze({
    summary: 'Prioritize clinical stability, potassium severity, ECG findings and dialysis context; treatment and reassessment run in parallel.',
    recognition: Object.freeze([
      'Review the potassium value, sample quality/hemolysis, renal function, acid-base state, glucose, medications, intake, and recent potassium trend.',
      'Obtain or review an ECG promptly for clinically significant hyperkalemia; a reassuring ECG does not exclude risk.',
      'Treat a dangerous presentation without waiting for a repeat result when the clinical picture and initial value are credible.',
    ]),
    redFlags: Object.freeze([
      'Compromised airway, breathing, circulation or consciousness; K ≥6.5 mmol/L; hyperkalemic ECG changes; or rapidly rising potassium/clinical illness.',
      'Maintenance hemodialysis with K ≥6.5 mmol/L, treatment-resistant hyperkalemia, or persistent/recurrent potassium elevation after treatment.',
      'Unknown stability, potassium, ECG or hemodialysis status does not establish a lower-risk route.',
    ]),
    steps: Object.freeze([
      Object.freeze({
        role: 'Protect the heart',
        text: 'UKKA 16.2a suggests IV calcium for hyperkalemia with ECG changes (grade 2C, updated July 2026). Use calcium chloride in arrest/peri-arrest and calcium gluconate otherwise. Calcium protects the heart temporarily but does not lower potassium.',
      }),
      Object.freeze({
        role: 'Shift potassium',
        text: 'UKKA recommends insulin/glucose for K ≥6.5 mmol/L and suggests it for K 6.0–6.4 mmol/L. Salbutamol is an adjunct, not monotherapy for severe hyperkalemia. Baseline glucose and post-treatment glucose surveillance are essential.',
      }),
      Object.freeze({
        role: 'Remove potassium',
        text: 'UKKA recommends sodium zirconium cyclosilicate in severe hyperkalemia and suggests considering it in moderate hyperkalemia; patiromer is an option at K ≥6.0. Severe hyperkalemia in maintenance-hemodialysis patients requires urgent dialysis. Binders do not replace immediate stabilization. IV bicarbonate and calcium resonium are not routine acute treatments.',
      }),
    ]),
    monitoring: Object.freeze([
      'UK Kidney Association suggests potassium checks at least 1, 2, 4, 6, and 24 hours after identifying and treating moderate or severe hyperkalemia.',
      'After insulin/glucose, use timed glucose surveillance through 6 hours because delayed hypoglycemia can occur.',
      'Document whether each intervention stabilizes, shifts, or removes potassium so temporary improvement is not mistaken for definitive control.',
    ]),
    sources: Object.freeze([source]),
  }),
});

export default config;
