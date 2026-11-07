// Adult anticoagulant-related bleeding review aid. It stores manual, categorical
// findings only; it does not inspect a chart, submit an order, or authorize a
// reversal or restart decision.

export const ACC_BLEEDING_2020_SOURCE = 'https://cvquality.acc.org/docs/default-source/initiatives/reduce-the-risk-pci-bleed/2020-acc-expert-consensus-decision-pathway-on-management-of-bleeding-in-patients-on-oral-anticoagulants.pdf';
export const AHA_ICH_2022_SOURCE = 'https://www.heart.org/en/-/media/CPR2-Files/Private/2022-Guideline-for-the-Management-of-Patients-With-Spontaneous-Intracerebral-Hemorrhage-1.pdf';
export const ACG_CAG_GI_BLEED_2022_SOURCE = 'https://gi.org/wp-content/uploads/2022/03/ACG-CAG-Guideline.pdf';
export const KCENTRA_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=eee1afb8-324c-42e4-8bf0-f0c9da5e6d42';
export const PRAXBIND_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c7400f8a-dcf4-a6df-6d07-983081b1bf34';
export const PROTAMINE_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=c76876da-b9a8-45d0-9278-7df3288d3a06';
export const ENOXAPARIN_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=31e7c4d0-ba45-4b20-8e25-2d12892372e5';
export const ANDEXXA_FDA_2025_SOURCE = 'https://www.fda.gov/safety/medical-product-safety-information/update-safety-andexxa-astrazeneca-fda-safety-communication';

const acc = Object.freeze({label: 'ACC anticoagulant-related bleeding pathway (2020)', url: ACC_BLEEDING_2020_SOURCE});
const ahaIch = Object.freeze({label: 'AHA/ASA spontaneous ICH guideline (2022)', url: AHA_ICH_2022_SOURCE});
const acgCag = Object.freeze({label: 'ACG/CAG acute gastrointestinal bleeding guideline (2022)', url: ACG_CAG_GI_BLEED_2022_SOURCE});
const kcentra = Object.freeze({label: 'KCENTRA prescribing information (DailyMed)', url: KCENTRA_LABEL_SOURCE});
const praxbind = Object.freeze({label: 'PRAXBIND prescribing information (DailyMed)', url: PRAXBIND_LABEL_SOURCE});
const protamine = Object.freeze({label: 'Protamine sulfate prescribing information (DailyMed)', url: PROTAMINE_LABEL_SOURCE});
const enoxaparin = Object.freeze({label: 'Enoxaparin prescribing information (DailyMed)', url: ENOXAPARIN_LABEL_SOURCE});
const andexxaFda = Object.freeze({label: 'FDA safety communication: Andexxa (December 2025)', url: ANDEXXA_FDA_2025_SOURCE});

export const ANTICOAG_BLEEDING_SOURCES = Object.freeze([acc, ahaIch, acgCag, kcentra, praxbind, protamine, enoxaparin, andexxaFda]);

const field = (key, label, options, threshold) => Object.freeze({
  key,
  label,
  options: Object.freeze([['unknown', 'Not assessed'], ...options]),
  ...(threshold ? {threshold} : {}),
});

