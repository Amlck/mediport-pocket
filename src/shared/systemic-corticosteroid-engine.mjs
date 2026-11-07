// Adult systemic corticosteroid review: indication entry criteria, the reviewed
// regimen for that indication, pre-exposure screening, and stopping. Manual
// categorical findings only; no chart, order, prescription, or taper operation.
//
// Every indication branch is a separate source contract. The engine never
// carries a dose from one indication into another, and it does not convert
// between glucocorticoids — the Calculator's steroid equivalence card does that
// with explicit manual entry.

export const SSC_2026_SOURCE = 'https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026';
export const APROCCHSS_SOURCE = 'https://doi.org/10.1056/NEJMoa1705716';
export const RECOVERY_DEXAMETHASONE_SOURCE = 'https://doi.org/10.1056/NEJMoa2021436';
export const CAPE_COD_SOURCE = 'https://doi.org/10.1056/NEJMoa2215145';
export const TORRES_2015_SOURCE = 'https://pubmed.ncbi.nlm.nih.gov/25688779/';
export const DEXA_ARDS_SOURCE = 'https://doi.org/10.1016/S2213-2600(19)30417-5';
export const LASRS_SOURCE = 'https://doi.org/10.1056/NEJMoa051693';
export const GOLD_2026_SOURCE = 'https://goldcopd.org/2026-gold-report/';
export const REDUCE_SOURCE = 'https://jamanetwork.com/journals/jama/fullarticle/1688035';
export const GINA_2026_SOURCE = 'https://ginasthma.org/wp-content/uploads/2026/05/GINA-2026-Strategy-Report-WMS.pdf';
export const NIH_PJP_SOURCE = 'https://clinicalinfo.hiv.gov/en/guidelines/hiv-clinical-guidelines-adult-and-adolescent-opportunistic-infections/pneumocystis';
export const ASCO_IRAE_SOURCE = 'https://ascopubs.org/doi/10.1200/JCO.21.01440';
export const AE_ILD_SOURCE = 'https://onlinelibrary.wiley.com/doi/10.1111/resp.14788';
export const ADRENAL_CRISIS_SOURCE = 'https://www.endocrinology.org/adrenal-crisis';
export const ENDOCRINE_SOCIETY_PAI_SOURCE = 'https://academic.oup.com/jcem/article/101/2/364/2810222';
export const DEXAMETHASONE_LABEL_SOURCE = 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=dexamethasone';
export const CDC_STRONGYLOIDES_SOURCE = 'https://www.cdc.gov/strongyloides/hcp/clinical-overview/index.html';
export const IDSA_INFLUENZA_SOURCE = 'https://www.idsociety.org/practice-guideline/influenza/';

const ssc = Object.freeze({label: 'SSC 2026 adult guideline — corticosteroids in septic shock', url: SSC_2026_SOURCE});
const aprocchss = Object.freeze({label: 'APROCCHSS (Annane 2018) — hydrocortisone plus fludrocortisone regimen', url: APROCCHSS_SOURCE});
const recovery = Object.freeze({label: 'RECOVERY — dexamethasone in hospitalised COVID-19', url: RECOVERY_DEXAMETHASONE_SOURCE});
const capeCod = Object.freeze({label: 'CAPE COD (2023) — hydrocortisone in severe community-acquired pneumonia', url: CAPE_COD_SOURCE});
const torres = Object.freeze({label: 'Torres 2015 JAMA — methylprednisolone in severe CAP with high inflammatory response', url: TORRES_2015_SOURCE});
const dexaArds = Object.freeze({label: 'DEXA-ARDS (Villar 2020) — dexamethasone in moderate-to-severe ARDS', url: DEXA_ARDS_SOURCE});
const lasrs = Object.freeze({label: 'LaSRS (ARDSNet 2006) — late methylprednisolone in persistent ARDS', url: LASRS_SOURCE});
const gold = Object.freeze({label: 'GOLD 2026 Report — COPD exacerbation management', url: GOLD_2026_SOURCE});
const reduce = Object.freeze({label: 'REDUCE (JAMA 2013) — 5-day versus 14-day glucocorticoid in COPD exacerbation', url: REDUCE_SOURCE});
const gina = Object.freeze({label: 'GINA Strategy Report 2026 — acute-care exacerbations (adult branch)', url: GINA_2026_SOURCE});
const nihPjp = Object.freeze({label: 'NIH adult/adolescent opportunistic-infection guidelines — Pneumocystis pneumonia', url: NIH_PJP_SOURCE});
const asco = Object.freeze({label: 'ASCO irAE guideline update (JCO 2021) — pneumonitis', url: ASCO_IRAE_SOURCE});
const aeIld = Object.freeze({label: 'Respirology 2024 review — corticosteroids for acute exacerbations of interstitial lung disease', url: AE_ILD_SOURCE});
const adrenalCrisis = Object.freeze({label: 'Society for Endocrinology — adrenal crisis emergency guidance', url: ADRENAL_CRISIS_SOURCE});
const endocrinePai = Object.freeze({label: 'Endocrine Society — primary adrenal insufficiency clinical practice guideline', url: ENDOCRINE_SOCIETY_PAI_SOURCE});
const dexLabel = Object.freeze({label: 'Dexamethasone prescribing information (DailyMed) — cerebral oedema regimen', url: DEXAMETHASONE_LABEL_SOURCE});
const cdcStrongyloides = Object.freeze({label: 'CDC clinical overview — strongyloidiasis and corticosteroid-associated hyperinfection', url: CDC_STRONGYLOIDES_SOURCE});
const idsaInfluenza = Object.freeze({label: 'IDSA seasonal influenza guideline — adjunctive corticosteroids', url: IDSA_INFLUENZA_SOURCE});

const field = (key, label, options, threshold) => Object.freeze({
  key,
  label,
  options: Object.freeze([['unknown', 'Not assessed'], ...options]),
  ...(threshold ? {threshold} : {}),
});

