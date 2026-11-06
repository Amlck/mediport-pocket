import { h } from './ui.js';
import { patientSession } from './session.js';

// A return trail is earned by opening a reference from an action. It is never
// reconstructed from a URL, persisted, or shared with another tab.
export function createReferenceTrail() {
  let guide = null;
  return {
    start({ id, title }) { guide = { id, title }; },
    current() { return guide ? { ...guide } : null; },
    clear(id) { if (!id || guide?.id === id) guide = null; },
    observe(path) {
      if (!guide) return;
      const isDrug = /^\/drugs\/(?!compare$)[\w.-]+$/.test(path);
      const isComparison = /^\/drugs\/compare(?:\/[\w.-]+(?:\/[\w.-]+)?)?$/.test(path);
      if (path !== `/guides/${guide.id}` && !isDrug && !isComparison) guide = null;
    },
  };
}

export const referenceNavigation = createReferenceTrail();
patientSession.onReset(() => referenceNavigation.clear());

export function guideReturnLink() {
  const guide = referenceNavigation.current();
  return guide ? h('a', { class: 'reference-return', href: `#/guides/${guide.id}` }, `Return to ${guide.title}`) : null;
}

export function comparisonReturnHref(drugs, hash, currentDrugId) {
  const query = new URLSearchParams(String(hash).split('?')[1] || '');
  if (query.getAll('compare').length !== 1) return null;
  const ids = query.get('compare').split(',');
  const available = new Set(drugs.filter((drug) => drug.category !== 'fluid').map((drug) => drug.id));
  if (ids.length > 2 || new Set(ids).size !== ids.length || !ids.includes(currentDrugId)
    || ids.some((id) => !/^[\w.-]+$/.test(id) || !available.has(id))) return null;
  return `#/drugs/compare/${ids.join('/')}`;
}
