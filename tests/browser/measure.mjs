// Browser-side geometry check. Keep this DOM-based so a CSS regression can fail it.
export function measureLayout({ selectors = [] } = {}) {
  const screen = document.querySelector('#screen');
  const phone = document.querySelector('#phone');
  const viewportWidth = window.innerWidth;
  const issues = [];
  const margin = 1.5;
  for (const [name, element] of [['document', document.documentElement], ['phone', phone], ['screen', screen]]) {
    if (element && element.scrollWidth > element.clientWidth + margin) {
      issues.push(`${name} horizontal scroll ${element.scrollWidth}/${element.clientWidth}`);
    }
  }
  const screenRect = screen?.getBoundingClientRect();
  const insideScrollport = (node) => {
    for (let parent = node.parentElement; parent && parent !== screen; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + margin) return true;
    }
    return false;
  };
  if (screenRect) for (const node of screen.querySelectorAll('*')) {
    if (!(node instanceof HTMLElement) || !node.offsetParent || insideScrollport(node)) continue;
    const box = node.getBoundingClientRect();
    if (box.width > 0 && (box.left < screenRect.left - margin || box.right > screenRect.right + margin)) {
      issues.push(`${node.tagName.toLowerCase()}.${String(node.className || '').replace(/\s+/g, '.').slice(0, 60)} outside screen: ${box.left.toFixed(1)}..${box.right.toFixed(1)} vs ${screenRect.left.toFixed(1)}..${screenRect.right.toFixed(1)}`);
      if (issues.length > 20) break;
    }
  }
  // Explicit text cells: a clipped ellipsis or a nowrap label can be inside an
  // otherwise contained card, so screen scrollWidth alone does not detect it.
  for (const selector of selectors) for (const node of document.querySelectorAll(selector)) {
    if (!(node instanceof HTMLElement) || !node.offsetParent || !node.textContent.trim()) continue;
    const style = getComputedStyle(node);
    const hidden = /(hidden|clip)/.test(style.overflowX) || style.textOverflow === 'ellipsis';
    if (hidden && node.scrollWidth > node.clientWidth + margin) {
      issues.push(`${selector} clipped: ${node.textContent.trim().slice(0, 90)}`);
    }
    if (style.textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth + margin) {
      issues.push(`${selector} ellipsis: ${node.textContent.trim().slice(0, 90)}`);
    }
  }
  const footer = document.querySelector('#footer:not([hidden])');
  const tabs = document.querySelector('#tabbar:not([hidden])');
  for (const [name, element] of [['footer', footer], ['bottom navigation', tabs]]) {
    if (!element) continue;
    const box = element.getBoundingClientRect();
    if (box.left < -margin || box.right > viewportWidth + margin || box.bottom > innerHeight + margin) {
      issues.push(`${name} outside viewport: ${box.left.toFixed(1)}..${box.right.toFixed(1)}, bottom ${box.bottom.toFixed(1)}`);
    }
  }
  return issues;
}
