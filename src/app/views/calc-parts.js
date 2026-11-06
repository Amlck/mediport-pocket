import { h, icon, disclosure } from '../lib/ui.js';
import { patientSession } from '../lib/session.js';

// Building blocks shared by every calculator page (ABG set the pattern): numeric
// tiles, a branch list with the fired branch lit, the formula and the substituted
// values, timeline steps, the conclusion band and the engine's caveats. Nothing in
// here decides anything clinical; pages pass in codes the engines returned.

export const SEVERITY = { danger: ['urgent', 'Marked derangement'], warn: ['attention', 'Abnormal'], success: ['ok', 'Within reference'] };
export const TONE = { danger: 'urgent', warn: 'attention', success: 'ok' };

export function tile(field, value, onInput, onEnter, idPrefix) {
  const id = `${idPrefix}-${field.key}`;
  return h('div', { class: 'tile', 'data-field': field.key },
    h('label', { for: id }, field.label),
    h('input', {
      id, type: 'text', inputmode: field.inputmode || 'decimal', autocomplete: 'off', value,
      'aria-label': `${field.label}${field.unit ? ' ' + field.unit.split(' ·')[0] : ''}`,
      enterkeyhint: onEnter ? 'next' : 'done', placeholder: field.placeholder,
      oninput: (event) => onInput(field.key, event.target.value),
      onkeydown: (event) => { if (event.key === 'Enter' && onEnter) onEnter(field.key); },
    }),
    h('span', { class: 'unit' }, field.unit || ' '));
}

export function branches(list, activeId, subLabel, { showMatch = false } = {}) {
  return h('ol', { class: 'branches', role: 'list' }, list.map((b) => {
    const on = b.id === activeId;
    return h('li', { class: `branch ${on ? 'on' : ''}`, 'aria-current': on ? 'true' : null },
      h('span', { class: 'branch-label' }, b.label, on && showMatch ? h('span', { class: 'branch-match' }, 'Matched') : null),
      h('span', { class: 'branch-rule' }, on && subLabel ? subLabel : b.rule));
  }));
}

export function formula(text) { return h('div', { class: 'formula' }, text); }
export function values(text) { return h('div', { class: 'tvalues' }, text); }
export function summary(text) { return h('p', { class: 'tsummary' }, text); }

export function step(n, title, tone, body, { muted = false } = {}) {
  return h('li', { class: `tstep ${muted ? 'muted-step' : ''}` },
    h('span', { class: `tnode ${tone || ''}`, 'aria-hidden': 'true' }, String(n)),
    h('div', { class: 'tcard' }, h('h3', null, title), body));
}

export function timeline(...steps) {
  return h('ol', { class: 'timeline', role: 'list' }, steps);
}

export function conclusion(text, label = 'Conclusion') {
  return h('div', { class: 'conclusion' }, h('span', { class: 'k' }, label), h('span', { class: 'v' }, text));
}

export function caveats(list, title = 'Limits') {
  return list?.length ? disclosure(title, h('ul', null, list.map((c) => h('li', null, c))), { className: 'calc-disclosure' }) : null;
}

// Rows with a status chip each (criteria, cutoffs, per-item points); tone per row.
export function chipRows(rows) {
  return h('ul', { class: 'criteria' }, rows.map((row) => h('li', { class: `criterion ${row.tone || ''}` },
    h('div', null, h('div', { class: 'crit-label' }, row.label), row.rule ? h('div', { class: 'crit-rule' }, row.rule) : null),
    h('span', { class: `chip ${row.tone || ''}` }, row.chip))));
}

export function segmentedRow(label, options, current, onPick) {
  return h('div', { class: 'seg-row' },
    h('span', { class: 'seg-label' }, label),
    h('div', { class: 'segmented', role: 'group', 'aria-label': label },
      options.map(([value, text]) => h('button', { type: 'button', 'aria-pressed': String(current === value), onclick: () => onPick(value) }, text))));
}

export function resultsHead(title, severity) {
  const [tone, label] = SEVERITY[severity] || ['', ''];
  return h('div', { class: 'results-head' }, h('h2', null, title), tone ? h('span', { class: `chip ${tone}` }, label) : null);
}

// Plausibility bounds are input guards, not clinical thresholds: they stop a
// mistyped value from being interpreted. Each page declares its own LIMITS.
export function parseInputs(fields, raw, limits) {
  const issues = [];
  const parsed = {};
  for (const field of fields) {
    const value = raw[field.key];
    const blank = value === null || value === undefined || String(value).trim() === '';
    if (blank) {
      if (field.required !== false) issues.push({ field: field.key, message: `${field.label} is required.` });
      parsed[field.key] = null;
      continue;
    }
    const numeric = Number(value);
    const limit = limits[field.key];
    if (!Number.isFinite(numeric)) issues.push({ field: field.key, message: `${field.label} must be a number.` });
    else if (limit && (numeric < limit.min || numeric > limit.max)) issues.push({ field: field.key, message: `${field.label} must be between ${limit.min} and ${limit.max}.` });
    parsed[field.key] = Number.isFinite(numeric) ? numeric : null;
  }
  return { issues, parsed };
}

export function sourceCard(lines) {
  return h('div', { class: 'card calc-source-card' }, disclosure('Calculation source', lines.map((line, i) => h('p', { class: i === 1 ? 'muted mono-small' : null }, line)), { className: 'calc-disclosure' }));
}

export function editValuesButton(onEdit, label = 'Edit values') {
  return h('button', { class: 'calc-edit-values', type: 'button', onclick: onEdit }, label);
}

export function calculatorScrollBehavior() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth';
}

// Values carried in from other pages this session, with where they came from,
// and the one button that forgets the patient.
export function sessionBanner(carried, onNewPatient) {
  const keys = Object.keys(carried);
  if (!keys.length) return null;
  return h('div', { class: 'note info session-banner' },
    h('div', null,
      h('strong', null, 'Carried from this session: '),
      keys.map((key) => `${patientSession.labelFor(key)} ${patientSession.get(key)}${patientSession.unitFor(key) ? ' ' + patientSession.unitFor(key) : ''} (${carried[key]})`).join(' · ')),
    h('button', { class: 'btn-small', type: 'button', onclick: onNewPatient }, 'New patient'));
}

// Cross-links driven by the engine's codes. Guide links are dropped when the
// guide is not in this pack; the label says why the link is offered.
export function relatedCard(items, ctx) {
  const known = new Set((ctx.data.guides || []).map((g) => g.id));
  const list = (items || []).filter((item) => !item.href.startsWith('#/guides/') || known.has(item.href.slice('#/guides/'.length)));
  if (!list.length) return null;
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Related'),
    h('div', { class: 'list' }, list.map((item) => h('a', { class: 'row', href: item.href },
      h('span', { class: 'row-icon' }, icon(item.href.startsWith('#/guides/') ? 'book' : item.href.startsWith('#/drugs') ? 'pill' : 'calc', 20)),
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, item.label), item.why ? h('div', { class: 'row-sub' }, item.why) : null),
      icon('next', 18, 'chev')))));
}
