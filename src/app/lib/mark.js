// One 64-grid mark for the installed icon and opening animation. The taller,
// wider left leaf is the anchor; the smaller accent leaf is the open door.
// Their notches stay aligned, so asymmetry never distorts the medical opening.
export const MARK = Object.freeze({ center: [33, 32], seam: 6, bar: 7, arm: 9 });

/** Left and right leaf polygons (arrays of [x, y]) at the icon's resting seam. */
export function leafPolygons() {
  const g = MARK.seam / 2, b = MARK.bar / 2, a = MARK.arm, [cx, cy] = MARK.center;
  const xl = cx - g, xr = cx + g;
  const left = [[xl, 9], [13, 16], [13, 48], [xl, 55],
    [xl, cy + b], [cx - a, cy + b], [cx - a, cy - b], [xl, cy - b]];
  const right = [[xr, 17], [49, 17], [51, 19], [51, 45], [49, 47], [xr, 47],
    [xr, cy + b], [cx + a, cy + b], [cx + a, cy - b], [xr, cy - b]];
  return { left, right };
}

export const pointsAttr = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
