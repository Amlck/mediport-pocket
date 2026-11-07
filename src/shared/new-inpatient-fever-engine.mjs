// Compact, source-reviewed data and decision engine for adult inpatient fever.
// Rendering, local-resource presentation, and the durable fever-episode tracker
// live elsewhere. This module never assembles or submits orders.

export const ICU_FEVER_SOURCE = 'https://www.idsociety.org/practice-guideline/new-fever-in-critically-ill-patients/';
export const NEUTROPENIC_SEPSIS_SOURCE = 'https://www.nice.org.uk/guidance/cg151/chapter/Recommendations';
export const HEAT_SOURCE = 'https://www.cdc.gov/niosh/heat-stress/about/illnesses.html';
export const DRUG_TOXIN_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13502533/';
export const ACETAMINOPHEN_IV_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7243bf2c-2c44-4dff-8a9e-d788d31dca86';

const ICU_SOURCE = {
  label: 'SCCM/IDSA new fever guideline (2023; adult ICU)',
  url: ICU_FEVER_SOURCE,
};
const NEUTROPENIC_SOURCE = {
  label: 'NICE CG151 neutropenic sepsis recommendations',
  url: NEUTROPENIC_SEPSIS_SOURCE,
};
const HEAT_EMERGENCY_SOURCE = {
  label: 'CDC/NIOSH heat-related illnesses (reviewed 2026)',
  url: HEAT_SOURCE,
};
const DRUG_TOXIN_EMERGENCY_SOURCE = {
  label: 'CMAJ serotonin-toxicity review (2026; recognition only)',
  url: DRUG_TOXIN_SOURCE,
};
const ACETAMINOPHEN_SOURCE = {
  label: 'DailyMed acetaminophen injection label (2025)',
  url: ACETAMINOPHEN_IV_SOURCE,
};

const fields = [
  {
    key: 'temperatureEvidence',
    label: 'Temperature evidence',
    options: [
      ['unknown', 'Unknown / no reliable measurement'],
      ['below38', '<38.0°C measured'],
      ['38toLess38_3DurationUnknown', '38.0 to <38.3°C · duration unclear'],
      ['38toLess38_3Sustained', '38.0 to <38.3°C ≥1 h'],
      ['38_3Reliable', '≥38.3°C · core/oral/rectal'],
      ['38_3Peripheral', '≥38.3°C · peripheral site'],
    ],
    help: 'SCCM/IDSA uses one measured temperature of 38.3°C or higher for its adult ICU fever definition. It prefers central measurement when accuracy is critical; otherwise oral or rectal over axillary, tympanic, or temporal measurement. The 38.0 to <38.3°C sustained-for-one-hour option is the chemotherapy-neutropenia definition cited in that guideline, not its general ICU threshold.',
  },
  {
    key: 'careSetting',
    label: 'Care setting',
    options: [
      ['unknown', 'Unknown'],
      ['icu', 'Adult ICU'],
      ['otherInpatient', 'Other inpatient area'],
    ],
    help: 'The SCCM/IDSA fever recommendations directly cover adults with new fever after ICU admission, without severe immunocompromise. “Other inpatient area” keeps ICU-specific tests from becoming a ward default.',
  },
  {
    key: 'deterioration',
    label: 'Acute deterioration?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['absent', 'No — reviewed'],
      ['present', 'Yes — instability, organ or mental change'],
    ],
  },
  {
    key: 'anticancerRisk',
    label: 'Anticancer / severe immune risk?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['absent', 'No special immune risk — reviewed'],
      ['present', 'Current/recent anticancer therapy or known neutropenia'],
      ['otherSevere', 'Transplant or other severe immunocompromise'],
    ],
    help: 'This is a special-population screen, not a diagnosis. NICE says to suspect neutropenic sepsis when a person having anticancer treatment becomes unwell; WBC alone is not a measured ANC. SCCM/IDSA does not directly address transplant or other severe immunocompromise.',
  },
  {
    key: 'heatEmergency',
    label: 'Heat-hyperthermia emergency?',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['absent', 'No heat/exertion or drug/toxin emergency — reviewed'],
      ['heatSuspected', 'Heat/exertion + marked heat or CNS change'],
      ['drugToxinConcern', 'Drug/toxin + rigidity, clonus, autonomic or mental change'],
    ],
    help: 'This is an emergency-recognition screen. It does not diagnose serotonin syndrome, neuroleptic malignant syndrome, malignant hyperthermia, or another toxic syndrome, and it does not choose a syndrome-specific regimen.',
  },
  {
    key: 'focus',
    label: 'Context after bedside assessment',
    options: [
      ['unknown', 'Unknown / not assessed'],
      ['none', 'No focus after history and exam'],
      ['respiratory', 'Respiratory syndrome'],
      ['urinary', 'Urinary / catheter context'],
      ['diarrhea', 'Diarrhea / enteric syndrome'],
      ['lineDevice', 'Line, device, wound, or recent surgery'],
      ['otherLocalizing', 'Other localizing syndrome'],
      ['noninfectious', 'Obvious noninfectious trigger'],
    ],
    help: 'Choose the clinical context, not a test bundle. SCCM/IDSA says history and examination should focus subsequent diagnostics; an immediately postoperative, clearly noninfectious temperature may not need an infection investigation.',
  },
  {
    key: 'episodePhase',
    label: 'Episode phase',
    options: [
      ['unknown', 'Unknown / not recorded'],
      ['initial', 'Initial assessment'],
      ['improving', 'Improving after care'],
      ['persistent', 'Persistent or recurrent after review'],
    ],
    help: 'This describes the documented clinical trajectory. It is not a culture result, medication-administration record, or authorization to change therapy.',
  },
  {
    key: 'comfortMedication',
    label: 'Comfort medication status',
    options: [
      ['unknown', 'Unknown / safety not reviewed'],
      ['notRequested', 'No comfort treatment requested'],
      ['ready', 'Comfort requested; weight, route, exposure and risk checked'],
      ['needsReview', 'Comfort requested; exposure or risk unresolved'],
    ],
    help: '“Ready” requires a documented indication, the route and current weight, all oral/IV/rectal and combination-product acetaminophen exposure in the last 24 hours, and liver, renal, volume, and allergy review. It does not select a local product or order.',
  },
];