export const STEROID_FIELDS = Object.freeze([
  field('phase', 'Review timing', [
    ['before-starting', 'Before starting'],
    ['on-treatment', 'Already on treatment'],
    ['stopping', 'Stopping or tapering'],
  ], 'Starting, continuing and stopping are different decisions; they do not share the same safeguards.'),
  field('indicationGroup', 'Indication group?', [
    ['infection-critical-illness', 'Infection / critical illness'],
    ['airway-exacerbation', 'COPD or asthma exacerbation'],
    ['pneumonitis-ild', 'Pneumonitis / interstitial lung disease'],
    ['adrenal-insufficiency', 'Adrenal insufficiency'],
    ['tumour-raised-pressure', 'Tumour-related raised intracranial pressure'],
    ['other', 'Other / not covered here'],
  ], 'Each group has its own entry criteria and its own reviewed regimen. No dose carries between groups.'),
  field('infectionIndication', 'Which infection route?', [
    ['septic-shock', 'Septic shock'],
    ['ards', 'ARDS'],
    ['covid-oxygen', 'COVID-19 needing oxygen'],
    ['severe-cap', 'Severe community-acquired pneumonia'],
    ['pneumocystis', 'Pneumocystis pneumonia'],
  ]),
  field('airwayIndication', 'Which airway exacerbation?', [
    ['copd', 'COPD exacerbation'],
    ['asthma', 'Asthma exacerbation'],
  ]),
  field('lungInflammationIndication', 'Which lung inflammation?', [
    ['ae-ild', 'Acute exacerbation of interstitial lung disease'],
    ['checkpoint-pneumonitis', 'Immune-checkpoint-inhibitor pneumonitis'],
    ['radiation-pneumonitis', 'Radiation pneumonitis'],
  ]),
  field('adrenalState', 'Adrenal presentation?', [
    ['crisis', 'Suspected adrenal crisis'],
    ['sick-day', 'Intercurrent illness / fever'],
    ['maintenance', 'Stable replacement review'],
  ], 'Crisis is a clinical emergency diagnosis; do not wait for a cortisol result in a shocked patient.'),
  field('adrenalAxis', 'Primary or secondary?', [
    ['primary', 'Primary (adrenal)'],
    ['secondary', 'Secondary / tertiary'],
  ], 'Mineralocorticoid replacement applies to primary adrenal insufficiency only.'),
  field('pneumonitisGrade', 'Pneumonitis severity grade?', [
    ['grade-2', 'Grade 2 — symptomatic, limiting instrumental activities'],
    ['grade-3-4', 'Grade 3–4 — severe, oxygen or life-threatening'],
  ]),
  field('entryCriteria', 'Entry criteria for this indication?', [
    ['met', 'Reviewed · criteria met'],
    ['not-met', 'Reviewed · criteria not met'],
  ], 'Unknown is not “met”. The exact criteria for the selected indication are listed in the first stage.'),
  field('infectionScreen', 'Pre-exposure infection screen?', [
    ['cleared', 'Reviewed · no untreated TB, fungal or Strongyloides risk'],
    ['risk-identified', 'Risk identified / untreated'],
    ['pending', 'Ordered · result pending'],
  ], 'Active tuberculosis, untreated invasive fungal infection and Strongyloides exposure are the screening triggers.'),
  field('influenza', 'Influenza suspected or confirmed?', [
    ['yes', 'Yes / suspected'],
    ['no', 'No — assessed'],
  ], 'Influenza changes the pneumonia branches; it does not remove a COPD or asthma exacerbation indication.'),
  field('ulcerRisk', 'Gastroduodenal ulcer or bleeding risk?', [
    ['present', 'NSAID, anticoagulant, prior ulcer, or ICU stress-ulcer criteria'],
    ['absent', 'Reviewed · none of those'],
  ], 'Acid suppression follows these risk factors; a corticosteroid alone is not an automatic indication.'),
  field('glucoseMonitoring', 'Capillary glucose monitoring?', [
    ['arranged', 'Arranged'],
    ['not-arranged', 'Not arranged'],
  ]),
  field('prolongedExposure', 'Expected ≥20 mg prednisolone-equivalent daily for ≥4 weeks?', [
    ['yes', 'Yes / already reached'],
    ['no', 'No — short course'],
  ], 'This is the Pneumocystis-prophylaxis and adrenal-suppression trigger, not a dose recommendation.'),
]);

const INDICATION_FIELD_BY_GROUP = Object.freeze({
  'infection-critical-illness': 'infectionIndication',
  'airway-exacerbation': 'airwayIndication',
  'pneumonitis-ild': 'lungInflammationIndication',
  'adrenal-insufficiency': 'adrenalState',
  'tumour-raised-pressure': null,
  other: null,
});

const INDICATION_LABELS = Object.freeze({
  'septic-shock': 'Septic shock',
  ards: 'ARDS',
  'covid-oxygen': 'COVID-19 needing oxygen',
  'severe-cap': 'Severe community-acquired pneumonia',
  pneumocystis: 'Pneumocystis pneumonia',
  copd: 'COPD exacerbation',
  asthma: 'Asthma exacerbation',
  'ae-ild': 'Acute exacerbation of interstitial lung disease',
  'checkpoint-pneumonitis': 'Checkpoint-inhibitor pneumonitis',
  'radiation-pneumonitis': 'Radiation pneumonitis',
  crisis: 'Adrenal crisis',
  'sick-day': 'Adrenal insufficiency during intercurrent illness',
  maintenance: 'Adrenal replacement review',
  'tumour-raised-pressure': 'Tumour-related raised intracranial pressure',
});

const ENTRY_CRITERIA = Object.freeze({
  'septic-shock': {
    text: 'Confirmed septic shock: sepsis with vasopressor-dependent hypotension and hypoperfusion after adequate fluid resuscitation.',
    source: ssc,
  },
  ards: {
    text: 'Moderate-to-severe ARDS (PaO₂/FiO₂ ≤200 on PEEP ≥10) under lung-protective ventilation, with the trial regimen started within about 24 hours of onset.',
    source: dexaArds,
  },
  'covid-oxygen': {
    text: 'Hospitalised COVID-19 receiving supplemental oxygen or ventilatory support. RECOVERY found no benefit, and a possible hazard, in patients needing no oxygen.',
    source: recovery,
  },
  'severe-cap': {
    text: 'CAPE COD severe CAP: ICU admission with PSI >130, mechanical or non-invasive ventilation with PEEP ≥5, high-flow oxygen with PaO₂/FiO₂ <300 and FiO₂ ≥0.5, or a non-rebreather with PaO₂/FiO₂ <300. Torres 2015 instead required severe CAP plus CRP >150 mg/L (15 mg/dL).',
    source: capeCod,
  },
  pneumocystis: {
    text: 'Moderate-to-severe Pneumocystis pneumonia: room-air PaO₂ <70 mmHg or alveolar–arterial gradient ≥35 mmHg, with adjunctive corticosteroid started within 72 hours of anti-Pneumocystis therapy.',
    source: nihPjp,
  },
  copd: {
    text: 'Moderate or severe COPD exacerbation — one treated outside routine maintenance, or needing emergency care or admission.',
    source: gold,
  },
  asthma: {
    text: 'An asthma exacerbation presenting to acute care, other than the mildest. GINA advises systemic corticosteroid within 1 hour where possible.',
    source: gina,
  },
  'ae-ild': {
    text: 'Acute, clinically significant respiratory worsening in known or newly recognised ILD with new bilateral ground-glass or consolidation, after heart failure, fluid overload and infection have been considered.',
    source: aeIld,
  },
  'checkpoint-pneumonitis': {
    text: 'New radiographic pneumonitis attributed to an immune checkpoint inhibitor, with infection and progressive malignancy excluded, graded by symptoms and oxygen need.',
    source: asco,
  },
  'radiation-pneumonitis': {
    text: 'Symptomatic pneumonitis in a previously irradiated field, typically 4–12 weeks after radiotherapy, with infection and recurrence excluded.',
    source: asco,
  },
  crisis: {
    text: 'Clinical adrenal crisis: known or suspected adrenal insufficiency with hypotension, shock, vomiting, hyponatraemia or reduced consciousness. Treat on suspicion.',
    source: adrenalCrisis,
  },
  'sick-day': {
    text: 'Established adrenal insufficiency with fever or intercurrent illness that has not progressed to crisis.',
    source: adrenalCrisis,
  },
  maintenance: {
    text: 'Established adrenal insufficiency on stable glucocorticoid replacement, reviewed outside acute illness.',
    source: endocrinePai,
  },
  'tumour-raised-pressure': {
    text: 'Symptomatic vasogenic oedema around an intracranial tumour or metastasis: headache, focal deficit or depressed consciousness with imaging showing mass and surrounding oedema.',
    source: dexLabel,
  },
});

