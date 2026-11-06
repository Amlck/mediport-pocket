import { h, icon, favorites } from '../lib/ui.js';
import {
  buildSearchIndex, searchIndex, SECTIONS,
  normalizeSearchScope, searchScopeHref, kindsForSearchScope,
} from '../lib/search.js';
import { CATALOGUE } from './calculators.js';

// One box over the whole pack. The ranking lives in lib/search.js; this file
// only draws sections, and keeps the query and the session's recent searches in
// memory (nothing is persisted).

export const searchSession = { query: '', recent: [], focus: false };
const PAGE = 6;
const SCOPE_LABELS = { all: 'All', guide: 'Guides', pocus: 'POCUS', calculator: 'Calculators', drug: 'Drugs' };

let index = null;
function indexFor(ctx) {
  if (!index) index = buildSearchIndex({ drugs: ctx.data.drugs, guides: ctx.data.guides,
    pocus: ctx.data.pocus?.topics || [], pocusScope: ctx.data.pocus?.scope || '', calculators: CATALOGUE,
    drugIndicationLookup: ctx.data.drugIndicationLookup });
  return index;
}

function remember(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  searchSession.recent = [trimmed, ...searchSession.recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
}

// The matched alias leads the second line: it is the part that explains the
// hit, and a long drug class would otherwise push it past the ellipsis.
function resultRow(hit) {
  const { entry, where } = hit;
  const sub = where && !entry.isPocusDetail && !['text', 'indication'].includes(where) ? `“${where}” · ${entry.sub}` : entry.sub;
  const matchLabel = where === 'indication' ? `Matched tag: ${hit.matchedIndications.join(' · ')}`
    : where === 'text' && !entry.isPocusDetail ? 'Found in reference text' : null;
  return h('a', { class: 'row', href: entry.href },
    h('span', { class: 'row-icon' }, icon(entry.icon, 22)),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, entry.title),
      entry.context ? h('div', { class: 'drug-match' }, entry.context) : null,
      matchLabel ? h('div', { class: 'drug-match' }, matchLabel) : null,
      h('div', { class: 'row-sub' }, sub)),
    favorites.has(entry.favoriteId) ? h('span', { class: 'star-inline' }, icon('star-filled', 16)) : null,
    icon('next', 18, 'chev'));
}

