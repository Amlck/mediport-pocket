// Source-reviewed, session-local decision support for adults with an acute
// convulsive seizure or possible convulsive status epilepticus. This module
// does not inspect a chart, infer medication administration, place an order,
// select a local preparation, or authorize treatment. It deliberately keeps
// an initial dose, an observed response, and later rescue decisions separate.

export const AES_CSE_GUIDELINE_SOURCE = 'https://aesnet.org/clinical-care/clinical-guidance/guideline-prolonged-seizures';
export const NICE_NG217_STATUS_EPILEPTICUS_SOURCE = 'https://www.nice.org.uk/guidance/ng217/chapter/7-Treating-status-epilepticus-repeated-or-cluster-seizures-and-prolonged-seizures';
export const ESETT_SOURCE = 'https://www.nejm.org/doi/full/10.1056/NEJMoa1905795';
export const ACNS_CONTINUOUS_EEG_SOURCE = 'https://www.acns.org/UserFiles/file/Consensus_Statement_on_Continuous_EEG_in.1.pdf';
export const ILAE_STATUS_DEFINITION_SOURCE = 'https://www.ilae.org/guidelines/definition-and-classification';

const aes = Object.freeze({
  label: 'American Epilepsy Society guideline for convulsive status epilepticus (2016)',
  url: AES_CSE_GUIDELINE_SOURCE,
});
const nice = Object.freeze({
  label: 'NICE NG217 status-epilepticus recommendations (updated 2025)',
  url: NICE_NG217_STATUS_EPILEPTICUS_SOURCE,
});
const esett = Object.freeze({
  label: 'ESETT randomized trial (NEJM 2019)',
  url: ESETT_SOURCE,
});
const acns = Object.freeze({
  label: 'ACNS consensus: continuous EEG in critical care (2015)',
  url: ACNS_CONTINUOUS_EEG_SOURCE,
});
const ilae = Object.freeze({
  label: 'ILAE status-epilepticus definition and classification (2015)',
  url: ILAE_STATUS_DEFINITION_SOURCE,
});

export const SEIZURE_SOURCES = Object.freeze([aes, nice, esett, acns, ilae]);

function option(value, label) {
  return Object.freeze([value, label]);
}

function field(key, label, options, extra = {}) {
  return Object.freeze({
    key,
    label,
    options: Object.freeze([
      option('unknown', 'Not assessed / not reconciled'),
      ...options.map(([value, optionLabel]) => option(value, optionLabel)),
    ]),
    ...extra,
  });
}

export const SEIZURE_FIELDS = Object.freeze([
  field('reviewPhase', 'Review point', [
    ['initial-active-episode', 'Initial active-episode review'],
    ['after-benzodiazepine', 'After benzodiazepine response review'],
    ['after-second-line-or-later', 'After second-line treatment / later rescue review'],
  ], {
    essential: 'The initial treatment reference, response review and refractory route are separate. A later phase never reopens an initial loading card automatically.',
  }),
  field('convulsiveCourse', 'Current convulsive course', [
    ['active-under-5-minutes', 'Active convulsion; under 5 minutes so far'],
    ['active-5-minutes-or-more', 'Active convulsion for 5 minutes or more'],
    ['recurrent-without-recovery', 'Repeated convulsions without recovery between them'],
    ['convulsions-stopped', 'Visible convulsions have stopped'],
  ], {
    essential: 'For generalized convulsive seizures, 5 minutes or more, or recurrent seizures without recovery, reaches the emergency treatment threshold. A stopped convulsion still needs response and cause review.',
  }),
  field('currentDanger', 'Immediate danger now?', [
    ['present', 'Present — airway, breathing, circulation, trauma, or rapid neurologic deterioration concern'],
    ['absent-after-assessment', 'Absent after current assessment'],
  ], {
    essential: 'Immediate ABC compromise or rapid deterioration overrides the selected phase. Stabilization and emergency support run in parallel with seizure treatment.',
  }),
  field('bedsideGlucose', 'Bedside glucose / reversible hypoglycaemia', [
    ['low-or-treatment-needed', 'Low or hypoglycaemia treatment needed'],
    ['not-low-after-check', 'Not low after a current check'],
  ], {
    essential: 'Check glucose promptly. Hypoglycaemia is a reversible trigger and can mimic or accompany a seizure; thiamine must not delay glucose rescue.',
  }),
  field('benzodiazepineExposure', 'Actual benzodiazepine exposure in this episode', [
    ['none-confirmed', 'No dose confirmed'],
    ['one-adequate-dose-confirmed', 'One adequate dose confirmed'],
    ['two-adequate-doses-confirmed', 'Two adequate doses confirmed'],
    ['one-or-more-doses-unclear', 'One or more doses given, but agent / route / dose / time is unclear'],
  ], {
    essential: 'Count pre-hospital doses. “Adequate” requires the actual agent, route, dose and time to be reconciled against the applicable emergency protocol; never infer it from an order record alone.',
  }),
  field('benzodiazepineTiming', 'Time since the latest adequate benzodiazepine dose', [
    ['under-5-minutes', 'Under 5 minutes'],
    ['five-to-ten-or-more-minutes', '5–10 minutes or more'],
  ], {
    essential: 'Use the documented administration time, not a guessed seizure duration. Timing helps identify a response window; ongoing failed treatment must not wait for a fixed clock milestone.',
  }),
  field('initialBenzodiazepineStrategy', 'Selected first-line source reference', [
    ['lorazepam-iv', 'IV lorazepam — IV access and resuscitation facilities immediately available'],
    ['midazolam-im-no-iv', 'IM midazolam — no immediately usable IV access'],
    ['individualised-emergency-plan', 'Immediately available individualised emergency plan'],
    ['other-expert-plan', 'Other accountable emergency / specialist plan'],
  ], {
    essential: 'Shown only for a current initial status episode with no confirmed benzodiazepine exposure and current safety assessment complete.',
  }),
  field('midazolamWeightBand', 'Weight band for the IM midazolam source reference', [
    ['13-to-40-kg', '13–40 kg'],
    ['over-40-kg', 'Over 40 kg'],
    ['under-13-kg-or-not-adult-context', 'Under 13 kg / not an adult-reference context'],
  ], {
    essential: 'AES uses 5 mg IM for 13–40 kg and 10 mg IM for over 40 kg. This focused guide is adult-only; a non-adult or out-of-scope weight must use an accountable age-specific protocol.',
  }),
  field('secondLineExposure', 'Actual second-line antiseizure exposure in this episode', [
    ['not-started', 'Not started after review'],
    ['started-or-completion-unclear', 'Started or completion/timing unclear'],
    ['completed-this-episode', 'Completed this episode; response now needs review'],
  ], {
    essential: 'A second-line loading course and its completion must be reconciled before another load or a refractory label. This guide does not infer completion from a source-row frequency.',
  }),
  field('secondLineStrategy', 'Selected eligible second-line source reference', [
    ['levetiracetam', 'IV levetiracetam'],
    ['valproate', 'IV sodium valproate'],
    ['phenytoin-local-protocol', 'IV phenytoin through a current local/expert protocol'],
    ['other-expert-plan', 'Other accountable expert plan'],
  ], {
    essential: 'Shown only after two adequate benzodiazepine doses are confirmed, convulsive status persists, and no second-line loading exposure is confirmed.',
  }),
  field('secondLineSafety', 'Selected valproate or phenytoin suitability', [
    ['reviewed-suitable', 'Reviewed suitable for the selected source reference'],
    ['contraindication-or-specialist-route', 'Contraindication, interaction, haemodynamic/conduction concern, or specialist route'],
  ], {
    essential: 'For valproate, reconcile pregnancy potential, hepatic/mitochondrial/urea-cycle risk and major interactions. For phenytoin, reconcile haemodynamics, rhythm/conduction, preparation and the current local protocol.',
  }),
  field('responseState', 'Current response after the reviewed treatment', [
    ['convulsions-stopped-awareness-returning', 'Convulsions stopped; awareness is returning'],
    ['persistent-convulsions', 'Persistent or recurrent convulsions'],
    ['no-motor-seizure-persistent-altered', 'No visible convulsions, but consciousness is not returning as expected'],
    ['worsening-or-new-danger', 'Worsening course or new danger'],
  ], {
    essential: 'A lower motor burden alone is not recovery. Persistent altered consciousness after visible convulsions needs nonconvulsive-seizure/status assessment, not an assumed post-ictal label.',
  }),
]);

