// Compact, source-reviewed decision support for adult sepsis and septic shock.
// It emits review and escalation actions only. Rendering, product links,
// institutional authority, and all clinical-system behavior live elsewhere.

export const SSC_2026_SOURCE = 'https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026';
export const SSC_2026_QUICK_GUIDE = 'https://sccm.org/SCCM/media/SCCM/PDFs/SSC-Adult-Quick-Guide-Infographic-2026.pdf';
export const SEPSIS_3_SOURCE = 'https://jamanetwork.com/journals/jama/fullarticle/2492881';

const ssc2026 = {
  label: 'Surviving Sepsis Campaign adult guideline (2026 final)',
  url: SSC_2026_SOURCE,
};
const ssc2026QuickGuide = {
  label: 'Surviving Sepsis Campaign adult quick guide (2026)',
  url: SSC_2026_QUICK_GUIDE,
};
const sepsis3 = {
  label: 'Sepsis-3 adult consensus definitions (2016)',
  url: SEPSIS_3_SOURCE,
};

const fields = [
  {
    key: 'ageBand', label: 'Adult age group?',
    options: [['unknown', 'Unknown / not reviewed'], ['under-65', '18–64 years'], ['65-or-older', '65 years or older']],
    help: 'SSC 2026 suggests an initial MAP of 60–65 mm Hg in septic shock at age 65 or older. The general initial target is 65 mm Hg. Confirm an individual target against perfusion and comorbidity; this is not the diagnostic blood-pressure threshold.',
  },
  {
    key: 'infectionLikelihood',
    label: 'Infectious cause likelihood?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['low', 'Low likelihood'],
      ['possible', 'Possible'],
      ['probable-or-definite', 'Probable / definite'],
    ],
    help: 'This is a current clinical judgement about an infectious cause, not a culture result. It must remain distinct from organ dysfunction and shock. SSC 2026 asks for rapid assessment of infectious and noninfectious causes when sepsis is possible.',
  },
  {
    key: 'organDysfunction',
    label: 'Infection-linked organ dysfunction?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['present', 'Present'],
      ['unclear', 'Possible / attribution unclear'],
      ['not-observed', 'Not observed — assessed'],
    ],
    help: 'Sepsis-3 describes sepsis as life-threatening organ dysfunction caused by a dysregulated response to infection. In practice, confirm the acute change, plausible infection link, baseline and alternative causes; this form does not calculate SOFA or establish the diagnosis.',
  },
  {
    key: 'shockState',
    label: 'Shock / hypoperfusion now?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['life-threatening', 'Life-threatening shock / hypoperfusion'],
      ['possible', 'Possible shock / hypoperfusion'],
      ['not-observed', 'Not observed — assessed'],
    ],
    help: 'Use the life-threatening choice for a clinician-recognized emergency physiology. It is deliberately separate from infection likelihood: shock remains urgent while infectious and noninfectious causes are reconciled. The form does not diagnose septic shock from one observation or calculate a score.',
  },
  {
    key: 'resuscitationPhase',
    label: 'Resuscitation phase?',
    options: [
      ['unknown', 'Unknown / current treatment unclear'],
      ['initial-not-started', 'Initial resuscitation not started'],
      ['initial-in-progress', 'Initial resuscitation in progress'],
      ['post-initial-reassessment', 'Post-initial reassessment'],
    ],
    help: 'Choose the current treatment phase, not the initial presentation. In progress or post-initial means that current fluids, vasopressors, timing and response must be reconciled before another initial-bolus recommendation is shown.',
  },
  {
    key: 'culturesLactate',
    label: 'Cultures / lactate status?',
    options: [
      ['unknown', 'Unknown / not reconciled'],
      ['neither', 'Neither obtained'],
      ['cultures-only', 'Cultures obtained; lactate pending'],
      ['lactate-only', 'Lactate obtained; cultures pending'],
      ['both', 'Both obtained / reviewed'],
    ],
    help: 'This records whether relevant blood cultures and an initial lactate have actually been obtained or reviewed. Unknown is not a negative culture, normal lactate, or permission to delay time-critical treatment.',
  },
  {
    key: 'antimicrobialStatus',
    label: 'Antimicrobial status?',
    options: [
      ['unknown', 'Unknown / current therapy unclear'],
      ['not-started', 'Not given for this episode'],
      ['given', 'Given / timing and regimen reviewed'],
    ],
    help: 'Record whether a first antimicrobial dose has actually been given for this episode and whether its time and regimen were reviewed. Unknown is not a not-started state. A dose already given routes to timing, regimen and ongoing-indication review rather than a duplicate first-dose instruction.',
  },
  {
    key: 'fluidContext',
    label: 'Fluid overload / renal-cardiac risk',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['no-high-risk', 'No major risk identified — reviewed'],
      ['overload-or-renal-cardiac-risk', 'Overload / renal-cardiac risk'],
    ],
    help: 'Review pulmonary congestion, cardiac reserve, kidney trajectory, urine output, dialysis or other fluid-tolerance concern. This does not determine whether resuscitation is needed; it prevents a generic crystalloid link when the context has not been individualized.',
  },
  {
    key: 'perfusionResponse',
    label: 'Current perfusion response?',
    options: [
      ['unknown', 'Unknown / not reconciled'],
      ['not-yet-assessed', 'Not yet assessed after intervention'],
      ['improving', 'Improving / monitored'],
      ['persistent-or-worse', 'Persistent / worse hypoperfusion'],
    ],
    help: 'Use a documented response after the current intervention. Persistent or worse status requires reassessment of perfusion, source, fluid responsiveness and escalation; it does not automatically authorize another fluid bolus or make a lactate a volume target.',
  },
  {
    key: 'sourceControl',
    label: 'Anatomic source-control status?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['requires-control', 'Known target requires control'],
      ['no-target-identified', 'No target identified after review'],
      ['completed-or-not-required', 'Completed / not required — reviewed'],
    ],
    help: 'Source control means a reviewed anatomic target that requires a procedure, removal, drainage, debridement or other intervention. “No target identified” is not proof that infection is absent; keep investigating when the clinical context requires it.',
  },
  {
    key: 'microbiologyStatus', label: 'Microbiology result review?',
    options: [['unknown', 'Unknown / not reconciled'], ['pending', 'Results pending'], ['identified', 'Pathogen and susceptibilities available'], ['final-negative', 'Final cultures: no pathogen identified']],
    help: 'Obtaining cultures is different from reviewing final results. Pending or missing results never count as negative. Review source, response and sampling limitations before narrowing or stopping therapy.',
  },
  {
    key: 'septicShockCourse', label: 'Clinician-reviewed septic-shock course?',
    options: [['unknown', 'Unknown / not reconciled'], ['not-established', 'Septic shock not established'], ['acute', 'Septic shock: acute resuscitation'], ['past-acute', 'Septic shock: acute resuscitation completed']],
    help: 'Confirm septic shock clinically, separately from possible infection with hypoperfusion. Acute resuscitation continues while vasopressors are escalating or remain high, or further volume expansion is needed. “Completed” requires these needs to have resolved; an improving lactate alone is insufficient.',
  },
];

