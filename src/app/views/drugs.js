import { h, icon, favorites, starButton, disclosure, listOrText, note } from '../lib/ui.js';
import { patientSession } from '../lib/session.js';
import { fluidContentsCard } from './fluid-parts.js';
import { buildSearchIndex, searchIndex } from '../lib/search.js';
import { comparisonReturnHref } from '../lib/reference-navigation.js';
import { doseEntries, reviewLabel } from '../lib/drug-comparison.js';

export const drugSession = { query: '', category: 'all', indication: '', focus: false };

const CATEGORY_LABELS = {
  antimicrobial: 'Antimicrobial', cardiovascular: 'Cardiovascular', 'critical-care': 'Critical care', metabolic: 'Metabolic',
  fluid: 'Fluids', anticoagulant: 'Anticoagulant', electrolyte: 'Electrolyte', neuropsych: 'Neuro / psych', hypnotic: 'Hypnotic',
  laxative: 'Laxative', nsaid: 'NSAID', steroid: 'Steroid', gi: 'GI', insulin: 'Insulin', analgesic: 'Analgesic',
  respiratory: 'Respiratory', antiplatelet: 'Antiplatelet', toxicity: 'Antidote',
};
const label = (category) => CATEGORY_LABELS[category] || category;

function drugRow(drug, hit = null) {
  // A selected filter is already named above the list. When a query is active,
  // explain that query's match rather than relabelling a text hit as a tag hit.
  const tags = hit ? (hit.matchedIndications || []) : drugSession.indication ? [drugSession.indication] : [];
  const matchLabel = tags.length ? `Matched tag: ${tags.join(' · ')}`
    : hit?.where === 'text' ? 'Found in reference text'
      : hit?.where ? `Alias: ${hit.where}` : null;
  return h('a', { class: 'row', href: `#/drugs/${drug.id}` },
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, drug.name, drug.shortName && !drug.name.toLowerCase().includes(drug.shortName.toLowerCase())
        ? h('span', { class: 'row-short' }, drug.shortName) : null),
      matchLabel ? h('div', { class: 'drug-match' }, matchLabel) : null,
      h('div', { class: 'drug-row-meta' }, h('div', { class: 'row-sub' }, drug.class),
        drug.badge ? h('span', { class: 'badge' }, drug.badge) : null)),
    favorites.has(`drug:${drug.id}`) ? h('span', { class: 'star-inline' }, icon('star-filled', 16)) : null,
    icon('next', 18, 'chev'));
}

function buildList(drugs, index, status) {
  const q = drugSession.query.trim();
  const inCategory = drugs.filter((drug) => (drugSession.category === 'all' || drug.category === drugSession.category)
    && (!drugSession.indication || drug.indicationTags?.includes(drugSession.indication)));
  if (q) {
    const available = new Map(inCategory.map((drug) => [drug.id, drug]));
    const ranked = (searchIndex(index, q).sections[0]?.items || []).filter((hit) => available.has(hit.entry.id));
    status.textContent = `${ranked.length} match${ranked.length === 1 ? '' : 'es'}`;
    if (!ranked.length) return [h('div', { class: 'empty' }, `No match for “${q}”${drugSession.category !== 'all' || drugSession.indication ? ' with these filters' : ' in this pack'}. Try a drug name or another indication.`)];
    return [ranked.some((hit) => hit.matchedIndications?.length) || drugSession.indication
      ? h('p', { class: 'drug-lookup-note' }, 'Reference matches · check the monograph.') : null,
    h('div', { class: 'list' }, ranked.map((hit) => drugRow(available.get(hit.entry.id), hit)))];
  }
  status.textContent = `${inCategory.length} monograph${inCategory.length === 1 ? '' : 's'}`;
  if (!inCategory.length) return [h('div', { class: 'empty' }, 'No monographs match these filters.')];
  if (drugSession.indication) return [h('p', { class: 'drug-lookup-note' }, 'Reference matches · check the monograph.'),
    h('div', { class: 'list' }, inCategory.map((drug) => drugRow(drug)))];
  const favs = inCategory.filter((d) => favorites.has(`drug:${d.id}`));
  const groups = new Map();
  for (const drug of inCategory) {
    const letter = /^[a-z]/i.test(drug.name) ? drug.name[0].toUpperCase() : '#';
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(drug);
  }
  return [
    favs.length ? [h('div', { class: 'letter' }, 'Favorites'), h('div', { class: 'list' }, favs.map((drug) => drugRow(drug)))] : null,
    [...groups.entries()].map(([letter, items]) => [h('div', { class: 'letter' }, letter), h('div', { class: 'list' }, items.map((drug) => drugRow(drug)))]),
  ];
}

