// Compact, source-reviewed decision support for adult hypokalaemia.
// This data module deliberately has no local order, patient-record, or HIS behavior.

export const AAFP_SOURCE = 'https://www.aafp.org/pubs/afp/issues/2023/0100/potassium-disorders-hypokalemia-hyperkalemia';
export const ORAL_KCL_LABEL = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=a230185f-5493-487d-892a-5219869b4e47';
export const IV_KCL_LABEL = 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=c2467d57-cd2d-4409-bcc0-50128bd01bba';

const source = {
  aafp: {
    label: 'AAFP Potassium Disorders clinical review (2023)',
    url: AAFP_SOURCE,
  },
  oral: {
    label: 'DailyMed / FDA potassium chloride ER tablets — revised March 2025',
    url: ORAL_KCL_LABEL,
  },
  iv: {
    label: 'DailyMed / FDA potassium chloride in sodium chloride injection — revised April 2024',
    url: IV_KCL_LABEL,
  },
};

const fields = [
  {
    key: 'potassium',
    label: 'Potassium · mmol/L',
    help: 'Use the current measured potassium. ≤2.5 mmol/L is a severe feature. >2.5 to <3.5 covers every value between those boundaries; ≥3.5 does not trigger hypokalaemia replacement. Unknown is never treated as normal.',
    options: [
      ['unknown', 'Unknown / not confirmed'],
      ['severe', '≤2.5'],
      ['low', '>2.5 to <3.5'],
      ['notLow', '≥3.5 / not low'],
    ],
  },
  {
    key: 'danger',
    label: 'Urgent ECG / neuromuscular feature?',
    help: 'Present/suspected means any ECG abnormality or arrhythmia, paralysis, respiratory failure, or severe weakness. Absent means these urgent features were actively assessed.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['yes', 'Present / suspected'],
      ['no', 'Absent — assessed'],
    ],
  },
  {
    key: 'oralRoute',
    label: 'Oral / GI route safe?',
    help: 'Safe/functioning means a safe swallow, a functioning GI tract, and an appropriate available formulation. No includes unsafe swallowing, an unavailable route, or a nonfunctioning GI tract.',
    options: [
      ['unknown', 'Unknown / not established'],
      ['safe', 'Safe / functioning'],
      ['unsafe', 'Unsafe / unavailable'],
    ],
  },
  {
    key: 'renalRisk',
    label: 'Reduced K clearance / risk?',
    help: 'Risk present includes renal impairment, oliguria/anuria, or potassium-retaining treatment such as RAAS inhibition, potassium-sparing diuretics, or NSAIDs. No risk requires active review.',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['yes', 'Risk present'],
      ['no', 'No risk — reviewed'],
    ],
  },
  {
    key: 'magnesium',
    label: 'Magnesium status?',
    help: 'Unknown means magnesium has not been checked. Low captures a documented deficit; not low requires a reviewed result. This finding does not prescribe a magnesium dose or route.',
    options: [
      ['unknown', 'Unknown / not checked'],
      ['low', 'Low / deficit documented'],
      ['notLow', 'Not low — reviewed'],
    ],
  },
  {
    key: 'mechanism',
    label: 'Most likely mechanism?',
    help: 'Select only a reviewed mechanism: GI loss/poor intake, renal loss/diuretic exposure, or intracellular shift. Unclear means initial review has not established the cause and prompts clinician-owned work-up.',
    options: [
      ['unknown', 'Unknown / not established'],
      ['giLoss', 'GI loss / poor intake'],
      ['renalLoss', 'Renal loss / diuretic'],
      ['shift', 'Intracellular shift'],
      ['unclear', 'Unclear after initial review'],
    ],
  },
];

const stages = [
  {id: 'assess', title: 'Verify & triage', empty: 'Confirm the potassium result and urgent features.'},
  {id: 'route', title: 'Choose route', empty: 'A safe route follows verified severity and findings.'},
  {id: 'safeguard', title: 'Safeguard replacement', empty: 'Review renal clearance and IV controls.'},
  {id: 'correct', title: 'Correct contributors', empty: 'Review magnesium and the mechanism.'},
  {id: 'reassess', title: 'Recheck response', empty: 'Set the next potassium and clinical review.'},
];

