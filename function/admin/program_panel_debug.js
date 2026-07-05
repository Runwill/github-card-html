  const PANEL_ID = 'panel_term';
  const SHORTCUT_LABEL = 'Shift+F8';

  const state = {
    open: false,
    data: null,
    selectedKind: '',
    selectedId: '',
    loading: false
  };

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const tr = (key, fallback, params) => {
    try { return window.t ? window.t(key, params) : fallback; } catch (_) { return fallback; }
  };

  async function hasDebugPermission() {
    let role = window.endpoints?.storageGet?.('role') || localStorage.getItem('role') || '';
    const id = window.endpoints?.storageGet?.('id') || localStorage.getItem('id') || '';
    const requestJson = window.endpoints?.requestJson;
    if (id && requestJson) {
      try {
        const user = await requestJson('/user/' + encodeURIComponent(id), { auth: true });
        if (typeof user?.role === 'string') {
          role = user.role;
          localStorage.setItem('role', role);
        }
        if (Array.isArray(user?.permissions)) localStorage.setItem('permissions', JSON.stringify(user.permissions));
      } catch (_) {}
    }
    return role === 'admin';
  }

  function isProgramPanelActive() {
    return !!qs('#' + PANEL_ID + '.is-active');
  }

  function notify(message, type) {
    try { window.showToast?.(message, type); } catch (_) {}
  }

  function notifyDebugStateChanged() {
    try {
      window.dispatchEvent(new CustomEvent('program-debug:changed', { detail: { open: state.open } }));
    } catch (_) {}
  }

  function ensurePanel() {
    let panel = qs('#program-debug-panel');
    if (panel) return panel;
    const columns = qs('#main-content-row > .columns');
    if (!columns) return null;
    panel = document.createElement('aside');
    panel.id = 'program-debug-panel';
    panel.className = 'program-debug-panel';
    panel.hidden = true;
    panel.innerHTML = [
      '<div class="program-debug__head">',
      '  <div>',
      '    <div class="program-debug__title" data-i18n="programDebug.title"></div>',
      '    <div class="program-debug__hint" data-i18n="programDebug.hint"></div>',
      '  </div>',
      '  <button type="button" class="btn btn--secondary btn--xs program-debug__close" data-program-debug-close data-i18n="common.close"></button>',
      '</div>',
      '<div class="program-debug__body">',
      '  <div class="program-debug__editor">',
      '    <div class="program-debug__meta" data-program-debug-meta></div>',
      '    <section class="program-debug__source-card">',
      '      <div class="program-debug__label" data-i18n="programDebug.sourcePreview"></div>',
      '      <pre class="program-debug__source scrollbar-thin" data-program-debug-source></pre>',
      '    </section>',
      '    <label class="program-debug__field">',
      '      <span class="program-debug__label" data-i18n="programDebug.contentEditor"></span>',
      '      <textarea class="program-debug__textarea ui-field" spellcheck="false" data-program-debug-editor></textarea>',
      '    </label>',
      '    <details class="program-debug__raw">',
      '      <summary data-i18n="programDebug.rawData"></summary>',
      '      <pre class="program-debug__raw-code scrollbar-thin" data-program-debug-raw></pre>',
      '    </details>',
      '    <div class="program-debug__actions">',
      '      <button type="button" class="btn btn--secondary btn--xs" data-program-debug-locate data-i18n="programDebug.locate"></button>',
      '      <button type="button" class="btn btn--primary btn--xs" data-program-debug-save data-i18n="common.save"></button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    columns.appendChild(panel);
    bindPanel(panel);
    try { window.i18n?.applySafe?.(panel); } catch (_) {}
    return panel;
  }

  function bindPanel(panel) {
    qs('[data-program-debug-close]', panel)?.addEventListener('click', closePanel);
    qs('[data-program-debug-save]', panel)?.addEventListener('click', saveSelected);
    qs('[data-program-debug-locate]', panel)?.addEventListener('click', () => locateSelected(true));
    qs('[data-program-debug-editor]', panel)?.addEventListener('input', updateReadablePreview);
  }

  async function openPanel() {
    if (state.open || state.loading) return;
    const allowed = await hasDebugPermission();
    if (!allowed) {
      notify(tr('programDebug.noPermission', '需要管理员权限'), 'error');
      return;
    }
    const panel = ensurePanel();
    const columns = qs('#main-content-row > .columns');
    if (!panel || !columns) return;
    state.open = true;
    panel.hidden = false;
    columns.classList.add('program-debug-shell');
    notifyDebugStateChanged();
    await loadDebugData(false);
  }

  function closePanel() {
    const panel = qs('#program-debug-panel');
    const columns = qs('#main-content-row > .columns');
    state.open = false;
    if (panel) panel.hidden = true;
    if (columns) columns.classList.remove('program-debug-shell');
    clearDomSelection();
    notifyDebugStateChanged();
  }

  async function togglePanel() {
    if (!isProgramPanelActive()) return;
    if (state.open) closePanel();
    else await openPanel();
  }

  async function loadDebugData(force) {
    const panel = ensurePanel();
    if (!panel || state.loading) return;
    state.loading = true;
    setMeta(tr('programDebug.loading', '加载中...'));
    try {
      const suffix = force ? '&_=' + Date.now() : '';
      const data = await window.endpoints.requestJson('/program-panel/debug?id=panel_term' + suffix, { auth: 'always' });
      state.data = data;
      if (state.selectedKind && state.selectedId) selectItem(state.selectedKind, state.selectedId, false);
      else clearSelectedDetails();
    } catch (err) {
      setMeta(err?.message || tr('programDebug.loadFailed', '加载失败'));
      notify(err?.message || tr('programDebug.loadFailed', '加载失败'), 'error');
    } finally {
      state.loading = false;
    }
  }

  function inlineMarkup(content) {
    const nodes = Array.isArray(content) ? content : [];
    return nodes.map(nodeMarkup).join('');
  }

  function nodeMarkup(node) {
    if (typeof node === 'string') return escapeText(node);
    if (!node || typeof node !== 'object' || !node.tag) return '';
    const attrs = attrsMarkup(node.attrs);
    const inner = inlineMarkup(node.content);
    return '<' + node.tag + attrs + '>' + inner + '</' + node.tag + '>';
  }

  function attrsMarkup(attrs) {
    if (!attrs || typeof attrs !== 'object') return '';
    return Object.keys(attrs).sort().map(key => {
      const value = attrs[key];
      if (value === true) return ' ' + key;
      if (value == null || value === false) return '';
      return ' ' + key + '="' + escapeAttr(value) + '"';
    }).join('');
  }

  function blockMarkup(kind, item) {
    if (!item) return '';
    if (isHeadingKind(kind)) {
      const level = Math.max(1, Math.min(3, Number(item.level || 3)));
      return '<h' + level + attrsMarkup(item.attrs) + '>' + inlineMarkup(item.title) + '</h' + level + '>';
    }
    return '<div' + attrsMarkup(item.attrs || { class: 'indent' }) + '>' + inlineMarkup(item.content) + '</div>';
  }

  function findItem(kind, id) {
    const data = state.data || window.programPanelData || {};
    if (data.tree && Array.isArray(data.tree.children)) {
      const found = findTreeNode(data.tree.children, kind, id, []);
      return found && found.node || null;
    }
    const arr = isHeadingKind(kind) ? data.sections : data.statements;
    return (arr || []).find(item => item && item.id === id) || null;
  }

  function findTreeNode(nodes, kind, key, path) {
    for (let index = 0; index < (nodes || []).length; index++) {
      const node = nodes[index];
      const nodePath = path.concat(index);
      const nodeKind = treeNodeKind(node);
      if (nodeKind === kind && nodeKey(node, nodePath) === key) return { node, path: nodePath };
      const child = findTreeNode(node && node.children, kind, key, nodePath);
      if (child) return child;
    }
    return null;
  }

  function treeNodeKind(node) {
    if (!node) return '';
    if (node.type === 'term_heading') return 'heading';
    if (node.type === 'body') return 'body';
    return '';
  }

  function nodeKey(node, path) {
    return String(node && (node._id || node.id) || 'path:' + (path || []).join('.'));
  }

  function isHeadingKind(kind) {
    return kind === 'heading' || kind === 'section';
  }

  function selectItem(kind, id, shouldLocate) {
    const item = findItem(kind, id);
    if (!item) return;
    state.selectedKind = kind;
    state.selectedId = id;
    const panel = ensurePanel();
    const editor = panel && qs('[data-program-debug-editor]', panel);
    if (editor) editor.value = inlineMarkup(isHeadingKind(kind) ? item.title : item.content);
    renderSelectedDetails(kind, item);
    setSelectedControlsEnabled(true);
    markDomElement(kind, id);
    if (shouldLocate) locateSelected(true);
  }

  function clearSelectedDetails() {
    const panel = ensurePanel();
    const editor = panel && qs('[data-program-debug-editor]', panel);
    const source = panel && qs('[data-program-debug-source]', panel);
    const raw = panel && qs('[data-program-debug-raw]', panel);
    if (editor) editor.value = '';
    if (source) source.textContent = '';
    if (raw) raw.textContent = '';
    setMeta('<div class="program-debug__empty">' + escapeHtml(tr('programDebug.selectHint', '点击程序页正文开始编辑')) + '</div>');
    setSelectedControlsEnabled(false);
  }

  function setSelectedControlsEnabled(enabled) {
    const panel = ensurePanel();
    const locateBtn = panel && qs('[data-program-debug-locate]', panel);
    const saveBtn = panel && qs('[data-program-debug-save]', panel);
    if (locateBtn) locateBtn.disabled = !enabled;
    if (saveBtn) saveBtn.disabled = !enabled;
  }

  function renderSelectedDetails(kind, item) {
    const panel = ensurePanel();
    const source = panel && qs('[data-program-debug-source]', panel);
    const raw = panel && qs('[data-program-debug-raw]', panel);
    if (source) source.textContent = blockMarkup(kind, item);
    if (raw) raw.textContent = JSON.stringify(item, null, 2);
    setMeta(renderMeta(kind));
  }

  function renderMeta(kind) {
    const typeLabel = isHeadingKind(kind) ? tr('programDebug.section', '标题') : tr('programDebug.statement', '正文');
    return '<div><strong>' + escapeHtml(typeLabel) + '</strong></div>';
  }

  function updateReadablePreview() {
    const item = buildEditedItem();
    if (!item) return;
    renderSelectedDetails(state.selectedKind, item);
  }

  function buildEditedItem() {
    const item = findItem(state.selectedKind, state.selectedId);
    const panel = ensurePanel();
    const editor = panel && qs('[data-program-debug-editor]', panel);
    if (!item || !editor) return null;
    const next = JSON.parse(JSON.stringify(item));
    const content = parseInlineMarkup(editor.value);
    if (isHeadingKind(state.selectedKind)) next.title = content;
    else next.content = content;
    return next;
  }

  function setMeta(html) {
    const meta = qs('#program-debug-panel [data-program-debug-meta]');
    if (meta) meta.innerHTML = html || '';
  }

  function clearDomSelection() {
    qsa('.program-debug-dom-selected').forEach(el => el.classList.remove('program-debug-dom-selected'));
  }

  function domElement(kind, id) {
    return qs('#' + PANEL_ID + ' [data-program-kind="' + cssEscape(kind) + '"][data-program-key="' + cssEscape(id) + '"]')
      || qs('#' + PANEL_ID + ' [data-program-kind="' + cssEscape(kind) + '"][data-program-id="' + cssEscape(id) + '"]');
  }

  function markDomElement(kind, id) {
    clearDomSelection();
    const el = domElement(kind, id);
    if (el) el.classList.add('program-debug-dom-selected');
  }

  function expandAncestors(el) {
    let node = el && el.parentElement;
    while (node) {
      if (node.classList && node.classList.contains('collapsible__content') && node.classList.contains('is-collapsed')) {
        const heading = node.previousElementSibling;
        const toggle = heading && heading.querySelector && heading.querySelector('.collapsible__toggle.is-collapsed');
        if (toggle) toggle.click();
      }
      node = node.parentElement;
    }
  }

  function locateSelected(shouldFocus) {
    const el = domElement(state.selectedKind, state.selectedId);
    if (!el) return;
    expandAncestors(el);
    markDomElement(state.selectedKind, state.selectedId);
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) { el.scrollIntoView(); }
    if (shouldFocus) {
      el.classList.remove('program-debug-dom-pulse');
      void el.offsetWidth;
      el.classList.add('program-debug-dom-pulse');
    }
  }

  async function saveSelected() {
    if (!state.selectedKind || !state.selectedId) return;
    const value = buildEditedItem();
    if (!value) {
      notify(tr('programDebug.invalidContent', '内容片段不合法'), 'error');
      return;
    }
    const panel = ensurePanel();
    const saveBtn = qs('[data-program-debug-save]', panel);
    if (saveBtn) saveBtn.disabled = true;
    try {
      const result = await window.endpoints.requestJson('/program-panel/debug', {
        method: 'PATCH',
        auth: 'always',
        body: { panelId: 'panel_term', kind: state.selectedKind, itemId: state.selectedId, nodeId: state.selectedId, value }
      });
      notify(tr('programDebug.saved', '已保存'));
      await rerenderProgramPanel();
      await loadDebugData(true);
      selectItem(result.kind || state.selectedKind, result.item?._id || result.item?.id || state.selectedId, true);
    } catch (err) {
      notify(err?.message || tr('programDebug.saveFailed', '保存失败'), 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function rerenderProgramPanel() {
    if (typeof window.summonProgramPanel !== 'function') return;
    await window.summonProgramPanel();
    const panel = qs('#' + PANEL_ID);
    const main = panel && (panel.querySelector('main') || panel);
    try { if (main) window.runTextReplacers?.(main); } catch (_) {}
    try { window.syncTermPanelButtonStates?.(); } catch (_) {}
    try { window.add_button_wave?.(); } catch (_) {}
    try { window.initTermPanelCollapsible?.(); } catch (_) {}
  }

  function handleProgramClick(event) {
    if (!state.open) return;
    const target = event.target && event.target.closest && event.target.closest('#' + PANEL_ID + ' [data-program-kind][data-program-key], #' + PANEL_ID + ' [data-program-kind][data-program-id]');
    if (!target) return;
    selectItem(target.dataset.programKind, target.dataset.programKey || target.dataset.programId, false);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function parseInlineMarkup(markup) {
    const template = document.createElement('template');
    template.innerHTML = expandSelfClosingTags(markup || '');
    return Array.from(template.content.childNodes).map(inlineNodeFromDom).filter(node => node !== '');
  }

  function expandSelfClosingTags(markup) {
    return String(markup || '').replace(/<([a-zA-Z][\w:-]*)([^<>]*?)\s*\/>/g, '<$1$2></$1>');
  }

  function inlineNodeFromDom(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const item = { tag: node.tagName.toLowerCase() };
    const attrs = {};
    Array.from(node.attributes || []).forEach(attr => {
      attrs[attr.name] = attr.value;
    });
    if (Object.keys(attrs).length) item.attrs = attrs;
    const content = Array.from(node.childNodes || []).map(inlineNodeFromDom).filter(child => child !== '');
    if (content.length) item.content = content;
    return item;
  }

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return escapeText(value).replace(/"/g, '&quot;');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.addEventListener('click', handleProgramClick, true);
  document.addEventListener('keydown', event => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) return;
    if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'F8') {
      event.preventDefault();
      togglePanel();
    }
  });
  window.addEventListener('program-panel:rendered', () => {
    if (state.open && state.selectedKind && state.selectedId) markDomElement(state.selectedKind, state.selectedId);
  });
  window.addEventListener('i18n:changed', () => {
    const panel = qs('#program-debug-panel');
    if (panel) window.i18n?.applySafe?.(panel);
  });

  window.ProgramPanelDebug = {
    toggle: togglePanel,
    isOpen: () => state.open,
    shortcut: SHORTCUT_LABEL
  };
