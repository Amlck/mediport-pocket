// Pure adult AKI entry-criteria assessment.
//
// This deliberately classifies only whether the three KDIGO/NICE entry
// criteria have been assessed. It does not calculate an AKI stage, choose a
// treatment, or suppress separately assessed shock/RRT urgency.

export const AKI_ENTRY_SOURCE = Object.freeze({
  label: 'KDIGO AKI guideline (2012 final), recommendation 2.1.1',
  url: 'https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf',
});

export const AKI_ENTRY_STATUSES = Object.freeze(['unknown', 'met', 'notmet']);

const entryOptions = Object.freeze([
  Object.freeze(['unknown', 'Not assessed']),
  Object.freeze(['met', 'Met']),
  Object.freeze(['notmet', 'Not met']),
]);

const criterion = definition => Object.freeze({...definition, options: entryOptions});

export const AKI_ENTRY_CRITERIA = Object.freeze([
  criterion({
    key: 'creatinineRise48h',
    label: 'Creatinine rise in 48 hours',
    threshold: 'At least 0.3 mg/dL within 48 hours',
    definition: 'Serum creatinine rose by at least 0.3 mg/dL within 48 hours.',
  }),
  criterion({
    key: 'creatinineBaseline7d',
    label: 'Creatinine relative to baseline',
    threshold: 'At least 1.5 times baseline within 7 days',
    definition: 'Serum creatinine reached at least 1.5 times a known or presumed baseline within the prior 7 days.',
  }),
  criterion({
    key: 'urineOutput6h',
    label: 'Urine output observation',
    threshold: 'Below 0.5 mL/kg/h for 6 hours',
    definition: 'Urine volume was below 0.5 mL/kg/h for a defined 6-hour observation window.',
  }),
]);

// Renderer-facing alias. Every entry has key, label, threshold and options;
// definition is retained for a visible explanatory disclosure.
export const akiEntryFields = AKI_ENTRY_CRITERIA;

const validStatus = value => AKI_ENTRY_STATUSES.includes(value) ? value : 'unknown';

/**
 * Normalizes only the announced three-state inputs. Missing values and invalid
 * values deliberately remain unknown: a missing baseline or observation window
 * cannot establish that a criterion is not met.
 */
export function normalizeAkiEntry(input = {}) {
  return Object.fromEntries(
    AKI_ENTRY_CRITERIA.map(({key}) => [key, validStatus(input?.[key])]),
  );
}

/**
 * Converts the criterion states into the legacy AKI guide's status vocabulary.
 *
 * confirmed       at least one fully time-linked criterion is met
 * not-established all three criteria were assessed and are not met
 * possible        a partial assessment leaves one or more criteria unresolved
 * unknown         no criterion has been assessed
 */
export function akiStatusFromCriteria(values = {}) {
  const statuses = AKI_ENTRY_CRITERIA.map(({key}) => validStatus(values?.[key]));
  if (statuses.includes('met')) return 'confirmed';
  if (statuses.every(status => status === 'notmet')) return 'not-established';
  if (statuses.some(status => status === 'notmet')) return 'possible';
  return 'unknown';
}

/**
 * Returns an adapter-ready status and a renderable definition for every
 * criterion. Keep the visible criteria with the result; an OR diagnosis should
 * never hide which evidence is missing or which criterion was met.
 */
export function evaluateAkiEntry(input = {}) {
  const values = normalizeAkiEntry(input);
  const akiStatus = akiStatusFromCriteria(values);
  const outcome = {
    confirmed: {
      title: 'AKI criteria met',
      summary: 'At least one time-linked AKI criterion is met. Stage from the worse creatinine or urine-output criterion.',
    },
    possible: {
      title: 'AKI criteria not yet established',
      summary: 'At least one criterion remains unconfirmed. Obtain the missing baseline, timing, body weight or urine-output observation window.',
    },
    'not-established': {
      title: 'AKI criteria not established',
      summary: 'All three entry criteria were assessed and are not met. Continue surveillance when clinical risk or concern remains.',
    },
    unknown: {
      title: 'AKI criteria unverified',
      summary: 'No entry criterion has been assessed. Obtain time-linked creatinine values and a defined urine-output observation window when AKI is possible.',
    },
  }[akiStatus];
  return {
    values,
    akiStatus,
    criteria: AKI_ENTRY_CRITERIA.map(definition => ({
      ...definition,
      status: values[definition.key],
    })),
    ...outcome,
    source: AKI_ENTRY_SOURCE,
  };
}

export default evaluateAkiEntry;
