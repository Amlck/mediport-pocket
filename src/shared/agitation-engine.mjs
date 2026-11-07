// Adult acute-agitation review aid. It keeps cause, current medical danger,
// safety, medication exposure and response separate. It performs no chart,
// order, administration, diagnosis, restraint, or authorization operation.

export const ACEP_SEVERE_AGITATION_SOURCE = 'https://www.acep.org/siteassets/new-pdfs/clinical-policies/severe-agitation-cp.pdf';
export const PROJECT_BETA_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3298219/';
export const NICE_RAPID_TRANQUILLISATION_SOURCE = 'https://www.nice.org.uk/guidance/ng10/chapter/recommendations';
export const OLANZAPINE_IM_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f4e41c2c-d32d-40c2-8afb-b6df998ba6b0';

const acep = Object.freeze({
  label: 'ACEP severe agitation clinical policy (approved 2023; Ann Emerg Med 2024)',
  url: ACEP_SEVERE_AGITATION_SOURCE,
});
const beta = Object.freeze({
  label: 'Project BETA psychopharmacology consensus (2012)',
  url: PROJECT_BETA_SOURCE,
});
const nice = Object.freeze({
  label: 'NICE NG10 violence and aggression guidance',
  url: NICE_RAPID_TRANQUILLISATION_SOURCE,
});
const olanzapineLabel = Object.freeze({
  label: 'Olanzapine IM prescribing information (DailyMed)',
  url: OLANZAPINE_IM_LABEL_SOURCE,
});

const field = (key, label, options, threshold) => Object.freeze({
  key,
  label,
  options: Object.freeze([['unknown', 'Not assessed'], ...options]),
  ...(threshold ? {threshold} : {}),
});

export const AGITATION_FIELDS = Object.freeze([
  field('phase', 'Review point', [
    ['initial', 'Initial review'],
    ['reassessment', 'After first calming medicine'],
  ]),
  field('currentEmergency', 'Medical / neurologic emergency now?', [
    ['yes', 'Present'],
    ['no', 'Absent · assessed'],
  ], 'Focal deficit, unresponsiveness, seizure/status, airway, breathing or circulatory compromise is an emergency; do not use a behavioural-sedation route first.'),
  field('immediateThreat', 'Immediate harm risk?', [
    ['yes', 'Yes · violent / cannot be kept safe'],
    ['no', 'No · assessed'],
  ], 'Separate immediate risk to the person, staff or others from a medical/neuro emergency. Use trained local safety support.'),
  field('cause', 'Most likely cause', [
    ['alcohol-or-benzodiazepine-withdrawal', 'Alcohol / benzodiazepine withdrawal'],
    ['cns-depressant-intoxication', 'CNS-depressant / alcohol intoxication'],
    ['delirium-or-medical', 'Delirium / medical illness'],
    ['stimulant-intoxication', 'Stimulant / sympathomimetic intoxication'],
    ['established-schizophrenia-or-bipolar-i-mania', 'Established schizophrenia / bipolar I mania'],
    ['unknown-or-mixed', 'Unknown / mixed'],
  ], 'Make a provisional cause from history, observations, examination, glucose, oxygenation, medicines and toxidrome. A behavioural label does not exclude medical illness.'),
  field('deescalation', 'Verbal de-escalation / environment', [
    ['effective', 'Effective'],
    ['ineffective-or-unsafe', 'Ineffective / unsafe'],
  ], 'When feasible, use calm communication, reduced stimulation and a collaborative oral route before parenteral medication.'),
  field('route', 'Medication route if needed', [
    ['oral-accepted', 'Cooperative oral route'],
    ['parenteral-needed', 'Parenteral route needed'],
  ], 'Offer oral medication when the person can cooperate. Parenteral treatment requires staff, monitoring and product-specific preparation.'),
  field('edDoseScope', 'ED dose-reference scope', [
    ['ed-monitored-18-to-65-not-pregnant', 'Monitored ED · 18–65 · not pregnant · not frail'],
    ['outside-ed-reference-scope', 'Ward / pregnancy / over 65 / frail'],
  ], 'ACEP’s severe-agitation policy is ED-only and excludes pregnancy and people over 65. The source-backed dose references are withheld outside this explicit scope.'),
  field('respiratorySafety', 'Airway / breathing / monitoring for parenteral medicine', [
    ['ready-and-monitored', 'Ready and monitored'],
    ['risk-or-not-ready', 'Respiratory risk / not ready'],
  ], 'Parenteral benzodiazepines can cause oversedation and respiratory depression, especially with CNS depressants. Resolve airway/breathing/monitoring concerns before a dose reference.'),
  field('qtSafety', 'QT / cardiovascular review for antipsychotic route', [
    ['cleared', 'ECG / QT risk reviewed'],
    ['risk-or-no-ecg', 'QT risk / no ECG'],
  ], 'NICE advises avoiding IM haloperidol plus promethazine with cardiovascular disease, prolonged QT or no ECG. Do not infer an antipsychotic route is safe.'),
  field('parkinsonLewyBody', 'Parkinson disease / Lewy-body dementia', [
    ['no', 'No · assessed'],
    ['yes', 'Present'],
  ], 'Dopamine-blocking agents can be unsafe in Parkinson disease or dementia with Lewy bodies; obtain an appropriate alternative plan.'),
  field('priorCalmingMedicine', 'Calming medicine already given?', [
    ['not-given', 'Not given · verified'],
    ['given', 'Given · agent, dose and time recorded'],
  ], 'Reconcile the exact product, dose, route, timing, response, observations and adverse effects before any subsequent medicine.'),
  field('response', 'Current response', [
    ['controlled', 'Settled / no new danger'],
    ['persistent', 'Persistent'],
    ['worse-or-new-emergency', 'Worse / new emergency'],
  ], 'Persistent agitation needs renewed assessment. New medical danger or adverse effect overrides an initial-regimen route.'),
]);

