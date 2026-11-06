// Source-reviewed, session-local decision support for suspected acute
// transfusion reactions in adults. This module does not inspect a chart,
// select a component, place an order, restart a transfusion, or authorize
// treatment. It keeps the immediate safety response separate from later
// syndrome review and from any locally authorized decision about resumption.

export const BSH_ACUTE_TRANSFUSION_REACTION_SOURCE = 'https://onlinelibrary.wiley.com/doi/full/10.1111/bjh.18789';
export const CDC_BACTERIAL_CONTAMINATION_SOURCE = 'https://www.cdc.gov/blood-safety/hcp/clinical-guidance/index.html';
export const AABB_NHSN_REACTION_DEFINITIONS_SOURCE = 'https://www.aabb.org/docs/default-source/default-document-library/resources/aabb-quick-reference-guide-nhsn-hemovigilance-module.pdf?sfvrsn=30f1600b_2';

const bsh = Object.freeze({
  label: 'BSH guideline on acute transfusion reactions (2023)',
  url: BSH_ACUTE_TRANSFUSION_REACTION_SOURCE,
});
const cdc = Object.freeze({
  label: 'CDC bacterial-contamination clinical guidance (2024)',
  url: CDC_BACTERIAL_CONTAMINATION_SOURCE,
});
const aabb = Object.freeze({
  label: 'AABB/NHSN adverse-reaction definitions',
  url: AABB_NHSN_REACTION_DEFINITIONS_SOURCE,
});

const STAGES = Object.freeze([
  Object.freeze({
    id: 'recognize',
    title: 'Recognize and stop the implicated component',
    empty: 'Establish whether there is a suspected acute reaction before assigning a benign explanation.',
  }),
  Object.freeze({
    id: 'stabilize',
    title: 'Immediate safety and severity',
    empty: 'Current ABC findings and the first-response checks remain separate from later classification.',
  }),
  Object.freeze({
    id: 'classify',
    title: 'Pattern-directed work-up and treatment',
    empty: 'Use the symptom pattern and investigations; timing alone does not diagnose a pulmonary reaction.',
  }),
  Object.freeze({
    id: 'reassess',
    title: 'Reassess before any future component decision',
    empty: 'Improvement does not itself authorize resumption of an implicated transfusion.',
  }),
]);

function option(value, label) {
  return Object.freeze([value, label]);
}

function field(key, label, options, extra = {}) {
  return Object.freeze({
    key,
    label,
    options: Object.freeze([
      option('unknown', 'Not assessed'),
      ...options.map(([value, optionLabel]) => option(value, optionLabel)),
    ]),
    ...extra,
  });
}

