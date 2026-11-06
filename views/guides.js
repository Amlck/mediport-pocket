import { h, icon, starButton, formatDate, note, disclosure, openSheet, stepNumber } from '../lib/ui.js';
import { patientSession } from '../lib/session.js';
import { groupBrowseEntries } from '../lib/search.js';
import { hyperkalemiaShiftPresentation } from '../lib/guide-dose-presentation.js';
import { actionDrugReferences } from '../lib/guide-drug-links.js';
import { referenceNavigation } from '../lib/reference-navigation.js';

// Session answers live in memory only, keyed by guide id. They survive tab
// switches, never reloads. Every field starts as 'unknown'.
const sessions = new Map();
patientSession.onReset(() => sessions.clear());
const UNKNOWN = 'unknown';

function sessionFor(guide) {
  if (!sessions.has(guide.id)) sessions.set(guide.id, { values: {} });
  return sessions.get(guide.id);
}

// Mirrors the main-app renderer: a value the field does not offer collapses to 'unknown'.
function normalize(fields, values) {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    field.options.some(([value]) => value === values[field.key]) ? values[field.key] : UNKNOWN,
  ]));
}

function reviewPending(guide) {
  return /pending/.test(guide.reviewState || '');
}

function browseReviewStatus(guide) {
  const state = guide.reviewState || '';
  const label = guide.reviewLabel || '';
  if (state.includes('evidence-limited')) return 'Evidence-limited review';
  if (state.includes('source-update-pending')) return 'Source update pending';
  if (state.includes('local-regimen-review-pending')) {
    return /focused source review/i.test(label)
      ? 'Focused review · regimen pending'
      : 'Source review · regimen pending';
  }
  if (state.includes('historical-local-snapshot')) return 'Source review · local historical';
  if (state.includes('hospital-guidance')) return 'Hospital-source review';
  if (state.includes('source-reviewed-inpatient')) return 'Inpatient source review';
  if (/scope-limited/i.test(label)) return 'Scope-limited review';
  return state.includes('source-reviewed') ? 'Source review' : 'Review status unspecified';
}

export function guidesView(ctx) {
  const guides = ctx.data.guides;
  const excluded = ctx.data.excludedGuides || [];
  const groups = groupBrowseEntries(guides);
  const el = h('div', { class: 'page guide-browse' },
    h('a', { class: 'search-launch', href: '#/search/guide' }, icon('search', 20), `Search ${guides.length} guides`),
    h('a', { class: 'pocus-guide-entry', href: '#/pocus' },
      h('span', null, h('strong', null, 'POCUS'),
        h('small', null, `${ctx.data.pocus?.topics?.length || 0} offline topics · ${ctx.data.pocus?.reviewLabel || 'Reference'}`)),
      icon('next', 20)),
    h('nav', { class: 'chips browse-jumps', 'aria-label': 'Guide alphabetical sections' }, groups.map((group) =>
      h('button', { class: 'chip', type: 'button', onclick: () => el.querySelector(`#guides-${group.id}`)?.scrollIntoView({ block: 'start' }) }, group.label))),
    groups.map((group) => h('section', { id: `guides-${group.id}`, class: 'browse-group', 'aria-label': group.label },
      h('h2', { class: 'letter' }, `${group.label} · ${group.entries.length}`),
      h('div', { class: 'list' }, group.entries.map((guide) => h('a', { class: 'row', href: `#/guides/${guide.id}` },
      h('div', { class: 'row-main' },
        h('div', { class: 'row-title' }, guide.title),
        h('div', { class: 'row-sub guide-browse-meta' },
          h('span', { class: 'guide-browse-status' }, browseReviewStatus(guide)),
          h('span', { class: 'guide-browse-date' }, `Reviewed ${formatDate(guide.reviewedAt)}`))),
      icon('next', 20, 'chev')))))),
    excluded.length
      ? h('div', { class: 'card' }, disclosure(`${excluded.length} main-app guide${excluded.length === 1 ? '' : 's'} not in this pack`,
        excluded.map((item) => h('p', { class: 'small' }, h('strong', null, item.title), ' — ', item.reason))))
      : null,
    h('p', { class: 'muted pad-x' }, 'Engines are copied from the main app at build time, byte-for-byte apart from cache-buster query strings on imports. Review labels and pending states are the source’s, not the pack’s.'));
  return { title: 'Guides', subtitle: `${guides.length} management guides`, el };
}

