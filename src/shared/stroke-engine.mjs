// Source-reviewed, data-only support for adult acute focal-neurologic deficit.
// This module is deliberately limited to current-findings review, stroke-team
// escalation and source-linked local references. It never diagnoses stroke,
// establishes reperfusion eligibility, calculates a dose, or writes to a
// clinical system.

export const AHA_ASA_AIS_2026_SOURCE = 'https://www.ahajournals.org/doi/10.1161/STR.0000000000000513';
export const AHA_ASA_AIS_2026_CORRECTION_SOURCE = 'https://www.ahajournals.org/doi/10.1161/STR.0000000000000530';
export const AHA_ASA_ICH_2022_SOURCE = 'https://www.ahajournals.org/doi/10.1161/STR.0000000000000407';

const ais2026 = Object.freeze({
  label: '2026 AHA/ASA adult acute ischemic stroke guideline',
  url: AHA_ASA_AIS_2026_SOURCE,
});
const ais2026Correction = Object.freeze({
  label: 'Correction to the 2026 AHA/ASA acute ischemic stroke guideline',
  url: AHA_ASA_AIS_2026_CORRECTION_SOURCE,
});
const ich2022 = Object.freeze({
  label: '2022 AHA/ASA spontaneous intracerebral hemorrhage guideline',
  url: AHA_ASA_ICH_2022_SOURCE,
});

const STAGE_ORDER = Object.freeze(['activate', 'classify', 'image', 'reperfusion', 'reassess']);

function option(value, label) {
  return Object.freeze([value, label]);
}

function field(key, label, options, extra = {}) {
  return Object.freeze({
    key,
    label,
    options: Object.freeze(options.map(([value, optionLabel]) => option(value, optionLabel))),
    ...extra,
  });
}

export const STROKE_FIELDS = Object.freeze([
  field('reviewPhase', 'Review phase', [
    ['unknown', 'Not selected'],
    ['initial-evaluation', 'Initial stroke-code evaluation'],
    ['after-acute-action', 'After an acute intervention / transfer decision'],
  ], {
    essential: 'Initial evaluation and reassessment answer different questions. A new danger finding overrides either phase.',
  }),
  field('currentDanger', 'Immediate danger now?', [
    ['unknown', 'Not fully assessed'],
    ['present', 'Present — declining consciousness, airway/breathing/circulation problem, seizure, or rapidly worsening deficit'],
    ['not-present-after-assessment', 'No immediate danger after assessment'],
  ], {
    threshold: 'Do not wait for imaging, timing, or a completed form before escalating an emergency.',
  }),
  field('focalPresentation', 'Current focal-neurologic concern?', [
    ['unknown', 'Not fully assessed'],
    ['present-or-stroke-concern', 'Present / possible acute stroke or focal deficit'],
    ['alternative-likely-after-assessment', 'Alternative explanation currently more likely after assessment'],
  ], {
    threshold: 'This is a routing finding, not a diagnosis. A competing explanation does not erase a changing focal deficit.',
  }),
  field('lastKnownWell', 'Last-known-well context', [
    ['unknown', 'Exact time not reconciled'],
    ['within-4-5-hours', 'Within 4.5 hours'],
    ['unknown-onset-or-4-5-to-9-hours', 'Unknown onset / wake-up stroke, or 4.5–9 hours'],
    ['known-more-than-9-hours', 'Known more than 9 hours'],
  ], {
    threshold: 'Use the last time known well, not the time symptoms were noticed. A time category does not by itself rule in or rule out advanced-imaging or EVT review.',
  }),
  field('mimicStatus', 'Glucose / mimic review?', [
    ['unknown', 'Not fully assessed'],
    ['hypoglycemia-or-reversible-mimic-present', 'Hypoglycemia or another reversible mimic present / being corrected'],
    ['not-identified-after-assessment', 'No reversible mimic identified after assessment'],
    ['alternative-explanation-likely', 'Alternative explanation likely after assessment'],
  ], {
    threshold: 'Correcting a mimic and assessing a possible stroke can proceed in parallel. Resolution must be observed; it is never inferred.',
  }),
  field('brainImaging', 'Initial brain imaging result?', [
    ['unknown', 'Not obtained / pending / not reconciled'],
    ['no-hemorrhage-on-initial-imaging', 'No hemorrhage on initial imaging'],
    ['hemorrhage-confirmed', 'Hemorrhage confirmed'],
    ['other-urgent-or-indeterminate-finding', 'Other urgent or indeterminate finding'],
  ], {
    threshold: 'Initial imaging status is not a complete etiologic diagnosis. Hemorrhage, indeterminate imaging, and no hemorrhage use different pathways.',
  }),
  field('deficitImpact', 'Current deficit impact?', [
    ['unknown', 'Not fully assessed'],
    ['disabling-after-assessment', 'Disabling after assessment'],
    ['nondisabling-after-assessment', 'Nondisabling after assessment'],
    ['resolved-or-no-current-focal-deficit', 'Resolved / no current focal deficit after assessment'],
  ], {
    threshold: 'NIHSS alone does not decide whether a deficit is disabling; assess the individual patient and current function.',
  }),
  field('vascularStatus', 'Vascular / EVT route?', [
    ['unknown', 'Not fully assessed'],
    ['not-yet-obtained-or-pending', 'Vascular imaging not yet obtained / pending'],
    ['lvo-or-posterior-circulation-occlusion-concern', 'LVO or posterior-circulation occlusion concern'],
    ['no-target-identified-after-review', 'No target identified after current review'],
  ], {
    threshold: 'Vascular imaging and EVT capability need stroke-team interpretation. A single brain CTA does not establish a complete head-and-neck CTA, perfusion, MRI or thrombectomy pathway.',
  }),
  field('ivtEligibilityReview', 'IV-thrombolysis review?', [
    ['unknown', 'Not fully reviewed'],
    ['unresolved-or-concern-present', 'Unresolved item or concern present'],
    ['stroke-team-screen-complete-no-barrier-recorded', 'Stroke-team screen complete; no barrier documented'],
  ], {
    threshold: 'No selection here clears a patient. The stroke team must still make the final treatment decision from the current examination, imaging, timing, BP, medicines, relevant tests and local protocol.',
  }),
  field('reperfusionExposure', 'Actual reperfusion exposure?', [
    ['unknown', 'Not reconciled'],
    ['none-confirmed', 'No IV thrombolytic or EVT exposure confirmed'],
    ['iv-thrombolytic-started-or-completed', 'IV thrombolytic started / completed; agent and time reconciled'],
    ['endovascular-pathway-active-or-completed', 'EVT transfer / procedure active or completed; details reconciled'],
    ['both-or-transfer-pathway-active', 'Both exposures or transfer pathway active; details reconciled'],
    ['uncertain-or-multiple-exposure', 'Exposure, agent, time, or sequence uncertain'],
  ], {
    threshold: 'Record actual agent/procedure, time, route, transfer status and response. Never infer an untreated state or repeat an initial treatment from a stale phase.',
  }),
  field('bpPathway', 'Current BP pathway?', [
    ['unknown', 'Not reconciled'],
    ['pre-ivt-or-evt-plan-reviewed', 'Pre-reperfusion stroke-team plan reviewed'],
    ['post-reperfusion-plan-reviewed', 'Post-reperfusion plan reviewed'],
    ['nonreperfusion-ischemic-plan-reviewed', 'Nonreperfusion ischemic-stroke plan reviewed'],
    ['ich-plan-reviewed', 'ICH / neurocritical-care plan reviewed'],
    ['conflict-or-unresolved', 'Conflict or unresolved plan'],
  ], {
    threshold: 'BP targets are phase- and syndrome-specific. Do not import a generic severe-BP target while imaging or reperfusion status remains unresolved.',
  }),
  field('postActionResponse', 'Current response after acute action?', [
    ['unknown', 'Not reconciled'],
    ['not-yet-assessed', 'Not yet assessed in the response window'],
    ['stable-or-improving', 'Stable / improving after reassessment'],
    ['worse-neurology-or-bleeding-concern', 'New/worse neurologic finding or bleeding concern'],
    ['bp-or-other-adverse-concern', 'BP / other adverse-treatment concern'],
  ], {
    threshold: 'A response is observed after a known intervention. It never authorizes a repeat initial treatment.',
  }),
]);