export const TRANSFUSION_REACTION_FIELDS = Object.freeze([
  field('phase', 'Review point', [
    ['initial', 'Initial suspected reaction'],
    ['reassessment', 'After the initial response'],
  ], {
    essential: 'Initial safety and later response are separate; an unknown phase never hides a suspected reaction.',
  }),
  field('suspectedReaction', 'New symptom or sign plausibly related to a recent component?', [
    ['yes', 'Yes — during or after transfusion'],
    ['no', 'No — another explanation established'],
  ], {
    essential: 'A suspected reaction triggers the stop-and-assess response before a subtype is assigned.',
  }),
  field('transfusionState', 'Implicated component status', [
    ['stopped-access-maintained', 'Stopped; compatible-saline access maintained'],
    ['ongoing-or-not-confirmed', 'Still running / not confirmed stopped'],
    ['completed-before-symptoms', 'Completed before symptoms began'],
  ], {
    essential: 'Stop a suspected component and keep compatible-saline access; completed units are not restarted here.',
  }),
  field('firstResponse', 'Immediate identity, component and observation check', [
    ['complete', 'Complete — identity, component, ABC/observations, notification'],
    ['incomplete', 'Incomplete / item still unknown'],
  ], {
    essential: 'Check identity/label and component, assess ABC/observations, and notify the transfusion service.',
  }),
  field('currentAbc', 'Current airway, breathing or circulation compromise?', [
    ['present', 'Present'],
    ['absent', 'Absent — assessed'],
  ], {
    essential: 'Current ABC compromise overrides every earlier label: call emergency support and do not restart.',
  }),
  field('clinicalPattern', 'Current symptom pattern after immediate safety review', [
    ['isolated-febrile', 'Possible isolated febrile reaction'],
    ['isolated-allergic', 'Possible isolated pruritus / rash'],
    ['allergic-or-anaphylaxis', 'Suspected anaphylaxis · airway, breathing or circulation involvement'],
    ['systemic-febrile-or-hemolytic', 'Sustained fever/rigors, shock, pain, dark urine, or bleeding'],
    ['acute-respiratory-nonallergic', 'Acute dyspnoea / hypoxaemia; allergy not the explanation'],
    ['mixed-or-uncertain', 'Mixed or uncertain pattern'],
    ['alternative-explanation', 'Alternative explanation more likely after assessment'],
  ], {
    essential: 'This is a working pattern; severe reactions can overlap and treatment does not wait for tests.',
  }),
  field('mildCriteria', 'Strictly isolated mild pattern?', [
    ['confirmed', 'Yes — fever 38–<39 C / rise 1–<2 C, or rash only'],
    ['not-confirmed', 'No / another feature or uncertainty'],
  ], {
    essential: 'Mild means isolated fever/rash with no concerning feature or observation change.',
  }),
  field('hemolysisBacterialConcern', 'Hemolysis or bacterial-contamination concern?', [
    ['hemolysis', 'Hemolysis / incompatibility concern'],
    ['bacterial', 'Bacterial contamination / sepsis concern'],
    ['both-or-uncertain', 'Both possible / not yet separated'],
    ['not-supported-after-assessment', 'Not supported after clinical and laboratory review'],
  ], {
    essential: 'Sustained fever/rigors, shock, pain, dark urine or bleeding need haemolysis/bacterial review.',
  }),
  field('pulmonaryEvidence', 'Pulmonary assessment beyond timing', [
    ['timing-only-or-incomplete', 'Timing compatible, but evidence incomplete'],
    ['circulatory-overload-supported', 'Hydrostatic / circulatory-overload evidence supports TACO'],
    ['noncardiogenic-injury-supported', 'Non-cardiogenic lung injury supports TRALI'],
    ['mixed-or-indeterminate', 'TACO/TRALI overlap or indeterminate'],
    ['not-supported-after-assessment', 'Pulmonary transfusion reaction not supported after assessment'],
  ], {
    essential: 'Time alone never establishes TRALI or TACO; reconcile oxygenation, imaging and overload evidence.',
  }),
  field('responseState', 'Current course after the first response', [
    ['improving', 'Improving; no new concerning feature'],
    ['persistent-or-worsening', 'Persistent, recurrent, or worsening symptoms/signs'],
  ], {
    essential: 'Repeat ABC and observations; improvement does not replace work-up or authorize a restart.',
  }),
  field('restartClearance', 'If resumption is contemplated, is explicit local clearance documented?', [
    ['not-contemplated', 'No resumption contemplated'],
    ['explicit-local-clearance', 'Yes — accountable clearance and direct observation'],
    ['not-cleared-or-serious-cause-open', 'No — clearance absent / serious cause open'],
  ], {
    essential: 'Only explicit local clearance plus direct observation can support a contemplated resumption.',
  }),
]);

// The compact renderer reads this conventional export directly.
export const fields = TRANSFUSION_REACTION_FIELDS;

const VALID_VALUES = Object.freeze(Object.fromEntries(
  TRANSFUSION_REACTION_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));

function isMildPattern(values) {
  return values.clinicalPattern === 'isolated-febrile'
    || values.clinicalPattern === 'isolated-allergic';
}

function canConsiderRestartClearance(values) {
  return values.phase === 'reassessment'
    && values.suspectedReaction === 'yes'
    && values.transfusionState === 'stopped-access-maintained'
    && values.firstResponse === 'complete'
    && values.currentAbc === 'absent'
    && isMildPattern(values)
    && values.mildCriteria === 'confirmed'
    && values.responseState === 'improving';
}

export function normalizeTransfusionReaction(input = {}) {
  return Object.freeze(Object.fromEntries(TRANSFUSION_REACTION_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ])));
}

export function visibleFieldKeys(input = {}) {
  const values = normalizeTransfusionReaction(input);
  const keys = ['phase', 'suspectedReaction', 'transfusionState', 'firstResponse', 'currentAbc'];

  if (values.suspectedReaction !== 'yes') {
    return Object.freeze(keys);
  }

  keys.push('clinicalPattern');
  if (isMildPattern(values) && values.currentAbc === 'absent') keys.push('mildCriteria');
  if (['systemic-febrile-or-hemolytic', 'mixed-or-uncertain'].includes(values.clinicalPattern)) {
    keys.push('hemolysisBacterialConcern');
  }
  if (['acute-respiratory-nonallergic', 'mixed-or-uncertain'].includes(values.clinicalPattern)) {
    keys.push('pulmonaryEvidence');
  }
  if (values.phase === 'reassessment' && values.currentAbc === 'absent') {
    keys.push('responseState');
    if (canConsiderRestartClearance(values)) keys.push('restartClearance');
  }
  return Object.freeze(keys);
}