export function normalizeAgitation(input = {}) {
  return Object.fromEntries(AGITATION_FIELDS.map(item => [
    item.key,
    item.options.some(([value]) => value === input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

const ANTIPSYCHOTIC_CAUSES = new Set(['cns-depressant-intoxication', 'established-schizophrenia-or-bipolar-i-mania']);

export function visibleFieldKeys(input = {}) {
  const v = normalizeAgitation(input);
  const keys = ['phase', 'currentEmergency'];
  if (v.currentEmergency === 'no') {
    keys.push('immediateThreat', 'cause', 'deescalation');
    if (v.deescalation === 'ineffective-or-unsafe') {
      keys.push('route', 'edDoseScope', 'priorCalmingMedicine');
      if (v.route === 'parenteral-needed') {
        keys.push('respiratorySafety');
        if (ANTIPSYCHOTIC_CAUSES.has(v.cause)) keys.push('qtSafety', 'parkinsonLewyBody');
      }
    }
    if (v.phase === 'reassessment') {
      if (!keys.includes('priorCalmingMedicine')) keys.push('priorCalmingMedicine');
      keys.push('response');
    }
  }
  return keys;
}

const STAGES = Object.freeze(['entry', 'assess', 'calm', 'reassess']);

export function evaluateEntry(input = {}) {
  const v = normalizeAgitation(input);
  const urgent = v.currentEmergency === 'yes'
    || (v.phase === 'reassessment' && v.response === 'worse-or-new-emergency');
  const status = urgent ? 'urgent'
    : v.immediateThreat === 'yes' ? 'severe-safety-risk'
      : v.cause === 'unknown' || v.cause === 'unknown-or-mixed' ? 'unconfirmed'
        : 'cause-routed';
  const title = urgent ? 'Emergency assessment overrides agitation treatment'
    : status === 'severe-safety-risk' ? 'Immediate safety risk: urgent team response'
      : status === 'cause-routed' ? 'Cause-directed agitation review' : 'Establish safety and a provisional cause';
  const summary = urgent
    ? 'Current medical/neuro danger or worsening after medication prevents a routine calming regimen.'
    : 'Safety, likely cause, de-escalation, route, medication exposure and response are separate findings.';
  return {status, title, summary, source: acep};
}

export function evaluate(input = {}) {
  const v = normalizeAgitation(input);
  const actions = [];
  const add = (id, stage, title, summary, detail, extra = {}) => actions.push({
    id, stage, title, summary, detail,
    sourceUrl: beta.url,
    sourceLabel: beta.label,
    ...extra,
  });
  const reassessmentWorse = v.phase === 'reassessment' && v.response === 'worse-or-new-emergency';
  const urgentMedical = v.currentEmergency === 'yes' || reassessmentWorse;
  const initialMedicationGate = v.phase === 'initial'
    && v.currentEmergency === 'no'
    && v.immediateThreat !== 'unknown'
    && v.deescalation === 'ineffective-or-unsafe'
    && v.route === 'parenteral-needed'
    && v.edDoseScope === 'ed-monitored-18-to-65-not-pregnant'
    && v.respiratorySafety === 'ready-and-monitored'
    && v.priorCalmingMedicine === 'not-given';
  const antipsychoticDoseGate = initialMedicationGate
    && v.qtSafety === 'cleared'
    && v.parkinsonLewyBody === 'no';
  const reassessment = v.phase === 'reassessment' && v.currentEmergency === 'no' && !reassessmentWorse;

  if (urgentMedical) add(
    'agitation-emergency-override', 'entry', 'Urgent medical / neurologic assessment',
    'Current danger or worsening after medication overrides de-escalation and initial dose cards.',
    'Assess airway, breathing, circulation, glucose, consciousness and the suspected medical or neurologic cause. Route focal deficit, unresponsiveness or seizure/status through the appropriate emergency pathway; do not wait to complete behavioural classification.',
    {tone: 'urgent', sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-evaluation'},
  );
  if (v.currentEmergency === 'unknown') add(
    'agitation-check-medical-emergency', 'entry', 'Assess medical / neurologic danger',
    'Unknown emergency status cannot support a medication route.',
    'Review consciousness, focal neurology, seizure activity, airway, breathing, circulation, oxygenation and bedside glucose.',
    {tone: 'attention', sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-evaluation'},
  );
  if (v.immediateThreat === 'unknown' && v.currentEmergency === 'no') add(
    'agitation-assess-immediate-safety-risk', 'entry', 'Assess immediate safety risk',
    'Record whether the person, staff or others can be kept safe while assessment proceeds.',
    'Use trained local support and the least restrictive safe measure. Immediate physical danger and medical/neuro danger are separate checks.',
    {sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-evaluation'},
  );
  if (v.immediateThreat === 'yes' && v.currentEmergency === 'no') add(
    'agitation-severe-safety-route', 'entry', 'Immediate safety threat: urgent team route',
    'Use trained staff, a safer environment and rapid medical assessment; medication is for calm enough to assess, not sleep.',
    'ACEP addresses adults with undifferentiated severe agitation requiring immediate sedation to facilitate life-saving ED care. Its medication evidence excludes people over 65, pregnancy and out-of-hospital use.',
    {tone: 'urgent', sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-evaluation'},
  );

  if (v.currentEmergency === 'no' && !urgentMedical) {
    if (['unknown', 'unknown-or-mixed'].includes(v.cause)) add(
      'agitation-establish-provisional-cause', 'assess', 'Establish a provisional cause',
      'Screen for medical illness, delirium, intoxication, withdrawal and psychiatric illness before selecting a medicine class.',
      'Project BETA advises targeting the most likely cause rather than using medicine as restraint. A normal-looking interval does not exclude hypoxia, hypoglycaemia, infection, toxidrome, seizure or focal neurologic disease.',
      {resourceGroup: 'agitation-evaluation'},
    );
    if (v.cause === 'delirium-or-medical') add(
      'agitation-medical-or-delirium-route', 'assess', 'Treat the medical cause / delirium first',
      'Correct the suspected underlying abnormality and use the delirium review when appropriate.',
      'Project BETA identifies correction of the medical abnormality as definitive for delirium-related agitation and generally avoids benzodiazepines unless alcohol/benzodiazepine withdrawal is the cause.',
      {tone: 'attention', resourceGroup: 'agitation-evaluation', related: ['delirium']},
    );
    if (v.cause === 'alcohol-or-benzodiazepine-withdrawal') add(
      'agitation-withdrawal-cause-route', 'assess', 'Withdrawal: use a withdrawal protocol',
      'Alcohol/benzodiazepine withdrawal differs from intoxication; benzodiazepines are the source-supported class direction.',
      'Confirm the substance, last use, withdrawal severity, seizure risk, liver/respiratory context and local monitored withdrawal plan. This guide does not generate a symptom-score protocol or repeat schedule.',
      {resourceGroup: 'agitation-withdrawal-products'},
    );
    if (v.cause === 'cns-depressant-intoxication') add(
      'agitation-depressant-intoxication-route', 'assess', 'CNS-depressant intoxication: protect breathing',
      'Avoid a benzodiazepine route that compounds respiratory depression; reassess toxidrome and airway/breathing.',
      'Project BETA distinguishes alcohol intoxication from withdrawal and prefers an antipsychotic over benzodiazepines only if medication is required. Consider an opioid-reversal route only when opioid toxicity is clinically suspected; this is not an automatic naloxone order.',
      {tone: 'attention', resourceGroup: 'agitation-reversal'},
    );
    if (v.cause === 'stimulant-intoxication') add(
      'agitation-stimulant-cause-route', 'assess', 'Stimulant route: benzodiazepine class',
      'Project BETA considers benzodiazepines first line for most recreational-drug intoxication, especially stimulants.',
      'Also assess hyperthermia, chest pain, arrhythmia, severe hypertension, seizure and psychotic features. Respiratory safety and observed response still gate any parenteral dose reference.',
      {resourceGroup: 'agitation-withdrawal-products'},
    );
    if (v.cause === 'established-schizophrenia-or-bipolar-i-mania') add(
      'agitation-established-psychiatric-cause-route', 'assess', 'Established schizophrenia / bipolar-I-mania route',
      'After medical danger is assessed, antipsychotic treatment can address agitation in this established labelled context.',
      'Project BETA prefers second-generation antipsychotics when an antipsychotic is indicated. Confirm the established diagnosis, prior response, interactions and physical-health risks; agitation alone does not establish this route.',
      {resourceGroup: 'agitation-antipsychotic-products'},
    );
    if (v.deescalation === 'unknown') add(
      'agitation-attempt-deescalation', 'calm', 'Use de-escalation first when feasible',
      'Use calm communication, reduced stimulation and collaboration before parenteral medication when it is safe to do so.',
      'ACEP and Project BETA both place verbal de-escalation first; offer oral medication when the person can cooperate.',
      {sourceUrl: acep.url, sourceLabel: acep.label},
    );
    if (v.deescalation === 'effective') add(
      'agitation-deescalation-effective', 'calm', 'Continue de-escalation and cause care',
      'Reassess safety, the medical cause and the person’s ability to participate in care.',
      'Calm is the target, not sleep. Reopen the emergency route for new focal signs, reduced consciousness, seizure, airway/breathing or circulatory compromise.',
    );
    if (v.deescalation === 'ineffective-or-unsafe') {
      if (v.route === 'unknown') add(
        'agitation-select-route', 'calm', 'Select a safe route',
        'Use oral medication if cooperative; use a monitored parenteral route only when needed.',
        'Route is not a medication choice. Confirm swallowing/cooperation for oral use and staff, observation and preparation for parenteral use.',
      );
      if (v.route === 'oral-accepted') add(
        'agitation-offer-oral-route', 'calm', 'Offer a collaborative oral route',
        'Use a cause-directed local product after medication history and safety review.',
        'Project BETA prefers oral medication when the person can cooperate. This guide does not expose a universal oral dose because diagnosis, prior exposure, interactions and product-specific rules remain necessary.',
        {resourceGroup: 'agitation-antipsychotic-products'},
      );
      if (v.route === 'parenteral-needed') {
        if (v.edDoseScope === 'unknown') add(
          'agitation-check-ed-dose-reference-scope', 'calm', 'Check ED dose-reference scope',
          'Source-backed dose references are withheld until ED setting, age, pregnancy and frailty scope are explicit.',
          'ACEP makes no specific-agent recommendation for patients above 65 and excludes pregnancy and out-of-hospital care. Frailty, dementia and medical comorbidity require an individualized local plan.',
          {tone: 'attention', sourceUrl: acep.url, sourceLabel: acep.label},
        );
        if (v.edDoseScope === 'outside-ed-reference-scope') add(
          'agitation-outside-ed-dose-reference-scope', 'calm', 'Outside ED dose-reference scope',
          'Do not apply the dose-reference branches; obtain an individualized ward, obstetric, geriatric, medical or psychiatric plan with monitoring.',
          'ACEP excludes people over 65, pregnancy and out-of-hospital care. Delirium, Parkinson disease, Lewy-body dementia, hypotension and respiratory risks need specific review.',
          {tone: 'attention', sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-evaluation'},
        );
        if (v.priorCalmingMedicine === 'unknown') add(
          'agitation-reconcile-prior-medicine', 'calm', 'Reconcile prior calming medicine',
          'Verify agent, dose, route, time, response and adverse effects before an initial dose reference.',
          'A missing administration record is not evidence that no medicine was given. Confirm sedation level, observations, oxygenation and interactions.',
          {resourceGroup: 'agitation-evaluation'},
        );
        if (v.priorCalmingMedicine === 'given') add(
          'agitation-prior-medicine-no-automatic-repeat', 'calm', 'Review before any further medicine',
          'Do not repeat an initial calming regimen automatically.',
          'Recheck the cause, airway/breathing, circulation, consciousness, dose/time, ECG when relevant, response and adverse effects. Persistent or worsening agitation requires an urgent senior/team review.',
          {tone: 'attention', resourceGroup: 'agitation-evaluation'},
        );
        if (v.respiratorySafety === 'unknown') add(
          'agitation-complete-respiratory-safety-check', 'calm', 'Complete airway / breathing / monitoring check',
          'Parenteral dose references are withheld until respiratory safety and monitoring are confirmed.',
          'Benzodiazepines can cause oversedation and respiratory depression, especially with CNS depressants. Confirm current oxygenation, ventilation risk, staff and observation capability.',
          {tone: 'attention', resourceGroup: 'agitation-evaluation'},
        );
        if (v.respiratorySafety === 'risk-or-not-ready') add(
          'agitation-respiratory-safety-block', 'calm', 'Respiratory risk: stabilize before sedative route',
          'Do not use the source-backed benzodiazepine dose-reference branches while airway/breathing or monitoring is unsafe.',
          'Assess and treat the respiratory/toxicologic cause and obtain emergency support as needed. CNS-depressant intoxication and parenteral benzodiazepines can compound respiratory depression.',
          {tone: 'urgent', resourceGroup: 'agitation-evaluation'},
        );
        if (ANTIPSYCHOTIC_CAUSES.has(v.cause) && v.qtSafety === 'unknown') add(
          'agitation-complete-qt-review', 'calm', 'Complete QT / cardiovascular review',
          'An antipsychotic dose reference is withheld until QT/cardiovascular risk is reviewed.',
          'NICE advises avoiding IM haloperidol plus promethazine where cardiovascular disease, prolonged QT or no ECG is present. Product-specific risk still applies to alternatives.',
          {tone: 'attention', sourceUrl: nice.url, sourceLabel: nice.label, resourceGroup: 'agitation-antipsychotic-products'},
        );
        if (ANTIPSYCHOTIC_CAUSES.has(v.cause) && v.parkinsonLewyBody === 'unknown') add(
          'agitation-complete-parkinson-lewy-body-review', 'calm', 'Check Parkinson / Lewy-body risk',
          'An antipsychotic dose reference is withheld until this risk is assessed.',
          'Dopamine-blocking medicines can worsen Parkinsonism and can be unsafe in dementia with Lewy bodies. Use an appropriate alternative plan if present.',
          {tone: 'attention', resourceGroup: 'agitation-antipsychotic-products'},
        );
        if (ANTIPSYCHOTIC_CAUSES.has(v.cause) && (v.qtSafety === 'risk-or-no-ecg' || v.parkinsonLewyBody === 'yes')) add(
          'agitation-antipsychotic-safety-block', 'calm', 'Antipsychotic safety concern: alternative review',
          'Do not use an antipsychotic dose-reference branch while QT/cardiovascular or Parkinson/Lewy-body risk is present.',
          'Treat the cause, maintain safety and obtain an appropriate local medical/psychiatric plan. This guide does not choose a substitute regimen.',
          {tone: 'attention', sourceUrl: nice.url, sourceLabel: nice.label, resourceGroup: 'agitation-antipsychotic-products'},
        );
        if (initialMedicationGate && v.cause === 'alcohol-or-benzodiazepine-withdrawal') add(
          'agitation-lorazepam-withdrawal-reference', 'calm', 'Lorazepam 2 mg IM · reference',
          'Project BETA lists 2 mg IM as an adult initial-dose reference for alcohol/benzodiazepine withdrawal when a monitored parenteral route is clinically selected.',
          'This 2012 consensus table is a dose reference, not a withdrawal protocol or repeat schedule. Confirm substance/last use, severity, seizure risk, respiratory/liver context, product concentration and local monitored withdrawal protocol before use.',
          {sourceUrl: beta.url, sourceLabel: beta.label, resourceGroup: 'agitation-withdrawal-products'},
        );
        if (initialMedicationGate && v.cause === 'stimulant-intoxication') add(
          'agitation-lorazepam-stimulant-reference', 'calm', 'Lorazepam 2 mg IM · reference',
          'Project BETA lists 2 mg IM as an adult initial-dose reference and considers benzodiazepines first line for most stimulant intoxication.',
          'This 2012 consensus table is not a repeat schedule. Confirm hyperthermia, chest pain, severe hypertension, arrhythmia, seizure, respiratory safety, concentration and local toxicology/monitoring plan before use.',
          {sourceUrl: beta.url, sourceLabel: beta.label, resourceGroup: 'agitation-withdrawal-products'},
        );
        if (antipsychoticDoseGate && v.cause === 'cns-depressant-intoxication') add(
          'agitation-haloperidol-depressant-reference', 'calm', 'Haloperidol 5 mg IM · reference',
          'Project BETA lists 5 mg IM as an adult initial-dose reference and prefers an antipsychotic over benzodiazepines if medication is required for alcohol/CNS-depressant intoxication.',
          'This older consensus reference does not replace airway/toxicology evaluation, ECG/product review or a local regimen. It is not for alcohol/benzodiazepine withdrawal, where benzodiazepine treatment is the class direction.',
          {sourceUrl: beta.url, sourceLabel: beta.label, resourceGroup: 'agitation-antipsychotic-products'},
        );
        if (antipsychoticDoseGate && v.cause === 'established-schizophrenia-or-bipolar-i-mania') add(
          'agitation-olanzapine-psychiatric-label-reference', 'calm', 'Olanzapine 10 mg IM · labelled indication only',
          'DailyMed lists 10 mg IM (5 or 7.5 mg when warranted) for agitation associated with schizophrenia or bipolar I mania in adults. Do not combine IM olanzapine with a parenteral benzodiazepine.',
          'Use this only when established schizophrenia or bipolar I mania is clinically documented and the available product and preparation match. It is not a dose for delirium, intoxication, withdrawal or an undifferentiated medical presentation. The label does not recommend concomitant IM olanzapine and parenteral benzodiazepines because of excessive sedation and cardiorespiratory depression. Recheck orthostatic risk before any subsequent-dose decision.',
          {sourceUrl: olanzapineLabel.url, sourceLabel: olanzapineLabel.label, resourceGroup: 'agitation-antipsychotic-products'},
        );
        if (initialMedicationGate && v.cause === 'unknown-or-mixed' && v.immediateThreat === 'yes') add(
          'agitation-acep-severe-undifferentiated-selection', 'calm', 'Severe undifferentiated agitation: ED regimen selection',
          'ACEP supports droperidol + midazolam or an atypical antipsychotic + midazolam for rapid ED treatment; it does not supply one universal dose in this policy.',
          'This is a monitored ED 18–65, not-pregnant, not-frail policy branch, not a ward, frailty or toxicology protocol. Confirm local availability, exact product, prior exposure, ECG/QT, breathing/monitoring and cause before a team chooses a regimen.',
          {tone: 'attention', sourceUrl: acep.url, sourceLabel: acep.label, resourceGroup: 'agitation-antipsychotic-products'},
        );
      }
    }
  }

  if (reassessment) {
    if (v.response === 'unknown') add(
      'agitation-record-post-medicine-response', 'reassess', 'Record response before a further dose',
      'Reassess calmness, consciousness, airway/breathing, circulation, oxygenation, cause and adverse effects.',
      'A prior dose does not establish either effectiveness or safety. Reconcile the exact drug, dose, route and time before any next decision.',
      {resourceGroup: 'agitation-evaluation'},
    );
    if (v.response === 'persistent') add(
      'agitation-persistent-after-first-medicine', 'reassess', 'Persistent agitation: team reassessment',
      'Recheck cause, safety, medication exposure, airway/breathing, circulation, consciousness and adverse effects before a further medicine.',
      'Persistent agitation alone is not proof that a new emergency exists, but it needs senior/team review and cause-directed care. Do not repeat an initial regimen automatically.',
      {tone: 'attention', resourceGroup: 'agitation-evaluation'},
    );
    if (v.response === 'controlled' && v.immediateThreat === 'yes') add(
      'agitation-controlled-threat-conflict', 'reassess', 'Reconcile ongoing threat with “settled”',
      'An immediate safety threat and a controlled response need clarification before a recovery route is used.',
      'Recheck current behaviour, safe staffing, observations, the medication effect and medical cause. Escalate if a medical/neuro emergency has emerged.',
      {tone: 'attention', resourceGroup: 'agitation-evaluation'},
    );
    if (v.response === 'controlled' && v.immediateThreat === 'unknown') add(
      'agitation-controlled-safety-unconfirmed', 'reassess', 'Confirm current safety before recovery review',
      'A settled interval cannot establish recovery while immediate safety risk is unassessed.',
      'Recheck current behaviour, staffing/safety supports, observations, medication effect and medical cause. Escalate if medical/neuro danger has emerged.',
      {tone: 'attention', resourceGroup: 'agitation-evaluation'},
    );
    if (v.response === 'controlled' && v.immediateThreat === 'no') add(
      'agitation-controlled-monitor-and-cause', 'reassess', 'Controlled: monitor and complete cause care',
      'Continue observation and cause-directed assessment; do not turn a calm interval into a psychiatric or discharge diagnosis.',
      'Review sedation level, airway/breathing, circulation, falls/aspiration risk, adverse effects and next care setting. Avoid repeating the initial regimen automatically.',
      {resourceGroup: 'agitation-evaluation'},
    );
  }

  const entry = evaluateEntry(v);
  return {
    values: v,
    entry,
    actions,
    derived: Object.freeze({urgentMedical, initialMedicationGate, antipsychoticDoseGate}),
    visibleStageIds: STAGES.filter(stage => actions.some(action => action.stage === stage)),
    stageNotes: Object.freeze({}),
    gaps: visibleFieldKeys(v).filter(key => v[key] === 'unknown'),
    withheld: Object.freeze([]),
  };
}

export const config = Object.freeze({
  id: 'acute-agitation',
  title: 'Acute agitation',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · ED severe-agitation / cause-directed review',
  scope: 'Adult acute agitation: current medical danger, provisional cause, de-escalation, selected monitored ED dose references and reassessment. It is not a restraint protocol, psychiatric diagnosis, toxicology protocol, local medication order, repeat-dose algorithm or authorization.',
  fields: AGITATION_FIELDS,
  visibleFieldKeys,
  evaluate,
  evaluateEntry,
  regimenActionIds: Object.freeze([
    'agitation-lorazepam-withdrawal-reference',
    'agitation-lorazepam-stimulant-reference',
    'agitation-haloperidol-depressant-reference',
    'agitation-olanzapine-psychiatric-label-reference',
  ]),
  conflictActionIds: Object.freeze(['agitation-controlled-threat-conflict']),
  sources: Object.freeze([acep, beta, nice, olanzapineLabel]),
  reviewLimitations: Object.freeze([
    'ACEP’s severe-agitation medication policy applies to ED adults who require immediate sedation to facilitate life-saving care and excludes people over 65, pregnancy and out-of-hospital care; the explicit ED scope field withholds dose references outside it.',
    'The Project BETA 2 mg / 5 mg cards are explicitly labelled 2012 consensus dose references. They are not repeat schedules or local protocols.',
    'Local regimens and product availability require separate review.',
  ]),
  stages: Object.freeze([
    {id: 'entry', title: 'Safety now'},
    {id: 'assess', title: 'Cause route'},
    {id: 'calm', title: 'De-escalation & selected treatment'},
    {id: 'reassess', title: 'Response & monitoring'},
  ]),
  quickReference: Object.freeze({
    summary: 'First separate medical danger from immediate safety risk, then target the most likely cause and reassess every exposure.',
    recognition: Object.freeze(['Agitation can reflect medical illness, delirium, intoxication, withdrawal or psychiatric illness.']),
    redFlags: Object.freeze(['Focal deficit, unresponsiveness, seizure/status, airway/breathing/circulatory compromise.', 'Worsening after a calming medicine or respiratory adverse effect.']),
    steps: Object.freeze([
      {role: 'Calm', text: 'Use verbal de-escalation and an oral route when safely possible.'},
      {role: 'Target', text: 'Withdrawal, depressant intoxication, delirium/medical illness and stimulant intoxication require different routes.'},
    ]),
    monitoring: Object.freeze(['After any medicine, reassess consciousness, airway/breathing, circulation, oxygenation, adverse effects and the cause.']),
    sources: Object.freeze([acep, beta, nice, olanzapineLabel]),
  }),
});

export default config;