const VALID_VALUES = Object.freeze(Object.fromEntries(
  STROKE_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));
const CORE_FIELD_KEYS = Object.freeze(['reviewPhase', 'currentDanger', 'focalPresentation']);

export function normalizeStroke(input = {}) {
  return Object.freeze(Object.fromEntries(STROKE_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ])));
}

function noHemorrhage(values) {
  return values.brainImaging === 'no-hemorrhage-on-initial-imaging';
}

function currentStrokeConcern(values) {
  return values.currentDanger === 'not-present-after-assessment'
    && values.focalPresentation === 'present-or-stroke-concern';
}

function activeDeficit(values) {
  return ['disabling-after-assessment', 'nondisabling-after-assessment'].includes(values.deficitImpact);
}

function hasReperfusionExposure(values) {
  return [
    'iv-thrombolytic-started-or-completed',
    'endovascular-pathway-active-or-completed',
    'both-or-transfer-pathway-active',
  ].includes(values.reperfusionExposure);
}

function hasIvExposure(values) {
  return ['iv-thrombolytic-started-or-completed', 'both-or-transfer-pathway-active']
    .includes(values.reperfusionExposure);
}

function extendedIvtTiming(values) {
  return values.lastKnownWell === 'unknown-onset-or-4-5-to-9-hours';
}

export function visibleFieldKeys(input = {}) {
  const values = normalizeStroke(input);
  const afterAction = values.reviewPhase === 'after-acute-action';
  const postActionFields = (base = CORE_FIELD_KEYS) => Object.freeze([...new Set([
    ...base, 'reperfusionExposure', 'postActionResponse',
    ...(hasReperfusionExposure(values) ? ['bpPathway'] : []),
  ])]);
  if (values.currentDanger !== 'not-present-after-assessment') {
    return afterAction ? postActionFields() : CORE_FIELD_KEYS;
  }
  if (values.focalPresentation !== 'present-or-stroke-concern') {
    return afterAction ? postActionFields() : CORE_FIELD_KEYS;
  }

  const fields = [
    ...CORE_FIELD_KEYS,
    'lastKnownWell',
    'mimicStatus',
    'brainImaging',
  ];
  if (values.brainImaging === 'hemorrhage-confirmed') {
    fields.push('bpPathway');
    return afterAction ? postActionFields(fields) : Object.freeze(fields);
  }
  if (!noHemorrhage(values)) return afterAction ? postActionFields(fields) : Object.freeze(fields);

  fields.push('deficitImpact');
  if (!activeDeficit(values)) return afterAction ? postActionFields(fields) : Object.freeze(fields);

  fields.push('vascularStatus', 'reperfusionExposure', 'bpPathway');
  if (values.deficitImpact === 'disabling-after-assessment') fields.push('ivtEligibilityReview');
  if (values.reviewPhase === 'after-acute-action' && hasReperfusionExposure(values)) fields.push('postActionResponse');
  return afterAction ? postActionFields(fields) : Object.freeze(fields);
}

function action(id, stage, title, summary, detail, source = ais2026, extra = {}) {
  return Object.freeze({
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...extra,
  });
}

function sortActions(actions) {
  return actions.sort((left, right) => STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage));
}

function gapsFor(values) {
  const visible = visibleFieldKeys(values);
  return Object.freeze(visible
    .filter(key => values[key] === 'unknown')
    .map(key => STROKE_FIELDS.find(item => item.key === key).label));
}

function entryFor(values) {
  if (['worse-neurology-or-bleeding-concern', 'bp-or-other-adverse-concern'].includes(values.postActionResponse)) {
    return Object.freeze({
      title: 'Post-action complication concern is entered',
      summary: 'Urgently reassess with the stroke/neurocritical-care team; a stale danger or focal-deficit field does not downgrade this finding.',
      status: 'urgent',
      source: ais2026,
    });
  }
  if (values.currentDanger === 'present') {
    return Object.freeze({
      title: 'Immediate neurologic emergency is entered',
      summary: 'Activate the stroke-team/emergency pathway now. Do not wait for timing, imaging, or a completed form.',
      status: 'urgent',
      source: ais2026,
    });
  }
  if (values.brainImaging === 'hemorrhage-confirmed') {
    return Object.freeze({
      title: 'Hemorrhage-confirmed route',
      summary: 'Use the ICH/neurocritical-care pathway; do not apply acute-ischemic-stroke reperfusion or BP branches.',
      status: 'urgent',
      source: ich2022,
    });
  }
  if (values.currentDanger === 'unknown') {
    return Object.freeze({
      title: 'Immediate-danger screen is incomplete',
      summary: 'Unknown danger status cannot be treated as a stable stroke-code presentation.',
      status: 'unknown',
      source: ais2026,
    });
  }
  if (values.focalPresentation !== 'present-or-stroke-concern') {
    return Object.freeze({
      title: values.focalPresentation === 'alternative-likely-after-assessment'
        ? 'Alternative route currently more likely'
        : 'Focal-neurologic route is not established',
      summary: 'Keep urgent reassessment available if the presentation or deficit changes; this does not retrospectively exclude stroke.',
      status: 'unknown',
      source: ais2026,
    });
  }

  if (noHemorrhage(values)) {
    return Object.freeze({
      title: 'No hemorrhage on initial imaging',
      summary: 'Continue the current deficit, timing, vascular-imaging, final eligibility, actual-exposure, and BP-plan review in parallel.',
      status: activeDeficit(values) ? 'met' : 'unknown',
      source: ais2026,
    });
  }
  return Object.freeze({
    title: 'Possible acute stroke / focal deficit',
    summary: 'Capture last known well and mimic status while urgent initial brain imaging and stroke-team assessment proceed.',
    status: 'unknown',
    source: ais2026,
  });
}

