// Adult ward delirium review aid. Manual categorical findings only; no chart,
// order, medication-administration, diagnosis, or authorization behavior.

export const NICE_DELIRIUM_SOURCE = 'https://www.nice.org.uk/guidance/cg103/chapter/Recommendations';
export const MHRA_HALOPERIDOL_DELIRIUM_SOURCE = 'https://www.gov.uk/drug-safety-update/haloperidol-haldol-reminder-of-risks-when-used-in-elderly-patients-for-the-acute-treatment-of-delirium';

const nice = Object.freeze({
  label: 'NICE CG103 delirium guidance (updated 2023)',
  url: NICE_DELIRIUM_SOURCE,
});
const mhra = Object.freeze({
  label: 'MHRA haloperidol safety reminder for acute delirium (2021)',
  url: MHRA_HALOPERIDOL_DELIRIUM_SOURCE,
});

const field = (key, label, options, threshold) => Object.freeze({
  key,
  label,
  options: Object.freeze([['unknown', 'Not assessed'], ...options]),
  ...(threshold ? {threshold} : {}),
});

export const DELIRIUM_FIELDS = Object.freeze([
  field('phase', 'Review point', [
    ['initial', 'Initial review'],
    ['reassessment', 'After initial care'],
  ]),
  field('currentDanger', 'Medical / neurologic emergency now?', [
    ['yes', 'Present'],
    ['no', 'Absent · assessed'],
  ], 'New focal deficit, unresponsiveness, seizure/status, airway or circulatory compromise overrides a delirium screen.'),
  field('acuteChange', 'Acute or fluctuating change?', [
    ['present', 'Present'],
    ['absent', 'Absent · assessed'],
  ], 'Ask the person, family or staff about a change over hours to days in attention, awareness, cognition, mobility, sleep, perception or behaviour.'),
  field('setting', 'Care setting for the screen?', [
    ['ward-or-long-term-care', 'Ward / long-term care'],
    ['critical-care-or-recovery', 'Critical care / recovery'],
  ], 'NICE specifies 4AT for ward/long-term care and CAM-ICU or ICDSC for critical care/recovery.'),
  field('screen', 'Delirium screen result?', [
    ['positive', 'Positive'],
    ['negative', 'Negative · assessed'],
  ], 'A positive 4AT, CAM-ICU or ICDSC prompts a competent clinical assessment; it does not itself establish a final diagnosis.'),
  field('causeStatus', 'Possible cause review?', [
    ['not-started', 'Not yet started'],
    ['being-treated', 'Cause(s) identified / being treated'],
    ['unresolved', 'Still unresolved'],
  ], 'Consider more than one cause. Use symptoms, observations, examination, medicines and directed testing rather than a routine panel.'),
  field('distressRisk', 'Distress or risk to self / others?', [
    ['yes', 'Present'],
    ['no', 'No · redirectable / assessed'],
  ], 'Hypoactive delirium can still be distressing. This is separate from an immediate medical emergency.'),
  field('deescalation', 'Verbal / non-verbal de-escalation?', [
    ['effective', 'Effective'],
    ['ineffective-or-inappropriate', 'Ineffective / inappropriate'],
  ], 'Use communication, reorientation, reassurance and a suitable environment first when it is safe to do so.'),
  field('haloperidolSafety', 'Haloperidol safety review?', [
    ['cleared', 'ECG / electrolytes reviewed; no PD / Lewy-body dementia'],
    ['qt-or-electrolyte-risk', 'QT / electrolyte concern'],
    ['parkinson-or-lewy-body', 'Parkinson disease / Lewy-body dementia'],
  ], 'In frail or older people, MHRA advises baseline ECG, correction of electrolyte disturbance and monitoring. Parkinson disease and dementia with Lewy bodies are contraindications.'),
  field('priorCalmingMedicine', 'Short-term calming medicine already given?', [
    ['not-given', 'Not given · verified'],
    ['given', 'Given · agent, dose and time recorded'],
  ], 'Reconcile the exact product, dose, route, time, response and adverse effects before any further medicine.'),
  field('response', 'Current course?', [
    ['controlled', 'Settled / no new danger'],
    ['persistent', 'Persistent'],
    ['worse-or-new-emergency', 'Worse / new emergency'],
  ], 'Persistent symptoms need renewed cause review. A new deterioration overrides earlier reassurance or apparent control.'),
]);