const stages = [
  {id: 'verify', title: 'Verify the signal'},
  {id: 'route', title: 'Route urgent exceptions'},
  {id: 'evaluate', title: 'Choose the evaluation'},
  {id: 'comfort', title: 'Treat comfort safely'},
  {id: 'reassess', title: 'Reassess the episode'},
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
  source = ICU_SOURCE,
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

function hasMeasuredICUFever(values) {
  return values.temperatureEvidence === '38_3Reliable' || values.temperatureEvidence === '38_3Peripheral';
}

function hasNeutropenicFeverSignal(values) {
  return values.temperatureEvidence === '38toLess38_3Sustained' || hasMeasuredICUFever(values);
}

function addTemperatureAction(actions, values) {
  switch (values.temperatureEvidence) {
    case 'unknown':
      actions.push(action(
        'obtain-documented-temperature',
        'verify',
        'Obtain and document a reliable temperature',
        'Do not call fever from an unverified report.',
        'Record value, time, route and peak. In the ICU source, use a central method when accuracy is critical; otherwise oral or rectal is preferred over axillary, tympanic, or temporal measurement. Do not delay emergency assessment if the patient is deteriorating.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case '38_3Peripheral':
      actions.push(action(
        'confirm-peripheral-fever-measurement',
        'verify',
        'Confirm the temperature when it changes management',
        'Peripheral ≥38.3°C: repeat with a more reliable route if feasible.',
        'SCCM/IDSA uses one measured temperature of 38.3°C or higher for ICU fever, while warning that axillary, tympanic, and temporal methods are less reliable. Preserve the original reading and route; do not erase an urgent clinical concern while confirmation is obtained.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case '38_3Reliable':
      actions.push(action(
        'measured-icu-fever',
        'verify',
        values.careSetting === 'icu' ? 'Measured ICU fever threshold reached' : 'Measured ≥38.3°C',
        'One reliable measurement ≥38.3°C.',
        values.careSetting === 'icu'
          ? 'This is SCCM/IDSA’s adult ICU fever definition. It starts an assessment, not an automatic culture, antibiotic, imaging, or antipyretic bundle.'
          : 'SCCM/IDSA’s 38.3°C definition is ICU-specific. This measurement does not create a ward culture, antibiotic, imaging, or antipyretic bundle.',
        {resourceGroup: 'monitoring'},
      ));
      break;
    case '38toLess38_3Sustained':
      actions.push(action(
        'document-sustained-lower-temperature',
        'verify',
        'Record the sustained temperature and context',
        '38.0 to <38.3°C for at least 1 hour.',
        'This does not meet the SCCM/IDSA single 38.3°C ICU definition. Its fever-definition section cites this sustained threshold for chemotherapy-related neutropenia, so it must remain visible when anticancer/neutropenic risk is present.',
        {resourceGroup: 'monitoring'},
      ));
      break;
    case '38toLess38_3DurationUnknown':
      actions.push(action(
        'clarify-temperature-duration',
        'verify',
        'Clarify temperature duration and method',
        '38.0 to <38.3°C alone does not establish either source threshold.',
        'Document the method, repeat value and duration. A lower or incomplete temperature history does not exclude infection or acute deterioration; in anticancer/neutropenic risk it must not be treated as a negative screen.',
        {tone: 'attention', resourceGroup: 'monitoring'},
      ));
      break;
    case 'below38':
      actions.push(action(
        'below-icu-fever-threshold',
        'verify',
        'Below the ICU fever threshold',
        'Measured below 38.0°C.',
        'This does not meet the SCCM/IDSA ICU fever definition, but infection and deterioration can occur without fever. Continue a symptom- and risk-based assessment when the patient is unwell.',
        {resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addDeteriorationAction(actions, values) {
  if (values.deterioration === 'present') {
    actions.push(action(
      'escalate-acute-deterioration',
      'route',
      'Escalate acute deterioration now',
      'Do not wait for repeat temperature, cultures, or antipyretic effect.',
      'Fever is not required for serious infection or another acute process. Activate the local urgent assessment response and use the hypotension, sepsis, respiratory, or other syndrome pathway that fits the findings. This fever guide does not set a resuscitation or antimicrobial regimen.',
      {tone: 'urgent', related: ['sepsis-septic-shock', 'hypotension', 'acute-hypoxemia-dyspnea'], resourceGroup: 'monitoring'},
    ));
  } else if (values.deterioration === 'unknown') {
    actions.push(action(
      'assess-deterioration-before-stable-lane',
      'route',
      'Assess deterioration before a stable-fever route',
      'Complete observations, perfusion and mental-status review.',
      'Unknown hemodynamic, organ-function, respiratory, or mental-status change is not a negative finding. This engine does not offer a stable source-directed lane until acute deterioration has been actively excluded.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
  }
}

function addHeatAction(actions, values) {
  if (values.heatEmergency === 'heatSuspected') {
    actions.push(action(
      'suspected-heat-hyperthermia-emergency',
      'route',
      'Suspected heat hyperthermia: emergency cooling response',
      'Urgent emergency/critical-care support and rapid cooling.',
      'CDC/NIOSH describes heat stroke as an emergency, with very high temperature and central nervous-system features such as confusion, coma, or seizure. Use the local emergency cooling protocol while support is mobilized; routine antipyretic treatment is not the response to failed heat regulation. This branch does not diagnose or treat drug-induced hyperthermia syndromes.',
      {source: HEAT_EMERGENCY_SOURCE, tone: 'urgent', related: ['hypotension', 'acute-hypoxemia-dyspnea']},
    ));
  } else if (values.heatEmergency === 'drugToxinConcern') {
    actions.push(action(
      'urgent-drug-toxin-hyperthermia-assessment',
      'route',
      'Possible drug/toxin hyperthermia: urgent specialist assessment',
      'Urgent emergency, critical-care, or toxicology assessment; do not use routine fever management.',
      'Drug/toxin-associated hyperthermia with rigidity, clonus, autonomic instability, or altered mental state may represent a time-critical toxic syndrome. The reviewed CMAJ serotonin-toxicity review identifies hyperthermia as a medical emergency, but this guide does not diagnose serotonin syndrome, neuroleptic malignant syndrome, malignant hyperthermia, or another toxic syndrome; it does not choose antidotes, cooling endpoints, sedation, paralysis, or medication withdrawal. Activate the current local emergency, toxicology, anaesthesia, or critical-care protocol while the differential is established.',
      {source: DRUG_TOXIN_EMERGENCY_SOURCE, tone: 'urgent', related: ['hypotension', 'acute-hypoxemia-dyspnea']},
    ));
  } else if (values.heatEmergency === 'unknown') {
    actions.push(action(
      'assess-heat-hyperthermia-context',
      'route',
      'Assess heat/exertion hyperthermia context',
      'Review heat/exertion exposure, marked heat, and central nervous-system change.',
      'CDC/NIOSH describes heat stroke as an emergency, with very high temperature and central nervous-system features such as confusion, coma, or seizure. Until that context is actively reviewed, this engine does not open a stable regulated-fever or routine antipyretic lane.',
      {source: HEAT_EMERGENCY_SOURCE, tone: 'attention'},
    ));
    actions.push(action(
      'assess-drug-toxin-hyperthermia-context',
      'route',
      'Assess drug/toxin hyperthermia concern',
      'Review exposure plus rigidity, clonus, autonomic, or mental-status change.',
      'The focused CMAJ serotonin-toxicity review supports urgent recognition of hyperthermia with neurological or autonomic toxicity features. This is a precautionary screen, not a diagnostic rule for serotonin syndrome or another toxic syndrome; use the local emergency/toxicology route if concern is present.',
      {source: DRUG_TOXIN_EMERGENCY_SOURCE, tone: 'attention'},
    ));
  }
}

function addSpecialPopulationAction(actions, values) {
  if (values.anticancerRisk === 'unknown') {
    actions.push(action(
      'assess-special-immune-risk',
      'route',
      'Check anticancer and severe immune risk',
      'Do not treat an unreviewed special-population screen as negative.',
      'SCCM/IDSA does not directly cover severe immunocompromise. Confirm current or recent anticancer therapy, known neutropenia, transplant or other severe immunocompromise, and the relevant specialist plan before using a stable routine-fever lane; WBC does not establish an ANC.',
      {tone: 'attention', resourceGroup: 'hematology'},
    ));
    return {urgent: false, unresolved: true, specialist: false};
  }

  if (values.anticancerRisk === 'otherSevere') {
    actions.push(action(
      'severe-immunocompromise-specialist-route',
      'route',
      'Use a specialist severe-immunocompromise route',
      'The general ICU fever guide does not directly cover this population.',
      'SCCM/IDSA explicitly excludes direct recommendations for organ transplant recipients and other severe immunocompromise because of their heterogeneous risks. Obtain the current transplant, haematology, oncology, infectious-diseases, or local specialist pathway as applicable. This does not infer NICE’s anticancer-specific neutropenic-sepsis antibiotic route or a generic ICU testing bundle.',
      {source: ICU_SOURCE, tone: 'attention'},
    ));
    return {urgent: false, unresolved: false, specialist: true};
  }

  if (values.anticancerRisk !== 'present') return {urgent: false, unresolved: false, specialist: false};

  if (hasNeutropenicFeverSignal(values) || values.deterioration === 'present') {
    actions.push(action(
      'suspected-neutropenic-sepsis-emergency',
      'route',
      'Treat suspected neutropenic sepsis as an emergency',
      'Urgent assessment and empiric antibiotics immediately when suspected.',
      'NICE says to suspect neutropenic sepsis when a person having anticancer treatment becomes unwell, and to treat suspected cases as an acute medical emergency with empiric antibiotic therapy immediately. Its initial assessment includes history/examination, full blood count, kidney and liver tests including albumin, CRP, lactate, and blood culture. This engine neither derives ANC from WBC nor selects a local antibiotic, dose, culture timing, or chest radiograph; use the current oncology/ID and local antimicrobial protocol.',
      {source: NEUTROPENIC_SOURCE, tone: 'urgent', resourceGroup: 'hematology', related: ['sepsis-septic-shock']},
    ));
    return {urgent: true, unresolved: false, specialist: false};
  }

  actions.push(action(
    'clarify-neutropenic-sepsis-status',
    'route',
    'Clarify the neutropenic-sepsis status now',
    'Anticancer/neutropenic risk is present, but the trigger is incomplete.',
    'NICE’s special-population route applies when an anticancer-treatment patient becomes unwell. Confirm symptoms, temperature trajectory and measured ANC with the oncology pathway; do not use a lower, unverified, or incomplete temperature history to rule that risk out, and do not borrow the general ICU route as a substitute.',
    {source: NEUTROPENIC_SOURCE, tone: 'attention', resourceGroup: 'hematology'},
  ));
  return {urgent: false, unresolved: true, specialist: false};
}

function addSpecialistEvaluationAction(actions) {
  actions.push(action(
    'severe-immunocompromise-specialist-evaluation',
    'evaluate',
    'Use the applicable specialist fever evaluation',
    'Choose testing and treatment with the responsible specialist pathway.',
    'SCCM/IDSA does not directly provide a generally applicable testing or treatment route for transplant recipients or other severe immunocompromise. Record the responsible specialist service and use its current local pathway; this engine does not infer a generic culture bundle, imaging bundle, empiric antibiotic, or antipyretic regimen.',
    {source: ICU_SOURCE, tone: 'attention'},
  ));
}

function addSettingAction(actions, values) {
  if (values.careSetting === 'unknown') {
    actions.push(action(
      'confirm-care-setting',
      'evaluate',
      'Confirm the care setting before importing ICU tests',
      'The ICU guideline is not a ward order set.',
      'SCCM/IDSA directly addresses adult ICU fever after ICU admission. Until setting and applicability are known, this engine offers no chest-radiograph, culture, or biomarker routine; use local clinical assessment instead.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
    return false;
  }
  if (values.careSetting === 'otherInpatient') {
    actions.push(action(
      'other-inpatient-local-evaluation',
      'evaluate',
      'Use a local source-directed inpatient evaluation',
      'Do not turn ICU recommendations into a ward bundle.',
      'The SCCM/IDSA document is ICU-specific. For another inpatient area, choose investigations from the history, examination, devices, procedures, epidemiology and deterioration risk; this guide does not infer pancultures, imaging, biomarkers, or empiric antibiotics from temperature alone.',
      {tone: 'attention', resourceGroup: 'workup'},
    ));
  }
  return true;
}

function addFocusedEvaluation(actions, values) {
  const inIcu = values.careSetting === 'icu';
  switch (values.focus) {
    case 'unknown':
      actions.push(action(
        'complete-focused-history-and-exam',
        'evaluate',
        'Complete a focused history and examination',
        'Do this before selecting specimens or broad panels.',
        'The ICU guideline says history and examination should identify potential sources, with tests sent for those sources rather than reflexively culturing every possible site. A missing focus is not permission to order every local test group.',
        {tone: 'attention', resourceGroup: 'workup'},
      ));
      break;
    case 'none':
      if (inIcu) {
        actions.push(action(
          'icu-no-focus-chest-radiograph',
          'evaluate',
          'ICU fever with no focus: start with chest radiograph',
          'Do not add an all-source culture or imaging bundle.',
          'SCCM/IDSA recommends chest radiography for fever developing during ICU stay. It recommends against routine abdominal ultrasound/POCUS as an initial test when there are no abdominal signs, liver-test abnormalities, or recent abdominal surgery. If a blood-culture indication is established, follow the source-specific collection branch rather than treating a temperature alone as a panculture order.',
          {resourceGroup: 'chest-imaging'},
        ));
      } else {
        actions.push(action(
          'no-focus-reassess-not-panculture',
          'evaluate',
          'No focus: reassess rather than order every test',
          'No routine blood, urine, sputum, stool, or viral panel is inferred.',
          'Repeat focused history and examination, review new procedures/devices and noninfectious possibilities, then select a source-specific test only if the clinical context supports it. The ICU source cannot establish a general-ward no-focus bundle.',
          {resourceGroup: 'workup'},
        ));
      }
      break;
    case 'respiratory':
      actions.push(action(
        'respiratory-source-evaluation',
        'evaluate',
        inIcu ? 'Target the respiratory syndrome' : 'Use local respiratory source evaluation',
        inIcu ? 'ICU: chest radiograph; viral testing only with respiratory syndrome.' : 'Choose specimen, imaging, and isolation from the syndrome.',
        inIcu
          ? 'SCCM/IDSA recommends chest radiography for fever developing during ICU stay and suggests viral NAAT testing when pneumonia or new upper-respiratory symptoms are suspected. Choose specimen, assay and imaging from the clinical syndrome and local availability.'
          : 'SCCM/IDSA does not define a ward respiratory bundle. Use local assessment to choose specimen, imaging, infection-control action and test timing; there is no preselected panel.',
        {resourceGroup: 'respiratory'},
      ));
      break;
    case 'urinary':
      actions.push(action(
        'urinary-source-evaluation',
        'evaluate',
        inIcu ? 'Target urinary testing to suspected UTI' : 'Use local urinary source evaluation',
        inIcu ? 'Pyuria plus suspected UTI: replace catheter, then culture the new specimen.' : 'Do not culture urine merely because fever is present.',
        inIcu
          ? 'For a febrile ICU patient with pyuria and suspected UTI, SCCM/IDSA recommends replacing an indwelling urinary catheter and obtaining culture from the newly placed catheter. It warns that asymptomatic bacteriuria can lead to unnecessary antibiotics. Select urinalysis and culture from the suspected urinary source; they are not defaults.'
          : 'The ICU urinary recommendation is not a ward default. Select urinalysis/culture only from urinary symptoms, catheter context, another likely source, and local policy.',
        {resourceGroup: 'urinary'},
      ));
      break;
    case 'diarrhea':
      actions.push(action(
        'enteric-source-evaluation',
        'evaluate',
        'Target enteric testing to the diarrheal syndrome',
        'Do not order the entire stool group.',
        'The fever guideline’s general rule is source-focused testing after history and examination. Culture, toxin, antigen and PCR tests answer different questions; choose the clinically appropriate assay and infection-control response from the diarrheal syndrome and local policy.',
        {resourceGroup: 'diarrhea'},
      ));
      break;
    case 'lineDevice':
      actions.push(action(
        'line-device-source-evaluation',
        'evaluate',
        inIcu ? 'Use the ICU central-line culture method when indicated' : 'Assess the line/device as a possible source',
        inIcu ? 'If CVC cultures are indicated: central plus peripheral, with at least two lumens.' : 'Choose line/device testing with local specialist input.',
        inIcu
          ? 'For ICU fever without an obvious source and a central venous catheter, SCCM/IDSA recommends simultaneous central and peripheral blood cultures for differential time to positivity; when central cultures are indicated, sample at least two lumens. When blood cultures are performed in adult ICU patients, collect at least two sets from different sites.'
          : 'The ICU central-line recommendations are not a universal ward instruction. Evaluate device type, signs, alternative sources and local line-infection policy before selecting cultures or removal actions.',
        {resourceGroup: 'cultures'},
      ));
      break;
    case 'otherLocalizing':
      actions.push(action(
        'other-localizing-source-evaluation',
        'evaluate',
        'Choose a site-specific specimen or imaging study',
        'Target the syndrome; do not broaden to a fever bundle.',
        'Use the focal symptoms, examination, procedure timing, device context and local availability to select the relevant study. For ICU patients after thoracic, abdominal, or pelvic surgery with no source on initial workup, SCCM/IDSA recommends CT in collaboration with the surgical service; it does not make that imaging routine for every fever.',
        {resourceGroup: 'workup'},
      ));
      break;
    case 'noninfectious':
      actions.push(action(
        'document-noninfectious-context-and-watch',
        'evaluate',
        'Document the noninfectious context and keep reassessing',
        'An obvious cause may not need an infection workup now.',
        'SCCM/IDSA notes that not all febrile episodes need investigation when a noninfectious cause is obvious, such as an immediate postoperative temperature. This is not a rule-out for infection: reassess if the trajectory, examination, or deterioration changes.',
        {resourceGroup: 'monitoring'},
      ));
      break;
  }
}

function addComfortAction(actions, values, stableFeverLane) {
  if (!stableFeverLane || !hasMeasuredICUFever(values) || values.careSetting !== 'icu') return;
  if (values.comfortMedication === 'ready') {
    actions.push(action(
      'conditional-iv-acetaminophen-reference',
      'comfort',
      'Use a conditional IV acetaminophen label reference',
      '≥50 kg: 1,000 mg q6h or 650 mg q4h; <50 kg: 15 mg/kg q6h or 12.5 mg/kg q4h.',
      'For the reviewed IV label, the maximum is 4,000 mg/24 h for adults/adolescents weighing 50 kg or more, or 75 mg/kg/24 h (up to 3,750 mg) below 50 kg, including every oral, IV, rectal and combination-product source. It is contraindicated in severe hepatic impairment or severe active liver disease; use caution with hepatic disease, alcohol use, chronic malnutrition, severe hypovolemia or severe renal impairment. This is a conditional product-label reference, not a local regimen or an automatic selection of the local 1,000 mg/100 mL vial; confirm exact formulation, compatibility, local policy and prescription authority before any dose.',
      {source: ACETAMINOPHEN_SOURCE, resourceGroup: 'antipyretic'},
    ));
  } else if (values.comfortMedication === 'needsReview') {
    actions.push(action(
      'resolve-antipyretic-safety-before-dose',
      'comfort',
      'Resolve antipyretic safety before a dose',
      'Verify weight, route, all-source 24-hour exposure, and organ/volume risk.',
      'SCCM/IDSA suggests avoiding routine antipyretics merely to reduce temperature in critically ill patients, while allowing antipyretics for patients who value comfort. Before any local product is chosen, reconcile oral, IV, rectal and combination-product exposure, plus hepatic disease, alcohol use, malnutrition, hypovolemia, renal impairment, allergy and route permission.',
      {tone: 'attention', resourceGroup: 'antipyretic'},
    ));
  }
}

function addReassessmentAction(actions, values, urgentOverride, assessmentComplete, specialistExclusion) {
  if (values.episodePhase === 'unknown') {
    actions.push(action(
      'record-episode-phase-and-next-review',
      'reassess',
      'Record the trajectory and an explicit next review',
      'Initial, improving, or persistent/recurrent is not yet recorded.',
      'Record temperature value, route, time, observations, working source, tests/treatment already given, and a next review plan. The ICU guideline does not supply a universal reassessment interval.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (urgentOverride) {
    actions.push(action(
      'urgent-episode-documentation',
      'reassess',
      'Document response while urgent care proceeds',
      'Do not use a falling temperature alone as a resolution marker.',
      'Keep the emergency pathway active until the clinical response and source plan are reviewed. Record timing, observations, interventions and escalation ownership; this guide does not set a de-escalation or treatment-stop rule for an unresolved urgent condition.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (specialistExclusion && assessmentComplete) {
    actions.push(action(
      'set-specialist-fever-follow-up',
      'reassess',
      'Set specialist follow-up for this episode',
      'Record specialist owner, trajectory, and an explicit next reassessment.',
      'For transplant or other severe immunocompromise, retain the documented episode phase and use the responsible specialist pathway to review findings, response, source control, precautions, and escalation need. A temperature change alone does not close the episode, and this guide does not infer a treatment change or generic follow-up regimen.',
      {source: ICU_SOURCE, tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (!assessmentComplete) {
    actions.push(action(
      'complete-gaps-before-episode-closure',
      'reassess',
      'Complete the unresolved assessment before closing the episode',
      'The core assessment remains incomplete.',
      'Reassess after temperature reliability, setting, acute deterioration, special-population status and heat context are resolved. A lower temperature or transient defervescence does not prove that the clinical issue is resolved.',
      {tone: 'attention', resourceGroup: 'monitoring'},
    ));
    return;
  }
  if (values.episodePhase === 'initial') {
    actions.push(action(
      'set-explicit-fever-reassessment',
      'reassess',
      'Set the next measured reassessment',
      'Record method, trajectory, working source and review owner.',
      'Set a patient- and setting-specific next review after the selected evaluation. Preserve temperature method/site and timing so values are comparable; record pending tests, treatment already given, source-control/precautions questions and the reason to escalate. The source does not provide a one-size-fits-all interval.',
      {resourceGroup: 'monitoring'},
    ));
  } else if (values.episodePhase === 'improving') {
    actions.push(action(
      'reassess-improving-fever-course',
      'reassess',
      'Keep the improving course under explicit review',
      'Defervescence alone does not settle the source or disposition.',
      'Compare temperature method and timing, complete observations, focal findings, test results, source-control status and current treatment plan. Do not mark an episode resolved from a temperature change alone; retain an explicit follow-up or closure decision.',
      {resourceGroup: 'monitoring'},
    ));
  } else if (values.episodePhase === 'persistent') {
    actions.push(action(
      'reassess-persistent-or-recurrent-fever',
      'reassess',
      'Reassess persistent or recurrent fever',
      'Re-evaluate source, results, noninfectious causes and escalation need.',
      'Recheck the clinical trajectory and focused examination before repeating broad tests or changing therapy. For a neutropenic-sepsis patient, NICE specifically says not to switch initial empiric antibiotics for unresponsive fever unless clinical deterioration or a microbiological indication is present; this general fever engine does not select antimicrobial changes.',
      {tone: 'attention', resourceGroup: 'monitoring', source: NEUTROPENIC_SOURCE},
    ));
  }
}

function stageNotes(values, actions) {
  const hasStage = stage => actions.some(item => item.stage === stage);
  const notes = {};
  if (!hasStage('verify')) notes.verify = 'Record a measured temperature, route, time and peak.';
  if (!hasStage('route')) {
    notes.route = values.deterioration === 'absent' && values.anticancerRisk === 'absent' && values.heatEmergency === 'absent'
      ? 'No urgent exception identified from the reviewed findings.'
      : 'Confirm deterioration, special-population risk and heat context.';
  }
  if (!hasStage('evaluate')) {
    notes.evaluate = actions.some(item => item.tone === 'urgent')
      ? 'Urgent care takes precedence; do not assemble a stable fever workup.'
      : 'Resolve the assessment gaps above before selecting tests.';
  }
  if (!hasStage('comfort')) {
    if (actions.some(item => item.tone === 'urgent')) notes.comfort = 'Do not let routine comfort treatment replace the urgent pathway.';
    else if (values.comfortMedication === 'notRequested') notes.comfort = 'No comfort medication selected.';
    else notes.comfort = 'A medication reference appears only after a stable ICU fever lane and documented safety check.';
  }
  if (!hasStage('reassess')) notes.reassess = 'Document the trajectory and next review before closing the episode.';
  return notes;
}

export function evaluate(input = {}) {
  const values = normalized(input);
  const actions = [];
  addTemperatureAction(actions, values);
  addDeteriorationAction(actions, values);
  addHeatAction(actions, values);
  const specialPopulation = addSpecialPopulationAction(actions, values);

  const urgentOverride = values.deterioration === 'present'
    || values.heatEmergency === 'heatSuspected'
    || values.heatEmergency === 'drugToxinConcern'
    || specialPopulation.urgent;
  const assessmentGaps = values.deterioration === 'unknown'
    || values.heatEmergency === 'unknown'
    || values.anticancerRisk === 'unknown'
    || values.careSetting === 'unknown'
    || values.temperatureEvidence === 'unknown'
    || specialPopulation.unresolved;
  const assessmentComplete = !urgentOverride && !assessmentGaps;

  let stableFeverLane = false;
  if (!urgentOverride && specialPopulation.specialist) {
    addSpecialistEvaluationAction(actions);
    if (values.careSetting === 'unknown') addSettingAction(actions, values);
  } else if (!urgentOverride && values.careSetting === 'unknown') {
    addSettingAction(actions, values);
  } else if (assessmentComplete && hasMeasuredICUFever(values)) {
    addSettingAction(actions, values);
    addFocusedEvaluation(actions, values);
    stableFeverLane = true;
  } else if (assessmentComplete && !hasMeasuredICUFever(values)) {
    actions.push(action(
      'no-stable-fever-workup-unlocked',
      'evaluate',
      'No ICU stable-fever workup is unlocked',
      'The measured temperature does not meet the single ≥38.3°C ICU definition.',
      'Do not use this as a negative infection screen. Continue a symptom- and risk-based assessment, and return to the appropriate pathway if deterioration, anticancer/neutropenic risk, or heat-hyperthermia context emerges.',
      {resourceGroup: 'workup'},
    ));
  }

  addComfortAction(actions, values, stableFeverLane);
  addReassessmentAction(actions, values, urgentOverride, assessmentComplete, specialPopulation.specialist);
  actions.sort((left, right) => stageOrder.get(left.stage) - stageOrder.get(right.stage));
  return {values, actions, stageNotes: stageNotes(values, actions)};
}

export const config = {
  id: 'new-inpatient-fever',
  title: 'New Inpatient Fever',
  reviewedAt: '2026-09-15',
  reviewLabel: 'Upgraded · scope-limited fever review',
  scope: 'Adult ICU fever evaluation; special-risk routes are separately source-scoped.',
  reviewLimitations: [
    'SCCM/IDSA directly covers new fever after ICU admission in adult ICU patients without severe immunocompromise. It does not create a general-ward fever bundle, and its recommendations are largely weak or best-practice statements.',
    'The engine deliberately separates SCCM/IDSA’s single 38.3°C ICU definition from the 38.0°C sustained-for-one-hour chemotherapy-neutropenia definition cited in its text. Neither a lower temperature nor an unverified temperature rules out infection or deterioration.',
    'NICE CG151 is an official but older 2012 anticancer-treatment guideline; its 2019 surveillance decision found no evidence requiring an update. It supplies the emergency neutropenic-sepsis route, not a local antimicrobial regimen, dose, or Taiwan formulary recommendation.',
    'The heat branch uses CDC/NIOSH heat-exposure guidance for emergency recognition/cooling only. A separate focused CMAJ serotonin-toxicity review supports recognition-only escalation for drug/toxin concern; neither branch diagnoses a toxic syndrome or provides syndrome-specific treatment.',
    'The conditional IV acetaminophen amounts come from a 2025 DailyMed injection label. They are not a reconciled local regimen or automatic local-vial selection; verify product compatibility, weight, route, all-source exposure, organ/volume risk, allergy, local policy and prescribing authority.',
    'Regimen alignment and live orderability are separate reviews.',
    'This data engine does not write a culture, medication, source-control, precaution, chart or order state.',
  ],
  sources: [
    ICU_SOURCE,
    NEUTROPENIC_SOURCE,
    HEAT_EMERGENCY_SOURCE,
    DRUG_TOXIN_EMERGENCY_SOURCE,
    ACETAMINOPHEN_SOURCE,
  ],
  fields,
  stages,
  evaluate,
  quickReference: {
    summary: 'Confirm measured temperature, exclude deterioration/special immune risk/hyperthermia emergency, then target the evaluation and record reassessment.',
    recognition: [
      'SCCM/IDSA defines adult ICU fever as one measured temperature of 38.3°C or higher; central measurement is preferred when accuracy is critical, otherwise oral or rectal is preferred over peripheral routes.',
      'A 38.0 to <38.3°C temperature sustained for at least 1 hour is the chemotherapy-neutropenia definition cited by SCCM/IDSA, not its general ICU threshold.',
      'A lower or unverified temperature does not exclude infection, acute deterioration, or an anticancer-treatment emergency.',
    ],
    redFlags: [
      'Any acute instability, new organ dysfunction, hypoxemia, altered mental status, or other deterioration.',
      'A person having anticancer treatment who becomes unwell: suspect neutropenic sepsis and use the emergency oncology/antimicrobial pathway.',
      'Heat/exertion with very high temperature and CNS change, or drug/toxin exposure with rigidity, clonus, autonomic, or mental-status change: urgent emergency assessment.',
    ],
    steps: [
      {role: 'Confirm', text: 'Document temperature value, route, time and peak. Use a more reliable route when the measurement changes management.', tools: ['monitoring']},
      {role: 'Route', text: 'Deterioration, hyperthermia concern, severe immune risk, and possible neutropenic sepsis override a stable fever workup.', tools: ['monitoring', 'hematology']},
      {role: 'Target', text: 'Use history, examination and focus to choose imaging/specimens. Do not reflexively order urine, sputum, line, stool, viral, or broad imaging panels.', tools: ['workup', 'cultures', 'respiratory', 'urinary', 'diarrhea']},
      {role: 'Comfort', text: 'For ICU comfort treatment only after safety review: conditional IV acetaminophen reference is ≥50 kg 1,000 mg q6h or 650 mg q4h; <50 kg 15 mg/kg q6h or 12.5 mg/kg q4h.', dosingNote: 'All routes/products: max 4,000 mg/24 h at ≥50 kg; otherwise 75 mg/kg/24 h (max 3,750 mg). Check hepatic, renal, volume and allergy risks; local product/policy still govern.', tools: ['antipyretic']},
      {role: 'Reassess', text: 'Record trajectory, working source, pending results, response, escalation triggers and an explicit next review; a lower temperature alone does not close an episode.', tools: ['monitoring']},
    ],
    monitoring: [
      'Trend temperature with the same documented route/method when feasible; record antipyretic time and every route/product in the daily exposure total.',
      'Set a patient- and setting-specific reassessment interval. The reviewed ICU source does not provide one universal schedule.',
      'For persistent/recurrent fever, re-evaluate focused findings, results, noninfectious causes and escalation need before repeating broad tests or changing treatment.',
    ],
    sources: [
      ICU_SOURCE,
      NEUTROPENIC_SOURCE,
      HEAT_EMERGENCY_SOURCE,
      DRUG_TOXIN_EMERGENCY_SOURCE,
      ACETAMINOPHEN_SOURCE,
    ],
  },
};

export default config;
