// Compact, source-reviewed decision support for adults with severely elevated
// blood pressure. It records a session-local assessment only: it does not read
// a chart, place an order, choose a patient-specific dose, or authorize treatment.

export const AHA_ACUTE_CARE_2024_SOURCE = 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000238';
export const ACC_AHA_HYPERTENSION_2025_SOURCE = 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001356';
export const ESC_HYPERTENSION_2024_SOURCE = 'https://academic.oup.com/eurheartj/article/45/38/3912/7741010';

const ahaAcuteCare = Object.freeze({
  label: 'AHA scientific statement: elevated BP in acute care (2024)',
  url: AHA_ACUTE_CARE_2024_SOURCE,
});
const accAha2025 = Object.freeze({
  label: '2025 ACC/AHA high blood pressure guideline',
  url: ACC_AHA_HYPERTENSION_2025_SOURCE,
});
const esc2024 = Object.freeze({
  label: '2024 ESC elevated BP and hypertension guideline',
  url: ESC_HYPERTENSION_2024_SOURCE,
});

export const SEVERE_BP_SOURCES = Object.freeze([ahaAcuteCare, accAha2025, esc2024]);

export const SEVERE_BP_FIELDS = Object.freeze([
  Object.freeze({
    key: 'reviewPhase',
    label: 'Review point?',
    options: Object.freeze([
      ['unknown', 'Not established'],
      ['initial-assessment', 'Initial assessment / initial plan'],
      ['after-initial-bp-action', 'After an initial BP action · review response'],
    ]),
    threshold: 'Initial action and response are separate. Unknown does not restart treatment.',
  }),
  Object.freeze({
    key: 'repeatBp',
    label: 'Accurate repeat BP?',
    options: Object.freeze([
      ['unknown', 'Not confirmed'],
      ['severe-confirmed', 'Repeat remains in the severe range'],
      ['not-severe-confirmed', 'Repeat is below the severe range'],
    ]),
    threshold: 'Repeat with correct cuff and position. ACC/AHA 2025: >180 systolic and/or >120 diastolic; the number alone does not establish emergency.',
    help: 'Record measured systolic/diastolic values and time separately. Pain, distress, acute illness and measurement technique can alter the reading.',
  }),
  Object.freeze({
    key: 'acuteTargetOrganDamage',
    label: 'New or worsening acute target-organ damage?',
    options: Object.freeze([
      ['unknown', 'Not assessed / unconfirmed'],
      ['present', 'Present'],
      ['absent', 'Absent · assessed'],
    ]),
    threshold: 'Assess new/worsening brain, heart/lung, aortic, kidney or retinal/microvascular injury. Chronic findings alone do not establish emergency.',
    help: 'Examples include hypertensive encephalopathy, intracranial haemorrhage or acute ischaemic stroke, acute coronary syndrome, acute pulmonary oedema/heart failure, acute aortic syndrome, acute kidney injury, retinal haemorrhage/papilloedema or microangiopathy. Pregnancy-related severe hypertension needs its own route.',
  }),
  Object.freeze({
    key: 'immediateEmergencyPriority',
    label: 'Immediate emergency priority?',
    options: Object.freeze([
      ['unknown', 'Not assessed'],
      ['yes', 'Present'],
      ['no', 'Absent · assessed'],
    ]),
    threshold: 'Independent of phase: ABC compromise, neurologic change, seizure, chest/back pain, collapse or rapid deterioration needs urgent action now.',
  }),
  Object.freeze({
    key: 'emergencyPattern',
    label: 'Specific emergency pattern?',
    options: Object.freeze([
      ['unknown', 'Not classified'],
      ['none-identified', 'No specific pattern identified after assessment'],
      ['aortic-syndrome', 'Acute aortic syndrome / dissection'],
      ['acute-stroke-or-ich', 'Acute ischaemic stroke or intracranial haemorrhage'],
      ['pregnancy-severe-hypertension', 'Pregnancy / postpartum severe hypertension or eclampsia concern'],
      ['acute-cardiopulmonary', 'Acute coronary syndrome or pulmonary oedema / acute heart failure'],
      ['other-acute-hmod-no-compelling-exception', 'Other acute target-organ damage · no compelling exception identified'],
    ]),
    threshold: 'Aortic, stroke/ICH, pregnancy and acute cardiac/pulmonary patterns use condition-specific targets, not the general percentage target.',
  }),
  Object.freeze({
    key: 'initialStrategy',
    label: 'Selected eligible initial strategy?',
    options: Object.freeze([
      ['unknown', 'Not selected'],
      ['nicardipine', 'Nicardipine IV'],
      ['labetalol', 'Labetalol IV'],
      ['other-specialist-plan', 'Other specialist plan'],
    ]),
    threshold: 'Shown only for the eligible nonstroke, nonpregnant general-emergency route. Named exceptions use their own pathway.',
  }),
  Object.freeze({
    key: 'nicardipineSafety',
    label: 'Nicardipine safety gate?',
    options: Object.freeze([
      ['unknown', 'Not cleared'],
      ['eligible', 'No advanced aortic stenosis identified'],
      ['advanced-aortic-stenosis', 'Advanced aortic stenosis present / concern'],
    ]),
    threshold: 'ACC/AHA 2025 Table 26 lists advanced aortic stenosis as a contraindication.',
  }),
  Object.freeze({
    key: 'labetalolSafety',
    label: 'Labetalol safety gate?',
    options: Object.freeze([
      ['unknown', 'Not cleared'],
      ['eligible', 'No listed current concern identified'],
      ['reactive-airway-or-obstructive-lung', 'Reactive airway / obstructive lung disease'],
      ['bradycardia-heart-block-or-decompensated-hf', 'Bradycardia, 2nd/3rd-degree block, or decompensated HF'],
    ]),
    threshold: 'Do not use with reactive airway/obstructive lung disease; avoid with bradycardia, 2nd/3rd-degree block or decompensated HF.',
  }),
  Object.freeze({
    key: 'priorBpTreatmentExposure',
    label: 'Prior BP-agent exposure?',
    options: Object.freeze([
      ['unknown', 'Not reconciled'],
      ['none-confirmed', 'None confirmed'],
      ['one-or-more-confirmed', 'One or more actions confirmed'],
      ['unclear-or-multiple', 'Unclear or multiple exposures'],
    ]),
    threshold: 'Before an initial regimen or response decision, reconcile agent, route, timing and total exposure. Never repeat a loading/initial sequence automatically.',
  }),
  Object.freeze({
    key: 'responseState',
    label: 'Current BP / organ-damage response?',
    options: Object.freeze([
      ['unknown', 'Not established'],
      ['improving-within-named-plan', 'Improving / stable within a named plan'],
      ['persistent-or-worsening', 'Persistent or worsening BP / organ findings'],
      ['excessive-fall-or-hypoperfusion', 'Excessive fall or new hypoperfusion concern'],
    ]),
    threshold: 'A lower BP alone does not establish recovery. Reassess the organ finding and harm from excessive reduction alongside the measured BP trend.',
  }),
]);

