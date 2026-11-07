// Source-reviewed, data-only decision support for adult anaphylaxis.
//
// This module intentionally has no DOM, patient record, order, calculation,
// product preparation, or clinical-system behavior. It turns categorical,
// explicitly entered findings into source-linked review actions. The renderer
// owns session state and resource presentation.

export const RCUK_2025_SPECIAL_CIRCUMSTANCES_SOURCE = 'https://www.resus.org.uk/print/pdf/node/36442';
export const RCUK_ANAPHYLAXIS_2021_SOURCE = 'https://www.resus.org.uk/sites/default/files/2021-05/Emergency%20Treatment%20of%20Anaphylaxis%20May%202021_0.pdf';
export const RCUK_ABCDE_SOURCE = 'https://www.resus.org.uk/library/abcde-approach';
export const WAO_ANAPHYLAXIS_2020_SOURCE = 'https://www.worldallergyorganizationjournal.org/article/S1939-4551%2820%2930375-6/fulltext';
export const NICE_NG258_OBSERVATION_SOURCE = 'https://www.nice.org.uk/guidance/ng258/chapter/Period-of-observation';
export const NICE_NG258_TRYPTASE_SOURCE = 'https://www.nice.org.uk/guidance/ng258/chapter/Timing-of-blood-samples';

const rcuK2025 = Object.freeze({
  label: 'Resuscitation Council UK special causes guideline (2025)',
  url: RCUK_2025_SPECIAL_CIRCUMSTANCES_SOURCE,
});
const rcuK2021 = Object.freeze({
  label: 'Resuscitation Council UK emergency treatment of anaphylaxis (2021)',
  url: RCUK_ANAPHYLAXIS_2021_SOURCE,
});
const rcuKAbcde = Object.freeze({
  label: 'Resuscitation Council UK ABCDE approach (updated 2024)',
  url: RCUK_ABCDE_SOURCE,
});
const wao2020 = Object.freeze({
  label: 'World Allergy Organization Anaphylaxis Guidance (2020)',
  url: WAO_ANAPHYLAXIS_2020_SOURCE,
});
const niceObservation2026 = Object.freeze({
  label: 'NICE NG258 period of observation (2026)',
  url: NICE_NG258_OBSERVATION_SOURCE,
});
const niceTryptase2026 = Object.freeze({
  label: 'NICE NG258 timing of blood samples (2026)',
  url: NICE_NG258_TRYPTASE_SOURCE,
});

const STAGE_IDS = Object.freeze(['confirm', 'rescue', 'reassess', 'observe']);

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

