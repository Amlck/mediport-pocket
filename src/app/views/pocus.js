import { h, icon, starButton, disclosure, formatDate } from '../lib/ui.js';
import { patientSession } from '../lib/session.js';
import { pocusAtlas } from '../lib/pocus-atlas.js';
import { pocusMeasurementIds } from '../lib/search.js';

// Scan completion is temporary working memory, never a diagnosis or a record.
const checkedTopics = new Map();
patientSession.onReset(() => checkedTopics.clear());
const checkedFor = (id) => checkedTopics.get(id) || new Set();

function review(data, topic) {
  return h('div', { class: 'pocus-review' },
    h('p', null, topic ? `Sources checked ${formatDate(topic.reviewedAt || data.reviewedAt)}` : 'Source-check dates are shown in each topic.'),
    h('p', null, data.reviewLabel));
}

function topicRow(topic) {
  return h('a', { class: 'row pocus-row', href: `#/pocus/${topic.id}` },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, topic.title),
      h('div', { class: 'row-sub' }, topic.summary)), icon('next', 18, 'chev'));
}

export function pocusView(ctx) {
  const data = ctx.data.pocus;
  if (!data?.topics?.length) return unavailable();
  const groups = [...new Set(data.topics.map((topic) => topic.group))];
  let selected = 'All';
  const filters = h('div', { class: 'pocus-filters', role: 'group', 'aria-label': 'POCUS category' });
  const results = h('div', { class: 'stack pocus-results' });
  function render() {
    filters.replaceChildren(...['All', ...groups].map((group) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(selected === group),
      onclick: () => { selected = group; render(); },
    }, group)));
    results.replaceChildren(...groups.filter((group) => selected === 'All' || selected === group).map((group) =>
      h('section', { class: 'pocus-group', 'aria-label': group },
        h('h2', { class: 'section-title' }, group),
        h('div', { class: 'list' }, data.topics.filter((topic) => topic.group === group).map(topicRow)))));
  }
  render();
  const el = h('div', { class: 'page pocus-page pocus-catalogue' },
    h('div', { class: 'pocus-intro' }, h('p', { class: 'pocus-lead' }, 'At the bedside'), h('p', { class: 'small' }, data.scope)),
    h('a', { class: 'search-launch', href: '#/search/pocus' }, icon('search', 20), 'Find a view, sign or measurement'),
    filters, results, review(data),
    h('div', { class: 'card' }, disclosure('About this first set', [
      h('p', null, 'Reference cards are included in the offline pack. Source websites need a connection.'),
      h('p', null, 'Not included yet:'),
      h('ul', null, data.coverage.deferred.map((item) => h('li', null, item))),
    ])));
  return { title: 'POCUS', el };
}

function unavailable() {
  return { title: 'POCUS', el: h('div', { class: 'page pocus-page' },
    h('p', { class: 'empty' }, 'This POCUS topic is not in this pack.'),
    h('a', { class: 'reference-return', href: '#/pocus' }, 'Browse POCUS')) };
}

function scanChecklist(topic) {
  const inputs = [];
  const count = h('p', { class: 'pocus-check-count', role: 'status', 'aria-live': 'polite' });
  const reset = h('button', { class: 'btn-small', type: 'button', onclick: () => {
    checkedTopics.delete(topic.id); render();
  } }, 'Reset checklist');
  function render() {
    const checked = checkedFor(topic.id);
    for (const { input, id } of inputs) input.checked = checked.has(id);
    count.textContent = `${checked.size} of ${topic.checklist.length} prompts checked`;
    reset.disabled = checked.size === 0;
  }
  const rows = topic.checklist.map((item) => {
    const input = h('input', { type: 'checkbox', onchange: () => {
      const checked = new Set(checkedFor(topic.id));
      if (input.checked) checked.add(item.id); else checked.delete(item.id);
      checkedTopics.set(topic.id, checked);
      patientSession.markActive(); render();
    } });
    inputs.push({ input, id: item.id });
    return h('label', { class: 'pocus-check-row' }, input,
      h('span', null, h('strong', null, item.label), h('small', null, item.detail)));
  });
  render();
  return {
    el: h('div', { class: 'card pocus-checklist' }, disclosure('Scan checklist', [
      h('p', { class: 'muted' }, 'Optional prompts, not recorded findings. Clears on reset, New patient or reload.'),
      ...rows, h('div', { class: 'pocus-check-footer' }, count, reset),
    ])),
    subscribe: () => patientSession.subscribe(render),
  };
}