export function drugsView(ctx) {
  const drugs = ctx.data.drugs;
  const index = buildSearchIndex({ drugs, drugIndicationLookup: ctx.data.drugIndicationLookup });
  const fluidCount = drugs.filter((drug) => drug.category === 'fluid').length;
  const counts = drugs.reduce((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {});
  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const fluidLinks = fluidCount ? h('nav', { class: 'drug-fluid-links', 'aria-label': 'Fluid references' },
    h('a', { href: '#/fluids' }, h('strong', null, '點滴 · Fluids'), h('span', null, `${fluidCount} formulations · contents and bag sizes`), icon('next', 18)),
    h('a', { href: '#/fluids/compare' }, h('strong', null, 'Compare'), h('span', null, 'Two fluids side by side'), icon('next', 18))) : null;
  const listEl = h('div', { class: 'stack' });
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const renderList = () => {
    resetFilters.hidden = drugSession.category === 'all' && !drugSession.indication;
    if (fluidLinks) fluidLinks.hidden = !!drugSession.query.trim() || !!drugSession.indication || !['all', 'fluid'].includes(drugSession.category);
    listEl.replaceChildren(...buildList(drugs, index, status).flat(Infinity).filter(Boolean));
  };

  const input = h('input', {
    type: 'search', placeholder: 'Name or indication', value: drugSession.query, 'aria-label': 'Search drugs',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
    oninput: (event) => { drugSession.query = event.target.value; clearButton.hidden = !drugSession.query; renderList(); },
  });
  const clearButton = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Clear search', hidden: !drugSession.query,
    onclick: () => { drugSession.query = ''; input.value = ''; clearButton.hidden = true; renderList(); input.focus(); } }, icon('close', 18));

  const chipsEl = h('div', { class: 'catchips', role: 'group', 'aria-label': 'Category' });
  const renderChips = () => chipsEl.replaceChildren(...['all', ...categories].map((category) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(drugSession.category === category),
    onclick: () => { drugSession.category = category; renderChips(); renderList(); },
  }, category === 'all' ? `All ${drugs.length}` : `${label(category)} ${counts[category]}`)));

  const tagCounts = new Map();
  for (const drug of drugs) for (const tag of new Set(drug.indicationTags || [])) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  const taggedCount = drugs.filter((drug) => drug.indicationTags?.length).length;
  const tagTitle = h('span');
  const tagButtons = h('div', { class: 'drug-indication-options', role: 'group', 'aria-label': 'Indication' });
  const indicationPicker = disclosure(tagTitle, [
    h('p', { class: 'drug-lookup-note' }, `Curated tags for ${taggedCount} of ${drugs.length} monographs. Search also accepts English and Chinese terms.`),
    tagButtons,
  ], { className: 'drug-indication-picker' });
  const renderIndications = () => {
    tagTitle.textContent = drugSession.indication ? `Indication: ${drugSession.indication}` : 'Browse indications';
    tagButtons.replaceChildren(...['', ...[...tagCounts.keys()].sort((a, b) => a.localeCompare(b))].map((tag) => h('button', {
      type: 'button', 'aria-pressed': String(drugSession.indication === tag),
      onclick: () => {
        drugSession.indication = tag;
        renderIndications(); renderList();
        indicationPicker.open = false;
        indicationPicker.querySelector('summary').focus({ preventScroll: true });
        indicationPicker.scrollIntoView({ block: 'nearest' });
      },
    }, h('span', null, tag || 'All indications'), tag ? h('span', { class: 'drug-indication-count' }, String(tagCounts.get(tag))) : null)));
  };
  const resetFilters = h('button', { type: 'button', class: 'btn-small', hidden: true,
    onclick: () => {
      drugSession.category = 'all'; drugSession.indication = '';
      renderChips(); renderIndications(); renderList();
      input.focus();
    } }, 'Clear filters');

  const el = h('div', { class: 'page drug-browse' },
    h('div', { class: 'searchbar' }, h('div', { class: 'field' }, icon('search', 20), input, clearButton)),
    h('a', { class: 'drug-compare-link', href: '#/drugs/compare' }, 'Compare two drugs'),
    fluidLinks,
    tagCounts.size ? indicationPicker : null,
    chipsEl,
    h('div', { class: 'drug-filter-status' }, status, resetFilters),
    listEl);
  renderChips();
  renderIndications();
  renderList();
  let focusTimer;
  const onMount = () => {
    if (drugSession.focus) {
      drugSession.focus = false;
      focusTimer = setTimeout(() => { focusTimer = null; input.focus(); }, 60);
    }
  };
  const onUnmount = () => { if (focusTimer) clearTimeout(focusTimer); };
  return { title: 'Drugs', subtitle: `${drugs.length} monographs`, el, onMount, onUnmount };
}

