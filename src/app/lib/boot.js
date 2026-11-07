// Classic opening: a short DOM/SVG/canvas sequence that doubles as the loading
// screen. One point of light runs the whole sequence: it traces the outline of
// each letter of MEDIPORT in the app's own typeface (lib/boot-trace.js), and
// each letter fills once its outline closes; it then drops onto the inner ring
// and draws it, flies to the destination and becomes the diamond. The spark
// motif (a hot point dragging a hairline, deterministic sputter, outExpo snaps,
// fine grain) follows github.com/mexicat/pdoom-video (MIT); all code is our own,
// and the particle scheme follows that video's sparkParticles idea.
// The mark is the gate from lib/mark.js: it draws itself closed, the leaves
// part, and a trajectory passes THROUGH the gate — wide where it is near
// (bottom-left, standing on a horizontal base), narrowing to a destination
// beyond it (top-right). The leaves slide apart across the path so the opening
// is a diagonal channel and the path never overlaps a leaf. The light it drags
// through tints the right leaf. It ends on the passage: gate open, trajectory in
// place, destination lit. The resting icon is the closed-seam gate.
//
// One rAF timeline paints every frame from real elapsed time (minus any hold
// waiting for the pack), so a throttled or slow device drops frames instead of
// stretching the sequence, and a skip lands on the exit immediately. Status lines are real: they read the loaded
// pack and the offline store. Motion is set through CSSOM properties and SVG
// attributes — never a style="" string, which the CSP blocks.

import { h } from './ui.js';
import { MARK, leafPolygons, pointsAttr } from './mark.js';
import { traceWord } from './boot-trace.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WORD = 'MEDIPORT';
const T = {
  write: 60, traced: 900, written: 1000, // the point traces each letter, then rests at the end
  fillMs: 160,                        // each letter fills once its outline closes
  drop: 1000, dropped: 1180,          // and drops to the ring's start
  ring: 1180, ringDrawn: 1650,        // drawing the inner ring itself
  outer: 900, outerIn: 1350,          // outer ring snaps in from below
  depart: 1650, located: 2300,        // the point flies and becomes the destination
  gate: 1550, gateDrawn: 2100,        // leaf outlines stroke on, then fill
  open: 2100, opened: 2330,           // leaves part to the resting seam
  swing: 2200, swung: 2520,           // give the path clearance before it reaches the gate
  beam: 2480, beamEnd: 3000,          // broad path follows the opening, near → far
  flood: 2650, flooded: 3000,         // the passing light fills the smaller leaf
  brand: 2450, brandStep: 120,
  status: 2750, statusStep: 200,
  settled: 3260,                      // one arrival pulse after the path reaches its tip
  exit: 3540, exitMs: 260,
};
const PEN_UP_SPEED = 3;               // hops between outlines run this much faster
// Mark placement inside the 200-unit scene: 64-grid × SCALE, centred.
const SCALE = 2.05;
const OFFSET = (200 - 64 * SCALE) / 2;
// Trajectory axis in mark units: a 45° line through the gate's centre, from a near
// point below-left of the mark to a vanishing point above-right of it.
const BEAM_NEAR = [MARK.center[0] - 36, MARK.center[1] + 36];
const BEAM_FAR = [MARK.center[0] + 36, MARK.center[1] - 36];
const DESTINATION = [BEAM_FAR[0] + 6, BEAM_FAR[1] - 6];
const BEAM_W_NEAR = 13.0, BEAM_W_FAR = 0.0;
// Travel follows each leaf's silhouette: the long lower tip needs extra room.
// Both move perpendicular to the path, clearing the full perspective wedge.
const LEFT_SWING = 23, RIGHT_SWING = 16;
const SWING_DIR = [Math.SQRT1_2, Math.SQRT1_2];   // down-right; the left leaf takes the negative
const DEST_SIZE = 6.5;              // detached destination diamond, mark units
const OFFLINE_LINES = {
  checking: 'CHECKING OFFLINE COPY',
  downloading: 'VERIFYING PACK FILES',
  ready: 'OFFLINE READY',
  incomplete: 'OFFLINE COPY INCOMPLETE',
  unavailable: 'NETWORK · NOT INSTALLED',
};