const validValues = Object.freeze(Object.fromEntries(SEVERE_BP_FIELDS.map(field => [field.key, new Set(field.options.map(([value]) => value))])));
const stages = Object.freeze([
  Object.freeze({id: 'confirm', title: 'Confirm BP and acute organ status', empty: 'Confirm a credible repeat BP and whether new or worsening acute target-organ damage is present.'}),
  Object.freeze({id: 'urgent', title: 'Immediate safety and exception route', empty: 'Keep immediate emergency features and named condition-specific exceptions visible.'}),
  Object.freeze({id: 'route', title: 'Choose the bounded BP route', empty: 'Classify the acute target-organ context before considering a general BP-reduction target.'}),
  Object.freeze({id: 'reassess', title: 'Keep initial action and response separate', empty: 'Record whether this is initial planning or a response review, then reconcile actual exposure and current organ status.'}),
]);
const stageRank = Object.freeze(Object.fromEntries(stages.map((stage, index) => [stage.id, index])));
const namedExceptionPatterns = new Set([
  'aortic-syndrome',
  'acute-stroke-or-ich',
  'pregnancy-severe-hypertension',
  'acute-cardiopulmonary',
]);

export function normalizeSevereBp(input = {}) {
  return Object.freeze(Object.fromEntries(SEVERE_BP_FIELDS.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ])));
}

const isNamedException = values => namedExceptionPatterns.has(values.emergencyPattern);
const isGeneralEmergencyRoute = values => (
  values.repeatBp === 'severe-confirmed'
  && values.acuteTargetOrganDamage === 'present'
  && values.emergencyPattern === 'other-acute-hmod-no-compelling-exception'
);

export function visibleFieldKeys(input = {}) {
  const values = normalizeSevereBp(input);
  const keys = ['reviewPhase', 'repeatBp', 'acuteTargetOrganDamage', 'immediateEmergencyPriority', 'emergencyPattern'];
  if (values.reviewPhase === 'initial-assessment' && isGeneralEmergencyRoute(values) && values.immediateEmergencyPriority === 'no') {
    keys.push('initialStrategy');
    if (values.initialStrategy === 'nicardipine') keys.push('nicardipineSafety', 'priorBpTreatmentExposure');
    if (values.initialStrategy === 'labetalol') keys.push('labetalolSafety', 'priorBpTreatmentExposure');
  }
  if (values.reviewPhase === 'after-initial-bp-action') keys.push('priorBpTreatmentExposure', 'responseState');
  return Object.freeze(keys);
}

function action(id, stage, title, summary, detail, {
  tone,
  source = ahaAcuteCare,
  resourceGroup,
  related,
} = {}) {
  return Object.freeze({
    id,
    stage,
    title,
    summary,
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...(tone ? {tone} : {}),
    ...(resourceGroup ? {resourceGroup} : {}),
    ...(related ? {related: Object.freeze(related)} : {}),
  });
}

