// Pure presentation-time diagnostic assessment for adult DKA/HHS.
// This module deliberately does not create orders, calculate doses, or select
// a treatment protocol. It keeps Fig. 2 diagnostic status separate from the
// insulin-treatment pattern described in the 2024 consensus report.

export const DKA_HHS_DIAGNOSIS_SOURCE = 'https://link.springer.com/article/10.1007/s00125-024-06183-8';

export const diagnosisSource = {
  label: 'ADA/EASD/JBDS/AACE/DTS adult hyperglycaemic-crises consensus (2024)',
  url: DKA_HHS_DIAGNOSIS_SOURCE,
};

export const diagnosticFields = [
  {
    key: 'presentationGlucose',
    label: 'Presentation glucose?',
    options: [
      ['unknown', 'Not assessed'],
      ['below200', 'Below 200 mg/dL'],
      ['from200to599', '200 to below 600 mg/dL'],
      ['atLeast600', 'At least 600 mg/dL'],
    ],
    help: 'DKA accepts glucose at least 200 mg/dL (about 11.1 mmol/L) or a prior history of diabetes. HHS requires glucose at least 600 mg/dL (about 33.3 mmol/L). These are presentation findings, not a treatment-phase glucose target.',
  },
  {
    key: 'diabetesHistory',
    label: 'Prior diabetes history?',
    options: [
      ['unknown', 'Not established'],
      ['yes', 'Yes'],
      ['no', 'No known history'],
    ],
    help: 'A prior diabetes history can satisfy the first DKA diagnostic component at any presentation glucose. No known history does not turn a glucose below 200 mg/dL with ketoacidosis into reassurance; review the clinical differential.',
  },
  {
    key: 'presentationKetones',
    label: 'Presentation ketones?',
    options: [
      ['unknown', 'Not assessed'],
      ['belowThreshold', 'BOHB <3 mmol/L / urine <2+'],
      ['atOrAboveThreshold', 'BOHB ≥3 mmol/L / urine ≥2+'],
    ],
    help: 'Prefer quantitative beta-hydroxybutyrate (BOHB): below 3.0 vs at least 3.0 mmol/L. If BOHB is unavailable, urine ketones below 2+ vs at least 2+ are the Figure 2 alternative. Urine nitroprusside reflects acetoacetate, can understate early ketonaemia and overstate it during recovery; record the method and use clinician review.',
  },
  {
    key: 'presentationPh',
    label: 'Presentation pH?',
    options: [
      ['unknown', 'Not assessed'],
      ['below7_3', 'Below 7.30'],
      ['atLeast7_3', 'At least 7.30'],
    ],
    help: 'DKA acidosis uses pH below 7.30; the HHS absence-of-acidosis component requires pH at least 7.30 and bicarbonate at least 15 mmol/L.',
  },
  {
    key: 'presentationBicarbonate',
    label: 'Presentation bicarbonate?',
    options: [
      ['unknown', 'Not assessed'],
      ['below15', 'Below 15 mmol/L'],
      ['from15toBelow18', '15 to below 18 mmol/L'],
      ['atLeast18', 'At least 18 mmol/L'],
    ],
    help: 'DKA acidosis uses bicarbonate below 18 mmol/L. HHS diagnosis accepts bicarbonate at least 15 mmol/L, but the isolated-HHS insulin branch requires bicarbonate at least 18 mmol/L; 15 to below 18 can therefore meet HHS diagnosis while routing to the mixed treatment pattern.',
  },
  {
    key: 'presentationOsmolality',
    label: 'Presentation osmolality?',
    options: [
      ['unknown', 'Not assessed'],
      ['high', 'Effective >300 / total >320'],
      ['notHigh', 'Neither threshold met'],
    ],
    help: 'HHS hyperosmolality is calculated effective serum osmolality above 300 mOsm/kg or total serum osmolality above 320 mOsm/kg. The consensus uses strict greater-than thresholds. This module accepts only a reviewed categorical finding; it does not calculate osmolality.',
  },
];

const STATES = new Set(['present', 'absent', 'unknown']);
const validValues = Object.fromEntries(diagnosticFields.map(field => [
  field.key,
  new Set(field.options.map(([value]) => value)),
]));

