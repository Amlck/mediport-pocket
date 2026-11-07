// Source-reviewed, data-only decision support for adult atrial fibrillation
// with rapid ventricular response. The renderer owns session state, resource
// presentation and all clinical-system boundaries. This module only turns
// explicitly entered categorical findings into reviewable actions.

export const ACC_AHA_AF_2023_SOURCE = 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193';
export const ESC_AF_2024_SOURCE = 'https://academic.oup.com/eurheartj/article/45/36/3314/7738779';
export const AHA_ACLS_TACHYCARDIA_2025_SOURCE = 'https://cpr.heart.org/-/media/CPR-Files/CPR-Guidelines-Files/2025-Algorithms/Algorithm-ACLS-Tachycardia-250514.pdf';

const acc2023 = Object.freeze({
  label: '2023 ACC/AHA/ACCP/HRS atrial fibrillation guideline',
  url: ACC_AHA_AF_2023_SOURCE,
});
const esc2024 = Object.freeze({
  label: '2024 ESC/EACTS atrial fibrillation guideline',
  url: ESC_AF_2024_SOURCE,
});
const ahaAcls2025 = Object.freeze({
  label: '2025 AHA Adult Tachyarrhythmia With a Pulse Algorithm',
  url: AHA_ACLS_TACHYCARDIA_2025_SOURCE,
});

const STAGE_ORDER = Object.freeze(['assess', 'stabilize', 'control', 'reassess', 'stroke']);

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

export const AF_RVR_FIELDS = Object.freeze([
  field('phase', 'Review phase', [
    ['unknown', 'Not selected'],
    ['initial', 'Initial assessment'],
    ['reassessment', 'After initial treatment'],
  ], {
    essential: 'Select the treatment phase. Urgent escalation remains available before selection.',
  }),
  field('afConfirmation', 'AF confirmed on a reviewed ECG?', [
    ['unknown', 'Not established / ECG not reviewed'],
    ['confirmed-af', 'Yes — atrial fibrillation confirmed'],
    ['not-af-or-other-rhythm', 'No — AF not confirmed / another rhythm possible'],
  ], {
    threshold: 'Confirm AF on the ECG; a monitor rate alone does not establish the rhythm.',
  }),
  field('preExcitation', 'Wide-irregular rhythm or pre-excitation concern?', [
    ['unknown', 'Not assessed / ECG uncertainty remains'],
    ['present-or-concern', 'Yes — wide-irregular rhythm or pre-excitation concern'],
    ['not-present-on-reviewed-ecg', 'No — excluded on reviewed ECG'],
  ], {
    threshold: 'Wide-irregular / pre-excited AF requires urgent review. Withhold AV-nodal blockers until excluded.',
  }),
  field('ventricularResponse', 'Current ventricular response needs acute control?', [
    ['unknown', 'Not assessed / clinical context uncertain'],
    ['rapid-ventricular-response', 'Yes — rapid ventricular response'],
    ['not-rapid-after-assessment', 'No — no acute rapid-response route selected'],
  ], {
    threshold: 'Assess symptoms and perfusion, not rate alone. A slower rate does not exclude an emergency.',
  }),
  field('instability', 'Instability attributable to the tachyarrhythmia?', [
    ['unknown', 'Not fully assessed'],
    ['attributable', 'Yes — caused by the rhythm'],
    ['present-cause-uncertain', 'Present — cause uncertain'],
    ['not-present-after-assessment', 'No — assessed'],
  ], {
    threshold: 'Assess hypotension, shock, altered mental status, ischemic discomfort or acute heart failure. Treat instability immediately.',
  }),
  field('triggerStatus', 'Acute trigger review', [
    ['unknown', 'Not completed'],
    ['identified-being-managed', 'Trigger identified and being managed in parallel'],
    ['not-identified-after-assessment', 'No trigger identified after assessment'],
  ], {
    threshold: 'ESC advises evaluating and managing acute triggers before or in parallel with rate/rhythm control, including sepsis, fluid overload, cardiogenic shock, hypoxaemia, ischaemia, electrolytes and medication effects.',
  }),
  field('lvHfContext', 'LV function / heart-failure context', [
    ['unknown', 'Not established'],
    ['lvef-above-40-no-decompensation', 'LVEF >40% and no decompensated heart failure'],
    ['known-lvef-40-or-less-not-decompensated', 'Known LVEF ≤40%, but not decompensated'],
    ['critical-illness-or-decompensated-hf', 'Critical illness or decompensated heart failure'],
    ['lv-hf-data-uncertain', 'LV/HF information incomplete or conflicting'],
  ], {
    threshold: 'Diltiazem/verapamil requires an explicit LVEF >40% route. IV nondihydropyridine calcium-channel blockers should not be used with known moderate/severe LV systolic dysfunction; IV beta-blockers should not be used in decompensated heart failure.',
  }),
  field('strategy', 'Current control decision', [
    ['unknown', 'Not selected'],
    ['rate-control', 'Rate-control strategy'],
    ['planned-rhythm-cardioversion', 'Planned rhythm control / cardioversion review'],
  ], {
    threshold: 'Rate control, rhythm control and stroke prevention are separate decisions. Emergency cardioversion for attributable instability is not delayed for this elective/planned strategy field.',
  }),
  field('rateAgentChoice', 'Selected initial rate-control agent', [
    ['unknown', 'Not selected'],
    ['esmolol', 'Esmolol — beta-blocker route'],
    ['diltiazem', 'Diltiazem route'],
    ['specialist-alternative', 'Alternative / specialist route'],
  ], {
    threshold: 'Choose one monitored rate-control strategy. Do not stack beta-blocker and diltiazem/verapamil empirically; reconcile timing, response and haemodynamics before adding another AV-nodal agent.',
  }),
  field('betaBlockerSuitability', 'Beta-blocker suitability', [
    ['unknown', 'Not fully reviewed'],
    ['suitable-after-review', 'No active severe bronchospasm, important AV block, or other beta-blocker contraindication identified'],
    ['contraindication-or-active-severe-bronchospasm', 'Active severe bronchospasm / contraindication or concern'],
  ], {
    threshold: 'This screen does not replace a medication, AV-conduction, perfusion or drug-interaction review. In decompensated heart failure, do not use IV beta-blocker for the routine rate-control branch.',
  }),
  field('recentAvNodalExposure', 'Recent AV-nodal therapy reconciled?', [
    ['unknown', 'Not reconciled'],
    ['none-reconciled', 'No recent AV-nodal agent verified'],
    ['one-agent-response-pending', 'One recent agent given; response/timing still active'],
    ['multiple-or-timing-uncertain', 'Multiple agents or timing overlap / uncertainty'],
  ], {
    threshold: 'Before a new dose, reconcile the exact agent, dose, route, time, blood pressure/perfusion and response. Multiple AV-nodal agents can produce delayed hypotension, bradycardia or AV block.',
  }),
  field('response', 'Observed response after the initial intervention', [
    ['unknown', 'Not assessed / uncertain'],
    ['adequate', 'Rate, symptoms and perfusion improved adequately'],
    ['persistent-rvr', 'Persistent rapid ventricular response despite initial strategy'],
    ['worsening-or-new-instability', 'Worsening or new instability concern'],
  ], {
    threshold: 'Reassess rhythm, rate, blood pressure, perfusion, symptoms, acute trigger and total recent AV-nodal exposure before any repeat or additional agent. A lower rate does not close the trigger or stroke-prevention review.',
  }),
  field('fallbackEligibility', 'First-line beta-blocker/diltiazem status after reassessment', [
    ['unknown', 'Not established'],
    ['ineffective-or-contraindicated', 'Ineffective or contraindicated — documented after reassessment'],
    ['not-established', 'Not yet shown ineffective / contraindicated'],
  ], {
    threshold: 'Digoxin is a considered fallback only when beta-blockers and nondihydropyridine calcium-channel blockers are ineffective or contraindicated. IV amiodarone is a narrower critically-ill/decompensated-HF option and may cardiovert.',
  }),
  field('digoxinEligibility', 'Digoxin loading eligibility reviewed?', [
    ['unknown', 'Not fully reviewed'],
    ['reviewed-suitable', 'Prior digoxin exposure, kidney function, potassium/magnesium, interactions and current conduction/rhythm reviewed'],
    ['high-risk-or-incomplete', 'High risk, prior exposure, renal/electrolyte/interaction concern, or review incomplete'],
  ], {
    threshold: 'Do not use a generic digoxin loading regimen until prior exposure, kidney function, potassium/magnesium, interacting medicines and conduction/rhythm context are explicitly reviewed.',
  }),
  field('amiodaroneEligibility', 'IV amiodarone eligibility reviewed?', [
    ['unknown', 'Not fully reviewed'],
    ['reviewed-suitable', 'Prior amiodarone exposure, haemodynamics, QT/interaction context and cardioversion/stroke safeguard reviewed'],
    ['high-risk-or-incomplete', 'High risk, prior exposure, QT/interaction/haemodynamic concern, or review incomplete'],
  ], {
    threshold: 'Do not use a generic IV amiodarone regimen until prior exposure, haemodynamics, QT/interaction context and its potential cardioversion/stroke implications are explicitly reviewed.',
  }),
  field('afDuration', 'Definite AF duration for planned cardioversion', [
    ['unknown', 'Unknown / onset not definite'],
    ['definite-under-24h', 'Definite onset under 24 hours'],
    ['definite-24-to-under-48h', 'Definite onset 24 to under 48 hours'],
    ['48h-or-longer-or-not-definite', '48 hours or longer, or onset not definite'],
  ], {
    threshold: 'Do not silently merge guideline thresholds. ESC 2024 does not recommend planned cardioversion after >24 hours without 3 weeks therapeutic anticoagulation or TOE excluding thrombus; ACC 2023 uses AF duration ≥48 hours for that pre-cardioversion safeguard.',
  }),
  field('cardioversionSafeguard', 'Pre-cardioversion thromboembolism safeguard', [
    ['unknown', 'Not reconciled'],
    ['three-weeks-therapeutic-oac', 'At least 3 weeks therapeutic anticoagulation verified'],
    ['toe-excludes-thrombus', 'TOE excludes intracardiac thrombus'],
    ['not-established-or-interrupted', 'Not established / interrupted / adherence uncertain'],
  ], {
    threshold: 'For non-emergency planned cardioversion, document duration and one guideline-aligned thrombus/anticoagulation plan. Both source sets require post-cardioversion anticoagulation review; this guide does not select, dose or authorize an anticoagulant.',
  }),
]);

