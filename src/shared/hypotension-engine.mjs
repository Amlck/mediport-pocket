// Compact, source-reviewed decision engine for adult acute hypotension and
// suspected circulatory shock. It exposes assessment gaps and routes to the
// relevant emergency pathway; it does not create fluids, pressors, procedures,
// blood products, antimicrobial orders, or a critical-care protocol.

export const ESICM_SHOCK_SOURCE = 'https://www.esicm.org/esicm-guideline-circulatory-shock-haemodynamic-monitoring/';
export const ESICM_SHOCK_VISUAL_SOURCE = 'https://www.esicm.org/wp-content/uploads/2025/10/Visual-abstract-final.pdf';
export const NICE_IV_FLUID_SOURCE = 'https://www.nice.org.uk/guidance/cg174/chapter/recommendations';
export const NICE_SEPSIS_SOURCE = 'https://www.nice.org.uk/guidance/ng253/chapter/Managing-suspected-sepsis';
export const SSC_2026_SOURCE = 'https://www.sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-adult-guidelines';
export const ESC_ACS_SOURCE = 'https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/';
export const RCUK_SPECIAL_SOURCE = 'https://www.resus.org.uk/print/pdf/node/36442';

const ESICM = {
  label: 'ESICM circulatory shock and haemodynamic monitoring guideline (2025)',
  url: ESICM_SHOCK_SOURCE,
};
const NICE_IV = {
  label: 'NICE CG174 intravenous fluid therapy in adults',
  url: NICE_IV_FLUID_SOURCE,
};
const NICE_SEPSIS = {
  label: 'NICE NG253 suspected sepsis in adults (2025)',
  url: NICE_SEPSIS_SOURCE,
};
const SSC_2026 = {
  label: 'Surviving Sepsis Campaign adult guideline (2026)',
  url: SSC_2026_SOURCE,
};
const ESC_ACS = {
  label: 'ESC acute coronary syndromes guideline (2023)',
  url: ESC_ACS_SOURCE,
};
const RCUK_SPECIAL = {
  label: 'Resuscitation Council UK special circumstances guidance (2025)',
  url: RCUK_SPECIAL_SOURCE,
};

export const HYPOTENSION_SOURCES = [
  ESICM,
  NICE_IV,
  NICE_SEPSIS,
  SSC_2026,
  ESC_ACS,
  RCUK_SPECIAL,
];

const fields = [
  {
    key: 'circulationFinding',
    label: 'Current circulation finding?',
    options: [
      ['unknown', 'Not assessed'],
      ['low-bp-only', 'Low BP only · perfusion assessed'],
      ['hypoperfusion-only', 'Hypoperfusion without low BP'],
      ['both', 'Low BP + hypoperfusion'],
      ['neither', 'Neither · assessed'],
    ],
    help: 'Low BP: MAP <65 mmHg, SBP <90 mmHg or a major fall from baseline. Perfusion: mentation, capillary refill/skin, urine output and lactate in context. Shock is acute circulatory failure with hypoperfusion and can occur without low BP. Record the current assessed state, not a presumed diagnosis.',
  },
  {
    key: 'emergencyPriority',
    label: 'Immediate emergency priority?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present'],
      ['no', 'Absent · assessed'],
    ],
    help: 'This priority is independent of the BP/perfusion answer. An emergency feature requires immediate ABCDE support and escalation even when the circulation entry is incomplete or appears improved.',
  },
  {
    key: 'suspectedMechanism',
    label: 'Likely primary mechanism?',
    options: [
      ['unknown', 'Not classified'],
      ['hypovolemic', 'Hypovolaemic / fluid loss'],
      ['distributive', 'Distributive / vasodilatory'],
      ['cardiogenic', 'Cardiogenic / low-output'],
      ['obstructive', 'Obstructive'],
      ['hemorrhagic', 'Haemorrhagic / active bleeding'],
    ],
    help: 'Use haemorrhagic for active significant bleeding; hypovolaemic means non-haemorrhagic fluid loss. These choices name the physiology being acted on. Mixed or unclear shock stays unclassified and needs bedside echo/POCUS, ECG and cause review before a mechanism-specific fluid or pressor action.',
  },
  {
    key: 'fluidRisk',
    label: 'Fluid harm / overload concern?',
    options: [
      ['unknown', 'Not established'],
      ['low', 'No major fluid-harm concern'],
      ['high', 'Congestion / high fluid-harm concern'],
    ],
    help: 'This is not a fluid-responsiveness test. Look for current congestion and fluid-harm risk; use dynamic response assessment and serial lung/perfusion review before any additional fluid.',
  },
  {
    key: 'resuscitationPhase',
    label: 'Current resuscitation phase?',
    options: [
      ['unknown', 'Prior treatment / response not established'],
      ['initial', 'Initial treatment not yet given'],
      ['reassessment', 'Initial treatment given · reassess'],
      ['refractory', 'Persists despite initial treatment'],
    ],
    help: 'This is an assessment state, not a medication record. “Reassessment” and “refractory” do not authorize another bolus or a pressor dose; establish what was given, the response, and the cause.',
  },
  {
    key: 'causeCue',
    label: 'Time-critical cause cue?',
    options: [
      ['unknown', 'Not assessed'],
      ['sepsis', 'Suspected sepsis'],
      ['acs', 'Suspected ACS'],
      ['anaphylaxis', 'Anaphylaxis suspected'],
      ['other', 'Other / unclear cause'],
    ],
    help: 'A cause cue routes urgent work in parallel. It does not prove the mechanism or import a routine fluid, pressor, antimicrobial, antithrombotic or anaphylaxis regimen into this guide.',
  },
];