function entryContext(entry) {
  if (!entry) return null;
  const statements = [...new Set([entry.text, entry.guidance, entry.scope].filter(Boolean))];
  return h('div', { class: 'guide-entry-context' },
    h('p', null, h('strong', null, 'Entry: '), entry.title || statements.shift() || 'Source entry'),
    statements.map((text) => h('p', null, text)),
    entry.source?.url ? h('a', { class: 'reflink', href: entry.source.url, target: '_blank', rel: 'noopener noreferrer' },
      icon('external', 16), entry.source.label || entry.source.url) : null);
}

function metaCard(guide, local) {
  const meta = guide.sourceMetadata || {};
  const metadataLabels = {
    reviewedAt: 'Source metadata review date', sourceReview: 'Source review scope',
    guideVersion: 'Source metadata version', prototypeSource: 'Frozen source',
    prototypeReviewedAt: 'Frozen source review date', localSourceStatus: 'Local source status',
    statusOnly: 'Status only', reviewState: 'Source metadata review state',
    evidenceLimit: 'Evidence limit',
  };
  return h('section', { class: 'guide-meta', 'aria-label': 'Guide review and limits' },
    h('div', { class: 'guide-meta-strip' },
      h('div', { class: 'guide-provenance-chips' },
        h('span', { class: 'chip accent' }, icon('check', 16), `Reviewed ${formatDate(guide.reviewedAt)}`),
        local ? h('span', { class: 'chip attention' }, 'Local rows: historical') : null,
        reviewPending(guide) ? h('span', { class: 'chip attention' }, 'Review pending') : null),
      guide.reviewLabel ? h('span', { class: 'guide-review-label' }, guide.reviewLabel) : null),
    h('div', { class: 'guide-meta-disclosures' },
      disclosure('Scope and limits', [
        entryContext(guide.entry),
        guide.scope ? h('p', null, guide.scope) : null,
        guide.reviewNotice ? h('p', null, guide.reviewNotice) : null,
        guide.resourceNotice ? h('p', null, guide.resourceNotice) : null,
        guide.reviewState ? h('p', null, h('strong', null, 'Review state: '), guide.reviewState) : null,
        guide.reviewLimitations?.length ? h('ul', null, guide.reviewLimitations.map((line) => h('li', null, line))) : null,
        guide.guideVersion ? h('p', null, h('strong', null, 'Source version: '), guide.guideVersion) : null,
        Object.entries(meta).map(([key, value]) => value == null || value === '' ? null :
          h('p', null, h('strong', null, `${metadataLabels[key] || key}: `), String(value))),
      ]),
      guide.quickReference?.redFlags?.length
        ? disclosure('Escalation triggers', h('ul', null, guide.quickReference.redFlags.map((line) => h('li', null, line))))
        : null),
    guide.quickReference?.redFlags?.length ? h('p', { class: 'guide-escalation-caution' }, 'Do not delay urgent care.') : null);
}

// Criterion states from the entry layers: DKA/HHS use present/absent/unknown,
// AKI uses met/notmet/unknown. Labels follow the desktop renderer.
const CRITERION_LABEL = { present: 'Met', met: 'Met', absent: 'Not met', notmet: 'Not met' };
const CRITERION_TONE = { present: 'ok', met: 'ok', absent: 'attention', notmet: 'attention' };

function criterionChip(status) {
  return h('span', { class: `chip ${CRITERION_TONE[status] || ''}` }, CRITERION_LABEL[status] || 'Unconfirmed');
}