export const ANTICOAG_BLEEDING_FIELDS = Object.freeze([
  field('phase', 'Review point?', [
    ['initial', 'Initial bleeding assessment'],
    ['after-initial-action', 'After first bleeding / reversal action'],
    ['restart-review', 'After hemostasis · restart decision review'],
  ], 'Initial treatment, response/rebleeding, and any later anticoagulant decision are separate reviews.'),
  field('currentEmergency', 'Immediate bleeding emergency?', [
    ['yes', 'Present'],
    ['no', 'Absent · assessed'],
  ], 'ABC compromise, shock, ongoing major blood loss, impaired consciousness, focal neurology or airway risk requires urgent action now.'),
  field('bleedSeverity', 'Bleeding severity?', [
    ['major', 'Major / life-threatening'],
    ['nonmajor', 'Clinically relevant, not major'],
    ['no-active-bleed', 'No active bleed / another problem'],
  ], 'ACC major bleed: critical site, haemodynamic instability, haemoglobin fall ≥2 g/dL, or ≥2 RBC units.'),
  field('bleedSite', 'Bleed setting / site?', [
    ['intracranial', 'Spontaneous intracerebral haemorrhage suspected'],
    ['spinal-or-other-neurocritical', 'Spinal or other intracranial / neurocritical bleed'],
    ['acute-gi', 'Acute gastrointestinal bleed'],
    ['other-critical-or-uncontrolled', 'Other critical site / uncontrolled major bleed'],
    ['noncritical-major', 'Major by physiology / blood loss; no critical site identified'],
  ], 'Acute GI bleeding and intracranial haemorrhage have source-specific qualifications; do not silently apply a generic card.'),
  field('agent', 'Exact anticoagulant?', [
    ['vka', 'Warfarin / vitamin K antagonist'],
    ['dabigatran', 'Dabigatran'],
    ['factor-xa', 'Apixaban, rivaroxaban or edoxaban'],
    ['ufh', 'Unfractionated heparin'],
    ['enoxaparin', 'Enoxaparin / LMWH'],
    ['other-or-multiple', 'Other, mixed or multiple agents'],
    ['no-anticoagulant', 'No anticoagulant exposure established'],
  ], 'Do not select a reversal strategy from an incomplete medication list or a drug class alone.'),
  field('residualEffect', 'Likely clinically relevant residual effect?', [
    ['likely', 'Likely present'],
    ['unlikely', 'Unlikely after reconciled timing / clearance'],
  ], 'Base this on exact agent, dose, last administration, renal/liver context and any appropriate assay; a normal PT/INR does not exclude a factor-Xa inhibitor effect.'),
  field('exposureDetails', 'Agent, dose, last time and clearance context reconciled?', [
    ['complete', 'Complete'],
    ['incomplete', 'Incomplete / conflicting'],
  ], 'For heparins, record units or mg and elapsed time. For DOACs, document the exact drug and renal context.'),
  field('sourceControl', 'Resuscitation and source-control status?', [
    ['in-progress-or-uncontrolled', 'In progress / bleeding not controlled'],
    ['controlled', 'Controlled after assessment'],
  ], 'Reversal must not delay airway/circulation support, endoscopic, procedural, surgical or other definitive haemostasis.'),
  field('initialActionExposure', 'Has an initial reversal / haemostatic action already been given?', [
    ['not-given', 'No reversal / haemostatic agent given'],
    ['given', 'Given — record exact agent, amount and time'],
  ], 'This prevents a prior dose being presented again as a new initial regimen.'),
  field('productSafety', 'Selected agent’s current local product and safety gate?', [
    ['eligible', 'Confirmed appropriate in the local emergency plan'],
    ['unavailable-or-safety-concern', 'Unavailable, contraindicated or safety concern'],
  ], 'Before confirming: PCC—review HIT/heparin allergy, DIC and thrombosis risk; protamine—prior reaction/risk and resuscitation readiness; idarucizumab—hypersensitivity. Also verify current local product, restriction and protocol.'),
  field('vkaInr', 'Pre-treatment INR band?', [
    ['below-1-3', 'Below 1.3'],
    ['1-3-to-1-9', '1.3–1.9'],
    ['2-to-under-4', '2–<4'],
    ['4-to-6', '4–6'],
    ['over-6', '>6'],
  ], 'Use the pretreatment INR. Spontaneous intracerebral haemorrhage has a separate AHA lower-INR consideration.'),
  field('enoxaparinTiming', 'Time since the enoxaparin dose?', [
    ['under-8h', 'Less than 8 hours'],
    ['8-to-under-12h', '8 to under 12 hours'],
    ['12h-or-more', '12 hours or more'],
  ], 'Protamine only partially reverses enoxaparin. The exact enoxaparin dose must also be known.'),
  field('postActionCourse', 'Course after the first action?', [
    ['controlled', 'Bleeding controlled; no rebleed'],
    ['ongoing-or-rebleed', 'Ongoing bleeding / rebleed'],
    ['worsening-or-new-emergency', 'Worsening / new emergency feature'],
  ], 'Current deterioration overrides an earlier improvement or completed initial regimen.'),
  field('restartReview', 'Restart decision review complete?', [
    ['not-ready', 'Not ready — hemostasis/source plan incomplete'],
    ['individualized-review-recorded', 'Indication, thrombotic risk, rebleed risk and patient goals reviewed'],
  ], 'This records a review only. It does not select an anticoagulant, dose, bridge or restart time.'),
]);

const KNOWN_AGENTS = new Set(['vka', 'dabigatran', 'factor-xa', 'ufh', 'enoxaparin']);
const STAGE_ORDER = Object.freeze(['stabilize', 'classify', 'control', 'reverse', 'reassess', 'restart']);
const REGIMEN_ACTION_IDS = new Set([
  'vka-ich-lower-inr-initial-regimen',
  'vka-pcc-vitamin-k-initial-regimen',
  'dabigatran-idarucizumab-initial-regimen',
  'factor-xa-pcc-local-plan-initial-regimen',
  'ufh-protamine-initial-regimen',
  'enoxaparin-protamine-under-8h-initial-regimen',
  'enoxaparin-protamine-8-to-under-12h-initial-regimen',
]);

export function normalizeAnticoagulantBleeding(input = {}) {
  return Object.freeze(Object.fromEntries(ANTICOAG_BLEEDING_FIELDS.map(item => [
    item.key,
    item.options.some(([value]) => value === input?.[item.key]) ? input[item.key] : 'unknown',
  ])));
}

export function visibleFieldKeys(input = {}) {
  const values = normalizeAnticoagulantBleeding(input);
  const keys = ['phase', 'currentEmergency', 'bleedSeverity', 'agent', 'residualEffect'];
  const major = values.bleedSeverity === 'major';
  const known = KNOWN_AGENTS.has(values.agent);
  const likely = values.residualEffect === 'likely';

  if (major) keys.push('bleedSite', 'exposureDetails', 'sourceControl');
  if (values.phase === 'initial'
    && values.currentEmergency !== 'unknown'
    && major
    && sourceKnownForFields(values)
    && values.bleedSite !== 'acute-gi'
    && known
    && likely
    && values.exposureDetails === 'complete') {
    keys.push('initialActionExposure');
    if (values.initialActionExposure === 'not-given') {
      keys.push('productSafety');
      if (values.productSafety === 'eligible' && values.agent === 'vka') keys.push('vkaInr');
      if (values.productSafety === 'eligible' && values.agent === 'enoxaparin') keys.push('enoxaparinTiming');
    }
  }
  if (values.phase === 'after-initial-action') keys.push('initialActionExposure', 'postActionCourse');
  if (values.phase === 'restart-review') keys.push('sourceControl', 'postActionCourse', 'restartReview');
  return Object.freeze([...new Set(keys)]);
}

