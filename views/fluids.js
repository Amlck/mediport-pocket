import { h, disclosure, note } from '../lib/ui.js';
import { bagSelector, fluidContentsCard, sourceBasis } from './fluid-parts.js';
import { getBagVolumes, chooseBagVolume, compareFluidContents } from '../lib/fluid-contents.js';

const REVIEW_NOTICE = 'Monograph review date is not recorded in the source data. Verify local product, concentration and protocol before use.';
const fluidEntries = ctx => ctx.data.drugs.filter(drug => drug.category === 'fluid');
const short = drug => drug.shortName || drug.name;
const reviewDate = drug => {
  for (const value of [drug.reviewedAt, drug.sourceMetadata?.reviewedAt]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

function productSelect(fluids, selected, label, change) {
  return h('label', { class: 'fluid-select' }, h('span', null, label),
    h('select', { 'aria-label': label, onchange: event => change(event.target.value) },
      fluids.map(drug => h('option', { value: drug.id, selected: drug.id === selected }, drug.name))));
}

function reviewStatus(drug) {
  const reviewedAt = reviewDate(drug);
  return reviewedAt ? h('p', { class: 'fluid-source-basis' }, `Source review date: ${reviewedAt}`) : note('attention', REVIEW_NOTICE);
}

function comparisonReviewStatus(left, right) {
  const status = [['A', left], ['B', right]].map(([side, drug]) => {
    const reviewedAt = reviewDate(drug);
    return `${side} · ${short(drug)}: ${reviewedAt ? `source review date ${reviewedAt}` : 'source review date not recorded'}`;
  });
  return note('attention', `${status.join('; ')}. Confirm the local products and formulations; this comparison does not imply interchangeability.`);
}

function sourceDetails(drug) {
  return disclosure(`${short(drug)} · reference details`, [
    h('p', null, drug.name),
    reviewStatus(drug),
    drug.publicNotes?.length ? h('ul', null, drug.publicNotes.map(text => h('li', null, text))) : null,
    h('a', { class: 'fluid-full-link', href: `#/drugs/${drug.id}` }, 'Open full monograph →'),
  ], { className: 'fluid-details' });
}

export function fluidsView(ctx) {
  const fluids = fluidEntries(ctx);
  let selected = fluids.find(drug => drug.id === 'taita-5') || fluids[0];
  if (!selected) return { title: '點滴 · Fluids', el: h('div', { class: 'page' }, 'No fluid references in this pack.') };
  const content = h('div', { class: 'fluid-product-body' });
  const render = () => {
    const reviewedAt = reviewDate(selected);
    content.replaceChildren(
      h('header', { class: 'fluid-product-heading' }, h('h2', null, selected.name), h('p', null, selected.class),
        h('p', { class: 'fluid-review-label' }, reviewedAt ? `Source review date: ${reviewedAt}` : 'Review date not recorded')),
      fluidContentsCard(selected),
      reviewStatus(selected), sourceDetails(selected));
  };
  const el = h('div', { class: 'page fluids-page' },
    h('p', { class: 'fluid-intro' }, 'See what is in one bag, or compare concentrations per litre.'),
    productSelect(fluids, selected.id, 'Fluid', id => { selected = fluids.find(drug => drug.id === id); render(); }),
    content,
    h('p', { class: 'fluid-source-basis' }, `Reference pack ${ctx.release.version}. Packaging date is not a clinical review date.`));
  render();
  return { title: '點滴 · Fluids', el };
}

export function fluidCompareView(ctx, [initialId, initialBasis]) {
  const fluids = fluidEntries(ctx);
  if (fluids.length < 2) return { title: 'Compare fluids', el: h('div', { class: 'page' }, 'Two fluid references are needed to compare.') };
  let left = fluids.find(drug => drug.id === initialId) || fluids.find(drug => drug.id === 'taita-5') || fluids[0];
  let right = fluids.find(drug => drug.id === 'd5ns' && drug.id !== left.id) || fluids.find(drug => drug.id !== left.id);
  let leftVolume = getBagVolumes(left).includes(Number(initialBasis)) ? Number(initialBasis) : chooseBagVolume(left);
  let rightVolume = chooseBagVolume(right);
  let basis = initialBasis === 'litre' || !leftVolume || !rightVolume ? 'litre' : 'bag';
  const bags = h('div', { class: 'fluid-compare-bags' });
  const results = h('section', { class: 'fluid-comparison', 'aria-live': 'polite', 'aria-label': 'Fluid comparison' });
  const references = h('div', { class: 'fluid-reference-list' });
  const review = h('div');
  const modeButtons = new Map();
  const mode = h('div', { class: 'fluid-basis', role: 'group', 'aria-label': 'Comparison basis' },
    [['bag', 'Per selected bag'], ['litre', 'Per litre']].map(([id, text]) => {
      const button = h('button', { type: 'button', onclick: () => { basis = id; renderBags(); render(); } }, text);
      modeButtons.set(id, button); return button;
    }));
  function renderBags() {
    bags.hidden = basis !== 'bag';
    bags.replaceChildren(
      leftVolume ? bagSelector(left, leftVolume, 'Bag A', value => { leftVolume = value; render(); }) : h('p', null, 'Bag A size not recorded.'),
      rightVolume ? bagSelector(right, rightVolume, 'Bag B', value => { rightVolume = value; render(); }) : h('p', null, 'Bag B size not recorded.'));
  }
  function render() {
    const bagAvailable = getBagVolumes(left).length && getBagVolumes(right).length;
    modeButtons.get('bag').disabled = !bagAvailable;
    if (!bagAvailable) basis = 'litre';
    bags.hidden = basis !== 'bag';
    for (const [id, button] of modeButtons) button.setAttribute('aria-pressed', String(id === basis));
    const a = basis === 'bag' ? leftVolume : 1000;
    const b = basis === 'bag' ? rightVolume : 1000;
    const rows = compareFluidContents(left, right, a, b);
    const cell = value => value ? h('span', null, h('strong', null, value.display)) : h('span', { class: 'fluid-not-listed' }, 'Not listed');
    const table = h('table', { class: 'fluid-compare-table' },
      h('caption', null, basis === 'bag' ? 'Contents per selected bag' : 'Contents per litre'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Component'),
        h('th', { scope: 'col' }, h('span', null, 'A · ', short(left)), h('small', null, basis === 'bag' ? `${a} mL bag` : 'per litre')),
        h('th', { scope: 'col' }, h('span', null, 'B · ', short(right)), h('small', null, basis === 'bag' ? `${b} mL bag` : 'per litre')))),
      h('tbody', null, (rows || []).map(row => h('tr', { class: row.left?.display !== row.right?.display ? 'fluid-different' : null },
        h('th', { scope: 'row' }, row.name, h('small', null, row.unit)), h('td', null, cell(row.left)), h('td', null, cell(row.right))))));
    results.replaceChildren(
      ...(basis === 'bag' && a !== b ? [h('p', { class: 'fluid-volume-note' }, `Different bag volumes: A ${a} mL · B ${b} mL. Use Per litre to compare concentrations.`)] : []),
      rows ? table : h('p', null, 'Composition unavailable for this comparison.'),
      h('p', { class: 'fluid-source-basis' }, 'Not listed means the component is absent from this source table; it does not establish zero content. Shading marks different listed amounts, not clinical suitability.'),
      h('div', { class: 'fluid-comparison-basis' },
        h('p', null, h('strong', null, 'A · '), sourceBasis(left, a)),
        h('p', null, h('strong', null, 'B · '), sourceBasis(right, b))),
      h('table', { class: 'fluid-compare-table fluid-properties' }, h('caption', null, 'Properties · original source units'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Property'),
          h('th', { scope: 'col' }, 'A · ', short(left)), h('th', { scope: 'col' }, 'B · ', short(right)))),
        h('tbody', null,
          h('tr', null, h('th', { scope: 'row' }, 'Osmolarity'), h('td', null, left.osmolarity || 'Not recorded'), h('td', null, right.osmolarity || 'Not recorded')),
          h('tr', null, h('th', { scope: 'row' }, 'Energy'), h('td', null, left.calories || 'Not recorded'), h('td', null, right.calories || 'Not recorded')))));
  }
  function update(side, id) {
    if (side === 'left') { left = fluids.find(drug => drug.id === id); leftVolume = chooseBagVolume(left); }
    else { right = fluids.find(drug => drug.id === id); rightVolume = chooseBagVolume(right); }
    renderBags(); render();
    review.replaceChildren(comparisonReviewStatus(left, right));
    references.replaceChildren(sourceDetails(left), sourceDetails(right));
  }
  const el = h('div', { class: 'page fluids-page' },
    h('p', { class: 'fluid-intro' }, 'Compare two source formulations. Keep the product and bag volume in view.'),
    h('div', { class: 'fluid-product-pickers' },
      productSelect(fluids, left.id, 'Fluid A', id => update('left', id)),
      productSelect(fluids, right.id, 'Fluid B', id => update('right', id))),
    mode, bags, results,
    review,
    references);
  renderBags(); render(); review.replaceChildren(comparisonReviewStatus(left, right)); references.replaceChildren(sourceDetails(left), sourceDetails(right));
  return { title: 'Compare 點滴', el };
}
