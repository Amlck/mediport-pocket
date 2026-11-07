// Source-reviewed, data-only configuration for the compact dyspnea guide.
// The renderer owns interaction and local-resource presentation; this module
// only turns explicitly entered findings into parallel, reviewable actions.

export const DYSPNEA_SOURCE = 'https://www.brit-thoracic.org.uk/document-library/guidelines/emergency-oxygen/bts-guideline-for-oxygen-use-in-adults-in-healthcare-and-emergency-settings/';
export const DYSPNEA_SOURCE_LANDING = 'https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/';

const source = {
  label: 'British Thoracic Society guideline for oxygen use in adults in healthcare and emergency settings (2017; 2019 update)',
  url: DYSPNEA_SOURCE
};

const fields = [
  {
    key: 'criticalIllness',
    label: 'Critical illness or severe ABC compromise?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Yes'],
      ['no', 'No — assessed']
    ]
  },
  {
    key: 'hypercapniaRisk',
    label: 'Known risk of hypercapnic respiratory failure?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Yes'],
      ['no', 'No — assessed']
    ]
  },
  {
    key: 'oxygenationChange',
    label: 'Below target, falls ≥3%, or support increasing?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Yes'],
      ['no', 'No — assessed']
    ]
  },
  {
    key: 'ventilatoryConcern',
    label: 'Drowsiness, fatigue, poor effort, or CO₂/acidosis concern?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Yes'],
      ['no', 'No — assessed']
    ]
  },
  {
    key: 'likelySyndrome',
    label: 'Likely time-critical syndrome?',
    options: [
      ['unknown', 'Not established'],
      ['bronchospasm', 'Bronchospasm'],
      ['pulmonary-edema', 'Pulmonary oedema'],
      ['anaphylaxis', 'Anaphylaxis'],
      ['other', 'Other / unclear cause']
    ]
  }
];

const validValues = Object.fromEntries(fields.map(field => [field.key, new Set(field.options.map(([value]) => value))]));

function valuesFor(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown'
  ]));
}

function action(id, stage, title, summary, detail, extra = {}) {
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...extra
  };
}

/**
 * Convert explicit bedside findings into parallel actions. This is deliberately
 * not a diagnosis engine: unknown inputs remain visible assessment gaps.
 */
