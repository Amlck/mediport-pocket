// Source-reviewed, data-only configuration for the compact acute severe asthma
// guide. The renderer owns session state and resource presentation; this module
// only turns entered categorical findings into reviewable adult acute-care actions.

export const ASTHMA_SOURCE = 'https://ginasthma.org/wp-content/uploads/2026/05/GINA-2026-Strategy-Report-WMS.pdf';
export const ASTHMA_SOURCE_LANDING = 'https://ginasthma.org/2026-gina-strategy-report/';

const source = Object.freeze({
  label: 'GINA Strategy Report 2026 — acute-care exacerbations (adult branch; Box 9-6, pp. 184–189)',
  url: ASTHMA_SOURCE,
});

const phaseField = Object.freeze({
  key: 'phase',
  label: 'Review phase',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not selected']),
    Object.freeze(['initial', 'Initial assessment']),
    Object.freeze(['response', 'Response / recovery after initial treatment']),
  ]),
  essential: 'Select Initial assessment to view source-based rescue actions, or Response / recovery only after initial treatment. Until a phase is selected, routine asthma dosing stays withheld but emergency escalation still appears.',
});

const presentationField = Object.freeze({
  key: 'presentation',
  label: 'Acute presentation',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not established']),
    Object.freeze(['likely-asthma', 'Likely asthma exacerbation']),
    Object.freeze(['alternative-additional', 'Alternative or additional cause possible']),
    Object.freeze(['anaphylaxis-features', 'Features of anaphylaxis with asthma']),
  ]),
  threshold: 'Entry: establish likely asthma, an alternative/additional cause, or anaphylaxis. Current GINA acute-care assessment specifically considers pneumothorax, inducible laryngeal obstruction, pneumonia, cardiac failure and pulmonary embolism alongside asthma.',
});

const severityField = Object.freeze({
  key: 'severity',
  label: 'Highest current presentation severity',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not fully assessed']),
    Object.freeze(['mild', 'Mild presentation']),
    Object.freeze(['moderate', 'Moderate presentation']),
    Object.freeze(['severe', 'Severe presentation']),
    Object.freeze(['life-threatening', 'Life-threatening presentation']),
  ]),
  threshold: 'GINA mild: all features, including full sentences, can lie down, room-air SpO₂ ≥94% and PEF/FEV₁ >70%. Moderate: phrases/preferred sitting, increased respiratory rate or accessory use, reduced air entry, room-air SpO₂ ≥92% or PEF/FEV₁ 50–70%. Severe includes inability to speak, drink or lie down; respiratory rate >30/min; quiet/silent chest; PEF/FEV₁ <50%; or room-air SpO₂ <92%. Drowsiness, confusion or cyanosis needs life-threatening assessment now.',
});

const oxygenationField = Object.freeze({
  key: 'roomAirOxygenation',
  label: 'Room-air SpO₂ category (before oxygen, if safely measured)',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not measured / context uncertain']),
    Object.freeze(['at-or-above-94', '≥94%']),
    Object.freeze(['from-92-to-below-94', '92 to <94%']),
    Object.freeze(['from-90-to-below-92', '90 to <92%']),
    Object.freeze(['below-90', '<90%']),
  ]),
  threshold: 'GINA Box 9-6 uses room-air SpO₂ <92% as a severe feature; <90% in adults signals aggressive therapy. For adult severe asthma, the GINA narrative targets oxygen at 93–95%; the all-age flowchart displays 92–95%.',
});

const sabaExposureField = Object.freeze({
  key: 'sabaExposure',
  label: 'Repeated or high-dose SABA already given?',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not reconciled']),
    Object.freeze(['not-high-or-repeated', 'No high / repeated exposure identified']),
    Object.freeze(['high-or-repeated', 'Repeated / high-dose exposure']),
  ]),
  essential: 'High SABA exposure can cause tachycardia, hypokalemia, arrhythmia, lactic acidosis and hyperventilation; these can mimic worsening asthma.',
});

const responseField = Object.freeze({
  key: 'response',
  label: 'Response after initial treatment',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not yet assessed / uncertain']),
    Object.freeze(['marked', 'Marked improvement']),
    Object.freeze(['partial', 'Partial improvement']),
    Object.freeze(['worsening', 'Worsening / no response']),
  ]),
  threshold: 'GINA reviews symptoms, oxygen saturation and lung function after initial bronchodilator treatment and at 1 hour or earlier. A current response does not erase a severe feature or an alternative diagnosis.',
});

const persistentHypoxemiaField = Object.freeze({
  key: 'persistentHypoxemia',
  label: 'Persistent hypoxemia after initial treatment?',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not assessed / uncertain']),
    Object.freeze(['yes', 'Yes']),
    Object.freeze(['no', 'No — assessed']),
  ]),
  threshold: 'This branch considers a single IV magnesium sulfate 2 g infusion over 20 minutes after inadequate initial response with persistent hypoxemia. Other source indications, including very low initial FEV₁, require separate specialist review; magnesium is not routine.',
});

const recoveryField = Object.freeze({
  key: 'recoveryCriteria',
  label: 'Recovery criteria for discharge review',
  options: Object.freeze([
    Object.freeze(['unknown', 'Not fully assessed']),
    Object.freeze(['met', 'All recorded as met']),
    Object.freeze(['not-met', 'One or more not met']),
  ]),
  threshold: 'GINA Box 9-6 discharge review requires mild signs for 1–2 hours after the last salbutamol, room-air SpO₂ ≥92%, PEF/FEV₁ >70% personal best/predicted, and adequate home resources. These support review; they do not authorize discharge.',
});

