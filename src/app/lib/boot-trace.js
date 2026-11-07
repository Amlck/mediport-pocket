// Ported from the boot spark study (Medical, design/boot-spark-study, 2026-11-07).
// Letter outlines from the font the browser actually renders. Each letter is
// drawn into an offscreen canvas at 4× and its edge is found with marching
// squares (interpolated on alpha, so the contour is smooth), then simplified.
// Nothing font-specific ships: on an iPhone the outline is SF Mono's, in Chrome
// whatever the same CSS stack resolves to, and the filled <text> on top is that
// same font, so outline and fill always agree.

const SUPER = 4;     // supersampling
const ISO = 128;     // alpha threshold for the edge

// Segments per marching-squares case, as pairs of cell edges (T, R, B, L).
// Corner bits: top-left 8, top-right 4, bottom-right 2, bottom-left 1.
const CASES = [[], [['L', 'B']], [['B', 'R']], [['L', 'R']], [['T', 'R']], [['L', 'T'], ['B', 'R']],
  [['T', 'B']], [['L', 'T']], [['T', 'L']], [['T', 'B']], [['T', 'R'], ['B', 'L']], [['T', 'R']],
  [['L', 'R']], [['B', 'R']], [['L', 'B']], []];

function edgeKey(edge, x, y) {
  if (edge === 'T') return `h${x},${y}`;
  if (edge === 'B') return `h${x},${y + 1}`;
  if (edge === 'L') return `v${x},${y}`;
  return `v${x + 1},${y}`;
}

function contours(alpha, w, h) {
  const at = (x, y) => alpha[(y * w + x) * 4 + 3];
  const links = new Map();
  const link = (a, b) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a).push(b); links.get(b).push(a);
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const c = (at(x, y) >= ISO ? 8 : 0) | (at(x + 1, y) >= ISO ? 4 : 0)
        | (at(x + 1, y + 1) >= ISO ? 2 : 0) | (at(x, y + 1) >= ISO ? 1 : 0);
      for (const [a, b] of CASES[c]) link(edgeKey(a, x, y), edgeKey(b, x, y));
    }
  }
  // Where the edge crosses, interpolated between the two pixel values (pixel centres at +0.5).
  const point = (key) => {
    const [x, y] = key.slice(1).split(',').map(Number);
    const horizontal = key[0] === 'h';
    const a = at(x, y), b = horizontal ? at(x + 1, y) : at(x, y + 1);
    const f = b === a ? 0.5 : (ISO - a) / (b - a);
    return horizontal ? [x + f + 0.5, y + 0.5] : [x + 0.5, y + f + 0.5];
  };
  const seen = new Set(), loops = [];
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = null, cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur); loop.push(point(cur));
      const next = links.get(cur).find((k) => k !== prev && !seen.has(k));
      prev = cur; cur = next;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return loops;
}

// Ramer–Douglas–Peucker on a closed loop (split at the far point so both halves are open).
function simplify(points, eps) {
  const rdp = (pts) => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = 0, index = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > worst) { worst = d; index = i; }
    }
    return worst <= eps ? [pts[0], pts[pts.length - 1]]
      : [...rdp(pts.slice(0, index + 1)).slice(0, -1), ...rdp(pts.slice(index))];
  };
  let far = 0, best = 0;
  points.forEach(([x, y], i) => { const d = Math.hypot(x - points[0][0], y - points[0][1]); if (d > best) { best = d; far = i; } });
  return [...rdp(points.slice(0, far + 1)).slice(0, -1), ...rdp([...points.slice(far), points[0]]).slice(0, -1)];
}

const area = (pts) => pts.reduce((sum, [x, y], i) => {
  const [nx, ny] = pts[(i + 1) % pts.length];
  return sum + (x * ny - nx * y);
}, 0) / 2;

/**
 * Outlines for `text`, one letter per `advance` px, baseline at `baseline`, in px.
 * Returns [{ letter, d }] in tracing order: per letter, the outer contour first
 * (clockwise, starting at its top), then its counters.
 */
export function traceWord(text, font, advance, baseline, height) {
  const pad = 4;
  const w = Math.ceil((advance * text.length + pad * 2) * SUPER), h = Math.ceil((height + pad * 2) * SUPER);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.scale(SUPER, SUPER);
  g.font = font;
  g.textBaseline = 'alphabetic';
  [...text].forEach((ch, i) => g.fillText(ch, pad + i * advance, pad + baseline));
  const loops = contours(g.getImageData(0, 0, w, h).data, w, h).map((loop) => {
    let pts = simplify(loop.map(([x, y]) => [x / SUPER - pad, y / SUPER - pad]), 0.06);
    if (area(pts) < 0) pts = pts.reverse();
    const top = pts.reduce((best, p, i) => (p[1] < pts[best][1] - 0.01 || (Math.abs(p[1] - pts[best][1]) <= 0.01 && p[0] < pts[best][0]) ? i : best), 0);
    pts = [...pts.slice(top), ...pts.slice(0, top)];
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    return { pts, letter: Math.min(text.length - 1, Math.max(0, Math.floor(cx / advance))), size: Math.abs(area(pts)) };
  });
  loops.sort((a, b) => a.letter - b.letter || b.size - a.size);
  return loops.map(({ pts, letter }) => ({
    letter, d: `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`,
  }));
}