// `#/search` searches the whole pack. `#/search/<kind>` starts from a browse
// list with that one kind selected; the route keeps the scope coherent with
// Back and supports direct catalogue links without persisting it.
export function searchView(ctx, [routeKind] = []) {
  const entries = indexFor(ctx);
  const activeKind = normalizeSearchScope(routeKind);
  const shown = new Map(); // section kind → how many rows are expanded
  const resultsEl = h('div', { class: 'stack' });
  const scopesEl = h('div', { class: 'catchips search-scopes', role: 'group', 'aria-label': 'Search scope' });

  function renderScopes() {
    scopesEl.replaceChildren(...[
      { kind: 'all', label: SCOPE_LABELS.all },
      ...SECTIONS.map((section) => ({ kind: section.kind, label: SCOPE_LABELS[section.kind] })),
    ].map((scope) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(activeKind === scope.kind),
      onclick: () => { if (activeKind !== scope.kind) location.hash = searchScopeHref(scope.kind); },
    }, scope.label)));
  }

  const optionsFor = (limitPerSection) => ({ limitPerSection, kinds: kindsForSearchScope(activeKind) });

  const idleState = () => [
    searchSession.recent.length ? [
      h('div', { class: 'letter' }, 'Recent in this session'),
      h('div', { class: 'chips pad-x' }, searchSession.recent.map((query) => h('button', {
        class: 'chip', type: 'button', onclick: () => { input.value = query; setQuery(query); input.focus(); },
      }, query))),
    ] : null,
    h('div', { class: 'card' },
      h('div', { class: 'card-title' }, 'Searches everything in the pack'),
      h('ul', { class: 'checks' },
        h('li', null, `${ctx.data.guides.length} management guides — title, scope and stage names`),
        h('li', null, `${ctx.data.pocus?.topics?.length || 0} POCUS topics — views, findings and pitfalls`),
        h('li', null, `${CATALOGUE.length} calculators — title and what they cover`),
        h('li', null, `${ctx.data.drugs.length} drug monographs — names, brands, indications and aliases in English and Chinese`)),
      h('p', { class: 'muted mt-8' }, activeKind === 'all'
        ? 'Spelling is folded, so haemoglobin finds hemoglobin and K⁺ finds potassium.'
        : `Results will be limited to ${SCOPE_LABELS[activeKind].toLowerCase()}.`)),
  ];

  function sectionBlock(section) {
    const limit = shown.get(section.kind) || PAGE;
    const rows = section.items.slice(0, limit);
    return [
      h('div', { class: 'letter' }, `${section.label} · ${section.total}`),
      section.kind === 'drug' && section.items.some((hit) => hit.where === 'indication')
        ? h('p', { class: 'drug-lookup-note pad-x' }, 'Reference matches · check the monograph.') : null,
      h('div', { class: 'list' }, rows.map(resultRow)),
      section.total > rows.length ? h('div', { class: 'pad-x' }, h('button', {
        class: 'btn-small', type: 'button',
        onclick: () => { shown.set(section.kind, limit + 20); render(); },
      }, `Show ${Math.min(20, section.total - rows.length)} more`)) : null,
    ];
  }

  function render() {
    const query = searchSession.query.trim();
    if (!query) { resultsEl.replaceChildren(...idleState().flat(Infinity).filter(Boolean)); return; }
    const found = searchIndex(entries, query, optionsFor(200));
    if (!found.total) {
      resultsEl.replaceChildren(h('div', { class: 'empty' }, `Nothing in this pack matches “${query}”. Try a shorter word, a drug brand, or part of a topic title.`));
      return;
    }
    resultsEl.replaceChildren(
      h('p', { class: 'muted pad-x' }, `${found.total} result${found.total === 1 ? '' : 's'}${activeKind === 'all' ? ` across ${found.sections.length} section${found.sections.length === 1 ? '' : 's'}` : ` in ${SCOPE_LABELS[activeKind].toLowerCase()}`}`),
      ...found.sections.flatMap(sectionBlock).flat(Infinity).filter(Boolean));
  }

  function setQuery(value) {
    searchSession.query = value;
    shown.clear();
    clearButton.hidden = !value;
    render();
  }

  const input = h('input', {
    type: 'search', placeholder: 'Guide, POCUS, drug…', value: searchSession.query, 'aria-label': 'Search everything',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go',
    oninput: (event) => setQuery(event.target.value),
    onkeydown: (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const query = searchSession.query.trim();
      const first = searchIndex(entries, query, optionsFor(1)).sections[0]?.items[0];
      if (!first) return;
      remember(query);
      input.blur();
      location.hash = first.entry.href;
    },
  });
  const clearButton = h('button', {
    class: 'iconbtn', type: 'button', 'aria-label': 'Clear search', hidden: !searchSession.query,
    onclick: () => { input.value = ''; setQuery(''); input.focus(); },
  }, icon('close', 18));

  // Opening a result is what makes a query worth remembering.
  resultsEl.addEventListener('click', (event) => {
    if (event.target.closest('a.row')) remember(searchSession.query);
  });

  const el = h('div', { class: 'page search-page' },
    h('div', { class: 'searchbar' }, h('div', { class: 'field' }, icon('search', 20), input, clearButton)),
    scopesEl,
    resultsEl);
  renderScopes();
  render();

  const onMount = () => {
    if (!searchSession.query) setTimeout(() => input.focus(), 60);
    searchSession.focus = false;
  };
  return { title: 'Search', el, onMount };
}