function criteriaList(criteria) {
  return h('ul', { class: 'criteria' }, criteria.map((row) => h('li', { class: `criterion ${CRITERION_TONE[row.status] || ''}` },
    h('div', null, h('div', { class: 'crit-label' }, row.label), row.threshold ? h('div', { class: 'crit-rule' }, row.threshold) : null),
    criterionChip(row.status))));
}

// DKA/HHS: the two diagnostic cards and the routing verdict from the engine's
// own diagnosis. Rendered between the diagnostic and the treatment findings, as
// the desktop guide does; nothing here is computed in the view.
function diagnosisCard(result) {
  const cards = result.diagnosticCards || [];
  const routing = result.routing;
  if (!cards.length || !routing) return null;
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Diagnostic criteria'),
    cards.map((card) => h('section', { class: 'crit-card' },
      h('div', { class: 'crit-head' }, h('strong', null, card.title), criterionChip(card.status)),
      criteriaList(card.criteria))),
    h('p', { class: 'small mt-8' }, h('strong', null, routing.title)),
    routing.summary ? h('p', { class: 'muted mt-6' }, routing.summary) : null,
    routing.reasons?.length ? disclosure('Why', routing.reasons.map((r) => h('p', null, r.text)), { className: 'compact' }) : null,
    result.diagnosisReady ? null : h('p', { class: 'muted mt-8' }, 'Treatment findings appear once DKA or HHS criteria are established.'));
}

// The main-app renderer hides the treatment fields of a diagnostic-gated guide
// until the diagnosis is ready; engines with their own visibleFieldKeys() decide
// for themselves.
function visibleFieldKeys(config, fields, values) {
  if (typeof config.visibleFieldKeys === 'function') return config.visibleFieldKeys(values);
  if (config.diagnosticFields && !config.diagnosisReady(values)) {
    const diagnostic = new Set(config.diagnosticFields.map((f) => f.key));
    return fields.filter((f) => f.key === 'criticalFeature' || diagnostic.has(f.key)).map((f) => f.key);
  }
  return fields.map((f) => f.key);
}

function phaseControl(field, values, set) {
  // The explicit unknown option remains selectable after a phase is chosen.
  const compact = field.options.length <= 3 && field.options.every(([, label]) => label.length <= 18);
  return h('section', { class: 'guide-phase', 'aria-labelledby': 'assessment' },
    h('h2', { id: 'assessment', class: 'guide-section-label', tabindex: '-1' }, field.label),
    h('div', { class: `guide-phase-options ${compact ? 'compact' : ''}`, role: 'group', 'aria-labelledby': 'assessment' },
      field.options.map(([value, label]) => h('button', {
        type: 'button', class: `guide-phase-option ${value === UNKNOWN ? 'unknown' : ''}`,
        'aria-pressed': String(values.phase === value),
        dataset: { fieldKey: field.key, choiceValue: value }, onclick: () => set(field.key, value),
      }, label))),
    field.threshold ? h('p', { class: 'guide-phase-hint' }, field.threshold) : null,
    field.essential ? h('p', { class: 'guide-phase-hint' }, field.essential) : null,
    field.help || field.definition ? disclosure('Definitions', h('p', null, field.help || field.definition), { className: 'compact' }) : null);
}

function questionCard(field, values, set, number) {
  const compact = field.options.length <= 4 && field.options.filter(([value]) => value !== UNKNOWN)
    .every(([, label]) => label.length <= 14);
  const definition = field.help || field.definition;
  const headingId = `guide-question-${number}`;
  return h('section', { class: 'guide-question', 'aria-labelledby': headingId },
    h('div', { class: 'guide-question-heading' }, stepNumber(number), h('h3', { id: headingId }, field.label)),
    field.threshold ? h('p', { class: 'guide-question-hint' }, field.threshold) : null,
    h('div', { class: `guide-choices ${compact ? 'compact' : ''}`, role: 'group', 'aria-labelledby': headingId },
      field.options.map(([value, label]) => h('button', {
        type: 'button',
        class: `guide-choice ${value === UNKNOWN ? 'unknown' : ''}`,
        'aria-pressed': String(values[field.key] === value),
        dataset: { fieldKey: field.key, choiceValue: value },
        onclick: () => set(field.key, value),
      }, h('span', { class: 'guide-choice-check', 'aria-hidden': 'true' }, values[field.key] === value ? icon('check', 20) : null),
      h('span', { class: 'guide-choice-label' }, label)))),
    field.essential ? h('p', { class: 'guide-question-hint' }, field.essential) : null,
    definition ? disclosure('Definitions', h('p', null, definition), { className: 'compact' }) : null);
}

