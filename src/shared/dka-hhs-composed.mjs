// Shared DKA/HHS diagnostic and treatment composition; no clinical-rule changes.
// Direct imports are query-free. The frozen entry module retains its existing
// versioned diagnosis import; portable loaders must preserve that dependency.

import { config as dkaHhsSourceConfig } from './dka-hhs-engine.mjs';
import {
  diagnosticFields as dkaHhsDiagnosticFields,
  diagnosticWorkupAction,
  diagnosisReady as dkaHhsDiagnosisReady,
  evaluateDiagnosis as evaluateDkaHhsDiagnosis,
} from './dka-hhs-entry.mjs';

export const DKA_HHS_SOURCE_METADATA = Object.freeze({
  prototypeSource: 'management-prototype/dka-hhs-upgrade.mjs + dka-hhs-diagnosis.mjs',
  prototypeReviewedAt: '2026-09-15',
  guideVersion: 'ADA/EASD/JBDS/AACE/DTS adult hyperglycaemic-crises consensus (2024) plus an ADA hospital-standards 2026 transition check, as recorded in the frozen source review.',
  sourceReview: 'Adult DKA/HHS diagnostic-criteria, acute-phase distinction, reassessment and transition aid. It is not a bedside glucose-monitoring order, fluid or insulin prescription, pump protocol, assay validation, order set, or authorization.',
});

const DKA_HHS_DIAGNOSTIC_FIELDS = Object.freeze(
  dkaHhsDiagnosticFields.map(field => Object.freeze({...field})),
);

const DKA_HHS_VISIBLE_FIELDS = Object.freeze([
  {
    ...dkaHhsSourceConfig.fields.find(field => field.key === 'criticalFeature'),
    essential: 'Critical feature: shock, major haemodynamic compromise, altered consciousness, severe DKA, or a critical precipitating illness. Assess and escalate independently while diagnostic findings are completed.',
  },
  ...DKA_HHS_DIAGNOSTIC_FIELDS,
  ...dkaHhsSourceConfig.fields.filter(field => !['pattern', 'criticalFeature'].includes(field.key)),
].map(field => Object.freeze({...field})));

const DKA_HHS_TREATMENT_STAGE_IDS = Object.freeze(
  dkaHhsSourceConfig.stages.map(stage => stage.id),
);
const DKA_HHS_DIAGNOSTIC_STAGE_IDS = Object.freeze(['confirm', 'stabilize']);

/**
 * Combines the frozen diagnostic assessor with the frozen treatment engine.
 *
 * A manually supplied `pattern` is ignored. When the presentation does not
 * establish a supported treatment pattern, only confirmation and independent
 * stabilization actions remain visible to the renderer.
 */
export function evaluateDkaHhs(input = {}) {
  const diagnosis = evaluateDkaHhsDiagnosis(input);
  const ready = dkaHhsDiagnosisReady(input);
  const sourceResult = dkaHhsSourceConfig.evaluate({
    ...input,
    pattern: ready ? diagnosis.treatmentPattern : 'unknown',
  });
  const visibleStageIds = ready
    ? DKA_HHS_TREATMENT_STAGE_IDS
    : DKA_HHS_DIAGNOSTIC_STAGE_IDS;
  const withReviewedNoneBranch = diagnosis.treatmentPattern === 'none'
    ? {
      ...sourceResult,
      actions: [
        {
          ...diagnosticWorkupAction,
          id: 'review-other-causes',
          title: 'Review other causes and hyperglycaemia care',
          summary: 'The entered findings do not establish DKA or HHS.',
          detail: 'This is not a reassuring disposition or a diagnosis of uncomplicated hyperglycaemia. Review abnormal ketones, acidosis, symptoms and the clinical course; investigate alternative causes and reassess if findings evolve.',
        },
        ...sourceResult.actions.filter(action => action.stage !== 'confirm'),
      ],
    }
    : sourceResult;

  return {
    ...withReviewedNoneBranch,
    values: Object.fromEntries(DKA_HHS_VISIBLE_FIELDS.map(field => [
      field.key,
      Object.hasOwn(diagnosis.values, field.key)
        ? diagnosis.values[field.key]
        : withReviewedNoneBranch.values[field.key],
    ])),
    actions: withReviewedNoneBranch.actions.filter(action => visibleStageIds.includes(action.stage)),
    derived: Object.freeze({pattern: diagnosis.treatmentPattern}),
    diagnosis,
    dka: diagnosis.dka,
    hhs: diagnosis.hhs,
    diagnosticCards: diagnosis.diagnosticCards,
    routing: diagnosis.routing,
    diagnosisReady: ready,
    visibleStageIds,
  };
}

export const config = Object.freeze({
  ...dkaHhsSourceConfig,
  fields: DKA_HHS_VISIBLE_FIELDS,
  diagnosticFields: DKA_HHS_DIAGNOSTIC_FIELDS,
  evaluate: evaluateDkaHhs,
  evaluateDiagnosis: evaluateDkaHhsDiagnosis,
  diagnosisReady: dkaHhsDiagnosisReady,
  entry: Object.freeze({
    title: 'Does this meet DKA or HHS criteria?',
    guidance: 'Use time-linked presentation findings before treatment changed the results. Missing findings do not exclude DKA/HHS.',
    source: Object.freeze({
      label: 'ADA/EASD/JBDS/AACE/DTS adult hyperglycaemic-crises consensus (2024)',
      url: 'https://link.springer.com/article/10.1007/s00125-024-06183-8',
    }),
    fields: DKA_HHS_DIAGNOSTIC_FIELDS,
  }),
});

export default config;