function normalized(input = {}) {
  return Object.fromEntries(diagnosticFields.map(field => [
    field.key,
    validValues[field.key].has(input[field.key]) ? input[field.key] : 'unknown',
  ]));
}

function triOr(...states) {
  if (states.some(state => state === 'present')) return 'present';
  if (states.every(state => state === 'absent')) return 'absent';
  return 'unknown';
}

function triAnd(...states) {
  if (states.some(state => state === 'absent')) return 'absent';
  if (states.every(state => state === 'present')) return 'present';
  return 'unknown';
}

function criterion(id, label, threshold, status, reason) {
  if (!STATES.has(status)) throw new Error(`Invalid diagnostic state for ${id}`);
  return {id, label, threshold, status, reason};
}

function diabetesHistoryState(value) {
  if (value === 'yes') return 'present';
  if (value === 'no') return 'absent';
  return 'unknown';
}

function dkaGlucoseState(value) {
  if (value === 'from200to599' || value === 'atLeast600') return 'present';
  if (value === 'below200') return 'absent';
  return 'unknown';
}

function hhsGlucoseState(value) {
  if (value === 'atLeast600') return 'present';
  if (value === 'below200' || value === 'from200to599') return 'absent';
  return 'unknown';
}

function significantKetonaemiaState(value) {
  if (value === 'atOrAboveThreshold') return 'present';
  if (value === 'belowThreshold') return 'absent';
  return 'unknown';
}

function pHAcidosisState(value) {
  if (value === 'below7_3') return 'present';
  if (value === 'atLeast7_3') return 'absent';
  return 'unknown';
}

function bicarbonateDkaAcidosisState(value) {
  if (value === 'below15' || value === 'from15toBelow18') return 'present';
  if (value === 'atLeast18') return 'absent';
  return 'unknown';
}

function bicarbonateHhsNoAcidosisState(value) {
  if (value === 'from15toBelow18' || value === 'atLeast18') return 'present';
  if (value === 'below15') return 'absent';
  return 'unknown';
}

function hyperosmolalityState(value) {
  if (value === 'high') return 'present';
  if (value === 'notHigh') return 'absent';
  return 'unknown';
}

function describeDkaDiabetesOrGlucose(values, status) {
  if (status === 'present') {
    if (values.diabetesHistory === 'yes') return 'Prior diabetes history satisfies this component regardless of presentation glucose.';
    return 'Presentation glucose is at least 200 mg/dL (about 11.1 mmol/L).';
  }
  if (status === 'absent') return 'No known diabetes history and presentation glucose below 200 mg/dL do not satisfy this formal DKA component.';
  return 'Confirm a prior diabetes history or glucose at least 200 mg/dL. Glucose below 200 with history unknown is not a negative result.';
}

function describeKetones(values, status) {
  if (status === 'present') return 'Entered ketones meet the significant-ketonaemia threshold.';
  if (status === 'absent') return 'Entered ketones are below the significant-ketonaemia threshold.';
  return 'Obtain quantitative BOHB when available, or document the urine-ketone alternative and method limitation.';
}

function describeDkaAcidosis(values, status) {
  if (status === 'present') {
    if (values.presentationPh === 'below7_3') return 'Presentation pH is below 7.30.';
    return 'Presentation bicarbonate is below 18 mmol/L.';
  }
  if (status === 'absent') return 'Both reviewed acid-base alternatives are outside the DKA acidosis threshold.';
  return 'Confirm pH below 7.30 and/or bicarbonate below 18 mmol/L; either can establish this component.';
}

function describeHhsGlucose(status) {
  if (status === 'present') return 'Presentation glucose is at least 600 mg/dL (about 33.3 mmol/L).';
  if (status === 'absent') return 'Presentation glucose is below the HHS 600 mg/dL (about 33.3 mmol/L) threshold.';
  return 'Confirm whether presentation glucose is at least 600 mg/dL (about 33.3 mmol/L).';
}

function describeHyperosmolality(status) {
  if (status === 'present') return 'A reviewed effective osmolality above 300 or total osmolality above 320 mOsm/kg is entered.';
  if (status === 'absent') return 'Neither reviewed HHS hyperosmolality threshold is met.';
  return 'Assess effective serum osmolality above 300 or total serum osmolality above 320 mOsm/kg.';
}