// Resolves a resource group to source rows the same four ways the main app does:
// explicit set indices, set + order codes, a whole set, or catalog product codes.
function localRowsFor(local, groupId) {
  const sets = local.pathway.sets;
  const group = groupId ? local.pathway.groups[groupId] : null;
  const rows = [];
  const push = (set, index) => rows.push({ kind: 'row', row: set.rows[index], set, index, key: `${set.id}:${index}` });
  if (!group) {
    for (const set of sets) set.rows.forEach((_, index) => push(set, index));
    return rows;
  }
  for (const ref of group.selections || []) {
    const set = sets.find((s) => s.id === ref.set);
    for (const index of ref.indices || []) if (set?.rows[index]) push(set, index);
  }
  if (group.set) {
    const set = sets.find((s) => s.id === group.set);
    (set?.rows || []).forEach((row, index) => { if (!group.codes || group.codes.includes(row.orderCode)) push(set, index); });
  }
  for (const code of group.catalogCodes || []) {
    const identity = local.productIdentities.find((p) => p.code === code);
    rows.push({ kind: 'identity', code, identity, key: `catalog:${code}` });
  }
  return rows;
}

function identityRow(local, { code, identity }) {
  return h('div', { class: 'lrow' },
    h('div', { class: 'meta' },
      h('span', { class: 'chip' }, 'Catalog identity'),
      h('span', { class: 'chip code' }, code),
      identity ? null : h('span', { class: 'chip attention' }, 'identity unresolved')),
    identity ? h('div', { class: 'name' }, identity.tradeLabel || identity.genericName || code) : h('div', { class: 'name' }, code),
    identity ? h('div', { class: 'ident' }, [identity.genericName, identity.chineseName, identity.maxDose].filter(Boolean).join(' · ')) : null);
}

// Put the distinct caution beside a saved instruction. The complete source
// note remains available when its first sentence is only placeholder context
// or when it contains further qualifications.
export function instructionReviewPresentation(review) {
  if (!review) return null;
  const trimmed = review.trim();
  if (!trimmed) return null;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const generic = /^(?:Instruction stored under|Zero-dose saline|Historical free-text instruction|Saved instruction requires independent clinical review|This is source text, not a saline|Section heading:)/i;
  const material = sentences.filter((sentence) => !generic.test(sentence));
  const distinct = material.find((sentence) => /\b(?:not|no|do not|does not|cannot|must|should|requires|pending)\b/i.test(sentence)) || material[0];
  const essential = distinct || sentences[0] || trimmed;
  return { essential, complete: review, hasMore: essential !== trimmed, specific: Boolean(distinct) };
}

