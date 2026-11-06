import { h } from '../lib/ui.js';
import { TONE, branches, chipRows, formula, values, summary, step, timeline, conclusion, caveats, resultsHead, sourceCard } from './calc-parts.js';

// Score pages. Items and points come from CALCULATOR_FORMULAS.SCORES (the same
// definitions the desktop cards tally), so the page never lists a criterion the
// engine does not score. Each page: one question per item → items with points →
// bands with the fired one lit → conclusion → the engine's caveats.

const POINT_TONE = (points, max) => (points <= 0 ? 'ok' : points >= max ? 'urgent' : 'attention');

function itemChoices(engines, definitionId) {
  return engines.CALCULATOR_SCORES.SCORES[definitionId].items.map((item) => ({
    key: item.key,
    label: item.label,
    hint: item.hint || null,
    options: item.options.map(([value, text, points]) => [value, points === 0 || item.options.length === 2 ? text : `${text} (${points > 0 ? '+' : ''}${points})`]),
    initial: '',
    required: true,
  }));
}

function itemRows(result) {
  return chipRows(result.items.map((item) => ({
    label: `${item.label} · ${item.optionLabel}`,
    chip: `${item.points > 0 ? '+' : ''}${item.points}`,
    tone: POINT_TONE(item.points, Math.max(...result.items.map((i) => Math.abs(i.points)))),
  })));
}

function bandBranches(result) {
  return branches(result.bands.map((b) => ({ id: b.code, label: b.label, rule: b.rule })), result.band.code);
}

