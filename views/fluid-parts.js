import { h } from '../lib/ui.js';
import { getBagVolumes, chooseBagVolume, fluidContents } from '../lib/fluid-contents.js';

export function bagSelector(drug, value, label, onChange) {
  const select = h('select', { 'aria-label': label, onchange: event => onChange(Number(event.target.value)) },
    getBagVolumes(drug).map(volume => h('option', { value: volume, selected: volume === value }, `${volume} mL bag`)));
  return h('label', { class: 'fluid-select' }, h('span', null, label), select);
}

export function sourceBasis(drug, volume) {
  const basis = drug.contents?.basis;
  if (!basis) return 'Composition is not recorded in this reference.';
  const source = volume === basis.volumeMl
    ? `Source lists ${basis.label}.`
    : `Calculated from the source composition ${basis.label}. Confirm the selected local product has the same formulation.`;
  return volume === 1000 && !getBagVolumes(drug).includes(1000)
    ? `${source} Per litre is a concentration; a 1000 mL bag is not listed for this product.`
    : source;
}

// One contents renderer is shared by the fluid browser and fluid monographs.
export function fluidContentsCard(drug) {
  let volume = chooseBagVolume(drug);
  let basis = volume ? 'bag' : 'litre';
  const result = h('div', { class: 'fluid-composition', 'aria-live': 'polite' });
  const compareLink = h('a', { class: 'fluid-compare-link' }, 'Compare with another fluid →');
  const selector = volume ? bagSelector(drug, volume, 'Bag size', next => { volume = next; render(); }) : null;
  const buttons = new Map();
  const modes = [['bag', 'Each bag'], ['litre', 'Per litre']].filter(([id]) => id !== 'bag' || volume);
  const controls = h('div', { class: 'fluid-basis', role: 'group', 'aria-label': 'Composition basis' }, modes.map(([id, text]) => {
    const button = h('button', { type: 'button', onclick: () => { basis = id; render(); } }, text);
    buttons.set(id, button);
    return button;
  }));
  function render() {
    const shownVolume = basis === 'bag' ? volume : 1000;
    const components = fluidContents(drug, shownVolume);
    compareLink.href = `#/fluids/compare/${drug.id}/${basis === 'bag' ? volume : 'litre'}`;
    for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(id === basis));
    if (selector) selector.hidden = basis !== 'bag';
    result.replaceChildren(
      h('h3', null, basis === 'bag' ? `Each ${volume} mL bag contains` : 'Each litre contains'),
      components ? h('dl', { class: 'fluid-amounts' }, components.map(row => h('div', null,
        h('dt', null, row.name), h('dd', null, h('strong', null, row.display), ' ', row.unit))))
        : h('p', { class: 'muted' }, 'Composition unavailable in the source data.'),
      h('p', { class: 'fluid-source-basis' }, sourceBasis(drug, shownVolume)));
  }
  const el = h('section', { class: 'fluid-contents', 'aria-label': 'Fluid contents' },
    controls, selector, result,
    h('dl', { class: 'fluid-source-facts' },
      drug.osmolarity ? h('div', null, h('dt', null, 'Osmolarity'), h('dd', null, drug.osmolarity)) : null,
      drug.calories ? h('div', null, h('dt', null, 'Energy · source units'), h('dd', null, drug.calories)) : null),
    compareLink);
  render();
  return el;
}
