import { h, icon, starButton, note, disclosure, toast } from '../lib/ui.js';
import { chipRows, sourceCard, relatedCard } from './calc-parts.js';
import { patientSession } from '../lib/session.js';

// Systematic ECG interpretation, one question at a time. The questions, the
// branching order and the summary (alerts, chips, narrative) all come from
// EKG_GUIDE (portal-ekg-engine.js, shared with the desktop wizard); this view
// only walks the sequence and renders what the engine returns.

const session = { answers: {}, history: [], finalNote: '', qtMs: '', heartRate: '' };
function resetSession() { session.answers = {}; session.history = []; session.finalNote = ''; session.qtMs = ''; session.heartRate = ''; }
patientSession.onReset(resetSession);
const SEV_TONE = { danger: 'urgent', caution: 'attention', info: 'info' };
const CHIP_TONE = { ok: 'ok', caution: 'attention', alert: 'urgent', note: '' };
const FIGURE_PATHS = Object.freeze({
  '/static/img/ekg/normal-qrs-v1-v6.png': './images/ekg/normal-qrs-v1-v6.png',
  '/static/img/ekg/rbbb-v1-v6.png': './images/ekg/rbbb-v1-v6.png',
  '/static/img/ekg/lbbb-v1-v6.png': './images/ekg/lbbb-v1-v6.png',
  '/static/img/ekg/qrs-axis.png': './images/ekg/qrs-axis.png',
});