const REVIEW_NOTICE = 'Monograph review date is not recorded in the source data. Verify local product, concentration and protocol before use.';

function doseSection(drug) {
  const entries = doseEntries(drug);
  return h('section', { class: 'drug-section drug-dose', id: 'drug-dose' },
    h('h2', { tabindex: '-1' }, 'Dose'),
    entries.length ? h('dl', { class: 'drug-dose-list' }, entries.map(({ label, value }) => h('div', { class: 'drug-dose-entry' },
      h('dt', null, label), h('dd', null, value)))) : null,
    contentsBlock(drug));
}

// The renal table highlights the row a session CrCl lands on, using the same
// matcher the desktop panel uses (CALCULATOR_FORMULAS.renalTable). A CrCl near
// a cutoff shows the adjacent rows instead of picking one.
function renalSection(drug, ctx) {
  if (!Array.isArray(drug.renalAdj) || !drug.renalAdj.length) return null;
  const crcl = patientSession.has('crcl') ? Number(patientSession.get('crcl')) : null;
  const table = ctx.engines.calculators?.CALCULATOR_FORMULAS?.renalTable;
  const match = crcl !== null && table ? table.matchRenalAdjustmentRow(drug.renalAdj, crcl) : null;
  const near = match && match.index >= 0 ? drug.renalAdj.some((row) => {
    const bounds = table.parseRenalAdjustmentBounds(row.crcl);
    return bounds && [bounds.min, bounds.max].some((b) => Number.isFinite(b) && Math.abs(crcl - b) <= Math.max(2, Math.abs(b) * 0.1));
  }) : false;
  return h('section', { class: 'drug-section drug-renal', id: 'drug-renal' },
    h('h2', { tabindex: '-1' }, 'Renal adjustment'),
    h('div', { class: 'drug-renal-tools' },
      h('span', null, 'CrCl · mL/min'),
      h('a', { href: '#/calc/crcl' }, 'Estimate CrCl')),
    // Long source labels describe clinical contexts as well as numeric bands.
    // Keep each label paired with its exact regimen, using a full-width label
    // when a compact two-column row would squeeze either side on a phone.
    h('dl', { class: 'drug-renal-list', 'aria-label': 'Renal adjustment reference' }, drug.renalAdj.map((row, index) => h('div', {
      class: `drug-renal-entry${String(row.crcl).length > 14 ? ' stacked' : ''}${match && match.index === index ? ' matched' : ''}`,
    }, h('dt', null, row.crcl), h('dd', null, row.regimen)))),
    match ? note(match.index >= 0 ? (near ? 'attention' : 'info') : 'attention',
      match.index >= 0
        ? `Row for CrCl ${crcl} mL/min from the ${patientSession.source('crcl')} page${near ? ' — near a cutoff; verify the boundary in the drug table' : ''}. Reference only; confirm the derivation and indication.`
        : `Session CrCl ${crcl} mL/min did not map to a row (dialysis or special rows are not auto-matched).`) : h('p', { class: 'muted mt-6' }, 'Estimate CrCl to highlight the matching row.'));
}

