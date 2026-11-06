import { h, icon, favorites, formatDate, brandMark } from '../lib/ui.js';
import { CATALOGUE, sessionCard } from './calculators.js';
import { SOURCE_REPOSITORY } from '../lib/source.js';

const PILL_LABELS = { ready: 'Offline', downloading: 'Downloading', checking: 'Checking', incomplete: 'Incomplete', unavailable: 'Not installed' };

function statusPill(ctx) {
  const dot = h('span', { class: 'dot' });
  const label = h('span');
  const pill = h('a', { class: 'status-pill', href: '#/pack' },
    dot, label);
  let painted = false;
  let unsubscribe = null;
  unsubscribe = ctx.offline.subscribe((status) => {
    if (painted && !pill.isConnected) { unsubscribe?.(); return; }
    painted = true;
    dot.classList.toggle('off', status.state !== 'ready');
    label.textContent = status.updateAvailable ? 'Update ready' : PILL_LABELS[status.state] || status.state;
    pill.setAttribute('aria-label', `Offline pack: ${label.textContent}`);
  });
  return pill;
}

function favoriteRows(ctx) {
  const ids = favorites.list();
  if (!ids.length) {
    return h('div', { class: 'empty' }, 'Star a guide, POCUS topic, calculator or drug to pin it here.');
  }
  const rows = ids.map((id) => {
    const [kind, key] = id.split(':');
    if (kind === 'drug') {
      const drug = ctx.data.drugs.find((d) => d.id === key);
      if (!drug) return null;
      return row('pill', drug.name, drug.class, `#/drugs/${drug.id}`);
    }
    if (kind === 'guide') {
      const guide = ctx.data.guides.find((g) => g.id === key);
      if (!guide) return null;
      return row('book', guide.title, `Guide · reviewed ${formatDate(guide.reviewedAt)}`, `#/guides/${guide.id}`);
    }
    if (kind === 'pocus') {
      const topic = ctx.data.pocus?.topics?.find((item) => item.id === key);
      if (!topic) return null;
      return row('book', topic.title, `POCUS · ${topic.group || 'Reference'}`, `#/pocus/${topic.id}`);
    }
    if (kind === 'calc') {
      const entry = CATALOGUE.find((c) => c.id === key);
      return entry ? row('calc', entry.title, `Calculator · ${entry.subtitle}`, entry.href || `#/calc/${entry.id}`) : null;
    }
    return null;
  }).filter(Boolean);
  return h('div', { class: 'list' }, rows);
}

function row(iconName, title, sub, href) {
  return h('a', { class: 'row', href },
    h('span', { class: 'row-icon' }, icon(iconName, 22)),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    icon('next', 20, 'chev'));
}

// Three shortcuts, one line each. The tab bar reaches the same lists; these
// keep Home useful while Favorites is still empty.
function shortcut(iconName, label, count, href) {
  return h('a', { class: 'shortcut', href },
    h('span', { class: 'shortcut-icon' }, icon(iconName, 22)),
    h('span', { class: 'shortcut-label' }, label),
    h('span', { class: 'shortcut-count' }, String(count)));
}

export function homeView(ctx) {
  const { data } = ctx;
  const el = h('div', { class: 'page' },
    h('a', { class: 'search-launch', href: '#/search' }, icon('search', 20), 'Guides, POCUS, calculators, drugs'),
    h('a', { class: 'lab-launch', href: '#/lab-review' },
      h('div', null, h('strong', null, 'Lab review'), h('span', null, 'Enter once · find relevant calculations')), icon('next', 20)),
    h('a', { class: 'lab-launch pocus-launch', href: '#/pocus' },
      h('div', null, h('strong', null, 'POCUS'), h('span', null, `${data.pocus?.topics?.length || 0} offline reference topics`)), icon('next', 20)),
    h('nav', { class: 'shortcuts', 'aria-label': 'Browse' },
      shortcut('book', 'Guides', data.guides.length, '#/guides'),
      shortcut('calc', 'Calculators', CATALOGUE.length, '#/calc'),
      shortcut('pill', 'Drugs', data.drugs.length, '#/drugs')),
    sessionCard(),
    h('h2', { class: 'section-title' }, 'Favorites'),
    favoriteRows(ctx),
    ctx.release.profile === 'public-share' ? h('div', { class: 'card' }, row('package', 'Share & install', 'Add Pocket to your home screen', '#/install')) : null,
    ctx.release.profile === 'public-share' ? h('a', { class: 'reflink pad-x', href: SOURCE_REPOSITORY, target: '_blank', rel: 'noopener noreferrer' }, 'Source & contribute on GitHub') : null,
    h('p', { class: 'muted pad-x mt-6' }, 'Reference only. Nothing you enter is stored or sent.'));
  return { title: 'Pocket', lead: brandMark(34), el, right: statusPill(ctx) };
}