// The compact renderer reads this conventional export directly.
export const fields = SEIZURE_FIELDS;

const VALID_VALUES = Object.freeze(Object.fromEntries(
  SEIZURE_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));

const STAGES = Object.freeze([
  Object.freeze({
    id: 'recognize',
    title: 'Recognize the current seizure course',
    empty: 'Establish whether convulsions are active for 5 minutes or more, recurring without recovery, or have stopped.',
  }),
  Object.freeze({
    id: 'stabilize',
    title: 'Stabilize and correct immediate reversible danger',
    empty: 'Current ABC danger and glucose remain independent of the treatment phase.',
  }),
  Object.freeze({
    id: 'first-line',
    title: 'Reconcile benzodiazepine exposure before another dose',
    empty: 'Count actual pre-hospital and in-hospital exposure; do not repeat an initial dose from a stale entry.',
  }),
  Object.freeze({
    id: 'second-line',
    title: 'Second-line route after adequate benzodiazepines',
    empty: 'Persistent convulsive status after two adequate benzodiazepine doses needs a reviewed second-line route.',
  }),
  Object.freeze({
    id: 'reassess',
    title: 'Response, refractory status, or nonconvulsive status route',
    empty: 'Separate completed treatment, clinical response and EEG-directed escalation.',
  }),
]);

const STAGE_RANK = Object.freeze(Object.fromEntries(STAGES.map((stage, index) => [stage.id, index])));
const STATUS_COURSES = new Set(['active-5-minutes-or-more', 'recurrent-without-recovery']);
const ACTIVE_COURSES = new Set(['active-under-5-minutes', ...STATUS_COURSES]);
const SECOND_LINE_SAFETY_STRATEGIES = new Set(['valproate', 'phenytoin-local-protocol']);

const hasStatusThreshold = values => STATUS_COURSES.has(values.convulsiveCourse);
const hasActiveConvulsions = values => ACTIVE_COURSES.has(values.convulsiveCourse);
const safetyComplete = values => values.currentDanger === 'absent-after-assessment';
const hasWorseningResponse = values => values.responseState === 'worsening-or-new-danger';
const hasSecondLineActivity = values => ['started-or-completion-unclear', 'completed-this-episode'].includes(values.secondLineExposure);
const canExposeDoseReferences = values => safetyComplete(values) && !hasWorseningResponse(values);

export function normalizeSeizure(input = {}) {
  return Object.freeze(Object.fromEntries(SEIZURE_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ])));
}

export function visibleFieldKeys(input = {}) {
  const values = normalizeSeizure(input);
  const keys = ['reviewPhase', 'convulsiveCourse', 'currentDanger', 'bedsideGlucose'];

  if (values.reviewPhase === 'unknown') return Object.freeze(keys);

  keys.push('benzodiazepineExposure');
  if (hasSecondLineActivity(values)) {
    keys.push('secondLineExposure');
    if (values.secondLineExposure === 'completed-this-episode') keys.push('responseState');
  }
  if (!canExposeDoseReferences(values)) return Object.freeze(keys);

  if (hasStatusThreshold(values) && [
    'one-adequate-dose-confirmed',
    'two-adequate-doses-confirmed',
    'one-or-more-doses-unclear',
  ].includes(values.benzodiazepineExposure)) {
    keys.push('benzodiazepineTiming');
  }

  if (values.reviewPhase === 'initial-active-episode'
    && hasStatusThreshold(values)
    && values.benzodiazepineExposure === 'none-confirmed'
    && !hasSecondLineActivity(values)) {
    keys.push('initialBenzodiazepineStrategy');
    if (values.initialBenzodiazepineStrategy === 'midazolam-im-no-iv') keys.push('midazolamWeightBand');
  }

  if (values.reviewPhase === 'after-benzodiazepine') {
    if (hasStatusThreshold(values)
      && values.benzodiazepineExposure === 'two-adequate-doses-confirmed'
      && !hasSecondLineActivity(values)) {
      keys.push('secondLineExposure');
      if (values.secondLineExposure === 'not-started') {
        keys.push('secondLineStrategy');
        if (SECOND_LINE_SAFETY_STRATEGIES.has(values.secondLineStrategy)) keys.push('secondLineSafety');
      }
    }
    if (values.convulsiveCourse === 'convulsions-stopped') keys.push('responseState');
  }

  if (values.reviewPhase === 'after-second-line-or-later') {
    keys.push('secondLineExposure', 'responseState');
  }

  return Object.freeze([...new Set(keys)]);
}

