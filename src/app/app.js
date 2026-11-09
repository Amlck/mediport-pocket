// Mediport Pocket shell. Hash router, bottom tabs, pushed pages.
// Runs on the same generated engines and reference pack as the local preview.

import { h, icon, closeSheet, navigate, disclosure } from './lib/ui.js';
import { homeView } from './views/home.js';
import { searchView } from './views/search.js';
import { guidesView, guideView } from './views/guides.js';
import { abgView, abgWorkupView } from './views/abg.js';
import { ekgView } from './views/ekg.js';
import { calcView, calculatorView } from './views/calculators.js';
import { drugsView, drugDetailView } from './views/drugs.js';
import { drugCompareView } from './views/drug-compare.js';
import { referenceNavigation, guideReturnLink } from './lib/reference-navigation.js';
import { fluidsView, fluidCompareView } from './views/fluids.js';
import { packView } from './views/pack.js';
import { installView } from './views/install.js';
import { labReviewView } from './views/lab-review.js';
import { pocusView, pocusTopicView } from './views/pocus.js';
import { appearance } from './lib/theme.js';
import { setupOffline } from './lib/offline.js';
import { openingAllowed, startOpening } from './lib/opening.js';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home', hash: '#/home' },
  { id: 'guides', label: 'Guides', icon: 'book', hash: '#/guides' },
  { id: 'calc', label: 'Calc', icon: 'calc', hash: '#/calc' },
  { id: 'drugs', label: 'Drugs', icon: 'pill', hash: '#/drugs' },
];

const ROUTES = [
  { pattern: /^\/?$|^\/home$/, tab: 'home', view: homeView, root: true },
  { pattern: /^\/search(?:\/(guide|calculator|drug|pocus|ntuh))?$/, tab: 'home', view: searchView },
  { pattern: /^\/pack$/, tab: 'home', view: packView },
  { pattern: /^\/install$/, tab: 'home', view: installView },
  { pattern: /^\/lab-review$/, tab: 'home', view: labReviewView },
  { pattern: /^\/guides$/, tab: 'guides', view: guidesView, root: true },
  { pattern: /^\/guides\/([\w-]+)$/, tab: 'guides', view: guideView },
  { pattern: /^\/pocus$/, tab: 'guides', view: pocusView },
  { pattern: /^\/pocus\/([\w-]+)(?:\/(atlas|measurement)\/([\w-]+))?$/, tab: 'guides', view: pocusTopicView, fallback: '#/pocus' },
  { pattern: /^\/calc$/, tab: 'calc', view: calcView, root: true },
  { pattern: /^\/calc\/abg$/, tab: 'calc', view: abgView },
  { pattern: /^\/calc\/ekg$/, tab: 'calc', view: ekgView },
  { pattern: /^\/calc\/(osmolar-gap|urine-anion-gap|urine-chloride)$/, tab: 'calc', view: abgWorkupView },
  { pattern: /^\/calc\/([\w-]+)$/, tab: 'calc', view: calculatorView },
  { pattern: /^\/drugs$/, tab: 'drugs', view: drugsView, root: true },
  { pattern: /^\/drugs\/compare(?:\/([\w.-]+)(?:\/([\w.-]+))?)?$/, tab: 'drugs', view: drugCompareView, reference: true },
  { pattern: /^\/fluids$/, tab: 'drugs', view: fluidsView },
  { pattern: /^\/fluids\/compare(?:\/([\w-]+)(?:\/(litre|\d+))?)?$/, tab: 'drugs', view: fluidCompareView },
  { pattern: /^\/drugs\/([\w.-]+)$/, tab: 'drugs', view: drugDetailView, reference: true },
];

const screen = document.getElementById('screen');
const footer = document.getElementById('footer');
const tabbar = document.getElementById('tabbar');
const scrollMemory = new Map();
// Offline pack state is a small store views subscribe to, so a download
// progressing in the background updates the Home pill and pack page in place
// instead of re-rendering the screen. Listeners on detached elements drop themselves.
const offlineListeners = new Set();
const offline = {
  state: { state: 'checking', version: null, message: 'Checking downloaded references…', updateAvailable: false },
  subscribe(listener) { offlineListeners.add(listener); listener(offline.state); return () => offlineListeners.delete(listener); },
};
function publishOffline(next) {
  offline.state = { ...offline.state, ...next };
  for (const listener of offlineListeners) listener(offline.state);
}

