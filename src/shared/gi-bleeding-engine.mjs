// Adult acute overt GI bleeding review. Manual findings only; no chart, order, or procedure operation.
export const ESGE_PEPTIC_ULCER_2026_SOURCE = 'https://www.esge.com/assets/downloads/pdfs/guidelines/2026_a-2863-8314.pdf';
export const ESGE_VARICEAL_2022_SOURCE = 'https://www.esge.com/assets/downloads/pdfs/guidelines/2022_a-1939-4887.pdf';
export const AASLD_VARICEAL_2016_SOURCE = 'https://www.aasld.org/sites/default/files/2022-04/Garcia-Tsao_et_al-2017-Hepatology.pdf';
export const ACG_UPPER_GI_2021_SOURCE = 'https://doi.org/10.14309/ajg.0000000000001245';
export const ACG_LOWER_GI_2023_SOURCE = 'https://doi.org/10.14309/ajg.0000000000002130';
export const ACG_LOWER_GI_2023_SLIDES_SOURCE = 'https://webfiles.gi.org/links/virtgrandround/34ACGVGRSenguptaAcuteLGIBleed.pdf';
export const BAVENO_VII_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11090185/';

const upperSource = Object.freeze({
  label: 'ESGE 2026 Peptic Ulcer Bleeding guideline',
  url: ESGE_PEPTIC_ULCER_2026_SOURCE,
});
const upperCommentarySource = Object.freeze({
  label: 'ACG official commentary summarizing the 2021 upper-GI guideline',
  url: 'https://gi.org/journals-publications/ebgi/icymi_schoenfeldbleed/',
});
const upperPpiCommentarySource = Object.freeze({
  label: 'ACG official 2024 commentary summarizing the 2021 post-endoscopic PPI recommendation',
  url: 'https://gi.org/journals-publications/ebgi/schoenfeld_jul2024/',
});
const lowerSource = Object.freeze({
  label: 'ACG 2023 Acute Lower Gastrointestinal Bleeding guideline (abstract accessed)',
  url: ACG_LOWER_GI_2023_SOURCE,
});
const lowerSlidesSource = Object.freeze({
  label: 'ACG 2023 Acute Lower GI Bleeding teaching slides',
  url: ACG_LOWER_GI_2023_SLIDES_SOURCE,
});
const varicealSource = Object.freeze({
  label: 'ESGE 2022 Esophagogastric Variceal Hemorrhage guideline',
  url: ESGE_VARICEAL_2022_SOURCE,
});
const vasoactiveDoseSource = Object.freeze({
  label: 'AASLD 2016 portal-hypertension guidance — vasoactive-dose table',
  url: AASLD_VARICEAL_2016_SOURCE,
});
const field = (key, label, options, threshold) => Object.freeze({
  key,
  label,
  options: Object.freeze([['unknown', 'Not assessed'], ...options]),
  ...(threshold ? {threshold} : {}),
});

