// Shared AKI entry composition. Frozen clinical source modules remain unchanged.

import {
  config as akiSourceConfig,
  evaluate as evaluateAkiSource,
} from './aki-engine.mjs';
import {
  AKI_ENTRY_CRITERIA,
  AKI_ENTRY_SOURCE,
  evaluateAkiEntry,
} from './aki-entry.mjs';

function withoutKey(object, key) {
  return Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
}

const AKI_ENTRY_HELP = 'Any one fully assessed criterion establishes AKI. Missing baseline, comparator timing, body weight, or a defined urine-output observation interval remains unconfirmed.';

const AKI_VISIBLE_FIELDS = Object.freeze([
  ...AKI_ENTRY_CRITERIA.map(field => Object.freeze({
    ...field,
    help: AKI_ENTRY_HELP,
    inputRole: 'aki-entry-criterion',
  })),
  ...akiSourceConfig.fields
    .filter(field => field.key !== 'akiStatus')
    .map(field => Object.freeze({
      ...field,
      ...(field.key === 'immediateComplication'
        ? { essential: 'Refractory hyperkalaemia, acidosis, uraemic complications, fluid overload, or pulmonary oedema despite medical management.' }
        : {}),
      ...(field.key === 'referralFeature'
        ? { essential: 'Stage 3, unclear or nonresponsive AKI, complications, suspected specialist kidney disease, transplant, or CKD stage 4–5.' }
        : {}),
    })),
]);

/**
 * Applies the three visible AKI criteria before the source AKI engine.
 *
 * \`values\` contains only renderer-visible form fields. \`derived.akiStatus\`
 * is deliberately not a persisted field: a supplied legacy \`akiStatus\` is
 * ignored and recomputed from the criteria every time.
 */
export function evaluateAki(input = {}) {
  const entry = evaluateAkiEntry(input);
  const sourceResult = evaluateAkiSource({
    ...input,
    akiStatus: entry.akiStatus,
  });

  return {
    ...sourceResult,
    values: {
      ...entry.values,
      ...withoutKey(sourceResult.values, 'akiStatus'),
    },
    derived: Object.freeze({ akiStatus: entry.akiStatus }),
    entry: {
      title: entry.title,
      summary: entry.summary,
      criteria: entry.criteria,
      source: entry.source,
    },
  };
}

export const AKI_SOURCE_METADATA = Object.freeze({
  prototypeSource: 'management-prototype/aki-upgrade.mjs + aki-entry.mjs',
  prototypeReviewedAt: '2026-09-15',
  guideVersion: 'KDIGO 2012 final + NICE NG148 (updated 16 October 2024), as recorded in the prototype review',
  statusOnly: 'The March 2026 KDIGO 2027 AKI/AKD public-review draft was recorded only for status. It is not a branch source and is not final guidance.',
  sourceReview: 'Adult AKI recognition, escalation, physiology, obstruction, monitoring, and referral aid. It is not a stage calculator, fluid-order protocol, dialysis order interface, or acute drug-dose calculator.',
});

export const config = Object.freeze({
  ...akiSourceConfig,
  fields: AKI_VISIBLE_FIELDS,
  evaluate: evaluateAki,
  entry: Object.freeze({
    title: 'Does this meet AKI criteria?',
    guidance: 'Any one criterion establishes AKI. Missing baseline or timing stays unconfirmed.',
    source: AKI_ENTRY_SOURCE,
    fields: AKI_ENTRY_CRITERIA,
  }),
});

export default config;