function localRow(local, entry) {
  if (entry.kind === 'identity') return identityRow(local, entry);
  const { row, index, key } = entry;
  const presentation = local.pathway.rowPresentation?.[key];
  const review = local.pathway.rowReviewNotes?.[key];
  const identity = local.productIdentities.find((p) => p.code === row.orderCode);
  const unresolved = local.unresolvedIdentityCodes.includes(row.orderCode);
  if (presentation?.kind === 'instruction') {
    const reviewPresentation = instructionReviewPresentation(review);
    return h('div', { class: 'lrow' },
      h('div', { class: 'meta' }, h('span', { class: 'chip' }, `Row ${index + 1}`), h('span', { class: 'chip' }, 'instruction')),
      h('div', { class: 'instr' }, presentation.label),
      reviewPresentation ? h('div', { class: `guide-instruction-review ${reviewPresentation.specific ? 'specific' : ''}` },
        reviewPresentation.specific ? h('p', null, h('strong', null, 'Review note · '), reviewPresentation.essential) : null,
        reviewPresentation.hasMore || !reviewPresentation.specific
          ? disclosure(reviewPresentation.specific ? 'Full saved review note' : 'Saved review note', h('p', null, reviewPresentation.complete), { className: 'compact' }) : null) : null);
  }
  return h('div', { class: 'lrow' },
    h('div', { class: 'meta' },
      h('span', { class: 'chip' }, `Row ${index + 1}`),
      h('span', { class: 'chip code' }, row.orderCode || '—'),
      row.category ? h('span', { class: 'chip' }, row.category) : null,
      row.selfPay ? h('span', { class: 'chip' }, row.selfPay) : null,
      unresolved ? h('span', { class: 'chip attention' }, 'identity unresolved') : null),
    h('div', { class: 'name' }, presentation?.label || row.orderName),
    identity ? h('div', { class: 'ident' }, [identity.genericName, identity.chineseName].filter(Boolean).join(' · ')) : null,
    review ? h('div', { class: 'review' }, review) : null);
}

export function rowsBySet(local, rows) {
  const groups = new Map();
  for (const entry of rows) {
    const label = entry.kind === 'identity' ? 'Catalog identity' : entry.set.label || entry.set.id;
    const key = entry.kind === 'identity' ? 'catalog' : entry.set.id;
    if (!groups.has(key)) groups.set(key, {
      label, generatedAt: entry.kind === 'identity' ? local.sourceSnapshot.catalogGeneratedAt : entry.set.generatedAt, rows: [],
    });
    groups.get(key).rows.push(entry);
  }
  return [...groups.values()];
}

function openLocalSheet(local, guide, groupId) {
  const group = groupId ? local.pathway.groups[groupId] : null;
  const rows = localRowsFor(local, groupId);
  const sections = rowsBySet(local, rows);
  openSheet({
    title: group ? (group.label || groupId.replaceAll('-', ' ')) : `All ${rows.length} historical rows`,
    body: [
      note('attention', 'Historical source rows. Each folder is dated below; rows are not current regimens, orders or availability claims.'),
      group?.note ? h('p', { class: 'small' }, group.note) : null,
      disclosure('Full source notices', [
        guide.resourceNotice ? h('p', null, guide.resourceNotice) : null,
        guide.resourceCaution ? h('p', null, h('strong', null, 'Guide resource caution: '), guide.resourceCaution) : null,
        local.notices.map((text) => h('p', null, text)),
      ]),
      sections.map((section) => h('div', { class: 'card guide-local-folder' },
        h('div', { class: 'card-title' }, `${section.label} · ${section.rows.length}`),
        h('p', { class: 'guide-folder-date' }, `Folder snapshot: ${formatDate(section.generatedAt)}`),
        section.rows.map((entry) => localRow(local, entry)))),
      rows.length ? null : h('p', { class: 'muted' }, 'This group names no rows in the snapshot.'),
    ],
  });
}

