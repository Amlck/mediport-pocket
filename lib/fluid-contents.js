// Presentation-only volume scaling of the components recorded in the Pocket
// reference. A per-litre basis is a concentration, not an offered bag size.

const BAG_SIZE = /^(\d+(?:\.\d+)?)\s*mL\s*bag$/i;
const BAG_BASIS = /^per\s*(?:(\d+(?:\.\d+)?)\s*mL\s*)?bag$/i;
const PER_LITRE = /^per\s+lit(?:re|er)$/i;
const PER_VOLUME = /^per\s*(\d+(?:\.\d+)?)\s*mL$/i;

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function bagSize(label) {
  if (typeof label !== 'string') return null;
  const match = BAG_SIZE.exec(label.trim());
  if (!match) return null;
  const volume = Number(match[1]);
  return positiveNumber(volume) ? volume : null;
}

function basis(drug) {
  const value = drug?.contents?.basis;
  if (!positiveNumber(value?.volumeMl) || typeof value.label !== 'string') return null;
  const label = value.label.trim();
  const bag = BAG_BASIS.exec(label);
  if (bag) {
    if (bag[1] && Number(bag[1]) !== value.volumeMl) return null;
    return { volumeMl: value.volumeMl, bag: true };
  }
  if (PER_LITRE.test(label)) return value.volumeMl === 1000 ? { volumeMl: 1000, bag: false } : null;
  const perVolume = PER_VOLUME.exec(label);
  if (perVolume && Number(perVolume[1]) === value.volumeMl) return { volumeMl: value.volumeMl, bag: false };
  return null;
}

/** Bag volumes listed in source sizes or an explicit source bag basis. */
export function getBagVolumes(drug) {
  const volumes = [];
  if (Array.isArray(drug?.sizes)) {
    for (const size of drug.sizes) {
      const volume = bagSize(size);
      if (volume !== null && !volumes.includes(volume)) volumes.push(volume);
    }
  }
  const sourceBasis = basis(drug);
  if (sourceBasis?.bag && !volumes.includes(sourceBasis.volumeMl)) volumes.push(sourceBasis.volumeMl);
  return volumes;
}

/** Prefer the bag used by the source; otherwise choose a listed 500 mL bag. */
export function chooseBagVolume(drug) {
  const volumes = getBagVolumes(drug);
  const sourceBasis = basis(drug);
  if (sourceBasis?.bag && volumes.includes(sourceBasis.volumeMl)) return sourceBasis.volumeMl;
  return volumes.includes(500) ? 500 : volumes[0] ?? null;
}

function displayAmount(amount) {
  if (amount === 0) return '0';
  if (amount < 0.001) return '<0.001';
  const rounded = Number(amount.toFixed(3));
  const sameWithinFloatNoise = Math.abs(amount - rounded) <= Number.EPSILON * Math.max(1, amount) * 8;
  return `${sameWithinFloatNoise ? '' : '≈'}${rounded}`;
}

/** Source components scaled to a listed bag or a per-litre comparison target. */
export function fluidContents(drug, volumeMl) {
  const sourceBasis = basis(drug);
  const components = drug?.contents?.components;
  if (!sourceBasis || !positiveNumber(volumeMl) || (volumeMl !== 1000 && !getBagVolumes(drug).includes(volumeMl))
      || !Array.isArray(components) || !components.length) return null;

  const rows = [];
  const seen = new Set();
  for (const component of components) {
    if (typeof component?.name !== 'string' || !component.name.trim()
        || typeof component.unit !== 'string' || !component.unit.trim()
        || typeof component.amount !== 'number' || !Number.isFinite(component.amount)
        || component.amount < 0) return null;
    const key = JSON.stringify([component.name, component.unit]);
    if (seen.has(key)) return null;
    seen.add(key);
    const amount = component.amount * (volumeMl / sourceBasis.volumeMl);
    if (!Number.isFinite(amount) || (component.amount > 0 && amount === 0)) return null;
    rows.push({ name: component.name, unit: component.unit, amount,
      display: displayAmount(amount) });
  }
  return rows;
}

/** Match exact source names and units; an unlisted component stays null. */
export function compareFluidContents(left, right, leftMl, rightMl) {
  const leftRows = fluidContents(left, leftMl);
  const rightRows = fluidContents(right, rightMl);
  if (!leftRows || !rightRows) return null;

  const rows = new Map();
  for (const row of leftRows) {
    rows.set(JSON.stringify([row.name, row.unit]), {
      name: row.name, unit: row.unit,
      left: { amount: row.amount, display: row.display }, right: null,
    });
  }
  for (const row of rightRows) {
    const key = JSON.stringify([row.name, row.unit]);
    if (!rows.has(key)) rows.set(key, { name: row.name, unit: row.unit, left: null, right: null });
    rows.get(key).right = { amount: row.amount, display: row.display };
  }
  return [...rows.values()];
}
