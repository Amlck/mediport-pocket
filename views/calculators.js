import { h, icon, starButton, note } from '../lib/ui.js';
import { tile, segmentedRow, parseInputs, sessionBanner, relatedCard, editValuesButton, calculatorScrollBehavior } from './calc-parts.js';
import { patientSession } from '../lib/session.js';
import { groupBrowseEntries } from '../lib/search.js';
import { EGFR, CRCL } from './calc-renal.js';
import { SCORE_PAGES } from './calc-scores.js';
import { FENA, FEUREA, SODIUM_FREE_WATER, HYPONATREMIA } from './calc-kidney.js';
import { AA_GRADIENT, MAP, BMI, HARRIS_BENEDICT } from './calc-bedside.js';
import { ANEMIA, ELECTROLYTES } from './calc-heme.js';
import { ANION_GAP, CORRECTED_CALCIUM } from './calc-chem.js';
import { NEWS2, QTC } from './calc-vitals.js';
import { STEROID } from './calc-steroid.js';

// Calculator catalogue. ABG keeps its own page (views/abg.js); every other entry
// is a spec rendered by calculatorView(): groups of numeric tiles, optional
// segmented choices, the engine call, and a renderer that maps the returned
// codes onto steps and branches. No page computes a threshold itself.
export const CATALOGUE = [
  { id: 'abg', title: 'ABG interpretation', subtitle: 'Primary disorder · compensation · anion gap · workups', href: '#/calc/abg', searchTerms: ['arterial blood gas', 'acid base', 'pH', 'bicarbonate'] },
  { id: 'ekg', title: 'ECG interpretation', subtitle: 'Systematic read, one question at a time · alerts · narrative', href: '#/calc/ekg', searchTerms: ['EKG', '12 lead', 'rhythm strip'] },
  { id: 'osmolar-gap', title: 'Osmolar gap', subtitle: 'Calculated osmolality · measured gap · toxic alcohol screen', searchTerms: ['osmolal gap', 'osm gap', 'serum osmolarity', 'measured osmolality'] },
  { id: 'urine-anion-gap', title: 'Urine anion gap', subtitle: 'Urine Na + K − Cl · renal ammonium response', searchTerms: ['UAG', 'normal gap acidosis', 'RTA', 'renal tubular acidosis'] },
  { id: 'urine-chloride', title: 'Urine chloride', subtitle: 'Metabolic alkalosis workup · diuretic and blood-pressure context', searchTerms: ['urine Cl', 'alkalosis', 'chloride responsive'] },
  CRCL, EGFR, FENA, FEUREA, SODIUM_FREE_WATER, HYPONATREMIA,
  ANION_GAP, CORRECTED_CALCIUM, ELECTROLYTES, ANEMIA, NEWS2, QTC, AA_GRADIENT, MAP, BMI, HARRIS_BENEDICT, STEROID,
  ...SCORE_PAGES,
];
const SPECS = Object.fromEntries(CATALOGUE.filter((c) => c.compute).map((c) => [c.id, c]));

// The patient session as a card: what is carried and the one button that forgets it.
export function sessionCard() {
  const host = h('div');
  const render = () => {
    const entries = patientSession.entries();
    host.replaceChildren(patientSession.hasActivity() ? h('div', { class: 'card' },
      h('div', { class: 'card-title' }, 'This patient · session values'),
      h('p', { class: 'small' }, entries.length ? entries.map((e) => `${e.label} ${e.value}${e.unit ? ' ' + e.unit : ''}`).join(' · ') : 'Tool inputs or answers are present in this session.'),
      h('p', { class: 'muted mt-6' }, entries.length ? `From ${[...new Set(entries.map((e) => e.source))].join(', ')}. Pre-fills matching tiles on other pages; kept in memory only.` : 'Kept in memory only.'),
      h('button', { class: 'btn-small mt-8', type: 'button', onclick: () => patientSession.clear() }, 'New patient'),
      h('p', { class: 'muted mt-6' }, 'Clears every calculator, guide answer, ECG note and result.')) : '');
  };
  render();
  const unsubscribe = patientSession.subscribe(() => { if (!host.isConnected) { unsubscribe(); return; } render(); });
  return host;
}

