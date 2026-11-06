// DOM helpers for the Pocket variant. No innerHTML anywhere: every string
// becomes a text node, so reference data never reaches the parser as markup.

import { leafPolygons, pointsAttr } from './mark.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19a2 2 0 0 1 2-2h13',
  calc: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M8 6h8v4H8z M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  pill: 'm10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z M8.5 8.5l7 7',
  star: 'm12 3 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.3 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z',
  back: 'm15 5-7 7 7 7',
  chevron: 'm6 9 6 6 6-6',
  next: 'm9 5 7 7-7 7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z m9 16-4.3-4.3',
  close: 'M6 6l12 12M18 6 6 18',
  external: 'M14 4h6v6 M20 4 10 14 M18 13v6H5V6h6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
  alert: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  package: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  reset: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
  check: 'm5 12 5 5 9-9',
  wifi: 'M5 12.5a9.5 9.5 0 0 1 14 0 M8.5 15.5a5 5 0 0 1 7 0 M12 19h.01',
  rows: 'M4 6h16 M4 12h16 M4 18h16',
};

export function icon(name, size = 22, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', name === 'star-filled' ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (extraClass) svg.setAttribute('class', extraClass);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name === 'star-filled' ? 'star' : name] || ICONS.info);
  svg.append(path);
  return svg;
}

// The resting mark (closed-seam gate) at text size, drawn from the same
// geometry as the app icon and the boot. Colours come from CSS classes so the
// left leaf follows the theme's ink; the right leaf carries the accent.
export function brandMark(size = 32) {
  const { left, right } = leafPolygons();
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '11 7 42 50');
  svg.setAttribute('width', String(Math.round(size * 42 / 50)));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', 'brandmark');
  svg.setAttribute('aria-hidden', 'true');
  for (const [points, leaf] of [[left, 'leaf-l'], [right, 'leaf-r']]) {
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', pointsAttr(points));
    polygon.setAttribute('class', leaf);
    svg.append(polygon);
  }
  return svg;
}

// Favorites are the only persisted state: reference identifiers, nothing clinical.
const FAVORITES_KEY = 'mediport-pocket-variant-b:favorites';
const favoriteListeners = new Set();
function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
export const favorites = {
  list: () => readFavorites(),
  has: (id) => readFavorites().includes(id),
  toggle(id) {
    const current = readFavorites();
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* storage unavailable: favorites stay session-only */ }
    for (const listener of favoriteListeners) listener(next);
    return next.includes(id);
  },
  subscribe(listener) { favoriteListeners.add(listener); return () => favoriteListeners.delete(listener); },
};

export function starButton(id, label = 'favorite') {
  const button = h('button', { class: 'iconbtn', type: 'button', 'aria-label': `Toggle ${label}` });
  const paint = () => {
    const on = favorites.has(id);
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
    button.replaceChildren(icon(on ? 'star-filled' : 'star', 24));
  };
  button.addEventListener('click', () => { const on = favorites.toggle(id); toast(on ? 'Added to favorites' : 'Removed from favorites'); });
  favorites.subscribe(paint);
  paint();
  return button;
}

export function navigate(hash) { location.hash = hash; }

export function formatDate(iso) {
  if (!iso) return 'not recorded';
  const date = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortVersion(version) {
  return String(version || '').replace(/^pocket-/, '').slice(0, 8) || '—';
}

export function note(tone, text, iconName = tone === 'urgent' || tone === 'attention' ? 'alert' : 'info') {
  return h('div', { class: `note ${tone}` }, icon(iconName, 18), h('span', null, text));
}

export function disclosure(summaryContent, bodyChildren, { open = false, className = '' } = {}) {
  return h('details', { class: `disclosure ${className}`, open },
    h('summary', null, summaryContent, icon('chevron', 18, 'chevron')),
    h('div', { class: 'body' }, bodyChildren));
}

export function listOrText(value) {
  if (Array.isArray(value)) return h('ul', null, value.map((item) => h('li', null, String(item))));
  return h('p', null, String(value));
}

let sheetCloser = null;
export function openSheet({ title, body }) {
  closeSheet();
  const host = document.getElementById('sheet-host');
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: () => closeSheet() });
  const closeButton = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Close', onclick: () => closeSheet() }, icon('close', 22));
  const sheet = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-handle' }),
    h('div', { class: 'sheet-head' }, h('span'), h('h2', null, title), closeButton),
    h('div', { class: 'sheet-body' }, body));
  host.replaceChildren(backdrop, sheet);
  requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });
  const onKey = (event) => { if (event.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);
  sheetCloser = () => { document.removeEventListener('keydown', onKey); host.replaceChildren(); sheetCloser = null; };
  closeButton.focus({ preventScroll: true });
}
export function closeSheet() { if (sheetCloser) sheetCloser(); }

export function toast(text) {
  const host = document.getElementById('toast-host');
  const el = h('div', { class: 'toast', role: 'status' }, text);
  host.replaceChildren(el);
  setTimeout(() => { if (el.parentNode === host) host.replaceChildren(); }, 2300);
}

export function stepNumber(n, tone = '') {
  return h('span', { class: `stepnum ${tone}`, 'aria-hidden': 'true' }, String(n));
}