function addActivationActions(values, actions) {
  if (values.currentDanger === 'unknown') {
    actions.push(action(
      'stroke-current-danger-screen',
      'activate',
      'Assess immediate danger now',
      'Unknown danger status does not establish a stable focal-deficit presentation.',
      'Assess airway, breathing, circulation, consciousness, seizure, rapid deficit progression and the need for emergency support. This guide does not choose airway, seizure, resuscitation, or transfer treatment.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  if (values.currentDanger === 'present') {
    actions.push(action(
      'stroke-code-immediate-escalation',
      'activate',
      'Immediate danger: activate emergency and stroke-team response now',
      'Support the time-critical emergency while stroke, hemorrhage, seizure, hypoglycemia and other causes are assessed in parallel.',
      'Do not wait for a last-known-well time, CT result, score, lab result, or completed form. Reassess airway, breathing, circulation, consciousness and rapidly changing neurologic findings with the treating team.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-evaluation'},
    ));
    actions.push(action(
      'stroke-danger-withhold-routine-branches',
      'activate',
      'Routine ischemic, BP, and response branches are withheld',
      'A stale plan cannot substitute for current emergency assessment and support.',
      'After the emergency is stabilized, enter a new current assessment. Do not infer that an old imaging result, medication record, response, or selected phase remains appropriate.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  if (values.focalPresentation === 'unknown') {
    actions.push(action(
      'stroke-assess-focal-presentation',
      'activate',
      'Establish whether a current focal-neurologic concern is present',
      'Unknown is not an alternative diagnosis or an absent stroke concern.',
      'Review the current history, examination, observed trajectory, baseline and competing causes. A new or changing focal deficit should remain on an urgent stroke-team route while assessed.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  if (values.focalPresentation === 'alternative-likely-after-assessment') {
    actions.push(action(
      'stroke-alternative-route-needs-change-surveillance',
      'activate',
      'Alternative explanation entered: retain change surveillance',
      'An alternative explanation does not retrospectively prove that stroke is excluded.',
      'Continue the appropriate diagnostic route and reopen urgent stroke assessment for a recurrent, persistent, or changing focal deficit. This guide does not close the episode or establish disposition.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  actions.push(action(
    'stroke-code-activate-and-capture-baseline',
    'activate',
    values.reviewPhase === 'after-acute-action' ? 'Continue the stroke-team care plan' : 'Activate the stroke team and capture the baseline',
    values.reviewPhase === 'after-acute-action' ? 'Reconcile current neurologic findings, imaging, actual treatment exposure and monitoring with the treating team.' : 'Record exact last known well, current deficit, glucose/mimic findings, medicines/exposure, and the time-stamped imaging plan in parallel.',
    'The 2026 AHA/ASA guideline frames emergency evaluation and treatment as a coordinated system process. This compact guide does not calculate NIHSS, diagnose AIS, select a destination, or create an order.',
    ais2026,
    {resourceGroup: 'stroke-evaluation'},
  ));
  return true;
}

function addClassificationActions(values, actions) {
  if (values.lastKnownWell === 'unknown') {
    actions.push(action(
      'stroke-reconcile-last-known-well',
      'classify',
      'Reconcile the exact last-known-well time',
      'Unknown onset is not automatically outside a treatment window.',
      'Clarify the last time at baseline and whether the presentation is wake-up or otherwise unknown onset. Keep advanced-imaging and EVT review available rather than applying a standard-window or no-treatment conclusion from a missing time.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
  } else if (extendedIvtTiming(values)) {
    actions.push(action(
      'stroke-extended-window-time-context',
      'classify',
      'Unknown-onset or 4.5–9-hour context: advanced-imaging selection may matter',
      'Do not turn this time context into a default standard-window IV-thrombolysis decision or an exclusion.',
      'The 2026 AHA/ASA guideline supports IV thrombolysis for selected patients with unknown onset or 4.5–9 hours from onset using advanced-imaging criteria, such as DWI-FLAIR or perfusion mismatch. This guide does not interpret those studies or determine selection.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
  } else if (values.lastKnownWell === 'known-more-than-9-hours') {
    actions.push(action(
      'stroke-late-time-keeps-evt-review-open',
      'classify',
      'Known late time: keep vascular and EVT review open',
      'A known time beyond 9 hours does not end the stroke-team or selected EVT pathway.',
      'Continue current imaging, vascular-occlusion, baseline-function, anatomy and specialist review. This guide does not determine late-window thrombectomy candidacy from time alone.',
      ais2026,
      {resourceGroup: 'stroke-imaging'},
    ));
  }

  if (values.mimicStatus === 'unknown') {
    actions.push(action(
      'stroke-assess-glucose-and-reversible-mimics',
      'classify',
      'Assess glucose and reversible stroke mimics in parallel',
      'Unknown mimic status is not evidence that a deficit is ischemic or nonischemic.',
      'Check a current glucose and assess clinically relevant mimics while the stroke-team and imaging pathway continue. Intensive glucose control is not a stroke-outcome treatment route; avoid converting this prompt into a glucose regimen.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
  } else if (values.mimicStatus === 'hypoglycemia-or-reversible-mimic-present') {
    actions.push(action(
      'stroke-correct-mimic-and-observe-current-deficit',
      'classify',
      'Correct the reversible mimic and observe the current deficit',
      'Do not label stroke excluded unless the response and alternate diagnosis are actually reassessed.',
      'Treatment of hypoglycemia or another reversible mimic and urgent stroke assessment can proceed in parallel. Persistent disabling focal findings after correction need the active imaging and stroke-team route; this guide does not supply a mimic-treatment regimen.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
  } else if (values.mimicStatus === 'alternative-explanation-likely') {
    actions.push(action(
      'stroke-alternative-mimic-does-not-close-focal-review',
      'classify',
      'Alternative explanation likely: keep the focal-deficit review explicit',
      'A likely mimic does not make an unobserved deficit response or imaging result negative.',
      'Reconcile whether the focal findings resolved, persist, or evolved after the relevant assessment/treatment. Escalate again for a changing deficit or new danger finding.',
      ais2026,
      {resourceGroup: 'stroke-evaluation'},
    ));
  }
}

function addImagingActions(values, actions) {
  if (values.brainImaging === 'unknown') {
    actions.push(action(
      'stroke-initial-brain-imaging-pending',
      'image',
      'Obtain and reconcile initial brain imaging urgently',
      'No hemorrhage, ischemic-reperfusion, antithrombotic, or BP branch follows a pending imaging result.',
      'Use the stroke-team imaging pathway to identify hemorrhage and urgent alternatives. The related local source contains noncontrast brain CT, brain CTA and perfusion-CT rows, but their presence does not validate a complete head-and-neck CTA, MRI, perfusion-selection, or EVT protocol.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
    return false;
  }
  if (values.brainImaging === 'hemorrhage-confirmed') {
    actions.push(action(
      'stroke-hemorrhage-route-urgent',
      'image',
      'Hemorrhage confirmed: activate ICH / neurocritical-care pathway',
      'Do not apply acute-ischemic-stroke IV thrombolysis, antithrombotic, or nonreperfusion BP branches.',
      'Urgently coordinate neurocritical-care/neurosurgical review and condition-specific monitoring, reversal and BP management. This compact guide does not classify hemorrhage, choose reversal, provide a procedure, or define a local ICH protocol.',
      ich2022,
      {tone: 'urgent', resourceGroup: 'stroke-imaging'},
    ));
    if (values.bpPathway !== 'ich-plan-reviewed') {
      actions.push(action(
        'stroke-hemorrhage-bp-plan-needs-ich-route',
        'reassess',
        'Hemorrhage requires a current ICH-specific BP plan',
        'Do not use a generic AIS or severe-BP target after hemorrhage is entered.',
        'The 2022 AHA/ASA ICH guideline distinguishes mild-to-moderate ICH from large/severe ICH and surgical cases. Use the current neurocritical-care plan and observed physiology; no antihypertensive, target, or infusion is selected here.',
        ich2022,
        {tone: 'urgent', resourceGroup: 'stroke-bp'},
      ));
    }
    if (hasReperfusionExposure(values) || values.ivtEligibilityReview === 'stroke-team-screen-complete-no-barrier-recorded') {
      actions.push(action(
        'stroke-hemorrhage-ischemic-branch-contradiction',
        'reassess',
        'Hemorrhage conflicts with a retained ischemic-reperfusion finding',
        'Stop relying on stale eligibility or exposure entries; urgently reconcile the time-stamped record with the treating team.',
        'A retained field can describe an earlier state, a transfer, or an error. It cannot justify thrombolysis, antithrombotics, or an AIS BP pathway after hemorrhage is confirmed.',
        ich2022,
        {tone: 'urgent', resourceGroup: 'stroke-evaluation'},
      ));
    }
    return false;
  }
  if (values.brainImaging === 'other-urgent-or-indeterminate-finding') {
    actions.push(action(
      'stroke-indeterminate-imaging-needs-specialist-route',
      'image',
      'Urgent or indeterminate imaging finding: use the specialist route',
      'Do not infer hemorrhage exclusion or a reperfusion decision from an indeterminate study.',
      'Clarify the imaging interpretation and immediate alternative diagnosis with radiology/stroke/neurocritical-care teams as appropriate. This guide does not interpret images or choose additional imaging.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-imaging'},
    ));
    return false;
  }

  if (values.deficitImpact === 'unknown') {
    actions.push(action(
      'stroke-assess-current-deficit-impact',
      'image',
      'Assess whether the current deficit is disabling',
      'NIHSS alone does not establish functional disability or a reperfusion route.',
      'Use trained clinical assessment and the patient’s current function. A low NIHSS can still be disabling; a missing disability assessment does not establish a nondisabling deficit.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  if (values.deficitImpact === 'resolved-or-no-current-focal-deficit') {
    actions.push(action(
      'stroke-resolved-deficit-needs-current-cause-review',
      'image',
      'Resolved or no current focal deficit: keep cause and secondary-risk review explicit',
      'Do not convert a resolved finding into a completed TIA/stroke diagnosis, an antithrombotic prescription, or discharge authority.',
      'Reconcile the observed trajectory, mimic response, imaging, vascular risk and follow-up ownership with the stroke team. Re-escalate for recurrence or new focal findings.',
      ais2026,
      {resourceGroup: 'stroke-evaluation'},
    ));
    return false;
  }
  if (values.deficitImpact === 'nondisabling-after-assessment') {
    actions.push(action(
      'stroke-nondisabling-deficit-does-not-open-routine-ivt',
      'image',
      'Nondisabling deficit: do not open a routine IV-thrombolysis route',
      'The 2026 guideline favors the stroke-team antiplatelet pathway over IV thrombolysis for non-disabling deficits; this is not a prescription.',
      'Keep vascular/EVT assessment, current deficit reassessment, imaging interpretation and individualized cause/bleeding review visible. The guide does not choose an antiplatelet, dose, route, timing, swallow status, or local order.',
      ais2026,
      {resourceGroup: 'stroke-evaluation'},
    ));
  }
  return true;
}

function addVascularActions(values, actions) {
  if (values.vascularStatus === 'unknown') {
    actions.push(action(
      'stroke-vascular-route-not-reconciled',
      'image',
      'Reconcile the vascular-imaging and EVT-capability route',
      'Unknown vascular status does not mean no LVO, no posterior-circulation concern, or no EVT option.',
      'Decide the imaging and transfer pathway with the stroke team. Do not delay a time-eligible IV-thrombolysis decision solely to obtain additional multimodal imaging, and do not infer an EVT protocol from an imaging order alone.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  if (values.vascularStatus === 'not-yet-obtained-or-pending') {
    actions.push(action(
      'stroke-vascular-imaging-pending',
      'image',
      'Vascular imaging pending: maintain the parallel stroke-team route',
      'Do not turn pending vascular imaging into either a no-LVO conclusion or a delay to a separately time-eligible IVT decision.',
      'Record the requested study, time, interpretation and EVT-capable-team contact. The retained local brain-CTA and perfusion rows are inspectable related references only; exact protocol, availability and transfer arrangements remain unverified.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  if (values.vascularStatus === 'lvo-or-posterior-circulation-occlusion-concern') {
    actions.push(action(
      'stroke-urgent-evt-capable-team-review',
      'image',
      'LVO / posterior-circulation concern: urgent EVT-capable-team review',
      'Run vascular-imaging interpretation, transfer/procedure assessment, and IVT assessment in parallel; no single field determines EVT candidacy.',
      'The 2026 guideline expands EVT consideration to selected larger-core populations and strongly supports EVT for selected basilar-artery occlusion within 24 hours with NIHSS at least 10. This guide does not establish occlusion, core, baseline function, score, anatomy, time, imaging selection, transfer suitability, or procedure eligibility.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  actions.push(action(
    'stroke-no-vascular-target-recorded',
    'image',
    'No vascular target identified in the current review',
    'This does not close the stroke assessment or override a changing deficit, imaging concern, or specialist interpretation.',
    'Keep the current imaging source/time, deficit trajectory and alternative causes visible. Reopen vascular and EVT review if the clinical picture or imaging interpretation changes.',
    ais2026,
    {resourceGroup: 'stroke-imaging'},
  ));
}

function addReperfusionActions(values, actions) {
  if (values.reperfusionExposure === 'uncertain-or-multiple-exposure') {
    actions.push(action(
      'stroke-reconcile-actual-reperfusion-exposure',
      'reperfusion',
      'Reconcile actual thrombolytic / EVT exposure before another decision',
      'Unknown agent, time, procedure, transfer status, or sequence blocks any initial or repeat treatment suggestion.',
      'Confirm actual IV agent, start/completion time, procedure/transfer status, imaging/time stamps, current BP plan, response and named team. This guide never supplies an initial dose, repeat dose, infusion, or procedure instruction.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-thrombolysis'},
    ));
    return;
  }
  if (hasReperfusionExposure(values)) {
    actions.push(action(
      'stroke-actual-reperfusion-exposure-needs-reassessment',
      'reassess',
      'Reperfusion exposure is entered: reconcile monitoring and response',
      'Do not reopen an initial thrombolytic/product branch or repeat an initial intervention from this guide.',
      'Record the actual agent/procedure, time, route, transfer/procedure status, imaging, BP plan, neurologic trajectory and adverse-event review under the treating stroke-team protocol.',
      ais2026,
      {resourceGroup: hasIvExposure(values) ? 'stroke-thrombolysis' : 'stroke-imaging'},
    ));
    if (values.reviewPhase === 'initial-evaluation') {
      actions.push(action(
        'stroke-exposure-conflicts-with-initial-phase',
        'reassess',
        'Actual reperfusion exposure conflicts with the selected initial phase',
        'Use the after-action phase and a time-stamped exposure record before interpreting the response.',
        'This may represent a transfer, a stale phase, or an erroneous entry. It must be reconciled before any further clinical action; the guide will not present a duplicate initial-treatment route.',
        ais2026,
        {tone: 'attention', resourceGroup: 'stroke-evaluation'},
      ));
    }
    if (hasIvExposure(values) && values.ivtEligibilityReview === 'unresolved-or-concern-present') {
      actions.push(action(
        'stroke-ivt-exposure-and-screen-concern-contradiction',
        'reassess',
        'IV-thrombolytic exposure conflicts with a recorded screen concern',
        'Urgently reconcile timing, the precise concern, imaging and actual treatment with the stroke team.',
        'A concern may have been resolved, may be misentered, or may require an adverse-event review. Do not use either field to infer eligibility, contraindication clearance, or a repeat dose.',
        ais2026,
        {tone: 'urgent', resourceGroup: 'stroke-thrombolysis'},
      ));
    }

    return;
  }
  if (values.reviewPhase === 'after-acute-action') {
    actions.push(action(
      'stroke-after-action-reconcile-no-reperfusion-exposure',
      'reperfusion',
      'After-action phase: reconcile the actual intervention and transfer record',
      'A “none confirmed” exposure state does not reopen an initial IVT recommendation during reassessment.',
      'Confirm what acute action occurred, why no reperfusion was given if applicable, the current imaging/vascular assessment, BP plan, observed response and named follow-up team. Return to a new initial evaluation only if the clinical episode was not actually treated.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return;
  }

  if (values.deficitImpact !== 'disabling-after-assessment') return;
  if (values.lastKnownWell === 'unknown') {
    actions.push(action(
      'stroke-unknown-time-withholds-standard-ivt-route',
      'reperfusion',
      'Do not use the standard IVT route until onset context is reconciled',
      'Unknown last known well is not automatic ineligibility, but it does not support a standard-window IVT conclusion.',
      'Complete stroke-team timing and advanced-imaging selection review. The guide does not interpret mismatch imaging or choose an agent, dose, BP treatment, or transfer destination.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  if (extendedIvtTiming(values)) {
    actions.push(action(
      'stroke-extended-window-ivt-needs-imaging-selection',
      'reperfusion',
      'Extended-window IVT requires stroke-team advanced-imaging selection',
      'Do not use the standard 4.5-hour IVT route for unknown onset or 4.5–9-hour context.',
      'The 2026 guideline supports selected extended-window IVT based on advanced imaging. Final treatment requires the treating team to verify the current deficit, imaging selection, timing, BP, medicines, relevant tests and local protocol; this guide does not establish eligibility.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  if (values.lastKnownWell !== 'within-4-5-hours') return;
  if (values.ivtEligibilityReview === 'unknown') {
    actions.push(action(
      'stroke-ivt-screen-incomplete',
      'reperfusion',
      'Complete the stroke-team IV-thrombolysis review',
      'No missing screening item is treated as a cleared contraindication.',
      'Review the current disabling deficit, exact last known well, imaging, BP, medications/exposure, relevant tests and local protocol with the stroke team. A no-hemorrhage CT and one time category alone do not establish IVT eligibility.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return;
  }
  if (values.ivtEligibilityReview === 'unresolved-or-concern-present') {
    actions.push(action(
      'stroke-ivt-concern-withholds-treatment-route',
      'reperfusion',
      'Unresolved IV-thrombolysis concern: do not surface a treatment route',
      'Resolve the current concern with the stroke team; do not assume it has cleared or that no treatment is possible.',
      'Keep vascular/EVT and advanced-imaging considerations active as clinically appropriate. This guide does not adjudicate a contraindication, select an alternative treatment, or make an antithrombotic decision.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-evaluation'},
    ));
    return;
  }
  actions.push(action(
    'stroke-team-final-standard-window-ivt-decision',
    'reperfusion',
    'Stroke team: decide IVT now within the standard window',
    'Confirm the final patient-specific decision before treatment; the entered review findings do not authorize treatment.',
    'The 2026 guideline endorses either alteplase or tenecteplase in the 4.5-hour window for eligible disabling deficits. Confirm the final patient-specific decision, active BP plan, exact product/formulation, timing, monitoring and local protocol with the stroke team. This guide does not verify which thrombolytic is available, a regimen, administration or orderability. No dose is shown here.',
    ais2026,
    {resourceGroup: 'stroke-thrombolysis'},
  ));
}

function addBpActions(values, actions) {
  if (values.brainImaging === 'hemorrhage-confirmed') return;
  if (!noHemorrhage(values) || (!activeDeficit(values) && !hasReperfusionExposure(values))) return;
  if (values.bpPathway === 'unknown' || values.bpPathway === 'conflict-or-unresolved') {
    actions.push(action(
      'stroke-bp-branch-not-reconciled',
      'reassess',
      'Reconcile the current stroke-specific BP pathway',
      'Do not import a generic severe-BP target while timing, imaging, reperfusion exposure, or syndrome remains unresolved.',
      'Before IVT, trial protocols used BP below 185/110 mm Hg; after IVT, more intensive lowering has not improved outcome. The treating team must set the current patient-specific plan and monitored approach. This guide does not lower BP, select a product, or create an infusion/bolus regimen.',
      ais2026,
      {tone: 'attention', resourceGroup: 'stroke-bp'},
    ));
    return;
  }
  if (values.bpPathway === 'ich-plan-reviewed') {
    actions.push(action(
      'stroke-ich-bp-plan-conflicts-with-no-hemorrhage',
      'reassess',
      'ICH BP plan conflicts with the entered no-hemorrhage imaging result',
      'Urgently reconcile the time-stamped imaging interpretation and active treatment plan before applying any BP conclusion.',
      'This may reflect a changed imaging result, a prior episode, transfer context, or data-entry mismatch. It blocks an AIS BP recommendation and does not establish that either diagnosis is correct.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-bp'},
    ));
    return;
  }
  if (values.bpPathway === 'pre-ivt-or-evt-plan-reviewed') {
    if (hasReperfusionExposure(values)) {
      actions.push(action(
        'stroke-pre-bp-plan-conflicts-with-reperfusion-exposure',
        'reassess',
        'Pre-reperfusion BP plan conflicts with recorded reperfusion exposure',
        'Reconcile the active post-treatment BP plan and exposure time before interpreting response.',
        'A patient may have changed phases during transfer or treatment. Do not continue a pre-treatment plan by default and do not create a repeat BP treatment from this guide.',
        ais2026,
        {tone: 'urgent', resourceGroup: 'stroke-bp'},
      ));
      return;
    }
    actions.push(action(
      'stroke-pre-reperfusion-bp-plan-reviewed',
      'reassess',
      'Before IVT: confirm BP below 185/110 in the active protocol',
      'Confirm the measured trend, perfusion and monitored stroke-team plan before the final treatment decision.',
      'Before IVT, the guideline describes trial-protocol BP below 185/110 mm Hg. That threshold is not a stand-alone treatment authorization: the stroke team must verify the current route, BP trend, perfusion, contraindications, imaging, and local monitored protocol.',
      ais2026,
      {resourceGroup: 'stroke-bp'},
    ));
    return;
  }
  if (values.bpPathway === 'post-reperfusion-plan-reviewed') {
    if (!hasReperfusionExposure(values)) {
      actions.push(action(
        'stroke-post-bp-plan-without-exposure-contradiction',
        'reassess',
        'Post-reperfusion BP plan has no confirmed reperfusion exposure',
        'Reconcile treatment/transfer history and the active BP plan before any further action.',
        'This conflict may represent a transfer, previous episode, or data mismatch. It does not establish that a patient received or should receive reperfusion treatment.',
        ais2026,
        {tone: 'urgent', resourceGroup: 'stroke-bp'},
      ));
      return;
    }
    actions.push(action(
      'stroke-post-reperfusion-bp-safeguard',
      'reassess',
      'Post-reperfusion BP plan: avoid routine intensive SBP lowering below 140',
      'Use the active stroke-team protocol, observed neurologic/perfusion status, and time-stamped exposure; no BP drug or rate is selected here.',
      'The 2026 guideline does not recommend intensive SBP reduction below 140 mm Hg after IV thrombolysis and finds it harmful after successful anterior-circulation EVT without another indication. This is a safeguard, not a universal replacement target or a local treatment protocol.',
      ais2026,
      {resourceGroup: 'stroke-bp'},
    ));
    return;
  }
  if (hasReperfusionExposure(values)) {
    actions.push(action(
      'stroke-nonreperfusion-bp-plan-conflicts-with-exposure',
      'reassess',
      'Nonreperfusion BP plan conflicts with recorded reperfusion exposure',
      'Reconcile the current post-treatment plan with the stroke team before judging a response or changing BP treatment.',
      'The same patient may have crossed a treatment phase or the entered record may be stale. This guide does not select a target, product, preparation, route, or repeat treatment.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-bp'},
    ));
    return;
  }
  actions.push(action(
    'stroke-nonreperfusion-bp-plan-reviewed',
    'reassess',
    'Nonreperfusion ischemic-stroke BP plan is reviewed',
    'Keep cerebral and systemic perfusion, comorbid emergencies, actual treatment exposure and trend visible; no generic BP treatment is generated.',
    'The 2026 guideline notes no functional-outcome benefit from active BP lowering in the first 48–72 hours for patients below 220/120 mm Hg without reperfusion therapy or another urgent indication. This does not resolve comorbid emergencies or replace the current team plan.',
    ais2026,
    {resourceGroup: 'stroke-bp'},
  ));
}

function addResponseActions(values, actions) {
  if (values.reviewPhase !== 'after-acute-action' || !hasReperfusionExposure(values)) return;
  if (values.postActionResponse === 'unknown') {
    actions.push(action(
      'stroke-post-action-response-not-reconciled',
      'reassess',
      'Reconcile the current neurologic and safety response',
      'Unknown response does not establish stability, treatment success, or safety for another intervention.',
      'Record the response window, current neurologic findings, BP/perfusion trend, imaging/repeat-imaging concern, adverse symptoms, and actual treatment/transfer exposure with the stroke team. Do not repeat an initial intervention from this guide.',
      ais2026,
      {tone: 'attention', resourceGroup: hasIvExposure(values) ? 'stroke-thrombolysis' : 'stroke-imaging'},
    ));
    return;
  }
  if (values.postActionResponse === 'not-yet-assessed') {
    actions.push(action(
      'stroke-post-action-response-window-pending',
      'reassess',
      'Response window is pending: continue protocolled observation',
      'Do not infer an adequate response or repeat initial treatment before the planned reassessment.',
      'Keep time-stamped neurologic findings, BP/perfusion, actual exposure and escalation thresholds visible under the active stroke-team protocol. The guide does not provide a monitoring interval or administration instruction.',
      ais2026,
      {resourceGroup: hasIvExposure(values) ? 'stroke-thrombolysis' : 'stroke-imaging'},
    ));
    return;
  }
  if (values.postActionResponse === 'stable-or-improving') {
    actions.push(action(
      'stroke-stable-response-continue-reassessment',
      'reassess',
      'Stable or improving response: continue current reassessment',
      'Improvement does not establish completed stroke care or authorize repeat IVT/EVT/BP treatment.',
      'Continue the active protocol’s neurologic, BP/perfusion, imaging and complication surveillance. Reopen urgent review for new deficit, bleeding concern, BP/perfusion problem, or inconsistent exposure record.',
      ais2026,
      {resourceGroup: hasIvExposure(values) ? 'stroke-thrombolysis' : 'stroke-imaging'},
    ));
    return;
  }
  if (values.postActionResponse === 'worse-neurology-or-bleeding-concern') {
    actions.push(action(
      'stroke-worsening-after-acute-action-urgent-review',
      'reassess',
      'New/worse neurologic finding or bleeding concern: urgent reassessment now',
      'Escalate to the stroke/neurocritical-care team and use the urgent imaging/complication pathway; do not repeat initial reperfusion treatment.',
      'Reconcile onset of deterioration, actual treatment exposure, BP/perfusion, airway/ABC status and imaging need under local emergency protocol. This guide does not diagnose hemorrhagic transformation, select reversal, or issue a procedure/order.',
      ais2026,
      {tone: 'urgent', resourceGroup: 'stroke-imaging'},
    ));
    return;
  }
  actions.push(action(
    'stroke-post-action-bp-or-adverse-concern-urgent-review',
    'reassess',
    'BP or other adverse-treatment concern: urgent protocol review',
    'Do not continue or add treatment automatically while perfusion, exposure and the active pathway are uncertain.',
    'Recheck the time-stamped BP/perfusion and neurologic trajectory, reconcile the actual intervention and current protocol, and escalate with the treating stroke team. This compact guide does not select a BP drug, dose, infusion, or repeat intervention.',
    ais2026,
    {tone: 'urgent', resourceGroup: 'stroke-bp'},
  ));
}

function addPostActionDangerOverride(values, actions) {
  if (!['worse-neurology-or-bleeding-concern', 'bp-or-other-adverse-concern'].includes(values.postActionResponse)) return false;
  const neurologicOrBleeding = values.postActionResponse === 'worse-neurology-or-bleeding-concern';
  actions.push(action(
    neurologicOrBleeding
      ? 'stroke-post-action-worsening-urgent-override'
      : 'stroke-post-action-adverse-concern-urgent-override',
    'reassess',
    neurologicOrBleeding
      ? 'New/worse neurologic finding or bleeding concern: escalate now'
      : 'BP or other adverse-treatment concern: urgent review now',
    'A post-action danger finding overrides stale initial-phase, current-danger, focal-deficit, imaging, or response entries.',
    neurologicOrBleeding
      ? 'Urgently activate the stroke/neurocritical-care complication pathway and reconcile actual IVT/EVT/transfer exposure, deterioration time, BP/perfusion, ABC status and imaging need. Do not repeat initial reperfusion treatment.'
      : 'Urgently reconcile actual exposure, BP/perfusion, neurologic trajectory and the active stroke-team protocol. Do not continue or add treatment automatically from this guide.',
    ais2026,
    {tone: 'urgent', resourceGroup: neurologicOrBleeding ? 'stroke-imaging' : 'stroke-bp'},
  ));
  return true;
}

function stageNotes(values) {
  return Object.freeze({
    activate: values.currentDanger === 'not-present-after-assessment'
      ? 'Immediate danger is assessed absent; continue the stroke-code route for a current focal concern.'
      : 'Assess and escalate immediate danger before proceeding to routine fields.',
    classify: 'Keep last known well and reversible-mimic assessment separate. Missing timing or a mimic does not establish an exclusion.',
    image: 'No hemorrhage, hemorrhage, indeterminate imaging, vascular concern and no target identified are separate current states.',
    reperfusion: values.reviewPhase === 'after-acute-action'
      ? 'Reassessment reconciles actual exposure; it never reopens an initial dosing branch.'
      : 'Final IVT/EVT decisions remain stroke-team and local-protocol decisions; the form does not clear eligibility.',
    reassess: 'Use a time-stamped exposure, BP plan and observed response. New deterioration overrides a prior stable entry.',
  });
}

export function evaluate(input = {}) {
  const values = normalizeStroke(input);
  const actions = [];
  if (addPostActionDangerOverride(values, actions)) {
    return Object.freeze({
      values,
      entry: entryFor(values),
      actions: Object.freeze(actions),
      visibleStageIds: Object.freeze(['reassess']),
      stageNotes: stageNotes(values),
      gaps: gapsFor(values),
      withheld: Object.freeze(['Stroke diagnosis, NIHSS calculation, thrombolytic/EVT eligibility, medication dose or preparation, BP treatment, order, chart change, transfer authorization and discharge decision remain outside this guide.']),
      derived: Object.freeze({urgentRoute: true, actualReperfusionExposure: hasReperfusionExposure(values), postActionDangerOverride: true}),
    });
  }
  if (values.brainImaging === 'hemorrhage-confirmed') {
    if (values.currentDanger === 'present') addActivationActions(values, actions);
    addImagingActions(values, actions);
    if (hasReperfusionExposure(values)) addReperfusionActions(values, actions);
    sortActions(actions);
    return Object.freeze({values, entry: entryFor(values), actions: Object.freeze(actions),
      visibleStageIds: Object.freeze(STAGE_ORDER.filter(stage => actions.some(item => item.stage === stage))),
      stageNotes: stageNotes(values), gaps: gapsFor(values), withheld: Object.freeze([]),
      derived: Object.freeze({urgentRoute: true, actualReperfusionExposure: hasReperfusionExposure(values)})});
  }
  if (!addActivationActions(values, actions)) {
    if (values.currentDanger === 'not-present-after-assessment'
      && (values.reviewPhase === 'after-acute-action' || hasReperfusionExposure(values))) {
      addReperfusionActions(values, actions);
      if (!['hemorrhage-confirmed','other-urgent-or-indeterminate-finding'].includes(values.brainImaging)) {
        addBpActions(values, actions);
        addResponseActions(values, actions);
      }
    }
    sortActions(actions);
    return Object.freeze({
      values,
      entry: entryFor(values),
      actions: Object.freeze(actions),
      visibleStageIds: Object.freeze(STAGE_ORDER.filter(stage => actions.some(item => item.stage === stage))),
      stageNotes: stageNotes(values),
      gaps: gapsFor(values),
      withheld: Object.freeze(['Stroke diagnosis, NIHSS calculation, thrombolytic/EVT eligibility, medication dose or preparation, BP treatment, order, chart change, transfer authorization and discharge decision remain outside this guide.']),
      derived: Object.freeze({urgentRoute: values.currentDanger === 'present'}),
    });
  }

  addClassificationActions(values, actions);
  if (addImagingActions(values, actions)) {
    addVascularActions(values, actions);
    addReperfusionActions(values, actions);
    addBpActions(values, actions);
    addResponseActions(values, actions);
  } else if (values.reviewPhase === 'after-acute-action' || hasReperfusionExposure(values) || values.reperfusionExposure === 'uncertain-or-multiple-exposure') {
    addReperfusionActions(values, actions);
    if (!['hemorrhage-confirmed','other-urgent-or-indeterminate-finding'].includes(values.brainImaging)) {
      addBpActions(values, actions);
      addResponseActions(values, actions);
    }
  }
  sortActions(actions);
  return Object.freeze({
    values,
    entry: entryFor(values),
    actions: Object.freeze(actions),
    visibleStageIds: Object.freeze(STAGE_ORDER.filter(stage => actions.some(item => item.stage === stage))),
    stageNotes: stageNotes(values),
    gaps: gapsFor(values),
    withheld: Object.freeze([
      'Stroke diagnosis, NIHSS calculation, thrombolytic/EVT eligibility, medication dose or preparation, BP treatment, order, chart change, transfer authorization and discharge decision remain outside this guide.',
    ]),
    derived: Object.freeze({
      urgentRoute: values.currentDanger === 'present' || values.brainImaging === 'hemorrhage-confirmed',
      noHemorrhageOnInitialImaging: noHemorrhage(values),
      activeDeficit: activeDeficit(values),
      actualReperfusionExposure: hasReperfusionExposure(values),
      standardWindowContext: values.lastKnownWell === 'within-4-5-hours',
      extendedWindowContext: extendedIvtTiming(values),
    }),
  });
}

export const config = Object.freeze({
  id: 'acute-stroke',
  title: 'Acute Stroke / Focal Neuro Deficit',
  reviewedAt: '2026-09-19',
  scope: 'Adult acute focal-neurologic deficit and possible acute ischemic stroke review: immediate danger, stroke-team activation, last-known-well/mimic/image distinction, vascular/EVT routing, team-led IVT decision gates, actual exposure, BP-plan safety and post-action reassessment.',
  reviewLabel: 'Upgraded · AHA/ASA AIS 2026 / ICH route',
  reviewLimitations: Object.freeze([
    'This is not a stroke diagnosis, NIHSS calculator, thrombolysis or thrombectomy eligibility engine, treatment authorization, order set, medication-administration record, BP calculator, transfer authorization, chart writer or discharge decision.',
    'Every finding defaults to unknown. Unknown onset, mimic status, imaging, disability, vascular status, contraindication review, actual exposure, BP plan and response never become an absent concern, cleared contraindication, no-treatment decision or safe response.',
    'No-hemorrhage imaging, a 4.5-hour time context, a disabling-deficit assessment, and a completed screen with no recorded barrier are necessary review inputs only. The stroke team makes the final IVT/EVT decision from the current patient, imaging, timing, BP, medicines, relevant tests and local protocol.',
    'The initial phase never presents an initial IVT route once any reperfusion exposure is entered. The after-action phase requires actual-exposure reconciliation and response review rather than a repeated initial agent, dose, preparation, infusion, procedure or BP action.',
    'This guide does not validate a local head-and-neck CTA, MRI, perfusion-selection, EVT, transfer, ICH or monitoring protocol, or which thrombolytic is available.',
  ]),
  sources: Object.freeze([ais2026, ais2026Correction, ich2022]),
  fields: STROKE_FIELDS,
  stages: Object.freeze([
    Object.freeze({id: 'activate', title: 'Immediate danger & stroke-team route', empty: 'Assess immediate danger and the current focal-neurologic concern.'}),
    Object.freeze({id: 'classify', title: 'Time, glucose & mimics', empty: 'Reconcile last known well and reversible mimics.'}),
    Object.freeze({id: 'image', title: 'Brain, vascular & EVT imaging route', empty: 'Reconcile current imaging and vascular status.'}),
    Object.freeze({id: 'reperfusion', title: 'Team-led reperfusion decision', empty: 'Keep IVT/EVT eligibility and actual exposure separate.'}),
    Object.freeze({id: 'reassess', title: 'BP plan, exposure & response', empty: 'Use the current protocol and observed response; never repeat an initial action automatically.'}),
  ]),
  visibleFieldKeys,
  evaluate,
  conflictActionIds: Object.freeze([
    'stroke-hemorrhage-ischemic-branch-contradiction',
    'stroke-ivt-exposure-and-screen-concern-contradiction',
    'stroke-ich-bp-plan-conflicts-with-no-hemorrhage',
    'stroke-pre-bp-plan-conflicts-with-reperfusion-exposure',
    'stroke-post-bp-plan-without-exposure-contradiction',
    'stroke-nonreperfusion-bp-plan-conflicts-with-exposure',
  ]),
  quickReference: Object.freeze({
    summary: 'Treat immediate danger and stroke-team activation as time-critical. Keep hemorrhage, ischemia and mimic routes distinct; make timing, imaging, disability, vascular status, final team review, actual exposure, BP plan and response explicit.',
    recognition: Object.freeze([
      'Use exact last known well, not the time symptoms were noticed. Unknown or late time never automatically closes advanced-imaging or EVT review.',
      'Correct hypoglycemia and assess other mimics in parallel with the stroke pathway; a response must be observed, not assumed.',
      'No hemorrhage on initial imaging is one gate. It does not diagnose AIS or clear IV thrombolysis; NIHSS alone does not decide whether a deficit is disabling.',
    ]),
    redFlags: Object.freeze([
      'Declining consciousness, airway/breathing/circulation compromise, seizure, rapidly worsening deficit, or new bleeding concern.',
      'Hemorrhage or other urgent/indeterminate imaging; LVO or posterior-circulation occlusion concern; uncertain actual treatment exposure.',
      'A conflict between hemorrhage/imaging, IVT screen/exposure, deficit impact, or BP plan and the current treatment phase.',
    ]),
    steps: Object.freeze([
      Object.freeze({role: 'Activate', text: 'Escalate immediate danger and activate the stroke-team route; capture baseline and last known well in parallel.'}),
      Object.freeze({role: 'Classify', text: 'Make time, mimic/glucose, imaging and current deficit impact explicit; unknown is never a negative finding.'}),
      Object.freeze({role: 'Image', text: 'Separate hemorrhage, no hemorrhage and indeterminate imaging; obtain/interprete vascular imaging and EVT capability in parallel when indicated.'}),
      Object.freeze({role: 'Reperfusion', text: 'Only the stroke team can make the final IVT/EVT decision. Standard and extended time contexts use different review routes.'}),
      Object.freeze({role: 'Reassess', text: 'After an intervention or transfer decision, reconcile actual exposure, BP plan and observed response; do not repeat an initial action automatically.'}),
    ]),
    monitoring: Object.freeze([
      'Keep time-stamped neurologic findings, imaging interpretations, actual IVT/EVT/transfer exposure, BP/perfusion plan and named escalation team visible in the active clinical record.',
      'Urgently reassess new/worse neurologic findings, bleeding concern, adverse BP/perfusion change, or a contradiction between current findings and a retained treatment record.',
      'Use the current stroke-team/neurocritical-care protocol for monitoring frequency, repeat imaging, medication administration, BP treatment and complications; none is generated here.',
    ]),
    sources: Object.freeze([ais2026, ais2026Correction, ich2022]),
  }),
});

export default config;
