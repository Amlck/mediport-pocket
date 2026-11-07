// Compact, source-reviewed decision support for adult hypomagnesaemia.
// This data module does not create orders, calculate an individual dose, or
// translate a guideline amount into a local ampoule, bottle, or oral product.

export const SPS_SOURCE = 'https://sps.nhs.uk/articles/treating-acute-hypomagnesaemia-in-adults/';
export const MAGNESIUM_SULFATE_SMPC = 'https://www.medicines.org.uk/emc/product/1990/smpc';

const SPS = {
  label: 'NHS SPS Treating acute hypomagnesaemia in adults (published December 2024)',
  url: SPS_SOURCE,
};
const SMPC = {
  label: 'UK magnesium sulfate 50% SmPC — product safety and toxicity',
  url: MAGNESIUM_SULFATE_SMPC,
};

const fields = [
  {
    key: 'magnesium',
    label: 'Magnesium result?',
    options: [
      ['unknown', 'Not verified'],
      ['mild', '0.5 to <0.7 mmol/L'],
      ['severe', '<0.5 mmol/L'],
      ['lowUnbanded', 'Low result; band not entered'],
      ['notLow', '≥0.7 mmol/L / not low'],
    ],
    help: 'SPS defines hypomagnesaemia as serum magnesium below 0.7 mmol/L. Its mild band is 0.5 to 0.7 mmol/L and severe is below 0.5 mmol/L. Use an actual time-linked result; unknown is not normal.',
  },
  {
    key: 'danger',
    label: 'Severe neuro / cardiac feature?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'Present / suspected'],
      ['no', 'Absent · assessed'],
    ],
    help: 'SPS lists nystagmus, tetany, seizures and cardiac arrhythmias as severe features. A feature can need emergency assessment even if the magnesium result has not yet been verified or does not explain it.',
  },
  {
    key: 'enteralRoute',
    label: 'Enteral route usable?',
    options: [
      ['unknown', 'Not established'],
      ['yes', 'Usable'],
      ['no', 'Unavailable / not absorbed'],
    ],
    help: 'Usable means safe swallowing, a functioning gastrointestinal route and an appropriate formulation. Severe deficit, limited absorption, nil by mouth status or a need for immediate correction can make oral treatment unsuitable.',
  },
  {
    key: 'renalRisk',
    label: 'Kidney risk context?',
    options: [
      ['unknown', 'Not assessed'],
      ['yes', 'AKI, CKD4–5, dialysis or transplant'],
      ['ckd1to3', 'CKD1–3 · IV caution'],
      ['no', 'No kidney risk found'],
    ],
    help: 'SPS advises specialist input before replacement in AKI, CKD stage 4–5, dialysis or transplant. For CKD stage 1–3, use IV magnesium with caution and consider reducing its initial dose by 25–50%; SPS says oral magnesium needs no adjustment. This guide does not calculate an individual renal dose.',
  },
  {
    key: 'cause',
    label: 'Likely loss / contributor?',
    options: [
      ['unknown', 'Not established'],
      ['gi', 'GI loss / limited absorption'],
      ['medicine', 'Medicine contributor'],
      ['renal', 'Renal loss / wasting concern'],
      ['notFound', 'No cause found after review'],
    ],
    help: 'SPS lists low intake, intestinal loss, medicine effects, renal loss and transcellular shift. Medicine contributors include aminoglycosides, loop or thiazide diuretics, proton-pump inhibitors and tacrolimus. This selector does not diagnose renal wasting.',
  },
  {
    key: 'associatedElectrolytes',
    label: 'Low potassium or calcium?',
    options: [
      ['unknown', 'Not checked'],
      ['yes', 'Low potassium and/or calcium'],
      ['no', 'Neither low · reviewed'],
    ],
    help: 'Hypomagnesaemia often coexists with hypokalaemia and hypocalcaemia. Check and treat documented associated deficits with their own assessment and local protocol; this guide does not select their regimen.',
  },
];

