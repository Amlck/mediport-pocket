import { h, disclosure, navigate } from '../lib/ui.js';
import { patientSession } from '../lib/session.js';
import {
  comparableDrugs, comparisonReading, comparisonSearch, doseEntries, drugCompareHref, recordedList,
  recordedText, referenceEntries, renalEntries, resolveDrugPair, reviewLabel,
} from '../lib/drug-comparison.js';

patientSession.onReset(() => comparisonReading.clear());

const absent = () => h('p', { class: 'drug-compare-absent' }, 'Not recorded in this entry.');
const list = (items) => items.length ? h('ul', { class: 'drug-compare-list' }, items.map((item) => h('li', null, item))) : absent();
const shortName = (drug) => drug.shortName || drug.name;

function picker({ side, selected, other, drugs, indicationLookup, choose, error, locked = false }) {
  const title = side === 'A' ? 'Drug A' : 'Drug B';
  if (locked) return h('div', { class: 'drug-compare-picker-wrap' },
    h('div', { class: 'drug-compare-picker drug-compare-picker-locked', 'aria-label': `${title}: choose Drug A first` },
      h('span', { class: 'drug-compare-picker-label' }, title),
      h('strong', null, selected ? shortName(selected) : 'Choose Drug A first'),
      selected ? h('small', { class: 'drug-compare-picker-review' }, reviewLabel(selected) || 'Source review date not recorded') : null),
    error ? h('p', { class: 'drug-compare-error', role: 'alert' }, error) : null);
  const results = h('div', { class: 'drug-compare-picker-results', role: 'group', 'aria-label': `${title} choices` });
  const count = h('p', { class: 'drug-compare-picker-count', role: 'status', 'aria-live': 'polite' });
  const query = h('input', {
    type: 'search', placeholder: 'Name, alias or indication', 'aria-label': `Search ${title}`,
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
    oninput: () => renderResults(),
  });
  const details = h('details', { class: 'drug-compare-picker' },
    h('summary', null,
      h('span', { class: 'drug-compare-picker-label' }, title),
      h('strong', null, selected ? shortName(selected) : 'Choose a monograph'),
      selected ? h('small', { class: 'drug-compare-picker-review' }, reviewLabel(selected) || 'Source review date not recorded') : null,
      h('span', { class: 'drug-compare-picker-action' }, selected ? 'Change' : 'Choose')),
    h('div', { class: 'drug-compare-picker-body' }, query, count, results));
  details.addEventListener('toggle', () => { if (details.open) query.focus({ preventScroll: true }); });
  function renderResults() {
    const matches = comparisonSearch(drugs, query.value, indicationLookup);
    const options = matches.map((result) => {
      const drug = result.drug || result;
      const duplicate = drug.id === other?.id;
      return h('button', {
        type: 'button', disabled: duplicate,
        'aria-label': `${drug.name}${duplicate ? `, already ${side === 'A' ? 'Drug B' : 'Drug A'}` : ''}`,
        onclick: () => choose(drug.id),
      }, h('strong', null, drug.name),
      h('small', null, duplicate ? `Already ${side === 'A' ? 'B' : 'A'}` : drug.class || 'Class not recorded'));
    });
    count.textContent = `${options.length} matching monograph${options.length === 1 ? '' : 's'}`;
    results.replaceChildren(...(options.length ? options : [h('p', { class: 'drug-compare-absent' }, 'No matching monographs in this pack.') ]));
  }
  renderResults();
  return h('div', { class: 'drug-compare-picker-wrap' }, details,
    error ? h('p', { class: 'drug-compare-error', role: 'alert' }, error) : null);
}

function sideBlock(side, drug, body) {
  return h('article', { class: 'drug-compare-side', 'aria-label': `${side} · ${drug.name}` },
    h('h3', null, h('span', { class: 'drug-compare-letter' }, side), shortName(drug)), body);
}