export function calcView() {
  const groups = groupBrowseEntries(CATALOGUE);
  const el = h('div', { class: 'page' },
    h('a', { class: 'search-launch', href: '#/search/calculator' }, icon('search', 20), `Search ${CATALOGUE.length} calculators`),
    h('nav', { class: 'chips browse-jumps', 'aria-label': 'Calculator alphabetical sections' }, groups.map((group) =>
      h('button', { class: 'chip', type: 'button', onclick: () => el.querySelector(`#calc-${group.id}`)?.scrollIntoView({ block: 'start' }) }, group.label))),
    sessionCard(),
    groups.map((group) => h('section', { id: `calc-${group.id}`, class: 'browse-group', 'aria-label': group.label },
      h('h2', { class: 'letter' }, `${group.label} · ${group.entries.length}`),
      h('div', { class: 'list' }, group.entries.map((c) => h('a', { class: 'row', href: c.href || `#/calc/${c.id}` },
      h('div', { class: 'row-main' },
        h('div', { class: 'row-title' }, c.title),
        h('div', { class: 'row-sub' }, c.subtitle)),
      icon('next', 20, 'chev')))))),
    h('p', { class: 'muted pad-x' }, 'Every rule on these pages is extracted from the maintained Mediport sources at build time; the pages only show which branch fired.'));
  return { title: 'Calculators', subtitle: `${CATALOGUE.length} calculators`, el };
}

// Entries stay in memory for the session, keyed by calculator id. Nothing is persisted.
const sessions = new Map();
patientSession.onReset(() => sessions.clear());
patientSession.onLabReview(() => sessions.clear());
// Score pages take their items from the shared engine, so choices may be a
// function of the loaded engines rather than a literal list.
const choicesOf = (spec, engines) => (typeof spec.choices === 'function' ? spec.choices(engines) : spec.choices) || [];
function sessionFor(spec, choices) {
  if (!sessions.has(spec.id)) {
    sessions.set(spec.id, {
      values: Object.fromEntries(spec.groups.flatMap((g) => g.fields).map((f) => [f.key, ''])),
      choices: Object.fromEntries(choices.map((c) => [c.key, c.initial])),
      touchedChoices: {},
      result: null, stale: false, carried: {},
    });
  }
  return sessions.get(spec.id);
}

// Blank tiles and unanswered choices take the patient session's value for the
// same measurement (field.shared / choice.shared name the shared key); the page
// records where each came from so the banner can say so.
function carryIn(spec, choices, session) {
  const carried = { ...session.carried };
  let values = session.values; let picked = session.choices;
  let changed = false;
  const sharedKeys = [...spec.groups.flatMap(g => g.fields), ...choices].map(field => field.shared).filter(Boolean);
  const sharedSeen = Object.fromEntries(sharedKeys.map(key => [key, patientSession.get(key)]));
  if (session.sharedSeen) changed = sharedKeys.some(key => session.sharedSeen[key] !== sharedSeen[key]);
  for (const field of spec.groups.flatMap((g) => g.fields)) {
    if (field.shared && carried[field.shared] && !patientSession.has(field.shared)) {
      values = { ...values, [field.key]: '' }; delete carried[field.shared]; changed = true;
    } else if (field.shared && (values[field.key] === '' || carried[field.shared]) && patientSession.has(field.shared)) {
      values = { ...values, [field.key]: String(patientSession.get(field.shared)) };
      carried[field.shared] = patientSession.source(field.shared);
    }
  }
  for (const choice of choices) {
    // A preset such as male on the sodium page is only a default, not an
    // explicit patient choice. The carried value wins until the user picks.
    if (choice.shared && carried[choice.shared] && !patientSession.has(choice.shared)) {
      picked = { ...picked, [choice.key]: choice.initial }; delete carried[choice.shared]; changed = true;
    } else if (choice.shared && !session.touchedChoices?.[choice.key] && patientSession.has(choice.shared)) {
      picked = { ...picked, [choice.key]: String(patientSession.get(choice.shared)) };
      carried[choice.shared] = patientSession.source(choice.shared);
    }
  }
  return { ...session, values, choices: picked, carried, sharedSeen,
    ...(changed ? { result: null, stale: false } : {}) };
}

// After a successful calculation the page publishes the values it used, plus
// anything the spec derives (a CrCl estimate, an eGFR), under its own name.
function carryOut(spec, choices, parsed, picked, result) {
  const patch = {};
  patientSession.forget(spec.groups.flatMap(g => g.fields)
    .filter(field => field.shared && parsed[field.key] === null).map(field => field.shared));
  for (const field of spec.groups.flatMap((g) => g.fields)) if (field.shared && parsed[field.key] !== null) patch[field.shared] = parsed[field.key];
  for (const choice of choices) if (choice.shared && picked[choice.key]) patch[choice.shared] = picked[choice.key];
  Object.assign(patch, spec.publish ? spec.publish(result) : {});
  if (['egfr', 'crcl'].includes(spec.id) && !Object.hasOwn(patch, spec.id)) patientSession.forget([spec.id]);
  patientSession.publish(patch, spec.shortTitle || spec.title);
}