const stages = [
  {id: 'assess', title: 'Confirm & triage', empty: 'Verify magnesium, urgent features and associated electrolytes.'},
  {id: 'urgent', title: 'Escalate emergency features', empty: 'Escalate documented severe features; assess any unknown urgency.'},
  {id: 'route', title: 'Choose replacement route', empty: 'A route follows verified severity, renal risk and enteral access.'},
  {id: 'cause', title: 'Correct contributors', empty: 'Identify losses and medicine contributors.'},
  {id: 'reassess', title: 'Reassess response', empty: 'Set magnesium, electrolyte and clinical surveillance.'},
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
  source = SPS,
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

function hasLowMagnesium(values) {
  return ['mild', 'severe', 'lowUnbanded'].includes(values.magnesium);
}

function hasUrgentContext(values) {
  return values.danger === 'yes' || values.magnesium === 'severe';
}

function addAssessment(actions, values) {
  if (values.magnesium === 'unknown') {
    actions.push(action(
      'confirm-magnesium-and-context',
      'assess',
      'Confirm magnesium and associated context',
      undefined,
      'Obtain and time-link the serum magnesium result with symptoms, potassium, calcium and renal function. SPS defines hypomagnesaemia below 0.7 mmol/L; an unknown result is not an uncomplicated replacement decision.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.magnesium === 'lowUnbanded') {
    actions.push(action(
      'assign-magnesium-severity-band',
      'assess',
      'Confirm the magnesium band before routine replacement',
      undefined,
      'The source route differs for mild 0.5 to <0.7 mmol/L and severe <0.5 mmol/L deficiency. Record the actual value, timing and trend rather than inferring a severity band.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  } else if (values.magnesium === 'notLow') {
    actions.push(action(
      'hypomagnesemia-not-established',
      'assess',
      'Hypomagnesaemia is not established by this result',
      undefined,
      'A reviewed result at or above 0.7 mmol/L does not support routine magnesium replacement from this guide. Continue assessment if symptoms, trend, exposure or another electrolyte disorder remain concerning.',
      {resourceGroup: 'workup'},
    ));
  }

  if (values.danger === 'unknown') {
    actions.push(action(
      'assess-severe-magnesium-features',
      'assess',
      'Assess tetany, seizure, nystagmus and arrhythmia',
      'Unknown urgency is not an absence of severe features.',
      'SPS classifies nystagmus, tetany, seizures and cardiac arrhythmias as severe hypomagnesaemia features. Assess active neurologic, rhythm and haemodynamic concern before classifying a low result as uncomplicated.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (hasLowMagnesium(values) && values.associatedElectrolytes === 'unknown') {
    actions.push(action(
      'check-potassium-and-calcium',
      'assess',
      'Check potassium and calcium with magnesium',
      undefined,
      'SPS notes that hypomagnesaemia often accompanies hypokalaemia and hypocalcaemia. Obtain actual associated results rather than assuming they are normal or automatically choosing their treatment.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }
}

function addUrgency(actions, values) {
  if (values.danger === 'yes') {
    const documentedLow = hasLowMagnesium(values);
    actions.push(action(
      'urgent-neurologic-or-cardiac-feature',
      'urgent',
      'Escalate the severe feature in monitored care',
      documentedLow ? 'Do not wait for routine replacement planning.' : 'The magnesium result does not explain this feature yet.',
      documentedLow
        ? 'SPS directs hospital IV magnesium sulfate for severe or symptomatic hypomagnesaemia. Treat active seizure, arrhythmia or other emergency physiology in parallel through the relevant local emergency pathway. This guide does not select a torsades, arrest, line, pump or local-product regimen.'
        : 'A seizure, tetany, nystagmus or arrhythmia needs urgent assessment even when a low magnesium result is not yet verified. Confirm magnesium in parallel; do not infer an IV magnesium indication solely from this form.',
      {tone: 'urgent', resourceGroup: 'monitoring'},
    ));
  } else if (values.magnesium === 'severe') {
    actions.push(action(
      'severe-magnesium-needs-hospital-review',
      'urgent',
      'Severe magnesium deficit needs hospital IV review',
      'SPS uses <0.5 mmol/L as the severe band.',
      'SPS recommends IV magnesium sulfate in hospital for severe or symptomatic hypomagnesaemia. A documented absence of severe symptoms does not make this a routine oral-replacement decision; review renal risk, local preparation and monitoring before treatment.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addRoute(actions, values) {
  if (!hasLowMagnesium(values)) return;

  const urgent = hasUrgentContext(values);
  const routineMildRouteBlocked = values.magnesium === 'mild' && values.danger === 'unknown';

  if (routineMildRouteBlocked) {
    actions.push(action(
      'assess-danger-before-routine-mild-replacement',
      'route',
      'Assess severe features before routine mild replacement',
      'Unknown urgency is not an uncomplicated mild deficit.',
      'For a mild result, oral replacement or IV replacement for an unavailable enteral route applies only after severe neurologic or cardiac features have been assessed absent. If features are present or suspected, use the hospital urgent pathway instead. Do not let an unassessed field become an oral or IV routine regimen.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }

  if (values.renalRisk === 'yes') {
    actions.push(action(
      'specialist-plan-for-high-renal-risk',
      'route',
      'Use a specialist replacement plan in high renal risk',
      'No renal-adjusted dose is supplied here.',
      urgent
        ? 'SPS advises specialist input for AKI, CKD stage 4–5, dialysis and transplant recipients. Emergency assessment and treatment must proceed with senior/renal support, but this guide does not translate an IV or oral source dose into a renal-adjusted regimen.'
        : 'SPS advises specialist input before replacement in AKI, CKD stage 4–5, dialysis and transplant recipients and says there are no published data to guide treatment in those groups. Do not use a routine replacement dose from this guide.',
      {tone: urgent ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.renalRisk === 'ckd1to3') {
    actions.push(action(
      'review-iv-magnesium-adjustment-in-ckd1to3',
      'route',
      'Review IV magnesium adjustment for CKD 1–3',
      'SPS: consider 25–50% lower initial IV dose.',
      'SPS says to use IV magnesium with caution in CKD stage 1–3 and consider reducing the initial dose by 25–50%; it says oral magnesium needs no adjustment. This guide does not calculate an adjusted grams/mmol regimen. Do not apply the 5 g or 1–5 g IV source statements unchanged if IV magnesium is needed; use local policy and the full clinical context.',
      {tone: urgent ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));

    if (!(values.magnesium === 'mild' && values.danger === 'no' && values.enteralRoute === 'yes')) return;
  }

  if (values.renalRisk === 'unknown') {
    actions.push(action(
      'clarify-renal-risk-before-routine-dose',
      'route',
      'Clarify renal risk before selecting a routine dose',
      urgent ? 'Urgent treatment needs a senior local plan.' : undefined,
      'Magnesium is renally handled and SPS advises specialist input for AKI, advanced CKD, dialysis and transplant. Unknown renal context is not a negative finding. This guide withholds a routine IV or oral regimen until the risk is reviewed; urgent deterioration still needs immediate clinical escalation.',
      {tone: urgent ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (routineMildRouteBlocked) return;

  if (values.magnesium === 'lowUnbanded') {
    actions.push(action(
      'determine-low-magnesium-band-before-route',
      'route',
      'Determine the low-magnesium band before routine route selection',
      undefined,
      'SPS uses different advice for mild and severe deficiency. If a severe clinical feature is present, use urgent hospital assessment; otherwise record the actual magnesium level and route feasibility before choosing oral or IV replacement.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return;
  }

  if (urgent) {
    actions.push(action(
      'hospital-iv-magnesium-for-severe-or-symptomatic',
      'route',
      'Use hospital IV magnesium under the local protocol',
      'SPS: 5 g (20 mmol) IV; usual rate 1–2 g/hour.',
      'SPS gives 5 g (20 mmol) IV as its initial dose for severe or symptomatic hypomagnesaemia, repeated according to the measured magnesium level; its usual IV rate is 1–2 g/hour. This is source information, not an instruction to convert it into local ampoules, bottle volume, dilution, line or repeat order. Confirm the local rate and protocol. The local 10% 20 mL ampoule and 10% 200 mL bottle are distinct products.',
      {resourceGroup: 'iv-magnesium'},
    ));
  } else if (values.enteralRoute === 'yes') {
    actions.push(action(
      'oral-magnesium-for-mild-eligible-deficit',
      'route',
      'Use oral magnesium only when the route is appropriate',
      'SPS source range: 10–24 mmol/day in divided doses.',
      'For mild hypomagnesaemia, SPS uses an oral total daily dose of 10–24 mmol in divided doses, adjusted to result and tolerance. Oral salts are poorly absorbed and can cause diarrhoea. The linked local MgO and oral magnesium sulfate entries are product identities only: MgO’s acid-neutralising capacity is not an elemental-magnesium dose conversion, and neither local product is an automatic substitute for the SPS salts.',
      {resourceGroup: 'oral-magnesium'},
    ));
  } else if (values.enteralRoute === 'no') {
    actions.push(action(
      'iv-magnesium-when-enteral-route-unavailable',
      'route',
      'Use hospital IV magnesium when enteral treatment is unavailable',
      'SPS: 1–5 g (4–20 mmol) IV; usual rate 1–2 g/hour.',
      'For mild deficiency when the oral or enteral route is unavailable, SPS gives an initial IV range of 1–5 g (4–20 mmol), chosen from the serum level; its usual IV rate is 1–2 g/hour. This is not a local ampoule, infusion-volume, dilution or repeat-order instruction. Verify renal context, local concentration, access and monitoring.',
      {resourceGroup: 'iv-magnesium'},
    ));
  } else {
    actions.push(action(
      'clarify-enteral-route-before-routine-replacement',
      'route',
      'Clarify enteral access before choosing routine replacement',
      undefined,
      'Mild replacement can be oral when the route is usable. IV magnesium belongs in a hospital setting when the route is unavailable; do not assume either condition from an unknown route field.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addCauseActions(actions, values) {
  if (!hasLowMagnesium(values)) return;

  switch (values.cause) {
    case 'unknown':
      actions.push(action(
        'identify-magnesium-loss-or-contributor',
        'cause',
        'Identify loss, intake, medicine and renal contributors',
        undefined,
        'SPS lists reduced intake, intestinal loss, medication effects, renal loss and transcellular shift. Review the clinical context before ordering a broad work-up or assigning a cause.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    case 'gi':
      actions.push(action(
        'address-gi-loss-and-absorption',
        'cause',
        'Address GI loss or limited absorption',
        'Oral magnesium can worsen diarrhoea.',
        'SPS lists intestinal loss and limited gastrointestinal absorption among causes and route constraints. Treat ongoing loss and reassess whether oral magnesium is tolerated; persistent diarrhoea or symptomatic deficiency may need a hospital IV plan rather than escalating an oral laxative/antacid product.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'medicine':
      actions.push(action(
        'review-medicine-contributors',
        'cause',
        'Review magnesium-lowering medicines',
        undefined,
        'SPS highlights aminoglycosides, loop diuretics, proton-pump inhibitors, tacrolimus and thiazides. Review indication, alternatives and monitoring with the treating team; do not stop a necessary medicine automatically from this guide.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'renal':
      actions.push(action(
        'review-renal-loss-context',
        'cause',
        'Review renal-loss context before calling renal wasting',
        undefined,
        'Review renal function, diuretic/nephrotoxic exposure and the clinical context. Paired urine magnesium/creatinine and FEMg support clinician-led cause review; this guide does not diagnose renal wasting from a threshold alone.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'notFound':
      actions.push(action(
        'escalate-unexplained-recurrent-deficit',
        'cause',
        'Escalate an unexplained or recurrent deficit',
        undefined,
        'SPS advises reviewing the underlying cause and seeking relevant specialist support when oral treatment is not tolerated, does not correct the level or the deficit recurs. A repeated IV plan should not replace the cause assessment.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
  }

  if (values.associatedElectrolytes === 'yes') {
    actions.push(action(
      'address-documented-associated-electrolytes',
      'cause',
      'Address documented potassium or calcium deficit in parallel',
      undefined,
      'SPS advises correcting other electrolyte disturbances because hypomagnesaemia commonly coexists with hypokalaemia and hypocalcaemia. Use the relevant measured-result pathway and local protocol; this guide does not automatically prescribe potassium or calcium.',
      {resourceGroup: 'workup', related: ['hypokalemia', 'hypocalcemia']},
    ));
  }
}

function addReassessment(actions, values) {
  if (!hasLowMagnesium(values)) return;
  actions.push(action(
    'reassess-magnesium-and-associated-safety',
    'reassess',
    'Recheck magnesium, electrolytes, renal function and clinical state',
    'After IV: monitor Mg after each dose. Oral: review around day 7.',
    'SPS advises measuring magnesium after each IV dose, with potassium, calcium, renal function and blood pressure also monitored; use ECG monitoring for severe symptoms such as tetany, seizures or arrhythmias. For oral therapy it suggests repeat magnesium at 7 days and again after 1–3 months depending on the cause. Set actual hospital timing from the active clinical trajectory and local policy.',
    {resourceGroup: 'monitoring'},
  ));
}

function stageNotes(values, actions) {
  const notes = {};
  if (!actions.some(item => item.stage === 'urgent')) {
    if (values.danger === 'no') {
      notes.urgent = 'No severe neurologic or cardiac feature is entered after assessment.';
    } else if (values.danger === 'unknown') {
      notes.urgent = 'Assess severe features before treating this stage as reassuring.';
    }
  }
  return notes;
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];
  addAssessment(actions, values);
  addUrgency(actions, values);
  addRoute(actions, values);
  addCauseActions(actions, values);
  addReassessment(actions, values);
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'hypomagnesemia',
  title: 'Hypomagnesemia',
  reviewedAt: '2026-09-15',
  scope: 'Adult hypomagnesaemia triage, route, renal safeguards and reassessment.',
  reviewLimitations: [
    'SPS is professional medicines advice, not a national hospital protocol; it expressly directs clinicians to local policy. The UK SmPC is product safety information, not a complete replacement guideline.',
    'This engine does not calculate a deficit, choose a line, pump, dilution, infusion rate, repeat course or renal-adjusted dose. It does not provide a torsades, cardiac-arrest, pregnancy/eclampsia or paediatric regimen.',
    'For AKI, CKD stage 4–5, dialysis or transplant, SPS advises specialist input and says there are no published treatment data. For CKD stage 1–3, SPS advises cautious IV use and considering a 25–50% lower initial IV dose; the engine does not calculate that adjustment.',
    'NTUH’s public formulary lists two distinct magnesium sulfate 10% products, MAG1FA11 (20 mL ampoule) and MGS1FA11 (200 mL bottle); source doses must not be converted into their volume or ampoule count without local pharmacy/protocol review.',
    'The local oral MgO and oral magnesium-sulfate entries are antacid/laxative-class product identities. Their label fields, including MgO acid-neutralising capacity, do not establish an elemental-magnesium replacement dose or suitability.',
  ],
  sources: [SPS, SMPC],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm the low magnesium result and emergency features, select a route only after renal review, address the cause, then measure response.',
    recognition: [
      'SPS defines hypomagnesaemia as serum magnesium below 0.7 mmol/L; <0.5 mmol/L is its severe band.',
      'Severe features include nystagmus, tetany, seizures and cardiac arrhythmias.',
      'Check potassium, calcium and renal function with a documented deficit; unknown findings are not normal findings.',
    ],
    redFlags: [
      'Seizure, tetany, nystagmus, arrhythmia, haemodynamic concern or other active emergency physiology.',
      'Magnesium <0.5 mmol/L, inability to use the enteral route, persistent GI loss or recurrent unexplained deficit.',
      'AKI, CKD stage 4–5, dialysis, transplant, uncertain renal clearance or an uncertain emergency feature. In CKD stage 1–3, IV magnesium needs a cautious local dose review.',
    ],
    steps: [
      {role: 'Confirm & triage', text: 'Record the actual serum magnesium, symptoms, potassium, calcium and renal context. Do not infer a normal value or a mild band.'},
      {role: 'Escalate emergency features', text: 'Severe neurologic or cardiac features need monitored emergency assessment; do not wait for routine replacement planning.'},
      {role: 'Choose route', text: 'SPS uses oral replacement for eligible mild deficiency and hospital IV magnesium for severe/symptomatic deficiency or an unavailable enteral route. Verify local product, dilution and monitoring.'},
      {role: 'Correct contributors', text: 'Address GI loss/absorption, medicines, renal-loss context and documented potassium or calcium deficits.'},
      {role: 'Reassess', text: 'After IV magnesium, measure magnesium after each dose; with oral therapy, SPS suggests review at 7 days and again at 1–3 months according to cause.'},
    ],
    monitoring: [
      'During replacement, monitor magnesium, potassium, calcium, renal function and blood pressure; use ECG monitoring for severe symptoms.',
      'Oral magnesium may be poorly absorbed and cause diarrhoea. Do not turn local antacid/laxative products into an unverified replacement conversion.',
      'In advanced kidney disease, AKI, dialysis or transplant, obtain a specialist plan rather than applying a generic renal dose.',
    ],
    sources: [SPS, SMPC],
  },
};

export default config;