function describeHhsKetones(status) {
  if (status === 'present') return 'Entered ketones are below the significant-ketonaemia threshold.';
  if (status === 'absent') return 'Entered ketones meet the significant-ketonaemia threshold, so this HHS component is not met.';
  return 'Confirm BOHB below 3.0 mmol/L or, only when BOHB is unavailable, urine ketones below 2+.';
}

function describeHhsNoAcidosis(values, status) {
  if (status === 'present') {
    if (values.presentationBicarbonate === 'from15toBelow18') return 'pH is at least 7.30 and bicarbonate is 15 to below 18 mmol/L. This meets HHS diagnosis but not the isolated-HHS treatment bicarbonate threshold.';
    return 'pH is at least 7.30 and bicarbonate is at least 15 mmol/L.';
  }
  if (status === 'absent') return 'pH below 7.30 or bicarbonate below 15 mmol/L means the HHS absence-of-acidosis component is not met.';
  return 'Confirm both pH at least 7.30 and bicarbonate at least 15 mmol/L.';
}

function buildDkaCriteria(values) {
  const history = diabetesHistoryState(values.diabetesHistory);
  const glucose = dkaGlucoseState(values.presentationGlucose);
  const diabetesOrGlucose = triOr(history, glucose);
  const ketones = significantKetonaemiaState(values.presentationKetones);
  const pH = pHAcidosisState(values.presentationPh);
  const bicarbonate = bicarbonateDkaAcidosisState(values.presentationBicarbonate);
  const acidosis = triOr(pH, bicarbonate);

  return [
    criterion(
      'dka-diabetes-or-hyperglycaemia',
      'Diabetes or hyperglycaemia',
      'Prior diabetes OR glucose at least 200 mg/dL (about 11.1 mmol/L)',
      diabetesOrGlucose,
      describeDkaDiabetesOrGlucose(values, diabetesOrGlucose),
    ),
    criterion(
      'dka-ketosis',
      'Ketosis',
      'BOHB at least 3.0 mmol/L OR urine ketones at least 2+',
      ketones,
      describeKetones(values, ketones),
    ),
    criterion(
      'dka-metabolic-acidosis',
      'Metabolic acidosis',
      'pH below 7.30 OR bicarbonate below 18 mmol/L',
      acidosis,
      describeDkaAcidosis(values, acidosis),
    ),
  ];
}

function buildHhsCriteria(values) {
  const glucose = hhsGlucoseState(values.presentationGlucose);
  const osmolality = hyperosmolalityState(values.presentationOsmolality);
  const significantKetones = significantKetonaemiaState(values.presentationKetones);
  const noSignificantKetonaemia = significantKetones === 'present'
    ? 'absent'
    : significantKetones === 'absent' ? 'present' : 'unknown';
  const pH = pHAcidosisState(values.presentationPh);
  const pHNoAcidosis = pH === 'present' ? 'absent' : pH === 'absent' ? 'present' : 'unknown';
  const bicarbonate = bicarbonateHhsNoAcidosisState(values.presentationBicarbonate);
  const noAcidosis = triAnd(pHNoAcidosis, bicarbonate);

  return [
    criterion(
      'hhs-hyperglycaemia',
      'Hyperglycaemia',
      'Glucose at least 600 mg/dL (about 33.3 mmol/L)',
      glucose,
      describeHhsGlucose(glucose),
    ),
    criterion(
      'hhs-hyperosmolality',
      'Hyperosmolality',
      'Effective osmolality >300 OR total osmolality >320 mOsm/kg',
      osmolality,
      describeHyperosmolality(osmolality),
    ),
    criterion(
      'hhs-no-significant-ketonaemia',
      'Absence of significant ketonaemia',
      'BOHB below 3.0 mmol/L OR urine ketones below 2+',
      noSignificantKetonaemia,
      describeHhsKetones(noSignificantKetonaemia),
    ),
    criterion(
      'hhs-no-acidosis',
      'Absence of acidosis',
      'pH at least 7.30 AND bicarbonate at least 15 mmol/L',
      noAcidosis,
      describeHhsNoAcidosis(values, noAcidosis),
    ),
  ];
}

function diagnosticCard(id, title, criteria) {
  const status = triAnd(...criteria.map(item => item.status));
  return {
    id,
    title,
    status,
    statusLabel: status === 'present' ? 'Criteria met' : status === 'absent' ? 'Criteria not met' : 'Criteria incomplete',
    criteria,
    source: diagnosisSource,
  };
}

