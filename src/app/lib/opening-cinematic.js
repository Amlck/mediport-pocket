// Cinematic opening: a rendered clip (tools/opening/, Blender) in which a grey
// void becomes a marble temple at golden hour, the gate materialises and an
// iris closes on the logo. The last frame then crossfades into the same logo
// drawn flat in SVG, aligned from geometry the render exported, so the 3D-to-2D
// join is exact. The flat mark then flies into the Home header and the app
// takes over. Same contract as the classic opening (lib/boot.js): it holds on
// the flat logo until the pack has loaded, a tap or Enter / Space / Escape
// skips, and while it is up it holds focus with the shell behind it inert.
// Motion uses the Web Animations API and SVG attributes, never style="".

import { h } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CLIP = new URL('../images/opening/cinematic.mp4', import.meta.url).href;
const FIRST_FRAME = '#212932';   // the clip's opening colour, shown until it paints
const SLATE = '#1e293b';         // the clip's final background (calibrated in the render)

// Final-frame geometry exported by tools/opening/gate_opening.py, in a 720 × 1280
// frame (x right, y down). Re-export it whenever the clip is re-rendered.
const FRAME = [720, 1280];
const LEFT = [[335.2, 578.1], [194.9, 635.9], [194.9, 900.1], [335.2, 957.9], [335.2, 796.9], [285.7, 796.9], [285.7, 739.1], [335.2, 739.1]];
const RIGHT = [[384.8, 644.1], [492.1, 644.1], [508.6, 660.7], [508.6, 875.3], [492.1, 891.9], [384.8, 891.9], [384.8, 796.9], [434.3, 796.9], [434.3, 739.1], [384.8, 739.1]];
const IRIS = { cx: 360.0, cy: 768.0, r: 223.2 };
const SKIP_KEYS = new Set(['Enter', ' ', 'Escape']);
const LOCKUP_LEAD_S = 0.3;       // start the crossfade this long before the clip ends
const STALL_MS = 2200;           // a clip that has not started by then is skipped to the lockup

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}
const pts = (arr) => arr.map(([x, y]) => `${x},${y}`).join(' ');