export const ANAPHYLAXIS_FIELDS = Object.freeze([
  field('phase', 'Review state', [
    ['unknown', 'Not selected'],
    ['initial', 'Before first IM adrenaline dose — confirmed not yet given'],
    ['after-one-im-dose', 'After one IM adrenaline dose'],
    ['after-two-im-doses', 'After two IM adrenaline doses'],
    ['resolved-observation', 'Symptoms resolved — observation review'],
  ], {
    essential: 'Choose a treatment state to keep initial rescue, a timed repeat dose, refractory care and observation separate. Until selected, ABC assessment remains visible and urgent.',
  }),
  field('acuteOnset', 'Acute onset in minutes to several hours?', [
    ['unknown', 'Unknown / not assessed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'WAO criteria use an acute onset in minutes to several hours. An uncertain timeline does not make current airway, breathing or circulation findings safe.',
  }),
  field('skinMucosal', 'Typical skin or mucosal findings?', [
    ['unknown', 'Unknown / not assessed'],
    ['present', 'Present'],
    ['absent', 'Absent — assessed'],
  ], {
    threshold: 'Typical findings include generalized hives, pruritus/flushing, or swollen lips, tongue or uvula. Skin/mucosal findings may be absent in anaphylaxis.',
  }),
  field('airway', 'Laryngeal / airway involvement at acute presentation?', [
    ['unknown', 'Unknown / not assessed'],
    ['laryngeal-involvement', 'Present — stridor, voice change, or throat/tongue swelling'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'WAO criterion 2 includes acute laryngeal involvement after a known or probable allergen. Any current airway compromise needs emergency assessment without waiting for this presentation-criteria form.',
  }),
  field('breathing', 'Bronchospasm or respiratory compromise at acute presentation?', [
    ['unknown', 'Unknown / not assessed'],
    ['respiratory-compromise', 'Present — wheeze, dyspnoea, hypoxaemia, or bronchospasm'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'Respiratory compromise is a WAO criterion and an RCUK airway/breathing/circulation emergency feature. For isolated lower-respiratory symptoms, complete the visible WAO exception check before criterion 2 is marked met.',
  }),
  field('circulation', 'Circulation compromise at acute presentation?', [
    ['unknown', 'Unknown / not assessed'],
    ['hypotension-or-collapse', 'Hypotension / collapse'],
    ['cardiac-arrest', 'Cardiac arrest'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'WAO includes reduced blood pressure or collapse. Current cardiac arrest starts the resuscitation algorithm; IM absorption is then unreliable. Current ABC is entered separately after treatment begins.',
  }),
  field('currentAirway', 'Current laryngeal / airway involvement?', [
    ['unknown', 'Unknown / not assessed'],
    ['laryngeal-involvement', 'Present — stridor, voice change, or throat/tongue swelling'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'This is a current-response finding after treatment starts. Any present airway compromise needs emergency assessment immediately; unknown is not an absent airway threat.',
  }),
  field('currentBreathing', 'Current bronchospasm or respiratory compromise?', [
    ['unknown', 'Unknown / not assessed'],
    ['respiratory-compromise', 'Present — wheeze, dyspnoea, hypoxaemia, or bronchospasm'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'This is a current-response finding after treatment starts. Any present breathing compromise needs emergency assessment immediately; unknown is not an absent respiratory threat.',
  }),
  field('currentCirculation', 'Current circulation compromise?', [
    ['unknown', 'Unknown / not assessed'],
    ['hypotension-or-collapse', 'Hypotension / collapse'],
    ['cardiac-arrest', 'Cardiac arrest'],
    ['not-observed', 'Not observed — assessed'],
  ], {
    threshold: 'This is a current-response finding after treatment starts. Cardiac arrest starts the resuscitation algorithm; unknown is not an absent circulation threat.',
  }),
  field('severeGi', 'Severe gastrointestinal symptoms?', [
    ['unknown', 'Unknown / not assessed'],
    ['present', 'Present — severe crampy pain or repetitive vomiting'],
    ['absent', 'Absent — assessed'],
  ], {
    threshold: 'WAO criterion 1 includes severe gastrointestinal symptoms with acute skin/mucosal involvement, especially after a non-food allergen.',
  }),
  field('knownOrProbableAllergen', 'Known or highly probable allergen just before onset?', [
    ['unknown', 'Unknown / not assessed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'WAO criterion 2 uses a known or highly probable allergen with acute laryngeal, respiratory, or circulation compromise. Do not delay rescue while trigger history is incomplete.',
  }),
  field('isolatedLowerRespiratoryException', 'Only lower-respiratory symptoms after a common inhalant or perceived food inhalation without ingestion?', [
    ['unknown', 'Unknown / not assessed'],
    ['yes', 'Yes — WAO criterion 2 lower-respiratory exception'],
    ['no', 'No — not this isolated lower-respiratory exception'],
    ['not-applicable', 'Not applicable — laryngeal, circulation, or additional systemic findings'],
  ], {
    threshold: 'WAO criterion 2 excludes isolated lower-respiratory symptoms triggered by common inhalant allergens and perceived food “inhalational” reactions without ingestion. If only bronchospasm is entered, unknown does not automatically meet criterion 2; assess this exception while treating any current ABC danger.',
  }),
  field('priorImDoseVerification', 'Previous IM dose(s) verified as the adult IM-adrenaline route?', [
    ['unknown', 'Unknown / not verified'],
    ['confirmed-appropriate', 'Confirmed appropriate adult IM adrenaline dose(s)'],
    ['given-details-uncertain', 'Given, but product, route, dose, or timing is uncertain'],
  ], {
    threshold: 'Adult RCUK IM rescue uses 500 micrograms (0.5 mL) from a 1 mg/mL preparation in the anterolateral thigh. Do not treat a product with an unknown concentration or an IV preparation as a verified IM dose.',
  }),
  field('lastImTiming', 'Time since the last IM adrenaline dose?', [
    ['unknown', 'Unknown'],
    ['under-five-minutes', 'Under 5 minutes'],
    ['five-minutes-or-more', '5 minutes or more'],
  ], {
    threshold: 'RCUK repeats IM adrenaline after 5 minutes if airway, breathing, or circulation problems persist. This is a categorical timing check, not a dose calculator.',
  }),
  field('betaBlocker', 'Current beta-blocker exposure?', [
    ['unknown', 'Unknown / not reviewed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'Beta-blocker exposure can affect refractory-treatment review; it does not replace IM adrenaline, IV fluid, or critical-care escalation.',
  }),
  field('symptomsAfterTreatment', 'Symptoms fully resolved after treatment?', [
    ['unknown', 'Unknown / not confirmed'],
    ['all-resolved', 'Yes — all symptoms resolved'],
    ['persisting-or-recurred', 'No — persisting or recurrent symptoms'],
  ], {
    threshold: 'Observation timing starts only after resolution. A normal current ABC finding alone does not establish complete symptom resolution.',
  }),
  field('imDoseCourse', 'IM-adrenaline treatment course?', [
    ['unknown', 'Unknown / not reconciled'],
    ['single-dose', 'One IM dose'],
    ['two-doses', 'Two IM doses'],
    ['more-than-two-doses', 'More than two IM doses'],
  ], {
    threshold: 'NICE NG258 uses the number of IM doses in observation risk stratification. The special supervised-allergy-challenge exception is outside this engine.',
  }),
  field('previousBiphasic', 'Previous biphasic reaction?', [
    ['unknown', 'Unknown / not reviewed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'NICE NG258 assigns at least 6 hours of observation after resolution when there is a history of biphasic reaction.',
  }),
  field('severeRespiratoryRisk', 'Severe asthma or severe respiratory compromise in this reaction?', [
    ['unknown', 'Unknown / not reviewed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'NICE NG258 assigns at least 12 hours after resolution for severe asthma or anaphylaxis involving severe respiratory compromise.',
  }),
  field('ongoingAbsorption', 'Continuing allergen absorption possible?', [
    ['unknown', 'Unknown / not assessed'],
    ['yes', 'Yes — for example, slow-release medicine'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'NICE NG258 assigns at least 12 hours after resolution when continuing absorption is possible.',
  }),
  field('dischargeAccessRisk', 'Out-of-hours, unable to respond to deterioration, or difficult emergency access?', [
    ['unknown', 'Unknown / not assessed'],
    ['yes', 'Yes'],
    ['no', 'No — assessed'],
  ], {
    threshold: 'NICE NG258 assigns at least 12 hours after resolution for these discharge-access risks.',
  }),
  field('fastTrackReadiness', 'All 2-hour fast-track conditions confirmed?', [
    ['unknown', 'Unknown / not assessed'],
    ['all-confirmed', 'Yes — prompt single-dose response, two in-date trained injectors, and supervision'],
    ['not-all-confirmed', 'No / incomplete'],
  ], {
    threshold: 'All required: good response within 5–10 minutes to one IM dose given within 30 minutes of symptom onset; all symptoms resolved; two in-date auto-injectors with knowledge of when/how to use them; adequate adult supervision if needed. A qualified clinician may consider discharge after observation, not automatically.',
  }),
]);

const FIELD_BY_KEY = Object.freeze(Object.fromEntries(ANAPHYLAXIS_FIELDS.map(item => [item.key, item])));
const VALID_VALUES = Object.freeze(Object.fromEntries(
  ANAPHYLAXIS_FIELDS.map(item => [item.key, new Set(item.options.map(([value]) => value))]),
));

const CORE_ENTRY_FIELDS = Object.freeze([
  'phase',
  'acuteOnset',
  'skinMucosal',
  'airway',
  'breathing',
  'circulation',
  'severeGi',
  'knownOrProbableAllergen',
  'isolatedLowerRespiratoryException',
]);
const CURRENT_ABC_FIELDS = Object.freeze(['currentAirway', 'currentBreathing', 'currentCirculation']);
const AFTER_ONE_FIELDS = Object.freeze(['phase', ...CURRENT_ABC_FIELDS, 'priorImDoseVerification', 'lastImTiming']);
const AFTER_TWO_FIELDS = Object.freeze(['phase', ...CURRENT_ABC_FIELDS, 'priorImDoseVerification', 'betaBlocker']);
const RESOLVED_FIELDS = Object.freeze([
  'phase',
  ...CURRENT_ABC_FIELDS,
  'symptomsAfterTreatment',
  'imDoseCourse',
  'previousBiphasic',
  'severeRespiratoryRisk',
  'ongoingAbsorption',
  'dischargeAccessRisk',
  'fastTrackReadiness',
]);

export function normalizeAnaphylaxis(input = {}) {
  return Object.fromEntries(ANAPHYLAXIS_FIELDS.map(item => [
    item.key,
    VALID_VALUES[item.key].has(input[item.key]) ? input[item.key] : 'unknown',
  ]));
}

/**
 * The selected phase controls only which review findings are rendered. Core
 * diagnostic and ABC findings remain visible before a phase is chosen, so an
 * unknown phase cannot hide emergency assessment.
 */
export function visibleFieldKeys(input = {}) {
  const values = normalizeAnaphylaxis(input);
  if (values.phase === 'after-one-im-dose') return AFTER_ONE_FIELDS;
  if (values.phase === 'after-two-im-doses') return AFTER_TWO_FIELDS;
  if (values.phase === 'resolved-observation') return RESOLVED_FIELDS;
  return CORE_ENTRY_FIELDS;
}

function abcStateFrom(values, keys) {
  const airway = values[keys.airway] === 'laryngeal-involvement';
  const breathing = values[keys.breathing] === 'respiratory-compromise';
  const circulation = ['hypotension-or-collapse', 'cardiac-arrest'].includes(values[keys.circulation]);
  const arrest = values[keys.circulation] === 'cardiac-arrest';
  const anyUnknown = Object.values(keys).some(key => values[key] === 'unknown');
  const allAssessedAbsent = values[keys.airway] === 'not-observed'
    && values[keys.breathing] === 'not-observed'
    && values[keys.circulation] === 'not-observed';
  return Object.freeze({
    airway,
    breathing,
    circulation,
    arrest,
    any: airway || breathing || circulation,
    respiratoryOrCirculation: breathing || circulation,
    anyUnknown,
    allAssessedAbsent,
  });
}

function presentationAbcState(values) {
  return abcStateFrom(values, {
    airway: 'airway',
    breathing: 'breathing',
    circulation: 'circulation',
  });
}

function currentAbcState(values) {
  if (['unknown', 'initial'].includes(values.phase)) return presentationAbcState(values);
  return abcStateFrom(values, {
    airway: 'currentAirway',
    breathing: 'currentBreathing',
    circulation: 'currentCirculation',
  });
}

function criteriaStatus(values) {
  const abc = presentationAbcState(values);
  const systemic = abc.any || values.severeGi === 'present';
  const systemicAbsent = abc.allAssessedAbsent && values.severeGi === 'absent';
  const isolatedLowerRespiratory = abc.breathing && !abc.airway && !abc.circulation;

  const skinAndSystemic = values.acuteOnset === 'yes'
    && values.skinMucosal === 'present'
    && systemic
    ? 'present'
    : values.acuteOnset === 'no' || values.skinMucosal === 'absent' || systemicAbsent
      ? 'absent'
      : 'unknown';
  let allergenAndAbc = 'unknown';
  if (values.acuteOnset === 'yes'
    && values.knownOrProbableAllergen === 'yes'
    && (abc.airway || abc.respiratoryOrCirculation)) {
    if (isolatedLowerRespiratory) {
      allergenAndAbc = values.isolatedLowerRespiratoryException === 'yes'
        ? 'absent'
        : values.isolatedLowerRespiratoryException === 'no'
          ? 'present'
          : 'unknown';
    } else {
      allergenAndAbc = 'present';
    }
  } else if (values.acuteOnset === 'no'
    || values.knownOrProbableAllergen === 'no'
    || abc.allAssessedAbsent) {
    allergenAndAbc = 'absent';
  }

  return Object.freeze({ skinAndSystemic, allergenAndAbc, isolatedLowerRespiratory });
}

/**
 * Evaluates the two WAO 2020 clinical criteria. The result expresses whether
 * these entered criteria are met, assessed not met, or still unconfirmed; it
 * never turns an assessed-negative or unknown screen into a reassuring
 * disposition, and ABC actions are evaluated independently.
 */
export function evaluateEntry(input = {}) {
  const values = normalizeAnaphylaxis(input);
  const criteria = criteriaStatus(values);
  const status = [criteria.skinAndSystemic, criteria.allergenAndAbc].includes('present')
    ? 'met'
    : criteria.skinAndSystemic === 'absent' && criteria.allergenAndAbc === 'absent'
      ? 'not-met'
      : 'unknown';
  const presentationReview = ['unknown', 'initial'].includes(values.phase);

  const title = presentationReview
    ? status === 'met'
      ? 'Anaphylaxis criteria met'
      : status === 'not-met'
        ? 'Anaphylaxis criteria assessed not met'
        : 'Anaphylaxis criteria unconfirmed'
    : status === 'met'
      ? 'Initial anaphylaxis criteria recorded as met'
      : status === 'not-met'
        ? 'Initial criteria recorded as assessed not met'
        : 'Acute diagnostic criteria not recorded for this response review';
  const summary = presentationReview
    ? status === 'met'
      ? 'The entered acute-presentation findings meet at least one WAO clinical criterion. Continue to treat current airway, breathing or circulation threats in parallel.'
      : status === 'not-met'
        ? 'The entered acute-presentation findings do not meet either WAO criterion. This does not exclude an evolving allergic emergency or make current ABC compromise safe.'
        : 'Missing or mixed acute-presentation findings leave the criteria unconfirmed. Complete the assessment while treating any current ABC compromise immediately.'
    : status === 'met'
      ? 'The retained acute-presentation findings met a WAO criterion. Current ABC response is assessed separately and does not rewrite the diagnostic history.'
      : status === 'not-met'
        ? 'The retained acute-presentation entry was assessed not to meet WAO criteria. Current ABC response is assessed separately; this record does not make a treated emergency safe.'
        : 'This treatment-response review does not reconstruct acute diagnostic criteria from post-treatment ABC findings. Review the original presentation separately if needed.';

  return Object.freeze({
    values,
    status,
    title,
    summary,
    source: wao2020,
    criteria: Object.freeze([
      Object.freeze({
        id: 'wao-skin-systemic',
        label: 'WAO criterion 1 · skin/mucosa plus systemic involvement',
        threshold: 'Acute onset plus skin or mucosal involvement and respiratory, circulation, or severe gastrointestinal involvement.',
        status: criteria.skinAndSystemic,
      }),
      Object.freeze({
        id: 'wao-allergen-abc',
        label: 'WAO criterion 2 · probable allergen plus ABC involvement',
        threshold: 'Acute laryngeal, respiratory, or circulation involvement after a known or highly probable allergen, even without skin findings. Isolated lower-respiratory symptoms after common inhalant exposure or perceived food inhalation without ingestion are excluded.',
        status: criteria.allergenAndAbc,
      }),
    ]),
  });
}

function action(id, stage, title, summary, detail, extra = {}) {
  const { source = rcuK2021, ...rest } = extra;
  return {
    id,
    stage,
    title,
    ...(summary ? { summary } : {}),
    detail,
    sourceUrl: source.url,
    sourceLabel: source.label,
    ...rest,
  };
}

function addAbcActions(actions, values, abc) {
  if (abc.arrest) {
    actions.push(action(
      'cardiac-arrest-als',
      'rescue',
      'Cardiac arrest: start CPR and follow the adult ALS algorithm',
      'Cardiac arrest is entered; IM adrenaline absorption is unreliable after arrest.',
      'Call the resuscitation team, start high-quality CPR immediately and use the current adult advanced-life-support algorithm. This anaphylaxis guide does not supply an IV adrenaline preparation, bolus, concentration, rate, or pump setting for cardiac arrest.',
      { tone: 'urgent', resourceGroup: 'monitoring', source: rcuK2021 },
    ));
    return;
  }

  if (abc.any) {
    actions.push(action(
      'urgent-abc-compromise',
      'confirm',
      'Emergency ABC response now',
      'Airway, breathing, or circulation compromise is entered.',
      'Call emergency/resuscitation support and treat the greatest threat first using ABCDE. Remove or stop the suspected trigger if immediately feasible. Do not delay emergency ABC care to complete history, diagnostic criteria, monitoring, tryptase, antihistamine, or steroid review.',
      { tone: 'urgent', source: rcuK2025 },
    ));
    actions.push(action(
      'safe-position-during-anaphylaxis',
      'rescue',
      'Position safely: do not let the person stand or walk',
      'Lie flat, with legs raised if circulation is affected; adjust position only for breathing or pregnancy needs.',
      'RCUK advises keeping the person flat (with or without leg elevation). If breathing makes this impossible, a sitting position with legs outstretched may help; in pregnancy, position on the left side. Do not permit standing or walking, including after apparent improvement, because postural change can precipitate cardiovascular collapse.',
      { tone: 'urgent', source: rcuK2021 },
    ));
    actions.push(action(
      'high-concentration-oxygen',
      'rescue',
      'Give high-concentration oxygen and reassess',
      'Oxygen support accompanies ABC rescue and monitoring.',
      'Give high-concentration oxygen during the active reaction and reassess oxygenation, work of breathing, consciousness, perfusion, and response while emergency support is arranged.',
      { tone: 'urgent', source: rcuK2021 },
    ));
    actions.push(action(
      'monitor-abc-response',
      'reassess',
      'Attach monitoring without delaying rescue',
      'Use pulse oximetry, non-invasive blood pressure, and ECG as soon as possible.',
      'Monitoring must be supervised by someone able to recognise and respond to deterioration. Record the clinical response and actual adrenaline administration time, product, dose, route, site, and sequence; this engine does not write a medication-administration record.',
      { resourceGroup: 'monitoring', source: rcuK2021 },
    ));
    if (abc.circulation) {
      actions.push(action(
        'circulation-crystalloid-review',
        'rescue',
        'Circulation compromise: rapid adult IV crystalloid bolus and reassessment',
        'Fluid is adjunctive to adrenaline, not a substitute for it.',
        'RCUK adult anaphylaxis guidance: give a rapid 500–1000 mL glucose-free crystalloid bolus, then reassess perfusion, blood pressure, lungs, oxygenation, and further fluid need; further boluses may be needed and must be titrated to response. If known cardiac failure or trauma raises volume-risk concerns, use a smaller 250 mL bolus with closer reassessment and senior support. Use the local emergency/resuscitation fluid protocol and the linked identities only after checking their actual suitability.',
        { tone: 'urgent', resourceGroup: 'isotonic-fluid', source: rcuK2021 },
      ));
    }
    if (abc.breathing) {
      actions.push(action(
        'bronchodilator-adjunct-only',
        'rescue',
        'Bronchodilator only as an adjunct for bronchospasm',
        'Inhaled beta-2 agonist does not replace repeat IM adrenaline for ongoing anaphylaxis.',
        'For bronchospasm, a bronchodilator can be considered after immediate anaphylaxis rescue begins. It must not delay or replace IM adrenaline when airway, breathing, or circulation symptoms continue. The linked local identities are references, not a selected regimen.',
        { resourceGroup: 'bronchodilator', source: wao2020 },
      ));
    }
    actions.push(action(
      'do-not-substitute-adjuncts-for-abc',
      'rescue',
      'Do not use antihistamine or steroid instead of ABC rescue',
      'They do not treat the life-threatening airway, breathing, or circulation features.',
      'RCUK places antihistamines after initial stabilisation for residual skin symptoms and no longer advises corticosteroids for routine emergency treatment. Do not let either delay IM adrenaline, ABC support, monitoring, or expert escalation.',
      { source: rcuK2021 },
    ));
  } else if (abc.anyUnknown) {
    actions.push(action(
      'assess-abc-now',
      'confirm',
      'Assess airway, breathing, and circulation now',
      'At least one ABC finding is unknown.',
      'Check for laryngeal symptoms, bronchospasm/respiratory compromise, hypotension or collapse, consciousness, and trajectory. Unknown is not a negative finding; activate emergency support for clinical concern.',
      { tone: 'attention', source: rcuK2025 },
    ));
  }
}

function addInitialRescue(actions, values, abc, entry) {
  if (abc.arrest) return;
  if (abc.any) {
    actions.push(action(
      entry.status === 'met' ? 'initial-im-adrenaline' : 'initial-im-adrenaline-if-suspected',
      'rescue',
      entry.status === 'met'
        ? 'Initial adult IM adrenaline now'
        : 'ABC compromise: assess for anaphylaxis while treating the emergency',
      entry.status === 'met'
        ? 'WAO criteria are met. 500 micrograms IM = 0.5 mL from a 1 mg/mL (1:1000) preparation in the anterolateral thigh.'
        : 'ABC compromise is an emergency, but these entered criteria are not yet established as anaphylaxis.',
      entry.status === 'met'
        ? 'Treat suspected adult anaphylaxis with IM adrenaline now. The stated volume applies only to a confirmed 1 mg/mL preparation; do not calculate a volume from a different or unknown product. IV adrenaline belongs only to experienced specialists in an appropriate setting.'
        : 'Treat ABC compromise immediately and assess for anaphylaxis and other causes in parallel. If clinical assessment suspects anaphylaxis, give adult IM adrenaline: 500 micrograms = 0.5 mL from a confirmed 1 mg/mL (1:1000) preparation in the anterolateral thigh. The incomplete or assessed-not-met entry must not itself diagnose anaphylaxis or generate IV-adrenaline treatment.',
      { tone: 'urgent', resourceGroup: 'epinephrine-im', source: rcuK2025 },
    ));
  } else if (entry.status === 'met') {
    actions.push(action(
      'wao-criteria-met-severe-gi-im-adrenaline',
      'rescue',
      'WAO criteria met without current ABC findings: urgent adult IM-adrenaline treatment review',
      'The entered acute skin/mucosal plus severe gastrointestinal findings meet WAO criterion 1. Adult IM adrenaline: 500 micrograms = 0.5 mL from a confirmed 1 mg/mL (1:1000) preparation.',
      'Treat this as suspected anaphylaxis and give adult IM adrenaline as first-line treatment: 500 micrograms = 0.5 mL from a confirmed 1 mg/mL (1:1000) preparation in the anterolateral thigh. Call for urgent clinical support, continue ABCDE reassessment, and do not turn a currently normal ABC screen into reassurance or a discharge decision.',
      { tone: 'urgent', resourceGroup: 'epinephrine-im', source: rcuK2021 },
    ));
  } else if (values.phase === 'initial' && values.knownOrProbableAllergen === 'yes' && values.skinMucosal === 'present') {
    actions.push(action(
      'systemic-reaction-no-abc',
      'rescue',
      'No current ABC compromise entered: active reassessment and emergency readiness',
      'Skin/mucosal findings plus allergen exposure are entered, but an ABC indication for IM adrenaline is not entered.',
      'Continue ABCDE reassessment, monitor trajectory, and keep emergency treatment immediately available. RCUK directs immediate IM adrenaline for airway, breathing, or circulation problems; skin symptoms alone do not substitute for active ABC assessment or a discharge decision.',
      { tone: 'attention', source: rcuK2021 },
    ));
  }
}

function addAfterOneActions(actions, values, abc) {
  if (abc.arrest) return;
  if (!abc.any) {
    if (abc.anyUnknown) {
      actions.push(action(
        'after-one-current-abc-unconfirmed',
        'reassess',
        'Assess current ABC response before choosing recovery',
        'No current ABC compromise is entered, but at least one current ABC finding is unknown.',
        'Do not infer a complete response or move to observation from an incomplete current ABC screen. Reassess current airway, breathing, circulation, observations, and trajectory while continuing emergency support as clinically indicated.',
        { tone: 'attention', source: rcuK2021 },
      ));
      return;
    }
    actions.push(action(
      'after-one-confirm-resolution',
      'reassess',
      'Reassess complete response before switching to observation',
      'No current ABC compromise is entered after one IM dose.',
      'Check all symptoms, observations, trigger control, and trajectory. Do not infer complete resolution or an observation duration from the absence of one ABC feature; select the resolved-observation state only after full symptom resolution is confirmed.',
      { source: rcuK2021 },
    ));
    return;
  }
  if (values.lastImTiming === 'five-minutes-or-more') {
    actions.push(action(
      'repeat-im-adrenaline-after-five-minutes',
      'rescue',
      'Persistent ABC compromise at 5 minutes: repeat adult IM adrenaline',
      '500 micrograms IM = 0.5 mL from a confirmed 1 mg/mL (1:1000) preparation in the anterolateral thigh.',
      'RCUK advises repeating IM adrenaline after 5 minutes when airway, breathing, or circulation problems persist. Verify the actual first dose in parallel, but do not replace emergency assessment with a documentation check. Do not infer a volume from an unknown product, and do not give an IV adrenaline bolus.',
      { tone: 'urgent', resourceGroup: 'epinephrine-im', source: rcuK2025 },
    ));
  } else if (values.lastImTiming === 'under-five-minutes') {
    actions.push(action(
      'continue-abc-before-timed-repeat',
      'reassess',
      'Continue ABC support; prepare the 5-minute repeat decision',
      'The entered last IM dose was under 5 minutes ago and ABC compromise persists.',
      'Continue continuous reassessment and emergency support. RCUK repeats IM adrenaline after 5 minutes if there is no improvement; this engine does not create an earlier automatic redose, an IV bolus, or an IV preparation.',
      { tone: 'urgent', source: rcuK2025 },
    ));
  } else {
    actions.push(action(
      'confirm-last-im-dose-time',
      'reassess',
      'Confirm the last IM-adrenaline time immediately',
      'ABC compromise persists, but the repeat-dose timing is unknown.',
      'Check the actual administration time while emergency support and ABC treatment continue. The 5-minute repeat rule depends on the real prior-dose time; an unknown time must not be treated as either too early or safe to wait.',
      { tone: 'urgent', source: rcuK2025 },
    ));
  }
  if (values.priorImDoseVerification !== 'confirmed-appropriate') {
    actions.push(action(
      'verify-prior-im-product-route-dose',
      'reassess',
      'Verify previous IM product, route, dose, and site',
      'The previous IM dose is not fully verified.',
      'Reconcile the administration record and the actual product. A 1 mg/mL IM preparation and an IV preparation are not interchangeable by volume. This check must run in parallel with emergency care and must not delay a clinically indicated response.',
      { tone: 'attention', resourceGroup: 'epinephrine-im', source: rcuK2021 },
    ));
  }
}

function addAfterTwoActions(actions, values, abc) {
  if (abc.arrest) return;
  if (abc.airway) {
    actions.push(action(
      'persistent-airway-emergency',
      'rescue',
      'Persistent airway involvement: urgent airway-capable expert support',
      'Laryngeal/airway involvement remains entered after two IM doses.',
      'Escalate urgently for airway management and critical-care support. The engine does not provide a nebulised-adrenaline regimen, an airway procedure, or an IV-adrenaline bolus/preparation.',
      { tone: 'urgent', source: rcuK2021 },
    ));
  }
  if (abc.respiratoryOrCirculation) {
    const verified = values.priorImDoseVerification === 'confirmed-appropriate';
    actions.push(action(
      verified ? 'refractory-anaphylaxis' : 'possible-refractory-anaphylaxis',
      'rescue',
      verified ? 'Refractory anaphylaxis: critical-care treatment now' : 'Persistent respiratory/circulation compromise: possible refractory anaphylaxis',
      verified
        ? 'Persistent respiratory or circulation symptoms despite two appropriate IM adrenaline doses meet the RCUK refractory definition.'
        : 'Two doses are entered but the prior IM product/route/dose is not verified; persistent respiratory or circulation compromise remains an emergency.',
      verified
        ? 'Seek critical-care support immediately. RCUK uses a monitored IV adrenaline infusion, fluid therapy, and expert airway/circulatory support for refractory anaphylaxis. IV adrenaline belongs only in an appropriate specialist setting by experienced clinicians. This engine intentionally provides no IV bolus, dilution, concentration, rate, pump, or vasopressor regimen.'
        : 'Seek critical-care support immediately while verifying the actual administrations. Do not infer that an unverified product was an appropriate IM dose, and do not improvise an IV adrenaline bolus, dilution, concentration, rate, or pump setting from this engine.',
      { tone: 'urgent', source: rcuK2021 },
    ));
    actions.push(action(
      'continue-im-adrenaline-every-five-minutes-while-escalating',
      'rescue',
      'While expert infusion support is arranged, continue adult IM adrenaline every 5 minutes',
      'Use the 5-minute IM interval for ongoing airway, breathing, or circulation symptoms until an expert-led infusion is established or symptoms resolve.',
      'RCUK’s refractory algorithm continues IM adrenaline every 5 minutes while critical-care support and a monitored infusion are being established. Adult IM reference: 500 micrograms = 0.5 mL only from a confirmed 1 mg/mL (1:1000) preparation in the anterolateral thigh. Reconcile any product ambiguity in parallel; do not calculate a volume from an unknown preparation or use an IV bolus.',
      { tone: 'urgent', resourceGroup: 'epinephrine-im', source: rcuK2021 },
    ));
    if (values.betaBlocker === 'yes') {
      actions.push(action(
        'beta-blocker-refractory-review',
        'rescue',
        'Beta-blocker exposure: critical-care glucagon review only',
        'Beta-blocker exposure is entered in ongoing refractory physiology.',
        'RCUK lists glucagon as a specialist adjunct for refractory anaphylaxis with beta-blocker exposure, with very limited evidence. It is not first line and does not replace IM adrenaline, fluid, monitoring, or an expert-led adrenaline infusion. No glucagon dose or infusion plan is generated here.',
        { tone: 'urgent', resourceGroup: 'glucagon', source: rcuK2021 },
      ));
    } else if (values.betaBlocker === 'unknown') {
      actions.push(action(
        'confirm-beta-blocker-exposure',
        'reassess',
        'Confirm beta-blocker exposure during refractory review',
        'The refractory adjunct context is incomplete.',
        'Reconcile the medication history while critical-care management proceeds. Unknown exposure neither activates nor rules out the specialist glucagon discussion.',
        { tone: 'attention', source: rcuK2021 },
      ));
    }
  } else if (abc.any || abc.anyUnknown) {
    actions.push(action(
      abc.any ? 'after-two-persistent-airway-review' : 'after-two-current-abc-unconfirmed',
      'reassess',
      abc.any
        ? 'Persistent airway findings: do not infer recovery after two IM doses'
        : 'Assess current ABC response before choosing recovery',
      abc.any
        ? 'Current airway involvement remains entered after two IM doses.'
        : 'No current respiratory or circulation compromise is entered, but at least one current ABC finding is unknown.',
      abc.any
        ? 'Continue urgent airway-capable expert support and current ABC reassessment. Do not move to observation until complete symptom resolution and an explicitly assessed current ABC screen are established.'
        : 'Do not infer complete resolution or move to observation from an incomplete current ABC screen. Reassess current airway, breathing, circulation, observations, and trajectory while emergency support continues as clinically indicated.',
      { tone: 'attention', source: rcuK2021 },
    ));
  } else {
    actions.push(action(
      'after-two-confirm-resolution',
      'reassess',
      'Do not infer resolution after two doses',
      'No current respiratory or circulation compromise is entered after two doses.',
      'Confirm complete symptom resolution, response trajectory, and appropriate observation category before changing to the resolved-observation review. The supervised-allergy-challenge exception is outside this engine.',
      { source: niceObservation2026 },
    ));
  }
}

function observationHasUnknown(values) {
  return ['imDoseCourse', 'previousBiphasic', 'severeRespiratoryRisk', 'ongoingAbsorption', 'dischargeAccessRisk', 'fastTrackReadiness']
    .some(key => values[key] === 'unknown');
}

function addTryptaseAction(actions, stage) {
  actions.push(action(
    'tryptase-timing-after-emergency-treatment-starts',
    stage,
    'Review timed mast-cell tryptase sampling after emergency treatment starts',
    'Take one sample as soon as possible; a second is ideally at 1–2 hours and no later than 4 hours from symptom onset.',
    'For adults with suspected anaphylaxis, NICE NG258 recommends those two timed samples and explains that a baseline sample may be needed at specialist follow-up. Sampling supports later assessment and must never delay emergency treatment.',
    { resourceGroup: 'tryptase', source: niceTryptase2026 },
  ));
}

function hasUnknownTwelveHourRisk(values) {
  return ['severeRespiratoryRisk', 'ongoingAbsorption', 'dischargeAccessRisk']
    .some(key => values[key] === 'unknown');
}

function addResolvedActions(actions, values, abc) {
  if (values.symptomsAfterTreatment === 'persisting-or-recurred' || abc.any) {
    actions.push(action(
      'resolved-phase-recurrence',
      'rescue',
      'Persistent or recurrent symptoms: return to active emergency assessment',
      abc.any
        ? 'Current airway, breathing, or circulation compromise is entered; observation is not appropriate.'
        : 'Observation is not appropriate while symptoms persist or recur.',
      'Reassess ABCDE and select the current treatment state to distinguish initial rescue, a timed repeat after one IM dose, or possible refractory disease. Do not use a prior resolved state to suppress urgent action.',
      { tone: 'urgent', source: rcuK2021 },
    ));
    return;
  }
  if (abc.anyUnknown) {
    actions.push(action(
      'current-abc-unconfirmed-before-observation',
      'observe',
      'Current ABC must be assessed before choosing an observation period',
      'Symptoms are recorded as resolved, but at least one current ABC finding is unknown.',
      'Do not select a 2-hour, 6-hour, or 12-hour observation category from an unconfirmed current ABC screen. Reassess current airway, breathing, and circulation, then reconcile the symptom-resolution history and NICE risk features with an appropriately qualified clinician.',
      { tone: 'attention', source: niceObservation2026 },
    ));
    addTryptaseAction(actions, 'observe');
    return;
  }
  if (values.symptomsAfterTreatment !== 'all-resolved') {
    actions.push(action(
      'confirm-complete-symptom-resolution',
      'observe',
      'Confirm complete symptom resolution before observation timing',
      'Resolution has not been confirmed.',
      'NICE observation periods start after resolution of the specified symptoms. Do not start a discharge or observation clock from an unknown or partial response; continue monitoring and reassess for recurrence.',
      { tone: 'attention', source: niceObservation2026 },
    ));
    return;
  }

  const requiresTwelve = values.imDoseCourse === 'more-than-two-doses'
    || values.severeRespiratoryRisk === 'yes'
    || values.ongoingAbsorption === 'yes'
    || values.dischargeAccessRisk === 'yes';
  const requiresSix = values.imDoseCourse === 'two-doses' || values.previousBiphasic === 'yes';
  const unknownTwelveHourRisk = hasUnknownTwelveHourRisk(values);
  const fastTrack = values.imDoseCourse === 'single-dose'
    && values.fastTrackReadiness === 'all-confirmed'
    && values.previousBiphasic === 'no'
    && values.severeRespiratoryRisk === 'no'
    && values.ongoingAbsorption === 'no'
    && values.dischargeAccessRisk === 'no';

  if (requiresTwelve) {
    actions.push(action(
      'observe-at-least-twelve-hours',
      'observe',
      'Observe for at least 12 hours after resolution',
      'A NICE NG258 12-hour risk feature is entered.',
      'NICE NG258 uses at least 12 hours after resolution for more than two adrenaline doses, severe asthma/severe respiratory compromise, possible ongoing allergen absorption, or the listed discharge-access risks. This remains a qualified clinician decision with continued monitoring and recurrence instructions.',
      { tone: 'urgent', source: niceObservation2026 },
    ));
  } else if (requiresSix && unknownTwelveHourRisk) {
    actions.push(action(
      'observe-six-hours-minimum-resolve-twelve-hour-risks',
      'observe',
      'At least 6 hours after resolution; resolve possible 12-hour risks before finalising the plan',
      'A 6-hour criterion is entered, but one or more 12-hour risk fields are unknown.',
      'NICE NG258 gives a minimum 6-hour period after resolution for two IM doses or previous biphasic reaction. Severe asthma/severe respiratory compromise, continuing absorption, or discharge-access risks would require at least 12 hours, so an unknown in those fields must not be silently treated as a universal 6-hour plan.',
      { tone: 'attention', source: niceObservation2026 },
    ));
  } else if (requiresSix) {
    actions.push(action(
      'observe-minimum-six-hours',
      'observe',
      'Observe for a minimum of 6 hours after resolution',
      'Two IM doses or a previous biphasic reaction is entered.',
      'NICE NG258 recommends a minimum 6-hour observation period after all symptoms resolve for these features. The special supervised-allergy-challenge exception is outside this general adult engine; do not shorten this branch from the categorical findings here.',
      { source: niceObservation2026 },
    ));
  } else if (fastTrack) {
    actions.push(action(
      'consider-two-hour-observation',
      'observe',
      'Qualified clinician may consider 2 hours after resolution',
      'All entered NICE NG258 fast-track conditions are confirmed.',
      'NICE NG258 permits consideration, not automatic discharge, after 2 hours from resolution when there was a prompt response to one IM dose within 30 minutes of onset, symptoms fully resolved, two in-date trained auto-injectors are available, and appropriate supervision is in place.',
      { source: niceObservation2026 },
    ));
  } else if (observationHasUnknown(values)) {
    actions.push(action(
      'observation-category-unconfirmed',
      'observe',
      'Observation category remains unconfirmed',
      'One or more observation-risk findings are unknown.',
      'Unknowns must not select a shorter observation period. Reconcile the IM-dose course, biphasic history, respiratory severity, continued absorption, discharge-access risk, and all fast-track conditions with an appropriately qualified clinician.',
      { tone: 'attention', source: niceObservation2026 },
    ));
  } else {
    actions.push(action(
      'senior-observation-plan-required',
      'observe',
      'Set a qualified clinician observation and discharge plan',
      'Complete resolution is entered, but the 2-hour fast-track criteria are not all confirmed.',
      'NICE NG258 does not make an incomplete fast-track screen an automatic discharge. Confirm an appropriate observation plan, recurrence instructions, specialist allergy follow-up, trigger documentation, and injector/training needs.',
      { source: niceObservation2026 },
    ));
  }

  addTryptaseAction(actions, 'observe');
  actions.push(action(
    'allergy-followup-and-discharge-safety',
    'observe',
    'Arrange specialist allergy follow-up and recurrence safety review',
    'Document the trigger circumstances and ensure recurrence instructions are understood.',
    'NICE NG258 directs specialist allergy referral after emergency treatment. Confirm the actual follow-up route, trigger avoidance, action plan, injector provision/replacement where appropriate, and device-specific training; this engine does not prescribe, issue, or train on an injector.',
    { source: niceObservation2026 },
  ));
}

function phaseStageIds(values, abc) {
  if (values.phase === 'resolved-observation') {
    return values.symptomsAfterTreatment === 'persisting-or-recurred' || abc.any
      ? Object.freeze(['confirm', 'rescue', 'reassess'])
      : Object.freeze(['confirm', 'observe']);
  }
  return Object.freeze(['confirm', 'rescue', 'reassess']);
}

function stageNotes(values) {
  return Object.freeze({
    confirm: values.phase === 'unknown'
      ? 'Assess ABC and the visible entry criteria while choosing the current review state.'
      : 'Criteria support assessment; they do not delay emergency ABC treatment.',
    rescue: 'Immediate rescue depends on the current review state and ABC findings. This engine contains no IV bolus or product-preparation instruction.',
    reassess: 'Record actual administration times and clinical response; a hidden or unknown treatment history does not establish recovery.',
    observe: 'Only enter this stage after complete symptom resolution; the supervised allergy-challenge exception is outside this engine.',
  });
}

/**
 * Produces compact, source-linked actions. It deliberately separates initial
 * rescue, one-dose repeat timing, refractory escalation, and post-resolution
 * observation, so a historical answer cannot silently create a duplicate dose
 * or falsely establish recovery.
 */
export function evaluate(input = {}) {
  const values = normalizeAnaphylaxis(input);
  const entry = evaluateEntry(values);
  const abc = currentAbcState(values);
  const actions = [];

  addAbcActions(actions, values, abc);

  if (values.phase === 'unknown') {
    actions.push(action(
      'select-review-state',
      'confirm',
      'Select the current review state',
      'Initial rescue, a timed repeat, refractory treatment, and observation use different findings.',
      'The diagnostic and ABC assessment remains active before a phase is selected. If ABC compromise is present, treat it immediately while reconciling whether an IM dose has already been administered; do not generate a duplicate dose merely from an unknown state.',
      { tone: 'attention', source: rcuK2021 },
    ));
    if (abc.any && !abc.arrest) {
      actions.push(action(
        'unknown-state-im-dose-history',
        'rescue',
        'Treat ABC compromise while reconciling IM-adrenaline history',
        'The review state is unknown; do not generate a duplicate dose from that uncertainty alone.',
        'Treat ABC compromise immediately. If clinical assessment suspects active anaphylaxis and confirms no prior IM dose, adult IM adrenaline is 500 micrograms = 0.5 mL from a confirmed 1 mg/mL (1:1000) preparation in the anterolateral thigh. Confirm actual prior-dose time and preparation in parallel, then choose the correct after-dose state. The unknown state does not itself diagnose anaphylaxis or support an IV-adrenaline bolus.',
        { tone: 'urgent', resourceGroup: 'epinephrine-im', source: rcuK2025 },
      ));
    }
  } else if (values.phase === 'initial') {
    addInitialRescue(actions, values, abc, entry);
  } else if (values.phase === 'after-one-im-dose') {
    addAfterOneActions(actions, values, abc);
  } else if (values.phase === 'after-two-im-doses') {
    addAfterTwoActions(actions, values, abc);
  } else if (values.phase === 'resolved-observation') {
    addResolvedActions(actions, values, abc);
  }

  const activeTreatmentReview = values.phase === 'after-one-im-dose'
    || values.phase === 'after-two-im-doses'
    || (values.phase === 'initial' && (entry.status === 'met' || abc.any));
  if (activeTreatmentReview && !abc.arrest) addTryptaseAction(actions, 'reassess');

  const presentationReview = ['unknown', 'initial'].includes(values.phase);
  if (presentationReview && entry.status === 'unknown') {
    actions.push(action(
      'complete-entry-criteria',
      'confirm',
      'Complete the acute presentation and trigger assessment',
      'The WAO criteria are unconfirmed from the entered findings.',
      'Clarify onset, skin/mucosal findings, allergen circumstances, and all ABC findings. Do not wait for a completed entry to treat current ABC compromise.',
      { tone: 'attention', source: wao2020 },
    ));
  } else if (presentationReview && entry.status === 'not-met' && !abc.any) {
    actions.push(action(
      'criteria-not-met-reassess-differential',
      'confirm',
      'Criteria assessed not met: reassess evolving allergy and alternatives',
      'The entered WAO criteria are assessed not met without current ABC compromise.',
      'This result does not establish benign allergy, a final diagnosis, or discharge readiness. Continue clinical reassessment if the course evolves and address other causes of the entered symptoms.',
      { source: wao2020 },
    ));
  }

  const stageRank = Object.freeze(Object.fromEntries(STAGE_IDS.map((id, index) => [id, index])));
  const rescuePriority = id => /^(initial-im-adrenaline|wao-criteria-met-severe-gi-im-adrenaline|repeat-im-adrenaline|unknown-state-im-dose-history|refractory-anaphylaxis|possible-refractory-anaphylaxis)/.test(id) ? 0 : id.startsWith('continue-im-adrenaline') ? 1 : 2;
  actions.sort((left, right) => stageRank[left.stage] - stageRank[right.stage] || (left.stage === 'rescue' ? rescuePriority(left.id) - rescuePriority(right.id) : 0));
  const visibleKeys = new Set(visibleFieldKeys(values));
  const gaps = ANAPHYLAXIS_FIELDS
    .filter(item => visibleKeys.has(item.key) && values[item.key] === 'unknown')
    .map(item => item.label);

  return Object.freeze({
    values,
    entry,
    actions: Object.freeze(actions),
    visibleStageIds: phaseStageIds(values, abc),
    stageNotes: stageNotes(values),
    withheld: Object.freeze([]),
    gaps: Object.freeze(gaps),
  });
}

export const sourceMetadata = Object.freeze({
  reviewedAt: '2026-09-17',
  reviewState: 'source-reviewed-adult-emergency-guidance',
  guideVersion: 'RCUK special causes 2025; RCUK emergency treatment 2021 (dedicated current provider guideline); RCUK ABCDE approach updated 2024 for smaller volume-risk reassessment; NICE NG258 2026 observation/tryptase; WAO Guidance 2020 criteria.',
  sourceReview: 'Adult anaphylaxis presentation-criteria, current-ABC rescue, timed IM repeat, refractory escalation, and post-resolution observation aid. Acute diagnostic history and post-treatment ABC response are deliberately separate. It is not a diagnosis, local prescription, IV-adrenaline protocol, product-preparation instruction, order set, medication-administration record, or authorization.',
  localResourceStatus: 'NTUH’s public formulary lists ADR1DG02, a 1 mg/mL adrenaline ampoule. Catalog identity, current availability, orderability, and regimen alignment remain separate.',
});

const NTUH_PUBLIC_PRODUCT_SOURCES = Object.freeze([
  {
    "label": "NTUH product identity: Adrenalin Injection 1 mg epinephrine/1 mL/amp (ADR1DG02; access checked 2026-11-07)",
    "url": "https://reg.ntuh.gov.tw/pharmacyoutside/QueryDrugDetail.aspx?Drug_Code=ADR1DG02",
    "accessedAt": "2026-11-07",
    "scope": "Product identity and label strength only; not clinical dosing authority or current availability."
  }
]);

export const config = Object.freeze({
  id: 'anaphylaxis',
  title: 'Anaphylaxis',
  reviewedAt: '2026-09-17',
  scope: 'Adult suspected anaphylaxis in a healthcare setting: visible WAO acute-presentation criteria, immediate current-ABC rescue, IM-repeat timing, refractory escalation, and post-resolution observation review.',
  reviewLabel: 'Upgraded · adult emergency review',
  reviewLimitations: Object.freeze([
    "NTUH public product pages were checked anonymously on 2026-11-07 for identity and label strength only. The catalog snapshot is dated 2026-08-28; these checks do not establish current stock, absence of an alternative, substitution, preparation, orderability or patient suitability.",
    'No paediatric, peri-operative, obstetric, cardiac-arrest, local emergency-cart, IV-adrenaline, infusion, airway-procedure, product-preparation, or pump protocol is encoded.',
    'The supervised allergy-challenge exception to the usual observation categories is outside this engine.',
    'The guide cannot establish diagnosis, resolve product concentration ambiguity, prove administration, prescribe an injector, select an order, or authorize treatment.',
  ]),
  sources: Object.freeze([rcuK2025, rcuK2021, rcuKAbcde, wao2020, niceObservation2026, niceTryptase2026, ...NTUH_PUBLIC_PRODUCT_SOURCES]),
  sourceMetadata,
  entry: Object.freeze({
    title: 'Does this meet adult anaphylaxis criteria?',
    scope: 'WAO acute-presentation criteria can be met, assessed not met, or unconfirmed. Current airway, breathing, or circulation compromise remains an emergency regardless of criteria completion and is entered separately after treatment starts.',
    source: wao2020,
    fields: Object.freeze(CORE_ENTRY_FIELDS.filter(key => key !== 'phase').map(key => FIELD_BY_KEY[key])),
  }),
  fields: ANAPHYLAXIS_FIELDS,
  stages: Object.freeze([
    Object.freeze({ id: 'confirm', title: 'Entry & ABC', empty: 'Complete the visible entry and ABC assessment.' }),
    Object.freeze({ id: 'rescue', title: 'Immediate rescue', empty: 'No current rescue branch is established from the entered findings.' }),
    Object.freeze({ id: 'reassess', title: 'Timed reassessment', empty: 'Record response and actual administration times.' }),
    Object.freeze({ id: 'observe', title: 'Observation & follow-up', empty: 'Observation begins only after complete symptom resolution.' }),
  ]),
  visibleFieldKeys,
  evaluate,
  quickReference: Object.freeze({
    summary: 'Treat airway, breathing, or circulation compromise immediately; separate initial IM rescue, a 5-minute repeat, refractory specialist escalation, and post-resolution observation.',
    recognition: Object.freeze([
      'WAO criteria are met by acute skin/mucosal plus systemic involvement, or acute laryngeal/respiratory/circulation involvement after a known or probable allergen; skin may be absent.',
      'When clinical assessment suspects adult anaphylaxis, RCUK uses IM adrenaline 500 micrograms from confirmed 1 mg/mL in the anterolateral thigh, with a 5-minute repeat for persistent ABC problems.',
    ]),
    redFlags: Object.freeze([
      'Airway/laryngeal involvement, respiratory compromise, hypotension/collapse, altered consciousness, or cardiac arrest.',
      'Persistent respiratory or circulation symptoms after two appropriate IM doses: refractory anaphylaxis needs immediate critical-care support.',
      'Any proposed IV adrenaline bolus, product concentration ambiguity, unverified prior dose, persistent/recurrent symptoms, or high-risk observation feature.',
    ]),
    steps: Object.freeze([
      Object.freeze({ role: 'Entry and emergency response', text: 'Assess acute onset, skin/mucosal features, trigger, and ABC. Do not wait for a completed diagnostic entry to call for help and treat ABC compromise.' }),
      Object.freeze({ role: 'Initial and repeat IM adrenaline', text: 'Initial adult IM dose is 500 micrograms (0.5 mL from 1 mg/mL) in the anterolateral thigh. If one dose has been given and ABC features persist, repeat after 5 minutes; reconcile actual timing and product.' }),
      Object.freeze({ role: 'Refractory and recovery', text: 'Persistent respiratory/circulation symptoms after two appropriate IM doses need critical-care, monitored infusion-level care under local protocol. After complete resolution, NICE NG258 observation risk categories guide clinician review.' }),
    ]),
    monitoring: Object.freeze([
      'Pulse oximetry, non-invasive BP, ECG, ABC trajectory, and exact adrenaline administrations should be monitored/recorded as soon as possible without delaying rescue.',
      'For suspected adult anaphylaxis, NICE NG258: sample tryptase as soon as possible after emergency treatment starts and again ideally at 1–2 hours, no later than 4 hours from onset; specialist follow-up may need baseline tryptase.',
    ]),
    sources: Object.freeze([rcuK2025, rcuK2021, rcuKAbcde, wao2020, niceObservation2026, niceTryptase2026, ...NTUH_PUBLIC_PRODUCT_SOURCES]),
  }),
});

export default config;