// A choice renders as a segmented control when its options are few and short,
// otherwise as a question card with full-width options (the guides' pattern).
function choiceControl(choice, current, onPick) {
  const short = choice.options.length <= 3 && choice.options.every(([, text]) => text.length <= 18) && !choice.hint;
  if (short) return segmentedRow(choice.label, choice.options, current, onPick);
  const wide = choice.options.some(([, text]) => text.length > 22);
  return h('section', { class: `card q calculator-choice ${current ? 'answered' : ''}` },
    h('h3', { class: 'q-label' }, choice.label),
    choice.hint ? h('p', { class: 'muted q-hint' }, choice.hint) : null,
    h('div', { class: `choices ${wide ? 'wide' : ''}`, role: 'group', 'aria-label': choice.label },
      choice.options.map(([value, text]) => h('button', { type: 'button', class: 'choice', 'aria-pressed': String(current === value), onclick: () => onPick(value) }, text))));
}

export function calculatorView(ctx, [id]) {
  const spec = SPECS[id];
  if (!spec) {
    return { title: 'Calculator', el: h('div', { class: 'page' }, note('urgent', `No calculator “${id}” in this pack.`), h('a', { class: 'btn-ghost', href: '#/calc' }, 'All calculators')) };
  }
  const choices = choicesOf(spec, ctx.engines.calculators);
  let session = sessionFor(spec, choices);
  session = carryIn(spec, choices, session);
  sessions.set(spec.id, session);
  const fields = spec.groups.flatMap((g) => g.fields);
  const el = h('div', { class: 'page calculator-page' });
  const bannerHost = h('div');
  const choicesHost = h('div', { class: 'stack calculator-choices', id: 'calculator-choices' });
  const issuesHost = h('div', { class: 'issues' });
  const resultsHost = h('div');

  function clearIssues() {
    issuesHost.replaceChildren();
    el.querySelectorAll('.tile.invalid').forEach((t) => t.classList.remove('invalid'));
  }
  function markStale() {
    if (session.result && !session.stale) { session.stale = true; renderResults(); }
  }
  function sharedKeyOf(key) {
    return fields.find((f) => f.key === key)?.shared || choices.find((c) => c.key === key)?.shared || null;
  }
  function renderBanner() {
    bannerHost.replaceChildren(...[sessionBanner(session.carried, newPatient)].filter(Boolean));
    el.querySelectorAll('.tile').forEach((t) => {
      const shared = sharedKeyOf(t.dataset.field);
      t.classList.toggle('carried', Boolean(shared && session.carried[shared]));
    });
  }
  function newPatient() {
    patientSession.clear();
    session = sessionFor(spec, choices);
    el.querySelectorAll('.tile input').forEach((input) => { input.value = ''; });
    renderChoices(); clearIssues(); renderResults(); renderBanner();
  }
  const unsubscribeLabReview = patientSession.onLabReview(() => {
    session = carryIn(spec, choices, sessionFor(spec, choices));
    sessions.set(spec.id, session);
    for (const field of fields) {
      const input = el.querySelector(`#${spec.id}-${field.key}`);
      if (input) input.value = session.values[field.key];
    }
    renderChoices(); clearIssues(); renderResults(); renderBanner();
  });
  function onInput(key, value) {
    patientSession.markActive();
    session.values = { ...session.values, [key]: value };
    const shared = sharedKeyOf(key);
    if (['creatinine', 'age', 'sex'].includes(shared)) patientSession.forget(['egfr', 'crcl']);
    else if (['weightKg', 'heightCm'].includes(shared)) patientSession.forget(['crcl']);
    if (shared && session.carried[shared]) { const { [shared]: _dropped, ...rest } = session.carried; session.carried = rest; renderBanner(); }
    markStale();
    clearIssues();
  }
  function onEnter(key) {
    const order = fields.map((f) => f.key);
    const next = order[order.indexOf(key) + 1];
    if (next) el.querySelector(`#${spec.id}-${next}`)?.focus();
    else calculate();
  }
  function renderChoices() {
    choicesHost.replaceChildren(...choices.map((c) => choiceControl(c, session.choices[c.key], (value) => {
      patientSession.markActive();
      session.choices = { ...session.choices, [c.key]: value };
      session.touchedChoices = { ...session.touchedChoices, [c.key]: true };
      if (c.shared === 'sex') patientSession.forget(['egfr', 'crcl']);
      else if (spec.id === 'crcl') patientSession.forget(['crcl']);
      if (c.shared && session.carried[c.shared]) { const { [c.shared]: _dropped, ...rest } = session.carried; session.carried = rest; renderBanner(); }
      renderChoices();
      if (session.result) calculate(); else clearIssues();
    })));
  }
  function calculate() {
    document.activeElement?.blur?.();
    clearIssues();
    const { issues, parsed } = parseInputs(fields, session.values, spec.limits);
    const unanswered = choices.filter((choice) => choice.required && !session.choices[choice.key]);
    if (unanswered.length > 2) issues.push({ field: null, message: `${unanswered.length} items unanswered: ${unanswered.map((c) => c.label).join('; ')}.` });
    else for (const choice of unanswered) issues.push({ field: choice.key, message: `${choice.label}: choose one.` });
    if (issues.length) {
      for (const issue of issues) el.querySelector(`.tile[data-field="${issue.field}"]`)?.classList.add('invalid');
      issuesHost.replaceChildren(...issues.map((issue) => h('div', null, issue.message)));
      session.result = null;
      renderResults();
      return;
    }
    const result = spec.compute(parsed, session.choices, ctx.engines.calculators);
    if (!result) {
      issuesHost.replaceChildren(h('div', null, spec.emptyMessage || 'The engine returned no result for these inputs.'));
      session.result = null;
      renderResults();
      return;
    }
    session.result = result;
    session.stale = false;
    carryOut(spec, choices, parsed, session.choices, result);
    session.sharedSeen = Object.fromEntries([...fields, ...choices].map(field => field.shared)
      .filter(Boolean).map(key => [key, patientSession.get(key)]));
    renderResults();
    resultsHost.firstChild?.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
  }
  function clear() {
    session.values = Object.fromEntries(fields.map((f) => [f.key, '']));
    session.choices = Object.fromEntries(choices.map((c) => [c.key, c.initial]));
    session.touchedChoices = {};
    session.result = null; session.stale = false; session.carried = {};
    patientSession.forget([...fields, ...choices].map(field => field.shared).filter(Boolean));
    renderBanner();
    el.querySelectorAll('.tile input').forEach((input) => { input.value = ''; });
    renderChoices();
    clearIssues();
    renderResults();
    if (fields.length) el.querySelector(`#${spec.id}-${fields[0].key}`)?.focus();
  }
  function editValues() {
    const target = fields.length ? el.querySelector('.calculator-inputs') : choicesHost;
    target?.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
    (fields.length ? el.querySelector(`#${spec.id}-${fields[0].key}`) : choicesHost.querySelector('button'))?.focus({ preventScroll: true });
  }
  function renderResults() {
    resultsHost.replaceChildren(...(session.result
      ? [h('section', { class: `results ${session.stale ? 'stale' : ''}` },
        h('div', { class: `calculator-result-state ${session.stale ? 'is-stale' : ''}` },
          h('p', null, session.stale ? 'Previous result · values changed' : fields.length ? 'Result from entered values' : 'Result from selected answers'),
          editValuesButton(editValues, fields.length ? 'Edit values' : 'Edit answers')),
        session.stale ? note('attention', 'Values changed since this result. Tap Calculate to refresh.') : null,
        h('div', { class: 'calculator-result-content' }, spec.render(session.result, ctx)),
        spec.related ? relatedCard(spec.related(session.result, ctx), ctx) : null)]
      : []).flat(Infinity).filter(Boolean));
  }

  el.append(
    bannerHost,
    ...spec.groups.map((group) => h('div', { class: 'card calculator-inputs' },
      h('div', { class: 'card-title' }, group.title),
      h('div', { class: `tiles ${group.fields.length === 2 ? 'two' : ''}` }, group.fields.map((f) => tile(f, session.values[f.key], onInput, onEnter, spec.id))))),
    choicesHost,
    issuesHost,
    resultsHost,
    h('p', { class: 'muted pad-x' }, spec.footnote || 'Entries stay in memory on this device.'));
  renderChoices();
  renderResults();
  renderBanner();

  const footer = h('div', { class: 'actionbar' },
    h('button', { class: 'btn-secondary', type: 'button', onclick: clear }, 'Clear'),
    h('button', { class: 'btn-primary', type: 'button', onclick: calculate }, spec.action || 'Calculate'));
  return { title: spec.shortTitle || spec.title, el, right: starButton(`calc:${spec.id}`, 'calculator favorite'), footer, onUnmount: unsubscribeLabReview };
}