function criterionById(card, id) {
  return card.criteria.find(item => item.id === id);
}

function hasEuglycaemicKetoacidosisConcern(values, dka) {
  return values.presentationGlucose === 'below200'
    && values.diabetesHistory !== 'yes'
    && criterionById(dka, 'dka-ketosis').status === 'present'
    && criterionById(dka, 'dka-metabolic-acidosis').status === 'present';
}

function deriveTreatmentPattern(values, dka, hhs) {
  const dkaKetosis = criterionById(dka, 'dka-ketosis').status;
  const dkaAcidosis = criterionById(dka, 'dka-metabolic-acidosis').status;
  const hhsGlucose = criterionById(hhs, 'hhs-hyperglycaemia').status;
  const hhsOsmolality = criterionById(hhs, 'hhs-hyperosmolality').status;
  const hyperosmolarPresentation = triAnd(hhsGlucose, hhsOsmolality);
  const mixedSignal = triOr(dkaKetosis, dkaAcidosis);
  const euglycaemicConcern = hasEuglycaemicKetoacidosisConcern(values, dka);

  // The insulin section calls a hyperosmolar presentation with significant
  // ketonaemia or acidosis a mixed DKA/HHS treatment pattern. This is a
  // treatment distinction, so it can be established before every formal DKA
  // diagnostic component is complete.
  if (hyperosmolarPresentation === 'present' && mixedSignal === 'present') {
    return {
      pattern: 'mixed',
      reason: 'Hyperosmolar hyperglycaemia is present with significant ketonaemia and/or acidosis.',
    };
  }

  if (hhs.status === 'present') {
    if (values.presentationBicarbonate === 'from15toBelow18') {
      return {
        pattern: 'mixed',
        reason: 'HHS diagnosis is met, but bicarbonate below 18 mmol/L is the consensus mixed-treatment condition.',
      };
    }
    return {
      pattern: 'hhs',
      reason: 'All four HHS diagnostic components are met without the mixed-treatment ketone/acidosis signal.',
    };
  }

  if (dka.status === 'present') {
    // A documented absent HHS glucose or osmolality component excludes HHS
    // overlap for routing. In particular, glucose below 600 resolves that
    // question even when osmolality was not measured.
    if (hhsGlucose === 'absent' || hhsOsmolality === 'absent') {
      return {
        pattern: 'dka',
        reason: 'DKA criteria are met and an HHS-defining glucose or osmolality component is assessed absent.',
      };
    }
    return {
      pattern: 'unknown',
      reason: 'DKA criteria are met, but HHS overlap cannot be classified until the HHS glucose/osmolality components are resolved.',
    };
  }

  if (euglycaemicConcern) {
    return {
      pattern: 'unknown',
      reason: 'Ketoacidosis with glucose below 200 mg/dL and no established prior diabetes history needs clinician review; it is not a negative DKA result.',
    };
  }

  if (dka.status === 'absent' && hhs.status === 'absent') {
    return {
      pattern: 'none',
      reason: 'Each formal definition has at least one assessed required component that is absent.',
    };
  }

  return {
    pattern: 'unknown',
    reason: 'The entered presentation findings do not yet establish a complete DKA, HHS or mixed treatment pattern.',
  };
}

function reason(id, text, tone = 'attention') {
  return {id, text, tone};
}

function unknownCriterionReasons(dka, hhs) {
  return [dka, hhs]
    .flatMap(card => card.criteria
      .filter(item => item.status === 'unknown')
      .map(item => reason(`${item.id}-unknown`, `${card.title}: ${item.label} is not established.`)));
}