const stages = [
  {id: 'entry', title: 'Confirm entry & urgency', empty: 'Establish infection likelihood, acute organ dysfunction and shock status.'},
  {id: 'diagnostics', title: 'Cultures, lactate & source', empty: 'No sepsis-specific culture or lactate action follows the entered context.'},
  {id: 'antimicrobials', title: 'Set antimicrobial timing', empty: 'Antimicrobial timing needs an infectious and shock assessment.'},
  {id: 'resuscitation', title: 'Resuscitate & avoid repeat boluses', empty: 'No sepsis-induced hypoperfusion or septic-shock resuscitation branch is entered.'},
  {id: 'reassess', title: 'Reassess response & source control', empty: 'Set the next clinical reassessment from the active trajectory.'},
];

const validValues = Object.fromEntries(fields.map(field => [
  field.key,
  new Set(field.options.map(([value]) => value)),
]));
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function normalized(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, {
  source = ssc2026,
  tone,
  resourceGroup,
  related,
} = {}) {
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...(tone ? {tone} : {}),
    ...(resourceGroup ? {resourceGroup} : {}),
    ...(related ? {related} : {}),
  };
}

const infectiousConcern = values => ['possible', 'probable-or-definite'].includes(values.infectionLikelihood);
const shockConcern = values => ['life-threatening', 'possible'].includes(values.shockState);
const probableSepsis = values => values.infectionLikelihood === 'probable-or-definite'
  && values.organDysfunction === 'present';
const possibleSepsisWithoutShock = values => infectiousConcern(values)
  && ['present', 'unclear'].includes(values.organDysfunction)
  && values.shockState === 'not-observed';
const sepsisConcern = values => probableSepsis(values)
  || possibleSepsisWithoutShock(values)
  || (infectiousConcern(values) && shockConcern(values));
const lactateAvailable = values => ['lactate-only', 'both'].includes(values.culturesLactate);