function actionCard(action, local, guide, guideById, drugs) {
  const tone = action.tone || '';
  const group = action.resourceGroup && local?.pathway.groups[action.resourceGroup];
  const rowCount = group ? localRowsFor(local, action.resourceGroup).length : 0;
  const dose = hyperkalemiaShiftPresentation(guide.id, action);
  const related = (action.related || []).map((id) => guideById.get(id)).filter(Boolean);
  const references = actionDrugReferences(guide.id, action, drugs);
  return h('article', { class: `action ${tone}`, dataset: { actionId: action.id } },
    tone ? h('div', { class: 'tone-tag' }, tone === 'urgent' ? 'Urgent' : 'Needs attention') : null,
    h('h4', null, action.title),
    dose ? [
      h('p', { class: 'summary guide-dose-recommendation' }, dose.recommendation),
      h('section', { class: 'guide-dose-reference', 'aria-label': 'Reference dose' },
        h('div', { class: 'guide-dose-heading' }, 'Reference dose'),
        h('div', { class: 'guide-dose-row' },
          h('span', { class: 'guide-dose-label' }, 'Insulin + glucose'),
          h('p', null, dose.insulinGlucose)),
        h('div', { class: 'guide-dose-row guide-dose-adjunct' },
          h('span', { class: 'guide-dose-label' }, 'Adjunct only'),
          h('p', null, dose.adjunct))),
      h('p', { class: 'guide-dose-monitoring' },
        h('strong', null, 'Safety and monitoring · '), dose.monitoring),
    ] : action.summary ? h('p', { class: 'summary' }, action.summary) : null,
    references.length ? h('nav', { class: 'guide-drug-references', 'aria-label': 'Drug references' },
      h('span', null, 'Drug reference'),
      references.map((drug) => h('a', {
        href: drug.href, 'aria-label': `Open ${drug.name} drug reference`,
        onclick: (event) => {
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) referenceNavigation.start(guide);
        },
      }, drug.name))) : null,
    related.length ? h('nav', { class: 'guide-related', 'aria-label': 'Related guides' },
      h('span', null, 'Related'),
      related.map((item) => h('a', { href: `#/guides/${item.id}` }, item.title, icon('next', 14)))) : null,
    disclosure([h('span', null, 'Details'), action.sourceSection ? h('span', { class: 'sec' }, ` · §${action.sourceSection}`) : null], [
      h('p', null, action.detail),
      action.sourceUrl ? h('a', { class: 'reflink', href: action.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 16), action.sourceLabel || 'Guideline source') : null,
      group ? h('button', { class: 'btn-small', type: 'button', onclick: () => openLocalSheet(local, guide, action.resourceGroup) },
        icon('rows', 16), ` ${group.label || action.resourceGroup.replaceAll('-', ' ')} (${rowCount})`) : null,
    ]));
}

function resultsSection(guide, result, local, questions, values, onAssessment, guideById, drugs) {
  const actions = result.actions || [];
  const unanswered = questions.filter((field) => values[field.key] === UNKNOWN).length;
  const stages = guide.stages.filter((stage) => !result.visibleStageIds || result.visibleStageIds.includes(stage.id));
  const urgent = actions.filter((a) => a.tone === 'urgent').length;
  const conflicts = actions.filter((a) => guide.conflictActionIds.includes(a.id));
  const withheld = result.withheld || [];
  return h('section', { class: 'results', id: 'plan' },
    h('div', { class: 'results-head' },
      h('h2', { id: 'plan-title', tabindex: '-1' }, 'Plan'),
      h('div', { class: 'chips' },
        h('span', { class: 'chip' }, `${actions.length} action${actions.length === 1 ? '' : 's'}`),
        urgent ? h('span', { class: 'chip urgent' }, `${urgent} urgent`) : null),
      h('button', { class: 'guide-back-to-assessment', type: 'button', onclick: onAssessment }, 'Assessment ↑')),
    result.entry?.title ? h('div', { class: 'card' },
      h('p', { class: 'small' }, h('strong', null, result.entry.title)),
      result.entry.summary ? h('p', { class: 'muted mt-6' }, result.entry.summary) : null,
      result.entry.criteria?.length ? criteriaList(result.entry.criteria) : null) : null,
    unanswered ? note('attention', `${unanswered} unanswered. Unknown is not a negative finding; each unknown keeps a verification action in the plan.`) : null,
    conflicts.length ? note('attention', 'Conflicting findings. Reconcile the flagged actions before acting on the rest of the plan.') : null,
    stages.map((stage, i) => {
      const own = actions.filter((a) => a.stage === stage.id);
      const stageTone = own.some((a) => a.tone === 'urgent') ? 'urgent' : own.some((a) => a.tone === 'attention') ? 'attention' : '';
      return h('div', { class: 'stage' },
        h('div', { class: 'stage-head' }, stepNumber(i + 1, stageTone), h('h3', null, stage.title)),
        own.length ? own.map((a) => actionCard(a, local, guide, guideById, drugs)) : h('p', { class: 'stage-empty' }, result.stageNotes?.[stage.id] || stage.empty || 'No additional action from the reviewed findings.'));
    }),
    withheld.length ? h('div', { class: 'card' }, disclosure('Not prioritized from these answers', withheld.map((t) => h('p', null, t)))) : null);
}