function sourceKnownForFields(values) {
  return ['intracranial', 'spinal-or-other-neurocritical', 'acute-gi', 'other-critical-or-uncontrolled', 'noncritical-major'].includes(values.bleedSite);
}

function add(actions, id, stage, title, summary, detail, source = acc, extra = {}) {
  actions.push(Object.freeze({
    id,
    stage,
    title,
    summary,
    detail,
    sourceLabel: source.label,
    sourceUrl: source.url,
    ...extra,
  }));
}

function initialGateAction(values, actions) {
  if (values.initialActionExposure === 'unknown') {
    add(actions, 'reconcile-initial-reversal-exposure', 'reverse', 'Confirm whether an initial reversal action was already given', 'Unknown prior exposure cannot safely yield a second “initial” dose.', 'Record the actual reversal/hemostatic agent, amount, route and time. Do not re-present a standard starting regimen until this is known.', acc, {tone: 'attention'});
    return false;
  }
  if (values.initialActionExposure === 'given') {
    add(actions, 'initial-reversal-already-given', 'reverse', 'Initial reversal is recorded: assess response, not a duplicate starting dose', 'Move to the after-action review with the actual agent, dose and time.', 'The guide never assumes that a prior agent can be repeated. Rebleeding needs fresh source-control, residual-effect and specialist review.', acc, {tone: 'attention'});
    return false;
  }
  if (values.productSafety === 'unknown') {
    add(actions, 'local-product-safety-gate-needed', 'reverse', 'Confirm the local product and agent-specific safety gate', 'A catalog item does not prove present stock, protocol approval, no contraindication or patient suitability.', 'Confirm the exact emergency product and product-specific warnings with the local bleeding/transfusion/hematology route before selecting a source regimen.', acc, {tone: 'attention'});
    return false;
  }
  if (values.productSafety === 'unavailable-or-safety-concern') {
    add(actions, 'local-product-safety-concern', 'reverse', 'Local product unavailable or safety concern: use the urgent specialist pathway', 'Do not substitute or combine reversal agents automatically.', 'Continue resuscitation and definitive haemostasis while the current local plan is confirmed. This is not a prescription.', acc, {tone: 'urgent'});
    return false;
  }
  return true;
}

function addVkaInitialActions(values, actions) {
  if (values.vkaInr === 'unknown') {
    add(actions, 'vka-pre-treatment-inr-needed', 'reverse', 'Reconcile the pretreatment INR before selecting a general PCC band', 'The displayed non-ICH 4F-PCC bands depend on the pretreatment INR.', 'For suspected anticoagulant-associated ICH, use the emergency stroke/neurosurgical route; the AHA guideline says rapid reversal should not wait for routine laboratory results, but this guide will not invent an INR-based dose.', values.bleedSite === 'intracranial' ? ahaIch : kcentra, {tone: 'attention', resourceGroup: 'vka-reversal'});
    return;
  }
  if (values.vkaInr === '1-3-to-1-9' && values.bleedSite === 'intracranial') {
    add(actions, 'vka-ich-lower-inr-initial-regimen', 'reverse', 'VKA ICH: 4F-PCC 10–20 IU/kg + IV vitamin K 5–10 mg', 'AHA/ASA 2022 gives a lower-INR spontaneous-ICH consideration; use the emergency ICH protocol and product-specific limits.', 'This is limited to anticoagulant-associated spontaneous intracranial haemorrhage. Review PCC HIT/heparin allergy, DIC and thrombosis risk. NTUH’s public formulary lists Beriplex P/N 500 four-factor PCC (BER1EB25) and phytonadione 10 mg/mL (KAT1EB04); neither listing proves stock or an order.', ahaIch, {tone: 'urgent', resourceGroup: 'vka-reversal'});
    return;
  }
  if (['2-to-under-4', '4-to-6', 'over-6'].includes(values.vkaInr)) {
    const dose = {
      '2-to-under-4': '25 U/kg · maximum 2,500 U',
      '4-to-6': '35 U/kg · maximum 3,500 U',
      'over-6': '50 U/kg · maximum 5,000 U',
    }[values.vkaInr];
    add(actions, 'vka-pcc-vitamin-k-initial-regimen', 'reverse', `Initial VKA reversal: 4F-PCC ${dose}`, 'Give IV vitamin K 5–10 mg with 4F-PCC for sustained VKA reversal; reassess haemostasis and INR.', 'KCENTRA labeling bases the dose on pretreatment INR and actual body weight capped at 100 kg, and does not recommend repeat dosing. Before selection, review HIT/heparin allergy, DIC and thrombosis risk. NTUH’s public formulary lists BER1EB25 (four-factor PCC) and KAT1EB04 (phytonadione 10 mg/mL). Verify the actual local product and administration protocol.', kcentra, {tone: 'urgent', resourceGroup: 'vka-reversal'});
    return;
  }
  add(actions, 'vka-no-general-pcc-band', 'reverse', 'No displayed general PCC band for this INR/site combination', 'Use the bleeding-site and current local emergency pathway rather than extrapolating a label band.', 'The 4F-PCC label bands displayed here begin at INR 2.0. Lower-INR ICH is a separate AHA pathway; non-ICH lower-INR decisions need specialist review.', kcentra, {resourceGroup: 'vka-reversal'});
}