function scorePage({ id, definitionId, fn, title, shortTitle, subtitle, searchTerms, action, footnote, source, extras, related }) {
  return {
    id,
    title,
    shortTitle,
    subtitle,
    searchTerms,
    groups: [],
    choices: (engines) => itemChoices(engines, definitionId),
    limits: {},
    action: action || 'Score',
    footnote: footnote || 'Answer every item; an unanswered item is never scored as zero.',
    compute: (v, choices, engines) => engines.CALCULATOR_SCORES[fn](choices),
    related,
    render: (r, ctx) => [
      resultsHead(`${r.label} ${r.total}${r.max ? ` / ${r.max}` : ''}`, r.severity),
      timeline(
        step(1, 'Items', r.total ? (r.severity === 'danger' ? 'urgent' : 'attention') : 'ok', [itemRows(r)]),
        step(2, 'Band', TONE[r.severity], [values(`Total ${r.total}${r.max ? ` of ${r.max}` : ''}`), bandBranches(r)])),
      conclusion(`${r.label} ${r.total} · ${r.band.label}`),
      extras ? extras(r) : null,
      caveats(r.caveats),
      sourceCard([
        `${source} — portal-calculator-scores.js :: ${fn}(); the desktop card tallies the same items.`,
        `scores sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.scores.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
      ]),
    ],
  };
}

const CHADS2_VASC = scorePage({
  id: 'chads2-vasc', definitionId: 'chads2-vasc', fn: 'chads2Vasc',
  title: 'CHA₂DS₂-VASc', searchTerms: ['CHADSVASC', 'CHADS2'], subtitle: 'Stroke risk in non-valvular AF · sex handled as a modifier',
  source: 'Lip et al., Chest 2010 (CHA₂DS₂-VASc); banding on the non-sex score per ESC 2020 / ACC 2023',
  related: () => [
    { href: '#/calc/has-bled', label: 'HAS-BLED', why: 'bleeding risk before anticoagulation' },
    { href: '#/guides/atrial-fibrillation-rvr', label: 'Atrial fibrillation with RVR guide', why: 'acute rate control and cardioversion safeguards' },
  ],
  extras: (r) => summary(`Non-sex score ${r.nonSexScore} decides the band. Cohort annual stroke rate at ${r.total} points: ${r.annualStrokeRisk}.`),
});

const HAS_BLED = scorePage({
  id: 'has-bled', definitionId: 'has-bled', fn: 'hasBled',
  title: 'HAS-BLED', subtitle: 'Bleeding risk on anticoagulation · ≥ 3 high',
  source: 'Pisters et al., Chest 2010',
  related: () => [
    { href: '#/calc/chads2-vasc', label: 'CHA₂DS₂-VASc', why: 'stroke risk to weigh against' },
    { href: '#/guides/anticoagulant-bleeding', label: 'Anticoagulant-related bleeding guide', why: 'if bleeding occurs on treatment' },
  ],
});

const WELLS_DVT = scorePage({
  id: 'wells-dvt', definitionId: 'wells-dvt', fn: 'wellsDvt',
  title: 'Wells score · DVT', shortTitle: 'Wells DVT', subtitle: 'Three-level probability · two-level rule',
  source: 'Wells et al., Lancet 1997 (three-level) and NEJM 2003 (two-level)',
  related: () => [{ href: '#/calc/wells-pe', label: 'Wells score · PE', why: 'if there are chest symptoms' }],
  extras: (r) => summary(`Two-level rule: DVT ${r.twoLevel} (${r.twoLevel === 'likely' ? '≥ 2 → ultrasound' : '≤ 1 → D-dimer first'}).`),
});

const WELLS_PE = scorePage({
  id: 'wells-pe', definitionId: 'wells-pe', fn: 'wellsPe',
  title: 'Wells score · PE', shortTitle: 'Wells PE', subtitle: 'Two-level rule (> 4 likely) · three-level probability',
  source: 'Wells et al., Thromb Haemost 2000; two-level cut-off from the Christopher study, JAMA 2006',
  related: () => [{ href: '#/guides/acute-hypoxemia-dyspnea', label: 'Acute hypoxaemia / dyspnoea guide', why: 'stabilise while imaging is arranged' }, { href: '#/calc/wells-dvt', label: 'Wells score · DVT', why: 'if the leg is symptomatic' }],
  extras: (r) => summary(`Two-level rule: PE ${r.twoLevel} (${r.twoLevel === 'likely' ? '> 4 → CT pulmonary angiography' : '≤ 4 → D-dimer, age-adjusted over 50'}).`),
});

const CURB65 = scorePage({
  id: 'curb-65', definitionId: 'curb-65', fn: 'curb65',
  title: 'CURB-65', subtitle: 'Community-acquired pneumonia severity · 30-day mortality',
  source: 'Lim et al., Thorax 2003',
  related: (r) => [
    ...(r.band.code !== 'low' ? [{ href: '#/guides/sepsis-septic-shock', label: 'Sepsis / septic shock guide', why: 'pneumonia is a common source' }] : []),
    { href: '#/calc/news2', label: 'NEWS2', why: 'track physiology on the ward' },
  ],
  extras: (r) => summary(`30-day mortality in the derivation cohort at ${r.total} points: ${r.thirtyDayMortality}.`),
});

const QSOFA = scorePage({
  id: 'qsofa', definitionId: 'qsofa', fn: 'qsofa',
  title: 'qSOFA', subtitle: 'Bedside prompt for organ dysfunction · ≥ 2 positive',
  source: 'Seymour et al., JAMA 2016 (Sepsis-3)',
  related: (r) => [
    ...(r.band.code === 'positive' ? [{ href: '#/calc/sofa', label: 'SOFA', why: 'quantify organ dysfunction' }, { href: '#/guides/sepsis-septic-shock', label: 'Sepsis / septic shock guide', why: 'time-limited assessment and antimicrobials' }] : []),
    { href: '#/calc/news2', label: 'NEWS2', why: 'the recommended screening score' },
  ],
});

const SOFA = scorePage({
  id: 'sofa', definitionId: 'sofa', fn: 'sofa',
  title: 'SOFA', subtitle: 'Six organ systems · 0–4 each · mortality bands',
  source: 'Vincent et al., Intensive Care Med 1996; mortality bands after Ferreira et al., JAMA 2001',
  footnote: 'Score each system with the worst value of the past 24 hours.',
  related: () => [{ href: '#/guides/sepsis-septic-shock', label: 'Sepsis / septic shock guide', why: 'a rise of ≥ 2 defines organ dysfunction' }],
});

const GCS = scorePage({
  id: 'gcs', definitionId: 'gcs', fn: 'gcs',
  title: 'Glasgow Coma Scale', shortTitle: 'GCS', subtitle: 'E V M components · severity band',
  source: 'Teasdale & Jennett, Lancet 1974',
  related: (r) => [
    { href: '#/guides/delirium', label: 'Altered mental status / delirium guide', why: 'causes and safety' },
    ...(r.band.code !== 'mild' ? [{ href: '#/guides/acute-stroke', label: 'Acute stroke guide', why: 'focal deficit with reduced consciousness' }, { href: '#/guides/status-epilepticus', label: 'Seizure / status epilepticus guide', why: 'post-ictal or ongoing seizure' }] : []),
  ],
  extras: (r) => summary(`Record as ${r.notation}.`),
});

const CHILD_PUGH = scorePage({
  id: 'child-pugh', definitionId: 'child-pugh', fn: 'childPugh',
  title: 'Child-Pugh', subtitle: 'Cirrhosis severity · classes A, B, C',
  source: 'Pugh et al., Br J Surg 1973; one-year survival after Infante-Rivard et al., Hepatology 1987',
  related: () => [{ href: '#/calc/meld', label: 'MELD-Na', why: 'transplant-allocation score' }, { href: '#/guides/gi-bleed', label: 'Acute GI bleeding guide', why: 'variceal bleeding in cirrhosis' }],
});

const PADUA = scorePage({
  id: 'padua', definitionId: 'padua', fn: 'padua',
  title: 'Padua Prediction Score', shortTitle: 'Padua', subtitle: 'Medical inpatient VTE risk · ≥ 4 high',
  source: 'Barbar et al., J Thromb Haemost 2010',
  related: () => [{ href: '#/calc/improve-bleeding', label: 'IMPROVE bleeding risk', why: 'before pharmacological prophylaxis' }],
  extras: () => h('p', { class: 'tsummary' }, 'Pair with the ', h('a', { href: '#/calc/improve-bleeding' }, 'IMPROVE bleeding risk score'), ' before choosing pharmacological prophylaxis.'),
});

const IMPROVE_BLEEDING = scorePage({
  id: 'improve-bleeding', definitionId: 'improve-bleeding', fn: 'improveBleeding',
  title: 'IMPROVE bleeding risk', shortTitle: 'IMPROVE bleeding', subtitle: 'Medical inpatient bleeding risk · ≥ 7 high',
  source: 'Decousus et al., Chest 2011',
  related: () => [{ href: '#/calc/padua', label: 'Padua Prediction Score', why: 'the VTE side of the decision' }, { href: '#/guides/anticoagulant-bleeding', label: 'Anticoagulant-related bleeding guide', why: 'if bleeding occurs on prophylaxis' }],
});

const MELD_BANDS = (r) => branches(r.bands.map((b) => ({ id: b.code, label: b.label, rule: b.rule })), r.band.code);

const MELD = {
  id: 'meld',
  title: 'MELD-Na',
  subtitle: 'OPTN/UNOS arithmetic · clamps shown · MELD(i) and MELD-Na',
  groups: [
    { title: 'Laboratory values', fields: [
      { key: 'bilirubin', label: 'Bilirubin', unit: 'mg/dL', placeholder: '2.0', shared: 'bilirubin' },
      { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', placeholder: '1.5', shared: 'creatinine' },
      { key: 'inr', label: 'INR', unit: '', placeholder: '1.5', shared: 'inr' },
    ] },
    { title: 'Sodium · optional', fields: [
      { key: 'sodium', label: 'Na⁺', unit: 'mmol/L', placeholder: '135', required: false, shared: 'sodium' },
    ] },
  ],
  choices: [{ key: 'dialysis', label: 'Dialysis ≥ 2× in the past week', options: [['no', 'No'], ['yes', 'Yes']], initial: 'no', required: true }],
  limits: { bilirubin: { min: 0, max: 100 }, creatinine: { min: 0, max: 30 }, inr: { min: 0, max: 20 }, sodium: { min: 100, max: 180 } },
  footnote: 'Without sodium the page shows MELD(i). MELD 3.0 is not implemented.',
  related: () => [{ href: '#/calc/child-pugh', label: 'Child-Pugh', why: 'clinical severity class' }, { href: '#/guides/gi-bleed', label: 'Acute GI bleeding guide', why: 'variceal bleeding in cirrhosis' }],
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.meld({ ...v, dialysis: choices.dialysis }),
  render: (r, ctx) => [
    resultsHead(`${r.version} ${r.score}`, r.severity),
    timeline(
      step(1, 'Values as used', r.clamps.length ? 'attention' : 'ok', [
        values(`bilirubin ${r.used.bilirubin} · creatinine ${r.used.creatinine} · INR ${r.used.inr}${r.used.sodium !== null ? ` · Na ${r.used.sodium}` : ''}`),
        summary(r.clamps.length ? `Clamped: ${r.clamps.join(', ')}.` : 'No clamps applied.'),
      ]),
      step(2, 'Equation', TONE[r.severity], [
        formula(r.formula),
        values(`MELD(i) ${r.meldInitial}${r.meldNa !== null ? ` → MELD-Na ${r.meldNa}` : ' · no sodium term'}`),
        r.meldNa !== null && r.meldInitial <= 11 ? summary('MELD(i) ≤ 11: the sodium term does not apply.') : null,
      ]),
      step(3, 'Band', TONE[r.severity], [MELD_BANDS(r)])),
    conclusion(`${r.version} ${r.score} · ${r.band.label}`),
    caveats(r.caveats),
    sourceCard([
      'OPTN/UNOS MELD-Na (Kamath 2001; Kim 2008; policy since 2016) — portal-calculator-formulas.js :: meld().',
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
    ]),
  ],
};

export const SCORE_PAGES = [GCS, QSOFA, SOFA, CURB65, WELLS_DVT, WELLS_PE, CHADS2_VASC, HAS_BLED, MELD, CHILD_PUGH, PADUA, IMPROVE_BLEEDING];