function localCard(local, guide) {
  if (!local) return null;
  const total = local.pathway.sets.reduce((sum, set) => sum + set.rows.length, 0);
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Local historical resources'),
    h('p', { class: 'small' }, `${total} saved rows across ${local.pathway.sets.length} historical folder${local.pathway.sets.length === 1 ? '' : 's'}, each dated in the source view and kept separate from guideline actions.`),
    h('button', { class: 'btn-ghost', type: 'button', onclick: () => openLocalSheet(local, guide, null) }, 'View all rows'));
}

function sepsisReference(guide) {
  if (guide.id !== 'sepsis-septic-shock' || !guide.quickReference) return null;
  const reference = guide.quickReference;
  return h('div', { class: 'card guide-clinical-reference' },
    disclosure('SSC 2026 clinical reference', [
      reference.summary ? h('p', null, reference.summary) : null,
      reference.recognition?.length ? h('section', null,
        h('h3', null, 'Recognition'),
        h('ul', null, reference.recognition.map((text) => h('li', null, text)))) : null,
      reference.steps?.length ? h('section', null,
        h('h3', null, 'Care sequence'),
        h('ol', null, reference.steps.map((step) => h('li', null,
          h('strong', null, step.role), h('p', null, step.text))))) : null,
      reference.monitoring?.length ? h('section', null,
        h('h3', null, 'Monitoring & continuity'),
        h('ul', null, reference.monitoring.map((text) => h('li', null, text)))) : null,
      reference.sources?.length ? h('section', null,
        h('h3', null, 'Sources'),
        reference.sources.map((source) => source.url
          ? h('a', { class: 'reflink', href: source.url, target: '_blank', rel: 'noopener noreferrer' },
            icon('external', 16), source.label || source.url)
          : h('p', null, source.label))) : null,
    ]));
}

function sourcesCard(guide) {
  if (!guide.sources.length) return null;
  return h('div', { class: 'card' },
    h('div', { class: 'card-title' }, 'Sources'),
    guide.sources.map((s) => h('a', { class: 'reflink', href: s.url, target: '_blank', rel: 'noopener noreferrer' }, icon('external', 16), s.label || s.title || s.url)),
    h('p', { class: 'muted' }, 'Opens the guideline online; the pack does not include the PDF.'));
}

function notFound(id) {
  return { title: 'Guide', el: h('div', { class: 'page' }, note('urgent', `No guide “${id}” in this pack.`), h('a', { class: 'btn-ghost', href: '#/guides' }, 'All guides')) };
}