export const GI_BLEED_FIELDS = Object.freeze([
  field('phase', 'Review timing', [
    ['initial', 'Initial review'],
    ['reassessment', 'After initial management'],
  ]),
  field('overtBleeding', 'Acute overt GI bleeding?', [
    ['yes', 'Hematemesis, melena, or hematochezia'],
    ['no', 'Not established'],
  ], 'Hematochezia can be brisk upper-GI bleeding.'),
  field('currentDanger', 'Current immediate danger?', [
    ['yes', 'Yes — shock, airway risk, or major active loss'],
    ['no', 'Absent — assessed'],
  ], 'Shock, airway risk, altered consciousness, or major active loss overrides other routes.'),
  field('bleedingActivity', 'Current bleeding activity?', [
    ['hemodynamically-significant', 'Ongoing, hemodynamically significant'],
    ['ongoing-not-hemodynamically-significant', 'Ongoing, not hemodynamically significant'],
    ['no-current-bleeding', 'No current bleeding'],
  ], 'Update after new visible loss or perfusion change.'),
  field('transfusionContext', 'Red-cell context?', [
    ['stable-hb-below-7', 'Stable; Hb <7 g/dL'],
    ['stable-hb-7-or-higher', 'Stable; Hb ≥7 g/dL'],
    ['unstable-or-major-ongoing-loss', 'Unstable / major loss'],
    ['higher-threshold-or-special-context', 'Higher threshold / special context'],
  ], 'Hb <7 g/dL is the restrictive threshold only when stable.'),
  field('source', 'Likely source?', [
    ['variceal-upper', 'Variceal / portal-hypertensive upper'],
    ['nonvariceal-upper', 'Non-variceal upper'],
    ['lower', 'Lower GI'],
    ['uncertain', 'Still uncertain'],
  ], 'Classify before selecting a source-specific route.'),
  field('varicealBundle', 'Variceal bundle given?', [
    ['none-confirmed', 'Neither'],
    ['vasoactive-only', 'Vasoactive only'],
    ['antibiotic-only', 'Antibiotic only'],
    ['both-confirmed', 'Both'],
  ], 'Confirm exposure and start times before repeating a component.'),
  field('upperEndoscopyState', 'Upper endoscopy result?', [
    ['pending', 'Pending'],
    ['high-risk-treated', 'High-risk ulcer treated'],
    ['adherent-clot-not-treated', 'Adherent clot (FIIb), not treated'],
    ['no-high-risk-or-other-cause', 'Other / no high-risk ulcer'],
  ], 'High-dose PPI follows hemostasis or applies to untreated FIIb clot.'),
  field('ppiStatus', 'High-dose PPI already given?', [
    ['not-started', 'Not started — verified'],
    ['started', 'Already started'],
  ], 'Only after hemostasis or untreated FIIb clot; reconcile before repeat.'),
  field('lowerCta', 'CTA result?', [
    ['not-done', 'Not yet done'],
    ['extravasation', 'Extravasation'],
    ['no-extravasation', 'No extravasation'],
  ], 'CTA is for active hemodynamically significant lower bleeding.'),
  field('response', 'Current response?', [
    ['controlled', 'Controlled'],
    ['persistent-or-rebleed', 'Persistent / rebleed'],
    ['worse', 'Worse / new emergency'],
  ], 'New deterioration overrides earlier control.'),
]);

