// Pure presentation-to-treatment adapter for the DKA/HHS guide.
//
// The treatment engine predates the visible diagnostic criteria and accepts a
// categorical `pattern`. This adapter deliberately derives that value from
// the six presentation findings on every evaluation. It never trusts a
// submitted `pattern`, so the renderer cannot unlock a regimen by selecting
// a diagnosis label.

import {
  diagnosticFields,
  evaluateDiagnosis,
} from './dka-hhs-diagnosis.mjs';

export {diagnosticFields, evaluateDiagnosis};

const TREATMENT_PATTERNS = new Set(['dka', 'hhs', 'mixed']);

export function diagnosisReady(input = {}) {
  return TREATMENT_PATTERNS.has(evaluateDiagnosis(input).treatmentPattern);
}

export function dkaTreatmentInput(input = {}) {
  const diagnosis = evaluateDiagnosis(input);
  return {
    ...input,
    pattern: TREATMENT_PATTERNS.has(diagnosis.treatmentPattern)
      ? diagnosis.treatmentPattern
      : 'unknown',
  };
}

export const diagnosticWorkupAction = Object.freeze({
  id: 'diagnostic-workup',
  stage: 'confirm',
  title: 'Initial DKA/HHS tests',
  summary: 'Glucose, electrolytes, venous gas and ketones; assess osmolality for HHS.',
  detail: 'Use time-linked presentation results and clinical assessment. Blood beta-hydroxybutyrate is preferred; verify the local blood-ketone assay. The linked rows identify local tests, not a preselected or executable order bundle.',
  resourceGroup: 'workup',
  sourceUrl: 'https://link.springer.com/article/10.1007/s00125-024-06183-8',
  sourceLabel: '2024 adult hyperglycaemic-crises consensus',
});

export default dkaTreatmentInput;