export function normalizeSteroidReview(input = {}) {
  return Object.fromEntries(STEROID_FIELDS.map(item => [
    item.key,
    item.options.some(([value]) => value === input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

function resolvedIndication(values) {
  if (values.indicationGroup === 'tumour-raised-pressure') return 'tumour-raised-pressure';
  const key = INDICATION_FIELD_BY_GROUP[values.indicationGroup];
  if (!key) return null;
  const value = values[key];
  return value === 'unknown' ? null : value;
}

export function visibleFieldKeys(input = {}) {
  const v = normalizeSteroidReview(input);
  const keys = ['phase', 'indicationGroup'];
  const groupField = INDICATION_FIELD_BY_GROUP[v.indicationGroup];
  if (groupField) keys.push(groupField);
  if (v.indicationGroup === 'adrenal-insufficiency' && v.adrenalState !== 'unknown') keys.push('adrenalAxis');
  if (v.lungInflammationIndication === 'checkpoint-pneumonitis') keys.push('pneumonitisGrade');
  const indication = resolvedIndication(v);
  if (!indication || v.indicationGroup === 'other') return keys;
  keys.push('entryCriteria');
  if (v.entryCriteria === 'not-met') return keys;
  if (indication !== 'crisis') keys.push('infectionScreen');
  if (['severe-cap', 'ards', 'covid-oxygen', 'copd', 'asthma'].includes(indication)) keys.push('influenza');
  keys.push('ulcerRisk', 'glucoseMonitoring');
  if (!['crisis', 'sick-day', 'maintenance'].includes(indication)) keys.push('prolongedExposure');
  return keys;
}

const stages = Object.freeze(['indication', 'regimen', 'screen', 'stop', 'monitor']);

function addIndicationStage(add, v, indication) {
  if (v.indicationGroup === 'unknown') {
    add(
      'steroid-select-indication',
      'indication',
      'Select the indication before any regimen appears',
      'A corticosteroid dose is only meaningful inside one indication.',
      'This guide holds separate source contracts for septic shock, ARDS, COVID-19, severe community-acquired pneumonia, Pneumocystis pneumonia, COPD and asthma exacerbations, acute ILD and drug/radiation pneumonitis, adrenal insufficiency and tumour-related raised intracranial pressure. It does not produce a generic steroid dose, and it does not convert a dose from one indication into another.',
      {tone: 'attention', source: ssc},
    );
    return;
  }
  if (v.indicationGroup === 'other') {
    add(
      'steroid-indication-outside-scope',
      'indication',
      'Indication is outside this guide',
      'Use the specialty source for that indication; the shared safeguards below still apply.',
      'Rheumatological flares, transplant rejection, adrenal-tumour management, antiemetic and appetite dexamethasone, bacterial meningitis, spinal-cord compression, dermatological and ophthalmic corticosteroids are not covered here. The screening, glucose, ulcer-risk and Pneumocystis-prophylaxis review in the later stages is not indication-specific and still applies to any prolonged systemic exposure.',
      {tone: 'attention', source: cdcStrongyloides},
    );
    return;
  }
  if (!indication) {
    add(
      'steroid-narrow-indication',
      'indication',
      'Choose the specific indication in this group',
      'Regimens inside one group are not interchangeable.',
      'Within infection and critical illness, septic shock, ARDS, COVID-19, severe community-acquired pneumonia and Pneumocystis pneumonia each have a different drug, dose, duration and entry threshold. The same is true of the airway, pneumonitis and adrenal groups.',
      {tone: 'attention', source: ssc},
    );
    return;
  }
  const criteria = ENTRY_CRITERIA[indication];
  if (v.entryCriteria === 'unknown') {
    add(
      'steroid-confirm-entry-criteria',
      'indication',
      `Confirm the entry criteria for ${INDICATION_LABELS[indication]}`,
      criteria.text,
      `${criteria.text} Record whether these were reviewed and met, or reviewed and not met. An unassessed criterion is not a met criterion, and this guide does not infer the indication from the drug that has already been given.`,
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: criteria.source},
    );
    return;
  }
  if (v.entryCriteria === 'not-met') {
    add(
      'steroid-entry-not-met',
      'indication',
      `${INDICATION_LABELS[indication]} criteria reviewed and not met`,
      'No regimen is shown for an indication whose criteria were reviewed and not met.',
      `${criteria.text} With the criteria assessed as not met, treat the corticosteroid question as unresolved rather than negative: review the alternative diagnosis, and reconsider if the clinical state changes. If a corticosteroid is already running for this indication, review whether it should continue rather than leaving it unexamined.`,
      {resourceGroup: 'steroid-evaluation', source: criteria.source},
    );
    return;
  }
  add(
    'steroid-entry-met',
    'indication',
    `${INDICATION_LABELS[indication]} criteria reviewed and met`,
    criteria.text,
    `${criteria.text} The regimen stage below shows only the source regimen recorded for this indication. Confirm the local product, strength, route and administration instructions before any order.`,
    {resourceGroup: 'steroid-evaluation', source: criteria.source},
  );
}

function addSepticShockRegimen(add) {
  add(
    'steroid-septic-shock-ssc-position',
    'regimen',
    'IV corticosteroid is a conditional suggestion in septic shock',
    'SSC 2026 does not mandate a cortisol result or a fixed vasopressor dose before eligibility.',
    'SSC 2026 suggests IV corticosteroids for adults with septic shock (conditional recommendation, low certainty). It does not require a cortisol result, and it does not set a fixed norepinephrine dose or duration as a prerequisite. A treated blood pressure or improving perfusion does not cancel a confirmed septic-shock diagnosis. Review the indication, current steroid exposure, adverse effects and the local regimen with the treating team.',
    {tone: 'urgent', resourceGroup: 'septic-shock-steroid', source: ssc},
  );
  add(
    'steroid-septic-shock-aprocchss-regimen',
    'regimen',
    'APROCCHSS regimen: hydrocortisone 50 mg IV Q6H plus fludrocortisone 50 µg daily',
    'Seven days, without a taper. There is no loading bolus in the trial regimen.',
    'APROCCHSS gave hydrocortisone 50 mg IV every 6 hours plus fludrocortisone 50 µg enterally once daily for 7 days without tapering, started within 24 hours of shock onset, and reduced 90-day mortality. The trial did not use a 100 mg loading dose; a stat 100 mg is a local practice addition, not part of this regimen. Public NTUH pages identify Solu-Cortef 100 mg vials and Florinef 0.1 mg tablets. Product identity does not establish preparation or whether tablet splitting is suitable; confirm both against current instructions.',
    {tone: 'urgent', resourceGroup: 'septic-shock-steroid', source: aprocchss},
  );
  add(
    'steroid-septic-shock-saved-row-discrepancy',
    'regimen',
    'Reconcile additional protocol gates with the current source contract',
    'This guide does not add a cortisol-first or fixed norepinephrine threshold to its recorded SSC 2026 contract.',
    'The recorded SSC 2026 source review supports a conditional suggestion for IV corticosteroids in adult septic shock. Do not import additional vasopressor-dose/duration or cortisol-testing prerequisites from unverified protocol text. Reconcile differences with the current guideline and accountable treating team before using a local regimen.',
    {tone: 'attention', resourceGroup: 'cortisol-testing', source: ssc},
  );
}

function addArdsRegimen(add) {
  add(
    'steroid-ards-dexa-regimen',
    'regimen',
    'DEXA-ARDS regimen: dexamethasone 20 mg IV daily ×5 days, then 10 mg daily ×5 days',
    'Moderate-to-severe ARDS, started early, under lung-protective ventilation.',
    'DEXA-ARDS randomised patients with moderate-to-severe ARDS to dexamethasone 20 mg IV once daily for 5 days then 10 mg IV once daily for 5 days, or usual care, and reported more ventilator-free days and lower 60-day mortality. The older Meduri methylprednisolone 1 mg/kg/day protocol is a different regimen with a different infusion, duration and taper; do not blend the two. An NTUH public page identifies dexamethasone injection 5 mg/1 mL/amp. The source dose remains in milligrams; confirm the exact product, ampoule volume and preparation before any conversion.',
    {resourceGroup: 'steroid-products', source: dexaArds},
  );
  add(
    'steroid-ards-late-initiation-safety',
    'regimen',
    'Do not start a corticosteroid late in persistent ARDS without specialist review',
    'LaSRS found higher 60- and 180-day mortality when methylprednisolone began at least 14 days after ARDS onset.',
    'In the ARDSNet Late Steroid Rescue Study, methylprednisolone started at or after day 14 of persistent ARDS was associated with increased 60- and 180-day mortality. A 2025 observational analysis has questioned whether day 14 is a real boundary, so this is a safety signal to escalate rather than a settled rule. Establish the actual day of ARDS onset before starting, and route a late start through critical care.',
    {tone: 'attention', resourceGroup: 'steroid-evaluation', source: lasrs},
  );
}

function addCovidRegimen(add) {
  add(
    'steroid-covid-recovery-regimen',
    'regimen',
    'RECOVERY regimen: dexamethasone 6 mg once daily for up to 10 days',
    'Only for patients receiving oxygen or ventilatory support.',
    'RECOVERY gave dexamethasone 6 mg once daily orally or intravenously for up to 10 days, or until discharge if sooner. Mortality fell in patients receiving invasive ventilation and in those on oxygen without ventilation; there was no benefit, and a possible hazard, in patients receiving no respiratory support. Confirm the current oxygen requirement before starting or continuing.',
    {resourceGroup: 'steroid-products', source: recovery},
  );
}

function addSevereCapRegimen(add, v) {
  add(
    'steroid-cap-cape-cod-regimen',
    'regimen',
    'CAPE COD regimen: hydrocortisone 200 mg/day as a continuous IV infusion',
    'Started within 24 hours, for 4 or 7 days, then tapered to a total of 8 or 14 days by day-4 response.',
    'CAPE COD gave hydrocortisone 200 mg/day by continuous infusion to ICU patients with severe community-acquired pneumonia, started within 24 hours of severity criteria being met, and reduced 28-day mortality. At day 4 the clinician either stopped and tapered (total 8 days) or continued and tapered (total 14 days). The local ward habit of Solu-Cortef 50 mg IV Q6H delivers the same 200 mg daily total but as divided boluses rather than the trial infusion — record which was intended.',
    {resourceGroup: 'septic-shock-steroid', source: capeCod},
  );
  add(
    'steroid-cap-torres-alternative',
    'regimen',
    'Torres 2015 alternative: methylprednisolone 0.5 mg/kg IV Q12H for 5 days at CRP >150 mg/L',
    'A different trial, different drug and a different entry threshold.',
    'Torres 2015 enrolled severe CAP with a high inflammatory response, defined as CRP above 150 mg/L (15 mg/dL) on admission, and gave methylprednisolone 0.5 mg/kg IV every 12 hours for 5 days started within 36 hours, reducing treatment failure. If the local cue in use is a CRP above 19 mg/dL, that is markedly stricter than the trial threshold and would exclude patients the trial treated; reconcile the intended cue before applying either regimen. A low procalcitonin is not an entry criterion in either trial.',
    {tone: 'attention', resourceGroup: 'steroid-evaluation', source: torres},
  );
  add(
    'steroid-cap-oxygen-cue-discrepancy',
    'regimen',
    'A nasal-cannula flow cue does not match either trial entry',
    'Neither trial used an oxygen-flow threshold such as “more than 3 L nasal cannula”.',
    'CAPE COD used PSI >130, mechanical or non-invasive ventilation, high-flow oxygen with PaO₂/FiO₂ <300 and FiO₂ ≥0.5, or a non-rebreather with PaO₂/FiO₂ <300. Torres 2015 used severe CAP criteria plus CRP >150 mg/L. A patient comfortable on 4 L by nasal cannula can fall well short of both. Record the actual severity criterion used rather than a flow rate.',
    {tone: 'attention', resourceGroup: 'steroid-evaluation', source: capeCod},
  );
  if (v.influenza === 'yes') {
    add(
      'steroid-cap-influenza-exclusion',
      'regimen',
      'Suspected or confirmed influenza was excluded from the CAP steroid trials',
      'Do not apply the CAP hydrocortisone regimen to influenza pneumonia on this evidence.',
      'CAPE COD excluded influenza and Pneumocystis pneumonia, and IDSA advises against adjunctive corticosteroids in influenza unless they are indicated for another reason. Observational data associate corticosteroids in influenza with longer viral shedding and worse outcomes. Keep the antiviral and source-control plan primary, and stay alert for Staphylococcus aureus co-infection, which is an established and rapidly destructive complication of influenza pneumonia.',
      {tone: 'urgent', resourceGroup: 'steroid-evaluation', source: idsaInfluenza},
    );
  }
}

function addPneumocystisRegimen(add) {
  add(
    'steroid-pjp-adjunctive-regimen',
    'regimen',
    'Adjunctive regimen: prednisone 40 mg BID ×5 d, 40 mg daily ×5 d, then 20 mg daily ×11 d',
    'A 21-day course started within 72 hours of anti-Pneumocystis therapy.',
    'For moderate-to-severe Pneumocystis pneumonia — room-air PaO₂ <70 mmHg or an A–a gradient ≥35 mmHg — the NIH opportunistic-infection guidelines give prednisone 40 mg twice daily on days 1–5, 40 mg once daily on days 6–10 and 20 mg once daily on days 11–21, started as soon as possible and within 72 hours of specific therapy. Benefit has only been shown when it starts inside that window. If a parenteral route is required, IV methylprednisolone at 80% of the corresponding oral prednisone dose may be used. Locally, prednisolone is the Predonine 5 mg tablet, so 40 mg is eight tablets per dose — confirm the intended product and strength.',
    {resourceGroup: 'steroid-products', source: nihPjp},
  );
}

function addCopdRegimen(add) {
  add(
    'steroid-copd-short-course',
    'regimen',
    'COPD exacerbation: a short systemic corticosteroid course, up to 5 days',
    'GOLD 2026 keeps the course at 5 days or fewer; oral is as effective as IV when absorption is reliable.',
    'GOLD 2026 recommends systemic corticosteroids for up to 5 days in moderate and severe exacerbations, alongside bronchodilators, which remain the main treatment. REDUCE, the trial behind the 5-day standard, gave methylprednisolone 40 mg IV on day 1 followed by prednisone 40 mg orally for the remaining days, and found 5 days non-inferior to 14 for re-exacerbation at 6 months with less total glucocorticoid exposure. A locally used methylprednisolone 20 mg Q12H, or 0.5–1 mg/kg/day, delivers a similar daily glucocorticoid load by a different schedule; switch to the oral route as soon as the patient can swallow reliably.',
    {resourceGroup: 'airway-steroid', source: gold},
  );
  add(
    'steroid-copd-duration-evidence',
    'regimen',
    'Five days is the evidence-based duration, not a minimum',
    'Prolonging beyond 5 days added exposure without reducing re-exacerbation.',
    'REDUCE randomised 314 patients to 5 or 14 days; the 6-month re-exacerbation rate was 35.9% with the short course versus 36.8% with the conventional course. Document the intended stop date at the time of prescribing so the course does not continue by default into discharge medication.',
    {resourceGroup: 'airway-steroid', source: reduce},
  );
}

function addAsthmaRegimen(add) {
  add(
    'steroid-asthma-systemic-regimen',
    'regimen',
    'Asthma exacerbation: prednisone or prednisolone 50 mg/day, given within 1 hour',
    'GINA gives hydrocortisone 200 mg/day in divided doses as the IV reference when the oral route is not usable.',
    'GINA uses systemic corticosteroids for all but the mildest acute-care exacerbations and advises giving them within 1 hour where possible. Oral treatment is as effective as intravenous when absorption is reliable; IV is reserved for inability to swallow, vomiting, or the need for non-invasive ventilation or intubation. Inhaled corticosteroid plus formoterol maintenance-and-reliever therapy is a separate ongoing decision and is not replaced by the systemic burst. Open the Acute Severe Asthma guide for the full severity assessment and bronchodilator route.',
    {resourceGroup: 'airway-steroid', related: ['acute-severe-asthma'], source: gina},
  );
}

function addAeIldRegimen(add) {
  add(
    'steroid-ae-ild-pulse',
    'regimen',
    'Acute exacerbation of ILD: pulse methylprednisolone 500–1000 mg/day for 3 days',
    'Near-universal practice on weak, mostly observational evidence; specialist-led.',
    'High-dose pulse methylprednisolone, usually 500–1000 mg daily for 3 days with or without a slow taper, is given worldwide for acute exacerbations of interstitial lung disease, but the supporting evidence is observational and of very low certainty and no randomised trial establishes the dose or duration. Treat it as a specialist decision made alongside exclusion of infection, heart failure and pulmonary embolism, not a ward-initiated protocol. Locally the 500 mg Solu-Medrol vial exists; its availability is not by itself a reason to choose pulse dosing.',
    {tone: 'attention', resourceGroup: 'steroid-products', source: aeIld},
  );
}

function addCheckpointPneumonitisRegimen(add, v) {
  if (v.pneumonitisGrade === 'grade-3-4') {
    add(
      'steroid-checkpoint-pneumonitis-severe',
      'regimen',
      'Grade 3–4 checkpoint pneumonitis: IV methylprednisolone 1–2 mg/kg/day',
      'Admit, hold the checkpoint inhibitor, and taper over at least 4–6 weeks.',
      'ASCO advises hospitalisation, permanent discontinuation of the checkpoint inhibitor and methylprednisolone 1–2 mg/kg/day intravenously for grade 3–4 pneumonitis, with a taper over at least 4–6 weeks once improvement is established. If there is no improvement after 48 hours, add a second immunosuppressant through the treating oncology team. Empirical antimicrobial cover is usually continued until infection is excluded.',
      {tone: 'urgent', resourceGroup: 'steroid-products', source: asco},
    );
  } else if (v.pneumonitisGrade === 'grade-2') {
    add(
      'steroid-checkpoint-pneumonitis-moderate',
      'regimen',
      'Grade 2 checkpoint pneumonitis: prednisone 1–2 mg/kg/day',
      'Hold the checkpoint inhibitor and taper over at least 4–6 weeks.',
      'ASCO advises holding the checkpoint inhibitor and giving prednisone 1–2 mg/kg/day for grade 2 pneumonitis, tapering over at least 4–6 weeks after improvement, with reassessment in 3–7 days and escalation if the patient worsens. Resuming the checkpoint inhibitor is an oncology decision made after the pneumonitis has resolved.',
      {resourceGroup: 'steroid-products', source: asco},
    );
  } else {
    add(
      'steroid-checkpoint-pneumonitis-grade-unknown',
      'regimen',
      'Grade the pneumonitis before selecting the dose or route',
      'Grade 2 and grade 3–4 differ in admission, route, drug and whether the checkpoint inhibitor is stopped permanently.',
      'ASCO ties the corticosteroid decision to the severity grade: symptomatic disease limiting instrumental activities is grade 2, while severe symptoms, new or increased oxygen requirement or life-threatening compromise is grade 3–4. Record the grade, current oxygen requirement and infection status before treating.',
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: asco},
    );
  }
}

function addRadiationPneumonitisRegimen(add) {
  add(
    'steroid-radiation-pneumonitis',
    'regimen',
    'Radiation pneumonitis: prednisone about 0.5–1 mg/kg/day with a slow taper over 4–12 weeks',
    'Relapse on a fast taper is common; plan the taper when the course starts.',
    'Symptomatic radiation pneumonitis is treated with prednisone in the region of 0.5–1 mg/kg/day, followed by a gradual taper over 4–12 weeks. This dose and taper come from consensus and observational practice rather than randomised trials, so the duration is individualised by response. Rapid tapers are a recognised cause of rebound; if symptoms return during the taper, treat it as relapse rather than a new event.',
    {resourceGroup: 'steroid-products', source: asco},
  );
}

function addAdrenalRegimen(add, v) {
  if (v.adrenalState === 'crisis') {
    add(
      'steroid-adrenal-crisis-rescue',
      'regimen',
      'Adrenal crisis: hydrocortisone 100 mg IV or IM immediately',
      'Then 200 mg over 24 hours by infusion, or 50 mg IV every 6 hours.',
      'Give hydrocortisone 100 mg intravenously or intramuscularly as soon as adrenal crisis is suspected, then continue 200 mg per 24 hours as a continuous infusion or 50 mg every 6 hours, with rapid rehydration using isotonic saline. Do not delay hydrocortisone for a confirmatory cortisol in a shocked patient — the untreated crisis is the greater risk. If the diagnosis genuinely must be established later, dexamethasone does not interfere with the cortisol assay and can bridge the gap while testing is arranged. NTUH’s public formulary lists Solu-Cortef 100 mg vials.',
      {tone: 'urgent', resourceGroup: 'steroid-products', source: adrenalCrisis},
    );
    if (v.adrenalAxis === 'primary') {
      add(
        'steroid-adrenal-crisis-no-fludrocortisone',
        'regimen',
        'Separate mineralocorticoid is not needed while hydrocortisone is ≥50 mg/day',
        'Hydrocortisone at crisis doses already provides mineralocorticoid effect.',
        'In primary adrenal insufficiency, fludrocortisone 50–100 µg daily is part of maintenance replacement, but it is not required while hydrocortisone is running at 50 mg/day or more, because hydrocortisone at that dose supplies enough mineralocorticoid activity. Restart or resume fludrocortisone as the hydrocortisone dose is reduced back toward replacement.',
        {resourceGroup: 'steroid-products', source: endocrinePai},
      );
    }
  } else if (v.adrenalState === 'sick-day') {
    add(
      'steroid-adrenal-sick-day',
      'regimen',
      'Sick-day rule: double or triple the usual oral glucocorticoid dose',
      'For fever or intercurrent illness, until recovery; switch to parenteral if vomiting.',
      'Established sick-day guidance is to double the usual daily replacement dose during intercurrent illness, and up to triple it for fever, continuing for 2–3 days or until recovery. Vomiting, diarrhoea or an inability to take oral medication means parenteral hydrocortisone and urgent assessment, because oral doubling cannot be absorbed. Any patient who becomes hypotensive or drowsy has moved to the crisis branch.',
      {tone: 'attention', resourceGroup: 'steroid-products', source: adrenalCrisis},
    );
  } else if (v.adrenalState === 'maintenance') {
    add(
      'steroid-adrenal-maintenance',
      'regimen',
      'Maintenance replacement: hydrocortisone 15–25 mg/day in 2–3 divided doses',
      'Largest dose on waking; the local ward shorthand is a larger morning dose with a smaller afternoon dose.',
      'The Endocrine Society recommends hydrocortisone 15–25 mg daily in two or three divided doses for adults, with the largest portion on waking to mimic the physiological cortisol rhythm, and the last dose well before bedtime. The ward shorthand of one dose in the morning and a half dose in the afternoon describes that split but not the drug or tablet strength: Confirm the actual oral hydrocortisone product and tablet strength independently before reading that shorthand as a dose. A dated catalog or an injectable Solu-Cortef identity cannot establish current oral-product availability or absence.',
      {tone: 'attention', resourceGroup: 'steroid-products', source: endocrinePai},
    );
    if (v.adrenalAxis === 'primary') {
      add(
        'steroid-adrenal-fludrocortisone-maintenance',
        'regimen',
        'Primary adrenal insufficiency also needs fludrocortisone 50–100 µg daily',
        'Mineralocorticoid replacement is not required in secondary or tertiary insufficiency.',
        'Primary adrenal insufficiency requires mineralocorticoid replacement, typically fludrocortisone 50–100 µg once daily, titrated by blood pressure, postural symptoms, sodium, potassium and renin. Secondary and tertiary insufficiency spare the renin–angiotensin–aldosterone axis and do not need it. An NTUH public page identifies Florinef 0.1 mg tablets. Confirm the actual product and whether tablet splitting is suitable before converting the prescribed micrograms into a tablet quantity.',
        {resourceGroup: 'steroid-products', source: endocrinePai},
      );
    } else if (v.adrenalAxis === 'unknown') {
      add(
        'steroid-adrenal-axis-unknown',
        'regimen',
        'Establish whether the insufficiency is primary or secondary',
        'It decides whether mineralocorticoid replacement is needed at all.',
        'Primary adrenal insufficiency needs fludrocortisone alongside hydrocortisone; secondary and tertiary insufficiency do not. An unrecorded axis is not evidence that mineralocorticoid replacement is unnecessary. Review the diagnosis, ACTH, renin and electrolytes rather than inferring the axis from the current prescription.',
        {tone: 'attention', resourceGroup: 'steroid-evaluation', source: endocrinePai},
      );
    }
  }
}

function addRaisedPressureRegimen(add) {
  add(
    'steroid-raised-pressure-dexamethasone',
    'regimen',
    'Tumour oedema: dexamethasone 10 mg initially, then 4 mg every 6 hours',
    'Reduce the dose once a response is established; the label regimen is 4 mg Q6H, not 6 mg.',
    'The dexamethasone label regimen for cerebral oedema is 10 mg intravenously initially, then 4 mg every 6 hours, reducing after 2–4 days and tapering over 5–7 days as the response allows. Divided doses above 4 mg every 6 hours are used in practice for severe oedema but exceed the label schedule, so record the intended total daily dose explicitly. Give the later doses early in the day where the schedule allows, because evening dexamethasone reliably causes insomnia.',
    {resourceGroup: 'steroid-products', source: dexLabel},
  );
  add(
    'steroid-raised-pressure-lymphoma-caution',
    'regimen',
    'Hold corticosteroid if CNS lymphoma is possible and tissue has not been obtained',
    'Corticosteroid can dissolve the lesion and make the biopsy non-diagnostic.',
    'Primary CNS lymphoma is exquisitely steroid-sensitive, and a dose given before biopsy can shrink the lesion enough to render histology non-diagnostic and delay definitive treatment. When the imaging appearance raises lymphoma and the patient is not deteriorating neurologically, discuss urgent biopsy timing with neurosurgery and neuro-oncology before starting. Impending herniation still overrides this.',
    {tone: 'attention', resourceGroup: 'steroid-evaluation', source: dexLabel},
  );
}

const REGIMEN_BUILDERS = Object.freeze({
  'septic-shock': addSepticShockRegimen,
  ards: addArdsRegimen,
  'covid-oxygen': addCovidRegimen,
  'severe-cap': addSevereCapRegimen,
  pneumocystis: addPneumocystisRegimen,
  copd: addCopdRegimen,
  asthma: addAsthmaRegimen,
  'ae-ild': addAeIldRegimen,
  'checkpoint-pneumonitis': addCheckpointPneumonitisRegimen,
  'radiation-pneumonitis': addRadiationPneumonitisRegimen,
  crisis: addAdrenalRegimen,
  'sick-day': addAdrenalRegimen,
  maintenance: addAdrenalRegimen,
  'tumour-raised-pressure': addRaisedPressureRegimen,
});

function addScreeningStage(add, v, indication) {
  const emergency = indication === 'crisis';
  if (!emergency) {
    if (v.infectionScreen === 'unknown') {
      add(
        'steroid-screen-latent-infection',
        'screen',
        'Screen for tuberculosis, invasive fungal infection and Strongyloides',
        'Unknown screening status is not a cleared screen.',
        'Active tuberculosis and untreated invasive fungal infection are the classic contraindications to systemic corticosteroid without concurrent treatment. Strongyloides matters separately: the CDC links hyperinfection and disseminated strongyloidiasis most often to subclinical infection in patients given high-dose corticosteroids for asthma or COPD exacerbations, and Taiwan is an area where exposure is plausible. Screening or presumptive ivermectin for at-risk patients is a local infectious-diseases decision; the CDC overview describes the risk but does not specify a screening protocol.',
        {tone: 'attention', resourceGroup: 'steroid-evaluation', source: cdcStrongyloides},
      );
    } else if (v.infectionScreen === 'risk-identified') {
      add(
        'steroid-screen-risk-identified',
        'screen',
        'Treat or cover the identified infection risk before or alongside the corticosteroid',
        'An identified risk does not automatically forbid the steroid; it changes what must run alongside it.',
        'Where the corticosteroid indication is itself urgent, the decision is usually to treat the infection concurrently rather than withhold the steroid. Involve infectious diseases for anti-tuberculous or antifungal cover and for Strongyloides, where presumptive ivermectin is used in at-risk patients before immunosuppression. Record the plan explicitly so the steroid is not started on an unexamined risk.',
        {tone: 'urgent', resourceGroup: 'steroid-evaluation', source: cdcStrongyloides},
      );
    } else if (v.infectionScreen === 'pending') {
      add(
        'steroid-screen-pending',
        'screen',
        'Decide explicitly whether to wait for the pending screen',
        'A pending result is not a negative result.',
        'For an urgent indication the steroid usually proceeds while the screen is outstanding, with a documented plan for what happens if it returns positive. For an elective or prolonged course there is usually time to wait. Make that choice explicit rather than leaving it to whoever reviews the result.',
        {tone: 'attention', resourceGroup: 'steroid-evaluation', source: cdcStrongyloides},
      );
    }
  }
  if (v.influenza === 'yes' && ['copd', 'asthma'].includes(indication)) {
    add(
      'steroid-influenza-airway-still-indicated',
      'screen',
      'Influenza does not remove the exacerbation indication',
      'The corticosteroid caution in influenza applies to pneumonia, not to a COPD or asthma exacerbation.',
      'IDSA advises against adjunctive corticosteroids in influenza unless they are indicated for another reason — and a COPD or asthma exacerbation is exactly such a reason. Continue the short exacerbation course alongside antiviral treatment, keep it short, and stay alert for Staphylococcus aureus co-infection, which is an established complication of influenza and can be fulminant.',
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: idsaInfluenza},
    );
  }
  if (v.glucoseMonitoring === 'not-arranged') {
    add(
      'steroid-arrange-glucose-monitoring',
      'screen',
      'Arrange capillary glucose monitoring for the duration of the course',
      'Steroid hyperglycaemia is the most common and most missed adverse effect on the ward.',
      'Systemic corticosteroids raise glucose in patients with and without known diabetes. With once-daily morning dosing the rise is predominantly afternoon and evening, so a fasting morning glucose alone can look normal while the afternoon values are markedly high. Set the monitoring schedule when the steroid is prescribed, and review insulin or oral agents in patients already on treatment.',
      {tone: 'attention', resourceGroup: 'glucose-monitoring', source: endocrinePai},
    );
  } else if (v.glucoseMonitoring === 'unknown') {
    add(
      'steroid-confirm-glucose-monitoring',
      'screen',
      'Confirm whether glucose monitoring is in place',
      'Unknown monitoring is not monitoring.',
      'Record whether capillary glucose testing has actually been ordered, and at what times. Afternoon and evening values carry most of the signal with morning-dosed corticosteroid.',
      {resourceGroup: 'glucose-monitoring', source: endocrinePai},
    );
  }
  if (v.ulcerRisk === 'present') {
    add(
      'steroid-add-acid-suppression',
      'screen',
      'Add acid suppression for the identified ulcer or bleeding risk',
      'Concurrent NSAID, anticoagulant, prior ulcer, or ICU stress-ulcer criteria.',
      'A corticosteroid alone is a weak ulcer risk factor; the risk becomes meaningful when it is combined with an NSAID or antiplatelet, an anticoagulant, a previous ulcer or bleed, or critical illness meeting stress-ulcer prophylaxis criteria. Where a proton-pump inhibitor is indicated, NTUH’s public formulary lists Pantoloc 40 mg injection and Nexium 40 mg tablets.',
      {resourceGroup: 'ulcer-prophylaxis', source: endocrinePai},
    );
  } else if (v.ulcerRisk === 'absent') {
    add(
      'steroid-no-routine-acid-suppression',
      'screen',
      'No routine acid suppression from the corticosteroid alone',
      'Reviewed absence of NSAID, anticoagulant, prior ulcer and stress-ulcer criteria.',
      'With none of those risk factors, a proton-pump inhibitor added purely because a corticosteroid was started is unnecessary exposure. Re-review if an NSAID or anticoagulant is added later in the admission.',
      {resourceGroup: 'ulcer-prophylaxis', source: endocrinePai},
    );
  }
  if (v.prolongedExposure === 'yes') {
    add(
      'steroid-pneumocystis-prophylaxis',
      'screen',
      'Add Pneumocystis prophylaxis for prolonged higher-dose exposure',
      'The usual trigger is ≥20 mg prednisolone-equivalent daily for ≥4 weeks.',
      'Prophylaxis against Pneumocystis is conventionally started once a patient is expected to receive at least 20 mg prednisone-equivalent daily for 4 weeks or more, particularly alongside another cause of immunosuppression. NTUH’s public formulary lists Baktar, a 400 mg sulfamethoxazole plus 80 mg trimethoprim tablet; the exact prophylactic schedule, renal adjustment and sulfa-allergy alternative must be confirmed locally. This threshold is a prophylaxis trigger and is not a recommended corticosteroid dose.',
      {tone: 'attention', resourceGroup: 'pjp-prophylaxis', source: nihPjp},
    );
  }
}

function addStopStage(add, v, indication) {
  const shortCourse = ['copd', 'asthma', 'covid-oxygen', 'severe-cap', 'septic-shock', 'ards', 'pneumocystis'].includes(indication);
  const longCourse = ['checkpoint-pneumonitis', 'radiation-pneumonitis', 'ae-ild'].includes(indication);
  if (indication === 'maintenance' || indication === 'sick-day' || indication === 'crisis') {
    add(
      'steroid-replacement-never-stops',
      'stop',
      'Replacement therapy is not stopped or tapered off',
      'Reduce a crisis or sick-day dose back to replacement, never to nothing.',
      'Glucocorticoid replacement in adrenal insufficiency is lifelong. After a crisis or sick-day increase, the dose comes back down to the maintenance schedule rather than being stopped, and in primary insufficiency fludrocortisone resumes as hydrocortisone falls below about 50 mg/day. Confirm the patient has a steroid emergency card, a parenteral hydrocortisone kit and current sick-day instructions before discharge.',
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: adrenalCrisis},
    );
    return;
  }
  if (shortCourse) {
    add(
      'steroid-short-course-stop-without-taper',
      'stop',
      'Short defined courses stop without a taper',
      'COPD up to 5 days, PJP 21 days by its own schedule, COVID-19 up to 10 days, APROCCHSS 7 days without taper.',
      'Courses under about 3 weeks do not suppress the hypothalamic–pituitary–adrenal axis enough to need a weaning taper, and the trial regimens reflect that: REDUCE stopped at 5 days, RECOVERY at 10, APROCCHSS at 7 without tapering. CAPE COD is the exception among these, with a protocolised taper after day 4 or day 7. Write the stop date into the prescription so the course does not continue unexamined into the discharge medication list.',
      {resourceGroup: 'steroid-evaluation', source: reduce},
    );
  }
  if (longCourse) {
    add(
      'steroid-prolonged-course-taper',
      'stop',
      'Plan the taper when the course starts',
      'Pneumonitis courses taper over at least 4–6 weeks, radiation pneumonitis over 4–12 weeks.',
      'For checkpoint-inhibitor and radiation pneumonitis, relapse during a rapid taper is common and is the usual reason a course has to be restarted at a higher dose. Set the taper schedule and the review points at the start, and treat returning symptoms during the taper as relapse rather than a new presentation. Courses of this length also bring the adrenal-suppression and Pneumocystis-prophylaxis thresholds into play.',
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: asco},
    );
  }
  if (v.phase === 'stopping' && v.prolongedExposure === 'yes') {
    add(
      'steroid-hpa-suppression-on-stopping',
      'stop',
      'Assume adrenal suppression after prolonged higher-dose exposure',
      'Taper rather than stop, and give sick-day cover during intercurrent illness.',
      'After about 3 weeks or more at a suppressive dose, abrupt withdrawal risks adrenal insufficiency. Reduce gradually, warn the patient about illness and surgery, and treat hypotension or collapse during withdrawal as an adrenal crisis until proven otherwise. The adrenal-insufficiency branch of this guide holds the crisis regimen.',
      {tone: 'attention', resourceGroup: 'steroid-evaluation', source: adrenalCrisis},
    );
  }
}

