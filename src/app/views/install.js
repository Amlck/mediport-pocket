import { h, note } from '../lib/ui.js';
import { sourceCard } from '../lib/source.js';

export function installView(ctx) {
  const publicEdition = ctx.release.profile === 'public-share';
  const url = new URL('/', window.location.href).href;
  const status = h('p', { class: 'muted', role: 'status' });
  const copy = h('button', { class: 'btn-small', type: 'button', onclick: async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied.';
    } catch {
      status.textContent = 'Select and copy the link above.';
    }
  } }, 'Copy link');
  const el = h('div', { class: 'page' },
    h('section', { class: 'card stack' },
      h('h2', { class: 'card-title' }, 'Share Mediport Pocket'),
      h('p', { class: 'small' }, publicEdition
        ? 'Anyone with this link can open Pocket. No Tailscale, account or app store is needed.'
        : 'This edition uses your existing private access route.'),
      h('a', { class: 'reflink pocket-share-link', href: url }, url),
      h('div', { class: 'chips' }, copy), status),
    h('section', { class: 'card stack' },
      h('h2', { class: 'card-title' }, 'Install on iPhone or iPad'),
      h('ol', { class: 'small' },
        h('li', null, 'Open this link in Safari. If it opened inside another app, choose Open in Safari.'),
        h('li', null, 'Tap Share, then Add to Home Screen.'),
        h('li', null, 'Keep Open as Web App enabled if shown, then tap Add.'))),
    h('section', { class: 'card stack' },
      h('h2', { class: 'card-title' }, 'Install on Android'),
      h('ol', { class: 'small' },
        h('li', null, 'Open this link in Chrome.'),
        h('li', null, 'Open the menu and choose Install app, or Install and create shortcut → Install.'))),
    h('section', { class: 'card stack' },
      h('h2', { class: 'card-title' }, 'Use Pocket offline'),
      h('p', { class: 'small' }, 'Open the new home-screen app while online. Wait until Installed pack reports Offline copy verified, then try reopening in airplane mode.'),
      h('a', { class: 'btn-small', href: '#/pack' }, 'Check installed pack'),
      note('plain', 'Downloaded references work offline. External source links and new updates need an internet connection. Browser storage can be cleared or evicted.')),
    publicEdition ? sourceCard(ctx.release) : null);
  return { title: 'Share & install', el };
}