const ctx = { data: null, release: null, engines: {}, online: navigator.onLine, loadEngine, offline };
const enginePromises = new Map();
let currentRouteKey = null;
let disposeView = null;

// The pack either arrives within LOAD_TIMEOUT_MS or the app says so and offers
// a retry; nothing waits forever. Same 10 s bound as the update check.
const LOAD_TIMEOUT_MS = 10000;
class PackTimeoutError extends Error {
  constructor() { super(`No reference pack after ${LOAD_TIMEOUT_MS / 1000} s`); this.name = 'PackTimeoutError'; }
}

async function fetchPack(signal) {
  const [reference, ntuh, release, abg, calculators, glycemic, labEntry] = await Promise.all([
    fetch(new URL('./data/reference.json', import.meta.url), { signal }).then(assertOk).then((r) => r.json()),
    fetch(new URL('./data/ntuh-index.json', import.meta.url), { signal }).then(assertOk).then((r) => r.json()),
    fetch(new URL('./release.json', import.meta.url), { signal }).then(assertOk).then((r) => r.json()),
    import('./shared/abg.mjs'),
    import('./shared/calculators.mjs'),
    import('./shared/glycemic.mjs'),
    import('./shared/lab-review-entry.mjs'),
  ]);
  return { reference: { ...reference, ntuh }, release, engines: { abg, calculators, glycemic, labEntry } };
}

// A pack that turns up after the timeout is ignored: the error page is already
// showing, and Try again reloads cleanly.
function loadPack() {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new PackTimeoutError()); }, LOAD_TIMEOUT_MS);
  });
  return Promise.race([fetchPack(controller.signal), timeout])
    .finally(() => clearTimeout(timer))
    .then((pack) => {
      ctx.data = pack.reference;
      ctx.release = pack.release;
      ctx.engines = pack.engines;
    });
}

// Guide engines load on first open, one module per guide, from the path the
// pack declares. A failed import is not cached so the next open retries.
function loadEngine(id) {
  if (ctx.engines[id]) return Promise.resolve(ctx.engines[id]);
  const guide = ctx.data.guides.find((g) => g.id === id);
  if (!guide) return Promise.reject(new Error(`Unknown guide ${id}`));
  if (!enginePromises.has(id)) {
    const modulePath = guide.engine.module.replace(/^\.\.\//, './');
    const promise = import(modulePath)
      .then((module) => { ctx.engines[id] = module; return module; })
      .catch((error) => { enginePromises.delete(id); throw error; });
    enginePromises.set(id, promise);
  }
  return enginePromises.get(id);
}
function assertOk(response) {
  if (!response.ok) throw new Error(`${response.url} → HTTP ${response.status}`);
  return response;
}

function renderTabs(activeTab) {
  tabbar.replaceChildren(...TABS.map((tab) => h('a', {
    class: 'tab', href: tab.hash, 'aria-current': tab.id === activeTab ? 'page' : null,
  }, icon(tab.icon, 24), h('span', null, tab.label))));
}

function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/home';
  return raw.split('?')[0];
}

function matchRoute(path) {
  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (match) return { route, params: match.slice(1) };
  }
  return null;
}

function render() {
  // Connectivity and hash events can arrive during loading or after a failed
  // load. Preserve that screen until the complete pack is ready to render.
  if (!ctx.data || !ctx.release) return;
  disposeView?.();
  disposeView = null;
  closeSheet();
  if (currentRouteKey !== null) scrollMemory.set(currentRouteKey, screen.scrollTop);
  const path = currentPath();
  referenceNavigation.observe(path);
  const matched = matchRoute(path);
  if (!matched) { navigate('#/home'); return; }
  const { route, params } = matched;
  const view = route.view(ctx, params);
  if (route.reference) {
    const returnLink = guideReturnLink();
    if (returnLink) view.el.prepend(returnLink);
  }
  disposeView = view.onUnmount || null;
  const children = [];
  if (route.root) {
    children.push(h('header', { class: 'hero' },
      h('div', { class: view.lead ? 'hero-title' : null }, view.lead || null,
        h('div', null, h('h1', null, view.title), view.subtitle ? h('div', { class: 'subtitle' }, view.subtitle) : null)),
      view.right || null));
  } else {
    children.push(h('div', { class: 'topbar' },
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Back', onclick: () => goBack(route.tab, route.fallback) }, icon('back', 26)),
      h('h1', null, view.title),
      view.right || h('span')));
  }
  children.push(view.el);
  screen.replaceChildren(...children);
  screen.classList.remove('screen-enter');
  void screen.offsetWidth;
  screen.classList.add('screen-enter');

  footer.replaceChildren(view.footer || '');
  footer.hidden = !view.footer;
  tabbar.hidden = !route.root;
  renderTabs(route.tab);
  document.title = view.title === 'Pocket' ? 'Mediport Pocket' : `${view.title} · Mediport Pocket`;

  currentRouteKey = path;
  screen.scrollTop = route.root ? (scrollMemory.get(path) || 0) : 0;
  if (typeof view.onMount === 'function') view.onMount();
}