function addMonitorStage(add, v, indication) {
  add(
    'steroid-course-review',
    'monitor',
    'Review the indication, response and stop date at every ward round',
    'A steroid course with no recorded end date is the commonest way exposure drifts.',
    'Re-check that the original indication still holds, that the response matches what the source regimen predicted, and that the recorded stop or taper date is still correct. Review glucose, blood pressure, infection signs, mood and sleep, and — for longer courses — bone protection and muscle weakness. Improvement on a corticosteroid is not itself confirmation of the diagnosis that prompted it.',
    {resourceGroup: 'steroid-evaluation', source: endocrinePai},
  );
  if (v.phase === 'on-treatment' && v.entryCriteria === 'met') {
    add(
      'steroid-equivalence-on-switch',
      'monitor',
      'Convert deliberately when the drug or route changes',
      'Hydrocortisone 20 mg = prednisolone 5 mg = methylprednisolone 4 mg = dexamethasone 0.75 mg.',
      'Glucocorticoids are not interchangeable milligram for milligram, and their mineralocorticoid activity and duration differ as well: dexamethasone has essentially none, hydrocortisone has the most. The equivalent amounts methylprednisolone 40 mg, hydrocortisone 200 mg and prednisolone 50 mg describe glucocorticoid potency, not interchangeable products, preparations or patient-specific regimens. Use the Calculator’s steroid equivalence card for the explicit conversion rather than converting from memory at the bedside.',
      {resourceGroup: 'steroid-products', source: endocrinePai},
    );
  }
}