function addConfirmationActions(actions, values) {
  if (values.repeatBp === 'unknown') {
    actions.push(action(
      'repeat-bp-with-accurate-technique',
      'confirm',
      'Confirm a credible repeat BP before classifying the number',
      'A single acute-care reading does not establish a severe-BP treatment route.',
      'Repeat BP with appropriate cuff and technique, then record the measured systolic/diastolic values, timing, patient condition and likely reversible contributors. AHA 2024 emphasizes proper measurement and assessment before pharmacologic action for asymptomatic elevated inpatient BP.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
  } else if (values.repeatBp === 'severe-confirmed') {
    actions.push(action(
      'repeat-severe-bp-confirmed',
      'confirm',
      'Repeat BP remains severely elevated',
      'The BP level alone does not determine whether this is a hypertensive emergency.',
      'Classify new or worsening acute target-organ damage and any condition-specific exception before using IV treatment, oral review, or a general BP-reduction target.',
      {resourceGroup: 'bp-evaluation'},
    ));
  } else {
    actions.push(action(
      'repeat-bp-not-in-severe-range',
      'confirm',
      'Repeat BP is below the severe range',
      'Do not dismiss acute organ injury because the repeat number is lower.',
      'Continue to assess new or worsening neurologic, cardiac, pulmonary, vascular, renal or pregnancy-related injury. The AHA statement cautions that BP-related target-organ damage can occur below a marked-elevation threshold in particular contexts.',
      {resourceGroup: 'bp-evaluation'},
    ));
  }

  if (values.acuteTargetOrganDamage === 'unknown') {
    actions.push(action(
      'assess-new-or-worsening-target-organ-damage',
      'confirm',
      'Establish whether acute target-organ damage is present',
      'Unknown organ status is not an asymptomatic severe-BP classification.',
      'Assess the current neurologic examination and symptoms, cardiac/pulmonary findings, aortic features, kidney/urine findings and retinal or microvascular concern in the clinical context. This guide does not infer absence from a missing result or a chronic baseline abnormality.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
  } else if (values.acuteTargetOrganDamage === 'present') {
    actions.push(action(
      'acute-target-organ-damage-present',
      'confirm',
      'New or worsening acute target-organ damage is present',
      'This needs an emergency, organ-specific route; BP level and treatment phase do not make it routine.',
      'ACC/AHA 2025 defines hypertensive emergency as severe BP with acute target-organ damage and recommends ICU-level continuous monitoring and consideration of appropriate parenteral therapy. The target and treatment still depend on the affected organ and any compelling condition.',
      {tone: 'urgent', source: accAha2025, resourceGroup: 'bp-evaluation'},
    ));
  } else {
    actions.push(action(
      'acute-target-organ-damage-assessed-absent',
      'confirm',
      'No new or worsening acute target-organ damage is currently established',
      'This assessed finding is distinct from a missing work-up and must be revisited if symptoms or trajectory change.',
      'AHA 2024 separates asymptomatic markedly elevated inpatient BP from hypertensive emergency by the presence of new or worsening target-organ damage, not by the number alone.',
      {source: ahaAcuteCare},
    ));
  }
}

function addImmediateSafetyActions(actions, values) {
  if (values.immediateEmergencyPriority === 'yes') {
    actions.push(action(
      'urgent-escalation-independent-of-phase',
      'urgent',
      'Activate urgent bedside assessment and appropriate emergency escalation',
      'Immediate danger is independent of the BP classification and review phase.',
      'Use local emergency/ABCDE support and the relevant specialty pathway now for current airway or breathing compromise, altered consciousness, seizure, focal neurologic deficit, collapse, rapidly worsening course, or acute chest/back symptoms. Do not wait for this guide to be complete.',
      {tone: 'urgent', resourceGroup: 'bp-evaluation'},
    ));
  } else if (values.immediateEmergencyPriority === 'unknown') {
    actions.push(action(
      'assess-immediate-emergency-priority',
      'urgent',
      'Assess immediate emergency priority',
      'An unassessed emergency priority is not a low-risk result.',
      'Check current ABCDE features, neurologic change, seizure, acute chest/back pain, pulmonary oedema, collapse and rapid deterioration while the BP and organ assessment proceeds.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
  }

  switch (values.emergencyPattern) {
    case 'aortic-syndrome':
      actions.push(action(
        'aortic-syndrome-condition-specific-target',
        'urgent',
        'Acute aortic syndrome: use the aortic emergency target, not the general percentage rule',
        'Urgently activate the aortic/emergency pathway; do not apply the generic 25% first-hour branch.',
        'ACC/AHA 2025 specifies systolic BP <120 mmHg during the first hour for acute aortic dissection while monitoring target-organ function. This guide does not choose anti-impulse therapy, beta-blocker suitability, vasodilator sequence, dose, line, infusion or imaging/procedural plan.',
        {tone: 'urgent', source: accAha2025, resourceGroup: 'iv-antihypertensive', related: ['acute-chest-pain-acs']},
      ));
      break;
    case 'acute-stroke-or-ich':
      actions.push(action(
        'acute-stroke-or-ich-condition-specific-target',
        'urgent',
        'Acute stroke / intracranial haemorrhage: use the stroke-specific BP pathway',
        'Do not apply the general hypertensive-emergency target while stroke subtype and treatment eligibility are unresolved.',
        'ACC/AHA 2025 discusses acute ischaemic stroke and intracranial haemorrhage in its cerebrovascular section separately from the nonstroke emergency pathway. Route to urgent stroke/ICH assessment, where target depends on subtype, timeline and reperfusion or procedural context.',
        {tone: 'urgent', source: accAha2025, resourceGroup: 'bp-evaluation', related: ['acute-stroke']},
      ));
      break;
    case 'pregnancy-severe-hypertension':
      actions.push(action(
        'pregnancy-severe-hypertension-condition-specific-target',
        'urgent',
        'Pregnancy or postpartum severe hypertension: use the obstetric emergency route',
        'Do not apply the nonpregnant general reduction target or select a general oral/IV regimen here.',
        'ACC/AHA 2025 treats hypertension in pregnancy separately. ESC 2024 regards acute severe hypertension persisting more than 15 minutes in pregnancy as a hypertensive emergency. Obtain urgent obstetric/maternal-medicine assessment, especially for neurologic symptoms, visual change, epigastric pain, pulmonary oedema or seizure concern.',
        {tone: 'urgent', source: esc2024, resourceGroup: 'iv-antihypertensive'},
      ));
      break;
    case 'acute-cardiopulmonary':
      actions.push(action(
        'acute-cardiopulmonary-condition-specific-target',
        'urgent',
        'Acute coronary or pulmonary-oedema pattern: use the condition-specific emergency route',
        'Do not assume the general percentage reduction target or a generic agent applies.',
        'ESC 2024 requires identification of the affected target organ and any intervention beyond BP lowering. Urgently evaluate the acute coronary syndrome or acute heart-failure/pulmonary-oedema pathway; treatment choice, target and monitoring depend on that condition and current haemodynamics.',
        {tone: 'urgent', source: esc2024, resourceGroup: 'iv-antihypertensive', related: ['acute-chest-pain-acs', 'acute-hypoxemia-dyspnea']},
      ));
      break;
    default:
      break;
  }

  if (isNamedException(values) && values.acuteTargetOrganDamage === 'absent') {
    actions.push(action(
      'reconcile-organ-damage-with-emergency-pattern',
      'urgent',
      'Reconcile the absent-organ-damage entry with the named emergency pattern',
      'A named aortic, stroke/ICH, pregnancy or acute cardiopulmonary pattern cannot be treated as routine asymptomatic severe BP.',
      'Clarify whether the pattern is suspected, confirmed, historical or entered in error. Keep urgent condition-specific assessment visible while reconciling the contradiction; do not open the asymptomatic oral-review branch from this conflict.',
      {tone: 'urgent', resourceGroup: 'bp-evaluation'},
    ));
  }
  if (isNamedException(values) && values.immediateEmergencyPriority === 'no') {
    actions.push(action(
      'reconcile-priority-with-emergency-pattern',
      'urgent',
      'Reconcile the low-priority entry with the named emergency pattern',
      'A named condition-specific emergency pattern needs prompt clinical verification.',
      'Recheck the current symptoms, signs, timeline and source of the pattern. The guide preserves the urgent exception route until the contradiction is resolved.',
      {tone: 'urgent', resourceGroup: 'bp-evaluation'},
    ));
  }
}

function addRouteActions(actions, values) {
  if (values.acuteTargetOrganDamage === 'unknown') {
    actions.push(action(
      'organ-status-unknown-withhold-bp-treatment-classification',
      'route',
      'Withhold both emergency and asymptomatic BP classifications until organ status is known',
      'Do not infer “no emergency” or select reflex IV/oral BP lowering from an unknown organ-damage entry.',
      'Complete the acute target-organ assessment and identify any condition-specific exception. AHA 2024 emphasizes that the key distinction is new or worsening target-organ damage, not a markedly elevated BP number alone.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
    return;
  }

  if (values.acuteTargetOrganDamage === 'present') {
    if (values.repeatBp !== 'severe-confirmed') {
      actions.push(action(
        'acute-organ-damage-not-downgraded-by-bp-number',
        'route',
        'Acute organ damage still needs an urgent condition-specific route',
        'A lower or unconfirmed repeat BP does not convert acute organ injury into asymptomatic BP elevation.',
        'AHA 2024 notes that BP-related target-organ damage can occur below the marked-elevation threshold in particular contexts. Do not apply this guide’s general nonstroke/nonpregnant target; route the affected organ and establish its target with the treating team.',
        {tone: 'urgent', resourceGroup: 'bp-evaluation'},
      ));
      return;
    }

    if (isNamedException(values)) {
      actions.push(action(
        'named-exception-supersedes-general-bp-target',
        'route',
        'Named exception supersedes the general BP-reduction target',
        'Use the condition-specific target and monitored pathway already shown above.',
        'The 2025 ACC/AHA recommendation separates stroke and pregnancy from the nonstroke/nonpregnant emergency target. ESC 2024 also requires identifying the affected organ and interventions beyond BP lowering before choosing treatment.',
        {tone: 'urgent', source: accAha2025, resourceGroup: 'bp-evaluation'},
      ));
      return;
    }

    if (isGeneralEmergencyRoute(values)) {
      if (values.reviewPhase === 'after-initial-bp-action' && values.responseState === 'excessive-fall-or-hypoperfusion') {
        actions.push(action(
          'excessive-fall-suspends-general-bp-target',
          'route',
          'Excessive fall or hypoperfusion suspends the general BP-reduction target',
          'Do not apply the first-hour percentage target or start/titrate an initial regimen until urgent reassessment is complete.',
          'Reconcile the measured BP trend, actual exposure, current perfusion and organ findings with the responsible team. ACC/AHA 2025 and ESC 2024 caution against excessive acute BP reduction; this response branch does not reissue the initial target or a drug regimen.',
          {tone: 'urgent', source: accAha2025, resourceGroup: 'bp-evaluation'},
        ));
        return;
      }
      actions.push(action(
        'general-hypertensive-emergency-monitored-plan',
        'route',
        'General nonstroke, nonpregnant hypertensive emergency: set a monitored clinician-owned plan',
        'No compelling exception is entered: limit first-hour SBP reduction to no more than 25%, then if stable toward <160/100 mmHg over 2–6 hours.',
        'ACC/AHA 2025 recommends ICU admission for continuous BP and target-organ monitoring and consideration of appropriate parenteral therapy. If stable, it advises cautious reduction toward 130–140 mmHg during 24–48 hours. This guide does not choose an agent, dose, route, infusion, line, target for an unentered condition, or order.',
        {tone: 'urgent', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
      ));
      return;
    }

    actions.push(action(
      'identify-exception-before-general-bp-target',
      'route',
      'Identify the affected organ and exception before using a general BP target',
      'Acute target-organ damage is present, but the entered pattern does not establish a safe general route.',
      'Clarify whether this is aortic disease, stroke/ICH, pregnancy/postpartum hypertension, acute coronary/pulmonary oedema, another compelling condition, or another acute organ injury without a compelling exception. Do not use a percentage target simply because the BP is severe.',
      {tone: 'urgent', source: esc2024, resourceGroup: 'bp-evaluation'},
    ));
    return;
  }

  if (values.repeatBp === 'severe-confirmed') {
    if (isNamedException(values)) return;
    if (values.immediateEmergencyPriority !== 'no') {
      actions.push(action(
        'immediate-priority-withhold-asymptomatic-severe-bp-route',
        'route',
        'Do not label this as asymptomatic severe BP while emergency priority is present or unknown',
        values.immediateEmergencyPriority === 'yes'
          ? 'Current emergency priority takes precedence over an asymptomatic BP route.'
          : 'Assess immediate emergency priority before using the asymptomatic severe-BP route.',
        'Continue urgent bedside assessment for current airway/breathing compromise, neurologic change, seizure, collapse, rapid deterioration or acute chest/back symptoms. An absent acute-organ-damage entry does not make a current or unassessed emergency priority reassuring.',
        {tone: values.immediateEmergencyPriority === 'yes' ? 'urgent' : 'attention', resourceGroup: 'bp-evaluation'},
      ));
      return;
    }
    actions.push(action(
      'asymptomatic-markedly-elevated-bp-no-reflex-iv-lowering',
      'route',
      'Asymptomatic severe BP: no additional intermittent IV or oral BP lowering',
      'No new or worsening acute target-organ damage is assessed; for a hospitalized noncardiac condition, do not add intermittent IV or oral antihypertensives merely to lower BP.',
      'ACC/AHA 2025 states that intermittent additional IV or oral antihypertensives are not recommended to acutely reduce BP in patients hospitalized for noncardiac conditions without acute target-organ damage. AHA 2024 advises repeat accurate measurement, correction of reversible contributors and a cautious, patient-centred medication/follow-up review. This guide selects no oral drug, dose or discharge plan.',
      {source: accAha2025, resourceGroup: 'oral-bp-review'},
    ));
    return;
  }

  actions.push(action(
    'no-severe-bp-emergency-route-from-current-entry',
    'route',
    'Current assessed entry does not establish a severe-BP emergency route',
    'Continue the clinical assessment outside this compact guide and reopen it for a new severe repeat BP, acute organ finding or emergency symptom.',
    'This is not a diagnosis of controlled chronic hypertension or a discharge decision. Reassess the trajectory and any reversible contributor in the treating team’s plan.',
    {source: ahaAcuteCare},
  ));
}

function addInitialPlanActions(actions, values) {
  if (values.reviewPhase !== 'initial-assessment') return;

  if (!isGeneralEmergencyRoute(values)) {
    actions.push(action(
      'initial-state-no-blanket-agent-selection',
      'reassess',
      'Initial state: keep BP treatment tied to the classified condition',
      'No generic agent is selected from this phase alone.',
      'Aortic disease, stroke/ICH, pregnancy, acute cardiopulmonary disease, unconfirmed organ status and asymptomatic severe BP do not share an initial medication branch. Document the intended condition-specific target and plan through the responsible team.',
      {source: esc2024},
    ));
    return;
  }

  if (values.immediateEmergencyPriority !== 'no') {
    actions.push(action(
      'immediate-priority-withhold-initial-regimen',
      'reassess',
      'Do not select a generic initial regimen while emergency priority is present or unknown',
      values.immediateEmergencyPriority === 'yes'
        ? 'Current emergency priority takes precedence over a Table 26 regimen.'
        : 'Assess immediate emergency priority before selecting a Table 26 regimen.',
      'The general target can inform urgent escalation, but it does not replace bedside assessment of ABC compromise, neurologic change, collapse, rapid deterioration or acute chest/back symptoms. Do not display or start a generic nicardipine or labetalol regimen until immediate priority is explicitly absent.',
      {tone: values.immediateEmergencyPriority === 'yes' ? 'urgent' : 'attention', source: accAha2025, resourceGroup: 'bp-evaluation'},
    ));
    return;
  }

  switch (values.initialStrategy) {
    case 'nicardipine':
      if (values.nicardipineSafety === 'unknown') {
        actions.push(action(
          'nicardipine-safety-gate-needed',
          'reassess',
          'Clear the nicardipine safety gate',
          'Do not show the initial nicardipine regimen until advanced aortic stenosis is assessed.',
          'ACC/AHA 2025 Table 26 lists advanced aortic stenosis as a contraindication. Also reconcile current haemodynamics, intended target, monitored setting and local product preparation before an initial regimen.',
          {tone: 'attention', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
        ));
        break;
      }
      if (values.nicardipineSafety !== 'eligible') {
        actions.push(action(
          'nicardipine-safety-concern-withhold-regimen',
          'reassess',
          'Nicardipine safety concern: do not use this initial regimen',
          'Advanced aortic stenosis is entered; use the responsible team’s alternative condition-specific plan.',
          'The general route does not make nicardipine universal. Reconcile the underlying organ presentation, target and local treatment plan; this guide does not select a substitute agent or dose.',
          {tone: 'attention', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
        ));
        break;
      }
      if (values.priorBpTreatmentExposure !== 'none-confirmed') {
        actions.push(action(
          'nicardipine-prior-exposure-gate',
          'reassess',
          'Prior nicardipine/BP-agent exposure must be reconciled before an initial regimen',
          'Do not restart an initial infusion sequence when prior exposure is unknown, ongoing, multiple or already confirmed.',
          'Verify exact agent(s), route, start time, concentration, rate, cumulative exposure, BP trend and intended target. Then use the response route rather than a new initial sequence.',
          {tone: 'attention', resourceGroup: 'bp-evaluation'},
        ));
        break;
      }
      actions.push(action(
        'nicardipine-eligible-initial-regimen',
        'reassess',
        'Nicardipine IV: 5 mg/h, then +2.5 mg/h every 5 minutes; maximum 15 mg/h',
        'Eligible general emergency route only; no advanced aortic stenosis and no prior BP-agent exposure are entered.',
        'ACC/AHA 2025 Table 26 regimen. NTUH’s public formulary lists Perdipine (`PER1DE10`); confirm preparation, line, monitoring, availability and clinician authorization locally. This initial regimen does not apply to aortic, stroke/ICH, pregnancy or acute cardiopulmonary exception routes.',
        {source: accAha2025, resourceGroup: 'iv-antihypertensive'},
      ));
      break;
    case 'labetalol':
      if (values.labetalolSafety === 'unknown') {
        actions.push(action(
          'labetalol-safety-gate-needed',
          'reassess',
          'Clear the labetalol safety gate',
          'Do not show the initial labetalol regimen until airway, rate/rhythm and cardiac-function concerns are assessed.',
          'ACC/AHA 2025 Table 26 contraindicates labetalol in reactive airway or obstructive pulmonary disease and says it may worsen heart failure and should not be used with second-/third-degree block or bradycardia.',
          {tone: 'attention', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
        ));
        break;
      }
      if (values.labetalolSafety !== 'eligible') {
        actions.push(action(
          'labetalol-safety-concern-withhold-regimen',
          'reassess',
          'Labetalol safety concern: do not use this initial regimen',
          'The entered airway, bradycardia/block or decompensated-heart-failure concern blocks this generic regimen.',
          'Choose a responsible clinician-owned alternative based on the organ presentation and condition-specific target. This guide does not substitute another agent or dose.',
          {tone: 'attention', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
        ));
        break;
      }
      if (values.priorBpTreatmentExposure !== 'none-confirmed') {
        actions.push(action(
          'labetalol-prior-exposure-gate',
          'reassess',
          'Prior labetalol/BP-agent exposure must be reconciled before an initial regimen',
          'Do not restart an initial bolus or infusion sequence when prior exposure is unknown, ongoing, multiple or already confirmed.',
          'Verify exact agent(s), route, start time, total exposure, heart rate/rhythm, BP trend and intended target. Then use the response route rather than a new initial sequence.',
          {tone: 'attention', resourceGroup: 'bp-evaluation'},
        ));
        break;
      }
      actions.push(action(
        'labetalol-eligible-initial-regimen',
        'reassess',
        'Labetalol IV: 0.3–1.0 mg/kg (maximum 20 mg) at 10-minute intervals, or 0.4–1.0 mg/kg/h infusion up to 3 mg/kg/h',
        'Eligible general emergency route only; Table 26 reference: maximum cumulative 300 mg/24 h; recheck BP before each increment.',
        'ACC/AHA 2025 Table 26 also limits cumulative labetalol to 300 mg/24 h. NTUH’s public formulary lists Trandate (`TRA1DB18`); confirm preparation, route, monitoring, availability and clinician authorization locally. This initial regimen does not apply to aortic, stroke/ICH, pregnancy or acute cardiopulmonary exception routes.',
        {source: accAha2025, resourceGroup: 'iv-antihypertensive'},
      ));
      break;
    case 'other-specialist-plan':
      actions.push(action(
        'other-specialist-initial-plan-reviewed',
        'reassess',
        'A different condition-specific initial plan was reviewed',
        'Document why the plan differs and keep its target, exposure and response measurable.',
        'This compact engine does not enumerate alternatives, combine agents or infer a preparation. Reconcile the selected plan against the affected organ, acute trigger, contraindications, current monitoring and local protocol.',
        {source: esc2024, resourceGroup: 'iv-antihypertensive'},
      ));
      break;
    default:
      actions.push(action(
        'general-emergency-select-initial-strategy',
        'reassess',
        'Select an eligible initial strategy after target, safety and prior exposure are checked',
        'Nicardipine and labetalol are available only in this confirmed general emergency route; neither is automatic.',
        'ACC/AHA 2025 says agent selection depends on pharmacology, mechanism, organ injury, desired BP-decline rate and comorbidities. Select the strategy, then clear its specific safety and prior-exposure gates before a regimen appears.',
        {tone: 'attention', source: accAha2025, resourceGroup: 'iv-antihypertensive'},
      ));
      break;
  }
}

function addResponseActions(actions, values) {
  if (values.reviewPhase === 'unknown') {
    actions.push(action(
      'establish-initial-versus-response-review-point',
      'reassess',
      'Establish whether this is initial planning or a post-action response review',
      'Unknown phase does not justify a repeat initial action or a recovery claim.',
      'Determine whether any BP-directed action has already occurred, then record actual exposure, measured BP trend, intended condition-specific target and current organ findings. Immediate emergency priority remains urgent regardless of this answer.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
    return;
  }

  if (values.reviewPhase === 'initial-assessment') {
    addInitialPlanActions(actions, values);
    return;
  }

  if (values.priorBpTreatmentExposure !== 'one-or-more-confirmed') {
    actions.push(action(
      'reconcile-actual-initial-exposure-before-response-claim',
      'reassess',
      'Reconcile actual initial BP-action exposure before interpreting response',
      'A response phase with no confirmed or unclear exposure cannot safely restart an initial medication branch.',
      'Verify exact agent(s), route, timing, total exposure, intended target and current BP/organ trend. If no action occurred, return to the classified initial route through the responsible clinician; do not infer administration from this form.',
      {tone: 'attention', resourceGroup: 'bp-evaluation'},
    ));
  }

  switch (values.responseState) {
    case 'improving-within-named-plan':
      actions.push(action(
        'response-improving-continue-named-monitoring-plan',
        'reassess',
        'Improvement: continue the named monitored plan and reassess the organ finding',
        'A lower BP alone does not establish recovery, target completion or safe transition to oral therapy.',
        'Continue serial BP and the organ-specific examination/monitoring at the setting appropriate to the condition. Record the target that was actually used, current organ trajectory and the next reassessment; do not automatically add a second agent or transition regimen.',
        {resourceGroup: 'bp-evaluation'},
      ));
      break;
    case 'persistent-or-worsening':
      actions.push(action(
        'persistent-or-worsening-response-urgent-reassessment',
        'reassess',
        'Persistent or worsening BP / organ findings need urgent reassessment',
        'Recheck the diagnosis, exception target, treatment exposure, monitoring and alternative cause rather than automatically adding another agent.',
        'Escalate to the responsible senior/critical-care/specialty team as appropriate. Reassess aortic, stroke, pregnancy and cardiopulmonary exceptions explicitly; this guide does not provide a second-agent, dose or infusion sequence.',
        {tone: 'urgent', resourceGroup: 'bp-evaluation'},
      ));
      break;
    case 'excessive-fall-or-hypoperfusion':
      actions.push(action(
        'excessive-bp-fall-or-hypoperfusion-urgent-safety-review',
        'reassess',
        'Excessive BP fall or new hypoperfusion: urgent safety review',
        'Do not pursue further generic BP lowering until current perfusion, exposure and target are urgently reassessed.',
        'ACC/AHA 2025 and ESC 2024 both caution against excessive acute BP reduction because target-organ hypoperfusion can cause harm. Obtain urgent clinical review of measured trend, perfusion, neurologic/cardiac/renal status and actual treatment exposure.',
        {tone: 'urgent', source: accAha2025, resourceGroup: 'bp-evaluation'},
      ));
      break;
    default:
      actions.push(action(
        'current-response-not-established',
        'reassess',
        'Establish the current BP and organ-damage response',
        'Missing response data cannot establish improvement, failure or safety after an initial action.',
        'Record time-stamped BP trend, actual treatment exposure, the named organ-specific target, symptoms/signs, perfusion and the relevant organ reassessment. Do not repeat or add treatment automatically while this is unknown.',
        {tone: 'attention', resourceGroup: 'bp-evaluation'},
      ));
      break;
  }
}

function entryFor(values) {
  if (isNamedException(values)) {
    return Object.freeze({
      title: 'Named condition-specific emergency pattern',
      summary: 'Aortic, stroke/ICH, pregnancy or acute cardiopulmonary patterns keep their own urgent route regardless of phase; the general target is withheld.',
      status: 'urgent',
    });
  }
  if (values.acuteTargetOrganDamage === 'present') {
    return Object.freeze({
      title: 'Acute target-organ damage is entered',
      summary: values.repeatBp === 'severe-confirmed'
        ? 'Classify the exception before using a general BP target.'
        : 'Do not downgrade acute organ injury because the repeat BP is lower or unconfirmed.',
      status: 'urgent',
    });
  }
  if (values.immediateEmergencyPriority === 'yes') {
    return Object.freeze({
      title: 'Immediate emergency priority is entered',
      summary: 'Urgent bedside assessment takes precedence; this is not an asymptomatic severe-BP result.',
      status: 'urgent',
    });
  }
  if (values.repeatBp === 'severe-confirmed' && values.acuteTargetOrganDamage === 'absent' && values.immediateEmergencyPriority === 'no') {
    return Object.freeze({
      title: 'Asymptomatic severely elevated BP is entered',
      summary: 'No acute target-organ damage is assessed: no additional intermittent IV or oral BP-lowering branch is opened.',
      status: 'met',
    });
  }
  if (values.repeatBp === 'severe-confirmed' && values.acuteTargetOrganDamage === 'absent') {
    return Object.freeze({
      title: 'Severe-BP route remains incomplete',
      summary: 'Assess immediate emergency priority before calling this asymptomatic severe BP.',
      status: 'unknown',
    });
  }
  return Object.freeze({
    title: 'Severe-BP emergency status is not yet established',
    summary: 'Confirm an accurate repeat BP and new or worsening acute target-organ damage; unknown does not mean absent.',
    status: 'unknown',
  });
}

function stageNotes(values) {
  return Object.freeze({
    confirm: values.repeatBp === 'unknown' || values.acuteTargetOrganDamage === 'unknown'
      ? 'Complete the repeat BP and acute target-organ assessment before classifying a treatment route.'
      : 'Repeat BP and organ status are entered; reassess if symptoms or trajectory change.',
    urgent: values.immediateEmergencyPriority === 'no' && !isNamedException(values)
      ? 'No independent immediate emergency priority or named exception is currently entered.'
      : 'Urgency remains independent of the review phase.',
    route: values.acuteTargetOrganDamage === 'unknown'
      ? 'No IV or oral BP classification follows an unknown organ-damage status.'
      : 'Use the displayed route as a source-linked clinical review, not an order.',
    reassess: values.reviewPhase === 'after-initial-bp-action'
      ? 'Reconcile exposure and response; never reopen the initial agent branch automatically.'
      : 'Initial planning and post-action response remain separate.',
  });
}

export function evaluate(input = {}) {
  const values = normalizeSevereBp(input);
  const actions = [];
  addConfirmationActions(actions, values);
  addImmediateSafetyActions(actions, values);
  addRouteActions(actions, values);
  addResponseActions(actions, values);
  actions.sort((left, right) => stageRank[left.stage] - stageRank[right.stage]);
  const visibleKeys = new Set(visibleFieldKeys(values));
  const gaps = SEVERE_BP_FIELDS
    .filter(field => visibleKeys.has(field.key) && values[field.key] === 'unknown')
    .map(field => field.label);
  return Object.freeze({
    values,
    entry: entryFor(values),
    actions: Object.freeze(actions),
    visibleStageIds: Object.freeze(stages.filter(stage => actions.some(item => item.stage === stage.id)).map(stage => stage.id)),
    stageNotes: stageNotes(values),
    gaps: Object.freeze(gaps),
    withheld: Object.freeze([]),
  });
}

const NTUH_PUBLIC_PRODUCT_SOURCES = Object.freeze([
  {
    "label": "NTUH product identity: Perdipine Injection 10 mg/10 mL/amp (PER1DE10; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=PER1DE10",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Trandate Injection 25 mg/5 mL/amp (TRA1DB18; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=TRA1DB18",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  }
]);

export const config = Object.freeze({
  id: 'hypertensive-emergency',
  title: 'Severely Elevated Blood Pressure',
  reviewedAt: '2026-09-19',
  scope: 'Adult acute-care severe BP entry: accurate repeat measurement, new/worsening target-organ-damage distinction, independent urgent signals, condition-specific exception routing, and separated initial-versus-response review.',
  reviewLabel: 'Upgraded · acute-care BP review',
  reviewLimitations: Object.freeze([
    "NTUH public product pages were checked anonymously on 2026-11-07 for identity and label strength only. The catalog snapshot is dated 2026-08-28; these checks do not establish current stock, absence of an alternative, substitution, preparation, orderability or patient suitability.",
    'This is not a BP calculator, diagnosis, patient chart, medication-administration record, prescription, order set, infusion protocol, target authorization, or discharge decision.',
    'All findings default to unknown. The guide never treats a missing repeat BP, missing acute-organ assessment, unentered emergency priority, unclassified exception, unverified prior treatment or absent response as a negative finding.',
    'Aortic disease, acute stroke/ICH, pregnancy/postpartum severe hypertension, acute coronary syndrome and pulmonary oedema require condition-specific evaluation and targets. The general nonstroke/nonpregnant target is deliberately withheld until no compelling exception is identified.',
    'Only the eligible general emergency route can show the source Table 26 nicardipine or labetalol regimen after immediate emergency priority is explicitly absent and its strategy, safety and prior-exposure gates are complete. No preparation, line, combination, exception-route regimen, orderability or administration record is generated.',
    'Exact product identity, current availability, regimen alignment, patient suitability and authorization remain separate checks.',
  ]),
  sources: Object.freeze([...SEVERE_BP_SOURCES, ...NTUH_PUBLIC_PRODUCT_SOURCES]),
  fields: SEVERE_BP_FIELDS,
  stages,
  visibleFieldKeys,
  evaluate,
  conflictActionIds: Object.freeze([
    'reconcile-organ-damage-with-emergency-pattern',
    'reconcile-priority-with-emergency-pattern',
  ]),
  quickReference: Object.freeze({
    summary: 'Repeat BP accurately, separate acute target-organ damage from the number, preserve emergency exceptions, and keep initial action distinct from response.',
    recognition: Object.freeze([
      'AHA 2024 distinguishes hypertensive emergency from asymptomatic markedly elevated inpatient BP by new or worsening acute target-organ damage, not BP alone.',
      'Confirm a credible repeat BP and screen current neurologic, cardiac/pulmonary, aortic, kidney and microvascular findings. Unknown does not establish absence.',
      'Immediate emergency priority is independent of phase; aortic, stroke/ICH, pregnancy and acute cardiopulmonary patterns need condition-specific targets.',
    ]),
    redFlags: Object.freeze([
      'Airway/breathing compromise, altered consciousness, seizure, active focal deficit, collapse, rapidly worsening course or acute chest/back symptoms.',
      'Suspected acute aortic syndrome, acute stroke/ICH, pregnancy/postpartum severe hypertension/eclampsia concern, acute coronary syndrome or pulmonary oedema.',
      'Excessive BP fall, new hypoperfusion, persistent/worsening organ findings, unknown treatment exposure or a contradiction between a named emergency pattern and an “absent” organ-damage entry.',
    ]),
    steps: Object.freeze([
      Object.freeze({role: 'Confirm', text: 'Repeat BP with credible technique and assess new or worsening acute target-organ damage before classifying the route.'}),
      Object.freeze({role: 'Route exceptions', text: 'Aortic disease, stroke/ICH, pregnancy and acute cardiopulmonary patterns bypass the general percentage target and use their own urgent pathway.'}),
      Object.freeze({role: 'General emergency', text: 'Only for a confirmed nonstroke, nonpregnant emergency without a compelling exception: ACC/AHA 2025 limits first-hour SBP reduction to no more than 25%, then if stable toward <160/100 mmHg over 2–6 hours in monitored care.'}),
      Object.freeze({role: 'Asymptomatic severe BP', text: 'Without acute target-organ damage, do not reflexively lower BP with IV treatment; review measurement, reversible causes, home regimen and follow-up through the treating team.'}),
      Object.freeze({role: 'Response', text: 'After any initial action, reconcile actual exposure and the named condition-specific target before judging response or adding treatment.'}),
    ]),
    monitoring: Object.freeze([
      'For hypertensive emergency, ACC/AHA 2025 recommends ICU admission for continuous BP and target-organ monitoring with consideration of appropriate parenteral therapy.',
      'Trend BP with timing, current organ findings, perfusion and actual treatment exposure. A lower BP alone does not establish recovery.',
      'Use urgent condition-specific reassessment for worsening findings or excessive BP reduction; this guide does not select a repeat or second-agent regimen.',
    ]),
    sources: Object.freeze([...SEVERE_BP_SOURCES, ...NTUH_PUBLIC_PRODUCT_SOURCES]),
  }),
});

export default config;