let navDepth = 0;
function goBack(tab, fallback) {
  // History back keeps the iOS swipe gesture coherent; fall back to the tab root when
  // the page was opened directly (for example from a pasted link).
  if (navDepth > 0) { navDepth -= 2; history.back(); }
  else navigate(fallback || TABS.find((t) => t.id === tab)?.hash || '#/home');
}

// What the person holding the phone can do about it, in their terms. The build
// commands appear only on a machine serving the shell itself.
const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);
function loadFailure(error) {
  if (!navigator.onLine) {
    return ['No connection, and this phone has no offline copy yet.', 'Connect once so Pocket can download its reference pack, then try again.'];
  }
  if (error instanceof PackTimeoutError) {
    return ['Loading the reference pack is taking too long.', 'The connection may be slow or the pack server unreachable. Try again in a moment.'];
  }
  return ['The reference pack could not be opened.', 'Try again. If it keeps failing, reopen Pocket while connected so it can repair its offline copy.'];
}

function renderError(error) {
  const [problem, advice] = loadFailure(error);
  screen.replaceChildren(
    h('header', { class: 'hero' }, h('h1', null, 'Pocket')),
    h('div', { class: 'page' },
      h('div', { class: 'note urgent', role: 'alert' }, icon('alert', 18), h('span', null, problem)),
      h('div', { class: 'card' },
        h('p', { class: 'small' }, advice),
        h('div', { class: 'retry mt-8' }, h('button', { class: 'btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again'))),
      disclosure('Details', [
        h('p', { class: 'muted' }, String(error?.message || error)),
        isLocalDev ? h('pre', { class: 'muted mono-block' }, 'node pocket/build.mjs\nnode pocket/ui-fable/serve.mjs') : null,
      ].filter(Boolean), { className: 'compact' })));
  tabbar.hidden = true;
  footer.hidden = true;
  screen.focus({ preventScroll: true });
}

// Visible under (or instead of) the opening until the pack is in, so a skipped
// opening or a deep link never lands on a blank screen.
function renderLoading() {
  screen.replaceChildren(
    h('header', { class: 'hero' }, h('h1', null, 'Pocket')),
    h('div', { class: 'page' }, h('p', { class: 'muted pad-x', role: 'status' }, 'Loading the reference pack…')));
  tabbar.hidden = true;
}

window.addEventListener('hashchange', () => { navDepth = Math.max(0, navDepth + 1); render(); });
window.addEventListener('online', () => { ctx.online = true; if (currentPath() === '/home' || currentPath() === '/pack') render(); });
window.addEventListener('offline', () => { ctx.online = false; if (currentPath() === '/home' || currentPath() === '/pack') render(); });

appearance.applyStored();
// The boot overlay plays over the shell while the pack loads and the worker
// reports; it only runs on a cold open of Home, never on a pasted deep link.
renderLoading();
const boot = openingAllowed(currentPath()) ? startOpening({ host: document.getElementById('phone'), offline }) : null;
// The pack page can replay the chosen opening over the current screen.
ctx.playOpening = () => {
  if (document.querySelector('#phone > .boot, #phone > .cine')) return;
  const replay = startOpening({ host: document.getElementById('phone'), offline });
  if (ctx.data) replay.setPack({ release: ctx.release, data: ctx.data });
};
// Only a failed pack load shows the error page; the offline client reports its
// own problems on the pack page and never replaces a working app.
loadPack().then(
  () => { render(); boot?.setPack({ release: ctx.release, data: ctx.data }); return setupOffline(publishOffline); },
  (error) => { boot?.abort(); renderError(error); });