export function evaluate(input = {}) {
  const values = valuesFor(input);
  const actions = [];
  // BTS explicitly lists anaphylaxis among critical illnesses. Keep this
  // source-defined override safe when an otherwise conflicting form answer is
  // entered, rather than allowing a restrictive target to win.
  const critical = values.criticalIllness === 'yes' || values.likelySyndrome === 'anaphylaxis';

  if (critical) {
    actions.push(action(
      'critical-oxygen',
      'stabilize',
      'Emergency support now',
      'Reservoir mask 15 L/min; aim SpO₂ 94–98% while gas and expert assessment are obtained.',
      'BTS recommends initial reservoir-mask oxygen at 15 L/min, aiming for SpO₂ 94–98% while urgent blood gases and expert assessment are obtained. This applies even when hypercapnia risk is known; do not delay emergency support to complete this guide.',
      { tone: 'urgent', resourceGroup: 'blood-gas' }
    ));
  } else if (values.criticalIllness === 'unknown') {
    actions.push(action(
      'assess-critical-illness',
      'stabilize',
      'Assess ABC and critical illness now',
      undefined,
      'Check airway, breathing, circulation, consciousness, work of breathing and trajectory. Unknown is not a low-risk finding; activate emergency support for clinical concern.',
      { tone: 'attention' }
    ));
  }

  const nonCriticalAssessed = values.criticalIllness === 'no' && !critical;
  if (nonCriticalAssessed && values.hypercapniaRisk === 'yes') {
    actions.push(action(
      'controlled-target',
      'target',
      'Target SpO₂ 88–92%',
      'Pending blood gas.',
      'For most known COPD or other known hypercapnia risks, BTS uses 88–92% pending urgent blood gas results. Review prior gases or an oxygen alert card where available; target selection after gases requires clinical judgement.',
      { tone: 'attention' }
    ));
  } else if (nonCriticalAssessed && values.hypercapniaRisk === 'no') {
    actions.push(action(
      'usual-target',
      'target',
      'Target SpO₂ 94–98%',
      undefined,
      'For acutely ill adults without hypercapnic-respiratory-failure risk, BTS recommends a 94–98% target range. Titrate to a documented target rather than treating breathlessness with oxygen alone.'
    ));
  } else if (nonCriticalAssessed && values.hypercapniaRisk === 'unknown') {
    actions.push(action(
      'confirm-hypercapnia-risk',
      'target',
      'Confirm hypercapnia risk before setting a restrictive target',
      undefined,
      'Review COPD, prior hypercapnic respiratory failure, morbid obesity, neuromuscular or chest-wall disease, cystic fibrosis, and prior gases/alert cards. Do not treat an unknown risk as absent.',
      { tone: 'attention' }
    ));
  }

  if (!critical && values.hypercapniaRisk === 'yes') {
    actions.push(action(
      'gas-for-hypercapnia-risk',
      'assess',
      'Obtain a blood gas promptly',
      undefined,
      'Pulse oximetry does not show CO₂ or pH. BTS calls for blood gases in acute breathlessness or deterioration with hypercapnia risk, and repeat testing after 30–60 minutes or deterioration even when the first gas is reassuring.',
      { resourceGroup: 'blood-gas' }
    ));
  }

  if (values.oxygenationChange === 'yes') {
    actions.push(action(
      'reassess-oxygenation',
      'assess',
      'Urgently reassess oxygenation and obtain a blood gas',
      undefined,
      'Record SpO₂ with the device, flow or FiO₂ and verify the signal. BTS treats a ≥3% fall or rising oxygen requirement as urgent clinical reassessment and usually repeat blood-gas testing; a normal saturation does not exclude CO₂ retention or acidosis.',
      { tone: 'urgent', resourceGroup: 'blood-gas' }
    ));
  } else if (values.oxygenationChange === 'unknown') {
    actions.push(action(
      'record-oxygen-context',
      'assess',
      'Record SpO₂ with device and flow / FiO₂',
      undefined,
      'Confirm the oximetry waveform and document saturation, device and support level. A saturation without support context cannot show whether the patient is improving.',
      { tone: 'attention' }
    ));
  }

  if (values.ventilatoryConcern === 'yes') {
    actions.push(action(
      'escalate-ventilation',
      'assess',
      'Escalate suspected ventilatory failure',
      undefined,
      'Seek urgent senior respiratory/critical-care assessment and obtain a blood gas. Drowsiness, tiring, poor effort, rising CO₂/acidosis or airway-protection concern need a monitored, local respiratory-support plan; this guide does not configure NIV, CPAP, HFNO or intubation.',
      { tone: 'urgent', resourceGroup: 'blood-gas' }
    ));
  } else if (values.ventilatoryConcern === 'unknown') {
    actions.push(action(
      'assess-ventilation',
      'assess',
      'Assess work of breathing, consciousness and ventilation',
      undefined,
      'Check respiratory rate, effort, air entry, speech, consciousness and the need for a blood gas. Oximetry alone cannot exclude hypercapnia or acidosis.',
      { tone: 'attention' }
    ));
  }

  switch (values.likelySyndrome) {
    case 'bronchospasm':
      actions.push(action(
        'route-bronchospasm',
        'treat-cause',
        'Open the obstructive-airway pathway',
        undefined,
        'Treat the likely cause in parallel with oxygen reassessment. Use the acute severe asthma / local obstructive-airway protocol for medication and disposition decisions.',
        { resourceGroup: 'bronchodilator', related: ['acute-severe-asthma'] }
      ));
      break;
    case 'pulmonary-edema':
      actions.push(action(
        'route-pulmonary-edema',
        'treat-cause',
        'Open the acute pulmonary-oedema pathway',
        undefined,
        'Treat the likely syndrome in parallel with oxygen reassessment. Use the acute heart-failure / local pulmonary-oedema protocol to establish the cause, haemodynamic context and treatment plan.',
        { resourceGroup: 'diuretic', related: ['heart-failure'] }
      ));
      break;
    case 'anaphylaxis':
      actions.push(action(
        'route-anaphylaxis',
        'treat-cause',
        'Treat as anaphylaxis; use the emergency pathway',
        undefined,
        'Oxygen does not replace the time-critical anaphylaxis response. Open the anaphylaxis pathway and use the local emergency protocol immediately.',
        { tone: 'urgent', resourceGroup: 'anaphylaxis', related: ['anaphylaxis'] }
      ));
      break;
    case 'other':
      actions.push(action(
        'cause-directed-workup',
        'treat-cause',
        'Identify and treat the cause in parallel',
        undefined,
        'Do not stop at oxygen. Assess for infection, pulmonary embolism, pneumothorax, aspiration, anaemia, equipment error and other cause-specific emergencies using the appropriate local pathway.',
        { resourceGroup: 'workup' }
      ));
      break;
    default:
      actions.push(action(
        'establish-syndrome',
        'treat-cause',
        'Establish the likely syndrome',
        undefined,
        'Oxygen treats hypoxaemia, not the cause of breathlessness. Identify a time-critical respiratory, cardiac, infectious, thromboembolic or airway process in parallel with stabilization.',
        { tone: 'attention', resourceGroup: 'workup' }
      ));
  }

  actions.push(action(
    'reassess-trajectory',
    'reassess',
    'Reassess support and trajectory',
    'After material support change; repeat gas at 30–60 min in hypercapnia risk.',
    'Record the target, SpO₂, device and flow / FiO₂ with respiratory rate, work of breathing, consciousness and haemodynamics. Reassess the likely cause and escalation plan; earlier review is needed for deterioration.'
  ));

  const stageOrder = ['stabilize', 'target', 'assess', 'treat-cause', 'reassess'];
  actions.sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));
  return { values, actions };
}

