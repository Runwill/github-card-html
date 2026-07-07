// Hover notes are disabled globally. Keep this module as a compatibility layer
// so legacy tooltip calls cannot recreate native title boxes or #lore-tooltip.
const HINT_SELECTOR = '[title],[data-tooltip]';
let observerStarted = false;

function removeLoreTooltip() {
  try { document.getElementById('lore-tooltip')?.remove(); } catch (_) {}
}

function preserveAccessibleName(el, title) {
  if (!title || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
  try { el.setAttribute('aria-label', title); } catch (_) {}
}

function removeI18nHintBindings(el) {
  const raw = el.getAttribute('data-i18n-attr');
  if (!raw) return;
  const kept = raw.split(',')
    .map(attr => attr.trim())
    .filter(attr => attr && attr !== 'title' && attr !== 'data-tooltip');

  if (kept.length) el.setAttribute('data-i18n-attr', kept.join(','));
  else el.removeAttribute('data-i18n-attr');

  ['title', 'data-tooltip'].forEach(attr => {
    el.removeAttribute('data-i18n-' + attr);
    el.removeAttribute('data-i18n-params-' + attr);
  });
}

function stripHint(el) {
  if (!(el instanceof Element)) return;
  if (el.hasAttribute('title')) {
    preserveAccessibleName(el, el.getAttribute('title'));
    el.removeAttribute('title');
  }
  if (el.hasAttribute('data-tooltip')) el.removeAttribute('data-tooltip');
  removeI18nHintBindings(el);
}

function stripTree(root = document) {
  try {
    if (root instanceof Element && root.matches(HINT_SELECTOR)) stripHint(root);
    root.querySelectorAll?.(HINT_SELECTOR).forEach(stripHint);
    removeLoreTooltip();
  } catch (_) {}
}

function stripEventPath(target) {
  let el = target instanceof Element ? target : target?.parentElement;
  while (el && el instanceof Element) {
    if (el.matches(HINT_SELECTOR)) stripHint(el);
    el = el.parentElement;
  }
  removeLoreTooltip();
}

function observeHints() {
  if (observerStarted || !document.documentElement || typeof MutationObserver !== 'function') return;
  observerStarted = true;
  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === 'attributes') stripHint(record.target);
      record.addedNodes.forEach(node => {
        if (node instanceof Element) stripTree(node);
      });
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title', 'data-tooltip']
  });
}

function noop(anchor) {
  if (anchor instanceof Element) stripHint(anchor);
  removeLoreTooltip();
}

document.addEventListener('mouseover', event => stripEventPath(event.target), true);
document.addEventListener('pointerover', event => stripEventPath(event.target), true);
document.addEventListener('focusin', event => stripEventPath(event.target), true);

stripTree(document);
observeHints();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => stripTree(document), { once: true });
}

window.LoreTooltip = { showLore: noop, hide: noop };
window.HoverHints = { suppress: stripTree };