const VALID_VALUES = Object.freeze(Object.fromEntries(
  AF_RVR_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));

const CORE_FIELD_KEYS = Object.freeze([
  'phase',
  'afConfirmation',
  'preExcitation',
  'ventricularResponse',
  'instability',
]);

function isConfirmedStableRvr(values) {
  return values.afConfirmation === 'confirmed-af'
    && values.preExcitation === 'not-present-on-reviewed-ecg'
    && values.ventricularResponse === 'rapid-ventricular-response'
    && values.instability === 'not-present-after-assessment';
}

function isNonurgentPostInterventionState(values) {
  return values.phase === 'reassessment'
    && values.preExcitation === 'not-present-on-reviewed-ecg'
    && values.instability === 'not-present-after-assessment'
    && (
      (values.afConfirmation === 'confirmed-af' && values.ventricularResponse === 'not-rapid-after-assessment')
      || values.afConfirmation === 'not-af-or-other-rhythm'
    );
}

function requiresCardioversionSafeguards(values) {
  return values.strategy === 'planned-rhythm-cardioversion'
    || (values.phase === 'reassessment'
      && values.strategy === 'rate-control'
      && values.response === 'persistent-rvr'
      && values.fallbackEligibility === 'ineffective-or-contraindicated'
      && values.lvHfContext === 'critical-illness-or-decompensated-hf');
}

