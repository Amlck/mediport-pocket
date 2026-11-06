import { h, disclosure, formatDate } from '../lib/ui.js';
import { tile, segmentedRow, calculatorScrollBehavior } from './calc-parts.js';
import { patientSession } from '../lib/session.js';
import { LAB_GROUPS, LAB_FIELDS, LAB_CHECK_COUNT, groupLabFindings, reviewLabs } from '../lib/lab-review.js';

// One manual sampling episode, held only in module memory. No URL, storage,
// clipboard or network transport carries these values.
const blank = () => Object.fromEntries(LAB_FIELDS.map(field => [field.key, '']));
const state = { raw: blank(), review: null, editing: true, changed: false, ownPublish: false };
patientSession.onReset(() => {
  state.raw = blank(); state.review = null; state.editing = true; state.changed = false;
});

function currentShared() {
  return Object.fromEntries(LAB_FIELDS.filter(field => patientSession.has(field.key))
    .map(field => [field.key, patientSession.get(field.key)]));
}
let previousShared = currentShared();

// A calculation elsewhere may change this episode. A prior review must never
// look current after a shared input changes; import the changed values visibly.
patientSession.subscribe(() => {
  const shared = currentShared();
  const previous = previousShared;
  previousShared = shared;
  if (state.ownPublish) return;
  let changed = false;
  for (const key of Object.keys(previous)) {
    if (!(key in shared) && state.raw[key] !== '') { state.raw[key] = ''; changed = true; }
  }
  for (const [key, value] of Object.entries(shared)) {
    const field = LAB_FIELDS.find(field => field.key === key);
    const original = String(state.raw[key] ?? '').trim();
    const same = field?.options ? original === String(value) : original !== '' && Number(original) === value;
    if (!same) {
      state.raw[key] = String(value); changed = true;
    }
  }
  if (changed && state.review) {
    state.review = null; state.editing = true; state.changed = true;
  }
});

const TONES = { danger: 'urgent', warn: 'attention', success: 'ok' };
const TITLES = { electrolytes: 'Electrolyte screen', ca: 'Corrected calcium', ag: 'Chemistry anion gap', 'na-free-water': 'Sodium & effective osmolality', 'osmolar-gap': 'Osmolality & osmolar gap', egfr: 'eGFR estimate', abg: 'Arterial blood gas' };

function calculationCard(check, finding = false) {
  return h('article', {
    class: `card lab-check ${finding ? 'lab-finding lab-review-finding' : ''}`,
    'data-check': check.id,
  },
  h('div', { class: 'lab-check-head' },
    h('h3', null, TITLES[check.id] || check.title),
    finding ? h('span', { class: `chip ${TONES[check.severity] || ''}` }, check.severity === 'danger' ? 'Priority review' : 'Review') : null),
  h('p', { class: 'lab-check-summary' }, check.summary),
  check.details?.length ? disclosure('Calculation details', check.details.map(detail => h('p', null, detail))) : null,
  h('a', { class: 'lab-open', href: check.href, 'aria-label': `Open ${check.title}` }, check.href.startsWith('#/guides/') ? 'Open guide' : check.id === 'abg' ? 'Open ABG' : 'Open calculator'));
}