export function pocusTopicView(ctx, [id, targetKind, targetId]) {
  const data = ctx.data.pocus;
  const topic = data?.topics?.find((entry) => entry.id === id);
  if (!topic) return unavailable();
  const checklist = topic.checklist?.length ? scanChecklist(topic) : null;
  const atlas = pocusAtlas(topic, data);
  const sources = data.sources.filter((source) => topic.referenceIds.includes(source.id));
  const measurementIds = pocusMeasurementIds(topic.measurements || []);
  const el = h('div', { class: 'page pocus-page pocus-topic', dataset: { topic: id } },
    h('div', { class: 'pocus-intro' }, h('p', { class: 'pocus-eyebrow' }, topic.group),
      h('p', { class: 'pocus-summary' }, topic.summary)),
    review(data, topic),
    atlas ? h('nav', { class: 'pocus-atlas-jumps', 'aria-label': 'Jump to topic content' },
      h('button', { type: 'button', onclick: () => jumpTo(el.querySelector('.pocus-quick-measurements h2, [aria-label="Scan sequence"] h2')) }, 'Quick reference'),
      h('button', { type: 'button', onclick: () => jumpTo(atlas.el.querySelector('h2')) }, 'Teaching atlas')) : null,
    topic.measurements.length ? h('section', { class: 'stack pocus-quick-measurements', 'aria-label': 'Measurement references' },
      h('h2', { class: 'section-title' }, 'Quick measurements'),
      h('div', { class: 'pocus-measure-grid' }, topic.measurements.map((item, index) => h('article', {
        class: 'card pocus-measurement', dataset: { pocusMeasurement: measurementIds[index] }, tabindex: '-1',
      },
        h('h3', { class: 'pocus-measure-name' }, item.name),
        h('p', { class: 'pocus-measure-value' }, item.value),
        h('p', { class: 'pocus-measure-context' }, item.context),
        disclosure('Technique & context', h('p', null, item.technique)))))) : null,
    topic.steps.length ? h('section', { class: 'stack', 'aria-label': 'Scan sequence' },
      h('h2', { class: 'section-title' }, 'Scan sequence'),
      h('ol', { class: 'pocus-steps' }, topic.steps.map((step, index) => h('li', { class: 'pocus-step' },
        h('span', { class: 'stepnum', 'aria-hidden': 'true' }, index + 1),
        h('div', null, h('h3', null, step.title), h('p', null, step.text)))))) : null,
    atlas?.el,
    topic.findings.length ? h('section', { class: 'stack', 'aria-label': 'Findings and limits' },
      h('h2', { class: 'section-title' }, 'Findings & limits'),
      topic.findings.map((finding) => h('article', { class: 'card pocus-finding' },
        h('h3', null, finding.term), h('p', null, finding.meaning),
        h('p', { class: 'pocus-caution' }, finding.caution)))) : null,
    checklist?.el,
    topic.pitfalls.length ? h('div', { class: 'card' }, disclosure('Limits & pitfalls',
      h('ul', null, topic.pitfalls.map((item) => h('li', null, item))))) : null,
    topic.related.length ? h('nav', { class: 'pocus-related', 'aria-label': 'Related POCUS topics' },
      h('h2', { class: 'section-title' }, 'Related'),
      topic.related.map((link) => h('a', { href: link.href }, link.title, icon('next', 16)))) : null,
    h('div', { class: 'card pocus-sources' }, disclosure('Sources & review', [
      ...sources.map((source) => h('a', { class: 'reflink', href: source.url, target: '_blank', rel: 'noopener noreferrer' }, source.label)),
      h('p', { class: 'muted' }, 'Source websites require a connection. These cards are part of the downloaded reference pack.'),
    ])));
  let unsubscribe;
  function jumpTo(target) {
    if (!target) return;
    target.tabIndex = -1;
    const screen = target.closest('#screen');
    if (screen) screen.scrollTop += target.getBoundingClientRect().top - screen.getBoundingClientRect().top - (screen.querySelector('.topbar')?.getBoundingClientRect().height || 0) - 8;
    target.focus({ preventScroll: true });
  }
  function focusTarget() {
    if (!targetId || !['atlas', 'measurement'].includes(targetKind)) return;
    let target;
    if (targetKind === 'measurement') target = el.querySelector(`[data-pocus-measurement="${targetId}"]`);
    else target = el.querySelector(`[data-atlas-item="${targetId}"]`) || el.querySelector(`[data-atlas-section="${targetId}"]`);
    if (!target) return;
    const section = target.closest('.pocus-atlas-section');
    if (section) section.open = true;
    const focusNode = target.matches('.pocus-atlas-section') ? target.querySelector('summary') : target;
    if (!focusNode) return;
    if (focusNode === target && !target.matches('.pocus-measurement')) focusNode.tabIndex = -1;
    const screen = target.closest('#screen');
    if (screen) screen.scrollTop += target.getBoundingClientRect().top - screen.getBoundingClientRect().top - (screen.querySelector('.topbar')?.getBoundingClientRect().height || 0) - 8;
    focusNode.focus({ preventScroll: true });
  }
  return {
    title: topic.title, el, right: starButton(`pocus:${id}`, 'favorite'),
    onMount() { unsubscribe = checklist?.subscribe(); focusTarget(); },
    onUnmount() { unsubscribe?.(); atlas?.dispose(); },
  };
}
