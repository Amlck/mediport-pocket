// Values for the patient in front of you, shared between calculator pages so a
// creatinine typed on the CrCl page pre-fills eGFR, MELD and the drug renal
// tables. Memory only: nothing here is persisted or transmitted, and a reload
// starts empty. Every page that reads a carried value says where it came from;
// "New patient" clears all of it at once.
import { LAB_FIELDS } from './lab-review.js';

const LAB_METADATA = Object.fromEntries(LAB_FIELDS.map((field) => [field.key, field]));
const CHOICES = Object.fromEntries(LAB_FIELDS.filter((field) => field.options)
  .map((field) => [field.key, field.options.map(([code]) => code)]));
// LAB_FIELDS owns the categorical vocabulary; arbitrary strings never enter
// shared patient memory through either a review or a standalone calculator.
const validShared = (key, value) => CHOICES[key] ? CHOICES[key].includes(value) : Number.isFinite(value);

const LABELS = {
  age: ['Age', 'years'], sex: ['Sex', ''], weightKg: ['Weight', 'kg'], heightCm: ['Height', 'cm'],
  creatinine: ['Creatinine', 'mg/dL'], egfr: ['eGFR', 'mL/min/1.73 m²'], crcl: ['CrCl', 'mL/min'],
  sodium: ['Na⁺', 'mmol/L'], potassium: ['K⁺', 'mmol/L'], chloride: ['Cl⁻', 'mmol/L'], bicarbonate: ['Chemistry HCO₃⁻', 'mmol/L'], bloodGasBicarbonate: ['Blood gas HCO₃⁻', 'mmol/L'],
  magnesium: ['Mg²⁺', 'mg/dL'], phosphate: ['Phosphate', 'mg/dL'], calcium: ['Ca', 'mg/dL'], albumin: ['Albumin', 'g/dL'],
  glucose: ['Glucose', 'mg/dL'], bun: ['BUN', 'mg/dL'], bilirubin: ['Bilirubin', 'mg/dL'], inr: ['INR', ''],
  hemoglobin: ['Hgb', 'g/dL'], hematocrit: ['Hct', '%'], platelets: ['Platelets', '×10³/µL'],
  ph: ['pH', ''], paco2: ['PaCO₂', 'mmHg'], pao2: ['PaO₂', 'mmHg'], fio2Percent: ['FiO₂', '%'],
  heartRate: ['Pulse', '/min'], systolicBp: ['SBP', 'mmHg'], diastolicBp: ['DBP', 'mmHg'],
  respiratoryRate: ['Resp. rate', '/min'], spo2: ['SpO₂', '%'], temperature: ['Temp', '°C'],
  qtMs: ['QT', 'ms'], serumOsmolality: ['Serum osm', 'mOsm/kg'], urineSodium: ['Urine Na', 'mmol/L'], urineCreatinine: ['Urine Cr', 'mg/dL'],
};

let values = {};
let sources = {};
let active = false;
const listeners = new Set();
const resetters = new Set();
const labReviewers = new Set();
let labRevision = 0;
const emit = () => { for (const fn of listeners) fn(); };

// Only these reviewed measurements can cross from the Lab review into tools.
// Replacing the set removes values omitted from a later review, including a
// blanked chemistry/blood-gas bicarbonate, before anyone can render a result.
export const LAB_KEYS = Object.freeze(LAB_FIELDS.map((field) => field.key));
const LAB_DERIVED_KEYS = ['egfr', 'crcl'];
const RENAL_DEPENDENCIES = {
  egfr: ['creatinine', 'age', 'sex'],
  crcl: ['creatinine', 'age', 'sex', 'weightKg', 'heightCm'],
};
function removeKeys(keys, next, nextSources) {
  for (const key of keys) { delete next[key]; delete nextSources[key]; }
}
function invalidateChangedRenal(changed, next, nextSources, freshlyPublished = {}) {
  for (const [estimate, dependencies] of Object.entries(RENAL_DEPENDENCIES)) {
    if (dependencies.some((key) => changed.includes(key)) && !Object.hasOwn(freshlyPublished, estimate)) {
      removeKeys([estimate], next, nextSources);
    }
  }
}
function notifyLabReview() {
  labRevision += 1;
  for (const fn of labReviewers) fn(labRevision);
  emit();
}

export const patientSession = {
  labelFor(key) { return LABELS[key]?.[0] || LAB_METADATA[key]?.label || key; },
  unitFor(key) { return LABELS[key]?.[1] || LAB_METADATA[key]?.unit || ''; },
  has(key) { return Object.hasOwn(values, key); },
  get(key) { return values[key]; },
  source(key) { return sources[key] || null; },
  entries() { return Object.keys(values).map((key) => ({ key, value: values[key], source: sources[key], label: this.labelFor(key), unit: this.unitFor(key) })); },
  isEmpty() { return Object.keys(values).length === 0; },
  hasActivity() { return active; },
  markActive() { if (!active) { active = true; emit(); } },
  labRevision() { return labRevision; },
  // Calculator/ABG caches register here. A draft edit must not invoke the
  // global New patient reset, which would also erase guide and ECG work.
  onLabReview(fn) { labReviewers.add(fn); return () => labReviewers.delete(fn); },
  invalidateLabs() {
    const next = { ...values }; const nextSources = { ...sources };
    removeKeys([...LAB_KEYS, ...LAB_DERIVED_KEYS], next, nextSources);
    values = next; sources = nextSources; active = true;
    notifyLabReview();
  },
  replaceLabs(patch) {
    const next = { ...values }; const nextSources = { ...sources };
    removeKeys([...LAB_KEYS, ...LAB_DERIVED_KEYS], next, nextSources);
    for (const key of LAB_KEYS) {
      const value = patch?.[key];
      if (!validShared(key, value)) continue;
      next[key] = value; nextSources[key] = 'Lab review';
    }
    values = next; sources = nextSources; active = true;
    notifyLabReview();
  },
  // Register once per tool module, not per view. All patient-specific memory
  // is reset before observers repaint the Home card or a carried-value banner.
  onReset(reset) { resetters.add(reset); return () => resetters.delete(reset); },
  // A page publishes the values it used (and any it derived) after a
  // successful calculation. Live workups publish only entries validated by
  // their maintained source wrapper after a user edit.
  publish(patch, source) {
    const next = { ...values }; const nextSources = { ...sources };
    const accepted = {};
    const changed = [];
    for (const [key, value] of Object.entries(patch)) {
      if (!validShared(key, value)) continue;
      accepted[key] = value;
      if (!Object.hasOwn(values, key) || values[key] !== value) changed.push(key);
      next[key] = value; nextSources[key] = source;
    }
    // A new creatinine/demographic fact invalidates previously derived renal
    // estimates before subscribers can render drug renal tables. A calculator
    // may publish its freshly recalculated estimate in this same transaction.
    invalidateChangedRenal(changed, next, nextSources, accepted);
    values = next; sources = nextSources;
    if (Object.keys(values).length) active = true;
    emit();
  },
  // Blank/invalid live-workup edits remove their prior shared measurements.
  // This does not clear guide/ECG work or the other laboratory specimens.
  forget(keys) {
    const next = { ...values }; const nextSources = { ...sources };
    const removed = keys.filter((key) => Object.hasOwn(values, key));
    removeKeys(keys, next, nextSources);
    invalidateChangedRenal(removed, next, nextSources);
    values = next; sources = nextSources;
    emit();
  },
  clear() {
    values = {}; sources = {}; active = false;
    for (const reset of resetters) reset();
    emit();
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