function fieldSection(title, left, right, render, { open = true, className = '', caption = '' } = {}) {
  const details = disclosure(
    h('h2', null, title),
    [caption ? h('p', { class: 'drug-compare-caption' }, caption) : null,
      h('div', { class: 'drug-compare-pair' },
        sideBlock('A', left, render(left)), sideBlock('B', right, render(right)))],
    { open, className: 'drug-compare-disclosure' });
  details.dataset.comparisonSection = title;
  return h('section', { class: `drug-compare-field ${className}` }, details);
}

function identity(drug) {
  return h('div', { class: 'drug-compare-identity' },
    h('p', null, drug.name),
    drug.shortName && !drug.name.toLowerCase().includes(drug.shortName.toLowerCase())
      ? h('p', null, `Short name: ${drug.shortName}`) : null,
    h('p', null, `Class: ${recordedText(drug.class) || 'Not recorded in this entry'}`),
    h('p', null, `Category: ${recordedText(drug.category) || 'Not recorded in this entry'}`),
    recordedList(drug.aliases).length ? h('p', null, `Also known as: ${recordedList(drug.aliases).join(', ')}`) : null,
    recordedText(drug.subcategory) ? h('p', null, `Source subgroup: ${drug.subcategory}`) : null,
    drug.badge ? h('p', null, `Source badge: ${drug.badge}`) : null,
    h('p', { class: 'drug-compare-review' }, reviewLabel(drug) || 'Source review date not recorded'));
}

function doses(drug) {
  const entries = doseEntries(drug);
  return entries.length ? h('dl', { class: 'drug-compare-dl' }, entries.map(({ label, value }) =>
    h('div', null, h('dt', null, label), h('dd', null, value)))) : absent();
}

function renal(drug) {
  const entries = renalEntries(drug);
  return entries.length ? h('dl', { class: 'drug-compare-dl drug-compare-renal' }, entries.map(({ crcl, regimen }) =>
    h('div', null, h('dt', null, crcl), h('dd', null, regimen)))) : absent();
}

function spectrum(drug) {
  const tags = recordedList(drug.indicationTags);
  return h('div', { class: 'drug-compare-spectrum' },
    h('p', { class: 'drug-compare-subhead' }, 'Source spectrum / indications'),
    recordedText(drug.spectrum) ? h('p', null, drug.spectrum) : absent(),
    h('p', { class: 'drug-compare-subhead' }, 'Indication lookup tags'),
    tags.length ? h('p', { class: 'drug-compare-tags' }, tags.join(' · ')) : absent());
}

function sources(drug, pair) {
  const refs = referenceEntries(drug);
  return h('div', null,
    refs.length ? h('ul', { class: 'drug-compare-list' }, refs.map((ref) => h('li', null,
      ref.url ? h('a', { class: 'drug-compare-source-link', href: ref.url, target: '_blank', rel: 'noopener noreferrer' }, ref.text)
        : h('span', null, ref.text)))) : absent(),
    refs.some((ref) => ref.url) ? h('p', { class: 'drug-compare-online-note' }, 'Links open online outside the offline pack.') : null,
    h('a', { class: 'drug-compare-monograph', href: `#/drugs/${drug.id}?compare=${encodeURIComponent(pair.left.id)},${encodeURIComponent(pair.right.id)}` },
      `Open ${shortName(drug)} monograph`));
}