function buildRouting(values, dka, hhs, derived) {
  const reasons = [];
  const euglycaemicConcern = hasEuglycaemicKetoacidosisConcern(values, dka);

  if (derived.pattern === 'mixed') {
    if (hhs.status === 'present' && values.presentationBicarbonate === 'from15toBelow18') {
      reasons.push(reason('hhs-bicarbonate-treatment-distinction', 'Bicarbonate 15 to below 18 mmol/L meets the HHS diagnostic threshold (at least 15) but meets the mixed-treatment condition (below 18).'));
      return {
        title: 'HHS criteria met; mixed treatment pattern',
        summary: 'HHS criteria are met, but bicarbonate below 18 mmol/L selects the mixed DKA/HHS treatment route.',
        reasons,
      };
    }
    if (dka.status === 'present') {
      reasons.push(reason('dka-hhs-overlap', derived.reason));
      return {
        title: 'DKA criteria met with HHS overlap',
        summary: 'DKA criteria are met and the entered glucose/osmolality plus ketone/acidosis findings support a mixed DKA/HHS treatment pattern. Keep diagnosis status and treatment routing distinct.',
        reasons,
      };
    }
    reasons.push(reason('mixed-treatment-before-complete-dka', 'The mixed pattern is based on a confirmed hyperosmolar presentation plus significant ketonaemia and/or acidosis; all formal DKA components are not required before this treatment distinction is visible.'));
    return {
      title: 'Hyperosmolar presentation with ketosis or acidosis',
      summary: 'A hyperosmolar presentation is entered with significant ketonaemia and/or acidosis. This supports the consensus mixed DKA/HHS treatment pattern even if the formal DKA diagnostic definition is not established.',
      reasons,
    };
  }

  if (derived.pattern === 'hhs') {
    return {
      title: 'HHS criteria met',
      summary: 'All four HHS diagnostic components are met, including no significant ketonaemia and no acidosis. The entered findings support the isolated-HHS treatment pattern.',
      reasons,
    };
  }

  if (derived.pattern === 'dka') {
    if (values.presentationGlucose === 'below200') {
      return {
        title: 'DKA criteria met at glucose below 200 mg/dL',
        summary: 'DKA criteria are met despite glucose below 200 mg/dL. This is compatible with a euglycaemic DKA presentation; do not use glucose alone to exclude DKA or determine resolution.',
        reasons,
      };
    }
    return {
      title: 'DKA criteria met',
      summary: 'All three DKA diagnostic components are met, and an HHS-defining glucose or osmolality component is assessed absent for routing.',
      reasons,
    };
  }

  if (derived.pattern === 'none') {
    return {
      title: 'DKA/HHS criteria not met',
      summary: 'At least one required component is absent for each. Review other causes and reassess if findings change.',
      reasons: [reason('formal-criteria-not-supported', derived.reason)],
    };
  }

  if (dka.status === 'present') {
    reasons.push(reason('hhs-overlap-unresolved', 'DKA criteria are met, but HHS overlap remains unresolved because the HHS glucose and/or osmolality component is not fully assessed.'));
    return {
      title: 'DKA criteria met; HHS overlap unresolved',
      summary: 'DKA criteria are met. Continue urgent monitored DKA treatment while assessing presentation osmolality; do not delay treatment waiting for this guide. A generic isolated DKA/HHS reference rate is withheld until the overlap is classified.',
      reasons,
    };
  }

  if (euglycaemicConcern) {
    reasons.push(reason('euglycaemic-ketoacidosis-review', 'Ketosis and acidosis are present with glucose below 200 mg/dL, but prior diabetes history is not established.'));
    return {
      title: 'Ketoacidosis needs clinician review',
      summary: 'Ketoacidosis is entered with glucose below 200 mg/dL and no established prior diabetes history. This is not reassurance or a negative DKA finding; review euglycaemic DKA and other ketoacidosis causes in the clinical context.',
      reasons,
    };
  }

  reasons.push(...unknownCriterionReasons(dka, hhs));
  if (!reasons.length) reasons.push(reason('diagnosis-incomplete', derived.reason));
  return {
    title: 'Diagnosis unconfirmed',
    summary: 'Complete the unconfirmed findings. Missing findings do not exclude DKA/HHS.',
    reasons,
  };
}

export function evaluateDiagnosis(input = {}) {
  const values = normalized(input);
  const dka = diagnosticCard('dka', 'DKA diagnostic criteria', buildDkaCriteria(values));
  const hhs = diagnosticCard('hhs', 'HHS diagnostic criteria', buildHhsCriteria(values));
  const derived = deriveTreatmentPattern(values, dka, hhs);
  const routing = buildRouting(values, dka, hhs, derived);

  return {
    values,
    dka,
    hhs,
    diagnosticCards: [dka, hhs],
    treatmentPattern: derived.pattern,
    title: routing.title,
    summary: routing.summary,
    reasons: routing.reasons,
    routing,
    source: diagnosisSource,
  };
}