export function normalizeGiBleed(input = {}) {
  return Object.fromEntries(GI_BLEED_FIELDS.map(item => [
    item.key,
    item.options.some(([value]) => value === input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

export function visibleFieldKeys(input = {}) {
  const v = normalizeGiBleed(input);
  const keys = ['phase', 'overtBleeding', 'currentDanger'];
  if (v.overtBleeding === 'yes') {
    keys.push('bleedingActivity', 'transfusionContext', 'source');
    if (v.source === 'variceal-upper') {
      keys.push('varicealBundle');
    }
    if (v.source === 'nonvariceal-upper') {
      keys.push('upperEndoscopyState');
      if (v.phase === 'reassessment'
        && v.currentDanger === 'no'
        && !['persistent-or-rebleed', 'worse'].includes(v.response)
        && ['high-risk-treated', 'adherent-clot-not-treated'].includes(v.upperEndoscopyState)) {
        keys.push('ppiStatus');
      }
    }
    if (v.source === 'lower' && v.bleedingActivity === 'hemodynamically-significant') keys.push('lowerCta');
    if (v.phase === 'reassessment') keys.push('response');
  }
  return keys;
}

const stages = Object.freeze(['entry', 'route', 'treat', 'reassess']);
export function evaluate(input = {}) {
  const v = normalizeGiBleed(input);
  const actions = [];
  const add = (id, stage, title, summary, detail, extra = {}) => actions.push({
    id,
    stage,
    title,
    summary,
    detail,
    sourceUrl: upperSource.url,
    sourceLabel: upperSource.label,
    ...extra,
  });
  const majorLoss = v.transfusionContext === 'unstable-or-major-ongoing-loss';
  const currentHemodynamicBleeding = v.bleedingActivity === 'hemodynamically-significant';
  const urgent = v.currentDanger === 'yes'
    || majorLoss
    || currentHemodynamicBleeding
    || (v.phase === 'reassessment' && v.response === 'worse');
  const lowerActive = v.source === 'lower' && v.bleedingActivity === 'hemodynamically-significant';
  const rebleed = v.phase === 'reassessment' && v.response === 'persistent-or-rebleed';
  const routineRoute = v.phase !== 'unknown' && v.currentDanger === 'no' && !urgent;
  const routineInitial = v.phase === 'initial' && v.currentDanger === 'no' && !urgent;
  const routineReassessment = v.phase === 'reassessment' && v.currentDanger === 'no' && !urgent;
  const transfusionSource = v.source === 'lower' ? lowerSlidesSource : v.source === 'variceal-upper' ? varicealSource : upperSource;
  const varicealRouteSummary = v.phase === 'unknown' || v.currentDanger !== 'no'
    ? 'Confirm current danger, review phase, and vasoactive/antibiotic exposure before a new regimen.'
    : v.phase === 'initial' && v.varicealBundle === 'unknown'
      ? 'Confirm vasoactive and antibiotic exposure, then start missing components; arrange endoscopy within 12 hours after resuscitation.'
      : v.phase === 'initial' && v.varicealBundle !== 'both-confirmed'
        ? 'Start the missing vasoactive or antibiotic component; arrange endoscopy within 12 hours after resuscitation.'
        : v.phase === 'initial'
          ? 'Reconcile vasoactive and antibiotic exposure; arrange endoscopy within 12 hours after resuscitation.'
          : 'Reconcile prior vasoactive and antibiotic exposure; do not reload a completed course.';

  if (urgent) add(
    'gi-emergency-override',
    'entry',
    'Urgent resuscitation and source control',
    'Instability, major loss, current hemodynamically significant bleeding, or worsening overrides earlier reassurance.',
    'Prioritize airway when consciousness is altered or there is active hematemesis, tissue perfusion, blood-product strategy and urgent source control. Do not wait for the route form to be completed. In suspected variceal bleeding, use the variceal route in parallel after resuscitation.',
    {tone: 'urgent', resourceGroup: 'gi-evaluation'},
  );
  if (v.overtBleeding === 'unknown') add(
    'gi-confirm-overt-bleeding',
    'entry',
    'Confirm overt GI bleeding',
    'Hematemesis, melena, or hematochezia need current severity and source assessment.',
    'Brisk upper-GI bleeding can present as hematochezia. A missing history, stool description, or result does not establish either a GI source or a benign presentation.',
    {resourceGroup: 'gi-evaluation'},
  );
  if (v.overtBleeding === 'no') add(
    'gi-entry-not-established',
    'entry',
    'Overt GI bleeding not established',
    'Reassess the alternative diagnosis; retain emergency assessment for concerning presentations.',
    'This guide does not turn occult testing, anemia alone, or a non-GI source into an acute GI-bleeding diagnosis.',
    {resourceGroup: 'gi-evaluation'},
  );
  if (v.currentDanger === 'unknown') add(
    'gi-assess-current-danger',
    'entry',
    'Assess immediate danger',
    'Unknown stability is not a stable GI-bleeding route.',
    'Review consciousness, active hematemesis/aspiration risk, BP/heart rate/perfusion, ongoing visible loss and injuries while resuscitation starts as indicated.',
    {tone: 'attention', resourceGroup: 'gi-evaluation'},
  );

  if (v.overtBleeding === 'yes') {
    if (v.bleedingActivity === 'unknown' || v.source === 'unknown') add(
      'gi-classify-current-activity-and-source',
      'route',
      'Classify activity and source',
      'Separate variceal upper, non-variceal upper, lower, and uncertain bleeding before choosing a drug or diagnostic route.',
      'Use focused history/examination, liver or portal-hypertension history, medication exposure, labs and directed testing. Hematochezia with hemodynamic instability may be a brisk upper-GI source; do not default to a lower-GI pathway.',
      {resourceGroup: 'gi-evaluation'},
    );
    if (v.bleedingActivity === 'unknown') add(
      'gi-record-current-bleeding-activity',
      'route',
      'Record current bleeding activity',
      'The CTA and urgent escalation routes depend on current activity, not a historic stool description.',
      'Reassess visible loss, hemodynamics and perfusion. A single hemoglobin can lag behind acute blood loss and does not by itself classify the current activity.',
      {resourceGroup: 'gi-evaluation'},
    );
    if (v.transfusionContext === 'unknown') add(
      'gi-establish-transfusion-context',
      'route',
      'Set transfusion context',
      'For hemodynamically stable GI bleeding, 7 g/dL is the reviewed restrictive threshold; major loss and special contexts need individualized treatment.',
      'Do not wait for a threshold during shock or rapid ongoing loss. Cardiovascular disease, age, ongoing bleeding and other clinical factors can justify a different strategy. This is not an automatic transfusion order.',
      {sourceUrl: transfusionSource.url, sourceLabel: transfusionSource.label, resourceGroup: 'transfusion-reference'},
    );
    if (routineRoute && v.transfusionContext === 'stable-hb-below-7') add(
      'gi-restrictive-transfusion-threshold',
      'treat',
      'Restrictive RBC threshold: Hb <7 g/dL',
      'Transfuse through the local blood-product process, then recheck hemodynamics, perfusion, ongoing loss and hemoglobin.',
      'ESGE upper-GI sources use 7 g/dL (70 g/L) in stable patients without cardiovascular disease. The directly read ACG lower-GI slides also use a restrictive strategy around 7 g/dL, with exceptions for massive bleeding and cardiovascular ischemia.',
      {sourceUrl: transfusionSource.url, sourceLabel: transfusionSource.label, resourceGroup: 'transfusion-reference'},
    );
    if (routineRoute && v.transfusionContext === 'stable-hb-7-or-higher') add(
      'gi-no-routine-rbc-above-restrictive-threshold',
      'treat',
      'Hb ≥7 g/dL: no routine RBC',
      'Continue source control and reassess for recurrent bleeding, perfusion change, or a documented individualized indication.',
      'The restrictive threshold does not make a stable value a discharge decision. Re-evaluate immediately if bleeding becomes hemodynamically significant or a higher-threshold clinical context applies.',
      {sourceUrl: transfusionSource.url, sourceLabel: transfusionSource.label, resourceGroup: 'transfusion-reference'},
    );
    if (v.transfusionContext === 'unstable-or-major-ongoing-loss') add(
      'gi-major-loss-transfusion-review',
      'treat',
      'Major loss: blood-product plan',
      'Do not await an Hb threshold while perfusion is failing or major loss continues.',
      'Coordinate urgent resuscitation, blood products and source control. Follow the current major-haemorrhage protocol; this guide does not set a universal transfusion ratio.',
      {tone: 'urgent', sourceUrl: transfusionSource.url, sourceLabel: transfusionSource.label, resourceGroup: 'transfusion-reference'},
    );
    if (routineRoute && v.transfusionContext === 'higher-threshold-or-special-context') add(
      'gi-individualized-transfusion-context',
      'treat',
      'Special threshold: individualize',
      'Document the reason rather than treating the 7 g/dL threshold as universal.',
      'Cardiovascular ischemia and major bleeding are exceptions in the lower-GI teaching material; ESGE uses 8 g/dL for stable upper-GI cardiovascular disease. Reconcile the actual indication rather than applying a blanket threshold.',
      {sourceUrl: transfusionSource.url, sourceLabel: transfusionSource.label, resourceGroup: 'transfusion-reference'},
    );

    if (v.source === 'uncertain') add(
      'gi-source-remains-uncertain',
      'route',
      'Source still uncertain',
      'Do not automatically start a PPI, vasoactive agent, CTA, or colonoscopy pathway from an uncertain route alone.',
      'Continue focused assessment. If hemodynamically significant hematochezia is present, urgently consider a brisk upper source as well as lower-GI bleeding.',
      {tone: 'attention', resourceGroup: 'gi-evaluation'},
    );

    if (v.source === 'variceal-upper') {
      add(
        'gi-variceal-route',
        'route',
        'Suspected variceal bleeding',
        varicealRouteSummary,
        'ESGE 2022 recommends terlipressin, octreotide, or somatostatin at presentation for up to 5 days, ceftriaxone prophylaxis, and endoscopy within 12 hours after hemodynamic resuscitation. This pathway keeps the vasoactive agents as alternatives.',
        {tone: urgent ? 'urgent' : undefined, sourceUrl: varicealSource.url, sourceLabel: varicealSource.label, resourceGroup: 'variceal-treatment'},
      );
      if (routineInitial && v.varicealBundle === 'unknown') add(
        'gi-variceal-reconcile-initial-bundle',
        'treat',
        'Confirm the variceal bundle',
        'Confirm vasoactive and antibiotic exposure, start time, and the active local plan.',
        'A missing record is not proof that either component was not given.',
        {sourceUrl: varicealSource.url, sourceLabel: varicealSource.label, resourceGroup: 'variceal-treatment'},
      );
      if (routineInitial && ['none-confirmed', 'antibiotic-only'].includes(v.varicealBundle)) add(
        'gi-variceal-octreotide-dose-reference',
        'treat',
        'Octreotide: 50 μg IV bolus → 50 μg/hour',
        'One vasoactive option; the AASLD 2016 dose table uses a 2–5-day course.',
        'ESGE 2022 recommends one of terlipressin, octreotide, or somatostatin at presentation for up to 5 days. The exact octreotide schedule is an AASLD 2016 dose-table reference, not a substitution for local preparation, current protocol, contraindication, or exposure review.',
        {sourceUrl: vasoactiveDoseSource.url, sourceLabel: vasoactiveDoseSource.label, resourceGroup: 'variceal-treatment'},
      );
      if (routineInitial && ['none-confirmed', 'vasoactive-only'].includes(v.varicealBundle)) add(
        'gi-variceal-ceftriaxone-prophylaxis',
        'treat',
        'Ceftriaxone 1 g IV daily × up to 7 days',
        'For ACLD with acute variceal hemorrhage; apply local resistance and allergy review.',
        'ESGE 2022 recommends ceftriaxone 1 g/day for up to 7 days, or an alternative according to local resistance and allergy. The mapped local product is an identity reference; confirm route, preparation, allergy, resistance, and current protocol before use.',
        {sourceUrl: varicealSource.url, sourceLabel: varicealSource.label, resourceGroup: 'variceal-treatment'},
      );
      if (rebleed) add(
        'gi-variceal-persistent-or-rebleed-escalation',
        'reassess',
        'Variceal rebleed: rescue review',
        'Repeat resuscitation and obtain urgent GI/hepatology/critical-care assessment.',
        'ESGE 2022 advises urgent rescue TIPS consideration for persistent esophageal variceal bleeding despite vasoactive and endoscopic hemostatic therapy. Confirm the actual prior treatment and source before selecting a rescue procedure.',
        {tone: 'urgent', sourceUrl: varicealSource.url, sourceLabel: varicealSource.label, resourceGroup: 'variceal-treatment'},
      );
    }

    if (v.source === 'nonvariceal-upper') {
      if (urgent) add(
        'gi-nonvariceal-upper-urgent-source-control',
        'route',
        'Urgent upper-GI source control',
        'Resuscitate first, then arrange endoscopic source control as soon as safely possible.',
        'ESGE 2026 recommends early endoscopy within 24 hours after resuscitation and does not recommend a ≤12-hour procedure unless hemodynamic instability persists despite adequate resuscitation.',
        {tone: 'urgent', sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (routineRoute && ['unknown', 'pending'].includes(v.upperEndoscopyState)) add(
        'gi-nonvariceal-upper-endoscopy-route',
        'route',
        'Upper endoscopy within 24 hours',
        'For likely non-variceal upper bleeding after resuscitation and stabilization.',
        'ESGE 2026 recommends early upper endoscopy (≤24 hours) after hemodynamic resuscitation. It does not recommend a ≤12-hour procedure for a patient who is adequately resuscitated and stable.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (routineRoute && v.upperEndoscopyState === 'unknown') add(
        'gi-nonvariceal-endoscopy-status-needed',
        'route',
        'Confirm endoscopy result',
        'The post-endoscopy PPI route depends on ulcer stigmata and hemostasis.',
        'A medication before endoscopy does not establish a peptic-ulcer diagnosis, high-risk stigma, or completed hemostasis.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (routineInitial && v.upperEndoscopyState === 'pending') add(
        'gi-nonvariceal-endoscopy-pending',
        'treat',
        'Consider pre-endoscopy IV PPI',
        'High-dose IV PPI may be considered, but it must not delay early endoscopy.',
        'ESGE 2026 makes this a conditional pre-endoscopy consideration. The exact post-endoscopy regimen is limited to the treated high-risk-ulcer or untreated-FIIb branch; use the linked local products only after product and preparation review.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'ppi'},
      );
      if (routineReassessment && !rebleed && ['high-risk-treated', 'adherent-clot-not-treated'].includes(v.upperEndoscopyState) && v.ppiStatus === 'unknown') add(
        'gi-reconcile-post-endoscopy-ppi-exposure',
        'treat',
        'Confirm high-dose PPI exposure',
        'Check product, dose, route, start time, and continuous/intermittent method before adding treatment.',
        'ESGE 2026 recommends high-dose PPI after endoscopic hemostasis and for an adherent clot (FIIb) not treated endoscopically. Reconcile the actual exposure before repeating a loading or infusion step.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'ppi'},
      );
      if (routineReassessment && !rebleed && ['high-risk-treated', 'adherent-clot-not-treated'].includes(v.upperEndoscopyState) && v.ppiStatus === 'not-started') add(
        'gi-high-dose-ppi-after-endoscopic-hemostasis',
        'treat',
        'High-dose PPI × 72 hours',
        '80 mg IV bolus → 8 mg/hour infusion for 72 hours; high-dose twice-daily IV or oral alternatives may be considered.',
        'ESGE 2026 recommends this route after endoscopic hemostasis and for an adherent clot (FIIb) not treated endoscopically. The mapped esomeprazole and pantoprazole products are identities, not validated infusion builds; confirm active local preparation and patient suitability.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'ppi'},
      );
      if (routineReassessment && !rebleed && ['high-risk-treated', 'adherent-clot-not-treated'].includes(v.upperEndoscopyState) && v.ppiStatus === 'started') add(
        'gi-ppi-already-started-reconcile',
        'treat',
        'PPI already started: reconcile',
        'Confirm product, total dose, route, start time and intended 3-day course before repeating.',
        'Recurrent bleeding needs renewed clinical and endoscopic assessment rather than automatic stacking of PPI regimens.',
        {sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'ppi'},
      );
      if (rebleed) add(
        'gi-nonvariceal-upper-rebleed-route',
        'reassess',
        'Upper-GI rebleed: repeat endoscopy',
        'Reassess perfusion and pursue repeat endoscopic hemostasis; escalate if that fails.',
        'ESGE 2026 advises consideration of an OTS clip for recurrent peptic-ulcer bleeding and TAE if the second endoscopic attempt fails; surgery is for unavailable or unsuccessful TAE. Confirm lesion, prior treatment, and local expertise before choosing a procedure.',
        {tone: 'urgent', sourceUrl: upperSource.url, sourceLabel: upperSource.label, resourceGroup: 'gi-evaluation'},
      );
    }

    if (v.source === 'lower') {
      if (v.bleedingActivity === 'hemodynamically-significant') add(
        'gi-lower-consider-brisk-upper-source',
        'route',
        'Active hematochezia: reassess upper source',
        'Do not make the lower-GI label override current instability or upper-source assessment.',
        'ACG lower-GI guidance notes that hematochezia with hemodynamic instability can indicate an upper-GI source. Use the presentation, risk factors and directed specialist assessment to decide the source route.',
        {tone: 'attention', sourceUrl: lowerSource.url, sourceLabel: lowerSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (lowerActive && v.lowerCta === 'unknown') add(
        'gi-lower-cta-status-needed',
        'route',
        'Confirm CTA status',
        'Ongoing hemodynamically significant hematochezia is the reviewed CTA entry; minor or subsided bleeding is a different route.',
        'CTA does not replace stabilization. A result must be reconciled with current bleeding, source uncertainty and the availability of interventional radiology.',
        {sourceUrl: lowerSlidesSource.url, sourceLabel: lowerSlidesSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (lowerActive && v.lowerCta === 'not-done') add(
        'gi-lower-cta-initial-route',
        'treat',
        'Active lower-GI bleeding: CTA',
        'Resuscitate in parallel. CTA is for active clinically significant hematochezia, not a routine screen for minor or subsided bleeding.',
        'The ACG 2023 teaching material recommends CTA as the initial diagnostic test for ongoing hemodynamically significant hematochezia. This guide does not generate contrast, renal-risk, or imaging orders; assess those through the current diagnostic process.',
        {sourceUrl: lowerSlidesSource.url, sourceLabel: lowerSlidesSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (lowerActive && v.lowerCta === 'extravasation') add(
        'gi-lower-positive-cta-ir-route',
        'treat',
        'CTA extravasation: IR review',
        'Keep resuscitation and source reassessment active; a positive scan is not definitive hemostasis.',
        'ACG 2023 teaching material routes CTA extravasation to prompt transcatheter angiography with embolization review. Centers with endoscopic-hemostasis expertise may use a source-specific endoscopic route; this guide does not select the procedure.',
        {tone: 'urgent', sourceUrl: lowerSlidesSource.url, sourceLabel: lowerSlidesSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (lowerActive && v.lowerCta === 'no-extravasation') add(
        'gi-lower-negative-cta-reassess',
        'treat',
        'No CTA extravasation: reassess',
        'A negative CTA does not establish the cause or prevent recurrent bleeding.',
        'Continue to match testing to current bleeding activity and stability. If hematochezia recurs or perfusion worsens, repeat the current danger and source assessment rather than treating a previous negative scan as clearance.',
        {sourceUrl: lowerSlidesSource.url, sourceLabel: lowerSlidesSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (routineRoute && !rebleed && ['ongoing-not-hemodynamically-significant', 'no-current-bleeding'].includes(v.bleedingActivity)) add(
        'gi-lower-nonurgent-colonoscopy-route',
        'route',
        'Lower-GI bleeding: nonurgent colonoscopy',
        'Routine urgent colonoscopy within 24 hours has not improved rebleeding or mortality outcomes.',
        'ACG 2023 recommends nonurgent inpatient colonoscopy for most hospitalized lower-GI bleeds. The exact timing, bowel preparation, prior colonoscopy context, and outpatient suitability remain clinical decisions; this is not an automatic discharge route.',
        {sourceUrl: lowerSource.url, sourceLabel: lowerSource.label, resourceGroup: 'gi-evaluation'},
      );
      if (rebleed) add(
        'gi-lower-persistent-or-rebleed-route',
        'reassess',
        'Lower-GI rebleed: repeat triage',
        'Reconsider CTA/IR when bleeding is again hemodynamically significant; do not rely on a prior colonoscopy or negative CTA alone.',
        'The diagnostic route follows the current severity and bleeding activity. This guide does not choose repeat colonoscopy, embolization, surgery, or antithrombotic reversal for an individual patient.',
        {tone: 'urgent', sourceUrl: lowerSource.url, sourceLabel: lowerSource.label, resourceGroup: 'gi-evaluation'},
      );
    }
  }

  if (v.phase === 'unknown') add(
    'gi-select-review-phase',
    'entry',
      'Set review phase',
    'Current danger remains the first route regardless of phase.',
    'Use reassessment only after a real initial management/procedure interval. It does not convert missing initial findings into negative ones.',
    {resourceGroup: 'gi-evaluation'},
  );
  if (v.phase === 'reassessment' && v.overtBleeding === 'yes') {
    if (v.response === 'unknown') add(
      'gi-record-response',
      'reassess',
      'Record current response',
      'Controlled, persistent/rebleeding, and worsening routes lead to different next actions.',
      'Update current visible loss, vitals/perfusion, source evidence, actual medication/procedure exposure and new laboratory trend before interpreting a prior response.',
      {resourceGroup: 'gi-evaluation'},
    );
    if (v.response === 'worse') add(
      'gi-worsening-response-emergency',
      'reassess',
      'Worsening: emergency reassessment',
      'Do not pursue a reassuring or recovery route while current deterioration is present.',
      'Reassess airway, perfusion, active loss and source control. The appropriate variceal, upper, or lower escalation branch remains source-dependent; do not repeat a previous regimen by default.',
      {tone: 'urgent', resourceGroup: 'gi-evaluation'},
    );
    if (v.response === 'controlled' && routineReassessment && v.bleedingActivity === 'no-current-bleeding') add(
      'gi-controlled-review-not-clearance',
      'reassess',
      'Controlled bleeding: follow-up review',
      'Clinical control is not automatic discharge, antithrombotic restart, or proof that no recurrent bleeding will occur.',
      'Confirm the actual source/hemostasis plan, PPI or variceal-therapy duration where applicable, current hemoglobin/perfusion trend, and coordinated antithrombotic decisions. The separate anticoagulant-related bleeding guide addresses reversal and resumption decisions.',
      {resourceGroup: 'gi-evaluation'},
    );
    if (v.response === 'controlled' && !urgent && v.bleedingActivity !== 'no-current-bleeding') add(
      'gi-controlled-response-activity-conflict',
      'reassess',
      'Reconcile “controlled” with current bleeding activity',
      'Ongoing bleeding remains an active route even when a prior response was recorded as controlled.',
      'Update current visible loss, perfusion and source-control status before a recovery/follow-up review.',
      {tone: 'attention', resourceGroup: 'gi-evaluation'},
    );
  }

  actions.sort((a, b) => stages.indexOf(a.stage) - stages.indexOf(b.stage));
  const source = v.source === 'variceal-upper' ? varicealSource : v.source === 'lower' ? lowerSource : upperSource;
  const status = urgent ? 'urgent' : v.overtBleeding === 'yes' ? 'met' : v.overtBleeding === 'no' ? 'notmet' : 'unknown';
  return {
    values: v,
    entry: {
      status,
      title: urgent ? 'Current GI-bleeding danger route' : v.overtBleeding === 'yes' ? 'Acute overt GI bleeding: classify the route' : v.overtBleeding === 'no' ? 'GI-bleeding entry not established' : 'Confirm the acute overt bleeding presentation',
      summary: 'Current danger, bleeding activity, source, treatment exposure, and response are separate findings.',
      source,
    },
    actions,
    visibleStageIds: stages.filter(stage => actions.some(action => action.stage === stage)),
    stageNotes: {
      entry: 'Current airway, perfusion, and major loss override a reassuring prior state.',
      route: 'Classify the likely source and current activity before selecting a procedure or medication branch.',
      treat: 'Verify the individual product, route, prior exposure, dose build, and current local protocol before use.',
      reassess: 'A new bleed or deterioration reopens the emergency assessment; clinical control is not clearance.',
    },
    gaps: visibleFieldKeys(v).filter(key => v[key] === 'unknown').map(key => GI_BLEED_FIELDS.find(field => field.key === key).label),
    withheld: [],
    derived: {urgentRoute: urgent, lowerActive, rebleed},
  };
}

export const config = Object.freeze({
  id: 'gi-bleed',
  title: 'Acute GI Bleeding',
  reviewedAt: '2026-09-19',
  reviewLabel: 'Upgraded guide · ESGE 2026 upper / ESGE 2022 variceal',
  scope: 'Adult acute overt GI bleeding: immediate danger, source classification, selected variceal/non-variceal/lower routes, restrictive transfusion context, and reassessment. Not a complete endoscopy, cirrhosis, massive-transfusion, anticoagulant-reversal, or disposition protocol.',
  reviewLimitations: [
    'The full ESGE 2026 peptic-ulcer and ESGE 2022 variceal guidelines were read for the visible upper and variceal branches. The full ACG 2021 upper-GI guideline was not directly accessed; its official commentaries are context only.',
    'The displayed octreotide schedule comes from a directly read AASLD 2016 dose table and is labelled as an older source. It does not establish a current local preparation or replace the current ESGE agent/duration recommendation.',
    'ACG 2023 lower-GI primary guidance was accessed as an abstract; CTA/IR handling uses the official ACG teaching slides.',
  ],
  sources: [upperSource, varicealSource, vasoactiveDoseSource, lowerSource, lowerSlidesSource, upperCommentarySource, upperPpiCommentarySource],
  entry: {
    title: 'Is this acute overt GI bleeding, and is there immediate danger?',
    guidance: 'Assess current airway, perfusion, ongoing loss and source in parallel. Unknowns are not reassuring; a current emergency overrides a prior source label or improvement.',
    source: upperSource,
  },
  fields: GI_BLEED_FIELDS,
  visibleFieldKeys,
  evaluate,
  regimenActionIds: Object.freeze([
    'gi-variceal-octreotide-dose-reference',
    'gi-variceal-ceftriaxone-prophylaxis',
    'gi-high-dose-ppi-after-endoscopic-hemostasis',
  ]),
  conflictActionIds: Object.freeze(['gi-controlled-response-activity-conflict']),
  stages: [
    {id: 'entry', title: 'Current safety', empty: 'Establish the overt bleeding presentation and current danger.'},
    {id: 'route', title: 'Source & severity', empty: 'Classify source and current bleeding activity.'},
    {id: 'treat', title: 'Treatment & source control', empty: 'Choose treatment only after the source-specific entry is established.'},
    {id: 'reassess', title: 'Response & rebleeding', empty: 'Select reassessment after initial management or a procedure.'},
  ],
  quickReference: {
    summary: 'Classify acute overt GI bleeding by current danger, activity and likely route before using source-specific treatment.',
    recognition: ['Hematemesis, melena, or hematochezia; brisk upper-GI bleeding can present with hematochezia.'],
    redFlags: [
      'Shock, poor perfusion, major ongoing bleeding, active hematemesis with airway risk, altered consciousness, or new deterioration.',
      'Persistent/recurrent bleeding after a procedure or initial medical treatment.',
    ],
    steps: [
      {role: 'Stabilize', text: 'Address airway, perfusion and major blood loss first; do not wait for source classification.'},
      {role: 'Classify', text: 'Separate suspected variceal, non-variceal upper, lower and uncertain routes.'},
      {role: 'Reassess', text: 'A new bleed or deterioration overrides a prior controlled state.'},
    ],
    monitoring: ['Repeat current bleeding activity, perfusion, hemoglobin trend, source-control status and actual drug/procedure exposure.'],
    sources: [upperSource, lowerSource, varicealSource],
  },
});

export default config;
