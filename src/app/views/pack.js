import { h, icon, formatDate, note, disclosure } from '../lib/ui.js';
import { THEMES, CONTRASTS, TEXT_SIZES, appearance } from '../lib/theme.js';
import { checkForUpdates } from '../lib/offline.js';
import { installedRelease } from '../lib/pack-presentation.js';
import { sourceCard } from '../lib/source.js';

function row(k, v, mono = false, stacked = false) {
  return h('div', { class: `kvrow ${stacked ? 'stacked' : ''}` }, h('span', { class: 'k' }, k), h('span', { class: `v ${mono ? 'mono' : ''}` }, v));
}

function appearanceCard() {
  const swatches = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Palette' });
  const contrast = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Contrast' });
  const textSize = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Text size' });
  const render = () => {
    const pref = appearance.get();
    swatches.replaceChildren(...THEMES.map((t) => h('button', {
      type: 'button', class: 'swatch', 'aria-pressed': String(pref.theme === t.id),
      onclick: () => { appearance.set({ theme: t.id }); render(); },
    }, h('span', { class: 'dot', style: null }, ''), h('span', null, h('div', { class: 'name' }, t.label), h('div', { class: 'note' }, t.note)))));
    swatches.querySelectorAll('.swatch').forEach((el, i) => { el.querySelector('.dot').dataset.color = THEMES[i].color; });
    contrast.replaceChildren(...CONTRASTS.map((c) => h('button', {
      type: 'button', 'aria-pressed': String(pref.contrast === c.id),
      onclick: () => { appearance.set({ contrast: c.id }); render(); },
    }, c.label)));
    textSize.replaceChildren(...TEXT_SIZES.map((size) => h('button', {
      type: 'button', 'aria-pressed': String(pref.textSize === size.id),
      onclick: () => { appearance.set({ textSize: size.id }); render(); },
    }, size.label)));
  };
  render();
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Appearance'),
    h('div', { class: 'seg-row' }, h('span', { class: 'seg-label' }, 'Text size'), textSize),
    h('div', { class: 'mt-8' }, swatches),
    h('div', { class: 'seg-row mt-8' }, h('span', { class: 'seg-label' }, 'Contrast'), contrast),
    h('p', { class: 'muted mt-6' }, 'Stored on this device only. Severity colors (red, amber, green) never change.'));
}

const OFFLINE_TITLES = {
  checking: 'Checking the downloaded pack',
  downloading: 'Downloading the complete pack',
  ready: 'Offline copy verified',
  incomplete: 'Offline copy incomplete',
  unavailable: 'Offline status unavailable',
};
const OFFLINE_TONES = { ready: 'ok', downloading: 'info', checking: 'info', incomplete: 'attention', unavailable: 'attention' };

function releaseSummary(identity, heading, changesOpen = true) {
  const date = identity.releaseDate || identity.builtAt;
  return h('section', { class: 'stack', 'aria-label': heading },
    h('h2', { class: 'card-title' }, heading),
    identity.releaseLabel ? h('p', { class: 'small' }, h('strong', null, identity.releaseLabel)) : null,
    date ? h('p', { class: 'small' }, `${identity.releaseDate ? 'Released' : 'Packaged'} ${formatDate(date)}`) : null,
    h('p', { class: 'muted' }, identity.version),
    identity.changes?.length ? disclosure('What changed',
      h('ul', { class: 'small' }, identity.changes.map(change => h('li', null, change))), { open: changesOpen }) : null);
}