export function normalizeAfRvr(input = {}) {
  return Object.fromEntries(AF_RVR_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

/**
 * The core ECG/instability screen stays visible before a phase is chosen.
 * Dynamic fields only appear after a stable, confirmed, non-pre-excited AF
 * with an entered rapid ventricular response is established.
 */
export function visibleFieldKeys(input = {}) {
  const values = normalizeAfRvr(input);
  const stableRvr = isConfirmedStableRvr(values);
  const postIntervention = isNonurgentPostInterventionState(values);
  if (values.phase === 'unknown' || (!stableRvr && !postIntervention)) return CORE_FIELD_KEYS;

  if (postIntervention && !stableRvr) {
    return Object.freeze([
      ...CORE_FIELD_KEYS,
      'triggerStatus',
      'response',
    ]);
  }

  const fields = [
    ...CORE_FIELD_KEYS,
    'triggerStatus',
    'lvHfContext',
    'strategy',
  ];

  if (values.strategy === 'rate-control') {
    fields.push('rateAgentChoice', 'recentAvNodalExposure');
    if (values.rateAgentChoice === 'esmolol') fields.push('betaBlockerSuitability');
    if (values.phase === 'reassessment') {
      fields.push('response');
      if (values.response === 'persistent-rvr'
        && ['esmolol', 'diltiazem'].includes(values.rateAgentChoice)) {
        fields.push('fallbackEligibility');
        if (values.fallbackEligibility === 'ineffective-or-contraindicated') {
          fields.push('digoxinEligibility');
          if (values.lvHfContext === 'critical-illness-or-decompensated-hf') fields.push('amiodaroneEligibility');
        }
      }
    }
  }

  if (requiresCardioversionSafeguards(values)) {
    fields.push('afDuration', 'cardioversionSafeguard');
  }

  return Object.freeze(fields);
}

function makeAction(id, stage, title, summary, detail, source, extra = {}) {
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

function urgencyFor(values) {
  return Object.freeze({
    attributableInstability: values.instability === 'attributable',
    instabilityCauseUncertain: values.instability === 'present-cause-uncertain',
    preExcitation: values.preExcitation === 'present-or-concern',
  });
}

function entryFor(values, urgency) {
  if (urgency.attributableInstability) {
    const afConfirmed = values.afConfirmation === 'confirmed-af';
    return Object.freeze({
      title: afConfirmed ? 'Unstable AF with RVR' : 'Unstable tachyarrhythmia with AF unconfirmed',
      summary: afConfirmed
        ? 'Immediate synchronized cardioversion is the emergency route when confirmed AF with RVR is causing instability.'
        : 'Use the emergency rhythm/pulse pathway immediately; an unconfirmed rhythm does not establish a synchronized-cardioversion route.',
      status: 'urgent',
      source: ahaAcls2025,
    });
  }
  if (urgency.instabilityCauseUncertain) {
    return Object.freeze({
      title: 'Instability needs emergency cause review',
      summary: 'Treat emergency physiology now while determining whether rapid AF is the driver or a response to another critical illness.',
      status: 'urgent',
      source: ahaAcls2025,
    });
  }
  if (urgency.preExcitation) {
    return Object.freeze({
      title: 'Possible pre-excited / wide-irregular AF',
      summary: 'This needs immediate expert rhythm management; routine AV-nodal rate-control branches are unsafe.',
      status: 'urgent',
      source: acc2023,
    });
  }
  if (isConfirmedStableRvr(values)) {
    return Object.freeze({
      title: 'Stable AF with rapid ventricular response established',
      summary: 'Continue acute-trigger review and select a rate or planned rhythm-control decision with the displayed safeguards.',
      status: 'met',
      source: acc2023,
    });
  }
  if (values.afConfirmation === 'not-af-or-other-rhythm') {
    return Object.freeze({
      title: 'AF-specific pathway entry assessed not met',
      summary: 'A different rhythm or diagnosis remains possible; do not use the AF medication branch from this guide.',
      status: 'notmet',
      source: ahaAcls2025,
    });
  }
  if (values.afConfirmation === 'confirmed-af'
    && values.ventricularResponse === 'not-rapid-after-assessment') {
    return Object.freeze({
      title: 'AF confirmed without an entered acute RVR route',
      summary: 'Assess symptoms, perfusion, trigger and longer-term rate/rhythm goals; this guide does not add an acute RVR dose branch.',
      status: 'notmet',
      source: esc2024,
    });
  }
  return Object.freeze({
    title: 'AF with RVR pathway entry unconfirmed',
    summary: 'Confirm AF, exclude pre-excitation, assess whether the ventricular response needs acute control, and screen instability before choosing an AF-specific treatment branch.',
    status: 'unknown',
    source: acc2023,
  });
}

function urgentStage(values) {
  if (values.phase === 'reassessment') return 'reassess';
  if (values.phase === 'initial') return 'stabilize';
  return 'assess';
}

function addEmergencyActions(values, urgency, actions) {
  const stage = urgentStage(values);
  if (urgency.attributableInstability) {
    const afConfirmed = values.afConfirmation === 'confirmed-af';
    actions.push(makeAction(
      afConfirmed ? 'immediate-synchronized-cardioversion' : 'unstable-unconfirmed-rhythm-emergency',
      stage,
      afConfirmed
        ? 'Unstable AF with RVR: synchronized cardioversion now · initial biphasic energy ≥200 J'
        : 'Unstable tachyarrhythmia with AF unconfirmed: use the emergency rhythm/pulse pathway now',
      afConfirmed
        ? 'Maintain airway/breathing support, monitoring, IV access and treat the underlying cause. Sedate whenever feasible without delaying cardioversion.'
        : 'Maintain airway/breathing support, monitoring and IV access while urgent rhythm identification determines the rhythm-specific shock/antiarrhythmic route.',
      afConfirmed
        ? 'AHA 2025 recommends immediate electrical cardioversion for haemodynamic instability attributable to AF/flutter with RVR. For AF using a currently US-approved biphasic defibrillator, an initial energy setting of at least 200 J is reasonable and should be increased after shock failure according to the device. This guide does not configure pads, waveform, sedation, shocks or a defibrillator order.'
        : 'AF is not confirmed, so this guide does not presume synchronized cardioversion. AHA ACLS requires a rhythm-specific emergency route: polymorphic wide-complex tachycardia requires an unsynchronized shock, while an organized rhythm may have a synchronized-cardioversion route. Do not delay emergency support to finish AF confirmation.',
      ahaAcls2025,
      {tone: 'urgent', resourceGroup: 'rhythm-evaluation', ...(afConfirmed ? {} : {related: ['tachycardia-with-pulse']})},
    ));
    return true;
  }
  if (urgency.instabilityCauseUncertain) {
    actions.push(makeAction(
      'instability-cause-uncertain',
      stage,
      'Instability present: emergency support and cause review now',
      'Do not assume rapid AF is the sole cause, and do not use a routine AF dose branch while causality is unresolved.',
      'AHA ACLS asks whether a persistent tachyarrhythmia is causing instability. Support airway/breathing/circulation, monitor rhythm/BP/oximetry, obtain ECG when it does not delay care, and investigate critical causes such as sepsis, acute coronary syndrome, hypoxaemia, haemorrhage, pulmonary embolism or cardiogenic shock.',
      ahaAcls2025,
      {tone: 'urgent', resourceGroup: 'rhythm-evaluation'},
    ));
    return true;
  }
  if (urgency.preExcitation) {
    actions.push(makeAction(
      'preexcited-af-avoid-av-nodal-blockers',
      stage,
      'Possible pre-excited / wide-irregular AF: do not give AV-nodal blockers',
      'Avoid beta-blockers, diltiazem/verapamil, digoxin and IV amiodarone; obtain immediate expert rhythm-management support.',
      'ACC 2023 classifies digoxin, nondihydropyridine calcium-channel blockers, beta-blockers and IV amiodarone as harmful in pre-excited AF/flutter because they can accelerate ventricular response and precipitate ventricular fibrillation. The guide does not configure procainamide, ibutilide, cardioversion energy, or a local antiarrhythmic order for this branch.',
      acc2023,
      {tone: 'urgent', resourceGroup: 'rhythm-evaluation'},
    ));
    return true;
  }
  return false;
}

function addEntryActions(values, actions) {
  if (values.afConfirmation === 'unknown') {
    actions.push(makeAction(
      'confirm-af-on-ecg',
      'assess',
      'Confirm AF on a reviewed ECG before an AF-specific medication branch',
      'Assess QRS width and rhythm regularity; exclude atrial flutter, another SVT, ventricular tachycardia and artefact.',
      'AHA ACLS includes cardiac monitoring and a 12-lead ECG when available in the initial tachyarrhythmia assessment. This engine does not infer AF from a pulse rate, a monitor label, or a historic diagnosis.',
      ahaAcls2025,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  } else if (values.afConfirmation === 'not-af-or-other-rhythm') {
    actions.push(makeAction(
      'af-not-confirmed-use-rhythm-evaluation',
      'assess',
      'AF not confirmed: use rhythm-specific evaluation',
      'Do not apply AF-specific AV-nodal medication or planned-cardioversion actions from this guide.',
      'A regular or wide-complex tachyarrhythmia needs the applicable ACLS/rhythm pathway. This guide does not select adenosine, antiarrhythmic infusion or a cardioversion setting for a different rhythm.',
      ahaAcls2025,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  }
  if (values.preExcitation === 'unknown') {
    actions.push(makeAction(
      'assess-preexcitation-before-av-nodal-therapy',
      'assess',
      'Exclude wide-irregular / pre-excited AF before AV-nodal therapy',
      'An unknown pre-excitation screen does not unlock beta-blocker, diltiazem, digoxin or IV amiodarone.',
      'Review QRS width, irregularity and ECG features with an experienced clinician when needed. A possible bypass tract changes the emergency rhythm-management route.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  }
  if (values.ventricularResponse === 'unknown') {
    actions.push(makeAction(
      'assess-ventricular-response-and-context',
      'assess',
      'Assess whether the ventricular response needs acute control',
      'Review rate with symptoms, perfusion and the underlying illness rather than treating a number alone.',
      'Immediate treatment depends on clinical context and instability. AF guidelines frame rate control around symptoms, haemodynamics, LV function and response; a non-rapid selection does not make emergency physiology safe.',
      ahaAcls2025,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  }
}

function addTriggerAction(values, actions) {
  if (values.triggerStatus === 'unknown') {
    actions.push(makeAction(
      'assess-and-manage-acute-trigger',
      'assess',
      'Assess and manage the acute trigger in parallel',
      'Rate or rhythm improvement does not establish that the trigger is resolved.',
      'ESC 2024 directs clinicians to evaluate and manage contributors such as sepsis, fluid overload, cardiogenic shock, hypoxaemia, ischaemia, electrolyte disturbance and medication effects before or alongside acute rate/rhythm control.',
      esc2024,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  } else if (values.triggerStatus === 'identified-being-managed') {
    actions.push(makeAction(
      'continue-trigger-management',
      'assess',
      'Continue treating the identified acute trigger in parallel',
      'Document whether AF/RVR is the driver, consequence or both as the trajectory evolves.',
      'ESC AF-CARE keeps comorbidity and acute-trigger management central to AF care. Do not use rate control to conceal sepsis, ischaemia, hypoxaemia, congestion or shock.',
      esc2024,
      {resourceGroup: 'rhythm-evaluation'},
    ));
  }
}

function addLvHfAction(values, actions) {
  if (values.lvHfContext === 'unknown' || values.lvHfContext === 'lv-hf-data-uncertain') {
    actions.push(makeAction(
      'clarify-lv-function-and-hf-context',
      'control',
      'Clarify LV function and heart-failure context before choosing a rate agent',
      'Diltiazem requires a documented LVEF >40% route; decompensated HF changes both beta-blocker and calcium-channel-blocker safety.',
      'ACC 2023 advises against IV nondihydropyridine calcium-channel blockers in known moderate/severe LV systolic dysfunction. AHA 2025 advises against IV nondihydropyridine calcium-channel blockers and IV beta-blockers in decompensated heart failure.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  }
}

function addRateAgentAction(values, actions) {
  if (values.recentAvNodalExposure === 'unknown') {
    actions.push(makeAction(
      'reconcile-recent-av-nodal-exposure',
      'control',
      'Reconcile recent AV-nodal therapy before a new rate-control dose',
      'Confirm agent, dose, route, time, current blood pressure/perfusion and observed response.',
      'Do not infer that no medication was given from missing documentation. Beta-blocker, diltiazem/verapamil, digoxin and amiodarone can have delayed cumulative bradycardic, AV-block or hypotensive effects.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.recentAvNodalExposure === 'multiple-or-timing-uncertain') {
    actions.push(makeAction(
      'do-not-stack-av-nodal-agents',
      'control',
      'Multiple/uncertain AV-nodal exposure: do not stack another routine agent',
      'Reconcile timing and response, monitor rhythm/BP/perfusion and obtain expert review before any additional AV-nodal treatment.',
      'Both ACC and ESC emphasize drug selection by haemodynamics, LV function and response. ESC specifically says combining beta-blockers with diltiazem/verapamil should be avoided except in closely monitored circumstances.',
      esc2024,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.recentAvNodalExposure === 'one-agent-response-pending') {
    actions.push(makeAction(
      'reassess-one-agent-before-repeat',
      'control',
      'One recent rate agent: reassess before repeating or adding another',
      'Use the Reassessment phase after the observed response is available; do not create a second routine loading branch.',
      'Monitor rhythm, rate, blood pressure, perfusion and symptoms after the selected treatment. The guide does not turn a stored medication name into authorization for another dose.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }

  if (values.rateAgentChoice === 'unknown') {
    actions.push(makeAction(
      'choose-one-initial-rate-agent',
      'control',
      'Choose one monitored initial rate-control agent',
      'Select esmolol or diltiazem only after the visible ECG, instability, LV/HF and contraindication screens are complete.',
      'For haemodynamically stable AF with RVR without pre-excitation, ACC 2023 recommends a beta-blocker or a nondihydropyridine calcium-channel blocker when clinically appropriate. This compact guide intentionally requires one selected route rather than presenting a combined regimen.',
      acc2023,
      {tone: 'attention'},
    ));
    return;
  }
  if (values.rateAgentChoice === 'specialist-alternative') {
    actions.push(makeAction(
      'specialist-rate-agent-route',
      'control',
      'Alternative rate-control route requires individualized specialist review',
      'Do not infer a generic loading regimen from this selection.',
      'Agent selection depends on haemodynamics, LV/HF status, kidney function, electrolytes, interacting drugs, duration of AF and whether pharmacological cardioversion is possible. This engine provides source-linked digoxin/amiodarone review only in its reassessment safeguards.',
      acc2023,
      {tone: 'attention'},
    ));
    return;
  }

  if (values.rateAgentChoice === 'esmolol') {
    if (values.lvHfContext === 'critical-illness-or-decompensated-hf') {
      actions.push(makeAction(
        'esmolol-withheld-in-decompensated-hf',
        'control',
        'Do not use the routine IV esmolol branch in decompensated heart failure',
        'Use the critically-ill/decompensated-HF reassessment route with expert review instead of a routine AV-nodal bolus.',
        'AHA 2025 states IV beta-blockers should not be used in left-ventricular systolic dysfunction with decompensated heart failure because further haemodynamic compromise can occur.',
        ahaAcls2025,
        {tone: 'attention', resourceGroup: 'beta-blocker'},
      ));
      return;
    }
    if (!['lvef-above-40-no-decompensation', 'known-lvef-40-or-less-not-decompensated'].includes(values.lvHfContext)) {
      addLvHfAction(values, actions);
      return;
    }
    if (values.betaBlockerSuitability === 'unknown') {
      actions.push(makeAction(
        'assess-beta-blocker-suitability',
        'control',
        'Complete beta-blocker contraindication review before esmolol',
        'Check active severe bronchospasm, relevant AV block, perfusion, prior exposure and interacting medicines.',
        'This categorical screen does not establish patient-specific suitability. Do not infer an absence of bronchospasm, conduction disease or medication conflict from an unknown value.',
        acc2023,
        {tone: 'attention', resourceGroup: 'beta-blocker'},
      ));
      return;
    }
    if (values.betaBlockerSuitability === 'contraindication-or-active-severe-bronchospasm') {
      actions.push(makeAction(
        'esmolol-withheld-for-beta-blocker-concern',
        'control',
        'Do not use the esmolol branch while beta-blocker contraindication/bronchospasm concern is active',
        'Review an EF/HF-aligned alternative with the responsible clinician rather than reflexively switching or stacking AV-nodal drugs.',
        'The source supports beta-blockers for stable AF with RVR when clinically appropriate; it does not override active severe bronchospasm, important AV-conduction disease, hypotension or other patient-specific contraindications.',
        acc2023,
        {tone: 'attention', resourceGroup: 'beta-blocker'},
      ));
      return;
    }
    actions.push(makeAction(
      'initial-esmolol-rate-control',
      'control',
      'Selected esmolol route: 500 mcg/kg IV over 1 min, then 50–300 mcg/kg/min',
      'Use continuous rhythm/BP monitoring and reassess perfusion and response before any titration; do not add diltiazem/verapamil empirically.',
      'ACC 2023 Table 21 lists esmolol 500 mcg/kg IV over 1 minute followed by 50–300 mcg/kg/min for rate control. ESC 2024 lists beta-blockers as an acute rate-control option across LVEF categories, while AHA cautions against IV beta-blockers in decompensated HF. Prepared concentration, infusion pump, titration, local product and authorization require separate verification.',
      acc2023,
      {resourceGroup: 'beta-blocker'},
    ));
    return;
  }

  if (values.rateAgentChoice === 'diltiazem') {
    if (values.lvHfContext !== 'lvef-above-40-no-decompensation') {
      actions.push(makeAction(
        'diltiazem-withheld-without-lvef-over-40',
        'control',
        'Do not use the IV diltiazem branch without documented LVEF >40% and no decompensated HF',
        'Choose an individualized alternative after LV/HF, perfusion and prior AV-nodal exposure are reconciled.',
        'ACC 2023 limits the stable diltiazem/verapamil route to EF above 40% and says IV nondihydropyridine calcium-channel blockers should not be administered with known moderate/severe LV systolic dysfunction. AHA 2025 also advises avoiding them in decompensated HF.',
        acc2023,
        {tone: 'attention', resourceGroup: 'diltiazem'},
      ));
      return;
    }
    actions.push(makeAction(
      'initial-diltiazem-rate-control',
      'control',
      'Selected diltiazem route: 0.25 mg/kg actual body weight IV over 2 min; repeat 0.35 mg/kg after 15 min if needed',
      'If needed, the ACC table lists infusion 5–15 mg/h. Use continuous rhythm/BP monitoring and reassess before any repeat or titration.',
      'ACC 2023 Table 21 lists diltiazem 0.25 mg/kg actual body weight IV over 2 minutes, then 0.35 mg/kg IV over 2 minutes if needed after 15 minutes, with a 5–15 mg/h infusion. This is a source reference, not a local product, pump, dose calculation, combination regimen or authorization. Do not combine empirically with beta-blocker therapy.',
      acc2023,
      {resourceGroup: 'diltiazem'},
    ));
  }
}

function addInitialRateActions(values, actions) {
  if (values.strategy === 'unknown') {
    actions.push(makeAction(
      'choose-rate-or-rhythm-strategy',
      'control',
      'Choose rate control or a planned rhythm/cardioversion review',
      'The acute trigger and stroke-prevention review continue whichever symptom-control strategy is considered.',
      'ESC 2024 frames rate and rhythm control as separate symptom/prognosis decisions within AF-CARE. In a stable presentation, do not treat an unselected strategy field as permission for a rate agent or cardioversion.',
      esc2024,
      {tone: 'attention'},
    ));
    return;
  }
  if (values.strategy === 'planned-rhythm-cardioversion') return;
  addLvHfAction(values, actions);
  addRateAgentAction(values, actions);
  actions.push(makeAction(
    'initial-rate-control-reassessment',
    'reassess',
    'After the initial rate strategy: reassess rhythm, rate, BP, perfusion and symptoms',
    'Do not repeat or add another AV-nodal agent until the observed response and total exposure are reconciled.',
    'A lower rate does not establish clinical recovery. Reassess the acute trigger, LV/HF state, ECG, symptoms, perfusion and stroke-prevention decision in parallel.',
    esc2024,
    {resourceGroup: 'rhythm-evaluation'},
  ));
}

function addCardioversionSafeguards(values, actions, reason = 'planned') {
  const stage = 'stroke';
  if (values.afDuration === 'unknown') {
    actions.push(makeAction(
      'confirm-definite-af-duration-before-cardioversion',
      stage,
      'Confirm definite AF duration before non-emergency cardioversion',
      'Unknown onset does not establish a low-risk short-duration cardioversion route.',
      'ACC 2023 uses AF duration of at least 48 hours for its 3-week anticoagulation or imaging safeguard. ESC 2024 uses a stricter >24-hour threshold. With an unknown onset, do not infer either short-duration exception; document a cardioversion-specific thromboembolism plan.',
      acc2023,
      {tone: 'attention'},
    ));
  }
  if (values.cardioversionSafeguard === 'unknown') {
    actions.push(makeAction(
      'reconcile-cardioversion-anticoagulation-or-toe',
      stage,
      'Reconcile anticoagulation adherence or TOE thrombus exclusion before planned cardioversion',
      'Do not infer therapeutic anticoagulation from a medication list or an undocumented history.',
      'Both guidelines use at least 3 weeks of therapeutic anticoagulation or TOE exclusion of intracardiac thrombus as an elective-cardioversion safeguard in the relevant duration range. This guide does not select an anticoagulant, verify adherence, interpret TOE, or authorize cardioversion.',
      esc2024,
      {tone: 'attention'},
    ));
  }

  const safeguarded = ['three-weeks-therapeutic-oac', 'toe-excludes-thrombus'].includes(values.cardioversionSafeguard);
  if (values.afDuration === 'definite-24-to-under-48h' && !safeguarded) {
    actions.push(makeAction(
      'esc-24h-cardioversion-safeguard',
      stage,
      '24–48 hour definite AF: ESC safeguard requires 3 weeks therapeutic OAC or TOE before planned cardioversion',
      'ACC’s ≥48-hour threshold differs. Do not silently merge the two approaches; reconcile the governing source and local plan.',
      'ESC 2024 does not recommend cardioversion when AF duration is longer than 24 hours unless at least 3 weeks therapeutic anticoagulation has been given or TOE excludes intracardiac thrombus. ACC 2023 uses the ≥48-hour duration threshold for its corresponding pre-cardioversion anticoagulation/imaging safeguard. This action preserves the difference rather than creating a hybrid rule.',
      esc2024,
      {tone: 'attention'},
    ));
  }
  if (values.afDuration === '48h-or-longer-or-not-definite' && !safeguarded) {
    actions.push(makeAction(
      'cardioversion-safeguard-required-at-or-after-48h',
      stage,
      'AF ≥48 hours or onset not definite: do not proceed with planned cardioversion without OAC/TOE safeguard',
      'Both reviewed guideline frameworks require a documented thromboembolism strategy in this circumstance.',
      'ACC 2023 recommends at least 3 weeks of uninterrupted therapeutic anticoagulation or imaging to exclude intracardiac thrombus before elective cardioversion when AF duration is at least 48 hours. ESC 2024 applies its threshold earlier, after 24 hours. Emergency cardioversion for attributable instability is a separate route and is not delayed for this screen.',
      acc2023,
      {tone: 'attention'},
    ));
  }
  if (values.afDuration === 'definite-under-24h' && !safeguarded) {
    actions.push(makeAction(
      'under-24h-cardioversion-still-needs-stroke-review',
      stage,
      'Definite onset under 24 hours: complete formal stroke/anticoagulation review before planned cardioversion',
      'A short reported duration is not an automatic cardioversion authorization or an anticoagulation decision.',
      'ESC notes that definite onset is often uncertain and makes post-cardioversion anticoagulation optional only for patients without thromboembolic risk factors whose sinus rhythm is restored within 24 hours. ACC notes nuanced risk even below 48 hours. Use the governing guideline/local plan and the patient’s thromboembolic/bleeding context.',
      esc2024,
      {tone: 'attention'},
    ));
  }
  if (safeguarded) {
    actions.push(makeAction(
      'cardioversion-safeguard-recorded',
      stage,
      'Cardioversion safeguard recorded: continue post-cardioversion anticoagulation review',
      'ACC specifies at least 4 weeks after cardioversion; ESC says most patients should continue OAC for at least 4 weeks, then reassess long-term indication.',
      'A documented 3-week therapeutic-anticoagulation history or TOE without thrombus supports the pre-procedure safeguard but does not establish drug selection, adherence, bleeding safety, procedure readiness or long-term anticoagulation. In this guide, the source difference remains visible at the 24–48-hour duration band.',
      acc2023,
      {resourceGroup: 'rhythm-evaluation'},
    ));
  }
  actions.push(makeAction(
    reason === 'amiodarone' ? 'amiodarone-stroke-prevention-review' : 'stroke-prevention-review',
    stage,
    'Complete stroke-prevention and bleeding-context review separately',
    'Rate response, rhythm conversion or trigger improvement does not decide long-term anticoagulation.',
    'ESC AF-CARE and ACC AF guidance require thromboembolic-risk assessment with patient-specific bleeding and treatment context. This engine does not calculate a score, select a DOAC/warfarin, set a dose, or authorize anticoagulation.',
    esc2024,
  ));
}

function addReassessmentActions(values, actions) {
  if (values.strategy === 'unknown') {
    actions.push(makeAction(
      'reassess-strategy-not-selected',
      'reassess',
      'Reconcile the active rate/rhythm strategy before treating a stored response label',
      'Do not infer a repeat medication, cardioversion or discharge plan from incomplete strategy information.',
      'Reassessment should include current rhythm, rate, blood pressure, perfusion, symptoms, trigger treatment, LV/HF context and total recent AV-nodal exposure.',
      esc2024,
      {tone: 'attention'},
    ));
    return;
  }
  if (values.strategy === 'planned-rhythm-cardioversion') {
    addCardioversionSafeguards(values, actions);
    return;
  }

  if (values.response === 'unknown') {
    actions.push(makeAction(
      'assess-rate-control-response',
      'reassess',
      'Assess response before repeating or adding a rate-control agent',
      'Record rhythm/rate, BP, perfusion, symptoms, trigger trajectory and total recent AV-nodal exposure.',
      'A missing response does not establish treatment failure or justify stacking AV-nodal agents. New instability returns to the emergency cardioversion screen.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.response === 'worsening-or-new-instability') {
    actions.push(makeAction(
      'worsening-response-return-to-emergency-screen',
      'reassess',
      'Worsening/new instability: return to emergency rhythm and cause assessment now',
      'Reassess whether the tachyarrhythmia is causing hypotension, shock, acute heart failure, ischemia or altered mental status; do not stack another routine rate agent.',
      'AHA ACLS directs immediate cardioversion when instability is attributable to AF/flutter with RVR. Rapid AF may also be secondary to sepsis, shock or another critical illness, so stabilize and reassess the cause in parallel.',
      ahaAcls2025,
      {tone: 'urgent', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.response === 'adequate') {
    actions.push(makeAction(
      'adequate-rate-response-continue-review',
      'reassess',
      'Adequate response: continue monitoring and complete trigger/stroke review',
      'A lower rate alone is not a discharge decision and does not establish that AF was transient.',
      'Continue to review symptoms, perfusion, the underlying trigger, ECG/rhythm trajectory, medication exposure and anticoagulation/stroke-prevention plan. Do not automatically add a second AV-nodal agent after an adequate response.',
      esc2024,
      {resourceGroup: 'rhythm-evaluation'},
    ));
    actions.push(makeAction(
      'rate-control-stroke-review',
      'stroke',
      'Complete stroke-prevention and bleeding-context review separately',
      'Rate control does not determine whether anticoagulation is indicated.',
      'Use the governing AF guideline and patient-specific thromboembolic/bleeding context. This engine does not calculate a score, select an anticoagulant or issue an order.',
      esc2024,
    ));
    return;
  }

  if (!['esmolol', 'diltiazem'].includes(values.rateAgentChoice)) {
    actions.push(makeAction(
      'persistent-rvr-reconcile-initial-agent',
      'reassess',
      'Persistent RVR: reconcile the initial rate strategy before a fallback medication branch',
      'Confirm what was actually given and its response; no generic second-line loading plan follows an unknown or specialist initial selection.',
      'Digoxin and IV amiodarone have narrower source-supported roles after beta-blocker/diltiazem ineffectiveness or contraindication is established. Do not infer that condition from a missing initial-agent record.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.fallbackEligibility === 'unknown') {
    actions.push(makeAction(
      'assess-first-line-ineffective-or-contraindicated',
      'reassess',
      'Persistent RVR: establish whether the first-line route is ineffective or contraindicated',
      'Reconcile dose/timing, haemodynamics, LV/HF context, trigger treatment and total AV-nodal exposure before adding a fallback agent.',
      'ACC considers digoxin when beta-blocker and nondihydropyridine calcium-channel blockers are ineffective or contraindicated. This predicate should be explicit; persistent rate alone does not authorize automatic stacking.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.fallbackEligibility === 'not-established') {
    actions.push(makeAction(
      'first-line-not-yet-proven-ineffective',
      'reassess',
      'First-line route not yet shown ineffective/contraindicated: do not automatically stack a fallback agent',
      'Continue monitored reassessment and expert review if the trajectory is not acceptable.',
      'Do not replace a documented response assessment with a generic digoxin or amiodarone loading plan. New instability requires the emergency rhythm route.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }

  if (values.lvHfContext === 'critical-illness-or-decompensated-hf') {
    actions.push(makeAction(
      'fallback-options-require-one-specialist-plan',
      'control',
      'Digoxin and IV amiodarone fallback reviews require one specialist plan; do not automatically combine or load both',
      'Each conditional reference has different eligibility and cardioversion implications. This engine does not choose, sequence or combine them.',
      'ACC describes digoxin and IV amiodarone in different acute contexts. Completion of two eligibility screens does not establish that simultaneous or sequential loading is appropriate. Reconcile haemodynamics, recent AV-nodal therapy, kidney/electrolyte status, QT/interactions, current rhythm and the cardioversion/stroke plan before an individualized local decision.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
  }

  if (values.digoxinEligibility === 'reviewed-suitable') {
    actions.push(makeAction(
      'consider-digoxin-after-first-line-failure',
      'control',
      'Consider digoxin fallback: 0.25–0.5 mg IV, then 0.25 mg every 6 h; maximum 1.5 mg/24 h',
      'Use only after beta-blocker/diltiazem ineffectiveness or contraindication is documented and prior digoxin/renal/electrolyte/interaction review is complete.',
      'ACC 2023 Table 21 lists digoxin 0.25–0.5 mg IV over several minutes, repeat 0.25 mg every 6 hours to a maximum 1.5 mg in 24 hours. It is renally eliminated and the guideline frames it as a considered acute fallback, not a default co-loading regimen. This is not a local loading order, renal-dose calculation, level-monitoring plan or authorization.',
      acc2023,
      {resourceGroup: 'digoxin'},
    ));
  } else {
    actions.push(makeAction(
      'digoxin-loading-requires-eligibility-review',
      'control',
      'Digoxin fallback: complete prior-exposure, renal, electrolyte and interaction review before any loading regimen',
      'High-risk or incomplete eligibility does not unlock a generic digoxin dose.',
      'Digoxin is renally eliminated, and its loading/maintenance approach depends on prior exposure, kidney function, potassium/magnesium, interacting medicines, conduction/rhythm context and haemodynamics. Obtain an individualized specialist/local plan rather than using the Table 21 reference as an automatic order.',
      acc2023,
      {tone: 'attention', resourceGroup: 'digoxin'},
    ));
  }

  if (values.lvHfContext === 'critical-illness-or-decompensated-hf') {
    if (values.amiodaroneEligibility === 'reviewed-suitable') {
      actions.push(makeAction(
        'consider-iv-amiodarone-critical-or-decompensated-hf',
        'control',
        'Critical illness/decompensated HF fallback: consider IV amiodarone 150–300 mg over 1 h, then 10–50 mg/h',
        'Use an expert-monitored route only after beta-blocker/diltiazem ineffectiveness or contraindication and prior-amiodarone/QT/interaction/cardioversion review are documented.',
        'ACC 2023 allows IV amiodarone as a considered acute rate-control option in critically ill and/or decompensated-HF patients when beta-blockers and nondihydropyridine calcium-channel blockers are ineffective or contraindicated. Table 21 lists 150–300 mg IV over 1 hour then 10–50 mg/h over 24 hours. It must not be used with pre-excited AF and may convert rhythm, so thromboembolism safeguards remain active. This is not a local infusion protocol or authorization.',
        acc2023,
        {tone: 'attention', resourceGroup: 'amiodarone'},
      ));
    } else {
      actions.push(makeAction(
        'amiodarone-loading-requires-eligibility-review',
        'control',
        'IV amiodarone fallback: complete prior-exposure, haemodynamic, QT/interaction and cardioversion review before a regimen',
        'High-risk or incomplete eligibility does not unlock a generic IV amiodarone dose.',
        'In critically ill/decompensated-HF AF with RVR, ACC considers IV amiodarone only after beta-blocker/diltiazem ineffectiveness or contraindication. Review prior amiodarone, haemodynamics, QT and interacting medicines, pre-excitation exclusion, and potential cardioversion/stroke implications before an individualized local plan.',
        acc2023,
        {tone: 'attention', resourceGroup: 'amiodarone'},
      ));
    }
    addCardioversionSafeguards(values, actions, 'amiodarone');
  } else {
    actions.push(makeAction(
      'amiodarone-not-routine-stable-fallback',
      'control',
      'IV amiodarone is not the routine stable-AF fallback branch',
      'It has a narrower critically-ill/decompensated-HF indication and may cardiovert, so it needs a cardioversion/stroke safeguard review.',
      'For stable AF with RVR, first complete the selected agent, LV/HF, trigger and fallback assessment. Do not use this guide to convert a persistent rate label into an IV amiodarone infusion.',
      acc2023,
      {tone: 'attention', resourceGroup: 'amiodarone'},
    ));
    actions.push(makeAction(
      'persistent-rvr-stroke-review',
      'stroke',
      'Persistent RVR: complete stroke-prevention review before any rhythm-changing plan',
      'A pharmacological or electrical conversion plan needs explicit duration/thrombus/anticoagulation review.',
      'ACC warns to consider cardioversion and stroke risk when IV amiodarone is used for rate control. This guide does not select an anticoagulant or authorize a conversion strategy.',
      acc2023,
    ));
  }
}

function addPostInterventionWithoutRvrActions(values, actions) {
  const alternativeRhythm = values.afConfirmation === 'not-af-or-other-rhythm';
  actions.push(makeAction(
    alternativeRhythm ? 'reconcile-post-intervention-or-alternative-rhythm' : 'reconcile-post-intervention-no-rvr-state',
    'reassess',
    alternativeRhythm
      ? 'Current ECG does not confirm AF: distinguish conversion after treatment from an alternative rhythm'
      : 'Current AF is not in an acute RVR route: reconcile the post-intervention ECG and trajectory',
    alternativeRhythm
      ? 'Do not use this result as proof of recovery or as permission for an AF-specific repeat dose.'
      : 'Do not repeat or add a routine AV-nodal agent solely because a prior RVR label remains in the record.',
    alternativeRhythm
      ? 'A current non-AF ECG after an intervention can reflect conversion, an alternative rhythm, or an earlier misclassification. Review the original and current ECGs, symptoms, perfusion, trigger trajectory and the applicable rhythm pathway. This compact engine does not select a different-rhythm antiarrhythmic or shock setting.'
      : 'A current non-rapid ventricular response after intervention needs reconciliation with the ECG, symptoms, perfusion, trigger trajectory and total recent AV-nodal exposure. A lower rate does not establish disposition, durable rhythm control or an anticoagulation decision.',
    alternativeRhythm ? ahaAcls2025 : esc2024,
    {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
  ));

  if (values.response === 'unknown') {
    actions.push(makeAction(
      'assess-post-intervention-response-before-further-treatment',
      'reassess',
      'Assess the post-intervention response before further rhythm or rate treatment',
      'Document current ECG/rate, BP, perfusion, symptoms, trigger trajectory and all recent AV-nodal treatment.',
      'A current non-RVR or non-AF ECG does not establish whether the prior intervention was adequate. Missing response information does not authorize a repeat dose, an additional agent, cardioversion or discharge plan.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.response === 'worsening-or-new-instability') {
    actions.push(makeAction(
      'post-intervention-worsening-return-to-emergency-screen',
      'reassess',
      'Worsening/new instability after intervention: return to emergency rhythm and cause assessment now',
      'Re-screen whether the current rhythm is causing hypotension, shock, acute heart failure, ischemia or altered mental status; do not add a routine dose from this screen.',
      'AHA ACLS treats instability as an immediate rhythm-and-cause emergency. Re-enter the current ECG and instability findings so that confirmed AF, an alternative rhythm and a possible polymorphic wide-complex tachycardia are not conflated.',
      ahaAcls2025,
      {tone: 'urgent', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }
  if (values.response === 'persistent-rvr') {
    actions.push(makeAction(
      'post-intervention-response-conflicts-with-current-ecg',
      'reassess',
      'Persistent-RVR response label conflicts with the current non-RVR/non-AF entry: reconcile timing and ECG',
      'Use the current ECG, perfusion and medication timing to establish the active problem before another rate or rhythm intervention.',
      'A stored response label can lag behind the current rhythm. Do not use that conflict to generate a generic repeat dose or fallback loading regimen; reassess for new instability and apply the current rhythm-specific pathway.',
      acc2023,
      {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
    ));
    return;
  }

  actions.push(makeAction(
    'post-intervention-adequate-response-continue-review',
    'reassess',
    'Adequate post-intervention response: continue monitoring and complete trigger/stroke review',
    'The current non-RVR/non-AF finding does not establish discharge readiness, durable conversion or an anticoagulation decision.',
    'Continue to review symptoms, perfusion, the acute trigger, ECG/rhythm trajectory and total medication exposure. Do not automatically repeat or add an AV-nodal agent after an adequate post-intervention response.',
    esc2024,
    {resourceGroup: 'rhythm-evaluation'},
  ));
  actions.push(makeAction(
    'post-intervention-stroke-review',
    'stroke',
    'Complete stroke-prevention and bleeding-context review separately',
    'Rate improvement or apparent rhythm conversion does not decide whether anticoagulation is indicated.',
    'Use the governing AF guideline and patient-specific thromboembolic/bleeding context. This engine does not calculate a score, select an anticoagulant or issue an order.',
    esc2024,
  ));
}

function sortActions(actions) {
  actions.sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage));
  return actions;
}

function visibleStageIdsFor(actions) {
  const visible = new Set(['assess']);
  for (const action of actions) visible.add(action.stage);
  return Object.freeze(STAGE_ORDER.filter(stageId => visible.has(stageId)));
}

function stageNotes(values, urgency) {
  if (values.phase === 'unknown') {
    return Object.freeze({
      assess: urgency.attributableInstability || urgency.instabilityCauseUncertain || urgency.preExcitation
        ? 'Emergency escalation is visible. Select a phase only after immediate priorities are underway.'
        : 'Confirm AF, exclude pre-excitation, assess ventricular response and screen whether instability is attributable before selecting a phase.',
    });
  }
  if (values.phase === 'initial') {
    return Object.freeze({
      assess: 'Keep rhythm confirmation, pre-excitation, instability and acute-trigger review active.',
      stabilize: 'Attributable instability supersedes routine medication and planned-cardioversion safeguards.',
      control: 'Select one rate strategy only after all displayed eligibility screens are explicit.',
      reassess: 'Reassess observed rhythm/rate, BP, perfusion, symptoms, trigger and total medication exposure before changing therapy.',
      stroke: 'A planned cardioversion or rhythm-changing drug needs a duration and thromboembolism review.',
    });
  }
  return Object.freeze({
    assess: 'Current ECG, instability and trigger findings supersede a stored treatment-response label.',
    stabilize: 'A new attributable instability finding returns to the emergency cardioversion route.',
    control: 'Do not stack AV-nodal agents from a persistent-rate label alone.',
    reassess: 'Use observed response, perfusion and trigger trajectory before a repeat or fallback decision.',
    stroke: 'Rate response does not decide anticoagulation; planned rhythm conversion needs explicit source-aligned safeguards.',
  });
}

function gapsFor(values) {
  const labels = Object.fromEntries(AF_RVR_FIELDS.map(item => [item.key, item.label]));
  return Object.freeze(visibleFieldKeys(values)
    .filter(key => values[key] === 'unknown')
    .map(key => labels[key]));
}

/**
 * Evaluates only categorical, explicitly entered findings. It does not make a
 * diagnosis, create an order, calculate a dose, or establish medication
 * suitability, anticoagulation adherence or cardioversion readiness.
 */
export function evaluate(input = {}) {
  const values = normalizeAfRvr(input);
  const urgency = urgencyFor(values);
  const actions = [];

  const emergency = addEmergencyActions(values, urgency, actions);
  addEntryActions(values, actions);

  if (values.phase === 'unknown') {
    actions.push(makeAction(
      'select-review-phase',
      'assess',
      'Select Initial assessment or Reassessment',
      'Routine AF treatment and planned-cardioversion actions remain withheld until the phase is explicit.',
      'Initial and post-intervention information answer different safety questions. Emergency instability and pre-excitation actions remain visible before a phase is selected.',
      acc2023,
      {tone: 'attention'},
    ));
    return Object.freeze({
      values,
      entry: entryFor(values, urgency),
      actions: Object.freeze(sortActions(actions)),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: visibleStageIdsFor(actions),
      withheld: Object.freeze(['AF-specific medication, planned-cardioversion and post-treatment branches remain withheld until a review phase is selected.']),
      gaps: gapsFor(values),
      derived: Object.freeze({
        emergencyRoute: emergency,
        preExcitationRoute: urgency.preExcitation,
        stableAfRvr: isConfirmedStableRvr(values),
      }),
    });
  }

  if (emergency) {
    addTriggerAction(values, actions);
    actions.push(makeAction(
      'post-emergency-stroke-review',
      'stroke',
      'After immediate stabilization: complete AF duration and stroke-prevention review',
      'Do not delay emergency cardioversion for this review when instability is attributable to the tachyarrhythmia.',
      'AHA ACLS separates emergency cardioversion from subsequent anticoagulation consideration. ACC/ESC AF guidance then requires a patient-specific thromboembolism and bleeding-context review; this engine does not select or authorize anticoagulation.',
      acc2023,
    ));
    return Object.freeze({
      values,
      entry: entryFor(values, urgency),
      actions: Object.freeze(sortActions(actions)),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: visibleStageIdsFor(actions),
      withheld: Object.freeze(['Routine AV-nodal medication, elective rhythm-control and planned-cardioversion branches remain withheld while the emergency rhythm route is active.']),
      gaps: gapsFor(values),
      derived: Object.freeze({
        emergencyRoute: true,
        preExcitationRoute: urgency.preExcitation,
        stableAfRvr: false,
      }),
    });
  }

  if (!isConfirmedStableRvr(values)) {
    if (isNonurgentPostInterventionState(values)) {
      addTriggerAction(values, actions);
      addPostInterventionWithoutRvrActions(values, actions);
      return Object.freeze({
        values,
        entry: entryFor(values, urgency),
        actions: Object.freeze(sortActions(actions)),
        stageNotes: stageNotes(values, urgency),
        visibleStageIds: visibleStageIdsFor(actions),
        withheld: Object.freeze(['A current non-RVR/non-AF entry does not unlock a routine repeat dose, fallback loading regimen, planned cardioversion or recovery/disposition decision.']),
        gaps: gapsFor(values),
        derived: Object.freeze({
          emergencyRoute: false,
          preExcitationRoute: false,
          stableAfRvr: false,
          postInterventionWithoutRvr: true,
        }),
      });
    }
    return Object.freeze({
      values,
      entry: entryFor(values, urgency),
      actions: Object.freeze(sortActions(actions)),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: visibleStageIdsFor(actions),
      withheld: Object.freeze(['AF-specific rate-control, fallback and planned-cardioversion branches remain withheld until AF, no pre-excitation, a clinically rapid ventricular response and no attributable instability are explicitly established.']),
      gaps: gapsFor(values),
      derived: Object.freeze({
        emergencyRoute: false,
        preExcitationRoute: false,
        stableAfRvr: false,
      }),
    });
  }

  addTriggerAction(values, actions);
  if (values.phase === 'initial') {
    if (values.strategy === 'planned-rhythm-cardioversion') {
      addCardioversionSafeguards(values, actions);
      actions.push(makeAction(
        'planned-rhythm-not-an-automatic-procedure',
        'control',
        'Planned rhythm control: complete the source-aligned cardioversion review',
        'A stable AF label and a requested rhythm strategy do not authorize electrical or pharmacological conversion.',
        'ESC 2024 recommends rapid electrical cardioversion for acute/worsening haemodynamic instability caused by AF, but in other patients a wait-and-see approach can be considered. Procedure, sedation, device, antiarrhythmic and local authorization choices remain outside this engine.',
        esc2024,
        {tone: 'attention', resourceGroup: 'rhythm-evaluation'},
      ));
    } else {
      addInitialRateActions(values, actions);
      if (values.strategy === 'rate-control') {
        actions.push(makeAction(
          'rate-control-stroke-review',
          'stroke',
          'Complete stroke-prevention and bleeding-context review separately',
          'Improvement in rate does not decide anticoagulation or whether acute AF will recur.',
          'ESC AF-CARE and ACC AF guidance require patient-specific thromboembolic-risk assessment. This engine does not calculate a score, choose an anticoagulant or generate a prescription.',
          esc2024,
        ));
      }
    }
    return Object.freeze({
      values,
      entry: entryFor(values, urgency),
      actions: Object.freeze(sortActions(actions)),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: visibleStageIdsFor(actions),
      withheld: Object.freeze(values.strategy === 'unknown'
        ? ['A rate-agent dose and planned-cardioversion route remain withheld until a strategy is selected.']
        : []),
      gaps: gapsFor(values),
      derived: Object.freeze({
        emergencyRoute: false,
        preExcitationRoute: false,
        stableAfRvr: true,
      }),
    });
  }

  addReassessmentActions(values, actions);
  return Object.freeze({
    values,
    entry: entryFor(values, urgency),
    actions: Object.freeze(sortActions(actions)),
    stageNotes: stageNotes(values, urgency),
    visibleStageIds: visibleStageIdsFor(actions),
    withheld: Object.freeze(values.response !== 'adequate'
      ? ['Recovery/disposition is not inferred from this AF response screen; complete the current rhythm, trigger, medication and stroke-prevention review.']
      : []),
    gaps: gapsFor(values),
    derived: Object.freeze({
      emergencyRoute: false,
      preExcitationRoute: false,
      stableAfRvr: true,
    }),
  });
}

export const config = Object.freeze({
  id: 'atrial-fibrillation-rvr',
  title: 'Atrial Fibrillation with RVR',
  reviewedAt: '2026-09-17',
  scope: 'Adult acute AF with rapid ventricular response: entry confirmation, instability/pre-excitation escalation, a single monitored rate-control route, reassessment, and planned-cardioversion thromboembolism safeguards.',
  reviewLabel: 'Upgraded · ACC 2023 / ESC 2024 / AHA ACLS 2025 review',
  reviewLimitations: Object.freeze([
    'This is an adult acute-care review aid, not a diagnosis, ECG interpretation service, cardioversion procedure, defibrillator configuration, sedation plan, local medication order, anticoagulation prescription, infusion-pump protocol, medication-administration record or authorization.',
    'AHA ACLS emergency escalation, ACC acute-rate doses and ESC/ACC cardioversion safeguards have different scopes. The 24-hour ESC and 48-hour ACC cardioversion thresholds are displayed as a source difference, not merged into a new rule.',
    'Product selection, prepared concentration, pump/device, IV access, dose calculation, renal/hepatic adjustment, interaction review, live availability/orderability and patient-specific suitability require separate verification.',
    'Pre-excited/wide-irregular AF, attributable instability, shock, acute heart failure, ongoing ischaemia or worsening physiology require emergency/critical-care rhythm management outside this compact engine.',
  ]),
  sources: Object.freeze([acc2023, esc2024, ahaAcls2025]),
  entry: Object.freeze({
    title: 'Does this establish stable AF with RVR?',
    guidance: 'Confirm AF, exclude pre-excitation, establish a clinically rapid ventricular response and assess whether instability is attributable to the tachyarrhythmia. Urgent findings override phase selection.',
    source: acc2023,
  }),
  fields: AF_RVR_FIELDS,
  stages: Object.freeze([
    Object.freeze({id: 'assess', title: 'Entry & cause review', empty: 'Confirm rhythm, pre-excitation screen, ventricular-response context, instability and acute trigger.'}),
    Object.freeze({id: 'stabilize', title: 'Immediate escalation', empty: 'No attributable instability or pre-excitation emergency route is selected.'}),
    Object.freeze({id: 'control', title: 'Rate / rhythm strategy', empty: 'Select a source-aligned strategy after entry and safety fields are explicit.'}),
    Object.freeze({id: 'reassess', title: 'Reassess response', empty: 'Review observed rhythm/rate, BP, perfusion, symptoms, trigger and medication exposure after intervention.'}),
    Object.freeze({id: 'stroke', title: 'Cardioversion & stroke safeguards', empty: 'Keep anticoagulation/stroke review separate from rate response.'}),
  ]),
  visibleFieldKeys,
  evaluate,
  quickReference: Object.freeze({
    summary: 'Confirm AF, exclude pre-excitation, cardiovert attributable instability, choose one monitored stable rate strategy, and keep acute-trigger plus thromboembolism review separate from rate response.',
    recognition: Object.freeze([
      'Review the ECG rhythm/QRS pattern, BP/perfusion, symptoms, acute heart failure, ischaemia, mental status and whether the tachyarrhythmia is the driver of instability.',
      'Evaluate acute triggers in parallel: sepsis, hypoxaemia, ischaemia, fluid overload/depletion, cardiogenic shock, electrolytes and medication effects.',
      'Reconcile all recent AV-nodal exposure before repeating or adding a rate-control agent.',
    ]),
    redFlags: Object.freeze([
      'Hypotension, shock, acute altered mental status, ischemic chest discomfort or acute heart failure attributable to the tachyarrhythmia.',
      'Wide-irregular rhythm or pre-excitation concern: avoid beta-blocker, diltiazem/verapamil, digoxin and IV amiodarone.',
      'Decompensated heart failure, critical illness, worsening response, medication-timing overlap, unknown onset before planned cardioversion, or unresolved anticoagulation/TOE safeguard.',
    ]),
    steps: Object.freeze([
      Object.freeze({
        role: 'Unstable AF/tachyarrhythmia',
        text: 'AHA ACLS: immediate synchronized cardioversion if instability is attributable to AF/flutter with RVR. For confirmed AF on a US-approved biphasic device, initial energy is at least 200 J; sedate whenever feasible without delaying care.',
        dosingNote: 'Use the device and local resuscitation protocol; the engine does not configure shocks, pads, waveform or sedation.',
      }),
      Object.freeze({
        role: 'Stable rate control',
        text: 'Choose one route: esmolol 500 mcg/kg IV over 1 min then 50–300 mcg/kg/min, or diltiazem 0.25 mg/kg IV over 2 min then 0.35 mg/kg after 15 min if needed (LVEF >40% route).',
        dosingNote: 'Reconcile recent AV-nodal therapy and reassess BP/perfusion before any repeat or additional agent.',
      }),
      Object.freeze({
        role: 'Fallback / cardioversion safeguards',
        text: 'Digoxin and IV amiodarone are conditional fallback reviews, not automatic co-loading. Planned cardioversion preserves ESC >24-hour and ACC ≥48-hour pre-cardioversion safeguards separately.',
        dosingNote: 'No anticoagulant, antiarrhythmic, pump, local-product or cardioversion order is created.',
      }),
    ]),
    monitoring: Object.freeze([
      'Continuous rhythm monitoring with repeated BP/perfusion, symptoms and ECG/rhythm review around acute intervention.',
      'Reassess acute trigger, LV/HF context, kidney function, potassium/magnesium and interacting medication exposure before a fallback agent.',
      'Document the rate/rhythm strategy, observed response, cardioversion duration/safeguard decision when relevant, stroke-prevention review and follow-up plan.',
    ]),
    sources: Object.freeze([acc2023, esc2024, ahaAcls2025]),
  }),
});

export default config;