export function normalizeDelirium(input = {}) {
  return Object.fromEntries(DELIRIUM_FIELDS.map(item => [
    item.key,
    item.options.some(([value]) => value === input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

export function visibleFieldKeys(input = {}) {
  const v = normalizeDelirium(input);
  const keys = ['phase', 'currentDanger', 'acuteChange'];
  if (v.currentDanger === 'no' && v.acuteChange === 'present') {
    keys.push('setting', 'screen');
    if (v.screen === 'positive') {
      keys.push('causeStatus', 'distressRisk');
      if (v.distressRisk === 'yes') {
        keys.push('deescalation');
        if (v.deescalation === 'ineffective-or-inappropriate') {
          keys.push('haloperidolSafety', 'priorCalmingMedicine');
        }
      }
    }
    if (v.phase === 'reassessment') {
      if (!keys.includes('causeStatus')) keys.push('causeStatus');
      if (!keys.includes('distressRisk')) keys.push('distressRisk');
      if (!keys.includes('priorCalmingMedicine')) keys.push('priorCalmingMedicine');
      keys.push('response');
    }
  }
  return keys;
}

const STAGES = Object.freeze(['entry', 'assess', 'support', 'reassess']);

export function evaluateEntry(input = {}) {
  const v = normalizeDelirium(input);
  const urgent = v.currentDanger === 'yes' || (v.phase === 'reassessment' && v.response === 'worse-or-new-emergency');
  const status = urgent ? 'urgent'
    : v.acuteChange === 'present' && v.screen === 'positive' ? 'screen-positive'
      : v.acuteChange === 'present' && v.screen === 'negative' ? 'screen-negative'
        : v.acuteChange === 'absent' ? 'not-established' : 'unknown';
  const title = urgent ? 'Emergency assessment overrides delirium review'
    : status === 'screen-positive' ? 'Positive delirium screen needs diagnostic assessment'
      : status === 'screen-negative' ? 'Negative screen does not settle an acute change'
        : status === 'not-established' ? 'Delirium indicators not established' : 'Confirm acute change before screening';
  const summary = urgent
    ? 'Act on the current emergency first; a screen cannot make focal neurology, unresponsiveness or status safe.'
    : status === 'screen-positive'
      ? 'A screen is an assessment result, not a final delirium diagnosis.'
      : 'Acute change, the appropriate screen, cause review and current safety remain separate findings.';
  return {status, title, summary, source: nice};
}

export function evaluate(input = {}) {
  const v = normalizeDelirium(input);
  const actions = [];
  const add = (id, stage, title, summary, detail, extra = {}) => actions.push({
    id, stage, title, summary, detail,
    sourceUrl: nice.url,
    sourceLabel: nice.label,
    ...extra,
  });
  const worsening = v.phase === 'reassessment' && v.response === 'worse-or-new-emergency';
  const urgent = v.currentDanger === 'yes' || worsening;
  const routine = v.phase === 'initial' && v.currentDanger === 'no' && !urgent;
  const reassessment = v.phase === 'reassessment' && v.currentDanger === 'no' && !urgent;

  if (urgent) add(
    'delirium-emergency-override', 'entry', 'Urgent emergency assessment',
    'Current danger or worsening overrides a delirium screen and any calming-medication route.',
    'Assess airway, breathing, circulation, glucose, consciousness and the suspected neurologic or medical cause. Route focal deficit, new unresponsiveness or seizure/status through the relevant emergency pathway; do not wait for 4AT, CAM-ICU or ICDSC completion.',
    {tone: 'urgent', resourceGroup: 'delirium-evaluation'},
  );
  if (v.currentDanger === 'unknown') add(
    'delirium-check-current-danger', 'entry', 'Assess current emergency features',
    'Unknown emergency status cannot support a ward-delirium or calming-medicine route.',
    'Review consciousness, focal neurology, seizure activity, airway, breathing, circulation and bedside glucose before proceeding.',
    {tone: 'attention', resourceGroup: 'delirium-evaluation'},
  );
  if (v.acuteChange === 'unknown') add(
    'delirium-confirm-acute-change', 'entry', 'Confirm an acute / fluctuating change',
    'Ask family, staff and the person about the time course and baseline.',
    'NICE indicators include hours-to-days changes in cognition, perception, physical function or social behaviour. Hypoactive presentations can be missed.',
    {resourceGroup: 'delirium-evaluation'},
  );
  if (v.acuteChange === 'absent') add(
    'delirium-indicators-not-established', 'entry', 'Delirium indicators not established',
    'Reassess the alternative cause of the presentation; this does not establish a normal mental state.',
    'New focal signs, reduced consciousness, seizure, hypoxia, hypoglycaemia, intoxication or withdrawal still need their own assessment.',
    {resourceGroup: 'delirium-evaluation'},
  );

  if (v.acuteChange === 'present' && v.currentDanger === 'no' && !urgent) {
    if (v.setting === 'unknown') add(
      'delirium-select-screen-setting', 'assess', 'Select the screening setting',
      'Use 4AT on the ward; use CAM-ICU or ICDSC in critical care / recovery.',
      'The setting selects a screening method, not a diagnosis. The recorded screen should reflect the current episode and treatment timing.',
      {resourceGroup: 'delirium-evaluation'},
    );
    if (v.screen === 'unknown') add(
      'delirium-perform-appropriate-screen', 'assess', 'Perform the appropriate screen',
      'Screen the acute change, then obtain a competent clinical assessment if it is positive.',
      'NICE uses 4AT in ward/long-term care and CAM-ICU or ICDSC in critical care/recovery. A missing screen is not a negative result.',
      {resourceGroup: 'delirium-evaluation'},
    );
    if (v.screen === 'positive') add(
      'delirium-positive-screen-assessment', 'assess', 'Positive screen: clinical assessment',
      'A clinician with relevant expertise makes the final diagnosis.',
      'A positive screen is not the final diagnosis. If delirium and dementia are difficult to separate, NICE advises managing the delirium first. Retain the emergency override for any new focal deficit, unresponsiveness or seizure/status.',
      {resourceGroup: 'delirium-evaluation'},
    );
    if (v.screen === 'negative') add(
      'delirium-negative-screen-not-diagnosis', 'assess', 'Negative screen: reassess the acute change',
      'A negative screen does not establish a non-delirium diagnosis or a safe disposition.',
      'Recheck the trajectory, collateral history, current illness and medicines if concern persists or fluctuates.',
      {tone: 'attention', resourceGroup: 'delirium-evaluation'},
    );
    if (v.screen === 'positive') {
      if (['unknown', 'not-started'].includes(v.causeStatus)) add(
        'delirium-identify-and-treat-causes', 'assess', 'Identify and treat cause(s)',
        'Look for a cause or combination of causes with directed bedside assessment and tests.',
        'Use observations, examination, medicines, oxygenation, glucose and selectively chosen investigations. There is no routine delirium panel.',
        {resourceGroup: 'delirium-evaluation'},
      );
      if (v.causeStatus === 'unresolved') add(
        'delirium-unresolved-cause-review', 'assess', 'Reopen the cause review',
        'Persistent uncertainty needs renewed clinical assessment rather than symptom suppression alone.',
        'Review time course, infection/inflammation, pain, urinary/retention or constipation concerns, dehydration, hypoxia, metabolic disturbance, medications, intoxication and withdrawal in context.',
        {tone: 'attention', resourceGroup: 'delirium-evaluation'},
      );
      if (v.screen === 'positive') add(
        'delirium-reorientation-and-environment', 'support', 'Reorient, reassure and support',
        'Use clear communication, familiar people and a suitable environment while the cause is treated.',
        'NICE recommends effective communication, reorientation and reassurance; consider family, friends and carers. This support applies alongside, not instead of, treatment of the cause.',
      );
      if (v.distressRisk === 'unknown') add(
        'delirium-assess-distress-and-risk', 'support', 'Assess distress and safety risk',
        'Distress/risk determines whether de-escalation and a short-term medicine discussion are relevant.',
        'Do not infer absence from a hypoactive presentation. Separate behavioural risk from current focal neurology, unresponsiveness, airway or circulatory danger.',
      );
      if (v.distressRisk === 'no') add(
        'delirium-support-without-routine-antipsychotic', 'support', 'Continue support and cause treatment',
        'No distress/risk route has been entered; continue reorientation and review the cause.',
        'NICE reserves short-term haloperidol for distress or risk after verbal/non-verbal de-escalation is ineffective or inappropriate. This guide does not select a routine antipsychotic for delirium.',
      );
      if (v.distressRisk === 'yes' && v.deescalation === 'unknown') add(
        'delirium-first-deescalation', 'support', 'Use verbal / non-verbal de-escalation first',
        'Try to reduce distress safely before considering a medicine.',
        'Use communication, reorientation, reassurance and environmental adjustment. Escalate urgently when the person cannot be kept safe or a medical emergency is present.',
      );
      if (v.distressRisk === 'yes' && v.deescalation === 'effective') add(
        'delirium-deescalation-effective', 'support', 'Continue de-escalation and cause treatment',
        'Recheck safety and triggers; do not turn temporary calm into a final diagnosis.',
        'Document the current course and involve familiar carers when helpful. Reopen the emergency route for any deterioration.',
      );
      if (v.distressRisk === 'yes' && v.deescalation === 'ineffective-or-inappropriate') {
        if (v.haloperidolSafety === 'unknown') add(
          'delirium-complete-haloperidol-safety-review', 'support', 'Complete medication safety review',
          'Before short-term haloperidol, review ECG/QT, electrolytes, Parkinson disease / Lewy-body dementia and current medicines.',
          'MHRA advises baseline ECG and correction of electrolyte disturbance in frail or older people, with cardiac/electrolyte and extrapyramidal-effect monitoring during treatment.',
          {tone: 'attention', sourceUrl: mhra.url, sourceLabel: mhra.label, resourceGroup: 'delirium-agitation-products'},
        );
        if (['qt-or-electrolyte-risk', 'parkinson-or-lewy-body'].includes(v.haloperidolSafety)) add(
          'delirium-haloperidol-safety-block', 'support', 'Haloperidol safety concern: obtain alternative review',
          'Do not use the routine haloperidol consideration route while this risk is present.',
          'MHRA lists Parkinson disease and dementia with Lewy bodies as contraindications and warns about QTc/electrolyte risk. Treat the cause and seek appropriate specialist/local prescribing support.',
          {tone: 'attention', sourceUrl: mhra.url, sourceLabel: mhra.label, resourceGroup: 'delirium-agitation-products'},
        );
        if (v.haloperidolSafety === 'cleared' && v.priorCalmingMedicine === 'unknown') add(
          'delirium-reconcile-prior-calming-medicine', 'support', 'Reconcile prior calming medicine',
          'Confirm whether a medicine was given before selecting a new short-term consideration.',
          'Record the exact product, dose, route, time, response, sedation level, ECG/electrolyte context and adverse effects. Local product presence does not validate a patient-specific regimen.',
          {resourceGroup: 'delirium-agitation-products'},
        );
        if (routine && v.haloperidolSafety === 'cleared' && v.priorCalmingMedicine === 'not-given') add(
          'delirium-short-term-haloperidol-consideration', 'support', 'Consider short-term haloperidol',
          'Only after ineffective/inappropriate de-escalation, safety review and local prescribing assessment.',
          'NICE advises the lowest clinically appropriate dose with cautious titration, usually for 1 week or less. This guide intentionally does not turn the local raw dose rows into a universal delirium regimen; confirm product, dose, route, monitoring and contraindications locally.',
          {sourceUrl: mhra.url, sourceLabel: mhra.label, resourceGroup: 'delirium-agitation-products'},
        );
        if (v.priorCalmingMedicine === 'given') add(
          'delirium-prior-medicine-no-automatic-repeat', 'support', 'Review response before any further medicine',
          'Do not automatically repeat an initial calming medicine.',
          'Reconcile the drug, dose, route, timing, effect, ECG/electrolytes, sedation, aspiration/fall risk and extrapyramidal effects; re-open cause and safety assessment.',
          {tone: 'attention', sourceUrl: mhra.url, sourceLabel: mhra.label, resourceGroup: 'delirium-agitation-products'},
        );
      }
    }
  }

  if (reassessment && v.acuteChange === 'present') {
    if (v.response === 'unknown') add(
      'delirium-record-current-course', 'reassess', 'Record the current course',
      'Reassess attention, consciousness, distress, safety, cause treatment and any prior medicine.',
      'Improvement in one finding does not establish resolution. Reopen emergency assessment for new focal signs, unresponsiveness or seizure/status.',
      {resourceGroup: 'delirium-evaluation'},
    );
    if (v.response === 'persistent') add(
      'delirium-persistent-reassessment', 'reassess', 'Persistent delirium: reopen cause review',
      'Repeat the safety, trigger and treatment review; persistent symptoms do not by themselves prove a new emergency.',
      'Re-evaluate possible causes, medication exposures, sleep/wake disruption, pain and the current support plan. Escalate immediately if focal signs, reduced consciousness, seizure/status or ABC compromise emerges.',
      {tone: 'attention', resourceGroup: 'delirium-evaluation'},
    );
    if (v.response === 'controlled' && v.distressRisk === 'yes') add(
      'delirium-controlled-distress-conflict', 'reassess', 'Reconcile ongoing distress with “settled”',
      'Current distress/risk and a controlled response cannot both establish recovery without clarification.',
      'Recheck current behaviour, safety, cause treatment and any medicine effect. If there is new medical danger, use the emergency route rather than a recovery review.',
      {tone: 'attention', resourceGroup: 'delirium-evaluation'},
    );
    if (v.response === 'controlled' && v.distressRisk === 'unknown') add(
      'delirium-controlled-distress-unconfirmed', 'reassess', 'Confirm current distress / risk',
      'A settled interval cannot establish recovery while current distress/risk remains unassessed.',
      'Recheck behaviour, safety, support needs and any medicine effect. Use the emergency route if a medical/neuro danger has emerged.',
      {tone: 'attention', resourceGroup: 'delirium-evaluation'},
    );
    if (v.response === 'controlled' && v.distressRisk === 'no') add(
      'delirium-controlled-reassessment', 'reassess', 'Controlled: continue cause review',
      'Continue support and review whether any short-term medicine can be reduced or stopped.',
      'A settled interval is not a final diagnosis or discharge decision. NICE advises re-evaluating underlying causes if delirium does not resolve and considering dementia follow-up only after the acute episode is addressed.',
    );
  }

  const entry = evaluateEntry(v);
  return {
    values: v,
    entry,
    actions,
    derived: Object.freeze({urgent}),
    visibleStageIds: STAGES.filter(stage => actions.some(action => action.stage === stage)),
    stageNotes: Object.freeze({}),
    gaps: visibleFieldKeys(v).filter(key => v[key] === 'unknown'),
    withheld: Object.freeze([]),
  };
}

export const config = Object.freeze({
  id: 'delirium',
  title: 'Delirium / acute confusional state',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · NICE delirium review',
  scope: 'Adult ward/long-term-care delirium recognition, screening, cause review, support, short-term behavioural-safety consideration and reassessment. It is not a diagnosis, emergency-neurology protocol, medication order, dosing protocol or discharge decision.',
  fields: DELIRIUM_FIELDS,
  visibleFieldKeys,
  evaluate,
  evaluateEntry,
  regimenActionIds: Object.freeze([]),
  conflictActionIds: Object.freeze(['delirium-controlled-distress-conflict']),
  sources: Object.freeze([nice, mhra]),
  reviewLimitations: Object.freeze([
    'NICE supplies the current ward-screening and short-term-haloperidol principles, not a universal numeric delirium regimen.',
    'Local order sets and regimens are separate from this guide and are not current prescribing guidance.',
  ]),
  stages: Object.freeze([
    {id: 'entry', title: 'Current safety'},
    {id: 'assess', title: 'Screen & cause review'},
    {id: 'support', title: 'Support & behavioural safety'},
    {id: 'reassess', title: 'Current course'},
  ]),
  quickReference: Object.freeze({
    summary: 'Confirm acute change and current danger; a positive screen starts clinical assessment and cause treatment.',
    recognition: Object.freeze(['Hours-to-days, fluctuating disturbance in attention, awareness or cognition; hypoactive presentations are easily missed.']),
    redFlags: Object.freeze(['New focal deficit, unresponsiveness, seizure/status, airway, breathing or circulatory compromise.', 'Worsening after initial care or medication.']),
    steps: Object.freeze([
      {role: 'Screen', text: '4AT on the ward; CAM-ICU or ICDSC in critical care/recovery.'},
      {role: 'Treat', text: 'Identify and manage one or more causes; reorient and reassure.'},
    ]),
    monitoring: Object.freeze(['Reassess consciousness, attention, current safety, trigger treatment and any medicine effect.']),
    sources: Object.freeze([nice, mhra]),
  }),
});

export default config;