export function labReviewView(ctx) {
  const el = h('div', { class: 'page calculator-page lab-review-page' });
  const form = h('div', { class: 'lab-inputs' });
  const issuesHost = h('div', { class: 'lab-issues', role: 'alert' });
  const status = h('p', { class: 'lab-review-status muted', role: 'status' });
  const results = h('section', { class: 'lab-results lab-review-results', 'aria-label': 'Lab review results' });
  const action = h('button', { class: 'btn-primary', type: 'button', onclick: () => state.editing ? review() : edit() }, 'Review labs');
  const footer = h('div', { class: 'actionbar' },
    h('button', { class: 'btn-secondary', type: 'button', onclick: newPatient }, 'New patient'), action);

  function withOwnPublish(fn) {
    state.ownPublish = true;
    try { fn(); } finally { state.ownPublish = false; }
  }
  function onInput(key, value) {
    state.raw[key] = value;
    const hadReview = Boolean(state.review);
    state.review = null;
    state.changed = state.changed || hadReview;
    withOwnPublish(() => patientSession.invalidateLabs());
    patientSession.markActive();
    issuesHost.replaceChildren();
    el.querySelectorAll('.tile.invalid').forEach(node => node.classList.remove('invalid'));
    renderResults();
  }
  function choiceField(field) {
    const host = h('div');
    const render = () => host.replaceChildren(segmentedRow(field.key === 'sex' ? 'Sex (equation coefficient)' : field.label,
      [['', 'Unspecified'], ...field.options], state.raw[field.key] || '', value => {
        onInput(field.key, value); render();
      }));
    render(); return host;
  }
  function inputGroup(group) {
    const fields = h('div', null,
      h('div', { class: 'tiles two' }, group.fields.filter(field => !field.options).map(field =>
        tile({ ...field, placeholder: '' }, state.raw[field.key] || '', onInput, key => {
          const inputs = [...form.querySelectorAll('input')].filter(input => input.getClientRects().length);
          const index = inputs.findIndex(input => input.id === `lab-review-${key}`);
          if (index < inputs.length - 1) inputs[index + 1].focus(); else review();
        }, 'lab-review'))),
      group.fields.filter(field => field.options).map(choiceField));
    if (group.optional) return h('details', {
      class: 'card calculator-inputs lab-panel', 'data-panel': group.id,
      open: group.fields.some(field => String(state.raw[field.key] ?? '').trim()) || undefined,
    }, h('summary', { class: 'card-title' }, group.title), fields);
    return h('section', { class: 'card calculator-inputs' }, h('h2', { class: 'card-title' }, group.title), fields);
  }
  function renderForm() {
    const sources = [...new Set(patientSession.entries().filter(entry => LAB_FIELDS.some(field => field.key === entry.key)).map(entry => entry.source))];
    form.replaceChildren(
      h('p', { class: 'muted pad-x' }, 'Use one sampling episode. Leave unavailable values blank.'),
      ...(sources.length ? [h('p', { class: 'muted pad-x' }, `Includes session values from ${sources.join(', ')}.`)] : []),
      ...LAB_GROUPS.map(inputGroup),
      issuesHost);
  }
  function renderResults() {
    form.hidden = !state.editing;
    action.textContent = state.editing ? 'Review labs' : 'Edit labs';
    status.textContent = state.changed ? 'Values changed. Review labs to refresh.' : '';
    status.hidden = !status.textContent;
    if (!state.review) { results.replaceChildren(); return; }
    const { findings, checked, incomplete, issues } = state.review;
    const families = groupLabFindings(findings);
    const needed = incomplete.filter(check => check.active !== false);
    const notRun = incomplete.filter(check => check.active === false);
    results.replaceChildren(...[
      h('div', { class: 'lab-result-heading' },
        h('div', null, h('p', { class: 'lab-eyebrow' }, 'This sampling episode'),
          h('h2', { tabindex: '-1' }, families.length ? `${families.length} ${families.length === 1 ? 'area' : 'areas'} to review` : checked.length ? 'Completed results' : 'More information needed'))),
      h('p', { class: 'muted lab-coverage' }, `${findings.length + checked.length} ${findings.length + checked.length === 1 ? 'result' : 'results'} · ${needed.length} checks need information${issues.length ? ' · correct marked inputs' : ''}`),
      ...families.map(family => h('section', { class: 'lab-family', 'data-family': family.id, 'aria-label': family.title },
        h('h2', { class: 'lab-family-title' }, family.title), family.checks.map(check => calculationCard(check, true)))),
      checked.length ? disclosure(`Checked · ${checked.length}`, checked.map(check => calculationCard(check)), { className: 'card lab-coverage-details' }) : null,
      needed.length ? disclosure(`Needs information · ${needed.length}`, needed.map(check => h('div', { class: 'lab-incomplete', 'data-check': check.id },
        h('h3', null, check.title),
        h('p', null, check.message || `Add ${check.missing.map(key => LAB_FIELDS.find(field => field.key === key)?.label || key).join(', ')}.`))), { className: 'card lab-coverage-details' }) : null,
      notRun.length ? disclosure(`Not run · ${notRun.length}`, notRun.map(check => h('div', { class: 'lab-incomplete', 'data-check': check.id },
        h('h3', null, check.title), h('p', null, 'No associated measurements entered.'))), { className: 'card lab-coverage-details' }) : null,
      h('p', { class: 'muted lab-coverage' }, 'Selected checks only. High magnesium and phosphate are not screened.'),
      disclosure('Review scope', [
        h('p', null, `${LAB_CHECK_COUNT} calculator checks plus glucose, potassium and sodium guide-entry bands. Only checks supported by your entries run; a source result is not a complete clinical assessment.`),
        h('p', null, 'AKI trends, DKA/HHS diagnosis and management decisions need additional clinical information. Open the relevant tool to continue.'),
        h('p', null, 'Chemistry and blood-gas bicarbonate are kept separate. ABG here reviews the gas; the chemistry panel supplies the separate anion-gap check.'),
        h('p', { class: 'muted' }, `Reference pack ${ctx.release.version} · built ${formatDate(ctx.release.builtAt.slice(0, 10))}. Packaging date is not a clinical review date.`),
        h('p', { class: 'muted mono-small' }, `Maintained formulas ${ctx.engines.calculators.CALCULATOR_SOURCES.formulas.sha256.slice(0, 16)}… · registry ${ctx.engines.abg.ABG_SOURCE.sha256.slice(0, 16)}…`),
      ], { className: 'card lab-coverage-details' })].filter(Boolean));
  }
  function review() {
    document.activeElement?.blur?.();
    const output = reviewLabs(state.raw, ctx.engines);
    issuesHost.replaceChildren(...output.issues.map(issue => h('p', null, issue.message)));
    el.querySelectorAll('.tile.invalid').forEach(node => node.classList.remove('invalid'));
    for (const issue of output.issues) el.querySelector(`.tile[data-field="${issue.field}"]`)?.classList.add('invalid');
    const hasLabs = LAB_FIELDS.some(field => field.key !== 'age' && !field.options && output.values[field.key] !== null && output.values[field.key] !== undefined);
    if (!hasLabs) {
      if (!output.issues.length) issuesHost.replaceChildren(h('p', null, 'Enter at least one lab value.'));
      state.review = null; renderResults();
      issuesHost.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'center' });
      return;
    }
    withOwnPublish(() => patientSession.replaceLabs(output.values));
    state.review = output; state.changed = false; state.editing = output.issues.length > 0;
    renderResults();
    const heading = results.querySelector('h2');
    if (state.editing) results.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
    else el.closest('.screen')?.scrollTo({ top: 0, behavior: 'instant' });
    heading?.focus({ preventScroll: true });
  }
  function edit() {
    state.editing = true; renderResults();
    form.scrollIntoView({ behavior: calculatorScrollBehavior(), block: 'start' });
    form.querySelector('input')?.focus({ preventScroll: true });
  }
  function newPatient() {
    patientSession.clear();
    issuesHost.replaceChildren();
    renderForm(); renderResults();
  }
  renderForm(); renderResults();
  el.append(h('p', { class: 'lab-intro' }, 'Enter once. Review the relevant findings.'), status, form, results,
    h('p', { class: 'muted pad-x' }, 'Memory only · works offline · New patient clears all entries.'));
  return { title: 'Lab review', el, footer };
}
