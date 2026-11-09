// Appearance preference: palette, contrast, text size and opening. A per-device UI convenience,
// stored separately from favorites. Nothing clinical is derived from it.

export const THEMES = [
  { id: 'portal', label: 'Portal', note: 'Matches the desktop Mediport app: cyan, cool grey, monospace.', color: '#0891b2' },
  { id: 'teal', label: 'Mediport teal', note: 'Matches the app icon and status bar.', color: '#145957' },
  { id: 'blue', label: 'Clinical blue', note: 'Conventional medical-software look.', color: '#2457c5' },
  { id: 'ink', label: 'Neutral ink', note: 'Color reserved for severity only.', color: '#1c2523' },
  { id: 'duo', label: 'Teal + indigo', note: 'Teal for controls, indigo for fired branches.', color: '#4338ca' },
];
export const CONTRASTS = [
  { id: 'standard', label: 'Standard' },
  { id: 'high', label: 'High contrast', note: 'Darker secondary text and lines for bright light.' },
];
export const TEXT_SIZES = [
  { id: 'standard', label: 'Standard' },
  { id: 'large', label: 'Large' },
];

export const OPENINGS = [
  { id: 'cinematic', label: 'Cinematic', note: 'The rendered temple opening.' },
  { id: 'classic', label: 'Classic', note: 'The original drawn opening with its spark.' },
  { id: 'off', label: 'Off', note: 'Open straight to Home.' },
];

const KEY = 'mediport-pocket-variant-b:appearance';

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      theme: THEMES.some((t) => t.id === parsed.theme) ? parsed.theme : 'portal',
      contrast: CONTRASTS.some((c) => c.id === parsed.contrast) ? parsed.contrast : 'standard',
      textSize: TEXT_SIZES.some((s) => s.id === parsed.textSize) ? parsed.textSize : 'standard',
      opening: OPENINGS.some((o) => o.id === parsed.opening) ? parsed.opening : 'cinematic',
    };
  } catch {
    return { theme: 'portal', contrast: 'standard', textSize: 'standard', opening: 'cinematic' };
  }
}

// The status bar of the Home Screen app takes its colour from theme-color, so it
// tracks the page background (palette and light/dark), never the accent.
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (meta && bg) meta.setAttribute('content', bg);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);

function apply(pref) {
  const root = document.documentElement;
  root.dataset.theme = pref.theme;
  if (pref.contrast === 'standard') delete root.dataset.contrast; else root.dataset.contrast = pref.contrast;
  if (pref.textSize === 'large') root.dataset.textSize = 'large'; else delete root.dataset.textSize;
  syncThemeColor();
}

export const appearance = {
  get: read,
  set(patch) {
    const next = { ...read(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* preference stays for this session only */ }
    apply(next);
    return next;
  },
  applyStored() { apply(read()); },
};