// What a screen reader hears. The typed lines are visual only (aria-hidden);
// this phrase changes only when the state does.
const OFFLINE_PHRASES = {
  checking: 'checking the offline copy',
  downloading: 'downloading the offline copy',
  ready: 'available offline',
  incomplete: 'offline copy incomplete',
  unavailable: 'not installed for offline use',
};
const SKIP_KEYS = new Set(['Enter', ' ', 'Escape']);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const seg = (t, start, end) => clamp01((t - start) / (end - start));
const easeOut = (p) => 1 - (1 - p) ** 3;
const easeInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const outExpo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const bezier = (c, p) => { const q = 1 - p; return [0, 1].map((a) => q ** 3 * c[0][a] + 3 * q ** 2 * p * c[1][a] + 3 * q * p ** 2 * c[2][a] + p ** 3 * c[3][a]); };
// Deterministic noise for sputter and grain: the same frame always looks the same.
const hash = (n, s) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const mixRgb = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
const parseRgb = (value) => (value.match(/[\d.]+/g) || ['8', '145', '178']).slice(0, 3).map(Number);

// Lays outlines and pen-up hops on one clock at constant pen speed (a plotter).
function schedule(loops) {
  const at = (s, l) => { const p = s.path.getPointAtLength(l); return [p.x, p.y]; };
  loops.forEach((s) => {
    s.len = s.path.getTotalLength();
    s.path.setAttribute('stroke-dasharray', String(s.len));
    s.from = at(s, 0);
  });
  const hops = loops.slice(1).map((s, i) => Math.hypot(s.from[0] - loops[i].from[0], s.from[1] - loops[i].from[1]));
  const total = loops.reduce((sum, s) => sum + s.len, 0) + hops.reduce((x, y) => x + y, 0) / PEN_UP_SPEED;
  const v = total / (T.traced - T.write) || 1;
  let clock = T.write;
  loops.forEach((s, i) => {
    if (i > 0) { s.hopStart = clock; clock += hops[i - 1] / PEN_UP_SPEED / v; }
    s.start = clock; clock += s.len / v; s.end = clock;
  });
  return function pen(t) {
    for (let i = 0; i < loops.length; i++) {
      const s = loops[i];
      if (t < s.start) {
        if (i === 0) return { p: s.from, down: false };
        const a = loops[i - 1].from, k = seg(t, s.hopStart, s.start);
        return { p: [a[0] + (s.from[0] - a[0]) * k, a[1] + (s.from[1] - a[1]) * k], down: false };
      }
      if (t <= s.end) return { p: at(s, s.len * seg(t, s.start, s.end)), down: true };
    }
    return { p: loops.length ? loops[loops.length - 1].from : [0, 0], down: false };
  };
}

// The word as SVG in the app's typeface: per letter a <text> fill, plus outline
// paths traced from that same rendered font. Sized after mounting (needs the font).
function buildTracedWord(word) {
  const cs = getComputedStyle(word);
  const size = parseFloat(cs.fontSize);
  const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const m = probe.measureText('M');
  const advance = m.width + 0.26 * size;          // .boot-word's letter-spacing
  const height = Math.round(size * 1.25);
  const baseline = (height + m.actualBoundingBoxAscent) / 2;
  // Room for the former caret (.55em + .1em) keeps the letters where they always sat.
  const width = advance * WORD.length + 0.65 * size;
  word.setAttribute('viewBox', `0 0 ${width.toFixed(2)} ${height}`);
  word.setAttribute('width', width.toFixed(2));
  word.setAttribute('height', String(height));
  const fills = [...WORD].map((ch, i) => {
    const text = svg('text', { x: (i * advance).toFixed(2), y: baseline.toFixed(2), class: 'boot-trace-fill' });
    text.textContent = ch;
    return text;
  });
  const loops = traceWord(WORD, font, advance, baseline, height).map(({ letter, d }) => ({
    letter, path: svg('path', { d, class: 'boot-trace-line' }),
  }));
  word.append(...fills, ...loops.map((l) => l.path));
  return { fills, loops };
}