export function evaluate(input = {}) {
  const v = normalizeSteroidReview(input);
  const actions = [];
  const add = (id, stage, title, summary, detail, extra = {}) => {
    const {source = ssc, ...rest} = extra;
    actions.push({
      id,
      stage,
      title,
      summary,
      detail,
      sourceUrl: source.url,
      sourceLabel: source.label,
      ...rest,
    });
  };
  const indication = resolvedIndication(v);
  addIndicationStage(add, v, indication);
  const criteriaMet = Boolean(indication) && v.entryCriteria === 'met';
  if (criteriaMet) {
    REGIMEN_BUILDERS[indication](add, v);
    addScreeningStage(add, v, indication);
    addStopStage(add, v, indication);
    addMonitorStage(add, v, indication);
  }
  actions.sort((a, b) => stages.indexOf(a.stage) - stages.indexOf(b.stage));
  const entrySource = indication ? ENTRY_CRITERIA[indication].source : ssc;
  const status = !indication ? 'unknown' : v.entryCriteria === 'met' ? 'met' : v.entryCriteria === 'not-met' ? 'notmet' : 'unknown';
  return {
    values: v,
    entry: {
      status,
      title: v.indicationGroup === 'other'
        ? 'Indication outside this guide'
        : !indication
          ? 'Select the indication before any regimen appears'
          : status === 'met'
            ? `${INDICATION_LABELS[indication]}: reviewed regimen below`
            : status === 'notmet'
              ? `${INDICATION_LABELS[indication]}: criteria reviewed and not met`
              : `${INDICATION_LABELS[indication]}: confirm the entry criteria`,
      summary: 'Indication, entry criteria, regimen, screening and stopping are separate findings. No dose is carried between indications.',
      source: entrySource,
    },
    actions,
    visibleStageIds: stages.filter(stage => actions.some(action => action.stage === stage)),
    stageNotes: {
      indication: 'Choose the indication first; every regimen below belongs to one indication only.',
      regimen: 'A regimen appears only once the entry criteria for that indication are reviewed and met.',
      screen: 'Screening, glucose, ulcer risk and prophylaxis follow the criteria review.',
      stop: 'Duration and taper follow the indication; record the stop date when the course starts.',
      monitor: 'Reassess the indication and the stop date, not only the clinical response.',
    },
    gaps: visibleFieldKeys(v).filter(key => v[key] === 'unknown').map(key => STEROID_FIELDS.find(item => item.key === key).label),
    withheld: [],
    derived: {indication, criteriaMet},
  };
}