function addDabigatranInitialActions(actions) {
  add(actions, 'dabigatran-idarucizumab-initial-regimen', 'reverse', 'Dabigatran: idarucizumab 5 g IV', 'Give two consecutive 2.5 g/50 mL vials; do not use this antidote for factor-Xa inhibitors.', 'PRAXBIND is indicated for dabigatran when reversal is needed for life-threatening or uncontrolled bleeding. Review hypersensitivity before selection. NTUH’s public formulary lists it as PRA1QB42, two 2.5 g/50 mL vials per box. Label support for an additional 5 g is limited; it is not a routine repeat.', praxbind, {tone: 'urgent', resourceGroup: 'dabigatran-reversal'});
}

function addFactorXaInitialActions(actions) {
  add(actions, 'factor-xa-pcc-local-plan-initial-regimen', 'reverse', 'Factor-Xa inhibitor: 4F-PCC 2,000 U under the current specialist plan', 'ACC 2020 describes fixed-dose 2,000 U 4F-PCC as a limited-evidence option for severe/life-threatening oral factor-Xa inhibitor bleeding.', 'Review PCC HIT/heparin allergy, DIC and thrombosis risk before selection. NTUH’s public formulary lists Beriplex P/N 500 four-factor PCC (BER1EB25); it is not a default order. Do not use an older andexanet schedule: FDA states U.S. sales ended on 22 December 2025 and Taiwan/NTUH availability or governance was not verified.', acc, {tone: 'urgent', resourceGroup: 'factor-xa-reversal'});
}

function addUfhInitialActions(actions) {
  add(actions, 'ufh-protamine-initial-regimen', 'reverse', 'UFH: protamine 1 mg per 100 units of residual heparin', 'Give very slowly IV over 10 minutes; do not exceed 50 mg in a 10-minute period.', 'Calculate against actual heparin units and elapsed time; the required dose falls rapidly after UFH stops. Review prior protamine reaction, NPH/protamine exposure and infusion risk; resuscitation must be available. NTUH’s public formulary lists protamine 50 mg/5 mL (PRF1QB08).', protamine, {tone: 'urgent', resourceGroup: 'heparin-reversal'});
}

function addEnoxaparinInitialActions(values, actions) {
  if (values.enoxaparinTiming === 'unknown') {
    add(actions, 'enoxaparin-time-window-needed', 'reverse', 'Confirm the enoxaparin time window before selecting a protamine amount', 'Protamine dosing and likely benefit differ before and after 8 hours.', 'Record the exact enoxaparin mg dose and time. Protamine only partly neutralizes anti-Xa activity.', enoxaparin, {tone: 'attention', resourceGroup: 'heparin-reversal'});
    return;
  }
  if (values.enoxaparinTiming === 'under-8h') {
    add(actions, 'enoxaparin-protamine-under-8h-initial-regimen', 'reverse', 'Enoxaparin <8 h: protamine 1 mg per 1 mg enoxaparin', 'Use the exact preceding enoxaparin dose; give very slowly IV over 10 minutes and do not exceed 50 mg in a 10-minute period.', 'Protamine incompletely reverses enoxaparin anti-Xa activity. Review prior protamine reaction, NPH/protamine exposure and infusion risk; resuscitation must be available. NTUH’s public formulary lists protamine 50 mg/5 mL (PRF1QB08).', enoxaparin, {tone: 'urgent', resourceGroup: 'heparin-reversal'});
    return;
  }
  if (values.enoxaparinTiming === '8-to-under-12h') {
    add(actions, 'enoxaparin-protamine-8-to-under-12h-initial-regimen', 'reverse', 'Enoxaparin 8–<12 h: protamine 0.5 mg per 1 mg enoxaparin', 'Use the exact preceding enoxaparin dose; give very slowly IV over 10 minutes and do not exceed 50 mg in a 10-minute period.', 'The enoxaparin label permits this timing-based calculation and warns that even higher protamine doses do not completely neutralize anti-Xa activity. Review prior protamine reaction, NPH/protamine exposure and infusion risk.', enoxaparin, {tone: 'urgent', resourceGroup: 'heparin-reversal'});
    return;
  }
  add(actions, 'enoxaparin-12h-or-more-no-routine-protamine', 'reverse', 'Enoxaparin ≥12 h: protamine may not be required', 'Do not create a routine protamine dose; reassess residual effect, renal function and current bleeding with the treating team.', 'The label notes incomplete reversal even when protamine is used. Ongoing severe bleeding still requires source-control and specialist review.', enoxaparin, {resourceGroup: 'heparin-reversal'});
}