export const ASTHMA_FIELDS = Object.freeze([
  phaseField,
  presentationField,
  severityField,
  oxygenationField,
  sabaExposureField,
  responseField,
  persistentHypoxemiaField,
  recoveryField,
]);

const validValues = Object.freeze(Object.fromEntries(
  ASTHMA_FIELDS.map(field => [field.key, new Set(field.options.map(([value]) => value))]),
));

const GLOBAL_FIELD_KEYS = Object.freeze([
  'phase',
  'presentation',
  'severity',
  'roomAirOxygenation',
]);
const INITIAL_STAGE_IDS = Object.freeze(['assess', 'rescue', 'reassess']);
const RESPONSE_STAGE_IDS = Object.freeze(['assess', 'reassess', 'recovery']);
const UNKNOWN_STAGE_IDS = Object.freeze(['assess']);
const STAGE_ORDER = Object.freeze(['assess', 'rescue', 'reassess', 'recovery']);

export function normalizeAsthma(input = {}) {
  return Object.fromEntries(ASTHMA_FIELDS.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

/**
 * Keeps response and recovery controls out of an initial review. Presentation,
 * severity and room-air oxygenation remain visible before phase selection so
 * anaphylaxis and emergency escalation are never hidden by the phase gate.
 */
export function visibleFieldKeys(input = {}) {
  const values = normalizeAsthma(input);
  if (values.phase === 'initial') {
    return Object.freeze([...GLOBAL_FIELD_KEYS, 'sabaExposure']);
  }
  if (values.phase === 'response') {
    const fields = [...GLOBAL_FIELD_KEYS, 'sabaExposure', 'response'];
    if (['partial', 'worsening'].includes(values.response)) fields.push('persistentHypoxemia');
    if (values.response === 'marked') fields.push('recoveryCriteria');
    return Object.freeze(fields);
  }
  return GLOBAL_FIELD_KEYS;
}

function makeAction(id, stage, title, summary, detail, sourceSection, extra = {}) {
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    sourceSection,
    ...extra,
  };
}

function isSevereOxygenation(values) {
  return ['from-90-to-below-92', 'below-90'].includes(values.roomAirOxygenation);
}

function isAggressiveOxygenation(values) {
  return values.roomAirOxygenation === 'below-90';
}

function urgencyFor(values) {
  const lifeThreatening = values.severity === 'life-threatening';
  const severe = lifeThreatening || values.severity === 'severe' || isSevereOxygenation(values);
  return Object.freeze({lifeThreatening, severe, aggressiveOxygenation: isAggressiveOxygenation(values)});
}

function entryFor(values, urgency) {
  if (values.presentation === 'anaphylaxis-features') {
    return Object.freeze({
      title: 'Anaphylaxis features with asthma',
      summary: 'This is an emergency overlap: use the anaphylaxis pathway and give epinephrine first, then bronchodilator therapy.',
      status: 'urgent',
      source,
    });
  }
  if (urgency.lifeThreatening) {
    return Object.freeze({
      title: 'Life-threatening respiratory presentation',
      summary: 'Emergency escalation is required while asthma and alternative causes are assessed.',
      status: 'urgent',
      source,
    });
  }
  if (values.presentation === 'likely-asthma') {
    return Object.freeze({
      title: 'Likely asthma exacerbation',
      summary: 'Continue severity, oxygenation, treatment-response and alternative-cause assessment in parallel.',
      status: 'met',
      source,
    });
  }
  if (values.presentation === 'alternative-additional') {
    return Object.freeze({
      title: 'Asthma-only entry not established',
      summary: 'An alternative or additional cause is possible and needs parallel time-critical review.',
      status: 'notmet',
      source,
    });
  }
  return Object.freeze({
    title: 'Acute presentation not yet established',
    summary: 'Determine whether this is likely asthma, an alternative/additional cause, or anaphylaxis while treating emergency findings.',
    status: 'unknown',
    source,
  });
}

function urgencyStage(values) {
  return values.phase === 'response' ? 'reassess' : 'assess';
}

function addEntryActions(values, actions) {
  if (values.presentation === 'unknown') {
    actions.push(makeAction(
      'establish-presentation',
      'assess',
      'Establish asthma, an alternative cause, or anaphylaxis',
      'Unknown is not confirmation of uncomplicated asthma.',
      'Assess whether the presentation is due to asthma and look in parallel for pneumothorax, inducible laryngeal obstruction, pneumonia, cardiac failure, pulmonary embolism or another time-critical process. Do not delay emergency treatment for a severe presentation while this assessment is completed.',
      'pp. 184, 186',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.presentation === 'alternative-additional') {
    actions.push(makeAction(
      'alternative-or-additional-cause',
      'assess',
      'Evaluate an alternative or additional cause in parallel',
      'Do not treat this as asthma alone.',
      'Assess for pneumothorax, inducible laryngeal obstruction, pneumonia, cardiac failure, pulmonary embolism and other cause-specific emergencies while continuing appropriate immediate respiratory support. A possible alternate cause does not make severe respiratory findings lower risk.',
      'p. 184',
      {tone: 'attention', resourceGroup: 'workup', related: ['acute-hypoxemia-dyspnea']},
    ));
  } else if (values.presentation === 'anaphylaxis-features') {
    actions.push(makeAction(
      'anaphylaxis-first',
      'assess',
      'Anaphylaxis with asthma: epinephrine first',
      'Use the emergency anaphylaxis pathway now, then start bronchodilator therapy immediately.',
      'GINA 2026 directs intramuscular or intranasal epinephrine (adrenaline) first when anaphylaxis and asthma coexist. Epinephrine is not routine treatment for an asthma exacerbation without anaphylaxis. This guide does not set the anaphylaxis product, dose, route eligibility, observation or authorization.',
      'Box 9-6; p. 187',
      {tone: 'urgent', related: ['anaphylaxis']},
    ));
  }
}

function addSeverityActions(values, urgency, actions) {
  const stage = urgencyStage(values);
  if (values.severity === 'unknown') {
    actions.push(makeAction(
      'assess-severity',
      'assess',
      'Assess current severity now',
      'Speech, breathing effort, air entry, consciousness, room-air oxygenation and lung function matter together.',
      'Use the GINA acute-care severity findings where feasible. An unmeasured PEF/FEV₁ or oxygenation category does not establish a mild presentation, and treatment should not wait when clinical danger is apparent.',
      'pp. 184, 186',
      {tone: 'attention'},
    ));
  }

  if (values.roomAirOxygenation === 'unknown') {
    actions.push(makeAction(
      'record-room-air-oxygenation',
      'assess',
      'Record room-air SpO₂ when clinically safe',
      'Oxygenation context is incomplete.',
      'GINA recommends close pulse-oximetry monitoring. Subject to clinical urgency, assess saturation before oxygen starts or after it is safely removed/stabilized; do not withhold oxygen from a patient who needs it merely to obtain a room-air value.',
      'p. 184',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (urgency.severe && ['mild', 'moderate'].includes(values.severity) && isSevereOxygenation(values)) {
    actions.push(makeAction(
      'reconcile-severity-with-oxygen',
      'assess',
      'Reconcile severity: room-air SpO₂ <92% is a severe feature',
      'The entered oxygenation conflicts with the selected mild/moderate category.',
      'GINA Box 9-6 classifies room-air SpO₂ below 92% as a severe feature. Recheck the signal and context, but do not let a mild/moderate selection suppress monitored acute-care treatment while the discrepancy is resolved.',
      'Box 9-6',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }

  if (urgency.aggressiveOxygenation) {
    actions.push(makeAction(
      'aggressive-oxygenation',
      stage,
      'Room-air SpO₂ <90%: aggressive treatment and escalation',
      'GINA treats saturation below 90% in adults as a signal for aggressive therapy.',
      'Verify the pulse-oximetry signal and immediately assess airway, work of breathing, consciousness, air entry and circulation. This value is a severe finding; it does not independently prove a diagnosis or replace clinical assessment for life-threatening respiratory failure.',
      'p. 184',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }

  if (urgency.lifeThreatening) {
    actions.push(makeAction(
      'life-threatening-escalation',
      stage,
      'Life-threatening presentation: call critical-care / airway help',
      'Emergency assessment, IV access and continuous monitoring now.',
      'GINA lists drowsiness, confusion and cyanosis as life-threatening presentation features and directs urgent help. A quiet or silent chest, exhaustion, poor effort, instability, worsening gas exchange or inability to protect the airway also needs immediate resuscitation-capable review; this guide does not configure intubation, NIV or sedation.',
      'Box 9-6; pp. 184–185',
      {tone: 'urgent', resourceGroup: 'blood-gas'},
    ));
    actions.push(makeAction(
      'life-threatening-oxygen',
      stage,
      'Emergency oxygen: 100% non-rebreather while help arrives',
      'Use the life-threatening GINA acute-care route; continuously reassess.',
      'GINA Box 9-6 specifies 100% oxygen by non-rebreather mask for a life-threatening presentation while urgent expert support is arranged. This emergency step precedes a stabilized target review.',
      'Box 9-6',
      {tone: 'urgent'},
    ));
  } else if (urgency.severe) {
    actions.push(makeAction(
      'severe-monitored-acute-care',
      stage,
      'Severe acute asthma: monitored acute care now',
      'Begin treatment while arranging senior / critical-care review appropriate to the trajectory.',
      'Severe asthma is a potentially life-threatening emergency. Manage in an acute-care setting with frequent reassessment; clinical deterioration, fatigue, rising carbon dioxide or an alternative diagnosis can change the escalation route rapidly.',
      'pp. 184–186',
      {tone: 'urgent'},
    ));
  }
}

function addSabaExposureActions(values, actions) {
  if (values.sabaExposure === 'unknown') {
    actions.push(makeAction(
      'reconcile-saba-exposure',
      values.phase === 'response' ? 'reassess' : 'assess',
      'Reconcile SABA already given',
      'Dose, device, timing and response are not yet established.',
      'GINA asks what treatment has already been taken and the response. Confirm actual administration before repeating therapy or interpreting tachycardia, hypokalemia, lactate elevation, tremor or hyperventilation as treatment failure.',
      'p. 184; p. 185',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.sabaExposure === 'high-or-repeated') {
    actions.push(makeAction(
      'monitor-saba-toxicity',
      'reassess',
      'Monitor for SABA toxicity during repeat treatment',
      'Check pulse/rhythm, potassium and lactate in clinical context.',
      'High-dose SABA can cause tachycardia, palpitations, anxiety, hypokalemia, arrhythmia, lactic acidosis and hyperventilation. Reassess airflow, work of breathing and perfusion before reflexively escalating SABA because toxicity can mimic worsening asthma.',
      'p. 185',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addAdultSevereOxygenAction(stage, actions) {
  actions.push(makeAction(
    'adult-severe-oxygen-target',
    stage,
    'Adult severe asthma: titrate O₂ to SpO₂ 93–95%',
    'Use controlled low-flow oxygen with continuous oximetry once the emergency route is stabilized.',
    'GINA 2026 states that controlled low-flow oxygen targeting 93–95% in adults with severe exacerbations has better physiological outcomes than high-concentration oxygen. Its all-age Box 9-6 displays 92–95%; this engine uses the adult narrative target. The adjacent acute-hypoxemia/dyspnea guide addresses a different question and uses BTS targets, so do not silently substitute either target without a documented clinical reconciliation.',
    'p. 185; Box 9-6',
    {resourceGroup: 'monitoring'},
  ));
}

function addSystemicSteroidAction(actions) {
  actions.push(makeAction(
    'early-systemic-corticosteroid',
    'rescue',
    'Start systemic corticosteroid early · typical adult prednisone/prednisolone 50 mg/day',
    'Give within 1 hour when indicated; oral is preferred when reliable. The GINA IV reference is hydrocortisone 200 mg/day in divided doses.',
    'GINA uses systemic corticosteroids for all but the mildest acute-care exacerbations and advises administration within 1 hour where possible. Oral treatment is as effective as IV when absorption is reliable. IV treatment is reserved for inability to swallow, vomiting, or need for NIV/intubation; GINA describes 50 mg prednisone/prednisolone daily or hydrocortisone 200 mg/day in divided doses for adults. This is not a local product, equivalence, route or order recommendation.',
    'p. 187; Box 9-7',
    {resourceGroup: 'steroid'},
  ));
}

function addInitialActions(values, urgency, actions) {
  if (values.presentation !== 'likely-asthma') {
    if (values.presentation === 'anaphylaxis-features') {
      actions.push(makeAction(
        'bronchodilator-after-epinephrine',
        'rescue',
        'After epinephrine: start bronchodilator therapy through the emergency pathway',
        'GINA puts epinephrine first when anaphylaxis and asthma coexist.',
        'After epinephrine has been initiated for anaphylaxis, GINA directs immediate bronchodilator therapy. This compact asthma guide does not select an anaphylaxis product, dose, route eligibility, observation branch or a fixed asthma regimen before the emergency overlap is reconciled.',
        'Box 9-6; p. 187',
        {tone: 'urgent', resourceGroup: 'bronchodilator', related: ['anaphylaxis']},
      ));
    } else {
      actions.push(makeAction(
        'withhold-asthma-only-rescue-until-entry',
        'rescue',
        values.presentation === 'alternative-additional'
          ? 'Do not select an asthma-only rescue regimen'
          : 'Establish the acute presentation before selecting an asthma-only rescue regimen',
        'Emergency support and escalation continue while the entry is clarified.',
        'The source requires assessment for asthma, anaphylaxis and alternative/additional causes. Do not infer a routine asthma medication branch from uncertain or competing pathology; severe and life-threatening support remains visible in the entry/escalation stage.',
        'p. 184; Box 9-6',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
    }
    addSabaExposureActions(values, actions);
    actions.push(makeAction(
      'initial-reassessment',
      'reassess',
      'Reassess trajectory while entry is clarified',
      values.presentation === 'anaphylaxis-features' ? 'Continue immediate ABC reassessment through the anaphylaxis pathway; do not wait for the asthma 1-hour review.' : 'Record oxygenation, work of breathing, air entry, consciousness and treatment response at least by 1 hour or earlier.',
      'Do not allow a provisional asthma label to delay re-evaluation for deterioration or another time-critical diagnosis.',
      'pp. 184, 188',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (urgency.lifeThreatening) {
    actions.push(makeAction(
      'life-threatening-rescue',
      'rescue',
      'Life-threatening rescue: nebulized SABA + ipratropium, systemic steroid',
      'Continue emergency oxygen, continuous monitoring and expert airway/critical-care assessment.',
      'GINA’s life-threatening acute-care route specifies nebulized salbutamol, ipratropium, oxygen and systemic corticosteroids, but its life-threatening panel does not give a fixed nebulized dose. Do not infer one from another severity branch; use the immediate local resuscitation, airway and drug-delivery protocol while the separately displayed systemic-steroid reference is reviewed.',
      'Box 9-6',
      {tone: 'urgent', resourceGroup: 'bronchodilator'},
    ));
    addSystemicSteroidAction(actions);
  } else if (urgency.severe) {
    actions.push(makeAction(
      'severe-initial-bronchodilator',
      'rescue',
      'Severe rescue: salbutamol 6–10 puffs + ipratropium 4 puffs, or nebulized 5 mg + 0.25 mg',
      'Repeat up to 3 treatments, 20–30 minutes apart, with reassessment after each.',
      'For an adult severe presentation, GINA Box 9-6 gives salbutamol 6–10 puffs and ipratropium 4 puffs by pMDI/spacer, or salbutamol 5 mg plus ipratropium 0.25 mg by nebulizer. Use one ipratropium-containing route at a time; do not add separate ipratropium blindly to a combination product. Product identity, prepared dose, device, timing and local protocol require separate verification.',
      'Box 9-6',
      {resourceGroup: 'bronchodilator'},
    ));
    addAdultSevereOxygenAction('rescue', actions);
    addSystemicSteroidAction(actions);
    actions.push(makeAction(
      'consider-blood-gas',
      'reassess',
      'Consider blood gas for PEF/FEV₁ <50%, poor response or deterioration',
      'Normal or rising PaCO₂ in a distressed asthmatic signals respiratory failure.',
      'GINA does not recommend routine arterial blood gases, but considers them with PEF/FEV₁ below 50% predicted, no initial response or deterioration. PaO₂ below 60 mmHg with normal or increased PaCO₂, especially above 45 mmHg, indicates respiratory failure.',
      'p. 185',
      {resourceGroup: 'blood-gas'},
    ));
  } else if (values.severity === 'mild' && values.roomAirOxygenation !== 'from-92-to-below-94') {
    actions.push(makeAction(
      'mild-initial-bronchodilator',
      'rescue',
      'Mild rescue: salbutamol 4 puffs by pMDI/spacer',
      'Alternative: budesonide-formoterol 160/4.5 mcg 2 puffs. Assess response and repeat once after 30–60 minutes if needed.',
      'GINA’s mild presentation route uses salbutamol 4 puffs by pMDI/spacer or budesonide-formoterol 160/4.5 mcg 2 puffs. If the patient has moderate features, return to severity assessment rather than applying the mild route.',
      'Box 9-6',
      {resourceGroup: 'mild-reliever'},
    ));
  } else if (values.severity === 'moderate' || (values.severity === 'mild' && values.roomAirOxygenation === 'from-92-to-below-94')) {
    if (values.severity === 'mild') actions.push(makeAction('reconcile-mild-oxygenation', 'assess', 'Room-air SpO₂ 92–<94% does not meet the initial mild criteria', 'Review severity; the moderate initial-treatment route is shown.', 'GINA initial mild presentation requires all mild features, including room-air SpO₂ at least 94%. Use the more concerning recorded feature when selecting initial treatment.', 'Box 9-6', {tone: 'attention'}));
    actions.push(makeAction(
      'moderate-initial-bronchodilator',
      'rescue',
      'Moderate rescue: salbutamol 4–6 puffs + ipratropium 4 puffs, or nebulized 2.5 mg + 0.25 mg',
      'Repeat up to 3 treatments, 20–30 minutes apart, with reassessment after each.',
      'GINA Box 9-6 gives salbutamol 4–6 puffs plus ipratropium 4 puffs by pMDI/spacer, or nebulized salbutamol 2.5 mg plus ipratropium 0.25 mg for moderate presentation. Use one ipratropium-containing route at a time and verify the local product/device before use.',
      'Box 9-6',
      {resourceGroup: 'bronchodilator'},
    ));
    addSystemicSteroidAction(actions);
  } else {
    actions.push(makeAction(
      'withhold-routine-dose-until-severity',
      'rescue',
      'Complete severity assessment before selecting a routine rescue dose',
      'Unknown severity does not select mild, moderate or severe dosing.',
      'Start emergency support for clinical danger without waiting for this form, but do not infer a lower-risk bronchodilator route or a recovery plan from missing severity findings.',
      'pp. 184–186',
      {tone: 'attention'},
    ));
  }

  addSabaExposureActions(values, actions);
  actions.push(makeAction(
    'initial-reassessment',
    'reassess',
    'Reassess symptoms, SpO₂ and lung function at 1 hour or earlier',
    'Review respiratory rate, work of breathing, air entry, PEF/FEV₁ and treatment response after each initial series.',
    'GINA recommends review after initial bronchodilator treatment and at 1 hour or earlier. Persisting symptoms or a plateau are not recovery; update escalation, alternative-cause and admission decisions from the observed trajectory.',
    'pp. 184, 188; Box 9-6',
    {resourceGroup: 'monitoring'},
  ));
}

function addMagnesiumAction(actions) {
  actions.push(makeAction(
    'consider-iv-magnesium-after-nonresponse',
    'reassess',
    'Consider IV magnesium sulfate 2 g over 20 min after inadequate response',
    'For persistent hypoxemia after initial treatment; it is not routine for every exacerbation.',
    'GINA supports a single 2 g IV infusion over 20 minutes for adults who fail initial treatment and have persistent hypoxemia; evidence also includes adults with very low initial FEV₁. Do not use nebulized magnesium routinely. Confirm kidney function, hemodynamics, formulation, infusion setup and local authorization separately.',
    'p. 188',
    {resourceGroup: 'magnesium'},
  ));
}

function canUseRecoveryRoute(values, urgency) {
  return values.response === 'marked'
    && values.presentation === 'likely-asthma'
    && values.severity === 'mild'
    && !urgency.severe
    && ['at-or-above-94', 'from-92-to-below-94'].includes(values.roomAirOxygenation);
}

function addPersistentHypoxemiaActions(values, actions) {
  if (values.persistentHypoxemia === 'yes') {
    addMagnesiumAction(actions);
  } else if (values.persistentHypoxemia === 'unknown') {
    actions.push(makeAction(
      'assess-persistent-hypoxemia-before-magnesium',
      'reassess',
      'Assess persistent hypoxemia before considering IV magnesium',
      'Persistent hypoxemia after initial treatment is not established.',
      'GINA does not recommend IV magnesium routinely. It supports a single adult dose only after inadequate initial response with persistent hypoxemia; complete oxygenation and response assessment before selecting this adjunct.',
      'p. 188',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addResponseActions(values, urgency, actions) {
  if (urgency.lifeThreatening) {
    actions.push(makeAction(
      'life-threatening-overrides-response',
      'assess',
      'Life-threatening finding overrides response / recovery status',
      'Do not use a prior improvement label as a disposition decision.',
      'Return to the emergency, airway and critical-care route while reassessing treatment response. A current severe finding is not reconciled by a stored “marked improvement” response.',
      'Box 9-6; p. 188',
      {tone: 'urgent'},
    ));
    addSabaExposureActions(values, actions);
    return;
  }

  if (values.presentation !== 'likely-asthma') {
    if (values.presentation === 'anaphylaxis-features') {
      actions.push(makeAction(
        'anaphylaxis-response-emergency-route',
        'reassess',
        'Reassess through the epinephrine-led anaphylaxis emergency pathway',
        'Bronchodilator remains an adjunct after epinephrine; do not turn a response label into an asthma-only regimen or disposition route.',
        'GINA directs epinephrine first when anaphylaxis and asthma coexist, with immediate bronchodilator therapy afterward. Continue emergency reassessment and use the applicable anaphylaxis pathway for observation and escalation rather than using this compact asthma guide to select a fixed repeat-dose, magnesium or recovery branch.',
        'Box 9-6; p. 187',
        {tone: 'urgent', resourceGroup: 'monitoring', related: ['anaphylaxis']},
      ));
    } else {
      actions.push(makeAction(
        'withhold-asthma-only-response-until-entry',
        'reassess',
        values.presentation === 'alternative-additional'
          ? 'Do not select an asthma-only response or recovery route'
          : 'Establish the acute presentation before selecting an asthma-only response route',
        'Continue respiratory reassessment and evaluate the alternative or additional cause in parallel.',
        'GINA’s acute-care assessment requires asthma, anaphylaxis and alternative/additional causes to remain under review. A response label does not establish a routine asthma escalation, IV-magnesium or discharge branch when asthma-only entry is not established.',
        'p. 184; Box 9-6',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
    }
    addSabaExposureActions(values, actions);
    return;
  }

  if (urgency.severe) addAdultSevereOxygenAction('reassess', actions);
  addSabaExposureActions(values, actions);

  if (values.response === 'unknown') {
    actions.push(makeAction(
      'assess-treatment-response',
      'reassess',
      'Assess response before choosing recovery or escalation',
      'Record symptoms, SpO₂, respiratory rate, air entry and lung function after initial treatment.',
      'GINA recommends reassessment at 1 hour or earlier. Missing response information does not establish adequate improvement, a plateau, safe oxygenation or discharge readiness.',
      'pp. 184, 188',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.response === 'worsening') {
    actions.push(makeAction(
      'worsening-after-initial-treatment',
      'reassess',
      'Worsening after initial treatment: escalate and reassess the diagnosis',
      'Consider extra bronchodilator, systemic steroid if not already started, and critical-care / ICU transfer.',
      'GINA’s worsening route calls for alternative/additional-cause review, extra salbutamol and ipratropium when needed while monitoring for SABA toxicity, systemic corticosteroids if not already started, consideration of IV magnesium, and transfer to higher acuity care. Do not use this guide to configure airway devices or an intubation plan.',
      'Box 9-6; p. 188',
      {tone: 'urgent', resourceGroup: 'bronchodilator'},
    ));
    addPersistentHypoxemiaActions(values, actions);
    return;
  }

  if (values.response === 'partial') {
    actions.push(makeAction(
      'partial-response',
      'reassess',
      'Partial response: continue monitored treatment and consider admission',
      'Additional salbutamol may be needed; consider additional ipratropium and start systemic steroid if not already given.',
      'GINA continues monitoring at least hourly for partial improvement and considers admission when improvement is insufficient. Reconcile the initial bronchodilator product before adding ipratropium, and monitor SABA toxicity rather than treating every tachycardia or lactate rise as worsening obstruction.',
      'Box 9-6; p. 188',
      {tone: 'attention', resourceGroup: 'bronchodilator'},
    ));
    addPersistentHypoxemiaActions(values, actions);
    return;
  }

  if (!canUseRecoveryRoute(values, urgency)) {
    actions.push(makeAction(
      'marked-improvement-needs-reconciliation',
      'reassess',
      'Marked improvement is not yet a recovery route',
      'Current severity, asthma entry or oxygenation remains unresolved or unsafe for an asthma-only disposition review.',
      'A marked response does not override a severe current finding, an alternative/additional cause, anaphylaxis, an unknown severity assessment or an incomplete oxygenation context. Reconcile those findings and use the applicable emergency pathway before considering discharge criteria.',
      'Box 9-6; pp. 184–189',
      {tone: 'attention'},
    ));
    return;
  }

  if (values.recoveryCriteria === 'met') {
    actions.push(makeAction(
      'recovery-discharge-review',
      'recovery',
      'Recovery criteria recorded: complete discharge review',
      'Review the prescribed steroid course: prednisone/prednisolone 40–50 mg/day for 5–7 days. Confirm controller, inhaler technique, action plan and follow-up within 2–7 days.',
      'Confirm mild signs for 1–2 hours after the last salbutamol, room-air SpO₂ at least 92%, PEF/FEV₁ above 70% personal best/predicted and adequate home resources. Before discharge, GINA recommends ICS-containing treatment, inhaler-technique/adherence review, a written action plan and follow-up within 2–7 days.',
      'Box 9-6; pp. 189–191',
      {resourceGroup: 'controller'},
    ));
  } else if (values.recoveryCriteria === 'not-met') {
    actions.push(makeAction(
      'recovery-criteria-not-met',
      'recovery',
      'Recovery criteria not met: continue monitored care / admission review',
      'Do not infer safe discharge from a marked subjective response alone.',
      'Reassess the missing or failed criterion and trajectory. GINA considers ongoing frequent SABA need, room-air SpO₂ below 92%, persistent dyspnea after systemic corticosteroid, low final PEF/FEV₁ and barriers to follow-up when deciding on admission or discharge.',
      'Box 9-6; p. 188',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else {
    actions.push(makeAction(
      'assess-recovery-criteria',
      'recovery',
      'Confirm recovery criteria before discharge review',
      'Marked improvement alone does not establish disposition readiness.',
      'Assess the complete GINA Box 9-6 recovery set: sustained mild signs after the last salbutamol, room-air oxygenation, lung function and adequate home resources. Keep monitoring and escalation decisions active while criteria remain unknown.',
      'Box 9-6',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function sortActions(actions) {
  actions.sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage));
  return actions;
}

function stageNotes(values, urgency) {
  if (values.phase === 'unknown') {
    return Object.freeze({
      assess: urgency.severe || values.presentation === 'anaphylaxis-features'
        ? 'Emergency escalation is visible. Select a phase only after immediate priorities are underway.'
        : 'Assess entry, severity and oxygenation, then select Initial assessment or Response / recovery.',
    });
  }
  if (values.phase === 'initial') {
    return Object.freeze({
      assess: 'Keep asthma entry, severity and alternative causes under active review.',
      rescue: values.presentation !== 'likely-asthma'
        ? 'Routine asthma dosing remains withheld until likely-asthma entry is established; emergency support remains visible.'
        : urgency.severe
          ? 'Severe findings select the GINA severe acute-care route.'
          : values.severity === 'unknown'
            ? 'A routine dose is withheld until severity is entered.'
            : 'The selected mild or moderate route remains under active reassessment.',
      reassess: 'Update response after the initial series and at 1 hour or earlier.',
    });
  }
  return Object.freeze({
    assess: 'Current severe or alternative-cause findings supersede a stored response label.',
    reassess: 'Use observed trajectory, not a prior treatment plan, to decide escalation.',
    recovery: 'Recovery requires marked improvement plus all displayed discharge-review criteria.',
  });
}

function gapsFor(values) {
  const labelByKey = Object.fromEntries(ASTHMA_FIELDS.map(field => [field.key, field.label]));
  return Object.freeze(visibleFieldKeys(values)
    .filter(key => values[key] === 'unknown')
    .map(key => labelByKey[key]));
}

/**
 * Evaluates entered categories only. Missing or invalid values remain unknown;
 * no input here represents a diagnosis, local prescription, or treatment record.
 */
export function evaluate(input = {}) {
  const values = normalizeAsthma(input);
  const urgency = urgencyFor(values);
  const actions = [];

  addEntryActions(values, actions);
  addSeverityActions(values, urgency, actions);

  if (values.phase === 'unknown') {
    actions.push(makeAction(
      'select-review-phase',
      'assess',
      'Select the review phase',
      'Initial rescue and post-treatment recovery use different findings.',
      'Choose Initial assessment for current presentation and rescue review, or Response / recovery only after initial treatment. Until then, this guide deliberately withholds routine bronchodilator and corticosteroid dosing while preserving entered emergency escalation.',
      'Guide design boundary',
      {tone: 'attention'},
    ));
    return {
      values,
      entry: entryFor(values, urgency),
      actions: sortActions(actions),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: UNKNOWN_STAGE_IDS,
      withheld: Object.freeze(['Routine asthma rescue and response/recovery actions remain withheld until a review phase is selected.']),
      gaps: gapsFor(values),
      derived: Object.freeze({severeRoute: urgency.severe, lifeThreateningRoute: urgency.lifeThreatening}),
    };
  }

  if (values.phase === 'initial') {
    addInitialActions(values, urgency, actions);
    return {
      values,
      entry: entryFor(values, urgency),
      actions: sortActions(actions),
      stageNotes: stageNotes(values, urgency),
      visibleStageIds: INITIAL_STAGE_IDS,
      withheld: Object.freeze(values.severity === 'unknown' && !urgency.severe
        ? ['A routine mild/moderate/severe rescue-dose branch is withheld until current severity is entered.']
        : []),
      gaps: gapsFor(values),
      derived: Object.freeze({severeRoute: urgency.severe, lifeThreateningRoute: urgency.lifeThreatening}),
    };
  }

  addResponseActions(values, urgency, actions);
  return {
    values,
    entry: entryFor(values, urgency),
    actions: sortActions(actions),
    stageNotes: stageNotes(values, urgency),
    visibleStageIds: RESPONSE_STAGE_IDS,
    withheld: Object.freeze(values.response !== 'marked' || !canUseRecoveryRoute(values, urgency)
      ? ['Recovery/discharge review remains withheld until marked improvement, current mild findings, a safe recorded room-air oxygenation category and a likely-asthma entry are all established.']
      : []),
    gaps: gapsFor(values),
    derived: Object.freeze({severeRoute: urgency.severe, lifeThreateningRoute: urgency.lifeThreatening}),
  };
}

export const config = Object.freeze({
  id: 'acute-severe-asthma',
  title: 'Acute Severe Asthma',
  reviewedAt: '2026-09-17',
  scope: 'Adult acute asthma/exacerbation in an acute-care setting: visible entry, severity/escalation, initial rescue, treatment response and recovery review.',
  reviewLabel: 'Upgraded · GINA 2026 adult acute-care review',
  reviewLimitations: Object.freeze([
    'This is an adult acute-care decision-support aid, not a diagnosis, local order set, prescription, medication-administration record, airway-device configuration, ICU protocol or authorization.',
    'The GINA acute-care source guides the clinical branches. Product selection, local protocol alignment, availability/orderability, prepared concentration, device, route, dose and patient-specific suitability require separate verification.',
    'Life-threatening asthma, anaphylaxis, airway compromise, ventilatory failure or an alternative time-critical diagnosis require emergency/critical-care pathways; this engine does not configure epinephrine, intubation, NIV, sedation or critical-care infusions.',
    'The adult GINA oxygen target is displayed separately from the adjacent broader dyspnea guide because the sources and clinical questions differ. Document one reconciled target in the active episode.',
  ]),
  sources: Object.freeze([
    source,
    Object.freeze({
      label: 'GINA 2026 Strategy Report — official current report page',
      url: ASTHMA_SOURCE_LANDING,
    }),
  ]),
  entry: Object.freeze({
    title: 'What is the acute presentation?',
    guidance: 'Establish likely asthma, an alternate/additional cause, or anaphylaxis. Severe and life-threatening findings require emergency escalation even before a review phase is chosen.',
    source,
  }),
  fields: ASTHMA_FIELDS,
  stages: Object.freeze([
    Object.freeze({id: 'assess', title: 'Entry & escalation', empty: 'Complete asthma entry, severity and oxygenation review. Unknown does not establish a lower-risk route.'}),
    Object.freeze({id: 'rescue', title: 'Initial rescue', empty: 'Select Initial assessment to view the source-based rescue branch.'}),
    Object.freeze({id: 'reassess', title: 'Reassess response', empty: 'Review observed response after initial treatment and at 1 hour or earlier.'}),
    Object.freeze({id: 'recovery', title: 'Recovery / disposition', empty: 'Recovery needs marked improvement and explicit discharge-review criteria.'}),
  ]),
  visibleFieldKeys,
  evaluate,
  quickReference: Object.freeze({
    summary: 'Establish asthma versus anaphylaxis or another cause, escalate severe findings, separate initial rescue from observed response, and do not turn improvement into automatic discharge.',
    recognition: Object.freeze([
      'Assess speech, air entry, work of breathing, respiratory rate, consciousness, room-air oxygenation and PEF/FEV₁ where feasible; start treatment concurrently when danger is apparent.',
      'Ask what treatment has already been given and the response. Repeated SABA can produce a toxicity pattern that resembles treatment failure.',
      'Look in parallel for anaphylaxis, pneumothorax, inducible laryngeal obstruction, pneumonia, cardiac failure and pulmonary embolism.',
    ]),
    redFlags: Object.freeze([
      'Drowsiness, confusion, cyanosis, quiet/silent chest, exhaustion, poor effort, instability, worsening gas exchange or airway-protection concern.',
      'Room-air SpO₂ <92%, especially <90%; severe symptoms, PEF/FEV₁ <50%, no response or worsening after initial treatment.',
      'Anaphylaxis with asthma: epinephrine first, then immediate bronchodilator therapy through the emergency pathway.',
    ]),
    steps: Object.freeze([
      Object.freeze({
        role: 'Initial severe rescue',
        text: 'GINA Box 9-6: salbutamol 6–10 puffs plus ipratropium 4 puffs by pMDI/spacer, or nebulized salbutamol 5 mg plus ipratropium 0.25 mg; repeat up to 3 treatments 20–30 minutes apart.',
        dosingNote: 'Use one ipratropium-containing route and verify the local product/device; a maintenance frequency is not an acute rescue schedule.',
      }),
      Object.freeze({
        role: 'Oxygen and systemic steroid',
        text: 'Adult severe asthma: controlled oxygen target 93–95%. Start typical adult prednisone/prednisolone 50 mg/day early when indicated; the discharge-course range is 40–50 mg/day for 5–7 days.',
        dosingNote: 'Life-threatening presentation uses 100% oxygen by non-rebreather while emergency support is arranged; IV steroid depends on oral-route failure and local protocol.',
      }),
      Object.freeze({
        role: 'Response and recovery',
        text: 'Reassess after the initial bronchodilator series and at 1 hour or earlier. Consider IV magnesium 2 g over 20 minutes only after inadequate initial response with persistent hypoxemia.',
        dosingNote: 'Marked improvement alone is not discharge. Confirm sustained mild signs, room-air SpO₂, lung function and home resources, then complete controller/action-plan/follow-up review.',
      }),
    ]),
    monitoring: Object.freeze([
      'Closely monitor oxygen saturation; document device/flow where oxygen is used and do not withhold needed oxygen merely to obtain a room-air value.',
      'After high/repeated SABA, review pulse/rhythm, potassium and lactate in context as well as airflow and work of breathing.',
      'For persistent or worsening symptoms, reassess the diagnosis and critical-care need rather than only repeating the prior regimen.',
    ]),
    sources: Object.freeze([source]),
  }),
});

export default config;