export const config = {
  id: 'acute-hypoxemia-dyspnea',
  title: 'Acute Hypoxemia / Dyspnea',
  reviewedAt: '2026-09-14',
  scope: 'Adult emergency oxygen targets, escalation, and cause routing.',
  reviewLabel: 'Upgraded · oxygen / ventilation review',
  reviewLimitations: Object.freeze(['Not a full dyspnea work-up, medicine, device-selection, ventilatory-support, local formulary, or clinician-validated protocol. Carbon-monoxide poisoning, paraquat/bleomycin exposure, palliative care and patient-specific oxygen alert cards require separate target review.']),
  sources: [
    source,
    {
      label: 'BTS emergency oxygen guideline landing page (December 2019 update)',
      url: DYSPNEA_SOURCE_LANDING
    }
  ],
  fields,
  stages: [
    { id: 'stabilize', title: 'Stabilize', empty: 'No critical illness entered.' },
    { id: 'target', title: 'Set target', empty: 'Critical-illness target appears above, or assess critical illness first.' },
    { id: 'assess', title: 'Assess ventilation', empty: 'No additional gas trigger entered.' },
    { id: 'treat-cause', title: 'Treat the cause' },
    { id: 'reassess', title: 'Reassess' }
  ],
  evaluate,
  quickReference: {
    summary: 'Set a documented oxygen target, identify ventilatory failure early, and treat the likely cause in parallel.',
    recognition: [
      'Record SpO₂ with the device, flow or FiO₂; verify the waveform.',
      'Pulse oximetry does not show CO₂, pH, oxygen content or the underlying cause.'
    ],
    redFlags: [
      'Critical illness, ABC compromise, exhaustion/poor effort, new drowsiness or airway-protection concern.',
      'Target breach, ≥3% saturation fall, increasing oxygen requirement, or suspected CO₂ retention/acidosis.'
    ],
    steps: [
      {
        role: 'Set the target',
        text: 'Critical illness: initially aim 94–98% while blood gases and expert assessment are obtained, even with hypercapnia risk. Once critical illness is assessed absent, known hypercapnia risk: 88–92% pending gases; known no risk: 94–98%.',
        dosingNote: 'Oxygen is a treatment for hypoxaemia, not breathlessness alone.'
      },
      {
        role: 'Check ventilation and trajectory',
        text: 'Obtain blood gases for critical illness, hypercapnia risk, falling saturation, rising oxygen need, drowsiness or suspected acidosis. Record support context and reassess after material change.',
        tools: ['news2']
      },
      {
        role: 'Treat the cause in parallel',
        text: 'Route bronchospasm, pulmonary oedema, anaphylaxis or another likely syndrome to its cause-specific local pathway. Do not configure ventilatory support from this guide.'
      }
    ],
    monitoring: [
      'Record saturation, device and flow / FiO₂ with complete observations and after material support changes.',
      'For hypercapnia-risk patients, BTS advises repeat blood gases after 30–60 minutes or earlier deterioration even when the first gas is reassuring.'
    ],
    sources: [source]
  }
};

export default config;