function addEntryActions(actions, values) {
  switch (values.infectionLikelihood) {
    case 'unknown':
      actions.push(action(
        'assess-infectious-versus-noninfectious-cause',
        'entry',
        'Assess infectious versus noninfectious causes',
        'Unknown infectious likelihood does not establish a sepsis treatment branch.',
        'SSC 2026 treats sepsis as a clinical diagnosis and asks clinicians to assess infectious and noninfectious causes of acute illness when sepsis is possible. Obtain the clinical history, examination, trend and focused tests needed for the presentation; do not convert missing evidence into a low likelihood of infection.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    case 'low':
      actions.push(action(
        'low-infectious-likelihood-needs-monitoring',
        'entry',
        'Low infectious likelihood does not establish sepsis',
        'Continue clinical monitoring and reassess if the trajectory changes.',
        'SSC 2026 permits deferring antimicrobials only when infection likelihood is low and shock is absent. This assessed likelihood does not explain organ dysfunction or shock, and it must not end evaluation for alternative acute causes.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'possible':
      actions.push(action(
        'possible-infectious-cause-needs-rapid-assessment',
        'entry',
        'Rapidly assess a possible infectious cause',
        'Keep infectious and noninfectious mimics in view.',
        'For possible sepsis without shock, SSC 2026 calls for a time-limited rapid investigation while the likelihood of infection is clarified. This entry alone does not choose an antimicrobial, dose, route, or source-specific regimen.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    default:
      actions.push(action(
        'probable-or-definite-infectious-cause-entered',
        'entry',
        'Probable or definite infectious cause entered',
        'Confirm acute organ dysfunction, shock and source in parallel.',
        'An infectious likelihood is only one part of the assessment. Sepsis-3 links sepsis to life-threatening organ dysfunction caused by infection, and SSC 2026 treats treatment and resuscitation as time-critical once sepsis or septic shock is clinically recognized.',
        {resourceGroup: 'workup', source: sepsis3},
      ));
  }

  switch (values.organDysfunction) {
    case 'unknown':
      actions.push(action(
        'assess-acute-organ-dysfunction',
        'entry',
        'Assess acute organ dysfunction and alternative causes',
        'Unknown is not an absent organ-dysfunction screen.',
        'Review the acute trajectory, baseline, perfusion, respiratory support, mental status, kidney/liver/platelet changes and other relevant findings. qSOFA is not a diagnostic gate: SSC 2026 recommends NEWS/NEWS2/MEWS or SIRS over qSOFA as a single in-hospital sepsis screen, and says sepsis is a clinical diagnosis.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'present':
      actions.push(action(
        'infection-related-organ-dysfunction-urgent-review',
        'entry',
        'Urgently review infection-related organ dysfunction',
        'Confirm the acute change, infection link and competing causes.',
        'Sepsis-3 defines sepsis as life-threatening organ dysfunction caused by a dysregulated host response to infection; acute SOFA increase of 2 or more is its clinical operationalization. This guide does not calculate SOFA or use qSOFA to rule in or rule out sepsis. If infection is probable/definite, this combination needs immediate clinician-led sepsis assessment.',
        {tone: values.infectionLikelihood === 'probable-or-definite' ? 'urgent' : 'attention', resourceGroup: 'monitoring', source: sepsis3},
      ));
      break;
    case 'unclear':
      actions.push(action(
        'clarify-organ-dysfunction-attribution',
        'entry',
        'Clarify whether organ dysfunction is acute and infection-related',
        'Do not label sepsis from an un-attributed abnormality.',
        'Compare with the documented baseline and investigate perfusion, medication, cardiac, respiratory, metabolic, obstructive and other causes in parallel. An incomplete attribution does not establish a negative sepsis assessment or authorize a routine treatment regimen.',
        {tone: 'attention', resourceGroup: 'monitoring', source: sepsis3},
      ));
      break;
    default:
      actions.push(action(
        'no-organ-dysfunction-entered',
        'entry',
        'No infection-related organ dysfunction is entered',
        'This does not exclude infection, deterioration or future sepsis.',
        'The assessed absence of infection-related organ dysfunction does not turn the current presentation into a safe disposition. Continue surveillance, source assessment and immediate alternative emergency pathways as indicated.',
        {resourceGroup: 'monitoring', source: sepsis3},
      ));
  }

  switch (values.shockState) {
    case 'life-threatening':
      actions.push(action(
        'urgent-life-threatening-shock-hypoperfusion',
        'entry',
        'Escalate life-threatening shock / hypoperfusion now',
        'Resuscitation and cause assessment run in parallel.',
        'Life-threatening hypoperfusion is urgent whether infection is established, possible or still unconfirmed. Begin clinician-led emergency assessment and resuscitation while distinguishing septic, cardiogenic, hypovolaemic, obstructive and other causes. Do not wait for a score, culture result or completed form; this entry does not itself prove septic shock.',
        {tone: 'urgent', resourceGroup: 'monitoring', source: ssc2026QuickGuide},
      ));
      break;
    case 'possible':
      actions.push(action(
        'urgent-possible-shock-hypoperfusion-review',
        'entry',
        'Urgently clarify possible shock / hypoperfusion',
        'A possible emergency cannot be treated as an assessed absence.',
        'Recheck blood pressure, perfusion, mentation, oxygenation, urine output, trajectory and likely causes with senior escalation appropriate to risk. The form withholds a sepsis crystalloid or vasopressor link until infection, shock severity, treatment phase and fluid tolerance have been reconciled.',
        {tone: 'urgent', resourceGroup: 'monitoring', source: ssc2026QuickGuide},
      ));
      break;
    case 'unknown':
      actions.push(action(
        'assess-current-shock-and-hypoperfusion',
        'entry',
        'Assess current shock and hypoperfusion',
        'Unknown shock status does not select a no-shock antibiotic or fluid branch.',
        'Establish current haemodynamics and end-organ perfusion while reviewing the cause. SSC 2026 says sepsis and septic shock are medical emergencies, but this compact form does not infer a septic-shock state from missing blood pressure, perfusion or response data.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addDiagnosticActions(actions, values) {
  if (values.culturesLactate === 'unknown') {
    if (sepsisConcern(values)) {
      actions.push(action(
        'reconcile-cultures-and-lactate-status',
        'diagnostics',
        'Reconcile cultures and lactate status',
        'Unknown is not a negative culture or a normal lactate.',
        'For possible, probable or definite sepsis or septic shock, SSC 2026 recommends blood cultures as soon as possible, ideally before antimicrobials, and suggests measuring lactate. Establish what was actually collected and at what time; do not let this verification delay emergency treatment.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    } else {
      actions.push(action(
        'do-not-infer-sepsis-culture-lactate-panel',
        'diagnostics',
        'Do not infer a sepsis culture/lactate panel',
        'The entered findings have not established a sepsis concern.',
        'Probable infection alone, without infection-related organ dysfunction or shock, does not activate the SSC sepsis culture/lactate branch in this compact form. Use source-specific ordinary-infection assessment where indicated, and re-enter this guide if organ dysfunction or shock concern emerges.',
      ));
    }
    return;
  }

  if (!sepsisConcern(values)) return;

  if (['neither', 'lactate-only'].includes(values.culturesLactate)) {
    actions.push(action(
      'collect-blood-cultures-as-soon-as-possible',
      'diagnostics',
      'Collect blood cultures as soon as possible',
      'Ideally before antimicrobials; do not create a treatment delay.',
      'SSC 2026 strongly recommends blood cultures as soon as possible and ideally before antimicrobial administration for possible, probable or definite sepsis or septic shock. Use the clinically appropriate local collection process and record the actual collection time; this engine does not select specimen sites, bottles, volumes or an antimicrobial product.',
      {resourceGroup: 'cultures'},
    ));
  }

  if (['neither', 'cultures-only'].includes(values.culturesLactate)) {
    actions.push(action(
      'measure-initial-lactate',
      'diagnostics',
      'Measure an initial lactate',
      'Interpret it with the full clinical perfusion assessment.',
      'SSC 2026 suggests measuring blood lactate for possible, probable or definite sepsis or septic shock. A lactate does not diagnose sepsis alone, establish the cause of shock, or create a target for unbounded fluid administration.',
      {resourceGroup: 'monitoring'},
    ));
  }

  if (values.culturesLactate === 'both') {
    actions.push(action(
      'review-culture-lactate-times-and-context',
      'diagnostics',
      'Review culture and lactate timing in context',
      'Obtained does not mean reviewed, normal or diagnostic.',
      'Record the actual sampling times, antimicrobial timing, current result, source clues and trajectory. Cultures and lactate support clinical assessment but cannot rule sepsis in or out by themselves.',
      {resourceGroup: 'monitoring'},
    ));
  }
}

function addImmediateAntimicrobialAction(actions, values, reason) {
  if (values.antimicrobialStatus === 'given') {
    actions.push(action(
      'review-immediate-antimicrobial-timing-after-administration',
      'antimicrobials',
      'Review given antimicrobials; do not duplicate the first dose',
      'Record the actual administration time against the 1-hour recommendation.',
      `${reason} SSC 2026 recommends immediate antimicrobial therapy, ideally within 1 hour. A first dose is already recorded, so reconcile the actual time, source/site, allergy, prior microbiology, organ function, local susceptibility and stewardship plan. Do not generate a duplicate first dose, product, spectrum, infusion or renal-adjusted regimen from this compact form.`,
      {tone: 'urgent'},
    ));
    return;
  }

  if (values.antimicrobialStatus === 'unknown') {
    actions.push(action(
      'reconcile-immediate-antimicrobial-status',
      'antimicrobials',
      'Reconcile antimicrobial status now',
      'If not yet given, clinician-selected therapy is immediate, ideally within 1 hour.',
      `${reason} SSC 2026 recommends immediate antimicrobial therapy, ideally within 1 hour. Establish whether a first dose has already been given while source/site, allergy, prior microbiology, organ function, current local susceptibility and stewardship review determine the regimen. Collect cultures as soon as possible when feasible, but do not delay therapy or create a duplicate dose from an unknown status.`,
      {tone: 'urgent'},
    ));
    return;
  }

  actions.push(action(
    'immediate-source-site-local-antimicrobial-review',
    'antimicrobials',
    'Administer clinician-selected antimicrobials immediately',
    'Ideally within 1 hour of recognition.',
    `${reason} SSC 2026 recommends immediate antimicrobial therapy, ideally within 1 hour. Collect cultures as soon as possible when feasible, but do not delay therapy. This compact guide intentionally selects no antibiotic product, loading dose, infusion, spectrum or renal adjustment: source/site, allergy, prior microbiology, organ function, current local susceptibility and stewardship review must determine the regimen.`,
    {tone: 'urgent'},
  ));
}

function addThreeHourAntimicrobialAction(actions, values) {
  if (values.antimicrobialStatus === 'given') {
    actions.push(action(
      'review-three-hour-antimicrobial-timing-after-administration',
      'antimicrobials',
      'Review given antimicrobials against the 3-hour decision',
      'A first dose is recorded; do not duplicate it from this form.',
      'For possible sepsis without shock, SSC 2026 suggests a time-limited rapid investigation and therapy within 3 hours from first suspicion if concern for infection persists. Reconcile the actual administration time, source/site, allergy, organ function, prior microbiology, local susceptibility and stewardship plan; continue evaluating infectious and noninfectious causes.',
      {tone: 'attention'},
    ));
    return;
  }

  if (values.antimicrobialStatus === 'unknown') {
    actions.push(action(
      'reconcile-three-hour-antimicrobial-status',
      'antimicrobials',
      'Reconcile antimicrobial status during rapid investigation',
      'If not given and infection concern persists, decide within 3 hours.',
      'For possible sepsis without shock, SSC 2026 uses a time-limited rapid investigation and a 3-hour decision if infection concern persists. Establish whether therapy has already been given before adding a dose; source/site, allergy, organ function, prior microbiology, local susceptibility and stewardship review determine any regimen.',
      {tone: 'attention'},
    ));
    return;
  }

  actions.push(action(
    'rapid-investigation-and-three-hour-antimicrobial-decision',
    'antimicrobials',
    'Complete rapid investigation; decide antimicrobials within 3 hours',
    'If infection concern persists, administer within 3 hours of first suspicion.',
    'For possible sepsis without shock, SSC 2026 suggests a time-limited rapid investigation and antimicrobial therapy within 3 hours from first suspicion if concern for infection persists. Assess infectious and noninfectious causes concurrently. The decision still requires source/site, allergy, organ-function, prior-microbiology and local-stewardship review; no default product or dose is exposed here.',
    {tone: 'attention'},
  ));
}

function addAntimicrobialActions(actions, values) {
  if (infectiousConcern(values) && shockConcern(values)) {
    addImmediateAntimicrobialAction(actions, values, 'For possible, probable or definite septic shock,');
    return;
  }

  if (probableSepsis(values)) {
    addImmediateAntimicrobialAction(actions, values, 'For probable or definite sepsis,');
    return;
  }

  if (possibleSepsisWithoutShock(values)) {
    addThreeHourAntimicrobialAction(actions, values);
    return;
  }

  if (values.infectionLikelihood === 'low' && values.shockState === 'not-observed') {
    if (values.antimicrobialStatus === 'given') {
      actions.push(action(
        'review-given-antimicrobial-indication-with-low-likelihood-no-shock',
        'antimicrobials',
        'Review the indication for antimicrobials already given',
        'Low likelihood with shock assessed absent does not justify a duplicate dose.',
        'SSC 2026 suggests deferring antimicrobials only when infection likelihood is low and shock is absent. Because a first dose is recorded, reconcile the original indication, source findings, alternative diagnoses and ongoing stewardship decision; do not use this compact form to automatically stop, continue or repeat a regimen.',
      ));
    } else {
      actions.push(action(
        'defer-antimicrobials-with-low-likelihood-no-shock',
        'antimicrobials',
        'Defer antimicrobials while closely monitoring',
        'This applies only to low infection likelihood with shock assessed absent.',
        'SSC 2026 suggests deferring antimicrobials when infection likelihood is low and shock is absent, while closely monitoring the patient. Re-enter this assessment if infection likelihood, organ dysfunction or perfusion changes; this is not an instruction to ignore another acute diagnosis.',
      ));
    }
    return;
  }

  if (infectiousConcern(values)
    && values.organDysfunction === 'not-observed'
    && values.shockState === 'not-observed') {
    if (values.antimicrobialStatus === 'given') {
      actions.push(action(
        'review-given-antimicrobials-for-infection-without-sepsis-criteria',
        'antimicrobials',
        'Review given antimicrobials for infection without sepsis criteria',
        'Organ dysfunction and shock are assessed absent; do not duplicate a dose.',
        'The entered findings support infection assessment but do not establish the sepsis or septic-shock timing category. Reconcile source/site, cultures when clinically indicated, allergy, organ function, prior microbiology, local susceptibility and stewardship ownership; this compact guide does not stop, continue, repeat or select an ordinary-infection regimen.',
      ));
    } else {
      actions.push(action(
        'source-directed-infection-treatment-review-without-sepsis-timing',
        'antimicrobials',
        'Review source-directed infection treatment without sepsis timing',
        'Organ dysfunction and shock are assessed absent.',
        'The entered findings support infection assessment but do not establish the SSC sepsis or septic-shock timing category. Use the source/site-specific local infection pathway and stewardship review to decide whether treatment is indicated. This compact guide does not select a product, dose, spectrum, infusion or renal adjustment; re-enter the sepsis pathway if organ dysfunction or shock concern emerges.',
      ));
    }
    return;
  }

  if (values.antimicrobialStatus === 'given') {
    actions.push(action(
      'review-given-antimicrobial-status-with-incomplete-sepsis-assessment',
      'antimicrobials',
      'Review given antimicrobials while sepsis assessment is incomplete',
      'Do not duplicate a first dose from an unresolved assessment.',
      'The source-specific timing branch is not established by the entered findings. Reconcile the administration time, source/site, indication, allergy, prior microbiology, organ function and stewardship ownership while completing the shock and organ-dysfunction assessment. Urgent shock care remains independent.',
      {tone: values.shockState === 'life-threatening' ? 'urgent' : 'attention'},
    ));
    return;
  }

  if (values.infectionLikelihood === 'unknown') {
    actions.push(action(
      'no-antimicrobial-timing-from-unknown-infectious-likelihood',
      'antimicrobials',
      'Do not infer antimicrobial timing from unknown likelihood',
      'Urgent shock care remains independent of this uncertainty.',
      'The 1-hour, 3-hour and defer branches require a clinical infectious/sepsis assessment. Establish likelihood and shock status promptly; this form neither creates a default antibiotic regimen nor uses the incomplete entry to delay clinician-led treatment of a life-threatening presentation.',
      {tone: values.shockState === 'life-threatening' ? 'urgent' : 'attention'},
    ));
    return;
  }

  if (values.infectionLikelihood === 'possible' && values.shockState === 'unknown') {
    actions.push(action(
      'resolve-shock-status-before-possible-sepsis-timing',
      'antimicrobials',
      'Resolve shock status before applying a possible-sepsis time branch',
      'An unknown shock assessment is neither a 3-hour nor a defer branch.',
      'Rapidly establish whether shock is present while completing the infectious assessment. SSC 2026 uses immediate therapy for possible septic shock and a time-limited investigation for possible sepsis without shock; the missing distinction is deliberately kept visible rather than guessed.',
      {tone: 'attention'},
    ));
    return;
  }

  actions.push(action(
    'complete-sepsis-assessment-before-nonshock-antimicrobial-timing',
    'antimicrobials',
    'Complete the sepsis assessment before a non-shock timing branch',
    'The entered findings do not establish the source-specific timing category.',
    'Clarify acute organ dysfunction, shock and infectious likelihood. A low likelihood with shock unassessed is not the SSC defer branch, and possible or probable infection without established infection-related organ dysfunction is not automatically converted into a fixed antimicrobial regimen by this compact form.',
    {tone: values.shockState === 'possible' ? 'urgent' : 'attention'},
  ));
}

function addVasopressorAction(actions, values) {
  actions.push(action(
    'time-sensitive-vasopressor-capable-resuscitation',
    'resuscitation',
    'Use vasopressor-capable resuscitation without access delay',
    values.ageBand === '65-or-older'
      ? 'Age ≥65: consider an initial MAP of 60–65 mm Hg, individualized to perfusion.'
      : values.ageBand === 'under-65'
        ? 'Initial MAP target: 65 mm Hg; individualize ongoing treatment to perfusion.'
        : 'Confirm age and MAP target: generally 65 mm Hg; consider 60–65 at age ≥65.',
    'Unstable septic shock may require crystalloid and vasopressors together. Norepinephrine is first line; peripheral initiation can avoid a central-access delay. The lower initial MAP range for age ≥65 is conditional, with low-certainty evidence. Confirm the target and clinical response; no duration, line size, site, concentration, pump setting or dose is selected here. With escalating norepinephrine, consider adding vasopressin; if MAP remains inadequate despite both, consider epinephrine. Concomitant cardiac dysfunction warrants individual review: norepinephrine or epinephrine may be used first line. The linked local group is for source review only.',
    {tone: 'urgent', resourceGroup: 'vasopressor'},
  ));
}

function addResuscitationActions(actions, values) {
  if (values.shockState === 'life-threatening' && !infectiousConcern(values)) {
    actions.push(action(
      'urgent-shock-resuscitation-while-infectious-cause-is-unresolved',
      'resuscitation',
      'Resuscitate shock while infectious cause is unresolved',
      'Do not wait for a sepsis label to treat life-threatening physiology.',
      'Use the active clinician-led emergency/shock process while determining infectious and noninfectious causes. The SSC sepsis crystalloid and vasopressor resource branches are intentionally withheld here because this form has not established a possible or probable infectious septic-shock context.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.shockState === 'possible') {
    actions.push(action(
      'clarify-possible-shock-before-sepsis-fluid-or-pressor-link',
      'resuscitation',
      'Clarify possible shock before a sepsis fluid or pressor link',
      'Possible shock is urgent, but not a completed volume or drug assessment.',
      'Reconcile haemodynamics, end-organ perfusion, likely cause, current treatment phase and fluid tolerance with urgent senior review. This guide withholds a generic crystalloid or vasopressor resource link until the shock state is clinically established; do not wait to treat a deteriorating patient through the applicable emergency process.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.shockState === 'unknown') {
    if (infectiousConcern(values) || values.organDysfunction === 'present') {
      actions.push(action(
        'establish-perfusion-before-sepsis-resuscitation-link',
        'resuscitation',
        'Establish perfusion before a sepsis resuscitation link',
        'Unknown shock status does not authorize a default crystalloid or pressor action.',
        'Assess current blood pressure, peripheral perfusion, mentation, oxygenation, urine output, lactate context and trajectory. If clinical shock is recognized, begin emergency resuscitation without waiting for the form; re-enter the current state so the source-specific branch can remain reviewable.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return;
  }

  if (values.shockState === 'not-observed') {
    if (values.resuscitationPhase === 'post-initial-reassessment'
      && values.perfusionResponse === 'improving') {
      actions.push(action(
        'continue-post-initial-recovery-surveillance',
        'resuscitation',
        'Continue post-initial recovery surveillance',
        'Improving perfusion with shock assessed absent does not need a repeat bolus.',
        'A post-initial improving response can be an expected recovery state. Continue to record the current trajectory, fluid balance, lungs, organ function, source and treatment review; this compact branch exposes neither a septic-shock crystalloid nor a vasopressor resource link.',
        {resourceGroup: 'monitoring'},
      ));
    } else if (values.resuscitationPhase === 'post-initial-reassessment'
      && values.perfusionResponse === 'persistent-or-worse') {
      actions.push(action(
        'urgent-reconcile-persistent-hypoperfusion-with-no-shock-observed',
        'resuscitation',
        'Urgently reconcile persistent hypoperfusion with shock assessed absent',
        'Persistent or worse perfusion conflicts with the current no-shock entry.',
        'Reassess blood pressure, perfusion, mentation, oxygenation, urine output, current treatments and alternative causes with urgent senior support. Do not treat the no-shock choice as a safe conclusion and do not expose a default septic-shock crystalloid or vasopressor regimen until the conflict is resolved.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else if (values.resuscitationPhase !== 'unknown') {
      actions.push(action(
        'reconcile-resuscitation-phase-with-no-shock-observed',
        'resuscitation',
        'Reconcile resuscitation phase with shock assessed absent',
        'Do not carry an initial septic-shock bolus or pressor link forward.',
        'The current no-shock assessment conflicts with an entered initial or unassessed post-initial treatment phase. Verify the active treatment, actual indication, response and alternative diagnosis; this compact branch exposes neither a crystalloid nor a vasopressor resource link.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return;
  }

  // From here, life-threatening shock and an infectious concern are both entered.
  switch (values.resuscitationPhase) {
    case 'unknown':
      actions.push(action(
        'reconcile-current-resuscitation-before-new-sepsis-link',
        'resuscitation',
        'Reconcile current resuscitation before a new sepsis link',
        'Unknown treatment phase is not an untreated state.',
        'Establish fluids already given, timing, weight basis, vasopressors, access, blood pressure/perfusion response and overload risk before adding a new initial plan. Life-threatening shock still needs immediate clinician-led action; this review guard prevents accidental duplication of a bolus.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      addVasopressorAction(actions, values);
      break;
    case 'initial-not-started':
      if (values.fluidContext === 'no-high-risk') {
        actions.push(action(
          'initial-sepsis-crystalloid-with-frequent-reassessment',
          'resuscitation',
          'Begin clinician-directed initial crystalloid resuscitation',
          'At least 30 mL/kg IV crystalloid in the first 3 hours; individualize and reassess.',
          'For sepsis-induced hypoperfusion or septic shock, SSC 2026 suggests at least 30 mL/kg IV crystalloid in the first 3 hours. It also requires consideration of individual characteristics and frequent reassessment to avoid under- or over-resuscitation. This link is not a bag, rate, weight calculation, order or permission to ignore evolving congestion; balanced crystalloid is generally preferred, but use 0.9% saline with traumatic brain injury. Review actual body weight; adjusted or ideal weight may be used when BMI exceeds 30 kg/m².',
          {tone: 'urgent', resourceGroup: 'isotonic-fluid'},
        ));
      } else if (values.fluidContext === 'overload-or-renal-cardiac-risk') {
        actions.push(action(
          'individualize-initial-fluid-for-overload-or-renal-cardiac-risk',
          'resuscitation',
          'Individualize initial fluid for overload or renal-cardiac risk',
          'High-risk context withholds a generic crystalloid product link.',
          'SSC 2026 directs frequent reassessment and individual consideration when selecting initial fluid volume. Reconcile congestion, cardiac reserve, kidney trajectory, urine output, current replacement therapy and dynamic response with the responsible senior/critical-care team. This branch does not turn risk into a decision to withhold resuscitation, nor does it select a fluid, amount, rate or diuretic.',
          {tone: 'urgent', resourceGroup: 'monitoring'},
        ));
      } else {
        actions.push(action(
          'assess-fluid-tolerance-before-initial-sepsis-crystalloid-link',
          'resuscitation',
          'Assess fluid tolerance before an initial crystalloid link',
          'Unknown overload or renal-cardiac context is not low risk.',
          'Clarify pulmonary congestion, cardiac reserve, kidney trajectory, urine output, dialysis status and current fluid exposure while emergency resuscitation proceeds. SSC 2026 requires individual context and frequent reassessment; this compact form therefore withholds a generic crystalloid product link until the risk context is reviewed.',
          {tone: 'urgent', resourceGroup: 'monitoring'},
        ));
      }
      addVasopressorAction(actions, values);
      break;
    case 'initial-in-progress':
      actions.push(action(
        'reassess-active-initial-resuscitation-without-duplicate-bolus',
        'resuscitation',
        'Reassess active initial resuscitation without a duplicate bolus',
        'Document current volume, timing, response and fluid tolerance.',
        'Initial treatment is already in progress. Continue urgent clinician-led reassessment of haemodynamics, perfusion, lungs, fluid balance and response; do not expose a second initial-crystalloid action from this state. SSC 2026 directs frequent reassessment to avoid under- and over-resuscitation.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      addVasopressorAction(actions, values);
      break;
    default:
      if (values.perfusionResponse === 'persistent-or-worse') {
        actions.push(action(
          'dynamic-response-review-before-additional-fluid',
          'resuscitation',
          'Use dynamic response review before additional fluid',
          'Persistent hypoperfusion does not authorize a routine repeat bolus.',
          'After 30 mL/kg with persistent hypoperfusion, either a liberal or restrictive fluid strategy may be used according to response, comorbidities and monitoring resources (conditional, low certainty). Confirm the volume actually received. SSC 2026 suggests dynamic measures over examination or static measures alone, including passive leg raise or a fluid-bolus response measured with stroke volume or pulse-pressure variation. Individualize any additional fluid from the documented response and fluid tolerance, rather than continuing fluid until lactate normalization is achieved.',
          {tone: 'urgent', resourceGroup: 'monitoring'},
        ));
        addVasopressorAction(actions, values);
      } else if (values.perfusionResponse === 'improving') {
        actions.push(action(
          'continue-response-monitoring-without-repeat-initial-bolus',
          'resuscitation',
          'Continue response monitoring without a repeat initial bolus',
          'Improving perfusion still needs documented reassessment.',
          'Do not carry the initial 30 mL/kg statement forward as a repeated-bolus instruction. Continue to trend perfusion, fluid balance, lungs and the response to active therapy; further fluid, vasopressor and de-escalation decisions require the current clinical context.',
          {resourceGroup: 'monitoring'},
        ));
      } else {
        actions.push(action(
          'assess-post-initial-perfusion-response-before-additional-fluid',
          'resuscitation',
          'Assess post-initial perfusion response before additional fluid',
          'Unknown response is not evidence of fluid responsiveness.',
          'Reconcile current blood pressure, perfusion, mentation, oxygenation, urine output, lungs, fluid balance, lactate context and dynamic response. SSC 2026 individualizes fluid after the initial bolus rather than continuing fluid until lactate normalization.',
          {tone: 'attention', resourceGroup: 'monitoring'},
        ));
        addVasopressorAction(actions, values);
      }
  }
}

function addReassessmentActions(actions, values) {
  if (sepsisConcern(values)) {
    actions.push(action(
      'set-frequent-vital-and-perfusion-reassessment',
      'reassess',
      'Set frequent vital and perfusion reassessment',
      'Track response, source and treatment timing rather than a single result.',
      'The SSC 2026 quick guide calls for immediate, ongoing, at least hourly monitoring of blood pressure, heart rate, respiratory rate and level of consciousness in adults with sepsis/septic shock. For shock or elevated lactate, trend the clinically relevant perfusion response; this engine does not infer a fixed lab schedule from a missing result.',
      {resourceGroup: 'monitoring', source: ssc2026QuickGuide},
    ));
  }

  if (sepsisConcern(values) && lactateAvailable(values) && (shockConcern(values) || values.perfusionResponse === 'persistent-or-worse')) {
    actions.push(action(
      'reassess-lactate-and-capillary-refill-in-context',
      'reassess',
      'Reassess lactate and capillary refill in context',
      'Do not use lactate normalization as a fluid endpoint.',
      'SSC 2026 suggests serial lactate for elevated lactate or septic shock and capillary refill as an adjunct to other perfusion measures. After the initial fluid bolus, fluid administration should be individualized from lactate decrement and the clinical response rather than continued until lactate normalizes.',
      {resourceGroup: 'monitoring'},
    ));
  }

  if (values.sourceControl === 'requires-control') {
    actions.push(action(
      'urgent-source-control-evaluation',
      'reassess',
      'Escalate the source-control target',
      'Early source control is ideally within 6 hours when required.',
      'SSC 2026 says to rapidly evaluate specific anatomic diagnoses or sources that require emergent source control and suggests early source control, ideally within 6 hours of diagnosis when it is required. This action does not choose a drainage, debridement, device-removal, imaging or operative plan; use the responsible procedural/service pathway.',
      {tone: 'urgent', resourceGroup: 'workup'},
    ));
  } else if (values.sourceControl === 'unknown' && infectiousConcern(values)) {
    actions.push(action(
      'assess-for-anatomic-source-control-target',
      'reassess',
      'Assess for an anatomic source-control target',
      'Unknown is not a completed source-control assessment.',
      'Rapidly determine whether a specific anatomic source requires a procedure, removal, drainage, debridement or other control. A source-control target changes escalation and timing, but this compact guide does not choose the investigation or procedure.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }
}

function addAntimicrobialStewardship(actions, values) {
  if (!sepsisConcern(values)) return;
  actions.push(action(
    'review-risk-directed-antimicrobial-spectrum', 'antimicrobials',
    'Review source and resistance risks before choosing coverage',
    'Empiric antifungals are generally discouraged; consider selected high-risk cases individually; add anaerobic coverage only for a relevant risk or other required spectrum.',
    'SSC 2026 suggests against empiric antifungals (low certainty); consider selected high-risk patients individually, including immunosuppression, prolonged antibiotics or hospitalization, and intra-abdominal infection. Anaerobic coverage is conditional (very low certainty): review intra-abdominal, deep gynecologic/obstetric, necrotizing soft-tissue, head/neck, CNS abscess or empyema sources. An agent with anaerobic activity may still be appropriate when needed for resistant pathogens and alternatives are insufficient. Assess organism-specific MDR risks, previous isolates and local susceptibility data. Unknown risks are not absent risks; this guide does not select a regimen.',
  ));
  actions.push(action(
    'review-beta-lactam-maintenance-infusion', 'antimicrobials',
    'If using a beta-lactam, review prolonged maintenance infusion',
    'Use prolonged maintenance infusion after the initial loading dose; reconcile doses already given.',
    'This is a strong SSC 2026 recommendation with moderate-certainty evidence. Pharmacy and the treating team must verify the chosen agent, administration record, loading and maintenance doses, renal function, stability, compatibility, access and infusion schedule. Do not repeat a loading dose already given or postpone a time-critical first dose to arrange maintenance delivery. Consider therapeutic drug monitoring in selected patients when available.',
  ));
  if (values.antimicrobialStatus !== 'given') return;
  const identified = values.microbiologyStatus === 'identified';
  const negative = values.microbiologyStatus === 'final-negative';
  actions.push(action(
    identified ? 'deescalate-with-pathogen-susceptibilities' : negative ? 'review-deescalation-with-final-negative-cultures' : 'reconcile-results-for-antimicrobial-deescalation',
    'reassess', 'Reassess antimicrobial need, spectrum and duration',
    identified ? 'De-escalate using the confirmed pathogen and susceptibility profile (strong recommendation).'
      : negative ? 'Review de-escalation despite final cultures identifying no pathogen (conditional recommendation).'
        : 'Reconcile pending or unknown results and response; do not label them culture-negative.',
    'Both de-escalation recommendations have very low-certainty evidence. Narrow coverage or stop unnecessary agents after reviewing source, susceptibility, clinical response and diagnostic limitations; a negative culture alone does not exclude infection. Stop empiric treatment if an alternative cause is demonstrated or strongly suspected. Prefer shorter courses after adequate source control. If the optimal duration remains unclear, procalcitonin plus clinical evaluation may support stopping; it must not be used to delay starting treatment. SSC suggests against using Candida biomarkers to guide starting or stopping empiric antifungals; selected high-risk cases may warrant individual review.',
  ));
}

function addShockAdjuncts(actions, values) {
  if (sepsisConcern(values) && values.shockState === 'life-threatening') {
    actions.push(action(
      'review-crystalloid-and-albumin-choice', 'resuscitation', 'Prefer crystalloids without routine supplemental albumin',
      'Balanced crystalloid is generally preferred; traumatic brain injury favors 0.9% saline.',
      'SSC 2026 conditionally favors crystalloids alone over adding albumin (moderate certainty). Large prior crystalloid exposure or cirrhosis may justify albumin individually; avoid albumin with traumatic brain injury. Starches are not recommended, and gelatin is discouraged.',
    ));
    actions.push(action(
      'select-blood-pressure-monitoring', 'resuscitation', 'Select blood-pressure monitoring for the current support needs',
      'An arterial line is selective; cuff or invasive monitoring can be appropriate.',
      'SSC 2026 allows either approach (conditional, very low certainty). Favor invasive monitoring when pressor doses are intermediate-to-high, escalating or multiple agents are required; when arterial samples are frequently needed; or when repeated cuff readings are inconsistent. Reassess monitoring reliability and access risk as treatment changes.',
      {resourceGroup: 'monitoring'},
    ));
  }
  const reviewedShock = ['acute', 'past-acute'].includes(values.septicShockCourse);
  if (!reviewedShock) return;
  // A clinician-confirmed septic-shock course owns this review. Current BP or
  // improving perfusion under treatment must not erase that diagnosis.
  actions.push(action(
    'review-iv-corticosteroids-for-septic-shock', 'resuscitation', 'Review IV corticosteroids for confirmed septic shock',
    values.septicShockCourse === 'past-acute'
      ? 'Review ongoing steroid need during recovery; do not infer a new start or automatic continuation.'
      : 'SSC 2026 suggests IV corticosteroids (conditional, low certainty).',
    'Review the indication, current steroid exposure, adverse effects and local regimen with the treating team. The recommendation does not mandate a cortisol result or a fixed norepinephrine dose/duration before eligibility. A treated blood pressure or improving perfusion does not erase confirmed septic shock. Older cortisol-before-hydrocortisone and pressor-threshold instructions must not be treated as SSC prerequisites. This branch does not prescribe a product, dose, start time or taper, and does not extend the recommendation to sepsis without shock.',
  ));
  const recoveryConflict = values.septicShockCourse === 'past-acute' && (
    ['initial-not-started', 'initial-in-progress'].includes(values.resuscitationPhase)
    || values.perfusionResponse === 'persistent-or-worse');
  if (recoveryConflict || !infectiousConcern(values)) {
    actions.push(action(
      'reconcile-septic-shock-course', 'entry', 'Reconcile septic-shock course with current findings',
      'Confirm the recorded diagnosis and whether acute resuscitation has actually ended.',
      'The entered infection likelihood, initial-treatment phase or deteriorating perfusion needs reconciliation with the clinician-reviewed course. Acute resuscitation includes escalating or ongoing high vasopressor doses or a continuing need for volume expansion. Resolve evidence of ongoing resuscitation before considering fluid removal; urgent bedside care must continue. The corticosteroid review is conditional on the confirmed septic-shock diagnosis, not a new diagnosis inferred from this form.',
      {tone: 'attention'},
    ));
  }
  if (values.septicShockCourse === 'past-acute' && !recoveryConflict) {
    actions.push(action(
      'review-active-fluid-removal-after-resuscitation', 'reassess', 'Review active fluid removal after acute resuscitation',
      'Consider removal only after confirming that high/escalating pressors and ongoing volume expansion are no longer needed.',
      'SSC 2026 suggests active fluid removal after the acute septic-shock phase (conditional, very low certainty). A stable low vasopressor dose does not automatically exclude review, and improving lactate alone does not establish readiness. Reconcile any unknown current findings and assess cardiorespiratory function, current pressor dose, course, edema, weight and fluid balance before deciding whether and how much to remove. Diuretics are an option; if insufficient, consider ultrafiltration or extracorporeal removal with specialist review. This is not an automatic diuretic or dialysis order. Sepsis-associated AKI alone, without a definitive indication, does not justify renal replacement therapy.',
    ));
  }
}

function stageNotes(values, actions) {
  const has = stage => actions.some(item => item.stage === stage);
  const notes = {};
  if (!has('diagnostics')) {
    notes.diagnostics = sepsisConcern(values)
      ? 'Cultures and lactate were entered as reviewed; keep their timing and results visible.'
      : 'No sepsis-specific culture or lactate action is inferred until organ dysfunction or shock establishes a sepsis concern.';
  }
  if (!has('resuscitation')) {
    notes.resuscitation = values.shockState === 'not-observed'
      ? 'Shock is assessed absent; do not carry a septic-shock fluid or pressor link forward.'
      : 'Establish the current shock and treatment state before a sepsis-specific resuscitation link.';
  }
  if (!has('reassess')) {
    notes.reassess = 'Set the next reassessment from the active presentation, treatment and source review.';
  }
  return notes;
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];

  addEntryActions(actions, values);
  addDiagnosticActions(actions, values);
  addAntimicrobialActions(actions, values);
  addAntimicrobialStewardship(actions, values);
  addResuscitationActions(actions, values);
  addShockAdjuncts(actions, values);
  addReassessmentActions(actions, values);

  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'sepsis-septic-shock',
  title: 'Sepsis / Septic Shock',
  reviewedAt: '2026-09-22',
  scope: 'Adult inpatient sepsis and septic-shock assessment, time-critical escalation, source review and reassessment.',
  reviewLimitations: [
    'SSC 2026 is the current final adult guideline located and read for this module. It was published on 23 March 2026 and updates the 2021 SSC guideline; no announced or draft update is used for its clinical branches.',
    'The finding fields record clinical review; they do not diagnose infection or septic shock, calculate SOFA/qSOFA or fluid need, or replace emergency assessment. Age, microbiology and the septic-shock course must be explicitly reviewed; missing information stays unknown.',
    'This module includes guideline-level spectrum, prolonged-infusion, de-escalation, steroid and fluid-removal review. It does not select an antimicrobial product or dose, infusion schedule, renal adjustment, local susceptibility assumption, fluid volume calculation, vasopressor preparation, corticosteroid regimen or source-control procedure.',
    'Scope is adult inpatient recognition, early treatment and subsequent antimicrobial/hemodynamic review. It is not a complete implementation of all 129 SSC statements: detailed respiratory/ARDS support, prehospital systems, pediatric care and long-term rehabilitation require their dedicated pathways and the full guideline.',
    'The SSC 30 mL/kg statement is shown only for life-threatening shock/hypoperfusion with a possible or probable/definite infectious context, an explicitly not-started phase, and reviewed absence of major overload/renal-cardiac risk. It is not repeated once resuscitation is in progress or post-initial, and it is not a local order or exemption from clinical reassessment.',
    'Product orderability, pharmacy preparation, access safety, stewardship policy, procedural availability and clinician approval remain outside this data-only engine. Source alignment and current local availability are separate statuses.',
  ],
  sources: [ssc2026, sepsis3, ssc2026QuickGuide],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Make infection likelihood, organ dysfunction, shock and actual antimicrobial status visible; collect cultures/lactate without delaying time-critical care; use the SSC timing branch only when its clinical context is actually entered; then reassess every active intervention and source-control need.',
    recognition: [
      'Sepsis-3: life-threatening organ dysfunction caused by a dysregulated response to infection; acute SOFA increase of 2 or more is its clinical operationalization, not a calculation performed here.',
      'Septic shock is a sepsis subset with persistent hypotension requiring vasopressors to maintain MAP at least 65 mm Hg and lactate above 2 mmol/L despite adequate volume resuscitation; this form does not diagnose it.',
      'Do not use qSOFA as a diagnostic gate. SSC 2026 recommends NEWS/NEWS2/MEWS or SIRS over qSOFA as a single in-hospital screen and treats sepsis as a clinical diagnosis.',
    ],
    redFlags: [
      'Life-threatening hypotension/hypoperfusion, altered mentation, mottling, cyanosis/decreased oxygenation, worsening organ dysfunction or a rapidly deteriorating trajectory.',
      'Possible/probable/definite septic shock; probable/definite sepsis with organ dysfunction; a source that requires urgent control.',
      'Persistent hypoperfusion after initial treatment, escalating vasopressor need, congestion/renal-cardiac fluid risk or an unknown active resuscitation record.',
    ],
    steps: [
      {role: 'Confirm entry & urgency', text: 'Assess infectious likelihood, acute infection-related organ dysfunction and shock separately. Emergency resuscitation is not gated by qSOFA, cultures or a completed form.'},
      {role: 'Cultures, lactate & source', text: 'For possible/probable/definite sepsis or septic shock, obtain cultures as soon as possible, ideally before antimicrobials, and measure lactate; do not create a treatment delay.'},
      {role: 'Set antimicrobial timing', text: 'Reconcile whether a first dose has already been given. Possible/probable/definite septic shock and probable/definite sepsis: immediate, ideally within 1 hour if not already given. Possible sepsis without shock: rapid assessment, then within 3 hours if concern persists. Low likelihood with shock assessed absent: defer while monitoring.'},
      {role: 'Resuscitate & avoid repeat boluses', text: 'For sepsis-induced hypoperfusion/septic shock, SSC suggests at least 30 mL/kg IV crystalloid in 3 hours with individualization and frequent reassessment. Use actual weight, or consider adjusted/ideal weight if BMI >30. Balanced crystalloids are generally preferred; use saline with traumatic brain injury. Prefer crystalloids alone over routine albumin; large previous crystalloid volumes or cirrhosis may justify albumin, but avoid it with traumatic brain injury. After 30 mL/kg with persistent hypoperfusion, individualize a liberal or restrictive strategy using dynamic response and fluid tolerance.'},
      {role: 'MAP, pressors & monitoring', text: 'Initial MAP: generally 65 mm Hg; consider 60–65 at age ≥65. Norepinephrine is first line; unstable shock may need fluids and pressors concurrently. Peripheral initiation can prevent central-access delay. Choose arterial monitoring for high/escalating or multiple pressors, frequent arterial sampling or unreliable cuff readings rather than automatically for every pressor recipient.'},
      {role: 'Spectrum & maintenance delivery', text: 'Review source, organism-specific resistance risks and local susceptibility. Empiric antifungals are generally discouraged; consider selected high-risk patients individually. Include anaerobic coverage for relevant source risks or other required spectrum. For beta-lactams, prolonged maintenance infusion after the loading dose is strongly recommended; pharmacy must verify the exact regimen.'},
      {role: 'De-escalation & duration', text: 'Narrow or stop unnecessary coverage using confirmed pathogens and susceptibilities (strong recommendation), or review de-escalation when final cultures identify no pathogen (conditional). Pending is not negative. Prefer shorter courses with adequate source control; procalcitonin plus clinical assessment may help stopping when duration is unclear.'},
      {role: 'Steroids & fluid recovery', text: 'IV corticosteroids are suggested for adult septic shock; SSC does not mandate a cortisol result or a fixed pressor threshold. After acute resuscitation ends, consider active fluid removal based on cardiorespiratory status, pressor dose, edema, weight and balance. Improving perfusion alone does not establish readiness. Diuretics or specialist extracorporeal removal require individual indications.'},
      {role: 'Reassess response & source control', text: 'Trend the clinically relevant perfusion response, lactate/CRT when applicable, congestion and source control. When a source requires control, seek early action, ideally within 6 hours.'},
    ],
    monitoring: [
      'For sepsis/septic shock, SSC quick guidance calls for immediate, ongoing, at least hourly blood pressure, heart rate, respiratory rate and consciousness monitoring.',
      'Use serial lactate for elevated lactate or septic shock and capillary refill as an adjunct; do not use lactate normalization as a reason to continue unbounded fluid.',
      'Document current fluids, vasopressors, timing, haemodynamic response, fluid balance/congestion, culture timing/results, source-control status and antimicrobial review/de-escalation ownership in the active clinical record.',
      'Review nutrition, glucose, VTE and stress-ulcer prophylaxis with the relevant ICU protocols. Discuss goals of care early; reconcile medicines and communicate treatment, follow-up and rehabilitation needs at transfers and discharge. Dedicated organ-support pathways and the full SSC guideline cover care beyond this compact module.',
    ],
    sources: [
      {label: 'SSC 2026 adult guideline — screening, cultures/lactate, timing, fluids, vasopressors, source control', url: SSC_2026_SOURCE},
      {label: 'SSC 2026 adult quick guide — monitoring and resuscitation/reassessment sequence', url: SSC_2026_QUICK_GUIDE},
      {label: 'Sepsis-3 — adult sepsis and septic-shock definitions', url: SEPSIS_3_SOURCE},
    ],
  },
};

export default config;