function addAfterActionReview(values, actions) {
  if (values.initialActionExposure === 'unknown') {
    add(actions, 'after-action-reconcile-exposure', 'reassess', 'Reconcile what treatment was actually given', 'A response review is unreliable without the initial agent, amount and time.', 'Do not infer that a reversal was given because a medication appears in an order set or a prior note.', acc, {tone: 'attention'});
  } else if (values.initialActionExposure === 'not-given') {
    add(actions, 'after-action-without-initial-reversal', 'reassess', 'No initial reversal is recorded: reconcile the review point', 'If a new reversal decision is still needed, return to the initial assessment with current findings; this response lane does not generate a late copy of an initial regimen.', 'Continue source-control and reassess the exact anticoagulant, timing and residual effect. Escalate a changing major bleed.', acc, {tone: 'attention'});
  }
  if (values.postActionCourse === 'unknown') {
    add(actions, 'after-action-course-needed', 'reassess', 'Document the current bleeding course', 'Unknown response cannot establish haemostasis or restart readiness.', 'Reassess current vital signs/perfusion, bleed source, haemoglobin trajectory, agent-appropriate testing and imaging or procedural findings as indicated.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    return;
  }
  if (values.postActionCourse === 'controlled' && values.currentEmergency !== 'no') {
    add(actions, 'controlled-course-conflicts-with-current-emergency', 'reassess', 'Reconcile “controlled” with current emergency status', 'Current emergency physiology overrides a stale controlled-course selection.', 'Repeat the immediate safety and source-control assessment. Do not enter a recovery or restart route until current emergency features are assessed absent.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
    return;
  }
  if (values.postActionCourse === 'controlled') {
    add(actions, 'after-action-controlled-monitoring', 'reassess', 'Bleeding controlled: continue surveillance and source plan', 'Control after a first action is not an automatic anticoagulant restart.', 'Record haemostasis, relevant trend/testing, source-control completion and thrombotic surveillance. Select the separate restart-review lane only when clinically appropriate.', acc, {resourceGroup: 'bleeding-evaluation'});
    return;
  }
  if (values.postActionCourse === 'ongoing-or-rebleed') {
    add(actions, 'ongoing-or-rebleed-urgent-reassessment', 'reassess', 'Ongoing bleeding / rebleed: reopen the emergency assessment', 'Reassess source control, actual prior reversal exposure and clinically relevant residual anticoagulant effect.', 'Do not automatically repeat the displayed initial PCC, idarucizumab or protamine regimen. A repeat strategy requires current specialist and product review.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
    if (values.agent === 'dabigatran') {
      add(actions, 'dabigatran-repeat-not-routine', 'reassess', 'Do not repeat idarucizumab automatically', 'The label only describes a possible additional 5 g with recurrent clinically relevant bleeding plus elevated coagulation parameters, or another emergency procedure.', 'This is not a standing repeat schedule. Confirm dabigatran effect, the initial dose/time, bleeding source and specialist recommendation.', praxbind, {tone: 'attention', resourceGroup: 'dabigatran-reversal'});
    }
    return;
  }
  add(actions, 'worsening-after-action-emergency-route', 'reassess', 'Worsening after treatment: urgent emergency escalation', 'A new emergency feature overrides an earlier response or completed initial regimen.', 'Treat ABC compromise and definitive haemostasis in parallel. Re-establish the exact current agent/time/exposure before any subsequent reversal decision.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
}

function addRestartReview(values, actions) {
  if (values.currentEmergency !== 'no' || values.bleedSeverity !== 'major' || values.sourceControl !== 'controlled' || values.postActionCourse !== 'controlled') {
    add(actions, 'restart-review-not-ready', 'restart', 'Restart review is not ready', 'Current emergency, unconfirmed haemostasis, uncontrolled source or unresolved course prevents a restart decision.', 'Continue current bleeding care. This guide does not create a temporary anticoagulant, bridge, dose or restart date.', acc, {tone: 'attention'});
    return;
  }
  if (values.restartReview === 'unknown') {
    add(actions, 'restart-review-components-needed', 'restart', 'Complete the individualized restart decision review', 'Review the indication, thrombotic risk, rebleed risk/site, source correction, concurrent medicines, renal function and patient goals.', 'No universal restart interval is emitted. Acute GI guidance could not recommend a same-day versus 1–7-day restart time after elective endoscopy, and this is not an automatic restart protocol.', acgCag, {tone: 'attention'});
    return;
  }
  if (values.restartReview === 'not-ready') {
    add(actions, 'restart-review-deferred', 'restart', 'Restart decision deferred while the source/hemostasis plan is incomplete', 'Document the owner and review point; do not infer that holding therapy indefinitely is appropriate.', 'The anticoagulant indication and thrombosis risk remain relevant after reversal. Revisit only after current bleeding and source-control questions are resolved.', acc, {tone: 'attention'});
    return;
  }
  add(actions, 'restart-review-recorded-no-order', 'restart', 'Individualized restart review recorded', 'A completed review does not select an anticoagulant, dose, bridge or time to restart.', 'The decision must remain tied to the indication, thrombotic and rebleed risks, bleed site/source, concurrent medicines, renal function and patient goals. Record the responsible clinician and follow-up plan.', acc);
}

export function evaluate(input = {}) {
  const values = normalizeAnticoagulantBleeding(input);
  const actions = [];
  const major = values.bleedSeverity === 'major';
  const knownAgent = KNOWN_AGENTS.has(values.agent);
  const sourceKnown = ['intracranial', 'spinal-or-other-neurocritical', 'acute-gi', 'other-critical-or-uncontrolled', 'noncritical-major'].includes(values.bleedSite);
  const genericInitialEligible = values.phase === 'initial'
    && values.currentEmergency !== 'unknown'
    && major
    && sourceKnown
    && values.bleedSite !== 'acute-gi'
    && knownAgent
    && values.residualEffect === 'likely'
    && values.exposureDetails === 'complete';
  const urgent = values.currentEmergency === 'yes'
    || values.postActionCourse === 'worsening-or-new-emergency';

  if (values.currentEmergency === 'unknown') {
    add(actions, 'bleeding-emergency-screen', 'stabilize', 'Assess current bleeding emergency features', 'Unknown emergency status cannot support a nonurgent or restart route.', 'Check airway, breathing, circulation, consciousness, active blood loss, focal neurology, shock/perfusion and need for urgent procedural support.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
  }
  if (urgent) {
    add(actions, 'bleeding-emergency-escalation', 'stabilize', 'Immediate bleeding emergency: resuscitate and escalate now', 'Support ABCs, obtain urgent senior/procedural/transfusion support and control the source in parallel.', 'Do not wait to complete every review field before emergency care. Anticoagulant reversal, if appropriate, must not delay definitive haemostasis.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
  }
  if (values.postActionCourse === 'worsening-or-new-emergency' && values.phase !== 'after-initial-action') {
    add(actions, 'worsening-after-action-emergency-route', 'reassess', 'Worsening after treatment: urgent emergency escalation', 'A new emergency feature overrides an earlier response or completed initial regimen.', 'Treat ABC compromise and definitive haemostasis in parallel. Re-establish the exact current agent/time/exposure before any subsequent reversal decision.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
  }

  if (values.phase === 'unknown') {
    add(actions, 'bleeding-select-review-point', 'classify', 'Choose initial assessment, after-action review or restart review', 'The current point determines whether an initial regimen, response assessment or later decision review can be shown.', 'A previous reversal or an earlier controlled episode does not establish the current phase.', acc, {tone: 'attention'});
  }
  if (values.bleedSeverity === 'unknown') {
    add(actions, 'bleeding-classify-severity', 'classify', 'Classify bleeding severity before selecting reversal', 'Unknown severity does not establish a major-bleed reversal indication.', 'Major bleeding includes a critical site, haemodynamic instability, haemoglobin decrease at least 2 g/dL, or transfusion of at least 2 RBC units.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
  } else if (values.bleedSeverity === 'no-active-bleed') {
    add(actions, 'bleeding-route-alternative-problem', 'classify', 'No active bleeding established: use the relevant alternate pathway', 'Do not create a reversal action from a historic anticoagulant alone.', 'Reassess if new bleeding appears; an anticoagulant history still requires medication reconciliation for another procedure or diagnosis.', acc, {resourceGroup: 'bleeding-evaluation'});
  } else if (values.bleedSeverity === 'nonmajor') {
    if (values.currentEmergency === 'no') {
      add(actions, 'nonmajor-local-control-no-routine-reversal', 'control', 'Nonmajor bleed: local control; no routine reversal card', 'Use local measures and an individualized temporary-hold decision rather than routine PCC, idarucizumab or protamine.', 'ACC 2020 does not support routine OAC reversal for nonmajor bleeding. Continue to reassess if severity, source or haemodynamics changes.', acc, {resourceGroup: 'bleeding-evaluation'});
    } else if (values.currentEmergency === 'yes') {
      add(actions, 'nonmajor-emergency-contradiction', 'classify', 'Reconcile “nonmajor” with current emergency physiology', 'Emergency features may mean the bleed severity or another diagnosis has been under-classified.', 'Do not use the nonmajor route as reassurance while shock, airway risk, neurologic change or ongoing major blood loss is present.', acc, {tone: 'urgent'});
    } else {
      add(actions, 'nonmajor-route-gated-by-emergency-status', 'classify', 'Assess current emergency status before using the nonmajor route', 'Unknown emergency status suppresses the routine local-control card.', 'Complete immediate safety assessment first; reclassify bleeding if current physiology or source suggests a major bleed.', acc, {tone: 'attention'});
    }
  }

  if (major) {
    if (!sourceKnown) {
      add(actions, 'major-bleed-site-needed', 'classify', 'Identify the major-bleed setting before a generic reversal card', 'Separate intracranial haemorrhage, spinal/neurocritical and acute GI bleeding from other major bleeding.', 'Site-specific guideline qualifications affect whether a generic reversal regimen is appropriate; unknown is not a generic route.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    }
    if (values.bleedSite === 'intracranial') {
      add(actions, 'anticoagulated-ich-urgent-route', 'control', 'Suspected anticoagulant-associated ICH: urgent neuro route', 'Stop anticoagulation, activate emergency neuroimaging/stroke/neurosurgical care, and plan rapid agent-specific reversal.', 'AHA/ASA 2022 states rapid reversal should occur as soon as possible after anticoagulant-associated spontaneous ICH is diagnosed. Agent type and timing matter; do not wait for routine coagulation results to begin the emergency pathway.', ahaIch, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
    }
    if (values.bleedSite === 'spinal-or-other-neurocritical') {
      add(actions, 'spinal-neurocritical-urgent-route', 'control', 'Spinal / neurocritical bleed: urgent specialty route', 'Stop anticoagulation, activate urgent specialty assessment and control the source while reconciling agent-specific reversal.', 'Do not apply the AHA spontaneous-ICH lower-INR PCC card to a spinal or other neurocritical bleed without a setting-specific protocol.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
    }
    if (values.bleedSite === 'acute-gi') {
      add(actions, 'acute-gi-bleed-reversal-qualification', 'control', 'Acute GI bleed: use the GI-specific reversal decision', 'Do not apply the general ACC vitamin K, idarucizumab or factor-Xa/PCC cards routinely to acute GI bleeding.', 'ACG/CAG 2022 conditionally suggests against routine vitamin K, idarucizumab and DOAC PCC in hospitalized/observed acute GI bleeding. It could not recommend for or against warfarin PCC, while suggesting PCC rather than FFP if PCC is used. Coordinate GI, hematology/transfusion and source control for life-threatening exceptions.', acgCag, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    }
    if (values.sourceControl === 'unknown') {
      add(actions, 'major-bleed-source-control-status-needed', 'control', 'Confirm resuscitation and definitive source-control status', 'Reversal does not replace endoscopic, interventional, surgical or other definitive haemostasis.', 'Record the current source-control owner and whether bleeding is ongoing. Do not delay emergency support while this is being clarified.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    } else if (values.sourceControl === 'controlled' && (values.currentEmergency !== 'no' || values.postActionCourse === 'worsening-or-new-emergency')) {
      add(actions, 'controlled-source-conflicts-with-current-emergency', 'control', 'Reconcile “controlled source” with current emergency or worsening status', 'An unknown/present emergency feature or worsening course overrides a stale controlled-source selection.', 'Repeat the source-control and perfusion assessment; do not enter surveillance or restart framing until current emergency features are assessed absent and the current course is controlled.', acc, {tone: values.currentEmergency === 'yes' || values.postActionCourse === 'worsening-or-new-emergency' ? 'urgent' : 'attention', resourceGroup: 'bleeding-evaluation'});
    } else {
      add(actions, 'major-bleed-source-control-parallel', 'control', values.sourceControl === 'controlled' ? 'Continue source-control surveillance' : 'Continue resuscitation and source control in parallel', values.sourceControl === 'controlled' ? 'A controlled source still needs trend and thrombotic-risk review.' : 'Do not let reversal delay definitive haemostasis.', 'Track haemodynamics, bleeding, haemoglobin/testing and procedure/imaging findings according to the bleed setting. A treatment card is not a transfusion or source-control order.', acc, {resourceGroup: 'bleeding-evaluation'});
    }

    if (!knownAgent) {
      if (values.agent === 'other-or-multiple') {
        add(actions, 'mixed-anticoagulant-specialist-route', 'reverse', 'Other or multiple anticoagulants: no automatic combination reversal', 'Confirm each agent and seek the current hematology/transfusion/toxicology plan.', 'Do not treat a mixed, direct-thrombin, factor-Xa, heparin, fondaparinux or antiplatelet exposure as interchangeable.', acc, {tone: 'urgent', resourceGroup: 'bleeding-evaluation'});
      } else if (values.agent === 'no-anticoagulant') {
        add(actions, 'no-anticoagulant-reversal-route', 'reverse', 'No anticoagulant exposure established: assess other coagulopathy/cause', 'Do not select an anticoagulant antidote without exposure.', 'Continue source control and investigate other causes of impaired haemostasis as clinically indicated.', acc, {resourceGroup: 'bleeding-evaluation'});
      } else {
        add(actions, 'major-bleed-agent-needed', 'reverse', 'Reconcile the exact anticoagulant before selecting reversal', 'Unknown agent cannot safely yield a VKA, dabigatran, factor-Xa or heparin regimen.', 'Check medication administration, patient/family history, outside records, indication, last dose/time and relevant renal or liver context without delaying emergency support.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
      }
    } else if (values.residualEffect === 'unknown') {
      add(actions, 'major-bleed-residual-effect-needed', 'reverse', 'Assess whether a clinically relevant anticoagulant effect remains', 'Unknown timing/clearance is not a negative exposure finding.', 'Use agent-appropriate history and testing where available. PT/INR alone does not exclude a clinically important factor-Xa inhibitor effect.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    } else if (values.residualEffect === 'unlikely') {
      add(actions, 'major-bleed-no-assumed-reversal-after-clearance', 'reverse', 'Residual effect unlikely: do not reverse a historical medication automatically', 'Continue source control and reassess if drug timing, kidney function, assay or bleeding trajectory changes.', 'A clinical judgement that residual effect is unlikely must be based on reconciled agent, dose, last time and clearance context.', acc, {resourceGroup: 'bleeding-evaluation'});
    } else if (values.exposureDetails !== 'complete') {
      add(actions, 'major-bleed-exposure-details-needed', 'reverse', 'Complete exact dose/time and clearance reconciliation', 'Likely residual effect without an exact exposure history does not unlock a dose card.', 'For UFH and enoxaparin, calculate against actual units/mg and elapsed time. For DOACs, verify exact drug, dose, last administration and renal context.', acc, {tone: 'attention', resourceGroup: 'bleeding-evaluation'});
    } else if (values.phase === 'initial' && values.currentEmergency === 'unknown') {
      add(actions, 'initial-regimen-gated-by-current-emergency-status', 'reverse', 'Confirm current emergency status before selecting an initial regimen', 'Unknown current instability cannot yield a treatment card.', 'Continue immediate assessment and source control. Once current emergency status is assessed, use the initial review with the exact agent, exposure and bleed setting.', acc, {tone: 'attention'});
    } else if (genericInitialEligible) {
      if (initialGateAction(values, actions)) {
        if (values.agent === 'vka') addVkaInitialActions(values, actions);
        if (values.agent === 'dabigatran') addDabigatranInitialActions(actions);
        if (values.agent === 'factor-xa') addFactorXaInitialActions(actions);
        if (values.agent === 'ufh') addUfhInitialActions(actions);
        if (values.agent === 'enoxaparin') addEnoxaparinInitialActions(values, actions);
      }
    }
  }

  if (values.phase === 'after-initial-action') addAfterActionReview(values, actions);
  if (values.phase === 'restart-review') addRestartReview(values, actions);

  actions.sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage));
  const entry = urgent
    ? {status: 'urgent', title: 'Current bleeding emergency', summary: 'Current emergency physiology overrides a prior response or restart discussion.', source: acc}
    : values.bleedSeverity === 'major'
      ? {status: 'met', title: 'Major-bleed review', summary: 'Agent, residual effect, bleed setting and current treatment phase determine the next review.', source: acc}
      : values.bleedSeverity === 'nonmajor'
        ? {status: 'met', title: 'Nonmajor-bleed review', summary: 'Local control and current reassessment take priority over routine reversal.', source: acc}
        : values.bleedSeverity === 'no-active-bleed'
          ? {status: 'notmet', title: 'Anticoagulant-bleeding route not established', summary: 'A historical anticoagulant does not establish active bleeding or a reversal indication.', source: acc}
          : {status: 'unknown', title: 'Confirm current bleeding severity', summary: 'Unknown findings do not establish a reversal, response or restart route.', source: acc};

  return Object.freeze({
    values,
    entry: Object.freeze(entry),
    actions: Object.freeze(actions),
    visibleStageIds: Object.freeze(STAGE_ORDER.filter(stage => actions.some(action => action.stage === stage))),
    gaps: Object.freeze(visibleFieldKeys(values).filter(key => values[key] === 'unknown')),
    withheld: Object.freeze([]),
    stageNotes: Object.freeze({}),
  });
}

export const config = Object.freeze({
  id: 'anticoagulant-bleeding',
  title: 'Anticoagulant-Related Bleeding',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · focused reversal and reassessment review',
  scope: 'Adult anticoagulant-related bleeding triage, agent-specific initial-regimen review, response/rebleed review and individualized restart-decision review. It is not an order set, stock check, transfusion protocol, procedure plan, automatic restart protocol or authorization.',
  fields: ANTICOAG_BLEEDING_FIELDS,
  visibleFieldKeys,
  evaluate,
  conflictActionIds: Object.freeze(['nonmajor-emergency-contradiction']),
  sources: ANTICOAG_BLEEDING_SOURCES,
  reviewLimitations: Object.freeze([
    'ACC 2020 is the broad oral-anticoagulant pathway source. FDA’s December 2025 safety/availability communication means its historical andexanet regimen is not emitted; Taiwan/NTUH availability and governance were not verified.',
    'Acute GI bleeding is deliberately routed to ACG/CAG 2022 qualifications, which conditionally advise against several routine reversal approaches. Intracranial haemorrhage is routed to the AHA/ASA 2022 emergency pathway; spinal and other neurocritical bleeding require their own urgent route.',
    'NTUH public formulary codes are references only: BER1EB25 (Beriplex four-factor PCC), KAT1EB04 (phytonadione), PRA1QB42 (idarucizumab) and PRF1QB08 (protamine). They do not establish current stock, restriction, orderability or patient suitability.',
    'No automatic anticoagulant restart, bridging strategy, transfusion plan, antiplatelet reversal, trauma/massive-haemorrhage, pregnancy, cardiac-surgery, HIT, fondaparinux or procedure-specific protocol is implemented.',
  ]),
  stages: Object.freeze([
    {id: 'stabilize', title: 'Current safety'},
    {id: 'classify', title: 'Bleed and agent'},
    {id: 'control', title: 'Source control'},
    {id: 'reverse', title: 'Reversal review'},
    {id: 'reassess', title: 'Response / rebleed'},
    {id: 'restart', title: 'Later decision review'},
  ]),
  quickReference: Object.freeze({
    summary: 'Stabilize, classify severity/site and exact exposure, control the source, then review any reversal and later restart decision separately.',
    recognition: Object.freeze([
      'Major bleeding: critical site, haemodynamic instability, haemoglobin fall ≥2 g/dL, or ≥2 RBC units.',
      'Exact agent, dose, last time and clearance context determine whether a residual effect is plausible.',
    ]),
    redFlags: Object.freeze([
      'Airway/ABC compromise, shock, ongoing major blood loss, impaired consciousness or focal neurology.',
      'Intracranial haemorrhage, spinal/neurocritical bleeding and acute GI bleeding require source-specific routes; do not use a generic card without the setting.',
    ]),
    steps: Object.freeze([
      {role: 'Stabilize', text: 'Support ABCs and control the bleeding source in parallel.'},
      {role: 'Reconcile', text: 'Confirm exact anticoagulant, dose, last time, clearance and whether any reversal was already given.'},
      {role: 'Reassess', text: 'Ongoing bleeding/rebleed needs a new specialist review; a later restart decision is individualized.'},
    ]),
    monitoring: Object.freeze([
      'Reassess haemodynamics, bleeding, haemoglobin/testing and source-control findings at a defined review point.',
      'Monitor for thrombosis after reversal; do not infer a restart agent, dose or time from this guide.',
    ]),
    sources: ANTICOAG_BLEEDING_SOURCES,
  }),
  regimenActionIds: Object.freeze([...REGIMEN_ACTION_IDS]),
});

export default config;