function grainFrames(w, h) {
  return [0, 1, 2, 3].map((f) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = Math.round(255 * hash(i, f + 1));
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

export function bootAllowed(path) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return path === '/' || path === '/home';
}

/**
 * Mounts the boot overlay into `host` and returns { setPack, finished, abort }.
 * The timeline holds at the status phase until setPack() supplies the loaded
 * pack. A tap, or Enter / Space / Escape, skips straight to the exit, even
 * while the pack is still loading (the shell shows its own loading state).
 * While the overlay is up it holds focus and the shell behind it is inert.
 */
export function startBoot({ host, offline }) {
  const word = svg('svg', { class: 'boot-word boot-traced', 'aria-hidden': 'true' });

  const R_OUTER = 70;
  const R_INNER = 50;
  const outer = svg('circle', { r: R_OUTER, cx: -120, cy: 100, class: 'boot-ring outer', 'stroke-dasharray': 2 * Math.PI * R_OUTER, 'stroke-dashoffset': 2 * Math.PI * R_OUTER });
  // The inner ring is the point's own line: an arc drawn as the point travels it.
  const inner = svg('path', { d: '', class: 'boot-ring inner' });
  // A rounded square starts as a circle, then sharpens and turns into the diamond.
  // Keep it in scene coordinates throughout, including its final mark-relative position.
  const node = svg('rect', { x: -5, y: -5, width: 10, height: 10, rx: 5, class: 'boot-node' });
  const defs = svg('defs', {});
  const ambient = svg('radialGradient', { id: 'boot-ambient' });
  ambient.append(svg('stop', { offset: 0, class: 'boot-ambient-core' }),
    svg('stop', { offset: 1, class: 'boot-ambient-clear' }));
  defs.append(ambient);
  const atmosphere = svg('ellipse', { cx: 100, cy: 105, rx: 155, ry: 125,
    fill: 'url(#boot-ambient)', class: 'boot-atmosphere' });
  const { left, right } = leafPolygons();
  const leftLeaf = svg('polygon', { points: pointsAttr(left), class: 'boot-leaf' });
  const rightLeaf = svg('polygon', { points: pointsAttr(right), class: 'boot-leaf' });
  const flood = svg('polygon', { points: pointsAttr(right), class: 'boot-flood', 'clip-path': 'url(#boot-flood-clip)' });
  const floodRect = svg('rect', { x: MARK.center[0], y: 0, width: 0, height: 64 });
  const clip = svg('clipPath', { id: 'boot-flood-clip' });
  clip.append(floodRect);
  defs.append(clip);
  // Trace only the opening-facing edges, including the cross notches. Clip the
  // stroke inside the leaf so the light reads as a bevel, never as a third shape.
  function edgeLight(polygon, edge, side) {
    const leafClip = svg('clipPath', { id: `boot-${side}-clip` });
    leafClip.append(svg('polygon', { points: pointsAttr(polygon) }));
    const gradient = svg('linearGradient', { id: `boot-${side}-light`, gradientUnits: 'userSpaceOnUse',
      x1: BEAM_NEAR[0], y1: BEAM_NEAR[1], x2: BEAM_FAR[0], y2: BEAM_FAR[1] });
    const stops = [0, 0, 0].map(() => svg('stop', { offset: 0, class: 'boot-edge-light-stop', 'stop-opacity': 0 }));
    stops[1].setAttribute('stop-opacity', '0.9');
    gradient.append(...stops);
    defs.append(leafClip, gradient);
    const line = svg('polyline', { points: pointsAttr(edge), class: 'boot-edge-light',
      stroke: `url(#boot-${side}-light)`, 'clip-path': `url(#boot-${side}-clip)` });
    return { line, gradient, stops };
  }
  const leftLight = edgeLight(left, [...left.slice(3), left[0]], 'left');
  const rightLight = edgeLight(right, [...right.slice(5), right[0]], 'right');
  const beam = svg('polygon', { points: '', class: 'boot-beam' });
  const leftGroup = svg('g', {}); leftGroup.append(leftLeaf, leftLight.line);
  const rightGroup = svg('g', {}); rightGroup.append(rightLeaf, flood, rightLight.line);
  const markGroup = svg('g', { transform: `translate(${OFFSET} ${OFFSET}) scale(${SCALE})` });
  markGroup.append(beam, leftGroup, rightGroup);   // beam behind the leaves
  const scene = svg('svg', { viewBox: '0 0 200 200', class: 'boot-scene', overflow: 'visible', 'aria-hidden': 'true' });
  scene.append(defs, atmosphere, outer, inner, markGroup, node);

  const destination = DESTINATION.map((v) => OFFSET + SCALE * v);
  const departure = [100 + R_INNER * Math.SQRT1_2, 100 - R_INNER * Math.SQRT1_2];
  // Curve out of the orbit's clockwise tangent, then ease upward to the exact star position.
  const flightControls = [departure, [departure[0] + 22, departure[1] + 10],
    [destination[0] - 6, destination[1] + 28], destination];

  // One brand line and two status lines: the product name, what the pack holds,
  // and whether it works offline. The build identifier lives on the pack page.
  const brandLines = [h('div', { class: 'boot-brand-line lead' }, 'Pocket')];
  const brand = h('div', { class: 'boot-brand', 'aria-hidden': 'true' }, brandLines);
  const statusLines = [0, 1].map(() => h('div', { class: 'boot-status-line' }));
  const status = h('div', { class: 'boot-status', 'aria-hidden': 'true' }, statusLines);
  const hint = h('div', { class: 'boot-hint', 'aria-hidden': 'true' }, 'Tap to skip');
  const keysHint = h('p', { class: 'sr-only', id: 'boot-keys' }, 'Press Enter, Space or Escape to skip.');
  const announcer = h('p', { class: 'sr-only', role: 'status' });
  const overlay = h('div', {
    class: 'boot', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mediport Pocket is opening',
    'aria-describedby': 'boot-keys', tabindex: '-1',
  }, word, scene, brand, status, hint, keysHint, announcer);
  const sparkCanvas = h('canvas', { class: 'boot-spark', 'aria-hidden': 'true' });
  const grainCanvas = h('canvas', { class: 'boot-grain', 'aria-hidden': 'true' });
  overlay.append(sparkCanvas, grainCanvas);
  // Everything else in the phone frame is out of reach until the overlay leaves.
  const background = [...host.children].filter((el) => !el.inert);
  background.forEach((el) => { el.inert = true; });
  host.append(overlay);
  overlay.focus({ preventScroll: true });

  const { fills, loops } = buildTracedWord(word);
  const pen = schedule(loops);
  const letterEnd = fills.map((_, i) => Math.max(T.write, ...loops.filter((l) => l.letter === i).map((l) => l.end)));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = overlay.clientWidth || 390, H = overlay.clientHeight || 844;
  sparkCanvas.width = Math.round(W * dpr); sparkCanvas.height = Math.round(H * dpr);
  grainCanvas.width = W; grainCanvas.height = H;
  const sg = sparkCanvas.getContext('2d'), gg = grainCanvas.getContext('2d');
  const grain = grainFrames(Math.ceil(W / 2), Math.ceil(H / 2));
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const ringAngle = (t) => -Math.PI / 4 + 2 * Math.PI * easeOut(seg(t, T.ring, T.ringDrawn));
  const ringPoint = (a) => [100 + R_INNER * Math.cos(a), 100 + R_INNER * Math.sin(a)];

  const leafLength = [leftLeaf, rightLeaf].map((leaf) => {
    let length = 160;
    try { length = leaf.getTotalLength(); } catch { /* not attached yet: fall back to a safe estimate */ }
    leaf.setAttribute('stroke-dasharray', String(length));
    leaf.setAttribute('stroke-dashoffset', String(length));
    return length;
  });

  let packInfo = null;
  let statusTexts = ['LOADING PACK', ''];
  let offlineLine = OFFLINE_LINES.checking;
  let offlineState = 'checking';
  function announce() {
    const next = packInfo
      ? `Reference pack loaded: ${packInfo.data.guides.length} guides, ${packInfo.data.drugs.length} drug monographs, ${OFFLINE_PHRASES[offlineState] || offlineState}.`
      : 'Loading the reference pack.';
    if (announcer.textContent !== next) announcer.textContent = next;
  }
  // Set after mounting so the live region reports a change, not initial content.
  requestAnimationFrame(announce);
  let skipRequested = false;
  let done = false;
  let resolveFinished;
  const finished = new Promise((resolve) => { resolveFinished = resolve; });

  const unsubscribe = offline.subscribe((state) => {
    offlineState = state.state;
    offlineLine = OFFLINE_LINES[state.state] || state.state.toUpperCase();
    if (packInfo) statusTexts = [statusTexts[0], offlineLine];
    announce();
  });

  function setPack({ release, data }) {
    packInfo = { release, data };
    statusTexts = [`${data.guides.length} GUIDES · ${data.drugs.length} MONOGRAPHS`, offlineLine];
    announce();
    if (skipRequested) jumpToExit();
  }

  let t = 0;
  let startTime = performance.now();
  let heldSince = null;
  let heldTotal = 0;
  let exitStarted = null;
  let frame = 0;

  function jumpToExit() {
    if (t >= T.exit) return;
    if (heldSince !== null) { heldTotal += performance.now() - heldSince; heldSince = null; }
    startTime = performance.now() - heldTotal - T.exit;
  }

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    unsubscribe();
    const hadFocus = overlay.contains(document.activeElement);
    background.forEach((el) => { el.inert = false; });
    overlay.remove();
    // Focus lands on the page the overlay was covering, not on <body>.
    if (hadFocus) host.querySelector('#screen')?.focus({ preventScroll: true });
    setTimeout(() => host.classList.remove('boot-reveal'), 420);
    resolveFinished();
  }

  // A skip never waits for the pack: the shell underneath shows its own
  // loading line (or the error page) if the pack is not there yet.
  function skip() {
    skipRequested = true;
    jumpToExit();
  }
  overlay.addEventListener('click', skip);
  overlay.addEventListener('keydown', (event) => {
    if (SKIP_KEYS.has(event.key)) { event.preventDefault(); skip(); }
    else if (event.key === 'Tab') event.preventDefault();   // nothing else is reachable
  });

  // The segment of the trajectory between fractions `tail` and `head` of the axis.
  // Width is a property of position (near = wide, far = a point), so the segment
  // reads as one object receding, not a shape that changes.
  function beamPoints(tail, head) {
    const dx = BEAM_FAR[0] - BEAM_NEAR[0], dy = BEAM_FAR[1] - BEAM_NEAR[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;                   // unit normal
    const at = (f) => [BEAM_NEAR[0] + dx * f, BEAM_NEAR[1] + dy * f];
    const width = (f) => BEAM_W_NEAR + (BEAM_W_FAR - BEAM_W_NEAR) * f;
    const [tx, ty] = at(tail), [hx, hy] = at(head);
    const wt = width(tail), wh = width(head);
    // The near base is a horizontal cut (the wedge stands on a floor line); the
    // head is cut perpendicular to the axis. Same perpendicular width at the base.
    const base = tail === 0
      ? [[tx - wt * Math.SQRT2, ty], [tx + wt * Math.SQRT2, ty]]
      : [[tx - nx * wt, ty - ny * wt], [tx + nx * wt, ty + ny * wt]];
    return pointsAttr([...base, [hx + nx * wh, hy + ny * wh], [hx - nx * wh, hy - ny * wh]]);
  }

  // Where the point is at time tb, in canvas pixels, plus whether the pen is down.
  function headAt(tb, map) {
    if (tb < T.written) { const { p, down } = pen(tb); return { p: map.word(p), down }; }
    if (tb < T.dropped) {
      const p0 = map.word(pen(T.written).p), p3 = map.scene(departure);
      return { p: bezier([p0, [p0[0] + 10, p0[1] + 18], [p3[0] - 10, p3[1] - 10], p3], easeInOut(seg(tb, T.drop, T.dropped))) };
    }
    if (tb < T.depart) return { p: map.scene(ringPoint(ringAngle(tb))) };
    return { p: map.scene(bezier(flightControls, easeInOut(seg(tb, T.depart, T.located)))) };
  }
  function rateAt(tb) {
    if (tb < T.write) return 0;
    if (tb < T.traced) return pen(tb).down ? 60 : 0;
    if (tb < T.written) return 15;
    if (tb < T.ringDrawn) return 40;
    return tb < T.located - 150 ? 55 : 0;
  }
  function paintSpark(t) {
    sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    sg.clearRect(0, 0, W, H);
    const morph = easeInOut(seg(t, T.depart + 100, T.located));
    const I = clamp01(t / T.write) * (1 - morph) * (0.88 + 0.12 * Math.sin(t * 0.0917) * Math.sin(t * 0.0573));
    if (I <= 0.001) return;
    // Screen positions → canvas pixels; k undoes the overlay's exit shrink.
    const base = overlay.getBoundingClientRect();
    const k = base.width / overlay.offsetWidth || 1;
    const toPx = (m) => ([px, py]) => [(m.a * px + m.c * py + m.e - base.left) / k, (m.b * px + m.d * py + m.f - base.top) / k];
    const map = { word: toPx(word.getScreenCTM()), scene: toPx(scene.getScreenCTM()) };
    const dark = darkQuery.matches;
    const accent = parseRgb(getComputedStyle(node).fill);
    const core = dark ? [255, 255, 255] : mixRgb(accent, [0, 0, 0], 0.25);
    sg.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    sg.lineCap = 'round';
    // Hot tail: the last ~120 ms of travel, thinning and cooling.
    const N = 12;
    let prev = headAt(t, map).p;
    for (let n = 1; n <= N; n++) {
      const tb = t - n * 10;
      if (tb < T.write) break;
      const hd = headAt(tb, map), f = 1 - n / N;
      const lift = hd.down === false ? 0.3 : 1;
      sg.strokeStyle = rgba(mixRgb(accent, core, 0.5 * f * f), I * f * f * 0.9 * lift);
      sg.lineWidth = 0.6 + 2 * f;
      sg.beginPath(); sg.moveTo(prev[0], prev[1]); sg.lineTo(hd.p[0], hd.p[1]); sg.stroke();
      prev = hd.p;
    }
    // Sputter: born on a fixed 60/s clock, thinned by hash, so any frame is reproducible.
    const RATE = 60, LIFE = 320, SPEED = 0.075, G = 0.00016;
    for (let n = Math.floor((t - LIFE) * RATE / 1000); n <= Math.floor(t * RATE / 1000); n++) {
      const tb = (n * 1000) / RATE, age = t - tb;
      if (tb > t || tb < 0 || hash(n, 4) * RATE >= rateAt(tb)) continue;
      const life = LIFE * (0.35 + 0.65 * hash(n, 3));
      if (age > life) continue;
      const hp = headAt(tb, map).p, a = hash(n, 1) * Math.PI * 2, sp = SPEED * (0.25 + hash(n, 2) ** 2 * 1.2);
      const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - SPEED * 0.3;
      const pos = (s) => [hp[0] + vx * s, hp[1] + vy * s + 0.5 * G * s * s];
      const [x0, y0] = pos(Math.max(0, age - 18)), [x1, y1] = pos(age);
      const kk = 1 - age / life;
      sg.strokeStyle = rgba(mixRgb(accent, core, kk * kk), Math.min(1, kk * 1.4) * I);
      sg.lineWidth = 0.6 + kk * 0.8;
      sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x1, y1); sg.stroke();
    }
    // Head: soft halo, bright core.
    const [x, y] = headAt(t, map).p;
    const halo = sg.createRadialGradient(x, y, 0, x, y, 12);
    halo.addColorStop(0, rgba(accent, (dark ? 0.55 : 0.32) * I));
    halo.addColorStop(1, rgba(accent, 0));
    sg.fillStyle = halo; sg.beginPath(); sg.arc(x, y, 12, 0, Math.PI * 2); sg.fill();
    sg.fillStyle = rgba(core, I);
    sg.beginPath(); sg.arc(x, y, 2.3, 0, Math.PI * 2); sg.fill();
  }
  function paintGrain(t) {
    gg.imageSmoothingEnabled = false;
    gg.drawImage(grain[Math.max(0, Math.floor(t / 42)) % 4], 0, 0, W, H);
  }

  function paint(now) {
    // Word: each outline draws with the pen; a letter fills once its last outline closes.
    loops.forEach((l) => l.path.setAttribute('stroke-dashoffset', String(l.len * (1 - seg(t, l.start, l.end)))));
    fills.forEach((text, i) => {
      const fill = easeOut(seg(t, letterEnd[i], letterEnd[i] + T.fillMs));
      text.style.fillOpacity = String(fill);
      loops.forEach((l) => { if (l.letter === i) l.path.style.strokeOpacity = String(1 - fill); });
    });

    // The outer ring snaps in from below (CSS rotates it -90°, so cx moves vertically) and draws itself.
    const converge = outExpo(seg(t, T.outer, T.outerIn));
    outer.setAttribute('cx', String(-120 + 220 * converge));
    outer.setAttribute('stroke-dashoffset', String(2 * Math.PI * R_OUTER * (1 - easeInOut(seg(t, T.outer + 200, T.ringDrawn)))));
    // The point, once it has flown, is the destination diamond: one identity, no handoff.
    const point = t >= T.depart ? bezier(flightControls, easeInOut(seg(t, T.depart, T.located))) : departure;
    const morph = easeInOut(seg(t, T.depart + 100, T.located));
    const size = 10 + (DEST_SIZE * SCALE - 10) * morph;
    const pulse = 1 + 0.12 * Math.sin(Math.PI * seg(t, T.beamEnd, T.settled)) ** 2;
    node.setAttribute('x', String(-size / 2));
    node.setAttribute('y', String(-size / 2));
    node.setAttribute('width', String(size));
    node.setAttribute('height', String(size));
    node.setAttribute('rx', String(5 * (1 - morph) + 0.5 * SCALE * morph));
    node.setAttribute('transform', `translate(${point[0]} ${point[1]}) rotate(${45 * morph}) scale(${pulse})`);
    node.style.opacity = String(morph);

    // Rings collapse into the gate as its two leaves draw themselves closed, then fill
    const collapse = easeInOut(seg(t, T.depart, T.gateDrawn));
    outer.setAttribute('r', String(R_OUTER * (1 - 0.35 * collapse)));
    outer.style.opacity = inner.style.opacity = String(1 - collapse);
    // The inner ring: an arc from its start (top-right) to where the point has drawn it.
    if (t < T.ring) inner.setAttribute('d', '');
    else {
      const a1 = ringAngle(t), r = R_INNER * (1 - 0.6 * collapse);
      const steps = Math.max(2, Math.ceil(((a1 + Math.PI / 4) / (Math.PI * 2)) * 90));
      const pts = Array.from({ length: steps + 1 }, (_, i) => {
        const a = -Math.PI / 4 + ((a1 + Math.PI / 4) * i) / steps;
        return `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
      });
      inner.setAttribute('d', `M${pts.join(' L')}`);
    }
    const drawn = easeInOut(seg(t, T.gate, T.gate + 0.7 * (T.gateDrawn - T.gate)));
    const filled = easeOut(seg(t, T.gate + 0.55 * (T.gateDrawn - T.gate), T.gateDrawn));
    [leftLeaf, rightLeaf].forEach((leaf, i) => {
      leaf.setAttribute('stroke-dashoffset', String(leafLength[i] * (1 - drawn)));
      leaf.style.fillOpacity = String(filled);
      leaf.style.strokeOpacity = String(1 - filled);
    });

    // The gate opens: leaves part from touching (shifted inward by seam/2) to the icon's
    // seam, then slide apart across the path for the passage and stay there.
    const openP = outExpo(seg(t, T.open, T.opened));
    const swing = easeInOut(seg(t, T.swing, T.swung));
    const inward = (MARK.seam / 2) * (1 - openP);
    const lx = LEFT_SWING * swing * SWING_DIR[0], ly = LEFT_SWING * swing * SWING_DIR[1];
    const rx = RIGHT_SWING * swing * SWING_DIR[0], ry = RIGHT_SWING * swing * SWING_DIR[1];
    leftGroup.setAttribute('transform', `translate(${(inward - lx).toFixed(3)} ${(-ly).toFixed(3)})`);
    rightGroup.setAttribute('transform', `translate(${(-inward + rx).toFixed(3)} ${ry.toFixed(3)})`);

    // The trajectory passes through and stays: the head sets off fast and slows as it
    // recedes; the near end holds. Behind the leaves, so it shows in the opening.
    const head = easeInOut(seg(t, T.beam, T.beamEnd));
    const beamOn = t >= T.beam && head > 0.01;
    beam.style.opacity = beamOn ? '1' : '0';
    if (beamOn) beam.setAttribute('points', beamPoints(0, head));

    // Light travels with the path's leading front in scene space. Counter the
    // leaf translations so the two edges catch the same passing light at their
    // actual positions. A short trailing band leaves no permanent outline.
    [leftLight, rightLight].forEach((light, i) => {
      const [x, y] = i === 0 ? [inward - lx, -ly] : [-inward + rx, ry];
      light.gradient.setAttribute('gradientTransform', `translate(${-x} ${-y})`);
      [head - 0.2, head - 0.055, head + 0.02].forEach((offset, j) => {
        light.stops[j].setAttribute('offset', String(clamp01(offset)));
      });
      light.line.style.opacity = beamOn ? '1' : '0';
    });
    // A fixed, low-opacity pool of reflected colour gives the opening depth.
    // It eases in once and holds; no background pulse or full-screen flash.
    atmosphere.style.opacity = String(easeInOut(seg(t, T.open, T.flooded)));

    // The passing light tints the right leaf; keep the trajectory the stronger accent.
    const floodP = easeOut(seg(t, T.flood, T.flooded));
    floodRect.setAttribute('width', String(32 * floodP + 2));
    flood.style.opacity = floodP > 0 ? '1' : '0';

    // Word settles left as the brand lines stagger in beside the mark
    const settle = easeInOut(seg(t, T.brand, T.brand + 300));
    word.style.transform = `translateY(${-24 * settle}px)`;
    word.style.opacity = String(1 - 0.35 * settle);
    brandLines.forEach((el, i) => {
      const p = easeOut(seg(t, T.brand + i * T.brandStep, T.brand + i * T.brandStep + 260));
      el.style.opacity = String(p);
      el.style.transform = `translateY(${8 * (1 - p)}px)`;
    });

    // Status lines type in character by character, from real pack data
    statusLines.forEach((el, i) => {
      const text = statusTexts[i] || '';
      const p = seg(t, T.status + i * T.statusStep, T.status + i * T.statusStep + 180);
      const shown = text.slice(0, Math.ceil(text.length * p));
      const pending = !packInfo && i === 0 && t >= T.status;
      const next = pending ? 'LOADING PACK' + '.'.repeat(1 + Math.floor(now / 300) % 3) : shown;
      if (el.textContent !== next) el.textContent = next;
      el.classList.toggle('ready', Boolean(packInfo) && i === 1 && p === 1 && offlineLine === OFFLINE_LINES.ready);
    });
    hint.style.opacity = t > 900 && t < T.exit ? '1' : '0';

    paintSpark(t);
    paintGrain(t);

    // A quiet destination pulse finishes the passage; the page never flashes.
    if (t >= T.exit) {
      if (exitStarted === null) { exitStarted = t; overlay.classList.add('exit'); host.classList.add('boot-reveal'); }
      if (t - exitStarted >= T.exitMs) finish();
    }
  }

  function tick(now) {
    // Hold at the status phase until the pack has loaded; the app renders underneath meanwhile.
    if (heldSince === null && packInfo === null && !skipRequested && now - startTime - heldTotal >= T.status) heldSince = now;
    if (heldSince !== null && packInfo !== null) { heldTotal += now - heldSince; heldSince = null; }
    // The first frame's timestamp can precede startTime by a few ms; never paint negative time.
    t = heldSince !== null ? T.status : Math.max(0, now - startTime - heldTotal);
    paint(now);
    if (!done) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  return { setPack, finished, abort: finish };
}
