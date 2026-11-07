// Chooses the opening for a cold start of Home: the cinematic clip, the classic
// code-drawn sequence, or none. The choice lives in the appearance preference
// (lib/theme.js). Reduced motion always means no opening, and a pasted deep link
// never shows one. Both openings share one contract: { setPack, finished, abort }.
import { appearance } from './theme.js';
import { startBoot } from './boot.js';
import { startCinematic } from './opening-cinematic.js';

export function openingAllowed(path, choice = appearance.get().opening) {
  if (choice === 'off') return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return path === '/' || path === '/home';
}

export function startOpening(options, choice = appearance.get().opening) {
  return choice === 'classic' ? startBoot(options) : startCinematic(options);
}
