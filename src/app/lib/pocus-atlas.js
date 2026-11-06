import { h } from './ui.js';

let viewerNumber = 0;

function imagePath(image) {
  return `images/pocus/${encodeURIComponent(image.file)}`;
}

function sourceLink(source, label) {
  return h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, label);
}

function attribution(image, sources) {
  const source = sources.get(image.sourceId);
  return h('p', { class: 'pocus-atlas-credit' },
    source ? sourceLink(source, `${image.credit} · ${image.sourceFigure}`) : `${image.credit} · ${image.sourceFigure}`,
    ' · ',
    h('a', { href: image.licenseUrl, target: '_blank', rel: 'noopener noreferrer' }, image.license),
    image.changes ? h('span', null, ` · Changes: ${image.changes}`) : null);
}

function makeViewer() {
  let dialog = null;
  let opener = null;
  let disposed = false;

  function cleanup(closing) {
    if (dialog !== closing) return;
    dialog = null;
    closing.remove();
    if (!disposed && opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }

  function close() {
    if (!dialog) return;
    const closing = dialog;
    if (closing.open) closing.close();
    cleanup(closing);
  }

  function open(image, sources, button) {
    if (disposed) return;
    close();
    opener = button;
    const titleId = `pocus-image-title-${++viewerNumber}`;
    const picture = h('img', { src: imagePath(image), alt: image.alt, width: image.width, height: image.height, decoding: 'async' });
    const imageArea = h('div', { class: 'pocus-viewer-image' }, picture);
    const zoom = h('button', { class: 'pocus-viewer-action', type: 'button', 'aria-pressed': 'false', onclick: () => {
      const enlarged = imageArea.classList.toggle('zoomed');
      zoom.textContent = enlarged ? 'Fit image' : 'Zoom image';
      zoom.setAttribute('aria-pressed', String(enlarged));
      imageArea.scrollTo(0, 0);
    } }, 'Zoom image');
    const dismiss = h('button', { class: 'pocus-viewer-action', type: 'button', onclick: close }, 'Close');
    dialog = h('dialog', { class: 'pocus-viewer', 'aria-labelledby': titleId },
      h('div', { class: 'pocus-viewer-head' },
        h('h2', { id: titleId }, image.caption),
        h('div', { class: 'pocus-viewer-actions' }, zoom, dismiss)),
      imageArea,
      h('div', { class: 'pocus-viewer-meta' }, attribution(image, sources)));
    const current = dialog;
    dialog.addEventListener('close', () => cleanup(current), { once: true });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    document.body.append(dialog);
    dialog.showModal();
    dismiss.focus({ preventScroll: true });
  }

  return { open, dispose() { disposed = true; close(); } };
}

function figure(image, sources, viewer) {
  const enlarge = h('button', { class: 'pocus-atlas-enlarge', type: 'button',
    'aria-label': `Enlarge image: ${image.caption}` },
  h('img', { src: imagePath(image), alt: image.alt, width: image.width, height: image.height, loading: 'lazy', decoding: 'async' }),
  h('span', { 'aria-hidden': 'true' }, 'Enlarge image'));
  enlarge.addEventListener('click', () => viewer.open(image, sources, enlarge));
  return h('figure', { class: 'pocus-atlas-figure', dataset: { atlasImage: image.id } },
    enlarge,
    h('figcaption', null, h('p', { class: 'pocus-atlas-caption' }, image.caption), attribution(image, sources)));
}

function clipFigure(clip, sources, mediaElements) {
  const descriptionId = `pocus-clip-description-${++viewerNumber}`;
  const player = h('video', {
    class: 'pocus-atlas-player', src: imagePath(clip), poster: `images/pocus/${encodeURIComponent(clip.poster)}`,
    width: clip.width, height: clip.height, controls: true, playsinline: true, preload: 'none',
    'aria-label': `Play clip: ${clip.caption}`, 'aria-describedby': descriptionId,
  });
  mediaElements.push(player);
  return h('figure', { class: 'pocus-atlas-figure pocus-atlas-video', dataset: { atlasVideo: clip.id } },
    player,
    h('figcaption', null,
      h('p', { class: 'pocus-atlas-caption' }, clip.caption),
      h('p', { class: 'pocus-atlas-clip-cue' }, `Clip · ${Math.round(clip.duration * 10) / 10} s`),
      h('p', { class: 'pocus-atlas-description', id: descriptionId }, clip.alt),
      attribution(clip, sources)));
}

function itemCard(item, images, clips, sources, viewer, mediaElements) {
  const figures = item.imageIds.map((id) => images.get(id)).filter(Boolean);
  const motion = (item.videoIds || []).map((id) => clips.get(id)).filter(Boolean);
  return h('article', { class: 'pocus-atlas-item', dataset: { atlasItem: item.id } },
    h('h4', null, item.title),
    h('ul', { class: 'pocus-atlas-criteria' }, item.criteria.map((criterion) => h('li', null, criterion))),
    item.caution ? h('p', { class: 'pocus-atlas-item-caution' }, item.caution) : null,
    figures.length || motion.length ? h('div', { class: 'pocus-atlas-figures' },
      figures.map((image) => figure(image, sources, viewer)),
      motion.map((clip) => clipFigure(clip, sources, mediaElements))) : null);
}

function atlasSection(section, index, images, clips, sources, viewer, mediaElements) {
  const references = section.referenceIds.map((id) => sources.get(id)).filter(Boolean);
  return h('details', { class: 'pocus-atlas-section', open: index === 0, dataset: { atlasSection: section.id } },
    h('summary', null, h('h3', { class: 'pocus-atlas-section-title' }, section.title),
      h('span', { class: 'pocus-atlas-section-count' }, `${section.items.length} ${section.items.length === 1 ? 'card' : 'cards'}`)),
    h('div', { class: 'pocus-atlas-section-body' },
      h('p', { class: 'pocus-atlas-section-intro' }, section.intro),
      section.caution ? h('p', { class: 'pocus-atlas-section-caution' }, section.caution) : null,
      h('div', { class: 'pocus-atlas-items' }, section.items.map((item) => itemCard(item, images, clips, sources, viewer, mediaElements))),
      references.length ? h('details', { class: 'pocus-atlas-source-details' },
        h('summary', null, 'Criteria sources'),
        h('p', { class: 'pocus-atlas-references' },
          references.map((source, i) => [i ? ' · ' : null, sourceLink(source, source.label)]))) : null));
}

export function pocusAtlas(topic, catalogue) {
  if (!topic.atlas?.length) return null;
  const images = new Map((catalogue.images || []).map((image) => [image.id, image]));
  const clips = new Map((catalogue.videos || []).map((clip) => [clip.id, clip]));
  const sources = new Map((catalogue.sources || []).map((source) => [source.id, source]));
  const viewer = makeViewer();
  const mediaElements = [];
  const sections = topic.atlas.map((section, index) => atlasSection(section, index, images, clips, sources, viewer, mediaElements));
  const pauseAll = () => { for (const player of mediaElements) player.pause(); };
  const sectionListeners = sections.map((section) => {
    const onToggle = () => { if (!section.open) for (const player of section.querySelectorAll('video')) player.pause(); };
    section.addEventListener('toggle', onToggle);
    return onToggle;
  });
  const playListeners = mediaElements.map((player) => {
    const onPlay = () => { for (const other of mediaElements) if (other !== player) other.pause(); };
    player.addEventListener('play', onPlay);
    return onPlay;
  });
  const onVisibilityChange = () => { if (document.hidden) pauseAll(); };
  if (mediaElements.length) document.addEventListener('visibilitychange', onVisibilityChange);
  const hasClips = mediaElements.length > 0;
  const jumps = topic.atlas.length > 1 ? h('nav', { class: 'pocus-atlas-jumps', 'aria-label': 'Jump to atlas section' },
    topic.atlas.map((section, index) => h('button', { type: 'button', onclick: () => {
      const target = sections[index];
      target.open = true;
      const screen = target.closest('#screen');
      if (screen) screen.scrollTop += target.getBoundingClientRect().top - screen.getBoundingClientRect().top - (screen.querySelector('.topbar')?.getBoundingClientRect().height || 0) - 8;
      target.querySelector('summary').focus({ preventScroll: true });
    } }, section.title))) : null;
  const el = h('section', { class: 'pocus-atlas', 'aria-label': 'Teaching atlas' },
    h('div', { class: 'pocus-atlas-heading' },
      h('h2', { class: 'section-title' }, 'Teaching atlas'),
      h('p', null, hasClips
        ? 'Source images and motion clips with criteria. Tap an image to enlarge; play clips in place.'
        : 'Source images with criteria. Tap an image to enlarge.')),
    jumps, sections);
  return { el, dispose() {
    viewer.dispose();
    sections.forEach((section, index) => section.removeEventListener('toggle', sectionListeners[index]));
    mediaElements.forEach((player, index) => {
      player.removeEventListener('play', playListeners[index]);
      player.pause();
      player.removeAttribute('src');
      player.load();
    });
    if (mediaElements.length) document.removeEventListener('visibilitychange', onVisibilityChange);
  } };
}