// Unit scaling only: the source lists a fluid per bag or per litre, the table
// shows both. Nothing clinical is derived here.
function scaled(amount, fromMl, toMl) {
  const value = amount * toMl / fromMl;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function contentsBlock(drug) {
  if (drug.category === 'fluid') return fluidContentsCard(drug);
  const contents = drug.contents;
  if (!contents?.components?.length) return null;
  const basisMl = contents.basis.volumeMl;
  const perLitre = basisMl === 1000;
  const bagMl = perLitre ? null : basisMl;
  return h('div', { class: 'drug-contents' },
    h('h3', null, 'Contents'),
    h('div', { class: 'drug-contents-table' }, h('table', { class: 'contents' },
      h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'per L'), bagMl ? h('th', null, `per ${bagMl} mL bag`) : null)),
      h('tbody', null, contents.components.map((row) => h('tr', null,
        h('td', { class: 'ion' }, row.name),
        h('td', { class: 'num' }, perLitre ? String(row.amount) : scaled(row.amount, basisMl, 1000), h('span', { class: 'unit' }, ` ${row.unit}`)),
        bagMl ? h('td', { class: 'num' }, String(row.amount), h('span', { class: 'unit' }, ` ${row.unit}`)) : null))))),
    h('p', { class: 'muted mt-6' }, `Source lists ${contents.basis.label}.${bagMl ? ' The per-litre column is that amount scaled.' : ''}`),
    h('div', { class: 'kv mt-8' },
      drug.osmolarity ? h('div', null, h('div', { class: 'k' }, 'Osmolarity'), h('div', { class: 'v' }, drug.osmolarity)) : null,
      drug.calories ? h('div', null, h('div', { class: 'k' }, 'Calories'), h('div', { class: 'v' }, drug.calories)) : null,
      drug.sizes?.length ? h('div', null, h('div', { class: 'k' }, 'Bag sizes'), h('div', { class: 'v' }, drug.sizes.join(' · '))) : null));
}

function informationSection(title, value, { id, open = false, subgroup } = {}) {
  if (value === undefined || value === null || (Array.isArray(value) && !value.length)) return null;
  return h('section', { class: 'drug-section drug-information', id }, disclosure(
    h('h2', null, title),
    [listOrText(value), subgroup ? h('p', { class: 'drug-source-field' }, 'Source subgroup: ', subgroup) : null],
    { open, className: 'drug-disclosure' }));
}

function sourcesSection(drug) {
  const references = (Array.isArray(drug.references) ? drug.references : []).filter((ref) => typeof ref?.text === 'string' && ref.text.trim());
  const linked = references.some((ref) => typeof ref.url === 'string' && ref.url.startsWith('https://'));
  return h('section', { class: 'drug-section drug-information', id: 'drug-sources' }, disclosure(
    h('h2', null, 'Sources'),
    [references.length ? references.map((ref) => typeof ref.url === 'string' && ref.url.startsWith('https://')
      ? h('a', { class: 'reflink', href: ref.url, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 16), ref.text)
      : h('p', { class: 'drug-source-text' }, ref.text))
      : h('p', null, 'No reference attributions are listed in this entry.'),
    linked ? h('p', { class: 'muted' }, 'Links open online and are not part of the offline pack.') : null,
    drug.aliases?.length ? h('p', { class: 'drug-source-field' }, 'Also known as: ', drug.aliases.join(', ')) : null,
    drug.indicationTags?.length ? h('p', { class: 'drug-source-field' }, 'Indication lookup tags: ', drug.indicationTags.join(' · ')) : null,
    !drug.spectrum && drug.subcategory ? h('p', { class: 'drug-source-field' }, 'Source subgroup: ', drug.subcategory) : null],
    { className: 'drug-disclosure' }));
}

function reviewStatus(drug) {
  const label = reviewLabel(drug);
  if (label) {
    return h('p', { class: 'drug-review-recorded' }, label);
  }
  const warning = note('attention', REVIEW_NOTICE);
  warning.classList.add('drug-review');
  return warning;
}

