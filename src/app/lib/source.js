import { h } from './ui.js';

export const SOURCE_REPOSITORY = 'https://github.com/Amlck/mediport-pocket';

export function sourceCard(release) {
  const commit = release.source?.commit;
  const verifiedCommit = typeof commit === 'string' && /^[a-f0-9]{40}$/.test(commit) ? commit : null;
  return h('section', { class: 'card stack', 'aria-label': 'Source and contributions' },
    h('h2', { class: 'card-title' }, 'Source & contributions'),
    h('p', { class: 'small' }, 'Inspect the code, report a problem or propose a change on GitHub. Original code uses the MIT license; media keeps its credited licenses.'),
    h('a', { class: 'reflink', href: SOURCE_REPOSITORY, target: '_blank', rel: 'noopener noreferrer' }, 'View source on GitHub'),
    h('a', { class: 'reflink', href: SOURCE_REPOSITORY + '/issues/new/choose', target: '_blank', rel: 'noopener noreferrer' }, 'Report an issue'),
    h('a', { class: 'reflink', href: SOURCE_REPOSITORY + '/blob/main/CONTRIBUTING.md', target: '_blank', rel: 'noopener noreferrer' }, 'Contribution guidelines'),
    verifiedCommit ? h('a', { class: 'reflink', href: SOURCE_REPOSITORY + '/tree/' + verifiedCommit, target: '_blank', rel: 'noopener noreferrer' }, `Source for this version · ${verifiedCommit.slice(0, 12)}`) : null);
}