export function guideView(ctx, [id]) {
  const guide = ctx.data.guides.find((g) => g.id === id);
  if (!guide) return notFound(id);
  const guideById = new Map(ctx.data.guides.map((item) => [item.id, item]));
  const local = ctx.data.guideResources?.[id] || null;
  const session = sessionFor(guide);
  const phaseField = guide.fields.find((f) => f.key === 'phase') || null;
  const el = h('div', { class: 'page guide-page' });
  const counts = h('div', { class: 'counts' });
  function jumpTo(selector) {
    const target = el.querySelector(selector);
    if (!target) return;
    target.focus({ preventScroll: true });
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior, block: 'start' });
  }
  const planButton = h('button', { class: 'btn-small guide-plan-jump', type: 'button', onclick: () => jumpTo('#plan-title') }, 'View plan ↓');
  const footer = h('div', { class: 'summarybar guide-footer' }, counts, planButton);
  let engine = ctx.engines[id] || null;
  let mounted = false;
  let restoreFrame = 0;
  // Details and reading position are tied to this exact answer set. The engine
  // may finish after mount; only restore once the complete view exists.
  function restoreReadingPosition() {
    if (!mounted || !engine || !session.reading || session.reading.answers !== JSON.stringify(session.values)) return;
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    restoreFrame = requestAnimationFrame(() => {
      restoreFrame = 0;
      if (!mounted || !session.reading) return;
      [...el.querySelectorAll('details')].forEach((details, index) => { details.open = Boolean(session.reading.open[index]); });
      const screen = el.closest('.screen');
      if (screen) screen.scrollTop = session.reading.scrollTop;
    });
  }

  function set(key, value) {
    patientSession.markActive();
    session.reading = null;
    session.values = { ...session.values, [key]: value };
    render();
    [...el.querySelectorAll('[data-field-key]')]
      .find((button) => button.dataset.fieldKey === key && button.dataset.choiceValue === value)
      ?.focus({ preventScroll: true });
  }
  function reset() { session.values = {}; session.reading = null; referenceNavigation.clear(id); render(); }

  function render() {
    if (!engine) {
      el.replaceChildren(metaCard(guide, local), note('plain', 'Loading guide engine…'));
      counts.replaceChildren(h('span', null, 'Loading'));
      planButton.hidden = true;
      return;
    }
    const config = engine.config;
    const values = normalize(guide.fields, session.values);
    const visibleKeys = visibleFieldKeys(config, guide.fields, values);
    const result = config.evaluate(values);
    const questions = guide.fields.filter((f) => f.key !== 'phase' && visibleKeys.includes(f.key));
    const gated = phaseField && values.phase === UNKNOWN;
    const lastDiagnosticKey = config.diagnosticFields?.at(-1)?.key;
    el.replaceChildren(...[
      metaCard(guide, local),
      phaseField ? phaseControl(phaseField, values, set) : h('h2', { id: 'assessment', class: 'guide-section-label', tabindex: '-1' }, 'Assessment'),
      questions.map((field, index) => [questionCard(field, values, set, index + 1), field.key === lastDiagnosticKey ? diagnosisCard(result) : null]),
      gated ? note('plain', `Choose ${phaseField.label.toLowerCase()} to see staged actions.`)
        : resultsSection(guide, result, local, questions, values, () => jumpTo('#assessment'), guideById, ctx.data.drugs),
      localCard(local, guide),
      sepsisReference(guide),
      sourcesCard(guide),
      h('button', { class: 'btn-ghost', type: 'button', onclick: reset }, icon('reset', 18), ' Reset answers'),
    ].flat(Infinity).filter(Boolean));

    const urgent = (result.actions || []).filter((a) => a.tone === 'urgent').length;
    const answered = questions.filter((f) => values[f.key] !== UNKNOWN).length;
    counts.replaceChildren(...[
      gated ? h('span', null, 'No phase selected') : h('span', null, `${answered}/${questions.length} answered · ${(result.actions || []).length} actions`),
      !gated && urgent ? h('span', { class: 'chip urgent' }, `${urgent} urgent`) : null,
    ].filter(Boolean));
    planButton.hidden = Boolean(gated);
    restoreReadingPosition();
  }

  render();
  if (!engine) {
    ctx.loadEngine(id).then((loaded) => { engine = loaded; if (el.isConnected) render(); })
      .catch((error) => { if (el.isConnected) el.replaceChildren(metaCard(guide, local), note('urgent', `Guide engine could not be loaded: ${error.message || error}`)); });
  }
  const onMount = () => { mounted = true; restoreReadingPosition(); };
  const onUnmount = () => {
    mounted = false;
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    const screen = el.closest('.screen');
    if (engine && screen) session.reading = {
      answers: JSON.stringify(session.values), scrollTop: screen.scrollTop,
      open: [...el.querySelectorAll('details')].map((details) => details.open),
    };
  };
  return { title: guide.title, el, right: starButton(`guide:${guide.id}`, 'guide favorite'), footer, onMount, onUnmount };
}