function referenceFigure(img) {
  const source = FIGURE_PATHS[img.src];
  if (!source) return null; // Explicit build allowlist: never load arbitrary engine URLs.
  return h('figure', { class: 'ekg-figure' },
    h('img', { src: new URL('../' + source.replace(/^\.\//, ''), import.meta.url).href, alt: img.alt || img.caption || 'ECG reference figure', loading: 'lazy' }),
    img.caption ? h('figcaption', null, img.caption) : null);
}

function refSections(step) {
  if (!step.ref?.length) return null;
  return disclosure('Reference', step.ref.map((sec) => h('div', { class: 'ekg-ref' },
    h('div', { class: 'ekg-ref-title' }, sec.t),
    sec.items?.length ? h('ul', null, sec.items.map((item) => h('li', null, item))) : null,
    sec.formula ? h('div', { class: 'formula' }, sec.formula) : null,
    (sec.images || []).map(referenceFigure))), { className: 'compact ecg-reference' });
}

function qtcAid(ctx) {
  const result = h('p', { class: 'ekg-qtc-result', role: 'status' });
  const qt = h('input', { type: 'number', inputmode: 'numeric', min: 100, max: 800, step: 1, value: session.qtMs,
    'aria-label': 'QT interval in milliseconds', placeholder: 'ms' });
  const heartRate = h('input', { type: 'number', inputmode: 'numeric', min: 20, max: 250, step: 1, value: session.heartRate,
    'aria-label': 'Heart rate per minute', placeholder: '/min' });
  function update() {
    session.qtMs = qt.value;
    session.heartRate = heartRate.value;
    const q = Number(qt.value);
    const hr = Number(heartRate.value);
    if (!qt.value || !heartRate.value) {
      result.textContent = 'Enter measured QT and heart rate to see both corrections.';
      return;
    }
    if (!Number.isFinite(q) || !Number.isFinite(hr) || q < 100 || q > 800 || hr < 20 || hr > 250) {
      result.textContent = 'Use QT 100–800 ms and heart rate 20–250/min; check the measured values.';
      return;
    }
    const calculated = ctx.engines.calculators.CALCULATOR_FORMULAS.qtc({ qtMs: q, heartRate: hr });
    result.textContent = calculated
      ? `Bazett ${calculated.bazett} ms · Fridericia ${calculated.fridericia} ms. ${calculated.preferred === 'fridericia' ? 'Fridericia preferred at this heart rate.' : 'Bazett preferred at this heart rate.'}`
      : 'QTc could not be calculated; check the measured values.';
  }
  qt.addEventListener('input', () => { patientSession.markActive(); update(); });
  heartRate.addEventListener('input', () => { patientSession.markActive(); update(); });
  update();
  return h('div', { class: 'ekg-qtc-aid' },
    h('div', { class: 'ekg-qtc-aid-title' }, 'QT / heart rate aid'),
    h('div', { class: 'ekg-qtc-inputs' },
      h('label', null, h('span', null, 'QT interval · ms'), qt),
      h('label', null, h('span', null, 'Heart rate · /min'), heartRate)),
    result,
    h('p', { class: 'muted' }, 'Measure QT in lead II or V5; exclude U waves. Review wide QRS or irregular rhythms before interpreting QTc.'),
    h('a', { href: '#/calc/qtc', class: 'ekg-qtc-link' }, 'Open full QTc calculator for sex-specific limits and caveats'));
}

export function ekgView(ctx) {
  const guide = ctx.engines.calculators.EKG_GUIDE;
  const el = h('div', { class: 'page calculator-page ecg-page' });
  const footer = h('div', { class: 'actionbar' });

  const sequence = () => guide.buildSequence(session.answers);
  const currentId = () => {
    const seq = sequence();
    return seq.find((id) => id !== 'summary' && !(id in session.answers)) || 'summary';
  };

  function choose(stepId, value) {
    patientSession.markActive();
    session.answers = { ...session.answers, [stepId]: value };
    // Answers to steps that the new branch no longer asks are dropped.
    const seq = guide.buildSequence(session.answers);
    session.answers = Object.fromEntries(Object.entries(session.answers).filter(([id]) => seq.includes(id)));
    session.history = [...session.history.filter((id) => id !== stepId), stepId];
    render();
  }
  function back() {
    const last = session.history[session.history.length - 1];
    if (!last) return;
    const { [last]: _dropped, ...rest } = session.answers;
    session.answers = rest;
    session.history = session.history.slice(0, -1);
    render();
  }
  function jumpTo(stepId) {
    const index = session.history.indexOf(stepId);
    if (index < 0) return;
    const keep = session.history.slice(0, index);
    session.answers = Object.fromEntries(keep.map((id) => [id, session.answers[id]]));
    session.history = keep;
    render();
  }
  function restart() {
    resetSession();
    render();
  }

  function crumbs() {
    if (!session.history.length) return null;
    return h('nav', { class: 'chips ekg-crumbs', 'aria-label': 'Completed ECG steps' }, session.history.map((id) => {
      const step = guide.STEPS[id];
      const opt = step.opts.find((o) => o.v === session.answers[id]);
      return h('button', { type: 'button', class: 'chip', onclick: () => jumpTo(id) }, `${step.label}: ${opt ? opt.l : session.answers[id]}`);
    }));
  }

  function questionCard(step, position, total) {
    return h('section', { class: 'card q ecg-question' },
      h('p', { class: 'muted ecg-progress' }, `Step ${position} of ${total} · ${step.label}`),
      h('h3', { class: 'q-label' }, step.q),
      step.sub ? h('p', { class: 'muted q-hint' }, step.sub) : null,
      h('div', { class: 'choices wide', role: 'group', 'aria-label': step.q },
        step.opts.map((o) => h('button', { type: 'button', class: 'choice two-line', onclick: () => choose(step.id, o.v) },
          h('span', { class: 'choice-main' }, o.l, o.badge ? h('span', { class: `chip ${o.badge.type === 'warn' ? 'attention' : o.badge.type === 'danger' ? 'urgent' : ''}` }, o.badge.txt) : null),
          o.s ? h('span', { class: 'choice-sub' }, o.s) : null))),
      step.id === 'qtc' ? qtcAid(ctx) : null,
      refSections(step));
  }

  function related() {
    const a = session.answers;
    const items = [];
    if (a.rhythm === 'afib' || a.narrow_tach === 'af_mat') items.push({ href: '#/guides/atrial-fibrillation-rvr', label: 'Atrial fibrillation with RVR guide', why: 'rate control and anticoagulation decisions' }, { href: '#/calc/chads2-vasc', label: 'CHA₂DS₂-VASc', why: 'stroke risk in AF' });
    if (a.st === 'stemi' || a.t_waves === 'deep_sym') items.push({ href: '#/guides/acute-chest-pain-acs', label: 'Acute chest pain / ACS guide', why: 'ischaemic pattern' });
    if (a.rate === 'tachy') items.push({ href: '#/guides/tachycardia-with-pulse', label: 'Tachycardia with a pulse', why: 'ACLS classification and escalation' });
    if (a.rate === 'brady' || (a.brady_av && a.brady_av !== 'sinus_brady')) items.push({ href: '#/guides/bradycardia', label: 'Bradycardia with a pulse', why: 'atropine response and pacing' });
    if (a.t_waves === 'peaked' || a.qrs_type === 'meta') items.push({ href: '#/guides/hyperkalemia', label: 'Hyperkalaemia guide', why: 'peaked T waves or a metabolic wide QRS' });
    if (a.qtc === 'prolonged' || a.qtc === 'borderline' || a.t_waves === 'flat_u') items.push({ href: '#/calc/qtc', label: 'Corrected QT', why: 'measure and read the QTc by sex' }, { href: '#/calc/electrolytes', label: 'Electrolyte screen', why: 'K⁺ and Mg²⁺' });
    return items;
  }

  function summaryCard() {
    const built = guide.buildSummary(session.answers, session.finalNote);
    const worst = built.alerts.some((a) => a.sev === 'danger') ? 'urgent' : built.alerts.length ? 'attention' : 'ok';
    const desktopChecklist = ctx.data.ecg?.finalChecklist;
    const noteInput = h('textarea', { class: 'ekg-note', rows: 3, placeholder: 'Clinical context / note (kept in memory only)', 'aria-label': 'Clinical context note' }, session.finalNote);
    noteInput.addEventListener('input', () => { patientSession.markActive(); session.finalNote = noteInput.value.trim(); });
    return [
      h('div', { class: 'results-head' }, h('h2', null, 'Interpretation'), h('span', { class: `chip ${worst}` }, worst === 'urgent' ? 'Urgent alert' : worst === 'attention' ? 'Review' : 'No alerts')),
      built.alerts.map((a) => note(SEV_TONE[a.sev] || 'info', `${a.title}. ${a.body}`)),
      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, 'Findings'),
        chipRows(built.chips.map((c) => ({ label: c.l, chip: c.cls === 'ok' ? 'OK' : c.cls === 'alert' ? 'Alert' : c.cls === 'caution' ? 'Caution' : 'Noted', tone: CHIP_TONE[c.cls] || '' })))),
      h('div', { class: 'card' },
        h('div', { class: 'card-title' }, 'Narrative'),
        h('ul', { class: 'checks' }, built.narrative.map((line) => h('li', null, line))),
        noteInput,
        h('button', { class: 'btn-small', type: 'button', onclick: async () => {
          const text = guide.buildSummary(session.answers, session.finalNote).copyText;
          try { await navigator.clipboard.writeText(text); toast('Interpretation copied'); } catch { toast('Copy is not available here'); }
        } }, 'Copy interpretation')),
      desktopChecklist ? disclosure('Desktop reference checklist', [
        h('p', { class: 'muted ekg-checklist-status' }, 'Desktop reference · clinical review date not recorded.'),
        h('ul', { class: 'checks' }, desktopChecklist.items.map((item) => h('li', null, item))),
        h('p', { class: 'muted ekg-checklist-source' }, `Source: ${desktopChecklist.sourcePath} · SHA-256 ${desktopChecklist.sourceSha256.slice(0, 16)}…`),
      ], { className: 'compact ekg-checklist' }) : null,
      relatedCard(related(), ctx),
      sourceCard([
        'Step definitions, branching, figures and summary from portal-ekg-engine.js :: EKG_GUIDE, shared with the desktop EKG wizard. QT/heart-rate aid uses the shared calculator formula.',
        `ekg-engine sha256 ${ctx.engines.calculators.CALCULATOR_SOURCES.ekgEngine.sha256.slice(0, 16)}… · pack ${ctx.release.version}`,
      ]),
    ];
  }

  function render() {
    const seq = sequence();
    const id = currentId();
    const total = seq.length - 1;
    const children = id === 'summary'
      ? [crumbs(), h('section', { class: 'results ecg-results', 'aria-label': 'ECG interpretation' }, summaryCard())]
      : [crumbs(), questionCard(guide.STEPS[id], seq.indexOf(id) + 1, total)];
    el.replaceChildren(...children.flat(Infinity).filter(Boolean));
    footer.replaceChildren(
      h('button', { class: 'btn-secondary', type: 'button', onclick: restart }, 'Restart'),
      h('button', { class: 'btn-primary', type: 'button', disabled: !session.history.length, onclick: back }, icon('back', 18), ' Back'));
    if (id === 'summary') el.querySelector('.ecg-results')?.scrollIntoView({ block: 'start' });
  }

  render();
  return { title: 'ECG', el, right: starButton('calc:ekg', 'calculator favorite'), footer };
}