function action(id, stage, title, summary, detail, {
  tone,
  source = nice,
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

function addRecognitionActions(actions, values) {
  switch (values.convulsiveCourse) {
    case 'active-5-minutes-or-more':
      actions.push(action(
        'seizure-status-threshold-active-5-minutes',
        'recognize',
        'Convulsion for ≥5 minutes: treat as convulsive status epilepticus',
        'The emergency treatment threshold is met; do not wait for a longer duration, a diagnostic work-up, or an arbitrary 20-minute clock point.',
        'NICE recommends resuscitation and immediate emergency treatment for convulsive status epilepticus lasting 5 minutes or more. The ILAE operational definition supports a 5-minute treatment threshold for bilateral tonic-clonic seizures. Record observed onset and the actual medicines already given while support proceeds.',
        {tone: 'urgent', source: nice, resourceGroup: 'seizure-evaluation'},
      ));
      break;
    case 'recurrent-without-recovery':
      actions.push(action(
        'seizure-status-threshold-recurrent-without-recovery',
        'recognize',
        'Repeated convulsions without recovery: status route',
        'Do not require a continuous visible convulsion or wait for a duration estimate when recovery has not occurred between seizures.',
        'Treat repeated convulsive seizures without return to baseline as an emergency. Reconcile exact onset, interval recovery, current awareness and all pre-hospital/in-hospital antiseizure exposure; missing timing must not turn this into a resolved episode.',
        {tone: 'urgent', source: nice, resourceGroup: 'seizure-evaluation'},
      ));
      break;
    case 'active-under-5-minutes':
      actions.push(action(
        'seizure-active-under-five-minutes-record-and-prepare',
        'recognize',
        'Active convulsion under 5 minutes: time, protect, and prepare',
        'Record onset and current course. If it reaches 5 minutes or seizures recur without recovery, move immediately to the status route.',
        'Use seizure first aid and current ABC assessment while timing is clarified. This field does not exclude an emergency: clinical deterioration, injury, hypoxia, hypoglycaemia or a patient-specific emergency plan can change the route before 5 minutes.',
        {source: nice, resourceGroup: 'seizure-evaluation'},
      ));
      break;
    case 'convulsions-stopped':
      actions.push(action(
        'seizure-convulsions-stopped-not-final-clearance',
        'recognize',
        'Visible convulsions have stopped; status and recovery still need review',
        'Do not call the episode benign, finished, or non-epileptic solely because motor activity stopped.',
        'Check the observed duration, whether there was recovery between any seizures, current consciousness, glucose, injuries and actual medicine exposure. Persistent altered consciousness after an apparent convulsive response can represent nonconvulsive seizures or nonconvulsive status.',
        {source: acns, resourceGroup: 'seizure-evaluation'},
      ));
      break;
    default:
      actions.push(action(
        'seizure-establish-current-convulsive-course',
        'recognize',
        'Establish the current convulsive course',
        'Unknown duration or interval recovery does not establish a resolved seizure or a non-status presentation.',
        'Record whether convulsions are ongoing, their observed onset, whether any repeated seizure had full recovery between events, and whether visible motor activity has stopped. Treat current danger while this is clarified.',
        {tone: 'attention', source: nice, resourceGroup: 'seizure-evaluation'},
      ));
      break;
  }
}

function addStabilizationActions(actions, values) {
  if (hasWorseningResponse(values)) {
    actions.push(action(
      'seizure-worsening-response-early-emergency-override',
      'stabilize',
      'Worsening course or new danger: emergency reassessment overrides every phase',
      'Do not expose or reuse initial/second-line dose references while a worsening response is entered, even if an earlier phase or “danger absent” field is stale.',
      'Activate urgent clinical/critical-care assessment, reassess ABC, glucose, current seizure activity, actual treatment exposure and alternative acute causes. This review-only engine deliberately suppresses dose-reference cards here; it does not choose a repeat medicine, airway intervention, procedure or infusion.',
      {tone: 'urgent', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
  }

  if (values.currentDanger === 'present') {
    actions.push(action(
      'seizure-current-danger-emergency-support',
      'stabilize',
      'Immediate danger: emergency support and ABC stabilization now',
      'Airway, breathing, circulation, injury or rapidly worsening neurologic concern overrides the selected treatment phase.',
      'Activate the appropriate emergency/critical-care response; protect the airway, support oxygenation and circulation, position safely, monitor, and reassess continuously. Stabilization proceeds in parallel with seizure treatment, but this review-only guide does not choose airway devices, intubation, medication administration or a local protocol.',
      {tone: 'urgent', source: nice, resourceGroup: 'seizure-evaluation'},
    ));
  } else if (values.currentDanger === 'unknown') {
    actions.push(action(
      'seizure-assess-current-danger-before-numeric-reference',
      'stabilize',
      'Assess current ABC danger before exposing a dose reference',
      'Unknown airway, breathing, circulation, injury or neurologic deterioration is not a stable seizure route.',
      'Assess airway protection, oxygenation/ventilation, circulation/perfusion, trauma, glucose, temperature and rapidly changing neurologic findings. If compromise is present, activate emergency support; the source review does not convert this screen into an airway or medication order.',
      {tone: 'attention', source: nice, resourceGroup: 'seizure-evaluation'},
    ));
  }

  if (values.bedsideGlucose === 'low-or-treatment-needed') {
    actions.push(action(
      'seizure-hypoglycaemia-rescue-in-parallel',
      'stabilize',
      'Low glucose: use the hypoglycaemia rescue pathway in parallel',
      'Correct hypoglycaemia immediately through the responsible team; do not delay glucose rescue for thiamine, imaging, EEG, or seizure classification.',
      'NICE names hypoglycaemia as an underlying cause that may require additional treatment in status epilepticus. This guide links to the reviewed hypoglycaemia pathway rather than selecting a glucose concentration, dose, route or repeat sequence here.',
      {tone: 'urgent', source: nice, resourceGroup: 'seizure-evaluation', related: ['hypoglycemia']},
    ));
  } else if (values.bedsideGlucose === 'unknown') {
    actions.push(action(
      'seizure-check-bedside-glucose',
      'stabilize',
      'Check bedside glucose promptly',
      'A missing glucose does not exclude a reversible hypoglycaemic trigger or mimic.',
      'Obtain and record a current bedside glucose while emergency support and seizure treatment proceed. If low, route to immediate hypoglycaemia rescue; do not use the local thiamine instruction as a reason to defer glucose treatment.',
      {tone: 'attention', source: nice, resourceGroup: 'seizure-evaluation', related: ['hypoglycemia']},
    ));
  }

  if (values.convulsiveCourse !== 'unknown') {
    actions.push(action(
      'seizure-parallel-cause-and-trigger-review',
      'stabilize',
      'Review reversible causes and triggers in parallel',
      'Cause review must not delay control of an active status episode or glucose/ABC rescue.',
      'Review antiseizure-medication non-adherence or withdrawal, alcohol/benzodiazepine withdrawal, metabolic disturbance, infection, trauma/structural lesion, toxin exposure and pregnancy-related eclampsia when relevant. Select investigations from the clinical context; there is no routine laboratory, imaging or procedure panel.',
      {source: nice, resourceGroup: 'seizure-evaluation'},
    ));
  }
}

function addInitialBenzodiazepineActions(actions, values) {
  if (!hasStatusThreshold(values)) return;
  if (!canExposeDoseReferences(values)) return;

  if (hasSecondLineActivity(values)) {
    actions.push(action(
      'seizure-second-line-exposure-suppresses-initial-reference',
      'first-line',
      'Second-line exposure is already started/completed: do not reopen an initial benzodiazepine reference',
      'A stale initial phase or “no dose confirmed” entry cannot override a reconciled started/completed second-line course.',
      'Reconcile the actual benzodiazepine and second-line record, then use the response/refractory route. This guard prevents a later record from being mistaken for benzodiazepine-naive status or from generating a duplicate initial dose.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-benzodiazepine'},
    ));
    return;
  }

  if (values.reviewPhase === 'initial-active-episode') {
    switch (values.benzodiazepineExposure) {
      case 'none-confirmed':
        switch (values.initialBenzodiazepineStrategy) {
          case 'lorazepam-iv':
            actions.push(action(
              'seizure-initial-lorazepam-reference',
              'first-line',
              'IV lorazepam: 0.1 mg/kg (maximum 4 mg) source reference',
              'For a current convulsive-status episode with IV access and resuscitation facilities immediately available; confirm the actual local protocol and administration record.',
              'AES lists IV lorazepam as an established effective first therapy. Its algorithm uses 0.1 mg/kg IV, maximum 4 mg per dose, and permits one repeat dose if seizure activity continues. NICE limits benzodiazepine treatment to two total doses, including any pre-hospital dose. Monitor airway, breathing, circulation and response; this card is not an administration instruction or a reason to repeat a stale first dose.',
              {tone: 'urgent', source: aes, resourceGroup: 'seizure-benzodiazepine'},
            ));
            break;
          case 'midazolam-im-no-iv':
            if (values.midazolamWeightBand === 'over-40-kg') {
              actions.push(action(
                'seizure-initial-midazolam-im-over-40kg-reference',
                'first-line',
                'IM midazolam: 10 mg source reference for weight over 40 kg when IV access is not immediately usable',
                'AES supports IM midazolam when IV access is not established; do not delay treatment solely to obtain an IV line.',
                'AES uses 10 mg IM for people over 40 kg and 5 mg IM for 13–40 kg. Reconcile any pre-hospital benzodiazepine first, maintain cardiorespiratory monitoring and obtain accountable emergency support. This guide does not choose an intranasal/buccal formulation, product, preparation, administration, or a repeat dose.',
                {tone: 'urgent', source: aes, resourceGroup: 'seizure-benzodiazepine'},
              ));
            } else if (values.midazolamWeightBand === '13-to-40-kg') {
              actions.push(action(
                'seizure-initial-midazolam-im-13-to-40kg-reference',
                'first-line',
                'IM midazolam: 5 mg source reference for 13–40 kg when IV access is not immediately usable',
                'The adult-focused guide retains AES’s 13–40 kg band rather than treating every adult as a 10 mg IM reference.',
                'AES uses 5 mg IM for 13–40 kg and 10 mg IM for people over 40 kg. Reconcile any pre-hospital benzodiazepine first, maintain cardiorespiratory monitoring and obtain accountable emergency support. This card is not a product preparation, administration, or repeat-dose instruction.',
                {tone: 'urgent', source: aes, resourceGroup: 'seizure-benzodiazepine'},
              ));
            } else if (values.midazolamWeightBand === 'under-13-kg-or-not-adult-context') {
              actions.push(action(
                'seizure-initial-midazolam-im-outside-adult-weight-reference',
                'first-line',
                'IM midazolam selection is outside this adult weight-reference scope',
                'Use an accountable age- and weight-specific emergency protocol; this adult compact guide does not provide a dose here.',
                'The AES algorithm contains pediatric weight bands, but this engine is scoped to adults. Do not extrapolate its adult source references to a non-adult context or use this field as a medication order.',
                {tone: 'attention', source: aes, resourceGroup: 'seizure-benzodiazepine'},
              ));
            } else {
              actions.push(action(
                'seizure-initial-midazolam-im-weight-band-before-reference',
                'first-line',
                'Record the weight band before exposing an IM midazolam reference',
                'AES distinguishes 13–40 kg from over 40 kg; “adult” alone is not used as a 10 mg assumption.',
                'Reconcile the current weight band and any pre-hospital benzodiazepine exposure. Emergency support continues while this review is completed; this guard is not an instruction to wait for a fixed documentation step when the responsible emergency team is treating status.',
                {tone: 'attention', source: aes, resourceGroup: 'seizure-benzodiazepine'},
              ));
            }
            break;
          case 'individualised-emergency-plan':
            actions.push(action(
              'seizure-use-immediately-available-individualised-plan',
              'first-line',
              'Immediately available individualised emergency plan: reconcile and follow it',
              'Confirm its patient, current episode, medicine, dose, route, time and prior exposure before treating it as the active plan.',
              'NICE advises using an immediately available individualised emergency management plan. This engine does not retrieve, interpret, execute or validate such a plan; it also does not convert an unverified plan into a repeat-dose instruction.',
              {source: nice, resourceGroup: 'seizure-benzodiazepine'},
            ));
            break;
          case 'other-expert-plan':
            actions.push(action(
              'seizure-other-first-line-expert-plan',
              'first-line',
              'Other accountable first-line plan selected',
              'Record why it differs, the named clinician/team, exact exposure and the next response check.',
              'This compact guide does not enumerate every benzodiazepine, route or exceptional regimen. Reconcile the actual plan and monitoring setting; do not infer a product or repeat an initial dose from a prior order record.',
              {source: nice, resourceGroup: 'seizure-benzodiazepine'},
            ));
            break;
          default:
            actions.push(action(
              'seizure-select-first-line-reference-after-exposure-check',
              'first-line',
              'Select the first-line source reference after exposure is confirmed',
              'Choose IV lorazepam when IV access and resuscitation facilities are immediately available, or IM midazolam when IV access is not immediately usable.',
              'AES supports IV lorazepam or IM midazolam as effective initial options. This field appears only after no benzodiazepine dose is confirmed for the current episode; a missing administration record is not proof of no exposure.',
              {tone: 'attention', source: aes, resourceGroup: 'seizure-benzodiazepine'},
            ));
            break;
        }
        break;
      case 'one-adequate-dose-confirmed':
      case 'two-adequate-doses-confirmed':
        actions.push(action(
          'seizure-initial-benzodiazepine-already-confirmed-no-reload',
          'first-line',
          'Initial benzodiazepine exposure is already confirmed: do not reload it from this guide',
          'Use the actual agent, route, dose, time and current response to decide the next accountable step.',
          'The initial numeric cards apply only when no dose is confirmed. Count pre-hospital treatment. NICE limits benzodiazepine treatment to two total doses; once adequate exposure is entered, this engine does not reconstruct or repeat an initial sequence.',
          {tone: 'attention', source: nice, resourceGroup: 'seizure-benzodiazepine'},
        ));
        break;
      default:
        actions.push(action(
          'seizure-reconcile-benzodiazepine-exposure-before-initial-card',
          'first-line',
          'Reconcile actual benzodiazepine exposure before showing an initial dose reference',
          'Unknown or unclear pre-hospital/in-hospital exposure must not be treated as benzodiazepine-naive status.',
          'Verify the actual medicine, route, dose, administration time, seizure activity at the time and response. If immediate emergency treatment is needed, the responsible emergency team should follow its protocol while this review records the exposure; this tool never infers administration.',
          {tone: 'attention', source: nice, resourceGroup: 'seizure-benzodiazepine'},
        ));
        break;
    }
    return;
  }

  if (values.reviewPhase === 'after-benzodiazepine') {
    actions.push(action(
      'seizure-after-benzodiazepine-do-not-reopen-initial-card',
      'first-line',
      'After benzodiazepine review: do not reopen an initial loading card',
      'Reconcile the actual exposure, elapsed time and clinical response before considering a second dose or second-line therapy.',
      'The initial numeric cards are deliberately withheld in this phase. Count all pre-hospital and in-hospital doses, then use the controlled response route below; never use a stale initial selection as a repeat-dose command.',
      {source: nice, resourceGroup: 'seizure-benzodiazepine'},
    ));
  } else if (values.reviewPhase === 'after-second-line-or-later') {
    actions.push(action(
      'seizure-after-second-line-do-not-reopen-initial-card',
      'first-line',
      'After second-line review: do not reopen an initial benzodiazepine card',
      'Focus on actual second-line completion, response, refractory escalation and EEG assessment.',
      'A later rescue phase does not establish that an initial dose was missed. Reconcile the medication record and current clinical state through the accountable emergency/critical-care team.',
      {source: acns, resourceGroup: 'seizure-benzodiazepine'},
    ));
  }
}

function addBenzodiazepineResponseActions(actions, values) {
  if (values.reviewPhase !== 'after-benzodiazepine' || !hasStatusThreshold(values) || !canExposeDoseReferences(values)) return;

  switch (values.benzodiazepineExposure) {
    case 'one-adequate-dose-confirmed':
      switch (values.benzodiazepineTiming) {
        case 'under-5-minutes':
          actions.push(action(
            'seizure-one-adequate-benzo-within-response-window',
            'first-line',
            'One adequate benzodiazepine: response window still under 5 minutes',
            'Maintain continuous assessment and record the current seizure course; do not infer that the dose failed or repeat an earlier selection automatically.',
            'The elapsed time must come from the actual administration record. If convulsive activity persists into the 5–10-minute reassessment window, the accountable team should reconcile the first agent and decide whether a second total benzodiazepine dose is indicated under its protocol.',
            {source: nice, resourceGroup: 'seizure-benzodiazepine'},
          ));
          break;
        case 'five-to-ten-or-more-minutes':
          actions.push(action(
            'seizure-one-adequate-benzo-persistent-reconcile-second-dose',
            'first-line',
            'Persistent status after one adequate benzodiazepine: reconcile before a second total dose',
            'Confirm the actual agent, route, dose, time and current response; do not create a duplicate from the first-line card.',
            'NICE advises a second benzodiazepine dose if the seizure has not stopped within 5–10 minutes of the first. The two-dose limit includes pre-hospital treatment. This engine supplies no automatic repeat-dose card because the verified first exposure must remain the source of truth.',
            {tone: 'urgent', source: nice, resourceGroup: 'seizure-benzodiazepine'},
          ));
          break;
        default:
          actions.push(action(
            'seizure-record-latest-benzo-time-before-repeat-decision',
            'first-line',
            'Record the latest adequate benzodiazepine time before a repeat decision',
            'Missing time must not make a dose look failed, current, or safely repeatable.',
            'Reconcile the administration record and current convulsive activity. Emergency care continues while this is clarified; the field is a duplicate-dose safeguard, not a reason to wait for a fixed timeline when treatment failure is clear.',
            {tone: 'attention', source: nice, resourceGroup: 'seizure-benzodiazepine'},
          ));
          break;
      }
      break;
    case 'two-adequate-doses-confirmed':
      actions.push(action(
        'seizure-two-adequate-benzodiazepines-no-third-routine-dose',
        'first-line',
        'Two adequate benzodiazepine doses are confirmed: move to the second-line route',
        'Do not add a routine third benzodiazepine dose; confirm second-line eligibility and actual exposure now.',
        'NICE recommends IV levetiracetam, phenytoin or sodium valproate after convulsive status does not respond to two benzodiazepine doses. The legacy 20-minute marker describes a treatment phase; ongoing failed treatment should not wait for that clock value.',
        {tone: 'urgent', source: nice, resourceGroup: 'seizure-benzodiazepine'},
      ));
      break;
    case 'one-or-more-doses-unclear':
    case 'unknown':
      actions.push(action(
        'seizure-reconcile-benzodiazepine-exposure-before-second-line-eligibility',
        'first-line',
        'Reconcile benzodiazepine exposure before declaring second-line eligibility',
        'Unknown agent, route, dose or time cannot safely be called either an inadequate first dose or two adequate doses.',
        'Find the responsible record or team and reconcile all current-episode doses, including pre-hospital treatment. Do not repeat an initial dose merely because an earlier order is visible; ongoing emergency support and clinical escalation continue in parallel.',
        {tone: 'attention', source: nice, resourceGroup: 'seizure-benzodiazepine'},
      ));
      break;
    default:
      break;
  }
}

function addSecondLineActions(actions, values) {
  if (values.reviewPhase !== 'after-benzodiazepine'
    || !hasStatusThreshold(values)
    || !canExposeDoseReferences(values)
    || values.benzodiazepineExposure !== 'two-adequate-doses-confirmed') return;

  switch (values.secondLineExposure) {
    case 'not-started':
      switch (values.secondLineStrategy) {
        case 'levetiracetam':
          actions.push(action(
            'seizure-second-line-levetiracetam-reference',
            'second-line',
            'IV levetiracetam: 60 mg/kg (maximum 4,500 mg) over 10 minutes source reference',
            'A source-reviewed option after two adequate benzodiazepine doses when ongoing convulsive status is entered; verify current product, renal context, infusion process and accountable clinical authorization locally.',
            'ESETT used levetiracetam 60 mg/kg IV (maximum 4,500 mg) over 10 minutes for benzodiazepine-refractory convulsive status. ESETT found no significant efficacy difference among levetiracetam, fosphenytoin and valproate. This card does not choose a maintenance regimen, product preparation, administration or a repeat load.',
            {tone: 'urgent', source: esett, resourceGroup: 'seizure-second-line'},
          ));
          break;
        case 'valproate':
          if (values.secondLineSafety === 'reviewed-suitable') {
            actions.push(action(
              'seizure-second-line-valproate-reference',
              'second-line',
              'IV sodium valproate: 40 mg/kg (maximum 3,000 mg) over 10 minutes source reference',
              'A source-reviewed option only after the selected valproate safety review and two adequate benzodiazepine doses are confirmed.',
              'ESETT used valproate 40 mg/kg IV (maximum 3,000 mg) over 10 minutes. Reconcile pregnancy potential, hepatic disease, mitochondrial/urea-cycle concern and major interacting medicines before use. This is not a product-specific preparation, administration, maintenance plan or repeat-load instruction.',
              {tone: 'urgent', source: esett, resourceGroup: 'seizure-second-line'},
            ));
          } else if (values.secondLineSafety === 'contraindication-or-specialist-route') {
            actions.push(action(
              'seizure-second-line-valproate-not-routine-with-safety-concern',
              'second-line',
              'Valproate safety concern: use an accountable alternative/expert route',
              'Do not use the valproate source reference as a default when the selected safety screen has a concern.',
              'NICE lists sodium valproate as one of several second-line choices and points to its safety measures. Reconcile the specific concern and choose an alternative through the responsible emergency/neurology team; this guide does not create an alternative-dose sequence.',
              {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
            ));
          } else {
            actions.push(action(
              'seizure-second-line-valproate-safety-before-reference',
              'second-line',
              'Complete valproate suitability review before exposing its dose reference',
              'Pregnancy potential, liver/mitochondrial/urea-cycle concern and important interactions need explicit reconciliation.',
              'Persistent status still needs urgent second-line management. If valproate is not suitable or safety remains unresolved, select another accountable route rather than treating the unknown screen as permission to load valproate.',
              {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
            ));
          }
          break;
        case 'phenytoin-local-protocol':
          if (values.secondLineSafety === 'reviewed-suitable') {
            actions.push(action(
              'seizure-second-line-phenytoin-local-protocol-only',
              'second-line',
              'IV phenytoin: use a current local/expert protocol; no fosphenytoin substitution',
              'NICE lists IV phenytoin as a second-line option. NTUH’s public formulary (2026-08-28 snapshot) lists injectable phenytoin but no fosphenytoin product; no phenytoin regimen is promoted here.',
              'ESETT studied fosphenytoin in mg PE. Where only injectable phenytoin is available, do not convert that mg-PE regimen to phenytoin. Confirm cardiac/BP monitoring, preparation, rate, local availability and an accountable protocol.',
              {tone: 'urgent', source: nice, resourceGroup: 'seizure-second-line'},
            ));
          } else if (values.secondLineSafety === 'contraindication-or-specialist-route') {
            actions.push(action(
              'seizure-second-line-phenytoin-safety-concern',
              'second-line',
              'Phenytoin safety or protocol concern: select an accountable alternative route',
              'Do not infer that a stored phenytoin row is safe, available, or interchangeable with fosphenytoin.',
              'Reconcile the haemodynamic, rhythm/conduction, preparation and local-protocol concern with the emergency/neurology team. This guide does not supply a replacement loading regimen.',
              {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
            ));
          } else {
            actions.push(action(
              'seizure-second-line-phenytoin-safety-before-local-protocol',
              'second-line',
              'Complete phenytoin safety and local-protocol review',
              'A local phenytoin identity is not a verified fosphenytoin substitute, preparation or current availability claim.',
              'Confirm haemodynamics, rhythm/conduction, preparation, infusion monitoring and current local protocol. Ongoing convulsive status must still be escalated urgently through the accountable team; this guard prevents an unsafe copied regimen.',
              {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
            ));
          }
          break;
        case 'other-expert-plan':
          actions.push(action(
            'seizure-second-line-other-expert-plan',
            'second-line',
            'Other accountable second-line plan selected',
            'Record the rationale, exact agent/route/dose/time, safety checks and planned response assessment before treating it as completed.',
            'NICE allows choice among several second-line medicines and recommends expert guidance when initial treatment is unsuccessful. This guide does not construct combinations, loading doses, product preparations or an order from an “other” selection.',
            {source: nice, resourceGroup: 'seizure-second-line'},
          ));
          break;
        default:
          actions.push(action(
            'seizure-select-second-line-reference-after-two-adequate-benzodiazepines',
            'second-line',
            'Select an accountable second-line route after two adequate benzodiazepines',
            'Levetiracetam, sodium valproate and phenytoin are reviewed options; choose based on the current clinical context, safety and local protocol.',
            'NICE lists IV levetiracetam, phenytoin and sodium valproate after two benzodiazepine doses. ESETT found similar effectiveness among levetiracetam, fosphenytoin and valproate. The source list does not make any option a universal default or prove a local product is available.',
            {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
          ));
          break;
      }
      break;
    case 'started-or-completion-unclear':
      actions.push(action(
        'seizure-second-line-started-reconcile-completion-before-reload',
        'second-line',
        'Second-line treatment started or unclear: reconcile completion before another load',
        'Do not treat a selected agent, an infusion order, or a source-row frequency as proof that a load finished or failed.',
        'Verify the actual agent, route, dose, start/finish time, interruption, current seizure activity and adverse effects. Escalate ongoing status while this is clarified; the guide does not duplicate or stack a loading course.',
        {tone: 'attention', source: esett, resourceGroup: 'seizure-second-line'},
      ));
      break;
    case 'completed-this-episode':
      actions.push(action(
        'seizure-second-line-completed-move-to-response-review',
        'second-line',
        'Second-line treatment is completed: use the response/refractory route',
        'Do not show another initial or second-line loading card from this state.',
        'Record the actual completed exposure and assess clinical convulsions, awareness, ABC status and EEG need. Persistent seizures after a benzodiazepine plus an acceptable antiseizure medicine meet a refractory-status escalation context in ACNS guidance.',
        {source: acns, resourceGroup: 'seizure-second-line'},
      ));
      break;
    default:
      actions.push(action(
        'seizure-second-line-exposure-not-established',
        'second-line',
        'Establish second-line exposure before selecting or repeating a load',
        'Unknown exposure is not “not started,” and it cannot establish response or refractory status.',
        'Reconcile all actual treatment, including pre-hospital and transfer exposure, with the accountable clinical team. Keep emergency escalation active for ongoing convulsive status; this data-only engine does not infer medication administration.',
        {tone: 'attention', source: nice, resourceGroup: 'seizure-second-line'},
      ));
      break;
  }
}

function addResponseActions(actions, values) {
  if (hasWorseningResponse(values)) return;

  // A completed second-line course is evidence about the episode, not merely a
  // UI phase. It therefore routes to response/refractory review even if a stale
  // initial or post-benzodiazepine phase remains selected.
  if (values.secondLineExposure === 'completed-this-episode') {
    if (!safetyComplete(values)) {
      actions.push(action(
        'seizure-completed-second-line-prioritize-current-danger',
        'reassess',
        'Completed second-line treatment with current danger incomplete: stabilize first',
        'Do not label recovery or prescribe another load while current ABC danger is unknown or present.',
        'Use emergency/critical-care support to reassess airway, breathing, circulation, injury, glucose and current seizure activity. The completed exposure must still be reconciled, but it suppresses stale initial-dose references regardless of the selected phase.',
        {tone: values.currentDanger === 'present' ? 'urgent' : 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
      ));
      return;
    }
    if (hasStatusThreshold(values)) {
      addRefractoryStatusAction(actions);
      return;
    }
    if (values.responseState === 'unknown') {
      actions.push(action(
        'seizure-assess-response-after-completed-second-line',
        'reassess',
        'Assess convulsions, awareness and ABC response after completed second-line treatment',
        'Missing response data cannot establish seizure control, refractory status or a safe recovery state.',
        'Record current motor activity, consciousness trajectory, respiratory/circulatory status and relevant EEG need. Persistent altered consciousness warrants nonconvulsive-seizure/status assessment; do not rely on a fixed 40-minute marker alone.',
        {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
      ));
      return;
    }
    addResponseStateAction(actions, values, {afterSecondLine: true});
    return;
  }

  if (values.reviewPhase === 'after-benzodiazepine' && values.convulsiveCourse === 'convulsions-stopped' && safetyComplete(values)) {
    if (values.responseState === 'unknown') {
      actions.push(action(
        'seizure-assess-response-after-visible-convulsions-stop',
        'reassess',
        'Assess awareness and response after visible convulsions stop',
        'A stopped motor seizure does not distinguish normal recovery, nonconvulsive seizure/status, medicine-related sedation or another acute cause.',
        'Record whether awareness is returning as expected, whether any new motor activity recurs, current ABC status and the actual treatment exposure. Consider EEG urgently when consciousness does not return as expected; a routine awake EEG is not a substitute for continuous EEG.',
        {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
      ));
    } else {
      addResponseStateAction(actions, values, {afterSecondLine: false});
    }
  }

  if (values.reviewPhase !== 'after-second-line-or-later') return;

  if (!safetyComplete(values)) {
    actions.push(action(
      'seizure-later-phase-prioritize-current-danger',
      'reassess',
      'Later-phase review is incomplete until current danger is assessed',
      'Do not label response, refractory status or recovery while ABC danger is unknown or present.',
      'Stabilize current airway, breathing, circulation, injury and neurologic concerns through the emergency/critical-care team. Then reconcile second-line completion and response; this guide does not make an airway or medication decision.',
      {tone: values.currentDanger === 'present' ? 'urgent' : 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
    return;
  }

  if (values.secondLineExposure === 'unknown') {
    actions.push(action(
      'seizure-later-phase-reconcile-second-line-exposure',
      'reassess',
      'Reconcile actual second-line completion before response or refractory classification',
      'An unknown loading course cannot establish treatment failure, recovery, or an indication to repeat it.',
      'Verify actual agent, route, dose, start/finish time, interruption and response. If convulsions are ongoing or awareness worsens, escalate clinically while the record is reconciled; no loading card is reopened from this phase.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
    return;
  }

  if (values.secondLineExposure === 'not-started') {
    actions.push(action(
      'seizure-later-phase-second-line-not-started-conflict',
      'reassess',
      'Later rescue phase conflicts with a “second-line not started” entry',
      'Reconcile the phase and actual treatment record; do not infer a failed second-line course or repeat a first-line card.',
      'This is a record-consistency prompt, not a conclusion that treatment was omitted. Ongoing convulsive status needs urgent accountable management while the actual route, exposure and response are clarified.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
    return;
  }

  if (values.secondLineExposure === 'started-or-completion-unclear') {
    actions.push(action(
      'seizure-later-phase-second-line-completion-unclear',
      'reassess',
      'Second-line completion remains unclear: do not classify response or refractory status yet',
      'Use current clinical escalation and continuous assessment while the actual loading exposure is reconciled.',
      'A selected or started treatment can be interrupted, delayed, incomplete or already effective. Confirm exact completion and response before considering another load, anaesthetic therapy or a recovery claim.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
    return;
  }

  if (values.responseState === 'unknown') {
    actions.push(action(
      'seizure-assess-response-after-completed-second-line',
      'reassess',
      'Assess convulsions, awareness and ABC response after completed second-line treatment',
      'Missing response data cannot establish seizure control, refractory status or a safe recovery state.',
      'Record current motor activity, consciousness trajectory, respiratory/circulatory status and relevant EEG need. Persistent altered consciousness warrants nonconvulsive-seizure/status assessment; do not rely on a fixed 40-minute marker alone.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
    return;
  }

  addResponseStateAction(actions, values, {afterSecondLine: true});
}

function addRefractoryStatusAction(actions) {
  actions.push(action(
    'seizure-refractory-status-critical-care-continuous-eeg',
    'reassess',
    'Persistent convulsive status after completed second-line treatment: refractory-status escalation',
    'Escalate to critical-care/neurology/anaesthesia support and continuous EEG; do not wait for a fixed 40-minute clock or repeat a stale loading card.',
    'AES describes anaesthetic-dose therapy with continuous EEG as a third-phase consideration after second therapy fails. ACNS recommends continuous EEG to monitor refractory status and continuous IV antiseizure/anesthetic therapy. This engine provides neither an infusion preparation nor a dose.',
    {tone: 'urgent', source: acns, resourceGroup: 'seizure-refractory-eeg'},
  ));
}

function addResponseStateAction(actions, values, {afterSecondLine}) {
  switch (values.responseState) {
    case 'convulsions-stopped-awareness-returning':
      actions.push(action(
        afterSecondLine ? 'seizure-post-second-line-improving-not-clearance' : 'seizure-post-benzodiazepine-improving-not-clearance',
        'reassess',
        'Convulsions stopped and awareness is returning: continue observation and cause review',
        'This is not a discharge, driving, medication-maintenance, or future-dose authorization.',
        'Continue serial consciousness, ABC, injury/aspiration and recurrence assessment, reconcile actual medicine exposure, and investigate the clinical trigger. If awareness fails to return as expected or motor activity recurs, reopen the urgent EEG/refractory assessment rather than repeating an earlier loading card.',
        {source: acns, resourceGroup: 'seizure-evaluation'},
      ));
      break;
    case 'persistent-convulsions':
      if (afterSecondLine) {
        addRefractoryStatusAction(actions);
      } else {
        actions.push(action(
          'seizure-persistent-convulsions-reassess-current-treatment',
          'reassess',
          'Persistent convulsions: urgent treatment-exposure and second-line reassessment',
          'Reconcile actual benzodiazepine exposure, current safety and second-line eligibility immediately; do not call visible motor persistence a resolved seizure.',
          'If two adequate benzodiazepine doses are confirmed, move to a reviewed second-line route without delay. If exposure is unclear, urgently reconcile it; the guide does not create a duplicate-dose sequence.',
          {tone: 'urgent', source: nice, resourceGroup: 'seizure-second-line'},
        ));
      }
      break;
    case 'no-motor-seizure-persistent-altered':
      actions.push(action(
        'seizure-persistent-altered-consciousness-ncse-continuous-eeg',
        'reassess',
        'No visible convulsions but consciousness is not returning: assess for nonconvulsive seizure/status',
        'Do not assume a normal post-ictal state or medication sedation without EEG-directed assessment and clinical review.',
        'ACNS recommends continuous EEG for persistently abnormal mental status after convulsive seizures/status and to assess treatment efficacy. A routine awake EEG is not continuous EEG. Arrange the appropriate urgent neurology/critical-care pathway and do not use this guide to select an anaesthetic or antiseizure infusion.',
        {tone: 'urgent', source: acns, resourceGroup: 'seizure-refractory-eeg'},
      ));
      break;
    case 'worsening-or-new-danger':
      // This state is handled by the phase-independent early override in
      // addStabilizationActions, before any dose-reference branch can run.
      break;
    default:
      break;
  }
}

function addReviewPointAndConflictActions(actions, values) {
  if (values.reviewPhase === 'unknown') {
    actions.push(action(
      'seizure-select-review-point-before-treatment-interpretation',
      'reassess',
      'Establish whether this is an initial, post-benzodiazepine, or post-second-line review',
      'Unknown phase cannot establish that a dose is needed, was given, failed, or may safely be repeated.',
      'Record the current episode stage and actual exposure. Current danger, glucose and the convulsive course remain independently urgent while the review point is clarified.',
      {tone: 'attention', source: nice, resourceGroup: 'seizure-evaluation'},
    ));
  }

  if (values.reviewPhase === 'after-benzodiazepine' && values.benzodiazepineExposure === 'none-confirmed') {
    actions.push(action(
      'seizure-reviewpoint-benzodiazepine-exposure-conflict',
      'reassess',
      'Post-benzodiazepine review conflicts with “no dose confirmed”',
      'Reconcile the review point and actual medication record before treating this as a response or a benzodiazepine-naive initial state.',
      'The conflict can reflect incomplete transfer documentation, a mislabeled phase or a treatment outside the available record. It does not prove treatment was missed and must not trigger an automatic dose repeat.',
      {tone: 'attention', source: nice, resourceGroup: 'seizure-benzodiazepine'},
    ));
  }

  if (values.convulsiveCourse === 'convulsions-stopped' && values.responseState === 'persistent-convulsions') {
    actions.push(action(
      'seizure-course-response-conflict',
      'reassess',
      'Current course and response conflict: convulsions stopped versus persistent convulsions',
      'Reassess the patient and time-stamp the current observation; do not claim either seizure control or refractory failure from conflicting entries.',
      'Clarify whether there was recurrent motor activity after the earlier stopped observation, a nonconvulsive concern, or a data-entry mismatch. Current ABC danger remains independently actionable.',
      {tone: 'attention', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
  }

  if (hasActiveConvulsions(values) && values.responseState === 'convulsions-stopped-awareness-returning') {
    actions.push(action(
      'seizure-active-course-response-conflict',
      'reassess',
      'Current active-convulsion entry conflicts with an improving response entry',
      'Use the current bedside observation and actual treatment time to resolve the conflict; an active seizure cannot be treated as recovered.',
      'This may represent a stale response selection after recurrence or a changed seizure course. Reassess ABC and glucose, then continue the appropriate urgent status route while the record is corrected.',
      {tone: 'urgent', source: acns, resourceGroup: 'seizure-refractory-eeg'},
    ));
  }
}

function entryFor(values) {
  if (values.currentDanger === 'present' || values.responseState === 'worsening-or-new-danger') {
    return Object.freeze({
      title: 'Immediate seizure-related danger is entered',
      summary: 'Emergency ABC stabilization and escalation take priority over treatment-phase labels or incomplete exposure data.',
      status: 'urgent',
      source: nice,
    });
  }
  if (hasStatusThreshold(values)) {
    return Object.freeze({
      title: 'Convulsive status-epilepticus treatment threshold is entered',
      summary: 'A convulsion lasting ≥5 minutes or recurrent seizures without recovery requires immediate emergency treatment and exposure reconciliation.',
      status: 'urgent',
      source: nice,
    });
  }
  if (values.convulsiveCourse === 'convulsions-stopped') {
    return Object.freeze({
      title: 'Visible convulsions are currently stopped',
      summary: 'Current motor cessation does not establish normal recovery, exclude nonconvulsive seizure/status, or authorize discharge.',
      status: 'not-met',
      source: acns,
    });
  }
  if (values.convulsiveCourse === 'active-under-5-minutes') {
    return Object.freeze({
      title: 'Active convulsion below the 5-minute status threshold so far',
      summary: 'Time the event, provide safety support, assess glucose/ABC danger, and escalate immediately if it reaches 5 minutes or recurs without recovery.',
      status: 'unknown',
      source: nice,
    });
  }
  return Object.freeze({
    title: 'Current seizure/status route is not yet established',
    summary: 'Unknown duration, recovery, danger, glucose or treatment exposure never establishes a resolved seizure or a safe treatment branch.',
    status: 'unknown',
    source: nice,
  });
}

function stageNotes(values) {
  return Object.freeze({
    recognize: hasStatusThreshold(values)
      ? 'The ≥5-minute or recurrent-without-recovery threshold is entered; treatment must not wait for a later phase clock.'
      : 'Establish actual duration, interval recovery and whether visible convulsions have stopped.',
    stabilize: values.currentDanger === 'absent-after-assessment' && values.bedsideGlucose !== 'unknown'
      ? 'Current danger and glucose are explicitly reviewed; reassess immediately if the course changes.'
      : 'ABC danger and bedside glucose remain incomplete or active; they override later phase labels.',
    'first-line': values.reviewPhase === 'initial-active-episode'
      ? 'Only a confirmed no-exposure initial episode can expose an initial benzodiazepine reference.'
      : 'Reconcile actual benzodiazepine exposure and time; do not re-open a stale initial loading card.',
    'second-line': values.benzodiazepineExposure === 'two-adequate-doses-confirmed'
      ? 'Persistent status after two adequate benzodiazepines needs an accountable second-line exposure/strategy review.'
      : 'Second-line eligibility is not established until actual adequate benzodiazepine exposure is reconciled.',
    reassess: values.reviewPhase === 'after-second-line-or-later'
      ? 'Completed exposure, response and nonconvulsive/refractory routes remain separate.'
      : 'Keep motor cessation, awareness, actual exposure and future escalation distinct.',
  });
}

export function evaluate(input = {}) {
  const values = normalizeSeizure(input);
  const actions = [];

  addRecognitionActions(actions, values);
  addStabilizationActions(actions, values);
  addInitialBenzodiazepineActions(actions, values);
  addBenzodiazepineResponseActions(actions, values);
  addSecondLineActions(actions, values);
  addResponseActions(actions, values);
  addReviewPointAndConflictActions(actions, values);

  actions.sort((left, right) => STAGE_RANK[left.stage] - STAGE_RANK[right.stage]);
  const visibleKeys = new Set(visibleFieldKeys(values));
  const gaps = SEIZURE_FIELDS
    .filter(item => visibleKeys.has(item.key) && values[item.key] === 'unknown')
    .map(item => item.label);

  return Object.freeze({
    values,
    entry: entryFor(values),
    actions: Object.freeze(actions),
    visibleStageIds: Object.freeze(STAGES
      .filter(stage => actions.some(item => item.stage === stage.id))
      .map(stage => stage.id)),
    stageNotes: stageNotes(values),
    gaps: Object.freeze(gaps),
    withheld: Object.freeze([
      'No chart read, order, product preparation, medication administration, airway procedure, ICU admission, EEG request, or patient-specific authorization is generated.',
      'Product identity, current stock, regimen alignment, monitoring setup and authorization require separate local confirmation.',
    ]),
  });
}

export const config = Object.freeze({
  id: 'status-epilepticus',
  title: 'Seizure / Status Epilepticus',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · focused adult seizure/status review',
  scope: 'Adult acute convulsive seizure/status recognition, immediate danger and glucose review, benzodiazepine/second-line exposure reconciliation, response, refractory-status and nonconvulsive-status routing. It is not an order set, medication-administration record, airway procedure, ICU/EEG request, diagnosis, or authorization.',
  fields: SEIZURE_FIELDS,
  visibleFieldKeys,
  evaluate,
  sources: SEIZURE_SOURCES,
  stages: STAGES,
  conflictActionIds: Object.freeze([
    'seizure-reviewpoint-benzodiazepine-exposure-conflict',
    'seizure-later-phase-second-line-not-started-conflict',
    'seizure-course-response-conflict',
    'seizure-active-course-response-conflict',
  ]),
  reviewLimitations: Object.freeze([
    'The guide is scoped to adult acute convulsive seizure/status review. It does not diagnose epilepsy, psychogenic events, aetiology, nonconvulsive status, post-ictal state or an individual medicine contraindication.',
    'All fields default to unknown. Missing seizure duration, recovery between events, ABC status, glucose, medication exposure, timing, completion or response never establishes a benign seizure, treatment failure, recovery, local availability or permission to repeat treatment.',
    'The first-line numeric references appear only in an explicitly initial active status episode after current danger is assessed absent, no worsening response or second-line activity is entered, and no benzodiazepine exposure is confirmed. IM midazolam also requires its explicit AES weight band. Response and later phases deliberately withhold these references to avoid a stale repeat dose.',
    'ESETT fosphenytoin mg-PE evidence is not converted into a phenytoin regimen. Product identity, current stock, infusion preparation, rate, monitoring and regimen authority remain separate checks.',
    'A routine awake EEG is not continuous EEG. Refractory status and persistent altered consciousness require accountable critical-care/neurology/EEG pathways.',
  ]),
  quickReference: Object.freeze({
    summary: 'Treat ≥5 minutes of convulsion or repeated seizures without recovery as status; stabilize ABC/glucose in parallel, reconcile real benzodiazepine exposure, then keep second-line response and EEG escalation separate.',
    recognition: Object.freeze([
      'NICE treats convulsive seizures lasting 5 minutes or more as status epilepticus requiring resuscitation and immediate emergency treatment.',
      'Repeated convulsions without recovery meet the status route even without a continuous visible seizure or a reliable duration estimate.',
      'Visible motor cessation does not establish normal recovery or exclude nonconvulsive seizure/status.',
    ]),
    redFlags: Object.freeze([
      'Airway, breathing or circulation compromise; trauma; rapidly worsening neurologic course; recurrent/persistent convulsions.',
      'Low glucose or a cause requiring parallel rescue, including eclampsia, withdrawal, toxin, infection, trauma/structural lesion or metabolic disturbance.',
      'Persistent convulsions after completed second-line treatment, or persistent altered consciousness after visible convulsions stop.',
    ]),
    steps: Object.freeze([
      Object.freeze({role: 'Recognize', text: 'At ≥5 minutes or recurrent seizures without recovery, use the status route immediately; record onset and interval recovery.'}),
      Object.freeze({role: 'Stabilize', text: 'Assess ABC danger and bedside glucose in parallel; hypoglycaemia rescue must not wait for thiamine, imaging or EEG.'}),
      Object.freeze({role: 'First-line', text: 'Count actual pre-hospital and in-hospital benzodiazepines. Never repeat an initial card after an entered exposure or response phase.'}),
      Object.freeze({role: 'Second-line', text: 'After two adequate benzodiazepine doses and persistent convulsive status, reconcile second-line eligibility, safety and actual completion.'}),
      Object.freeze({role: 'Reassess', text: 'Persistent convulsions after completed second-line treatment need critical-care/continuous-EEG escalation; persistent altered consciousness needs nonconvulsive-status assessment.'}),
    ]),
    monitoring: Object.freeze([
      'Use continuous cardiorespiratory observation and repeat consciousness/ABC assessment while the episode evolves; record each actual medicine, dose, route and time separately.',
      'ACNS recommends continuous EEG for persistent abnormal mental status after convulsive seizures/status and for monitoring refractory-status therapy.',
      'An order record, selected strategy, timer, infusion order or routine awake EEG does not prove medication completion, seizure control or continuous-EEG availability.',
    ]),
    sources: SEIZURE_SOURCES,
  }),
});

export default config;