function lockupSvg() {
  const root = svg('svg', { class: 'cine-lockup', viewBox: `0 0 ${FRAME[0]} ${FRAME[1]}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
  const defs = svg('defs');
  const glow = svg('filter', { id: 'cine-rim-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
  glow.append(svg('feGaussianBlur', { stdDeviation: 6 }));
  defs.append(glow);
  const bg = svg('rect', { class: 'cine-bg', width: FRAME[0], height: FRAME[1] });
  const ring = svg('g', { class: 'cine-ring' });
  ring.append(svg('circle', { cx: IRIS.cx, cy: IRIS.cy, r: IRIS.r, class: 'cine-disc' }),
    svg('circle', { cx: IRIS.cx, cy: IRIS.cy, r: IRIS.r + 2, class: 'cine-rim soft', filter: 'url(#cine-rim-glow)' }),
    svg('circle', { cx: IRIS.cx, cy: IRIS.cy, r: IRIS.r + 2, class: 'cine-rim' }));
  const title = svg('g', { class: 'cine-title' });
  const name = svg('text', { x: FRAME[0] / 2, y: Math.round(IRIS.cy - IRIS.r - 150), class: 'cine-name' });
  name.textContent = 'MEDIPORT';
  const sub = svg('text', { x: FRAME[0] / 2, y: Math.round(IRIS.cy - IRIS.r - 92), class: 'cine-sub' });
  sub.textContent = 'POCKET';
  title.append(name, sub);
  const mark = svg('g', { class: 'cine-mark' });
  mark.append(svg('polygon', { points: pts(LEFT), class: 'cine-leaf-l' }), svg('polygon', { points: pts(RIGHT), class: 'cine-leaf-r' }));
  root.append(defs, bg, ring, title, mark);
  return { root, bg, ring, title };
}

/** The flat mark's box inside the overlay, in px, matching object-fit: cover. */
function markBox(width, height) {
  const k = Math.max(width / FRAME[0], height / FRAME[1]);
  const ox = (width - FRAME[0] * k) / 2, oy = (height - FRAME[1] * k) / 2;
  const xs = [...LEFT, ...RIGHT].map(([x]) => x), ys = [...LEFT, ...RIGHT].map(([, y]) => y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: ox + x0 * k, y: oy + y0 * k, w: (Math.max(...xs) - x0) * k, h: (Math.max(...ys) - y0) * k };
}

export function startCinematic({ host, offline }) {
  const video = h('video', { class: 'cine-video', muted: '', playsinline: '', preload: 'auto', 'aria-hidden': 'true' });
  video.muted = true;
  video.playsInline = true;
  video.src = CLIP;
  const lockup = lockupSvg();
  const status = h('div', { class: 'cine-status', 'aria-hidden': 'true' });
  const hint = h('div', { class: 'boot-hint cine-hint', 'aria-hidden': 'true' }, 'Tap to skip');
  const keysHint = h('p', { class: 'sr-only', id: 'boot-keys' }, 'Press Enter, Space or Escape to skip.');
  const announcer = h('p', { class: 'sr-only', role: 'status' });
  const overlay = h('div', {
    class: 'cine', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mediport Pocket is opening',
    'aria-describedby': 'boot-keys', tabindex: '-1',
  }, video, lockup.root, status, hint, keysHint, announcer);
  overlay.animate([{ backgroundColor: FIRST_FRAME }, { backgroundColor: FIRST_FRAME }], { duration: 1, fill: 'forwards' });
  const background = [...host.children].filter((el) => !el.inert);
  background.forEach((el) => { el.inert = true; });
  host.append(overlay);
  overlay.focus({ preventScroll: true });

  let packInfo = null;
  let offlineState = 'checking';
  let lockupShown = false;
  let handedOff = false;
  let done = false;
  let resolveFinished;
  const finished = new Promise((resolve) => { resolveFinished = resolve; });
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  function announce() {
    const next = packInfo
      ? `Reference pack loaded: ${packInfo.data.guides.length} guides, ${packInfo.data.drugs.length} drug monographs.`
      : 'Loading the reference pack.';
    if (announcer.textContent !== next) announcer.textContent = next;
  }
  requestAnimationFrame(announce);
  const unsubscribe = offline.subscribe((state) => { offlineState = state.state; });

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    unsubscribe();
    video.pause();
    const hadFocus = overlay.contains(document.activeElement);
    background.forEach((el) => { el.inert = false; });
    overlay.remove();
    if (hadFocus) host.querySelector('#screen')?.focus({ preventScroll: true });
    setTimeout(() => host.classList.remove('boot-reveal'), 420);
    resolveFinished();
  }

  // The last 3D frame crossfades into the flat lockup; the title settles above it.
  function showLockup(fast = false) {
    if (lockupShown || done) return;
    lockupShown = true;
    const d = fast ? 120 : 420;
    lockup.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, easing: 'ease-in-out', fill: 'forwards' });
    lockup.title.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: fast ? 120 : 520, delay: fast ? 0 : 180, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
    hint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    later(() => {
      if (packInfo) handOff();
      else status.textContent = 'LOADING PACK…';
    }, fast ? 140 : 1150);
  }

  // The flat mark flies into the Home header's mark while the slate gives way.
  function handOff() {
    if (handedOff || done) return;
    handedOff = true;
    status.textContent = '';
    video.pause();
    video.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, fill: 'forwards' });
    const base = overlay.getBoundingClientRect();
    const from = markBox(overlay.clientWidth, overlay.clientHeight);
    const target = host.querySelector('#screen .hero-title .brandmark');
    // No boot-reveal here: it would slide the header while the mark flies to it.
    lockup.bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in-out', fill: 'forwards' });
    overlay.animate([{ backgroundColor: SLATE }, { backgroundColor: 'rgba(30, 41, 59, 0)' }], { duration: 420, easing: 'ease-in-out', fill: 'forwards' });
    lockup.ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    lockup.title.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
    if (target) {
      // The header mark's viewBox is 11 7 42 50; the leaves span 13–51 × 9–55 of it.
      const r = target.getBoundingClientRect();
      const to = { x: r.left - base.left + r.width * 2 / 42, y: r.top - base.top + r.height * 2 / 50, h: r.height * 46 / 50 };
      const k = to.h / from.h;
      const tx = to.x - from.x * k, ty = to.y - from.y * k;
      lockup.root.animate([{ transform: 'none' }, { transform: `translate(${tx}px, ${ty}px) scale(${k})` }],
        { duration: 640, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' });
      target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.9 }, { opacity: 1 }], { duration: 700 });
    }
    lockup.root.animate([{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 740, fill: 'forwards', composite: 'replace' });
    later(finish, 760);
  }

  function setPack({ release, data }) {
    packInfo = { release, data };
    announce();
    if (lockupShown && !handedOff) later(handOff, 0);
  }

  // A skip never waits for the pack: the shell shows its own loading line.
  function skip() {
    if (handedOff || done) return;
    if (!packInfo) { finish(); return; }
    if (!lockupShown) showLockup(true);
    else handOff();
  }
  overlay.addEventListener('click', skip);
  overlay.addEventListener('keydown', (event) => {
    if (SKIP_KEYS.has(event.key)) { event.preventDefault(); skip(); }
    else if (event.key === 'Tab') event.preventDefault();
  });

  const onTime = () => {
    if (video.duration && video.currentTime >= video.duration - LOCKUP_LEAD_S) {
      video.removeEventListener('timeupdate', onTime);
      showLockup();
    }
  };
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('ended', () => showLockup());
  // A clip that cannot play (decode error, blocked autoplay, slow first load)
  // never blocks the app: the flat lockup stands in for it.
  video.addEventListener('error', () => showLockup(true));
  later(() => { if (video.currentTime === 0 && !lockupShown) showLockup(true); }, STALL_MS);
  const played = video.play();
  if (played && typeof played.catch === 'function') played.catch(() => showLockup(true));
  hint.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 1500, fill: 'forwards' });

  return { setPack, finished, abort: finish, get offlineState() { return offlineState; } };
}
