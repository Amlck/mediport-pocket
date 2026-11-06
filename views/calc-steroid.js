import { h, note, disclosure } from '../lib/ui.js';
import { chipRows, values, summary, caveats, resultsHead, sourceCard } from './calc-parts.js';

// The maintained formula owns the equivalence table, arithmetic and cautions.
// This spec only collects values and presents its returned result.
export const STEROID = {
  id: 'steroid',
  title: 'Steroid equivalence',
  subtitle: 'Eight glucocorticoids · dose conversion · daily exposure',
  searchTerms: ['glucocorticoid', 'corticosteroid', 'prednisolone equivalent', 'Solu-Cortef', 'Solu-Medrol'],
  groups: [{ title: 'Entered regimen', fields: [
    { key: 'dose', label: 'Dose per administration', unit: 'mg', placeholder: '20' },
    { key: 'dosesPerDay', label: 'Administrations per day', unit: '/day', placeholder: '1', inputmode: 'numeric' },
  ] }],
  choices: (engines) => [{
    key: 'drug', label: 'Glucocorticoid', required: true, initial: '',
    options: engines.CALCULATOR_FORMULAS.GLUCOCORTICOIDS.map(({ key, label }) => [key, label]),
  }],
  limits: { dose: { min: 0.01, max: 100000 }, dosesPerDay: { min: 1, max: 24 } },
  action: 'Convert',
  footnote: 'Anti-inflammatory equivalence only. Enter an administered dose and its daily frequency; no patient information is saved.',
  compute: (v, choices, engines) => engines.CALCULATOR_FORMULAS.steroidEquivalence({ drug: choices.drug, dose: v.dose, dosesPerDay: v.dosesPerDay }),
  render: (r, ctx) => [
    resultsHead('Anti-inflammatory equivalents'),
    summary(`${r.source.label} ${r.inputs.dose} mg × ${r.inputs.dosesPerDay}/day = ${r.dailyDose} mg/day. Mineralocorticoid activity: ${r.source.mineralocorticoid}; duration: ${r.source.duration}.`),
    values(`Prednisolone-equivalent ${r.prednisoloneEquivalentDaily} mg/day · hydrocortisone-equivalent ${r.hydrocortisoneEquivalentDaily} mg/day`),
    chipRows(r.conversions.map((item) => ({
      label: item.label,
      rule: `${item.dailyDose} mg/day · mineralocorticoid ${item.mineralocorticoid} · ${item.duration}`,
      chip: `${item.dose} mg/dose`,
      tone: item.isSource ? 'ok' : '',
    }))),
    r.meetsProlongedExposureDose
      ? note('attention', `At or above ${r.prolongedExposureThresholdMg} mg/day prednisolone-equivalent. If sustained for 4 weeks or more, review Pneumocystis prophylaxis and adrenal suppression; this is a threshold, not a target.`)
      : null,
    r.mineralocorticoidShift ? note('attention', r.mineralocorticoidShift) : null,
    caveats(r.caveats, 'Equivalence limits and duration caution'),
    r.products.length ? disclosure('Historical local product counts', [
      h('p', { class: 'muted' }, 'Historical product identities only. Strengths and calculated vial/tablet counts do not establish current availability, a validated regimen, or orderability.'),
      h('ul', null, r.products.filter((item) => item.units >= 0.1 && item.units <= 40).map((item) =>
        h('li', null, `${item.label} ${item.strength} ${item.unit} (${item.code}): ${item.dose} mg ≈ ${item.units} ${item.form}${item.units === 1 ? '' : 's'}`))),
    ], { className: 'calc-disclosure' }) : null,
    sourceCard([
      `portal-calculator-formulas.js :: steroidEquivalence() — maintained anti-inflammatory equivalence table.${r.products.length ? ' Product identities are historical local captures.' : ''}`,
      `formulas sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · pack ${ctx.release.version}; packaging date is not a clinical review date.`,
    ]),
  ],
};