// Active and waiting worker identities stay separate, including during failures
// and on an older worker that does not yet report human-readable release notes.
function offlineCard(ctx) {
  const status = h('div', { class: 'stack', role: 'status' });
  const installed = h('div');
  const downloaded = h('div', { class: 'card' });
  const busy = (button, label, idle, run) => async () => {
    if (button.getAttribute('aria-busy') === 'true') return;
    button.setAttribute('aria-busy', 'true');
    button.textContent = label;
    try { await run(); } finally { button.removeAttribute('aria-busy'); button.textContent = idle; }
  };
  const checkButton = h('button', { class: 'btn-small', type: 'button' }, 'Check for update');
  checkButton.addEventListener('click', busy(checkButton, 'Checking…', 'Check for update', checkForUpdates));
  const card = h('div', { class: 'card stack' },
    status, installed, downloaded,
    h('div', { class: 'chips' }, checkButton));
  let painted = false;
  let unsubscribe = null;
  unsubscribe = ctx.offline.subscribe((state) => {
    if (painted && !card.isConnected) { unsubscribe?.(); return; }
    painted = true;
    const active = installedRelease(state, ctx.release);
    const waiting = state.updateAvailable ? state.downloaded : null;
    const title = state.state === 'ready' && waiting ? 'Update ready · Offline copy verified' : OFFLINE_TITLES[state.state] || state.state;
    // A ready update has its own panel and instructions below; do not repeat
    // those instructions in the status note above it.
    const detail = state.state === 'ready' && waiting ? '' : state.message || '';
    status.replaceChildren(
      note(OFFLINE_TONES[state.state] || 'plain', `${title}${detail ? `. ${detail}` : ''}`,
        state.state === 'ready' ? 'check' : state.state === 'unavailable' || state.state === 'incomplete' ? 'alert' : 'package'),
      ...(state.update ? [note(state.update.tone, state.update.text)] : []));
    installed.replaceChildren(active
      ? releaseSummary(active, 'In use', !waiting)
      : h('p', { class: 'muted' }, state.state === 'unavailable' ? 'No installed version reported.' : 'Confirming the installed version…'));
    downloaded.hidden = !waiting;
    downloaded.replaceChildren(...(waiting ? [
      releaseSummary(waiting, 'Downloaded · ready to install'),
      h('p', { class: 'small mt-8' }, 'Close all Pocket windows and Safari tabs, then reopen. Your current pack stays in use until then.'),
    ] : []));
    checkButton.hidden = Boolean(waiting) || (state.state === 'unavailable' && !active);
  });
  return card;
}

export function packView(ctx) {
  const { release, data } = ctx;
  const refs = release.references || {};
  const hashes = Object.entries(refs.sourceHashes || {});
  const excluded = data.excludedGuides || [];
  const guideRows = (refs.guides || []).reduce((sum, guide) => sum + (guide.localRowCount || 0), 0);
  const el = h('div', { class: 'page' },
    offlineCard(ctx),
    h('p', { class: 'muted pad-x' }, release.clinicalReviewNotice),
    appearanceCard(),
    release.profile === 'public-share' ? sourceCard(release) : null,
    h('h2', { class: 'section-title' }, 'Contents'),
    h('div', { class: 'kvlist' },
      row('Drug monographs', String(refs.drugCount ?? data.drugs.length)),
      row('Management guides', `${data.guides.length} of ${data.guides.length + excluded.length} enabled`),
      row('POCUS reference topics', String(data.pocus?.topics?.length || 0)),
      row('NTUH formulary listings', data.ntuh ? `${data.ntuh.entries.length} · snapshot ${data.ntuh.source.snapshotDate}` : '0'),
      row('Historical local rows', String(guideRows)),
      row('References omitted at build', `${refs.omittedReferenceCount ?? 0} (${Object.entries(refs.omittedReferencesByReason || {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'})`)),
    excluded.length ? h('div', { class: 'card' }, disclosure(`${excluded.length} enabled guide${excluded.length === 1 ? '' : 's'} left out of this pack`,
      excluded.map((item) => h('p', { class: 'small' }, h('strong', null, item.title), ' — ', item.reason)))) : null,
    h('h2', { class: 'section-title' }, release.profile === 'public-share' ? 'About this edition' : 'Publication'),
    h('div', { class: 'card' },
      h('p', { class: 'small' }, data.publication.label),
      release.profile === 'public-share'
        ? h('p', { class: 'muted mt-6' }, 'Saved local regimens and internal hospital resource tables are excluded. NTUH formulary listings are names and links to NTUH’s public pages only. Some guides and ECG illustrations are omitted from this edition. Clinician review remains pending.')
        : h('p', { class: 'muted mt-6' }, `Public distribution approved: ${release.publishingApproved ? 'Yes' : 'No'}`),
      h('p', { class: 'muted mt-6' }, data.publication.license.notice)),
    h('h2', { class: 'section-title' }, 'Source fingerprints'),
    // Source paths are long; stack key over hash so neither wraps character by character.
    h('div', { class: 'kvlist' }, hashes.map(([path, hash]) => row(path.replace(/^portal\/static\/(js|data)\//, ''), hash.slice(0, 12), true, true))),
    h('p', { class: 'muted pad-x' }, 'Fingerprints identify the exact upstream files this pack was generated from.'));
  return { title: 'Installed pack', el, right: h('span', { class: 'iconbtn icon-muted' }, icon('package', 22)) };
}