const validValues = Object.fromEntries(fields.map(field => [
  field.key,
  new Set(field.options.map(([value]) => value)),
]));
const stageOrder = new Map(stages.map(({id}, index) => [id, index]));

function normalize(input = {}) {
  return Object.fromEntries(fields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function action(id, stage, title, summary, detail, sourceKey = 'aafp', extra = {}) {
  const citation = source[sourceKey];
  return {
    id,
    stage,
    title,
    ...(summary ? {summary} : {}),
    detail,
    sourceUrl: citation.url,
    sourceLabel: citation.label,
    ...extra,
  };
}

function result(values, actions) {
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions};
}

function addUrgency(actions, values) {
  const numericSevere = values.potassium === 'severe';
  const dangerousFinding = values.danger === 'yes';
  if (!numericSevere && !dangerousFinding) return;

  const summary = dangerousFinding
    ? 'Danger features require immediate monitored clinical response.'
    : 'Potassium ≤2.5 mmol/L is a severe feature needing urgent review.';
  const detail = dangerousFinding
    ? 'AAFP lists arrhythmia, paralysis, respiratory failure and severe weakness as severe features. It describes 5–10 mEq IV potassium chloride over 15–30 minutes with cardiac monitoring for severe signs or symptoms, repeated only after reassessment. This is source detail for an urgent clinician-directed response, not an automatic order or a routine ward-rate regimen.'
    : 'AAFP treats potassium at or below 2.5 mmol/L as a severe feature. Obtain urgent senior/monitored assessment and an ECG; the exact prescription, access and monitoring level depend on the current clinical picture. A safe oral route does not make this numeric severity routine oral replacement.';
  actions.push(action(
    'urgent-monitored-response',
    'assess',
    'Escalate to monitored care',
    summary,
    detail,
    'aafp',
    {tone: 'urgent', resourceGroup: 'monitoring'},
  ));
}

function addRoute(actions, values) {
  const mustUseIV = values.potassium === 'severe' || values.danger === 'yes' || values.oralRoute === 'unsafe';

  if (mustUseIV) {
    const reason = values.potassium === 'severe'
      ? 'K ≤2.5 mmol/L is a severe source threshold.'
      : values.danger === 'yes'
        ? 'Urgent ECG, rhythm, neuromuscular, or respiratory feature entered.'
        : 'No safe functioning oral route entered.';
    actions.push(action(
      'supervised-iv-route',
      'route',
      'Use a supervised IV replacement route',
      reason,
      'AAFP reserves IV potassium for severe hypokalaemia, ECG changes, physical signs/symptoms, or inability to take oral supplementation. For routine non-emergency IV replacement, it describes glucose-free isotonic fluid and up to 10 mEq/hour; up to 20 mEq/hour requires central access and cardiac monitoring. This guide intentionally does not select a routine high-rate ward regimen: use the local prescriber, pharmacy, product and monitoring protocol.',
      'aafp',
      {resourceGroup: 'iv-potassium'},
    ));
    actions.push(action(
      'iv-never-push',
      'safeguard',
      'Use controlled infusion safeguards',
      'Never use a manual-syringe IV push.',
      'The current IV product label requires a quantitative infusion device and warns against IV push. Select peripheral versus central access from the final infusate osmolarity and product instructions; approximately 900 mOsm/L or greater requires a central catheter. Verify the actual product, concentration, line, pump, compatibility and local policy before administration.',
      'iv',
      {tone: 'attention', resourceGroup: 'iv-potassium'},
    ));
    return;
  }

  if (values.danger === 'unknown') {
    actions.push(action(
      'confirm-danger-before-route',
      'route',
      'Confirm urgent features before selecting a route',
      'Unknown is not an absent ECG or neuromuscular risk.',
      'AAFP uses ECG abnormalities and physical signs or symptoms to determine whether IV treatment is appropriate. Establish the ECG, rhythm and neuromuscular/respiratory status before treating 2.6–3.4 mmol/L as uncomplicated oral replacement.',
      'aafp',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.oralRoute === 'safe') {
    actions.push(action(
      'prescribed-oral-kcl',
      'route',
      'Prefer prescribed oral potassium',
      'A safe oral route, K >2.5, and no severe features favor oral replacement.',
      'For the reviewed extended-release potassium chloride label, typical treatment is 40–100 mEq/day in divided doses and no more than 40 mEq in one dose. Take the actual extended-release product with meals and a full glass of water; swallow whole. Select dose and formulation from the local product, ongoing losses, renal function and follow-up plan. Solid extended-release tablets are unsuitable with dysphagia, swallowing disorders, or severe GI motility disorder.',
      'oral',
      {resourceGroup: 'oral-potassium'},
    ));
    return;
  }

  actions.push(action(
    'confirm-oral-route',
    'route',
    'Confirm a safe functioning oral route',
    'Do not infer oral eligibility.',
    'AAFP prefers oral replacement only when potassium is above 2.5 mmol/L, no severe signs or symptoms are present, and the gastrointestinal tract is functioning. Establish swallowing safety, GI function and the available formulation before choosing oral therapy.',
    'aafp',
    {tone: 'attention'},
  ));
}

function addRenalSafeguard(actions, values) {
  if (values.renalRisk === 'yes') {
    actions.push(action(
      'renal-clearance-safeguard',
      'safeguard',
      'Reduce and reassess potassium exposure',
      'Renal clearance or retention-risk treatment is present.',
      'The current oral potassium chloride label says renal impairment substantially increases hyperkalaemia risk. Start at the low end of the chosen product range and monitor serum potassium frequently; review urine output, current kidney function and concurrent RAAS inhibitors or NSAIDs. This is a safeguard, not a reason to omit urgent review when severe hypokalaemia is present.',
      'oral',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  } else if (values.renalRisk === 'unknown') {
    actions.push(action(
      'confirm-potassium-clearance',
      'safeguard',
      'Confirm renal clearance before finalizing dose',
      'Do not assume potassium excretion is intact.',
      'Check current renal function, urine output, active potassium-retaining medicines and the potassium trend. Product labeling calls for particular monitoring and dose adjustment when excretion is impaired, including with RAAS inhibitors or NSAIDs.',
      'oral',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addContributors(actions, values) {
  if (values.magnesium === 'low') {
    actions.push(action(
      'correct-documented-magnesium-deficit',
      'correct',
      'Correct the documented magnesium deficit',
      'Review a local magnesium regimen alongside potassium.',
      'The reviewed potassium chloride label calls for attention to magnesium and other electrolytes during potassium depletion, particularly with cardiac disease, renal disease or acidosis, and for correction of identified deficits as appropriate. Magnesium dose and route are deliberately left to the local magnesium protocol and renal review.',
      'oral',
      {resourceGroup: 'magnesium'},
    ));
  } else if (values.magnesium === 'unknown') {
    actions.push(action(
      'check-magnesium',
      'correct',
      'Check magnesium with potassium replacement',
      'Do not call replacement response adequate without the cofactor review.',
      'The reviewed label explicitly includes magnesium in the electrolyte assessment for potassium depletion. Check it with the clinical context, kidney function and any prior replacement before deciding the response is complete.',
      'oral',
      {tone: 'attention', resourceGroup: 'magnesium'},
    ));
  }

  switch (values.mechanism) {
    case 'giLoss':
      actions.push(action(
        'address-gi-loss',
        'correct',
        'Address gastrointestinal loss and intake',
        'Review diarrhea, vomiting, laxatives, feeds and ongoing losses.',
        'AAFP includes gastrointestinal loss and inadequate intake among common mechanisms. Replace potassium in parallel with a plan to stop or quantify continuing loss; no fixed replacement total can be inferred from this selection.',
        'aafp',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'renalLoss':
      actions.push(action(
        'address-renal-or-diuretic-loss',
        'correct',
        'Review renal loss and diuretic exposure',
        'Reconcile the diuretic and renal-wasting context.',
        'AAFP identifies diuretics and renal potassium wasting as important causes. Review the medication list, volume/acid-base context and whether a contributing medicine can be adjusted through the responsible team; this guide makes no medication change.',
        'aafp',
        {resourceGroup: 'urine-potassium'},
      ));
      break;
    case 'shift':
      actions.push(action(
        'address-intracellular-shift',
        'correct',
        'Review an intracellular-shift trigger',
        'Check insulin, beta-agonist, alkalosis, refeeding or other shift context.',
        'AAFP lists insulin and beta-agonists among intracellular-shift causes. Establish whether the result reflects depletion, a temporary shift, or both before estimating replacement need or declaring the potassium response stable.',
        'aafp',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'unclear':
      actions.push(action(
        'structured-cause-workup',
        'correct',
        'Start a structured cause work-up',
        'Use the unexplained-hypokalaemia work-up with the responsible team.',
        'When history and examination do not establish the cause, AAFP describes serum renin/aldosterone and urine potassium, sodium, chloride and creatinine, with thyroid or adrenal testing if uncertainty persists. Interpret urine testing in the full acid-base and volume context.',
        'aafp',
        {resourceGroup: 'urine-potassium'},
      ));
      break;
    default:
      actions.push(action(
        'establish-hypokalemia-mechanism',
        'correct',
        'Establish loss, shift or intake mechanism',
        'The cause has not been entered.',
        'AAFP groups causes into renal losses, gastrointestinal losses, intracellular shifts and inadequate intake. Review the trend, medicines, volume and acid-base context before deciding how much replacement is needed or whether recurrence risk has resolved.',
        'aafp',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
  }
}

function addRecheck(actions, values) {
  const urgent = values.potassium === 'severe' || values.danger === 'yes';
  if (urgent) {
    actions.push(action(
      'urgent-potassium-recheck',
      'reassess',
      'Set a timed potassium, ECG and response check',
      'Urgent IV treatment needs monitored reassessment before repeat dosing.',
      'For severe signs or symptoms treated with urgent IV potassium, AAFP describes potassium checks every 2–4 hours and repeat treatment only until the patient is stable, ECG changes resolve and potassium exceeds 3.0 mmol/L. Use the local high-risk replacement policy for the actual timing, line surveillance and escalation; do not substitute a generic ward schedule.',
      'aafp',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  if (values.danger === 'no' && values.oralRoute === 'safe') {
    actions.push(action(
      'oral-potassium-recheck',
      'reassess',
      'Set a response potassium check',
      'Adjust only after a measured response and ongoing-loss review.',
      'The reviewed oral label requires serum-potassium monitoring and dose adjustment. Set the timing from the prescribed product, renal function, losses, medication changes and clinical trajectory; a normal-looking interval does not establish that losses have stopped.',
      'oral',
      {resourceGroup: 'monitoring'},
    ));
    return;
  }

  actions.push(action(
    'recheck-after-route-established',
    'reassess',
    'Set the response plan after route confirmation',
    'Document the next potassium, ECG and clinical review with the selected route.',
    'Potassium response and monitoring frequency depend on whether replacement is oral or IV, the severity, renal clearance and continuing losses. Complete the unresolved assessment fields rather than applying a default schedule.',
    'aafp',
    {tone: 'attention', resourceGroup: 'monitoring'},
  ));
}

export function evaluate(input = {}) {
  const values = normalize(input);
  const actions = [];

  if (values.potassium === 'unknown') {
    actions.push(action(
      'confirm-potassium-result',
      'assess',
      'Establish a credible potassium result',
      'Unknown potassium does not select a replacement route.',
      'AAFP advises confirming hypokalaemia with a repeat serum potassium when appropriate to exclude pseudohypokalaemia. In a clinically unstable person, do not delay emergency assessment while a credible result is obtained; this guide does not infer a potassium replacement prescription from an unknown value.',
      'aafp',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    if (values.danger === 'yes') {
      actions.push(action(
        'urgent-feature-with-unconfirmed-potassium',
        'assess',
        'Escalate the dangerous clinical feature',
        'Do not attribute an arrhythmia, paralysis or respiratory failure to an unconfirmed potassium value.',
        'Urgent clinical assessment, ECG/rhythm support and differential diagnosis are needed now. This pathway withholds a potassium dose and route until a credible potassium result and access/monitoring context are established.',
        'aafp',
        {tone: 'urgent', resourceGroup: 'monitoring'},
      ));
    } else if (values.danger === 'unknown') {
      actions.push(action(
        'assess-danger-with-unconfirmed-potassium',
        'assess',
        'Assess ECG, rhythm and neuromuscular danger',
        'Unknown is not a negative emergency screen.',
        'Establish the ECG/rhythm, weakness, paralysis and respiratory status while confirming potassium. The source uses those findings to determine treatment urgency.',
        'aafp',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return result(values, actions);
  }

  if (values.potassium === 'notLow') {
    actions.push(action(
      'outside-hypokalemia-threshold',
      'assess',
      'This result does not trigger hypokalaemia replacement',
      'A potassium result at or above 3.5 mmol/L is outside this pathway.',
      'AAFP defines hypokalaemia as potassium below 3.5 mmol/L. Review trend, sampling, treatment already given and the broader clinical picture instead of treating a non-low result as a resolved or new deficit.',
      'aafp',
      {resourceGroup: 'monitoring'},
    ));
    if (values.danger !== 'no') {
      actions.push(action(
        'danger-not-explained-by-nonlow-potassium',
        'assess',
        values.danger === 'yes' ? 'Escalate the dangerous feature' : 'Assess dangerous features',
        values.danger === 'yes' ? 'The entered clinical danger still needs urgent assessment.' : 'Do not infer that urgent features are absent.',
        'A non-low potassium result does not explain away arrhythmia, severe weakness, paralysis or respiratory failure. Assess and treat the active clinical problem through the appropriate emergency pathway; this guide does not add potassium replacement.',
        'aafp',
        {tone: values.danger === 'yes' ? 'urgent' : 'attention', resourceGroup: 'monitoring'},
      ));
    }
    return result(values, actions);
  }

  actions.push(action(
    'verify-trend-and-ecg',
    'assess',
    'Verify the trend and obtain an ECG',
    'Do not delay urgent escalation to finish the checklist.',
    'AAFP advises confirming the result when appropriate and obtaining an ECG when hypokalaemia is identified to help determine urgency. ECG changes may be absent despite clinically important hypokalaemia, so pair it with symptoms, trajectory and the measured potassium.',
    'aafp',
    {resourceGroup: 'monitoring'},
  ));
  if (values.danger === 'unknown') {
    actions.push(action(
      'assess-severe-features',
      'assess',
      'Assess rhythm, weakness and respiratory involvement',
      'Unknown danger status does not qualify as uncomplicated hypokalaemia.',
      'AAFP lists ECG abnormalities and neuromuscular signs among urgent features. Establish these before labeling 2.6–3.4 mmol/L as an uncomplicated oral-replacement situation; a potassium level at or below 2.5 remains urgent regardless.',
      'aafp',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
  addUrgency(actions, values);
  addRoute(actions, values);
  addRenalSafeguard(actions, values);
  addContributors(actions, values);
  addRecheck(actions, values);
  return result(values, actions);
}

export const config = {
  id: 'hypokalemia',
  title: 'Hypokalemia',
  reviewedAt: '2026-09-15',
  scope: 'Adult inpatient hypokalaemia: verify, route replacement, safeguard, and reassess.',
  reviewLimitations: [
    'This is compact adult decision support, not a local electrolyte prescription, infusion-pump protocol, order set, or patient-specific plan.',
    'AAFP is a published clinical review rather than a local hospital protocol; DailyMed labels are U.S. product-specific prescribing information. Local formulation, availability, concentration, access, monitoring and authorization still govern care.',
    'The engine never assigns an IV dose, total replacement deficit, infusion rate, line or automatic repeat dose. It deliberately excludes a routine high-rate ward regimen and never supports IV push.',
    'K ≤2.5 mmol/L, ECG/rhythm/neuromuscular danger, pregnancy, DKA, refeeding, dialysis, critical illness and complex acid-base disease require context-specific escalation or separate pathways.',
    'A catalog product or local resource link establishes only product identity, not current orderability, suitability, dose, route safety, or permission to prescribe.',
  ],
  sources: Object.values(source),
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm a true low potassium, identify urgent features, choose oral versus supervised IV replacement, correct contributors, and measure the response.',
    recognition: [
      'AAFP defines hypokalaemia as potassium below 3.5 mmol/L; confirm an unexpected result and review its trend.',
      'Urgent features include potassium ≤2.5 mmol/L, ECG/rhythm abnormality, paralysis, respiratory failure, or severe weakness.',
      'Obtain an ECG when hypokalaemia is identified, but an absent ECG change does not exclude clinically important depletion.',
    ],
    redFlags: [
      'Arrhythmia, ECG change, syncope/cardiac instability, paralysis, respiratory failure, or severe weakness.',
      'Potassium ≤2.5 mmol/L, rapidly falling potassium, digoxin/cardiac disease context, or inability to take oral treatment.',
      'Oliguria/severe renal impairment, potassium-retaining medicines, uncontrolled loss, hypomagnesaemia, DKA, refeeding, or uncertain route/monitoring context.',
    ],
    steps: [
      {
        role: 'Verify & triage',
        text: 'Confirm the potassium result when appropriate, review trend and obtain ECG. Do not delay urgent clinical response for an arrhythmia, paralysis, respiratory failure or severe weakness.',
        tools: ['monitoring'],
      },
      {
        role: 'Choose oral only when eligible',
        text: 'With K >2.5 mmol/L, no severe features and a functioning safe GI route, oral potassium is preferred. The reviewed ER KCl label lists 40–100 mEq/day divided for treatment, with no more than 40 mEq in one dose.',
        dosingNote: 'Product-specific detail: take ER tablets with meals and liquid; swallow whole. Verify the stocked product and renal plan.',
        tools: ['oral-potassium'],
      },
      {
        role: 'Use supervised IV only when indicated',
        text: 'For severe features, K ≤2.5 mmol/L, or no safe oral route, use a clinician-directed IV pathway. AAFP describes 5–10 mEq IV KCl over 15–30 min with cardiac monitoring for severe symptoms; stable IV replacement is generally up to 10 mEq/hour peripherally.',
        dosingNote: '20 mEq/hour is a monitored central-access exception in the AAFP review, not a routine ward regimen. Never IV push; verify local product, pump, concentration and line.',
        tools: ['iv-potassium', 'monitoring'],
      },
      {
        role: 'Correct contributors',
        text: 'Check magnesium, renal clearance, medications, ongoing GI/renal loss and transcellular-shift context. Correct documented deficits and causes through the appropriate local protocol.',
        tools: ['magnesium', 'workup'],
      },
      {
        role: 'Measure response',
        text: 'Set the next potassium, ECG and clinical review with the selected route. AAFP describes 2–4-hour potassium checks during urgent severe-symptom IV treatment; use local timing for other situations.',
        tools: ['monitoring'],
      },
    ],
    monitoring: [
      'Use cardiac monitoring for severe symptoms and for IV potassium rates at or above 10 mEq/hour in the AAFP review; verify the local high-risk infusion policy.',
      'Monitor potassium and adjust dosing with renal impairment, oliguria, RAAS inhibitors, NSAIDs, or other potassium-retention risk.',
      'Record the actual product, concentration, line, infusion device, response result, ECG/rhythm and continuing losses. A product catalog does not establish a safe prescription.',
    ],
    sources: Object.values(source),
  },
};

export default config;