function action(id, stage, title, summary, detail, {
  tone,
  source = bsh,
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

function addImmediateActions(actions, values) {
  if (values.transfusionState === 'stopped-access-maintained') {
    actions.push(action(
      'txr-component-stopped-access-maintained',
      'recognize',
      'Implicated component stopped; IV access maintained',
      'Do not restart the implicated component while the reaction is being assessed.',
      'Keep venous access with compatible physiological saline. Retain the component and giving set for the local transfusion-service process; this guide does not select another component or authorize replacement.',
      {resourceGroup: 'iv-access'},
    ));
  } else if (values.transfusionState === 'completed-before-symptoms') {
    actions.push(action(
      'txr-do-not-resume-after-completed-component',
      'recognize',
      'Component completed before symptoms: do not resume or replace it from this guide',
      'Treat the event as a possible acute transfusion reaction while urgent assessment proceeds.',
      'Acute reactions can present after completion. Preserve the component information, assess the patient and contact the transfusion service using the local process. This guide cannot clear a replacement component.',
      {tone: 'attention', resourceGroup: 'iv-access'},
    ));
  } else {
    actions.push(action(
      'txr-stop-component-and-maintain-access',
      'recognize',
      'Stop the implicated component; maintain IV access with saline',
      'Do this before assigning a reaction subtype or waiting for laboratory results.',
      'BSH advises temporarily stopping a transfusion for new symptoms or signs, maintaining venous access with physiological saline, then checking identification and the component while ABC assessment begins.',
      {tone: 'urgent', resourceGroup: 'iv-access'},
    ));
  }

  if (values.firstResponse !== 'complete') {
    actions.push(action(
      'txr-complete-immediate-response',
      'stabilize',
      'Complete identity/label, component, ABC and observation checks',
      'Missing first-response findings do not establish a mild reaction or a safe restart.',
      'Check the patient identity band against the component compatibility label, inspect the component for clumps, particulate matter or discolouration, assess ABC and standard observations, and notify the transfusion service according to local policy.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
  }
}

function addMildPatternActions(actions, values) {
  if (values.phase === 'reassessment' && values.responseState === 'persistent-or-worsening') {
    actions.push(action(
      'txr-worsening-overrides-mild-symptom-route',
      'classify',
      'Persistent or worsening symptoms override the earlier mild pattern',
      'Do not repeat symptom treatment or contemplate resumption while the current reaction is worsening.',
      'Re-open ABC and the serious differential. A prior isolated fever/rash label does not remain reassuring after recurrent symptoms, observation changes or deterioration.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (values.mildCriteria === 'unknown') {
    actions.push(action(
      'txr-confirm-strictly-isolated-mild-pattern',
      'classify',
      'Confirm that the fever or rash is strictly isolated before treating it as mild',
      'A mild label is unavailable while other symptoms, observation changes or serious-cause findings are unassessed.',
      'BSH describes mild fever as 38 to under 39 C with a 1 to under 2 C rise, or isolated pruritus/rash, without other features. Sustained fever, rigors, hypotension, respiratory symptoms, pain, dark urine or bleeding need a different route.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (values.mildCriteria === 'not-confirmed') {
    actions.push(action(
      'txr-not-strictly-mild',
      'classify',
      'Do not classify this as a mild reaction',
      'Keep the implicated component stopped and complete serious-cause assessment before any future component decision.',
      'The mild-reaction symptom treatment and reassessment branch is intentionally withheld when another feature, observation change or uncertainty is present. Reclassify the current pattern and involve the transfusion service.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (values.phase === 'initial') {
    if (values.clinicalPattern === 'isolated-febrile') {
      actions.push(action(
        'txr-mild-isolated-febrile-symptom-treatment',
        'classify',
        'Possible mild isolated febrile reaction: oral paracetamol 500–1000 mg adult reference',
        'Confirm safe swallowing, liver/weight suitability and total paracetamol exposure before symptom relief; this does not clear resumption.',
        'BSH supports oral paracetamol 500–1000 mg in adults for a mild isolated febrile reaction. Do not use symptom improvement to dismiss sustained fever, rigors, pain, hypotension, dark urine, bleeding or an evolving bacterial/haemolytic pattern.',
        {resourceGroup: 'reaction-products'},
      ));
    } else {
      actions.push(action(
        'txr-mild-isolated-allergic-symptom-treatment',
        'classify',
        'Possible mild isolated allergic reaction: antihistamine review; no routine corticosteroid',
        'Treat isolated itch/rash under local policy, but do not substitute this for anaphylaxis assessment or authorize resumption.',
        'BSH advises slower transfusion and an antihistamine for a mild allergic reaction, and does not recommend routine corticosteroids. Airway, breathing, circulation or systemic features move this out of the mild branch.',
        {resourceGroup: 'reaction-products'},
      ));
    }
  } else {
    actions.push(action(
      'txr-mild-reassess-symptom-treatment-exposure',
      'classify',
      'Before any further symptom treatment, reconcile what was given and the total exposure',
      'An improving reassessment does not recreate an initial paracetamol or antihistamine action.',
      'Confirm the actual agent, route, timing, total dose, current liver/renal or other relevant safety considerations, and whether new symptoms have appeared. Re-enter the emergency route for recurrence or deterioration.',
      {resourceGroup: 'reaction-products'},
    ));
  }

  actions.push(action(
    'txr-mild-pattern-still-needs-reassessment-before-resumption',
    'classify',
    'Strictly mild pattern still needs reassessment before any resumption',
    'This guide never restarts a component from a fever threshold, rash, or symptom improvement alone.',
    'The BSH guidance permits direct-observation continuation for selected mild reactions. This implementation adds a visible local-clearance gate so that the responsible clinical/transfusion authority and local policy remain explicit.',
    {resourceGroup: 'reaction-evaluation'},
  ));
}

function addAnaphylaxisPatternAction(actions, values) {
  if (values.phase === 'initial') {
    actions.push(action(
      'txr-suspected-anaphylaxis-im-adrenaline-reference',
      'classify',
      'Suspected transfusion anaphylaxis: adult IM adrenaline 500 micrograms reference',
      'For active clinical anaphylaxis, give 500 micrograms IM (0.5 mL of 1 mg/mL) into the anterolateral thigh; reassess and repeat at 5-minute intervals if ABC compromise persists.',
      'BSH recommends IM adrenaline for transfusion anaphylaxis, including with thrombocytopenia or coagulopathy; IV adrenaline is restricted to expert practitioners. Do not use antihistamine or corticosteroid in place of emergency anaphylaxis treatment. Do not restart the implicated component.',
      {tone: 'urgent', resourceGroup: 'reaction-products', related: ['anaphylaxis']},
    ));
    return;
  }

  actions.push(action(
    'txr-anaphylaxis-reassess-prior-im-dose-and-current-abc',
    'classify',
    'Suspected anaphylaxis after initial care: reconcile prior IM dose and current ABC',
    'Use the Anaphylaxis guide to confirm prior IM adrenaline, current ABC findings and timing before any repeat-dose decision.',
    'The adult IM reference remains 500 micrograms (0.5 mL of 1 mg/mL) into the anterolateral thigh when active anaphylaxis needs IM treatment. A prior dose does not automatically restart an initial-dose sequence; use the 5-minute reassessment path and expert escalation for refractory features.',
    {tone: 'urgent', resourceGroup: 'reaction-products', related: ['anaphylaxis']},
  ));
}

function addSystemicPatternActions(actions, values) {
  const concern = values.hemolysisBacterialConcern;

  if (concern === 'unknown') {
    actions.push(action(
      'txr-systemic-pattern-preserve-hemolysis-and-bacterial-differential',
      'classify',
      'Systemic febrile/shock/haemolysis pattern: keep haemolysis and bacterial contamination open',
      'Do not downgrade sustained fever, rigors, hypotension, pain, dark urine or bleeding to a febrile reaction before the serious causes are reviewed.',
      'For sustained moderate fever or systemic symptoms, BSH directs assessment for both bacterial contamination and haemolysis. Return the implicated component through the local process and communicate urgency to the transfusion laboratory.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (concern === 'hemolysis' || concern === 'both-or-uncertain') {
    actions.push(action(
      'txr-suspected-hemolysis-workup',
      'classify',
      'Suspected acute haemolysis / incompatibility: urgent transfusion-service work-up',
      'Return the implicated component; repeat compatibility/DAT and obtain the symptom-directed haemolysis, organ and coagulation assessment.',
      'BSH moderate/severe fever, pain or hypotension work-up includes repeat compatibility testing and DAT on pre/post samples, full blood count, renal/liver enzymes, haptoglobin, LDH, coagulation screen and urine haemoglobin assessment. Support shock, renal injury and bleeding clinically; this guide does not prescribe fluids, blood components or dialysis.',
      {tone: 'urgent', resourceGroup: 'hemolysis-workup'},
    ));
  }

  if (concern === 'bacterial' || concern === 'both-or-uncertain') {
    actions.push(action(
      'txr-suspected-bacterial-contamination',
      'classify',
      'Suspected bacterial contamination: culture patient and residual component; start local IV antibiotics',
      'Obtain patient blood cultures and preserve/return the implicated component for laboratory culture; do not wait for culture results before clinically indicated sepsis treatment.',
      'BSH advises blood cultures from the patient, including peripheral and central-line samples when present, then local broad-spectrum IV antibiotics and immediate transfusion-service/haematology notification. CDC likewise advises stopping the transfusion, saving the unit and culturing the recipient when contamination is suspected. Select the antibiotic regimen through local sepsis and allergy review.',
      {tone: 'urgent', source: cdc, resourceGroup: 'culture-workup', related: ['sepsis-septic-shock']},
    ));
  }

  if (concern === 'not-supported-after-assessment') {
    actions.push(action(
      'txr-systemic-serious-causes-not-supported-reconcile',
      'classify',
      'Haemolysis and bacterial contamination are not supported after review',
      'Record the evidence and continue to assess the actual symptom trajectory; this alone does not authorize a component restart.',
      'The laboratory and clinical assessment must be interpreted together. Reopen the urgent differential for recurrence, new shock, fever, rigors, pain, dark urine, bleeding or an incompatible result.',
      {resourceGroup: 'reaction-evaluation'},
    ));
  }
}

function addPulmonaryPatternActions(actions, values) {
  const evidence = values.pulmonaryEvidence;

  if (evidence === 'unknown' || evidence === 'timing-only-or-incomplete') {
    actions.push(action(
      'txr-pulmonary-support-and-discriminate-beyond-timing',
      'classify',
      'Acute respiratory reaction: support oxygenation and distinguish beyond timing',
      'Do not label TACO or TRALI from temporal association, hypertension, or a single response alone.',
      'Obtain urgent clinical assessment, oxygen saturation or blood gases and chest imaging as indicated. For respiratory symptoms not caused by allergy, BSH recommends assessment for left-atrial hypertension, for example echocardiography and pre/post NT-proBNP. TRALI and TACO can coexist.',
      {tone: 'urgent', source: aabb, resourceGroup: 'reaction-evaluation', related: ['acute-hypoxemia-dyspnea']},
    ));
    return;
  }

  if (evidence === 'circulatory-overload-supported') {
    actions.push(action(
      'txr-taco-supported-cardiopulmonary-plan',
      'classify',
      'Circulatory-overload evidence supports TACO: use a monitored cardiopulmonary plan',
      'Withhold further transfusion volume while urgent clinicians assess fluid balance and the appropriate decongestive/supportive treatment.',
      'TACO requires respiratory/pulmonary oedema evidence plus circulatory-overload evidence; time alone is insufficient. This guide does not choose a diuretic, dose, route or fluid plan. Reassess for coexistence of TRALI or another pulmonary cause.',
      {tone: 'urgent', source: aabb, resourceGroup: 'reaction-evaluation', related: ['heart-failure', 'acute-hypoxemia-dyspnea']},
    ));
  } else if (evidence === 'noncardiogenic-injury-supported') {
    actions.push(action(
      'txr-trali-supported-ventilatory-and-transfusion-review',
      'classify',
      'Non-cardiogenic lung injury supports TRALI: ventilatory support and urgent transfusion review',
      'Prioritize oxygenation/ventilatory support and critical-care assessment; do not use loop diuresis as presumptive TRALI treatment.',
      'BSH describes TRALI as non-cardiogenic pulmonary oedema and warns that loop diuretics can worsen morbidity when intravascular volume is depleted. AABB/NHSN criteria require acute hypoxaemia, bilateral infiltrates and no evidence of left-atrial hypertension, typically within 6 hours.',
      {tone: 'urgent', source: aabb, resourceGroup: 'reaction-evaluation', related: ['acute-hypoxemia-dyspnea']},
    ));
  } else if (evidence === 'mixed-or-indeterminate') {
    actions.push(action(
      'txr-pulmonary-mixed-or-indeterminate',
      'classify',
      'TACO/TRALI overlap or indeterminate: urgent critical-care and transfusion review',
      'Support oxygenation and keep both hydrostatic and non-cardiogenic mechanisms open; do not make diuresis a diagnostic test.',
      'BSH notes that TACO and TRALI may coexist. Reconcile oxygenation, imaging, fluid balance, cardiovascular findings and left-atrial-hypertension assessment with the transfusion service and acute-care team.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation', related: ['acute-hypoxemia-dyspnea']},
    ));
  } else {
    actions.push(action(
      'txr-pulmonary-reaction-not-supported-reassess-cause',
      'classify',
      'Pulmonary transfusion reaction is not supported after assessment',
      'Continue to assess the actual respiratory cause; do not treat a negative classification as a release to resume the implicated component.',
      'AABB/NHSN definitions are surveillance classifications, not a bedside clearance mechanism. Reopen the transfusion-reaction differential if oxygenation, imaging, fluid status or haemodynamics change.',
      {source: aabb, resourceGroup: 'reaction-evaluation'},
    ));
  }
}

function addPatternActions(actions, values, {allowMild = true} = {}) {
  if (values.clinicalPattern === 'unknown') return;
  if (isMildPattern(values)) {
    if (allowMild) addMildPatternActions(actions, values);
    return;
  }
  if (values.clinicalPattern === 'allergic-or-anaphylaxis') {
    addAnaphylaxisPatternAction(actions, values);
    return;
  }
  if (values.clinicalPattern === 'systemic-febrile-or-hemolytic') {
    addSystemicPatternActions(actions, values);
    return;
  }
  if (values.clinicalPattern === 'acute-respiratory-nonallergic') {
    addPulmonaryPatternActions(actions, values);
    return;
  }
  if (values.clinicalPattern === 'mixed-or-uncertain') {
    actions.push(action(
      'txr-mixed-or-uncertain-pattern',
      'classify',
      'Mixed or uncertain reaction: preserve the severe differential and do not restart',
      'Keep anaphylaxis, haemolysis, bacterial contamination and pulmonary complications open until the pattern is reconciled.',
      'Severe reactions may overlap. Prioritize current ABC and obtain urgent transfusion-service/acute-care assessment. Complete the symptom-directed haemolysis/bacterial and pulmonary fields rather than assigning a final label from timing alone.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    addSystemicPatternActions(actions, values);
    addPulmonaryPatternActions(actions, values);
    return;
  }
  actions.push(action(
    'txr-alternative-explanation-still-needs-local-reaction-review',
    'classify',
    'Alternative explanation is more likely, but do not use this guide to resume a component',
    'Keep the reaction response and local transfusion-service review proportionate to the event and its uncertainty.',
    'An alternative diagnosis does not retrospectively prove that the component was safe or select a future product. Re-open the transfusion-reaction differential if symptoms recur, evolve, or no longer fit the alternative explanation.',
    {resourceGroup: 'reaction-evaluation'},
  ));
}

function addReassessmentActions(actions, values) {
  if (values.phase !== 'reassessment' || values.suspectedReaction !== 'yes' || values.currentAbc !== 'absent') {
    return;
  }

  if (values.responseState === 'unknown') {
    actions.push(action(
      'txr-reassess-current-course-before-future-component-decision',
      'reassess',
      'Document the current course before deciding about another component',
      'Unknown response does not establish recovery or a safe restart.',
      'Repeat ABC, observations and the relevant symptom/laboratory trajectory. Reconsider the reaction pattern if fever, rigors, respiratory findings, pain, dark urine, bleeding or hypotension have developed.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (values.responseState === 'persistent-or-worsening') {
    actions.push(action(
      'txr-persistent-or-worsening-reaction',
      'reassess',
      'Persistent or worsening reaction: reopen urgent assessment and do not restart',
      'Current deterioration overrides a prior mild classification or an earlier improvement.',
      'Reassess ABC, observations and the serious differential immediately. Escalate to emergency/critical-care, transfusion-service and specialty support according to the dominant syndrome; do not start another component from this guide.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (!canConsiderRestartClearance(values)) {
    actions.push(action(
      'txr-improvement-does-not-authorize-resumption',
      'reassess',
      'Improvement does not authorize resumption of an implicated component',
      'Complete the indicated serious-cause or pulmonary review and use local transfusion-service/clinical guidance for any future component decision.',
      'A recovery statement cannot override an anaphylaxis, systemic febrile/haemolytic, bacterial, pulmonary, mixed or incompletely assessed pattern. This guide does not issue a component, select an alternative, or restart a transfusion.',
      {resourceGroup: 'reaction-evaluation'},
    ));
    return;
  }

  if (values.restartClearance === 'explicit-local-clearance') {
    actions.push(action(
      'txr-cleared-mild-resumption-direct-observation-only',
      'reassess',
      'If resumed under local clearance, use direct observation; this guide does not resume it',
      'A responsible clinician and the local transfusion-service/protocol must own the decision and monitoring plan.',
      'This state records an explicit local clearance for a strictly isolated improving mild reaction. It is not an electronic order, a component release, a patient-specific authorization or a substitute for reassessment if symptoms recur.',
      {resourceGroup: 'reaction-evaluation'},
    ));
  } else {
    actions.push(action(
      'txr-no-resumption-before-explicit-local-clearance',
      'reassess',
      'Do not resume before explicit local clinical/transfusion clearance',
      'Strictly mild symptoms and improvement still need an accountable local decision and direct-observation plan if continuation is contemplated.',
      'The BSH guideline allows selected mild reactions to continue under direct observation. This implementation deliberately requires an explicit responsible clinician and local transfusion-service/protocol clearance rather than making symptom improvement a restart command.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
  }
}

export function evaluate(input = {}) {
  const values = normalizeTransfusionReaction(input);
  const actions = [];

  if (values.suspectedReaction === 'unknown') {
    actions.push(action(
      'txr-confirm-suspected-reaction',
      'recognize',
      'Confirm whether new symptoms or signs are temporally related to a component',
      'If a reaction is suspected, stop the implicated component while immediate assessment starts.',
      'An unconfirmed trigger must not be treated as a harmless reaction or as permission to continue. Ask about timing, component, symptoms, baseline observations and other exposures while checking current ABC.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
  } else if (values.suspectedReaction === 'no') {
    actions.push(action(
      'txr-acute-reaction-not-established',
      'recognize',
      'Acute transfusion reaction is not established from the entered findings',
      'Keep the temporal link under review if symptoms recur or a new component-associated sign appears.',
      'This does not clear a prior event, diagnose the alternative cause, or authorize a transfusion. Re-open the immediate reaction response if a plausible component-associated symptom or sign emerges.',
      {resourceGroup: 'reaction-evaluation'},
    ));
  } else {
    addImmediateActions(actions, values);
  }

  if (values.currentAbc === 'present') {
    actions.push(action(
      'txr-current-abc-emergency',
      'stabilize',
      'Current ABC compromise: activate emergency response and do not restart',
      'Treat current airway, breathing or circulation compromise before classifying the reaction or waiting for investigations.',
      'Disconnect the component/giving set while maintaining IV access with saline, use ABCDE support and call emergency/critical-care help. Severe transfusion reactions can overlap; the immediate clinical treatment must be driven by current signs and symptoms.',
      {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
    ));
    if (values.suspectedReaction === 'yes' && [
      'isolated-febrile',
      'isolated-allergic',
      'alternative-explanation',
    ].includes(values.clinicalPattern)) {
      actions.push(action(
        'txr-current-abc-overrides-existing-pattern',
        'stabilize',
        'Current ABC compromise overrides the previously selected pattern',
        'Do not retain a mild, improving, or diagnostic label while current instability is present.',
        'Re-open emergency assessment. Any later syndrome classification or future component plan follows stabilization and specialist/transfusion-service review.',
        {tone: 'urgent', resourceGroup: 'reaction-evaluation'},
      ));
    }
    if (values.suspectedReaction === 'yes') addPatternActions(actions, values, {allowMild: false});
  } else if (values.currentAbc === 'unknown') {
    actions.push(action(
      'txr-current-abc-unconfirmed',
      'stabilize',
      'Assess current airway, breathing and circulation before classifying the reaction',
      'Unknown ABC status blocks all mild, pulmonary and future-component routes.',
      'Check airway patency, work of breathing/oxygenation, perfusion, blood pressure and mental status. Escalate immediately for any compromise; do not wait for transfusion-reaction laboratory results.',
      {tone: 'attention', resourceGroup: 'reaction-evaluation'},
    ));
  } else if (values.suspectedReaction === 'yes') {
    if (values.clinicalPattern === 'unknown') {
      actions.push(action(
        'txr-classify-working-pattern-after-safety-response',
        'classify',
        'Classify the working symptom pattern after the safety response',
        'Use current symptoms, observations and investigations; do not assume a benign febrile or allergic reaction from one feature.',
        'Separate isolated mild fever/rash from allergic/anaphylaxis, systemic fever/haemolysis/bacterial concern, acute respiratory complications, and mixed presentations. Keep the implicated component stopped while the pattern is unresolved.',
        {tone: 'attention', resourceGroup: 'reaction-evaluation'},
      ));
    } else {
      addPatternActions(actions, values);
    }
  }

  addReassessmentActions(actions, values);

  const urgent = values.currentAbc === 'present'
    || (values.suspectedReaction === 'yes' && (
      values.clinicalPattern === 'allergic-or-anaphylaxis'
      || values.clinicalPattern === 'systemic-febrile-or-hemolytic'
      || values.clinicalPattern === 'acute-respiratory-nonallergic'
      || values.clinicalPattern === 'mixed-or-uncertain'
      || values.responseState === 'persistent-or-worsening'
    ));

  const status = urgent
    ? 'urgent'
    : values.suspectedReaction === 'yes'
      ? 'met'
    : values.suspectedReaction === 'no'
      ? 'not-met'
      : 'unknown';

  const title = values.currentAbc === 'present'
    ? 'Current ABC compromise: emergency reaction route'
    : values.suspectedReaction === 'yes'
      ? 'Suspected acute transfusion reaction'
      : values.suspectedReaction === 'no'
        ? 'Acute transfusion reaction not established'
        : 'Confirm whether this is a suspected acute transfusion reaction';

  return Object.freeze({
    values,
    entry: Object.freeze({
      status,
      title,
      summary: 'Stop a potentially implicated component first. Missing findings do not establish a mild reaction, exclude serious causes, or authorize a restart.',
      source: bsh,
    }),
    actions: Object.freeze(actions),
    visibleStageIds: Object.freeze(STAGES
      .map(stage => stage.id)
      .filter(stageId => actions.some(item => item.stage === stageId))),
    gaps: Object.freeze(visibleFieldKeys(values).filter(key => values[key] === 'unknown')),
    withheld: Object.freeze([
      'No component issue, compatibility result, medication administration, blood-bank action, chart write, or restart authorization is generated.',
    ]),
    stageNotes: Object.freeze({}),
  });
}

export const config = Object.freeze({
  id: 'transfusion-reaction',
  title: 'Acute Transfusion Reaction',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · focused acute transfusion-reaction review',
  scope: 'Adult suspected acute transfusion-reaction recognition, initial safety response, pattern-directed investigation, and reassessment. It is not a blood-bank SOP, component-selection interface, medication-administration record, transfusion order, or authorization to restart.',
  fields: TRANSFUSION_REACTION_FIELDS,
  visibleFieldKeys,
  evaluate,
  conflictActionIds: Object.freeze(['txr-current-abc-overrides-existing-pattern']),
  sources: Object.freeze([bsh, cdc, aabb]),
  reviewLimitations: Object.freeze([
    'The BSH guideline is the branch source for recognition, initial response, mild/severe distinctions and symptom-directed investigation. It explicitly does not provide detailed cardiac/respiratory-failure or bacterial-sepsis treatment protocols.',
    'No local blood-bank SOP, component identity, compatibility/crossmatch order, product availability, administration preparation, or restart authority was verified here. Those remain local transfusion-service decisions.',
    'TACO/TRALI categories require clinical and laboratory/radiographic review; this guide deliberately does not classify either from timing alone or select a diuretic regimen.',
  ]),
  stages: STAGES,
  quickReference: Object.freeze({
    summary: 'Stop the component, assess ABC and identity, then use the evolving symptom pattern rather than a premature subtype label.',
    recognition: Object.freeze([
      'New fever, rigors, rash, pain, dark urine, dyspnoea, hypoxaemia, hypotension, bleeding, or anxiety during or after a component can be an acute reaction.',
    ]),
    redFlags: Object.freeze([
      'Any airway, breathing or circulation compromise; severe dyspnoea/hypoxaemia; shock; new bleeding; dark urine/loin pain; sustained fever or rigors.',
      'Suspected anaphylaxis, haemolysis, bacterial contamination, TRALI, TACO, or mixed pulmonary reaction: do not restart the implicated component.',
    ]),
    steps: Object.freeze([
      Object.freeze({role: 'Stop', text: 'Stop the implicated component, maintain IV access with saline, check identity/label and inspect the component.'}),
      Object.freeze({role: 'Treat', text: 'Treat current ABC compromise immediately; investigations must not delay severe-reaction care.'}),
      Object.freeze({role: 'Review', text: 'Use explicit local transfusion-service/clinical clearance and direct observation for any contemplated resumption.'}),
    ]),
    monitoring: Object.freeze([
      'Repeat ABC and observations while symptoms evolve; reassess new fever, respiratory findings, pain, urine change, bleeding and haemodynamics.',
      'Communicate urgency and clinical pattern to the transfusion service; retain implicated material through the local process.',
    ]),
    sources: Object.freeze([bsh, cdc, aabb]),
  }),
});

export default config;