const NTUH_PUBLIC_PRODUCT_SOURCES = Object.freeze([
  {
    "label": "NTUH product identity: Solu-Cortef Sterile Powder 100 mg hydrocortisone/vial (SOL1LA06; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=SOL1LA06",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Florinef Tablet 0.1 mg/tab (FLO4LA18; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=FLO4LA18",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Dexamethasone Injection 5 mg/1 mL/amp (DEX1LA21; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=DEX1LA21",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Pantoloc i.v. Injection 40 mg pantoprazole/vial (PAN1HA40; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=PAN1HA40",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Nexium Tablet 40 mg (as magnesium trihydrate)/tab (NEX4HA41; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=NEX4HA41",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  },
  {
    "label": "NTUH product identity: Baktar Tablet 400 mg sulfamethoxazole & 80 mg trimethoprim/tab (BAK4AI02; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=BAK4AI02",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  }
]);

export const config = Object.freeze({
  id: 'systemic-corticosteroids',
  title: 'Systemic Corticosteroids',
  reviewedAt: '2026-09-23',
  reviewLabel: 'Focused source review',
  scope: 'Adult inpatient systemic corticosteroid decisions: which indications have a source regimen, the exact regimen and entry criteria for each, pre-exposure infection screening, glucose and ulcer-risk safeguards, Pneumocystis prophylaxis, and stopping. Not a complete immunosuppression, rheumatology, transplant, oncology-supportive, meningitis or paediatric corticosteroid protocol, and not a dose converter.',
  reviewLimitations: [
    "NTUH public product pages were checked anonymously on 2026-11-07 for identity and label strength only. The catalog snapshot is dated 2026-08-28; these checks do not establish current stock, absence of an alternative, substitution, preparation, orderability or patient suitability.",
    'Each indication rests on a different source of a different strength: randomised trials for septic shock, ARDS, COVID-19, severe community-acquired pneumonia and COPD duration; guideline statements for asthma, Pneumocystis and adrenal insufficiency; and observational practice only for acute ILD exacerbations and radiation pneumonitis. The guide shows which is which and does not level them.',
    'GOLD 2026 was confirmed to recommend systemic corticosteroids for up to 5 days in moderate and severe exacerbations through the published report landing page and secondary summaries; the full 2026 report PDF was not directly read, so the exact dose sentence is carried from REDUCE, which was read as the primary trial.',
    'The septic-shock branch follows the SSC 2026 contract already recorded in this project: a conditional suggestion for IV corticosteroids with no mandated cortisol result and no fixed vasopressor threshold. Additional vasopressor-dose/duration or cortisol-testing prerequisites from unverified protocol text are flagged for source reconciliation.',
    'The ARDS day-14 safety signal comes from LaSRS. A 2025 observational analysis has questioned whether day 14 is a genuine boundary, so this is presented as a reason for specialist review rather than a settled prohibition.',
    'The public Solu-Cortef injection and Florinef tablet identities do not resolve oral hydrocortisone product/strength or current availability. Confirm the actual product independently; a dated catalog cannot establish absence.',
    'Local doses, schedules and conditions require local reconciliation; nothing here establishes current orderability.',
    'Dose equivalence is stated once, for review, and is deliberately not applied: the guide never converts a dose between glucocorticoids or routes. The Calculator’s steroid equivalence card requires explicit manual entry for that.',
  ],
  sources: [
    ssc, aprocchss, dexaArds, lasrs, recovery, capeCod, torres, gold, reduce, gina,
    nihPjp, asco, aeIld, adrenalCrisis, endocrinePai, dexLabel, cdcStrongyloides, idsaInfluenza,
    ...NTUH_PUBLIC_PRODUCT_SOURCES,
  ],
  entry: {
    title: 'Which indication, and are its entry criteria met?',
    guidance: 'Every regimen in this guide belongs to exactly one indication and appears only after that indication’s criteria are reviewed and met. Unknown is not met, and no dose is carried between indications.',
    source: ssc,
  },
  fields: STEROID_FIELDS,
  visibleFieldKeys,
  evaluate,
  regimenActionIds: Object.freeze([
    'steroid-septic-shock-aprocchss-regimen',
    'steroid-ards-dexa-regimen',
    'steroid-covid-recovery-regimen',
    'steroid-cap-cape-cod-regimen',
    'steroid-cap-torres-alternative',
    'steroid-pjp-adjunctive-regimen',
    'steroid-copd-short-course',
    'steroid-asthma-systemic-regimen',
    'steroid-ae-ild-pulse',
    'steroid-checkpoint-pneumonitis-severe',
    'steroid-checkpoint-pneumonitis-moderate',
    'steroid-radiation-pneumonitis',
    'steroid-adrenal-crisis-rescue',
    'steroid-adrenal-sick-day',
    'steroid-adrenal-maintenance',
    'steroid-adrenal-fludrocortisone-maintenance',
    'steroid-raised-pressure-dexamethasone',
  ]),
  conflictActionIds: Object.freeze([
    'steroid-septic-shock-saved-row-discrepancy',
    'steroid-cap-oxygen-cue-discrepancy',
    'steroid-cap-torres-alternative',
    'steroid-cap-influenza-exclusion',
    'steroid-ards-late-initiation-safety',
    'steroid-raised-pressure-lymphoma-caution',
  ]),
  stages: [
    {id: 'indication', title: 'Indication & entry criteria', empty: 'Select the indication and review its criteria.'},
    {id: 'regimen', title: 'Reviewed regimen', empty: 'A regimen appears once the indication criteria are reviewed and met.'},
    {id: 'screen', title: 'Before & during exposure', empty: 'Screening and safeguards follow the criteria review.'},
    {id: 'stop', title: 'Duration, taper & stopping', empty: 'Duration follows the indication.'},
    {id: 'monitor', title: 'Monitor & reassess', empty: 'Reassessment follows an established indication.'},
  ],
  quickReference: {
    summary: 'Name the indication, check that indication’s entry criteria, then use only that indication’s regimen — and decide screening, glucose monitoring, ulcer risk, Pneumocystis prophylaxis and the stop date at the same time.',
    recognition: [
      'Indications with a randomised-trial regimen: septic shock, moderate-to-severe ARDS, COVID-19 needing oxygen, severe community-acquired pneumonia, COPD exacerbation duration.',
      'Indications with guideline regimens: asthma exacerbation, Pneumocystis pneumonia, adrenal insufficiency, tumour-related raised intracranial pressure.',
      'Indications resting on observational practice only: acute exacerbation of ILD, radiation pneumonitis.',
    ],
    redFlags: [
      'Suspected adrenal crisis — give hydrocortisone 100 mg IV or IM immediately; do not wait for a cortisol result in a shocked patient.',
      'Active tuberculosis, untreated invasive fungal infection, or Strongyloides exposure risk before immunosuppression.',
      'Suspected primary CNS lymphoma before biopsy — corticosteroid can make the histology non-diagnostic.',
      'Starting a corticosteroid in persistent ARDS at or after day 14, or in influenza pneumonia, without specialist review.',
    ],
    steps: [
      {role: 'Indication', text: 'Choose one indication and review its explicit entry criteria. Unknown is not met, and no regimen appears until they are.'},
      {role: 'Regimen', text: 'Use only the regimen recorded for that indication. Do not carry a dose across indications or convert between glucocorticoids from memory.'},
      {role: 'Screen', text: 'Tuberculosis, invasive fungal infection and Strongyloides before exposure; glucose monitoring, ulcer-risk-driven acid suppression, and Pneumocystis prophylaxis at ≥20 mg prednisolone-equivalent for ≥4 weeks.'},
      {role: 'Stop', text: 'Short defined courses stop without a taper; prolonged or repeated courses taper, and replacement therapy is reduced to maintenance rather than stopped.'},
      {role: 'Monitor', text: 'Re-check the indication, response and stop date. Improvement on a steroid is not confirmation of the diagnosis.'},
    ],
    monitoring: [
      'Capillary glucose through the course, weighted to afternoon and evening values when the steroid is dosed in the morning.',
      'Infection signs, blood pressure, mood, sleep and — for longer courses — bone protection, muscle weakness and adrenal suppression.',
      'The recorded stop or taper date at each review, including what appears on the discharge medication list.',
    ],
    sources: [ssc, aprocchss, dexaArds, recovery, capeCod, gold, nihPjp, asco, adrenalCrisis, endocrinePai, ...NTUH_PUBLIC_PRODUCT_SOURCES],
  },
});

export default config;