export function drugDetailView(ctx, [id]) {
  const drug = ctx.data.drugs.find((d) => d.id === id);
  if (!drug) {
    return { title: 'Drug', el: h('div', { class: 'page' }, note('attention', 'This monograph is not in the installed pack.')) };
  }
  const dose = doseSection(drug);
  const renal = renalSection(drug, ctx);
  const monitoring = informationSection('Monitoring', drug.monitoring, { id: 'drug-monitoring' });
  const sources = sourcesSection(drug);
  const compareReturn = comparisonReturnHref(ctx.data.drugs, location.hash, drug.id);
  const targets = [
    ['Dose', dose], ['Renal', renal], ['Monitoring', monitoring], ['Sources', sources],
  ].filter(([, target]) => target);
  const buttons = new Map();
  let pendingJumpId = null;
  const setCurrent = (current) => {
    for (const [id, button] of buttons) {
      if (id === current) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
  };
  const jump = (target) => {
    pendingJumpId = target.id;
    setCurrent(pendingJumpId);
    const details = target.querySelector('details');
    if (details) details.open = true;
    const heading = target.querySelector('summary, h2');
    heading?.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };
  const nav = h('nav', { class: 'drug-jumps', 'aria-label': 'Monograph sections' }, targets.map(([name, target]) => {
    const button = h('button', { type: 'button', onclick: () => jump(target) }, name);
    buttons.set(target.id, button);
    return button;
  }));
  const el = h('div', { class: 'page drug-detail' },
    compareReturn ? h('a', { class: 'comparison-return', href: compareReturn }, 'Return to comparison') : null,
    h('header', { class: 'drug-intro' },
      h('p', { class: 'drug-class' }, drug.class),
      drug.shortName && !drug.name.toLowerCase().includes(drug.shortName.toLowerCase())
        ? h('p', { class: 'drug-short-name' }, 'Short name: ', drug.shortName) : null,
      h('div', { class: 'drug-tags' },
        h('span', { class: 'chip' }, label(drug.category)),
        drug.badge ? h('span', { class: 'chip' }, drug.badge) : null)),
    drug.category !== 'fluid' && !compareReturn
      ? h('a', { class: 'drug-compare-link', href: `#/drugs/compare/${drug.id}` }, 'Compare with another drug') : null,
    reviewStatus(drug),
    nav,
    dose,
    renal,
    informationSection('Spectrum / indications', drug.spectrum, { open: true, subgroup: drug.subcategory }),
    informationSection('Side effects', drug.sideEffects),
    monitoring,
    informationSection('PK / PD', drug.pkpd),
    informationSection('Mechanism', drug.mechanism),
    informationSection('Notes', drug.publicNotes),
    sources);
  let screen;
  let scrollFrame = 0;
  let topbarObserver;
  const markCurrent = () => {
    scrollFrame = 0;
    if (!screen) return;
    const readingLine = screen.getBoundingClientRect().top + Math.min(150, screen.clientHeight * 0.28);
    let current = targets[0]?.[1].id || null;
    for (const [, section] of targets) {
      if (section.getBoundingClientRect().top <= readingLine) current = section.id;
    }
    setCurrent(pendingJumpId || current);
  };
  const onScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(markCurrent);
  };
  const onManualIntent = () => {
    if (pendingJumpId) {
      pendingJumpId = null;
      onScroll();
    }
  };
  const onManualKey = (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab'].includes(event.key)) onManualIntent();
  };
  const onMount = () => {
    screen = el.closest('.screen');
    screen?.classList.add('drug-screen');
    const topbar = screen?.querySelector(':scope > .topbar');
    const measureTopbar = () => {
      if (topbar) el.style.setProperty('--drug-topbar-h', `${topbar.getBoundingClientRect().height}px`);
    };
    measureTopbar();
    if (topbar && typeof ResizeObserver !== 'undefined') {
      topbarObserver = new ResizeObserver(measureTopbar);
      topbarObserver.observe(topbar);
    }
    screen?.addEventListener('scroll', onScroll, { passive: true });
    screen?.addEventListener('wheel', onManualIntent, { passive: true });
    screen?.addEventListener('touchstart', onManualIntent, { passive: true });
    screen?.addEventListener('pointerdown', onManualIntent, { passive: true });
    document.addEventListener('keydown', onManualKey);
    onScroll();
  };
  const onUnmount = () => {
    screen?.removeEventListener('scroll', onScroll);
    screen?.removeEventListener('wheel', onManualIntent);
    screen?.removeEventListener('touchstart', onManualIntent);
    screen?.removeEventListener('pointerdown', onManualIntent);
    document.removeEventListener('keydown', onManualKey);
    screen?.classList.remove('drug-screen');
    topbarObserver?.disconnect();
    topbarObserver = null;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    screen = null;
  };
  return { title: drug.name, el, right: starButton(`drug:${drug.id}`, 'drug favorite'), onMount, onUnmount };
}
