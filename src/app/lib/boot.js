// Boot sequence: a short DOM/SVG opening that doubles as the loading screen.
// Mechanics after the Rhine Lab terminal recreation (typed word, converging
// rings, stroke-drawn mark, staggered brand lines, typed status,
// gentle accent settle, defocus out); all text, marks and colours are Mediport's own.
// The mark is the gate from lib/mark.js: the rings locate it, it draws itself
// closed, the leaves part, and a trajectory passes THROUGH the gate — wide where
// it is near (bottom-left, standing on a horizontal base), narrowing to a
// destination beyond it (top-right). The leaves slide apart across the path
// (left up-left, right down-right) so the opening is a diagonal channel and the
// path never overlaps a leaf — no layering to read. The light it drags through
// tints the right leaf. The orbiting point becomes the destination; it never
// disappears or hands off to a second shape. It ends on the passage: gate open, trajectory in place,
// destination lit. The resting icon is the closed-seam gate.
//
// One rAF timeline paints every frame from real elapsed time (minus any hold
// waiting for the pack), so a throttled or slow device drops frames instead of
// stretching the sequence, and a skip lands on the exit immediately. Status lines are real: they read the loaded
// pack and the offline store. Motion is set through CSSOM properties and SVG
// attributes — never a style="" string, which the CSP blocks.

import { h } from './ui.js';
import { MARK, leafPolygons, pointsAttr } from './mark.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WORD = 'MEDIPORT';
const LETTER_MS = 90;
const T = {
  rings: 400, ringsDrawn: 1400,
  depart: 1400, located: 2160,       // orbiting point leaves the ring and becomes the star
  gate: 1300, gateDrawn: 1900,        // leaf outlines stroke on, then fill
  open: 1900, opened: 2200,           // leaves part to the resting seam
  beam: 2340, beamEnd: 2920,          // broad path follows the opening, near → far
  swing: 2020, swung: 2360,           // give the path clearance before it reaches the gate
  flood: 2520, flooded: 2900,         // the passing light fills the smaller leaf
  brand: 2350, brandStep: 120,
  status: 2650, statusStep: 200,
  settled: 3180,                    // one arrival pulse after the path reaches its tip
  exit: 3460, exitMs: 260,
};
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
  const letters = [...WORD].map((ch) => h('span', { class: 'boot-letter' }, ch));
  const caret = h('span', { class: 'boot-caret' });
  const word = h('div', { class: 'boot-word', 'aria-hidden': 'true' }, letters, caret);

  const R_OUTER = 70;
  const R_INNER = 50;
  const outer = svg('circle', { r: R_OUTER, cx: -120, cy: 100, class: 'boot-ring outer', 'stroke-dasharray': 2 * Math.PI * R_OUTER, 'stroke-dashoffset': 2 * Math.PI * R_OUTER });
  const inner = svg('circle', { r: R_INNER, cx: 320, cy: 100, class: 'boot-ring inner', 'stroke-dasharray': 2 * Math.PI * R_INNER, 'stroke-dashoffset': 2 * Math.PI * R_INNER });
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
  // Everything else in the phone frame is out of reach until the overlay leaves.
  const background = [...host.children].filter((el) => !el.inert);
  background.forEach((el) => { el.inert = true; });
  host.append(overlay);
  overlay.focus({ preventScroll: true });

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

  function paint(now) {
    // Typed word
    const typed = Math.min(WORD.length, Math.floor(t / LETTER_MS));
    letters.forEach((el, i) => { el.style.opacity = i < typed ? '1' : '0'; });
    caret.style.opacity = t < WORD.length * LETTER_MS + 400 && Math.floor(t / 260) % 2 === 0 ? '1' : '0';

    // Rings converge from off-screen and draw themselves
    const converge = easeOut(seg(t, T.rings, T.rings + 500));
    const draw = easeInOut(seg(t, T.rings + 200, T.ringsDrawn));
    outer.setAttribute('cx', String(-120 + 220 * converge));
    inner.setAttribute('cx', String(320 - 220 * converge));
    outer.setAttribute('stroke-dashoffset', String(2 * Math.PI * R_OUTER * (1 - draw)));
    inner.setAttribute('stroke-dashoffset', String(2 * Math.PI * R_INNER * (1 - draw)));
    // One persistent point: orbit → curved departure → destination → arrival pulse.
    // Before departure it follows the inner ring; the rings collapse only once it leaves.
    const orbit = -Math.PI / 4 - 2 * Math.PI * (1 - easeOut(seg(t, T.rings + 200, T.depart)));
    // CSS rotates the rings -90° about (100,100), so their cx convergence is vertical here.
    let point = [100 + R_INNER * Math.cos(orbit),
      100 - 220 * (1 - converge) + R_INNER * Math.sin(orbit)];
    if (t >= T.depart) {
      const p = easeInOut(seg(t, T.depart, T.located)), q = 1 - p;
      point = [0, 1].map((axis) => q ** 3 * flightControls[0][axis]
        + 3 * q ** 2 * p * flightControls[1][axis]
        + 3 * q * p ** 2 * flightControls[2][axis] + p ** 3 * flightControls[3][axis]);
    }
    const morph = easeInOut(seg(t, T.depart + 100, T.located));
    const size = 10 + (DEST_SIZE * SCALE - 10) * morph;
    const pulse = 1 + 0.12 * Math.sin(Math.PI * seg(t, T.beamEnd, T.settled)) ** 2;
    node.setAttribute('x', String(-size / 2));
    node.setAttribute('y', String(-size / 2));
    node.setAttribute('width', String(size));
    node.setAttribute('height', String(size));
    node.setAttribute('rx', String(5 * (1 - morph) + 0.5 * SCALE * morph));
    node.setAttribute('transform', `translate(${point[0]} ${point[1]}) rotate(${45 * morph}) scale(${pulse})`);
    node.style.opacity = String(easeOut(seg(t, T.rings + 300, T.rings + 480)));

    // Rings collapse into the gate as its two leaves draw themselves closed, then fill
    const collapse = easeInOut(seg(t, T.depart, T.gateDrawn));
    outer.setAttribute('r', String(R_OUTER * (1 - 0.35 * collapse)));
    inner.setAttribute('r', String(R_INNER * (1 - 0.6 * collapse)));
    outer.style.opacity = inner.style.opacity = String(1 - collapse);
    const drawn = easeInOut(seg(t, T.gate, T.gate + 0.7 * (T.gateDrawn - T.gate)));
    const filled = easeOut(seg(t, T.gate + 0.55 * (T.gateDrawn - T.gate), T.gateDrawn));
    [leftLeaf, rightLeaf].forEach((leaf, i) => {
      leaf.setAttribute('stroke-dashoffset', String(leafLength[i] * (1 - drawn)));
      leaf.style.fillOpacity = String(filled);
      leaf.style.strokeOpacity = String(1 - filled);
    });

    // The gate opens: leaves part from touching (shifted inward by seam/2) to the icon's
    // seam, then slide apart across the path for the passage and stay there.
    const openP = easeOut(seg(t, T.open, T.opened));
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
    t = heldSince !== null ? T.status : now - startTime - heldTotal;
    paint(now);
    if (!done) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  return { setPack, finished, abort: finish };
}