export function drugCompareView(ctx, [leftId, rightId] = []) {
  const drugs = comparableDrugs(ctx.data.drugs);
  const pair = resolveDrugPair(drugs, leftId, rightId);
  const canCompare = pair.left && pair.right && !pair.samePair;
  const readingGeneration = comparisonReading.generation();
  const savedReading = canCompare ? comparisonReading.get(pair.left.id, pair.right.id) : null;
  const pickerStatus = h('p', { class: 'drug-compare-error', role: 'alert', 'aria-live': 'polite' });
  const choose = (side, id) => {
    const other = side === 'A' ? pair.right : pair.left;
    if (id === other?.id) {
      pickerStatus.textContent = 'Choose two different monographs.';
      return;
    }
    navigate(side === 'A' ? drugCompareHref(id, pair.right?.id) : drugCompareHref(pair.left?.id, id));
  };
  const pickers = h('div', { class: 'drug-compare-pickers', 'aria-label': 'Choose two drugs' },
    picker({ side: 'A', selected: pair.left, other: pair.right, drugs, indicationLookup: ctx.data.drugIndicationLookup,
      choose: (id) => choose('A', id), error: pair.leftError }),
    picker({ side: 'B', selected: pair.right, other: pair.left, drugs, indicationLookup: ctx.data.drugIndicationLookup,
      choose: (id) => choose('B', id), error: pair.rightError, locked: !pair.left }));
  const fields = canCompare ? [
    fieldSection('Identity & source review', pair.left, pair.right, identity, { open: false }),
    fieldSection('Dose', pair.left, pair.right, doses),
    fieldSection('Renal adjustment', pair.left, pair.right, renal, { caption: 'CrCl · mL/min; other contexts retain their source labels.' }),
    fieldSection('Spectrum & indications', pair.left, pair.right, spectrum),
    fieldSection('Side effects', pair.left, pair.right, (drug) => list(recordedList(drug.sideEffects)), { open: false }),
    fieldSection('Monitoring', pair.left, pair.right, (drug) => list(recordedList(drug.monitoring)), { open: false }),
    fieldSection('Notes', pair.left, pair.right, (drug) => list(recordedList(drug.publicNotes)), { open: false }),
    fieldSection('Sources', pair.left, pair.right, (drug) => sources(drug, pair), { open: false }),
  ] : [];
  const fieldDetails = fields.map((field) => field.querySelector('details[data-comparison-section]'));
  if (savedReading) for (const details of fieldDetails) {
    details.open = savedReading.openSections.includes(details.dataset.comparisonSection);
  }
  const el = h('div', { class: 'page drug-comparison-page' },
    // App-level reference-return integration may prepend a guide banner here.
    h('div', { class: 'drug-compare-return-host', dataset: { drugGuideReturnHost: '' } }),
    h('p', { class: 'drug-compare-intro' }, 'Compare the wording in two monographs. Doses and renal rows retain their source labels.'),
    h('a', { class: 'drug-compare-fluid-link', href: '#/fluids/compare' }, 'Comparing fluids? Open fluid comparison'),
    pickers,
    h('div', { class: 'drug-compare-actions' },
      h('button', { type: 'button', disabled: !canCompare, onclick: () => navigate(drugCompareHref(pair.right.id, pair.left.id)) }, 'Swap A and B')),
    pickerStatus,
    pair.samePair ? h('p', { class: 'drug-compare-error', role: 'alert' }, 'This link names the same monograph twice. Change A or B to compare two different entries.') : null,
    canCompare ? h('div', { class: 'drug-compare-fields', 'aria-label': 'Monograph comparison' }, fields)
      : h('p', { class: 'drug-compare-prompt' }, 'Choose two different monographs to see their source fields.'),
    canCompare ? h('p', { class: 'drug-compare-scope' }, 'Reference text only. Confirm the indication, formulation, local product and source before applying either entry.') : null);
  let restoreFrame = 0;
  const onMount = () => {
    if (!savedReading) return;
    restoreFrame = requestAnimationFrame(() => {
      restoreFrame = 0;
      const screen = el.closest('.screen');
      if (screen) screen.scrollTop = savedReading.scrollTop;
    });
  };
  const onUnmount = () => {
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    if (!canCompare) return;
    comparisonReading.save(pair.left.id, pair.right.id, {
      openSections: fieldDetails.filter((details) => details.open).map((details) => details.dataset.comparisonSection),
      scrollTop: el.closest('.screen')?.scrollTop || 0,
    }, readingGeneration);
  };
  return { title: 'Compare drugs', el, onMount, onUnmount };
}
