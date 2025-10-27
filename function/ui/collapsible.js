// Collapsible headings for panel_term
// - Adds a toggle button to H1/H2/H3 inside #panel_term
// - Wraps following sibling blocks (indent/padding/etc.) into a collapsible container
// - Defaults: H1/H2 expanded, H3 collapsed

(function () {
  const PANEL_ID = 'panel_term';
  const HEADING_TAGS = ['H1', 'H2', 'H3'];

  function getLevel(el) {
    const t = el.tagName;
    if (t === 'H1') return 1;
    if (t === 'H2') return 2;
    if (t === 'H3') return 3;
    return 99;
  }

  function isHeading(el) {
    return el && HEADING_TAGS.includes(el.tagName);
  }

  function nextElement(el) {
    // Skip text nodes etc.
    let n = el.nextSibling;
    while (n && n.nodeType !== 1) n = n.nextSibling;
    return n;
  }

  function collectSectionSiblings(startHeading) {
    const level = getLevel(startHeading);
    const items = [];
    let cur = nextElement(startHeading);
    while (cur) {
      if (isHeading(cur) && getLevel(cur) <= level) break;
      items.push(cur);
      cur = nextElement(cur);
    }
    return items;
  }

  function hasLowerOrSameHeading(nodes, currentLevel) {
    // Return true if within the section there exists any descendant heading
    // with level >= currentLevel (i.e., lower or same level headings nested inside)
    for (const n of nodes) {
      if (isHeading(n) && getLevel(n) >= currentLevel) return true;
      if (n.querySelector) {
        // Optimize query by level needed (include same and lower levels)
        let selector = '';
        if (currentLevel <= 1) selector = 'h1, h2, h3';
        else if (currentLevel === 2) selector = 'h2, h3';
        else selector = 'h3';
        if (selector && n.querySelector(selector)) return true;
      }
    }
    return false;
  }

  function ensureButton(h, content) {
    // Avoid duplicate
    if (h.querySelector('.collapsible__toggle')) return h.querySelector('.collapsible__toggle');

    const btn = document.createElement('button');
    btn.className = 'collapsible__toggle';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'true');
    // Prepend a chevron symbol
    const icon = document.createElement('span');
    icon.className = 'collapsible__chevron';
    icon.textContent = '▾';
    btn.appendChild(icon);

    // Place at the start of heading content
    h.insertBefore(btn, h.firstChild);

    btn.addEventListener('click', () => {
      if (content.classList.contains('is-collapsed')) {
        expandSection(content, btn);
      } else {
        collapseSection(content, btn);
      }
    });

    // Also allow clicking the whole heading to toggle (except when clicking links/buttons inside)
    h.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea, select')) return;
      // If click on heading area (including whitespace), toggle
      if (e.currentTarget === h) btn.click();
    });

    return btn;
  }

  function wrapContent(nodes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'collapsible__content';
    if (nodes.length && nodes[0].parentNode) {
      const parent = nodes[0].parentNode;
      parent.insertBefore(wrapper, nodes[0]);
      nodes.forEach(n => wrapper.appendChild(n));
    }
    return wrapper;
  }

  function setup(container) {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
    if (!headings.length) return false;

    // Process in DOM order
    headings.forEach(h => {
      const sectionNodes = collectSectionSiblings(h);
      if (!sectionNodes.length) return; // nothing to fold

      const lvl = getLevel(h);
  // Only add collapsible if there exists a lower or same-level heading inside this section
  if (!hasLowerOrSameHeading(sectionNodes, lvl)) return;

      const wrapper = wrapContent(sectionNodes);
      const btn = ensureButton(h, wrapper);

      // Defaults: all expanded per user preference (no 'is-collapsed')
    });

    return true;
  }

  function onTransitionEnd(e, el) {
    if (e.propertyName !== 'height') return;
    // When expansion finished, set height auto for flexible content
    if (!el.classList.contains('is-collapsed')) {
      el.style.height = 'auto';
    }
    el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = null;
  }

  function collapseSection(el, btn) {
    // Freeze current height, then animate to 0
    el.style.height = el.scrollHeight + 'px';
    // force reflow
    void el.offsetHeight;
    el._collapseTEnd && el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = (ev) => onTransitionEnd(ev, el);
    el.addEventListener('transitionend', el._collapseTEnd);
    el.style.height = '0px';
    el.classList.add('is-collapsed');
    el.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.add('is-collapsed');
  }

  function expandSection(el, btn) {
    // Start from 0, animate to scrollHeight
    el.classList.remove('is-collapsed');
    // from collapsed state, current computed height is 0; set to 0 explicitly
    el.style.height = '0px';
    // force reflow
    void el.offsetHeight;
    el._collapseTEnd && el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = (ev) => onTransitionEnd(ev, el);
    el.addEventListener('transitionend', el._collapseTEnd);
    el.style.height = el.scrollHeight + 'px';
    el.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.remove('is-collapsed');
  }


  function tryInit() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      // Panel not yet injected (data-include still loading). Observe the body until it appears.
      const bodyObserver = new MutationObserver(() => {
        const p = document.getElementById(PANEL_ID);
        if (p) {
          bodyObserver.disconnect();
          initOnPanel(p);
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
      return;
    }
    initOnPanel(panel);
  }

  function initOnPanel(panel) {
    const container = panel.querySelector('main') || panel;
    if (!container) return;

    if (setup(container)) return;

    // If headings not yet injected into the panel (include_loader async), observe and init once
    const mo = new MutationObserver(() => {
      if (setup(container)) {
        mo.disconnect();
      }
    });
    mo.observe(container, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