const stages = [
  {id: 'recognize', title: 'Recognize the circulation state'},
  {id: 'stabilize', title: 'Stabilize and escalate'},
  {id: 'classify', title: 'Classify the shock mechanism'},
  {id: 'resuscitate', title: 'Resuscitate without automatic repeat dosing'},
  {id: 'reassess', title: 'Reassess perfusion and route the cause'},
];
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));
const validValues = Object.fromEntries(fields.map(field => [field.key, new Set(field.options.map(([value]) => value))]));

function normalized(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, {
  tone,
  resourceGroup,
  related,
  source = ESICM,
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

const hasPerfusionFailure = values => ['hypoperfusion-only', 'both'].includes(values.circulationFinding);
const hasLowBp = values => ['low-bp-only', 'both'].includes(values.circulationFinding);
const hasCurrentConcern = values => values.circulationFinding !== 'neither';
const routeTone = values => hasPerfusionFailure(values) || values.emergencyPriority === 'yes' || values.resuscitationPhase === 'refractory' ? 'urgent' : 'attention';

const cueMechanism = {
  sepsis: 'distributive',
  acs: 'cardiogenic',
  anaphylaxis: 'distributive',
};
const hasCauseMechanismConflict = values => {
  const expected = cueMechanism[values.causeCue];
  return Boolean(expected && values.suspectedMechanism !== 'unknown' && values.suspectedMechanism !== expected);
};

function addRecognition(actions, values) {
  switch (values.circulationFinding) {
    case 'unknown':
      actions.push(action(
        'verify-bp-and-perfusion',
        'recognize',
        'Confirm BP and perfusion now',
        'No current low-BP or hypoperfusion conclusion is established.',
        'Repeat a credible BP measurement and assess mentation, capillary refill/skin perfusion, urine output and lactate trend in the clinical context. Unknown is not a normal finding and must not unlock a generic fluid or vasopressor action.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'low-bp-only':
      actions.push(action(
        'low-bp-needs-perfusion-assessment',
        'recognize',
        'Low BP needs repeat and perfusion assessment',
        'Low BP alone does not establish shock.',
        'Confirm technique and compare with the patient’s baseline, then assess tissue perfusion and trajectory. Do not equate an isolated cuff value with fluid responsiveness or use it alone to select a shock regimen.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'hypoperfusion-only':
      actions.push(action(
        'hypoperfusion-without-low-bp',
        'recognize',
        'Treat hypoperfusion as acute circulatory failure',
        'Shock can be present without a low BP entry.',
        'ESICM defines shock around acute circulatory failure and inadequate tissue perfusion; hypotension is common but not required. Escalate assessment and establish the mechanism in parallel.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      break;
    case 'both':
      actions.push(action(
        'suspected-circulatory-shock',
        'recognize',
        'Treat this as suspected circulatory shock',
        'Low BP and hypoperfusion are both present.',
        'Start ABCDE support, continuous or frequent monitoring scaled to severity, and mechanism/cause assessment in parallel. A single BP improvement does not establish restored tissue perfusion.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
      break;
    default:
      actions.push(action(
        'no-current-circulatory-failure-entry',
        'recognize',
        'Current entry does not establish low BP or hypoperfusion',
        'No shock-directed treatment is inferred from this assessed state.',
        'This is a current assessment, not a rule-out of evolving illness. Recheck if symptoms, trajectory or emergency features remain concerning.',
        {resourceGroup: 'monitoring'},
      ));
  }
}

function addStabilization(actions, values) {
  if (values.emergencyPriority === 'yes') {
    actions.push(action(
      'activate-emergency-response',
      'stabilize',
      'Activate emergency response and ABCDE support now',
      'Emergency priority is independent of the BP/perfusion entry.',
      'Obtain immediate senior/rapid-response or critical-care help as locally appropriate. Support airway, breathing and circulation while cause-specific treatment is arranged; do not wait for this form to be complete.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.emergencyPriority === 'unknown') {
    actions.push(action(
      'assess-emergency-priority',
      'stabilize',
      'Assess ABCDE and immediate emergency priority',
      'Unknown priority is not a low-risk result.',
      'Check airway/breathing compromise, consciousness, rapid deterioration and peri-arrest features now. Escalate immediately for clinical concern even if BP/perfusion details are incomplete.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (values.resuscitationPhase === 'refractory' && hasPerfusionFailure(values)) {
    actions.push(action(
      'urgent-nonresponse-escalation',
      'stabilize',
      'Persistent hypoperfusion needs urgent critical-care escalation',
      'Initial response-guided treatment has not restored perfusion.',
      'Escalate now for senior/critical-care review, repeated ABCDE and cause-directed treatment. Do not answer non-response with an uncounted fluid bolus or an improvised vasopressor regimen.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }
}

function addMechanism(actions, values) {
  const tone = routeTone(values);
  switch (values.suspectedMechanism) {
    case 'unknown':
      if (hasCurrentConcern(values)) {
        actions.push(action(
          'classify-shock-with-echo-and-cause-review',
          'classify',
          'Classify mechanism before mechanism-specific treatment',
          'Use bedside echo/POCUS, ECG, examination and targeted work-up.',
          'ESICM identifies echocardiography as first-line to determine shock type. Review volume loss, infection/vasodilation, cardiac output, congestion, bleeding and obstructive features in parallel; do not infer a fluid or pressor path from uncertainty.',
          {tone: 'attention', resourceGroup: 'workup'},
        ));
      }
      break;
    case 'hypovolemic':
      actions.push(action(
        'hypovolemic-source-and-loss-review',
        'classify',
        'Find fluid loss and exclude active haemorrhage',
        'Hypovolaemic physiology is entered; major bleeding remains a separate emergency route.',
        'Review gastrointestinal, renal and other losses, intake, medicines and examination. Reassess volume response rather than assuming that every low BP is volume depletion.',
        {tone, resourceGroup: 'workup', related: ['aki']},
      ));
      break;
    case 'distributive':
      actions.push(action(
        'distributive-cause-review',
        'classify',
        'Find the distributive / vasodilatory cause',
        'Review infection, anaphylaxis, medicines and other vasodilatory causes.',
        'Distributive physiology does not itself prove sepsis or make a fixed fluid amount appropriate. Treat time-critical cause cues in parallel and individualize any haemodynamic support to response and fluid-harm risk.',
        {tone, resourceGroup: 'workup'},
      ));
      break;
    case 'cardiogenic':
      actions.push(action(
        'cardiogenic-shock-route',
        'classify',
        'Cardiogenic / low-output picture: urgent echo and cardiac route',
        'Avoid reflex large-volume fluid loading, especially with congestion.',
        'Use ECG, bedside echo and congestion assessment while arranging urgent cardiac/critical-care review. The acute coronary syndrome and heart-failure pathways own definitive cardiac treatment; this guide does not choose an inotrope or pressor dose.',
        {tone, resourceGroup: 'workup', related: ['heart-failure', 'acute-chest-pain-acs']},
      ));
      break;
    case 'obstructive':
      actions.push(action(
        'obstructive-shock-route',
        'classify',
        'Suspected obstructive shock: obtain immediate cause-directed help',
        'Tamponade, tension pneumothorax and high-risk PE need the obstruction addressed.',
        'Escalate for urgent procedural/critical-care assessment. Fluids or a vasopressor cannot substitute for relief of a tension pneumothorax, drainage of tamponade, or high-risk pulmonary-embolism management.',
        {tone: 'urgent', resourceGroup: 'workup', related: ['acute-hypoxemia-dyspnea'], source: RCUK_SPECIAL},
      ));
      break;
    case 'hemorrhagic':
      actions.push(action(
        'hemorrhagic-shock-route',
        'classify',
        'Suspected haemorrhagic shock: control bleeding and activate the bleeding pathway',
        'Do not use the non-haemorrhagic crystalloid or pressor path as a substitute.',
        'Find and control the bleeding source, obtain urgent senior/procedural/transfusion support under the local haemorrhage protocol, and route GI or anticoagulant-related bleeding in parallel. This guide does not select blood products, ratios or permissive-hypotension targets.',
        {tone: 'urgent', resourceGroup: 'workup', related: ['gi-bleed', 'anticoagulant-bleeding']},
      ));
      break;
  }

  if (hasCauseMechanismConflict(values)) {
    actions.push(action(
      'reconcile-cause-cue-and-mechanism',
      'classify',
      'Reconcile conflicting cause cue and mechanism before borrowing a routine pathway',
      'A cause cue does not override a different entered shock physiology.',
      'Assess both possibilities urgently, but do not import a sepsis-fluid, ACS, or anaphylaxis routine into a conflicting mechanism. Use the relevant dedicated pathway while echo/ECG, examination and response clarify the physiology.',
      {tone: routeTone(values), resourceGroup: 'workup'},
    ));
  }
}

function addCauseCue(actions, values) {
  if (values.causeCue === 'sepsis') {
    const matching = values.suspectedMechanism === 'distributive';
    actions.push(action(
      matching ? 'handoff-suspected-sepsis' : 'sepsis-cue-without-distributive-assumption',
      'classify',
      matching ? 'Use the dedicated Sepsis / Septic Shock pathway now' : 'Assess the sepsis cue in parallel without importing a septic-shock regimen',
      matching ? 'Keep the sepsis fluid standard separate from this generic shock guide.' : 'A sepsis cue does not prove distributive physiology or authorize a sepsis fluid/pressor action here.',
      matching
        ? 'NICE NG253 and SSC 2026 both address sepsis resuscitation but use different fluid standards. The dedicated sepsis pathway owns selection and reconciliation; this guide deliberately does not combine NG253 incremental boluses with the SSC weight-based recommendation.'
        : 'Open the dedicated sepsis pathway for infection assessment, antimicrobials and source control while the shock mechanism is clarified. Do not borrow its routine fluid or vasopressor actions into an unclassified or conflicting mechanism.',
      {tone: hasPerfusionFailure(values) ? 'urgent' : 'attention', resourceGroup: 'workup', related: ['sepsis-septic-shock'], source: NICE_SEPSIS},
    ));
  }

  if (values.causeCue === 'acs') {
    actions.push(action(
      'route-possible-acs',
      'classify',
      'Possible ACS: activate the acute-cardiac assessment route',
      'Do not infer a cardiogenic regimen from an ischaemia cue alone.',
      'Obtain urgent ECG/cardiac evaluation and use the Acute Chest Pain / Possible ACS pathway. When hypoperfusion is present, coordinate this with critical-care/cardiology review; this guide does not select antithrombotics, reperfusion or inotrope treatment.',
      {tone: routeTone(values), resourceGroup: 'workup', related: ['acute-chest-pain-acs'], source: ESC_ACS},
    ));
  }

  if (values.causeCue === 'anaphylaxis') {
    actions.push(action(
      'route-suspected-anaphylaxis',
      'stabilize',
      'Treat suspected anaphylaxis as an immediate emergency',
      'Airway, breathing or circulation compromise needs the anaphylaxis pathway now.',
      'RCUK states that anaphylaxis is recognized by airway, breathing or circulation problems with or without skin findings and that IM adrenaline is immediate first-line treatment. The dedicated anaphylaxis pathway owns dose, repeat timing and refractory-treatment safeguards; do not substitute a generic shock fluid or pressor regimen.',
      {tone: 'urgent', resourceGroup: 'monitoring', related: ['anaphylaxis'], source: RCUK_SPECIAL},
    ));
  }
}

function addFluidRiskGate(actions, values) {
  if (values.fluidRisk === 'unknown') {
    actions.push(action(
      'clarify-fluid-harm-risk',
      'resuscitate',
      'Clarify congestion and fluid-harm risk before a generic bolus',
      'Fluid risk is not established.',
      'Assess lungs/oxygenation, JVP or other congestion findings, cardiac/renal reserve and dynamic response. Do not infer fluid responsiveness from hypotension or lactate alone.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else {
    actions.push(action(
      'high-fluid-harm-risk',
      'resuscitate',
      'High fluid-harm risk: do not use the generic crystalloid path',
      'Congestion or major cardiac-renal risk is entered.',
      'Use urgent bedside haemodynamic assessment and a cause-specific plan. Monitor for pulmonary congestion and worsening oxygenation; fluid administration, if still required, must be individualized and response-tested.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addResuscitation(actions, values) {
  if (values.circulationFinding === 'neither') {
    actions.push(action(
      'current-state-exits-initial-bolus-path',
      'resuscitate',
      'Current assessment exits the initial-bolus path',
      'Neither low BP nor hypoperfusion is currently established.',
      'Do not give an additional generic fluid bolus or vasopressor from this entry, including when a prior phase was initial or reassessment. Continue cause-specific care and repeat assessment if the clinical trajectory changes.',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.circulationFinding === 'unknown') {
    actions.push(action(
      'no-shock-treatment-from-unverified-entry',
      'resuscitate',
      'Do not infer a generic fluid or pressor action from an unverified entry',
      'Confirm BP, perfusion, prior treatment and immediate priority first.',
      'Unknown circulation status must remain visible. Emergency ABCDE support continues when clinically indicated, but this compact guide does not auto-select an initial or repeat haemodynamic treatment.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (!hasPerfusionFailure(values)) {
    actions.push(action(
      'low-bp-alone-does-not-select-shock-bolus',
      'resuscitate',
      'Low BP alone does not select a shock bolus or pressor',
      'Complete perfusion and mechanism assessment first.',
      'Confirm the measurement, baseline and trajectory. Give cause-specific treatment when indicated, but do not create generic shock treatment until tissue hypoperfusion or another emergency indication is established.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.resuscitationPhase === 'unknown') {
    actions.push(action(
      'clarify-resuscitation-history',
      'resuscitate',
      'Clarify prior fluid, pressor and response before changing treatment',
      'Unknown phase does not authorize an initial or repeat dose.',
      'Establish what was given, amount/route/timing, BP and perfusion response, and any congestion or adverse effect. Escalate urgent support while this is clarified; do not repeat a presumed initial bolus.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.resuscitationPhase === 'reassessment') {
    actions.push(action(
      'reassess-before-additional-haemodynamic-treatment',
      'resuscitate',
      'Reassess response before any additional fluid or pressor change',
      'Do not automatically repeat a bolus.',
      'Use serial perfusion findings and dynamic fluid-responsiveness assessment where available, with lung/congestion review. Establish whether the patient improved, is fluid responsive, needs cause control, or has reached refractory shock before another intervention.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.resuscitationPhase === 'refractory') {
    if (values.causeCue === 'anaphylaxis' && !hasCauseMechanismConflict(values)) {
      actions.push(action(
        'refractory-anaphylaxis-handoff',
        'resuscitate',
        'Persistent anaphylaxis physiology: use the dedicated refractory-anaphylaxis pathway',
        'Do not substitute a generic shock pressor regimen.',
        'Persistent airway, breathing or circulation compromise after initial anaphylaxis treatment requires immediate expert escalation under the dedicated anaphylaxis pathway. This guide does not choose further adrenaline, fluids or a vasopressor dose.',
        {tone: 'urgent', resourceGroup: 'monitoring', related: ['anaphylaxis'], source: RCUK_SPECIAL},
      ));
    } else if (hasCauseMechanismConflict(values)) {
      actions.push(action(
        'critical-care-review-for-conflicting-refractory-physiology',
        'resuscitate',
        'Refractory conflicting physiology: urgent critical-care review, not a borrowed routine regimen',
        'Do not select a generic fluid or pressor from either entered pathway.',
        'The entered cause cue and mechanism conflict. Continue emergency support, repeated ABCDE and cause clarification with critical-care review; this compact guide does not merge their treatment routines or select a drug, dose, rate or bolus.',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else if (values.suspectedMechanism === 'distributive' && values.causeCue === 'sepsis' && !hasCauseMechanismConflict(values)) {
      actions.push(action(
        'septic-shock-vasopressor-handoff',
        'resuscitate',
        'Persistent septic-shock physiology: use the local norepinephrine critical-care protocol',
        'SSC 2026 identifies norepinephrine as first-line and an initial MAP target of 65 mmHg.',
        'Escalate to critical care immediately. SSC 2026 allows peripheral vasopressor initiation rather than delay solely for central access, but does not supply a generic duration, dose, concentration, line-size or titration order. Use the local protocol and individualize the target rather than copying saved resource-row details.',
        {tone: 'urgent', resourceGroup: 'vasopressor', related: ['sepsis-septic-shock'], source: SSC_2026},
      ));
    } else {
      actions.push(action(
        'critical-care-vasopressor-review',
        'resuscitate',
        'Refractory shock: urgent critical-care vasopressor and support review',
        'No generic drug, dose or rate is selected.',
        'Persistent hypoperfusion after initial response-guided treatment needs immediate senior/critical-care assessment, cause control and haemodynamic monitoring. Do not substitute a generic vasopressor or another uncounted bolus for cardiogenic, obstructive, haemorrhagic or unclassified shock management.',
        {tone: 'urgent', resourceGroup: 'vasopressor'},
      ));
    }
    return;
  }

  if (hasCauseMechanismConflict(values)) {
    actions.push(action(
      'no-routine-treatment-from-conflicting-cause-cue',
      'resuscitate',
      'Do not borrow a routine fluid or pressor regimen from a conflicting cause cue',
      'Clarify the physiology and use the dedicated cause pathway.',
      'The entered cause cue and shock mechanism point to different default pathways. Maintain emergency support and urgent review, but do not blend their routine treatments.',
      {tone: routeTone(values), resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.suspectedMechanism === 'hypovolemic') {
    if (values.fluidRisk !== 'low') {
      addFluidRiskGate(actions, values);
    } else {
      actions.push(action(
        'initial-hypovolemic-crystalloid',
        'resuscitate',
        'Use one response-guided isotonic crystalloid bolus for credible non-haemorrhagic hypovolaemia',
        'NICE CG174: 500 mL crystalloid (sodium 130–154 mmol/L) over less than 15 minutes, then reassess.',
        'This applies only when adult IV fluid resuscitation is clinically needed and active major haemorrhage, cardiogenic/obstructive physiology and high fluid-harm risk are not the working problem. Record perfusion, lungs/oxygenation, urine output and response before any further fluid.',
        {tone: 'urgent', resourceGroup: 'isotonic-fluid', source: NICE_IV},
      ));
    }
    return;
  }

  if (values.suspectedMechanism === 'distributive') {
    if (values.causeCue === 'sepsis') {
      actions.push(action(
        'sepsis-pathway-owns-fluid-standard',
        'resuscitate',
        'Use the dedicated sepsis pathway to select the fluid standard',
        'Do not combine NICE NG253 incremental boluses with SSC 2026 weight-based fluid guidance.',
        'The source standards are both current but different: NG253 uses 250 mL boluses with reassessment, while SSC 2026 suggests at least 30 mL/kg within 3 hours for sepsis-induced hypoperfusion or septic shock. This generic shock guide deliberately selects neither; hand off to the sepsis pathway and local protocol.',
        {tone: 'attention', resourceGroup: 'isotonic-fluid', related: ['sepsis-septic-shock'], source: NICE_SEPSIS},
      ));
      return;
    }
    if (values.causeCue === 'anaphylaxis') {
      actions.push(action(
        'anaphylaxis-pathway-owns-resuscitation-regimen',
        'resuscitate',
        'Use the dedicated anaphylaxis pathway; do not substitute generic distributive-shock treatment',
        'Immediate anaphylaxis treatment is time-critical.',
        'Anaphylaxis has its own adrenaline, positioning, fluid and refractory-treatment safeguards. This guide keeps the pathway visible without selecting a separate crystalloid or vasopressor regimen.',
        {tone: 'urgent', resourceGroup: 'monitoring', related: ['anaphylaxis'], source: RCUK_SPECIAL},
      ));
      return;
    }
    if (values.fluidRisk !== 'low') {
      addFluidRiskGate(actions, values);
    } else {
      actions.push(action(
        'cause-directed-distributive-fluid-review',
        'resuscitate',
        'Use a cause-directed, response-tested isotonic-fluid plan',
        'No fixed non-sepsis distributive-shock bolus is selected here.',
        'For non-sepsis distributive physiology, choose fluid amount and rate only after cause, perfusion, congestion and dynamic response are reviewed. Reassess after any intervention rather than repeating fluid automatically.',
        {tone: 'attention', resourceGroup: 'isotonic-fluid'},
      ));
    }
    return;
  }

  if (values.suspectedMechanism === 'cardiogenic') {
    actions.push(action(
      'cardiogenic-no-generic-bolus',
      'resuscitate',
      'Cardiogenic picture: do not use the generic crystalloid or pressor path',
      'Urgent echo, congestion assessment and cardiac/critical-care plan are needed.',
      'A fluid bolus or a pressor cannot be selected from this generic guide for low-output shock. Coordinate a cause-specific plan with the cardiac route and avoid reflex volume loading when congestion is present.',
      {tone: routeTone(values), resourceGroup: 'monitoring', related: ['heart-failure', 'acute-chest-pain-acs']},
    ));
    return;
  }

  if (values.suspectedMechanism === 'obstructive' || values.suspectedMechanism === 'hemorrhagic') {
    actions.push(action(
      'mechanism-needs-definitive-treatment-not-generic-bolus',
      'resuscitate',
      'Definitive obstructive or haemorrhage treatment takes priority',
      'Do not use the generic crystalloid or pressor path as a substitute.',
      'Continue emergency support while the obstruction is relieved or bleeding is controlled through the relevant critical-care/procedural pathway. This compact guide does not prescribe a transfusion, fluid or vasopressor regimen for these mechanisms.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'unclassified-shock-no-mechanism-specific-bolus',
    'resuscitate',
    'Unclassified hypoperfusion: do not choose a mechanism-specific bolus or pressor yet',
    'Classify physiology and fluid-harm risk first.',
    'Maintain emergency support and urgent work-up. Use bedside echo/POCUS, ECG, examination, response history and cause review to distinguish hypovolaemic, distributive, cardiogenic, obstructive and haemorrhagic routes.',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

function addReassessment(actions, values) {
  if (values.circulationFinding === 'neither') {
    actions.push(action(
      'monitor-after-current-improvement',
      'reassess',
      'Monitor after the current improved / non-shock entry',
      'Do not equate one improved value with final resolution.',
      'Document the trajectory, cause addressed and next BP/perfusion check. Reopen emergency or shock assessment for recurrent low BP, hypoperfusion, new symptoms or deterioration.',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.circulationFinding === 'unknown') {
    actions.push(action(
      'establish-circulation-trend',
      'reassess',
      'Establish a BP and perfusion trend',
      'Missing circulation data cannot establish response or recovery.',
      'Record repeat BP with context, mental status, capillary refill/skin findings, urine output and relevant lactate/acid-base trend. Escalate earlier for a concerning clinical trajectory.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'serial-perfusion-reassessment',
    'reassess',
    'Trend perfusion after every material intervention',
    'BP/MAP alone does not establish restored circulation.',
    'Reassess mentation, capillary refill/skin perfusion, urine output, lactate/acid-base context, lungs/oxygenation and response to the intervention. ESICM emphasizes serial tissue-perfusion assessment and dynamic fluid-responsiveness measures rather than liberal fluid repetition.',
    {tone: hasPerfusionFailure(values) ? 'attention' : undefined, resourceGroup: 'monitoring'},
  ));

  if (values.resuscitationPhase === 'refractory') {
    actions.push(action(
      'nonresponse-echo-and-haemodynamic-monitoring',
      'reassess',
      'For non-response, use serial echo and advanced haemodynamic monitoring as available',
      'Refractory shock needs a changed assessment, not repeated empiric treatment.',
      'ESICM recommends arterial pressure monitoring in shock not responding to initial therapy and/or requiring vasopressors, with cardiac-output/stroke-volume assessment and serial echocardiography to clarify type and treatment response where available.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  }
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(actionItem => actionItem.stage === stage);
  const notes = {};
  if (!hasStage('stabilize')) {
    notes.stabilize = values.emergencyPriority === 'no'
      ? 'No immediate emergency feature is currently established; reassess immediately if the trajectory changes.'
      : 'Assess emergency priority before treating this as routine hypotension.';
  }
  if (!hasStage('classify')) {
    notes.classify = values.circulationFinding === 'neither'
      ? 'No current shock-mechanism route is inferred from the assessed non-shock state.'
      : 'Clarify the working mechanism before a mechanism-specific treatment path.';
  }
  if (!hasStage('resuscitate')) {
    notes.resuscitate = values.circulationFinding === 'neither'
      ? 'No generic fluid or vasopressor action is inferred from the current entry.'
      : 'Confirm current state, prior treatment and response before changing haemodynamic support.';
  }
  return notes;
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];

  addRecognition(actions, values);
  addStabilization(actions, values);
  addMechanism(actions, values);
  addCauseCue(actions, values);
  addResuscitation(actions, values);
  addReassessment(actions, values);

  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'hypotension',
  title: 'Acute Hypotension',
  reviewedAt: '2026-09-15',
  scope: 'Adult acute hypotension and suspected circulatory shock: entry, escalation, mechanism routing and response reassessment.',
  reviewLabel: 'Upgraded · shock entry and reassessment review',
  reviewLimitations: [
    'This is not a shock diagnosis, a blood-pressure calculator, a complete trauma/haemorrhage/cardiogenic-shock protocol, a fluid or vasopressor order, or a substitute for critical-care, procedural or specialty escalation.',
    'Shock may occur without hypotension. Conversely, low BP alone does not establish hypoperfusion, fluid responsiveness or a safe fluid/pressor treatment path.',
    'NICE NG253 (2025) uses reassessed 250 mL sepsis boluses, while SSC 2026 suggests at least 30 mL/kg in 3 hours for sepsis-induced hypoperfusion or septic shock. The engine deliberately delegates this choice to the dedicated sepsis pathway and never combines the standards.',
    'The NICE CG174 500 mL crystalloid criterion is limited here to credible non-haemorrhagic hypovolaemia with current hypoperfusion and no high/unknown fluid-harm concern; it never authorizes automatic repeats.',
    'Norepinephrine is referenced only as a septic-shock critical-care handoff. Concentration, access, duration, monitoring, titration, add-on agents and patient-specific MAP target require the local protocol and clinician assessment.',
    'Local shock rows, catalog identity, product availability, major-haemorrhage process, pressor safety, antimicrobial selection, anaphylaxis dosing and ACS treatment remain separately reviewed local work.',
  ],
  sources: HYPOTENSION_SOURCES,
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Separate low BP from hypoperfusion, escalate emergency features independently, classify physiology, and reassess response before any further fluid or pressor change.',
    recognition: [
      'Shock is acute circulatory failure with hypoperfusion; hypotension is common but is not required.',
      'Low BP alone needs a credible repeat, baseline and tissue-perfusion assessment before it triggers a shock regimen.',
      'Track mentation, capillary refill/skin perfusion, urine output, lactate/acid-base context and trajectory alongside BP/MAP.',
    ],
    redFlags: [
      'Airway/breathing compromise, altered consciousness, rapidly worsening trajectory or peri-arrest features.',
      'Low BP plus hypoperfusion, or hypoperfusion despite apparently preserved BP.',
      'Active major bleeding, suspected tamponade/tension pneumothorax/high-risk PE, cardiogenic congestion, or refractory hypoperfusion after initial response-guided treatment.',
    ],
    steps: [
      {role: 'Recognize', text: 'Enter the current BP/perfusion state visibly. Unknown is not normal, and hypoperfusion can establish acute circulatory failure without hypotension.'},
      {role: 'Escalate', text: 'Treat emergency ABCDE features independently of the circulation finding; call for urgent senior/critical-care help when perfusion persists or deteriorates.', tools: ['news2']},
      {role: 'Classify', text: 'Differentiate hypovolaemic, distributive, cardiogenic, obstructive and haemorrhagic physiology with bedside echo/POCUS, ECG, examination and targeted work-up.'},
      {role: 'Resuscitate once, then reassess', text: 'For credible non-haemorrhagic hypovolaemia with low fluid-harm risk, NICE CG174 uses one 500 mL crystalloid bolus over less than 15 minutes. Reassess before any further fluid.', dosingNote: 'Sepsis fluid standards are delegated to the dedicated sepsis pathway; do not combine them.'},
      {role: 'Route the cause', text: 'Send suspected sepsis, ACS, anaphylaxis, bleeding or obstruction to its emergency pathway. Persistent shock needs critical-care review rather than an improvised pressor regimen.'},
    ],
    monitoring: [
      'After every material intervention, trend BP/MAP, mentation, capillary refill/skin, urine output, lungs/oxygenation and lactate/acid-base context.',
      'Use dynamic fluid-responsiveness assessment and serial echo where available; do not infer response from a single BP value.',
      'For refractory shock or vasopressor use, escalate haemodynamic monitoring and cause control with critical care.',
    ],
    sources: HYPOTENSION_SOURCES,
  },
};

export default config;
