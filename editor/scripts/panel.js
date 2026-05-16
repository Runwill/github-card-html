;(function () {
  'use strict';

  var ns = window.CardEditor = window.CardEditor || {};
  var STORAGE_KEY = 'cardEditorTreeStructure';
  var state = {
    nodes: [],
    selectedId: null,
    entries: [],
    defaultElements: {},
    chineseMap: {},
    variantMode: false,
    escapeQuotes: true,
    lastInsertedKey: '',
    outputHtml: '',
    dropTargetId: null,
    dropMode: '',
    draggingNodeId: '',
    draggingEntryKey: '',
    suppressClick: false,
    relationIndex: null,
    relationCorpus: [],
    bidirectionalMode: true,
    logs: [],
    editingNodeId: '',
    lastRecommendationLogSignature: '',
    activeView: 'editor',
    relationGraphVersion: 0,
    renderedRelationGraphVersion: -1,
    undoStack: [],
    redoStack: []
  };
  var els = {};
  var pointerDrag = null;
  var POINTER_DRAG_THRESHOLD = 6;
  var HISTORY_LIMIT = 80;
  var GUIDE_COLOR_COUNT = 5;

  function t(key, params) {
    return window.t ? window.t(key, params) : key;
  }

  function safe(fn) {
    try { return fn && fn(); } catch (_) { return undefined; }
  }

  function logEditor(key, params) {
    var text = t(key, params || {});
    var stamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    state.logs.push(stamp + ' ' + text);
    if (state.logs.length > 80) state.logs = state.logs.slice(state.logs.length - 80);
    renderLog();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function isEditorActive() {
    var panel = byId('panel_draft');
    return !!(panel && panel.classList.contains('is-active'));
  }

  function walk(nodes, callback, parent, list) {
    nodes = nodes || [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (callback(node, parent || null, list || nodes, i) === false) return false;
      if (walk(node.children || [], callback, node, node.children || []) === false) return false;
    }
    return true;
  }

  function findNodeInfo(id) {
    var found = null;
    walk(state.nodes, function (node, parent, list, index) {
      if (node.id === id) {
        found = { node: node, parent: parent, list: list, index: index };
        return false;
      }
      return true;
    });
    return found;
  }

  function getSelectedInfo() {
    return state.selectedId ? findNodeInfo(state.selectedId) : null;
  }

  function isDescendant(sourceId, possibleChildId) {
    var source = findNodeInfo(sourceId);
    if (!source) return false;
    var hit = false;
    walk(source.node.children || [], function (node) {
      if (node.id === possibleChildId) {
        hit = true;
        return false;
      }
      return true;
    });
    return hit;
  }

  function selectNode(id) {
    state.selectedId = id || null;
    state.editingNodeId = '';
    renderTree();
    renderInspector();
  }

  function removeNode(id) {
    var info = findNodeInfo(id);
    if (!info) return null;
    var removed = info.list.splice(info.index, 1)[0];
    if (state.selectedId === id) state.selectedId = null;
    return removed;
  }

  function treeSnapshot() {
    return JSON.stringify({
      nodes: state.nodes,
      selectedId: state.selectedId || null,
      lastInsertedKey: state.lastInsertedKey || ''
    });
  }

  function pushTreeHistory() {
    var snapshot = treeSnapshot();
    if (state.undoStack[state.undoStack.length - 1] === snapshot) return;
    state.undoStack.push(snapshot);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
  }

  function restoreTreeSnapshot(snapshot) {
    var parsed = JSON.parse(snapshot || '{}');
    state.nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    state.selectedId = parsed.selectedId || null;
    state.editingNodeId = '';
    state.lastInsertedKey = parsed.lastInsertedKey || '';
    ns.Data.refreshLabels(state.nodes, state.chineseMap);
    renderAll(true);
  }

  function undoTreeChange() {
    if (!state.undoStack.length) return;
    state.redoStack.push(treeSnapshot());
    restoreTreeSnapshot(state.undoStack.pop());
    logEditor('editor.log.undone', {});
  }

  function redoTreeChange() {
    if (!state.redoStack.length) return;
    state.undoStack.push(treeSnapshot());
    restoreTreeSnapshot(state.redoStack.pop());
    logEditor('editor.log.redone', {});
  }

  function insertNodes(nodes, targetId, mode) {
    if (!Array.isArray(nodes) || nodes.length === 0) return;
    var target = targetId ? findNodeInfo(targetId) : null;
    if (!target) {
      Array.prototype.push.apply(state.nodes, nodes);
      state.selectedId = nodes[0].id;
      return;
    }
    if (mode !== 'before' && mode !== 'after' && !target.node.element) {
      mode = 'after';
    }
    if (mode === 'before' || mode === 'after') {
      var at = target.index + (mode === 'after' ? 1 : 0);
      target.list.splice.apply(target.list, [at, 0].concat(nodes));
    } else {
      target.node.children = target.node.children || [];
      Array.prototype.push.apply(target.node.children, nodes);
      target.node.expanded = true;
    }
    state.selectedId = nodes[0].id;
  }

  function dropClassName(mode) {
    return 'is-drop-' + (mode === 'child' ? 'inside' : mode);
  }

  function makeTextNode(text) {
    return { id: ns.Data.makeId(), element: false, text: text || '', tag: text || '', attrs: {}, children: [] };
  }

  function addEntryByKey(key, targetId, mode) {
    var entry = state.entries.find(function (item) { return item.key === key; });
    if (!entry) return;
    pushTreeHistory();
    var variantIndex = state.variantMode && entry.hasVariant ? 1 : 0;
    var pair = ns.Data.getVariant(entry.value, variantIndex);
    var nodes = ns.Data.parseHtmlToNodes(pair[0] + pair[1], state.defaultElements, state.chineseMap);
    var insertTargetId = targetId || state.selectedId || null;
    insertNodes(nodes, insertTargetId, insertTargetId ? mode || 'child' : 'child');
    state.lastInsertedKey = key;
    logEditor('editor.log.inserted', { key: key });
    renderAll(true);
  }

  function insertEntryFromButton(button) {
    if (!button || !button.dataset.key) return;
    addEntryByKey(button.dataset.key, state.selectedId, 'child');
  }

  function addText(mode) {
    pushTreeHistory();
    insertNodes([makeTextNode('')], state.selectedId, mode || 'child');
    renderAll(true);
    startInlineEdit(state.selectedId);
  }

  function setAllExpanded(expanded) {
    walk(state.nodes, function (node) {
      if (node.element) node.expanded = expanded;
      return true;
    });
    renderTree();
    saveState();
  }

  function saveState() {
    safe(function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        nodes: state.nodes,
        escapeQuotes: state.escapeQuotes
      }));
    });
  }

  function loadState() {
    safe(function () {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.nodes)) state.nodes = parsed.nodes;
      if (parsed && parsed.escapeQuotes === false) state.escapeQuotes = false;
    });
    ns.Data.refreshLabels(state.nodes, state.chineseMap);
  }

  function callReplacers(root) {
    if (!root || !window.endpoints) return;
    var calls = [
      ['replace_character_name', window.endpoints.character && window.endpoints.character()],
      ['replace_skill_name', window.endpoints.skill && window.endpoints.skill()],
      ['replace_card_name', window.endpoints.card && window.endpoints.card()],
      ['replace_term', window.endpoints.termDynamic && window.endpoints.termDynamic(), 1],
      ['replace_term', window.endpoints.termFixed && window.endpoints.termFixed(), 1]
    ];
    calls.forEach(function (item) {
      safe(function () {
        var fn = window[item[0]];
        if (!fn || !item[1]) return;
        var args = item.slice(1);
        args.push(root);
        var result = fn.apply(window, args);
        if (result && typeof result.catch === 'function') result.catch(function () {});
        return result;
      });
    });
    setTimeout(function () {
      safe(function () { return window.pronounCheck && window.pronounCheck(root); });
    }, 50);
  }

  function updateOutput() {
    var raw = ns.Data.serializeNodes(state.nodes, state.escapeQuotes);
    state.outputHtml = raw;
    if (els.output) els.output.value = raw;
    if (els.preview) {
      els.preview.innerHTML = raw.replace(/\\"/g, '"');
      callReplacers(els.preview);
    }
  }

  function cssColorValue(value) {
    var color = String(value || '').trim();
    if (!color) return '';
    if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) return color;
    if (/^[a-zA-Z]+$/.test(color)) return color;
    if (/^(rgb|rgba|hsl|hsla)\(/i.test(color)) return color;
    return '';
  }

  function nodeAutoLabel(node) {
    if (!node) return '';
    return node.element ? (node.text || node.tag || '') : (node.text || '');
  }

  function nodeValueText(node) {
    if (!node) return '';
    return node.element ? (node.tag || '') : (node.text || '');
  }

  function applyTreeColumns() {
    if (!els.tree) return;
    var treeFontSize = 0;
    var rowFontSize = 0;
    try { treeFontSize = parseFloat(window.getComputedStyle(els.tree).fontSize) || 0; } catch(_){ }
    try {
      var sampleRow = els.tree.querySelector('.editor-node-row');
      rowFontSize = sampleRow ? (parseFloat(window.getComputedStyle(sampleRow).fontSize) || 0) : 0;
    } catch(_){ }
    rowFontSize = rowFontSize || treeFontSize || 12;
    var indentStep = 0;
    try {
      var childList = els.tree.querySelector('.editor-node .editor-node-list');
      if (childList) {
        var listStyle = window.getComputedStyle(childList);
        indentStep = (parseFloat(listStyle.marginLeft) || 0) +
          (parseFloat(listStyle.paddingLeft) || 0) +
          (parseFloat(listStyle.borderLeftWidth) || 0);
      }
    } catch(_){ }
    if (!indentStep) indentStep = treeFontSize ? (treeFontSize * 1.506 + 1) : (rowFontSize * 1.506 + 1);
    var dividerGap = 0;
    try {
      var sampleSide = els.tree.querySelector('.editor-node-side');
      dividerGap = sampleSide ? (parseFloat(window.getComputedStyle(sampleSide).paddingLeft) || 0) : 0;
    } catch(_){ }
    var maxWidth = 0;
    els.tree.querySelectorAll('.editor-node-row').forEach(function(row){
      var depth = Number(row.style.getPropertyValue('--node-depth')) || 0;
      row.style.setProperty('--node-layout-indent', depth ? (depth * indentStep).toFixed(2) + 'px' : '0px');
      var main = row.querySelector('.editor-node-main');
      var label = main && main.querySelector('.editor-node-label');
      if (!main || !label) return;
      var labelWidth = label.scrollWidth;
      try {
        var range = document.createRange();
        range.selectNodeContents(label);
        labelWidth = range.getBoundingClientRect().width || labelWidth;
        range.detach();
      } catch(_){ }
      var mainStyle = window.getComputedStyle(main);
      var gap = parseFloat(mainStyle.columnGap || mainStyle.gap) || 0;
      var mainWidth = (parseFloat(mainStyle.paddingLeft) || 0) + (parseFloat(mainStyle.paddingRight) || 0) + labelWidth + dividerGap;
      var toggle = main.querySelector('.editor-node-toggle');
      if (toggle) mainWidth += toggle.getBoundingClientRect().width + gap;
      maxWidth = Math.max(maxWidth, depth * indentStep + mainWidth);
    });
    els.tree.style.setProperty('--editor-node-name-w', Math.max(rowFontSize * 2.35, maxWidth).toFixed(2) + 'px');
  }

  function scheduleTreeColumns() {
    if (window.requestAnimationFrame) window.requestAnimationFrame(applyTreeColumns);
    else setTimeout(applyTreeColumns, 0);
  }

  function colorForNode(node) {
    if (!node || !node.element) return '';
    var meta = state.chineseMap[String(node.tag || '').toLowerCase()];
    var accent = meta && cssColorValue(meta.color);
    var seed = 0;
    var text = String(node.tag || node.text || '');
    for (var i = 0; i < text.length; i++) seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
    if (!accent) accent = 'hsl(' + (Math.abs(seed) % 360) + ' 54% 52%)';
    return accent;
  }

  function renderTree() {
    if (!els.tree) return;
    els.tree.innerHTML = '';
    if (!state.nodes.length) {
      var empty = document.createElement('div');
      empty.className = 'editor-empty';
      empty.textContent = t('editor.tree.empty');
      els.tree.appendChild(empty);
      return;
    }
    els.tree.appendChild(renderNodeList(state.nodes, 0));
    applyTreeColumns();
    scheduleTreeColumns();
  }

  function renderNodeList(nodes, depth) {
    var list = document.createElement('ul');
    list.className = 'editor-node-list';
    list.setAttribute('role', depth ? 'group' : 'tree');
    if (depth) {
      list.style.setProperty('--editor-node-guide-color', 'var(--editor-node-guide-' + (((depth - 1) % GUIDE_COLOR_COUNT) + 1) + ')');
    }
    nodes.forEach(function (node) {
      list.appendChild(renderNode(node, depth));
    });
    return list;
  }

  function renderNode(node, depth) {
    var item = document.createElement('li');
    item.className = 'editor-node';
    item.dataset.id = node.id;

    var row = document.createElement('div');
    row.className = 'editor-node-row'
      + (node.id === state.selectedId ? ' is-selected' : '')
      + (node.id === state.editingNodeId ? ' is-editing' : '')
      + (!node.element ? ' is-text' : '')
      + (node.id === state.dropTargetId && state.dropMode ? ' ' + dropClassName(state.dropMode) : '');
    row.dataset.id = node.id;
    row.draggable = false;
    row.style.setProperty('--node-depth', String(depth));
    var color = colorForNode(node);
    if (color) row.style.setProperty('--node-accent', color);

    var hasToggle = !!(node.element && node.children && node.children.length);

    var main = document.createElement('span');
    main.className = 'editor-node-main';
    if (!hasToggle) main.style.setProperty('--node-toggle-space', '1.4em');
    if (hasToggle) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'editor-node-toggle';
      toggle.dataset.action = 'toggle';
      toggle.textContent = node.expanded === false ? '▸' : '▾';
      toggle.setAttribute('aria-label', t('editor.action.toggleNode'));
      main.appendChild(toggle);
    }

    var side = document.createElement('span');
    side.className = 'editor-node-side';

    if (state.editingNodeId === node.id) {
      var editingLabel = document.createElement('span');
      editingLabel.className = 'editor-node-label';
      editingLabel.textContent = nodeAutoLabel(node);
      main.appendChild(editingLabel);

      var editInput = document.createElement('input');
      editInput.className = 'editor-node-edit admin-input';
      editInput.type = 'text';
      editInput.value = nodeValueText(node);
      editInput.dataset.id = node.id;
      side.appendChild(editInput);
    } else {
      var label = document.createElement('span');
      label.className = 'editor-node-label';
      label.textContent = nodeAutoLabel(node) || t('editor.node.textEmpty');
      main.appendChild(label);

      var tag = document.createElement('span');
      tag.className = 'editor-node-tag';
      tag.textContent = nodeValueText(node) || t('editor.node.textEmpty');
      side.appendChild(tag);
    }

    var attr = document.createElement('span');
    attr.className = 'editor-node-attrs';
    var attrParts = [];
    if (node.attrs && node.attrs.class_name) attrParts.push('.' + node.attrs.class_name);
    if (node.attrs && node.attrs.epithet) attrParts.push('epithet=' + node.attrs.epithet);
    attr.textContent = attrParts.join(' ');
    side.appendChild(attr);
    row.appendChild(main);
    row.appendChild(side);

    item.appendChild(row);
    if (node.element && node.children && node.children.length && node.expanded !== false) {
      item.appendChild(renderNodeList(node.children, depth + 1));
    }
    return item;
  }

  function renderPalette() {
    if (!els.palette) return;
    var query = (els.search && els.search.value || '').trim().toLowerCase();
    var chars = query.replace(/\s+/g, '');
    var results = state.entries.filter(function (entry) {
      if (!query) return true;
      if (entry.searchText.indexOf(query) !== -1) return true;
      for (var i = 0; i < chars.length; i++) {
        if (entry.searchText.indexOf(chars[i]) === -1) return false;
      }
      return true;
    });
    els.palette.innerHTML = '';
    results.forEach(function (entry) {
      els.palette.appendChild(renderEntryButton(entry, 'palette'));
    });
  }

  function renderEntryButton(entry, area) {
    var recommendation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'editor-entry'
      + (entry.hasVariant ? ' has-variant' : '')
      + (entry.hasVariant && state.variantMode ? ' is-variant-active' : '');
    button.dataset.key = entry.key;
    button.dataset.area = area;
    if (recommendation) button.dataset.score = String(recommendation.score || 0);
    button.draggable = false;

    var name = document.createElement('span');
    name.className = 'editor-entry__name';
    name.textContent = entry.key;
    button.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'editor-entry__meta';
    var metaParts = [ns.Data.sourceLabel(entry.source)];
    if (entry.hasVariant) metaParts.push(t('editor.variant.short'));
    if (recommendation) {
      metaParts.push(t('editor.recommendation.scoreDetail', {
        score: recommendation.score || 0,
        nested: recommendation.nested || 0,
        adjacent: recommendation.adjacent || 0
      }));
    }
    meta.textContent = metaParts.join(' · ');
    button.appendChild(meta);
    return button;
  }

  function buildRelationIndex() {
    if (!ns.Recommendations) return { patterns: {}, corpus: [], cache: {} };
    state.relationIndex = ns.Recommendations.buildIndex(state.entries, state.defaultElements, state.relationCorpus);
    logEditor('editor.log.relationReady', { count: state.relationIndex.corpus.length });
    return state.relationIndex;
  }

  function refreshRelationGraph(force) {
    if (!ns.RelationGraph || !els.relationView) return;
    if (!force && state.renderedRelationGraphVersion === state.relationGraphVersion) {
      ns.RelationGraph.activate();
      return;
    }
    var index = state.relationIndex || buildRelationIndex();
    ns.RelationGraph.update({
      root: els.relationView,
      index: index,
      entries: state.entries
    });
    state.renderedRelationGraphVersion = state.relationGraphVersion;
  }

  function setEditorView(view) {
    view = view === 'relations' ? 'relations' : 'editor';
    if (!els.panel) return;
    state.activeView = view;
    if (view !== 'editor') setVariantMode(false);
    if (els.draftPage) els.draftPage.dataset.editorView = view;
    if (els.editorView) els.editorView.hidden = view !== 'editor';
    if (els.relationView) els.relationView.hidden = view !== 'relations';
    (els.viewTabs || []).forEach(function (button) {
      var active = button.dataset.editorView === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (view === 'relations') {
      window.requestAnimationFrame(function () { refreshRelationGraph(false); });
    }
  }

  function recommendationForKey(key) {
    var index = state.relationIndex || buildRelationIndex();
    return ns.Recommendations ? ns.Recommendations.getForKey(index, state.entries, key, state.bidirectionalMode, 30) : [];
  }

  function renderRecommendations() {
    if (!els.recommendations || !els.recommendationList) return;
    els.recommendationList.innerHTML = '';
    var key = state.lastInsertedKey;
    if (!key) {
      els.recommendations.hidden = true;
      return;
    }
    var scored = recommendationForKey(key);
    var signature = key + '|' + (state.bidirectionalMode ? 'both' : 'one') + '|' + scored.length;
    if (signature !== state.lastRecommendationLogSignature) {
      state.lastRecommendationLogSignature = signature;
      logEditor(scored.length ? 'editor.log.recommendations' : 'editor.log.noRecommendations', {
        count: scored.length,
        mode: t(state.bidirectionalMode ? 'editor.recommendation.modeBidirectional' : 'editor.recommendation.modeDirected')
      });
    }
    if (!scored.length) {
      els.recommendations.hidden = true;
      return;
    }
    scored.forEach(function (item) {
      els.recommendationList.appendChild(renderEntryButton(item.entry, 'recommendation', item));
    });
    els.recommendations.hidden = false;
  }

  function renderInspector() {
    if (!els.inspector) return;
    var info = getSelectedInfo();
    var disabled = !info;
    els.inspector.classList.toggle('is-empty', disabled);
    if (els.classInput) {
      els.classInput.disabled = disabled || !info.node.element;
      els.classInput.value = info && info.node.attrs ? info.node.attrs.class_name || '' : '';
    }
    if (els.epithetInput) {
      els.epithetInput.disabled = disabled || !info.node.element;
      els.epithetInput.value = info && info.node.attrs ? info.node.attrs.epithet || '' : '';
    }
    Array.from(els.inspector.querySelectorAll('[data-needs-selection]')).forEach(function (button) {
      button.disabled = disabled;
    });
    if (els.convertButton) {
      els.convertButton.textContent = info && info.node.element ? t('editor.action.convertText') : t('editor.action.convertElement');
    }
    renderRecommendationMode();
    renderLog();
  }

  function renderRecommendationMode() {
    if (!els || !els.recommendationDirection) return;
    els.recommendationDirection.textContent = t(state.bidirectionalMode ? 'editor.recommendation.modeBidirectional' : 'editor.recommendation.modeDirected');
    els.recommendationDirection.classList.toggle('is-active', !!state.bidirectionalMode);
    els.recommendationDirection.setAttribute('aria-pressed', state.bidirectionalMode ? 'true' : 'false');
  }

  function renderEscapeToggle() {
    if (!els || !els.escapeToggle) return;
    els.escapeToggle.textContent = t('editor.action.escapeQuotes');
    els.escapeToggle.classList.toggle('is-active', !!state.escapeQuotes);
    els.escapeToggle.setAttribute('aria-pressed', state.escapeQuotes ? 'true' : 'false');
  }

  function renderLog() {
    if (!els || !els.logList) return;
    els.logList.innerHTML = '';
    if (!state.logs.length) {
      var empty = document.createElement('div');
      empty.className = 'editor-log__empty';
      empty.textContent = t('editor.log.empty');
      els.logList.appendChild(empty);
      return;
    }
    state.logs.slice().reverse().forEach(function (line) {
      var item = document.createElement('div');
      item.className = 'editor-log__entry';
      item.textContent = line;
      els.logList.appendChild(item);
    });
  }

  function setupEdgeScroll(element) {
    if (!element || element.dataset.editorEdgeScroll === '1') return;
    element.dataset.editorEdgeScroll = '1';
    element.classList.add('editor-edge-scroll');
    var frameId = null;
    var velocityX = 0;
    var velocityY = 0;
    var directionX = 0;
    var directionY = 0;
    var acceleration = 4.6;
    var friction = 0.86;
    var maxSpeed = 96;

    function canScrollX() {
      return element.scrollWidth > element.clientWidth + 1;
    }

    function canScrollY() {
      return element.scrollHeight > element.clientHeight + 1;
    }

    function stepScroll() {
      if (directionX) velocityX += directionX * acceleration;
      else velocityX *= friction;
      if (directionY) velocityY += directionY * acceleration;
      else velocityY *= friction;

      velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, velocityX));
      velocityY = Math.max(-maxSpeed, Math.min(maxSpeed, velocityY));
      if (Math.abs(velocityX) < 0.1) velocityX = 0;
      if (Math.abs(velocityY) < 0.1) velocityY = 0;

      if (velocityX) element.scrollLeft += velocityX;
      if (velocityY) element.scrollTop += velocityY;

      if (directionX || directionY || velocityX || velocityY) {
        frameId = requestAnimationFrame(stepScroll);
      } else {
        frameId = null;
      }
    }

    function ensureRunning() {
      if (!frameId) frameId = requestAnimationFrame(stepScroll);
    }

    element.addEventListener('mousemove', function (event) {
      var rect = element.getBoundingClientRect();
      var edge = Math.max(24, Math.min(56, Math.min(rect.width, rect.height) * 0.16));
      var pointerX = event.clientX - rect.left;
      var pointerY = event.clientY - rect.top;
      directionX = 0;
      directionY = 0;

      if (canScrollX()) {
        if (pointerX >= 0 && pointerX < edge) directionX = -1;
        else if (pointerX > rect.width - edge && pointerX <= rect.width) directionX = 1;
      }
      if (canScrollY()) {
        if (pointerY >= 0 && pointerY < edge) directionY = -1;
        else if (pointerY > rect.height - edge && pointerY <= rect.height) directionY = 1;
      }
      if (directionX || directionY) ensureRunning();
    });

    element.addEventListener('mouseleave', function () {
      directionX = 0;
      directionY = 0;
    });
  }

  function bindEdgeScrollAreas() {
    [els.draftInput, els.draftPreview, els.workspace, els.palette, els.recommendationList, els.tree, els.logList].forEach(setupEdgeScroll);
  }

  function renderVariantState() {
    if (els.variantBadge) els.variantBadge.hidden = !state.variantMode;
    [els.palette, els.recommendationList].forEach(function (list) {
      if (!list) return;
      Array.from(list.querySelectorAll('.editor-entry.has-variant')).forEach(function (button) {
        button.classList.toggle('is-variant-active', state.variantMode);
      });
    });
  }

  function bindEntryList(list) {
    if (!list) return;
    list.addEventListener('click', function (event) {
      if (state.suppressClick) {
        state.suppressClick = false;
        return;
      }
      var button = event.target.closest('.editor-entry');
      if (button) insertEntryFromButton(button);
    });
    list.addEventListener('pointerdown', onEntryPointerDown);
  }

  function renderAll(persist) {
    renderTree();
    renderInspector();
    renderPalette();
    renderRecommendations();
    renderVariantState();
    renderEscapeToggle();
    updateOutput();
    if (state.activeView === 'relations') refreshRelationGraph(false);
    if (persist) saveState();
  }

  function bindEvents() {
    if (els.search) els.search.addEventListener('input', renderPalette);
    bindEntryList(els.palette);
    bindEntryList(els.recommendationList);
    if (els.tree) {
      els.tree.addEventListener('click', onTreeClick);
      els.tree.addEventListener('dblclick', onTreeDoubleClick);
      els.tree.addEventListener('keydown', onTreeEditKeydown);
      els.tree.addEventListener('focusout', onTreeEditFocusOut);
      els.tree.addEventListener('pointerdown', onTreePointerDown);
    }
    if (els.escapeToggle) {
      renderEscapeToggle();
      els.escapeToggle.addEventListener('click', function () {
        state.escapeQuotes = !state.escapeQuotes;
        renderEscapeToggle();
        renderAll(true);
      });
    }
    bindButton('editor-add-child', function () { addText('child'); });
    bindButton('editor-add-sibling', function () { addText('after'); });
    bindButton('editor-convert-node', toggleSelectedElement);
    bindButton('editor-expand-all', function () { setAllExpanded(true); });
    bindButton('editor-collapse-all', function () { setAllExpanded(false); });
    bindButton('editor-clear-selection', function () { selectNode(null); });
    bindButton('editor-clear-tree', clearTree);
    bindButton('editor-apply-output', applyOutputToDraft);
    bindButton('editor-import-draft', importFromDraft);
    bindButton('editor-reload-palette', reloadPalette);
    if (els.recommendationDirection) {
      els.recommendationDirection.addEventListener('click', function () {
        state.bidirectionalMode = !state.bidirectionalMode;
        state.lastRecommendationLogSignature = '';
        logEditor('editor.log.modeChanged', { mode: t(state.bidirectionalMode ? 'editor.recommendation.modeBidirectional' : 'editor.recommendation.modeDirected') });
        renderRecommendationMode();
        renderRecommendations();
      });
    }
    (els.viewTabs || []).forEach(function (button) {
      button.addEventListener('click', function () { setEditorView(button.dataset.editorView || 'editor'); });
    });
    if (els.clearLogButton) {
      els.clearLogButton.addEventListener('click', function () {
        state.logs = [];
        state.lastRecommendationLogSignature = '';
        renderLog();
      });
    }
    if (els.classInput) els.classInput.addEventListener('input', updateSelectedAttr);
    if (els.epithetInput) els.epithetInput.addEventListener('input', updateSelectedAttr);
    bindEdgeScrollAreas();
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    window.addEventListener('blur', function () { setVariantMode(false); });
    window.addEventListener('i18n:changed', function () { renderAll(false); });
    window.addEventListener('resize', scheduleTreeColumns);
    window.addEventListener('hashchange', scheduleTreeColumns);
  }

  function bindButton(id, handler) {
    var button = byId(id);
    if (button) button.addEventListener('click', handler);
  }

  function modeForDropEvent(event, row) {
    if (!row) return 'child';
    if (event.shiftKey) return 'before';
    if (event.altKey) return 'after';
    var rect = row.getBoundingClientRect();
    var offset = event.clientY - rect.top;
    if (offset < rect.height * 0.28) return 'before';
    if (offset > rect.height * 0.72) return 'after';
    return 'child';
  }

  function normalizeDropMode(targetId, mode) {
    if (mode === 'before' || mode === 'after') return mode;
    var info = targetId ? findNodeInfo(targetId) : null;
    return info && !info.node.element ? 'after' : 'child';
  }

  function dropTargetForRow(event, row, mode) {
    var targetId = row && row.dataset ? row.dataset.id || null : null;
    return { targetId: targetId, mode: normalizeDropMode(targetId, mode || modeForDropEvent(event, row)) };
  }

  function getNearestRowDropTarget(event) {
    if (!els.tree || !state.nodes.length) return null;
    var treeRect = els.tree.getBoundingClientRect();
    if (event.clientX < treeRect.left || event.clientX > treeRect.right || event.clientY < treeRect.top || event.clientY > treeRect.bottom) return null;
    var rows = Array.from(els.tree.querySelectorAll('.editor-node-row'));
    if (!rows.length) return null;
    var pointerY = event.clientY;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      var rowRect = rows[rowIndex].getBoundingClientRect();
      if (pointerY >= rowRect.top && pointerY <= rowRect.bottom) return dropTargetForRow(event, rows[rowIndex]);
    }
    var firstRect = rows[0].getBoundingClientRect();
    if (pointerY < firstRect.top) return dropTargetForRow(event, rows[0], 'before');
    for (var gapIndex = 0; gapIndex < rows.length - 1; gapIndex++) {
      var previousRect = rows[gapIndex].getBoundingClientRect();
      var nextRect = rows[gapIndex + 1].getBoundingClientRect();
      if (pointerY > previousRect.bottom && pointerY < nextRect.top) {
        return pointerY - previousRect.bottom <= nextRect.top - pointerY
          ? dropTargetForRow(event, rows[gapIndex], 'after')
          : dropTargetForRow(event, rows[gapIndex + 1], 'before');
      }
    }
    return dropTargetForRow(event, rows[rows.length - 1], 'after');
  }

  function isInvalidDrop(sourceId, targetId) {
    return !!(sourceId && targetId && (sourceId === targetId || isDescendant(sourceId, targetId)));
  }

  function clearDropIndicator() {
    state.dropTargetId = null;
    state.dropMode = '';
    if (!els.tree) return;
    els.tree.classList.remove('is-drop-root');
    Array.from(els.tree.querySelectorAll('.is-drop-before, .is-drop-after, .is-drop-inside')).forEach(function (row) {
      row.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-inside');
    });
  }

  function setDropIndicator(targetId, mode) {
    if (state.dropTargetId === targetId && state.dropMode === mode) return;
    clearDropIndicator();
    state.dropTargetId = targetId || null;
    state.dropMode = mode || 'child';
    if (!els.tree) return;
    if (!targetId) {
      els.tree.classList.add('is-drop-root');
      return;
    }
    var row = els.tree.querySelector('.editor-node-row[data-id="' + targetId + '"]');
    if (row) row.classList.add(dropClassName(mode));
  }

  function applyDropPayload(entryKey, sourceId, target) {
    if (!target) return false;
    clearDropIndicator();
    if (entryKey) {
      addEntryByKey(entryKey, target.targetId, target.targetId ? target.mode : 'child');
      return true;
    }
    if (!sourceId || isInvalidDrop(sourceId, target.targetId)) return false;
    if (!findNodeInfo(sourceId)) return false;
    pushTreeHistory();
    var moved = removeNode(sourceId);
    if (!moved) return false;
    insertNodes([moved], target.targetId, target.targetId ? target.mode : 'child');
    renderAll(true);
    return true;
  }

  function onEntryPointerDown(event) {
    var button = event.target.closest('.editor-entry');
    if (!button || event.button !== 0) return;
    startPointerDrag(event, { type: 'entry', key: button.dataset.key || '', source: button });
  }

  function onTreePointerDown(event) {
    if (event.button !== 0 || event.target.closest('.editor-node-toggle, .editor-node-edit')) return;
    var row = event.target.closest('.editor-node-row');
    if (!row) return;
    startPointerDrag(event, { type: 'node', id: row.dataset.id || '', source: row });
  }

  function startPointerDrag(event, payload) {
    if (!payload || pointerDrag) return;
    pointerDrag = {
      type: payload.type,
      key: payload.key || '',
      id: payload.id || '',
      source: payload.source || null,
      startX: event.clientX,
      startY: event.clientY,
      active: false
    };
    document.addEventListener('pointermove', onDocumentPointerMove);
    document.addEventListener('pointerup', onDocumentPointerUp);
    document.addEventListener('pointercancel', cancelPointerDrag);
  }

  function removePointerDragListeners() {
    document.removeEventListener('pointermove', onDocumentPointerMove);
    document.removeEventListener('pointerup', onDocumentPointerUp);
    document.removeEventListener('pointercancel', cancelPointerDrag);
  }

  function activatePointerDrag() {
    if (!pointerDrag || pointerDrag.active) return;
    pointerDrag.active = true;
    state.draggingEntryKey = pointerDrag.type === 'entry' ? pointerDrag.key : '';
    state.draggingNodeId = pointerDrag.type === 'node' ? pointerDrag.id : '';
  }

  function getPointerDropTarget(event, preferIndicator) {
    var element = document.elementFromPoint(event.clientX, event.clientY);
    var row = element && element.closest && element.closest('.editor-node-row');
    if (row && els.tree && els.tree.contains(row)) {
      return dropTargetForRow(event, row);
    }
    if (element && els.treeDropRoot && els.treeDropRoot.contains(element)) {
      var nearest = getNearestRowDropTarget(event);
      if (nearest) return nearest;
      if (preferIndicator && state.dropMode) return { targetId: state.dropTargetId || null, mode: state.dropMode || 'child' };
      return { targetId: null, mode: 'child' };
    }
    if (preferIndicator && state.dropMode) return { targetId: state.dropTargetId || null, mode: state.dropMode || 'child' };
    return null;
  }

  function onDocumentPointerMove(event) {
    if (!pointerDrag) return;
    if (!pointerDrag.active) {
      var dx = event.clientX - pointerDrag.startX;
      var dy = event.clientY - pointerDrag.startY;
      if (Math.sqrt(dx * dx + dy * dy) < POINTER_DRAG_THRESHOLD) return;
      activatePointerDrag();
    }
    event.preventDefault();
    var target = getPointerDropTarget(event, false);
    if (!target || isInvalidDrop(state.draggingNodeId, target.targetId)) {
      clearDropIndicator();
      return;
    }
    setDropIndicator(target.targetId, target.mode);
  }

  function onDocumentPointerUp(event) {
    if (!pointerDrag) return;
    var drag = pointerDrag;
    pointerDrag = null;
    removePointerDragListeners();
    if (!drag.active) return;
    event.preventDefault();
    var target = getPointerDropTarget(event, true);
    var dropped = applyDropPayload(drag.type === 'entry' ? drag.key : '', drag.type === 'node' ? drag.id : '', target);
    state.draggingEntryKey = '';
    state.draggingNodeId = '';
    state.suppressClick = dropped;
    if (dropped) setTimeout(function () { state.suppressClick = false; }, 0);
    clearDropIndicator();
  }

  function cancelPointerDrag() {
    pointerDrag = null;
    removePointerDragListeners();
    state.draggingEntryKey = '';
    state.draggingNodeId = '';
    clearDropIndicator();
  }

  function onTreeClick(event) {
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    if (event.target.closest('.editor-node-edit')) return;
    var toggle = event.target.closest('[data-action="toggle"]');
    var row = event.target.closest('.editor-node-row');
    if (!row) return;
    var info = findNodeInfo(row.dataset.id);
    if (!info) return;
    if (toggle && info.node.children && info.node.children.length) {
      info.node.expanded = info.node.expanded === false;
      renderAll(true);
      return;
    }
    if (info.node.id === state.selectedId && event.target.closest('.editor-node-tag')) {
      startInlineEdit(info.node.id);
      return;
    }
    selectNode(info.node.id);
  }

  function onTreeDoubleClick(event) {
    var row = event.target.closest('.editor-node-row');
    if (!row || event.target.closest('.editor-node-toggle')) return;
    startInlineEdit(row.dataset.id || '');
  }

  function startInlineEdit(id) {
    if (!id || !findNodeInfo(id)) return;
    state.selectedId = id;
    state.editingNodeId = id;
    renderTree();
    renderInspector();
    window.requestAnimationFrame(function () {
      if (!els.tree) return;
      var input = els.tree.querySelector('.editor-node-edit[data-id="' + id + '"]');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  function commitInlineEdit(id, value) {
    var info = findNodeInfo(id);
    if (!info) return;
    var nextValue = info.node.element ? (value.trim() || 'span') : value;
    if (nodeValueText(info.node) === nextValue) {
      state.editingNodeId = '';
      renderTree();
      renderInspector();
      return;
    }
    pushTreeHistory();
    if (info.node.element) {
      info.node.tag = nextValue;
      info.node.text = (state.chineseMap[String(info.node.tag).toLowerCase()] || {}).label || info.node.tag;
    } else {
      info.node.text = nextValue;
      info.node.tag = nextValue;
    }
    state.editingNodeId = '';
    renderAll(true);
  }

  function cancelInlineEdit() {
    state.editingNodeId = '';
    renderTree();
    renderInspector();
  }

  function onTreeEditKeydown(event) {
    var input = event.target.closest('.editor-node-edit');
    if (!input) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitInlineEdit(input.dataset.id || '', input.value || '');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineEdit();
    }
  }

  function onTreeEditFocusOut(event) {
    var input = event.target.closest('.editor-node-edit');
    if (!input || state.editingNodeId !== input.dataset.id) return;
    commitInlineEdit(input.dataset.id || '', input.value || '');
  }

  function updateSelectedAttr() {
    var info = getSelectedInfo();
    if (!info || !info.node.element) return;
    info.node.attrs = info.node.attrs || {};
    var className = els.classInput ? els.classInput.value : '';
    var epithet = els.epithetInput ? els.epithetInput.value : '';
    if ((info.node.attrs.class_name || '') === className && (info.node.attrs.epithet || '') === epithet) return;
    pushTreeHistory();
    info.node.attrs.class_name = className;
    info.node.attrs.epithet = epithet;
    renderAll(true);
  }

  function deleteSelected() {
    if (!state.selectedId) return;
    pushTreeHistory();
    removeNode(state.selectedId);
    logEditor('editor.log.deleted', {});
    renderAll(true);
  }

  function toggleSelectedElement() {
    var info = getSelectedInfo();
    if (!info) return;
    pushTreeHistory();
    var node = info.node;
    node.element = !node.element;
    if (node.element) {
      node.tag = (node.text || node.tag || 'span').trim() || 'span';
      node.text = (state.chineseMap[String(node.tag).toLowerCase()] || {}).label || node.tag;
      node.children = node.children || [];
      node.attrs = node.attrs || { class_name: '', epithet: '' };
    } else {
      node.text = node.tag || node.text || '';
    }
    renderAll(true);
  }

  function clearTree() {
    if (state.nodes.length && !window.confirm(t('editor.confirm.clear'))) return;
    if (state.nodes.length) pushTreeHistory();
    state.nodes = [];
    state.selectedId = null;
    state.editingNodeId = '';
    state.lastInsertedKey = '';
    logEditor('editor.log.clearedTree', {});
    renderAll(true);
  }

  function applyOutputToDraft() {
    var text = ns.Data.serializeNodes(state.nodes, state.escapeQuotes);
    state.outputHtml = text;
    if (window.draftPanel && typeof window.draftPanel.setContent === 'function') {
      window.draftPanel.setContent(text);
    } else {
      var input = byId('htmlInput');
      if (!input) return;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    logEditor('editor.log.applied', {});
    if (window.showToast) window.showToast(t('editor.toast.appliedToDraft'));
  }

  function importFromDraft() {
    var input = byId('htmlInput');
    var raw = input ? input.value : '';
    if (!raw.trim()) return;
    pushTreeHistory();
    state.nodes = ns.Data.parseHtmlToNodes(raw, state.defaultElements, state.chineseMap);
    state.selectedId = state.nodes[0] ? state.nodes[0].id : null;
    state.editingNodeId = '';
    state.lastInsertedKey = '';
    logEditor('editor.log.imported', { count: state.nodes.length });
    renderAll(true);
    if (window.showToast) window.showToast(t('editor.toast.imported'));
  }

  async function reloadPalette() {
    var loaded = await ns.Data.loadElementData();
    state.entries = loaded.entries;
    state.defaultElements = loaded.defaultElements;
    state.chineseMap = loaded.chineseMap;
    state.relationCorpus = loaded.relationCorpus || [];
    state.relationIndex = null;
    state.relationGraphVersion += 1;
    state.renderedRelationGraphVersion = -1;
    ns.Data.refreshLabels(state.nodes, state.chineseMap);
    logEditor('editor.log.paletteReloaded', { count: state.entries.length });
    renderAll(true);
  }

  function eventMatchesAction(event, action) {
    var keySettings = window.KeySettings;
    if (keySettings && typeof keySettings.checkBinding === 'function') return keySettings.checkBinding(event, action);
    return action === 'editor_variant_mode' && event.key === 'Control';
  }

  function setVariantMode(active) {
    active = !!active;
    if (state.variantMode === active) return;
    state.variantMode = active;
    renderVariantState();
  }

  function handleVariantKey(event, active) {
    if (!isEditorActive() || state.activeView !== 'editor') return false;
    if (!eventMatchesAction(event, 'editor_variant_mode')) return false;
    setVariantMode(active);
    event.preventDefault();
    return true;
  }

  function handleKeydown(event) {
    if (!isEditorActive()) return;
    if (state.activeView !== 'editor') return;
    if (handleVariantKey(event, true)) return;
    var tagName = (event.target && event.target.tagName || '').toLowerCase();
    var typing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.target.isContentEditable;
    if (typing) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redoTreeChange();
      else undoTreeChange();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redoTreeChange();
      return;
    }
    var keySettings = window.KeySettings;
    var matches = keySettings && typeof keySettings.checkBinding === 'function'
      ? function (action) { return keySettings.checkBinding(event, action); }
      : function () { return false; };
    if (matches('editor_focus_search') || (!keySettings && (event.key === 'f' || event.key === 'F'))) {
      event.preventDefault();
      if (els.search) els.search.focus();
    } else if (matches('editor_clear_selection') || (!keySettings && (event.key === 'q' || event.key === 'Q'))) {
      event.preventDefault();
      selectNode(null);
    } else if (matches('editor_delete_selected') || (!keySettings && event.key === 'Delete')) {
      event.preventDefault();
      deleteSelected();
    } else if (matches('editor_add_child') || (!keySettings && (event.key === 'z' || event.key === 'Z'))) {
      event.preventDefault();
      addText('child');
    } else if (matches('editor_add_sibling') || (!keySettings && (event.key === 'x' || event.key === 'X'))) {
      event.preventDefault();
      addText('after');
    } else if (matches('editor_edit_selected') || (!keySettings && event.key === '/')) {
      event.preventDefault();
      startInlineEdit(state.selectedId);
    }
  }

  function handleKeyup(event) {
    handleVariantKey(event, false);
  }

  function collectElements() {
    els = {
      panel: byId('panel_draft'),
      draftPage: document.querySelector('#panel_draft .draft-page'),
      viewTabs: Array.from(document.querySelectorAll('#panel_draft .draft-module-tab[data-editor-view]')),
      editorView: byId('draft-editor-view'),
      relationView: byId('draft-relations-view'),
      search: byId('editor-search'),
      palette: byId('editor-palette-list'),
      recommendations: byId('editor-recommendations'),
      recommendationDirection: byId('editor-recommend-direction'),
      recommendationList: byId('editor-recommendation-list'),
      tree: byId('editor-tree'),
      treeDropRoot: byId('editor-tree-pane'),
      workspace: document.querySelector('#panel_draft .editor-workspace'),
      inspector: byId('editor-inspector'),
      classInput: byId('editor-class-input'),
      epithetInput: byId('editor-epithet-input'),
      convertButton: byId('editor-convert-node'),
      variantBadge: byId('editor-variant-badge'),
      logList: byId('editor-log-list'),
      clearLogButton: byId('editor-clear-log'),
      output: null,
      preview: byId('editor-rendered-preview'),
      draftInput: byId('htmlInput'),
      draftPreview: document.querySelector('#panel_draft .draftBlock'),
      escapeToggle: byId('editor-escape-toggle')
    };
  }

  async function init() {
    collectElements();
    if (!els.panel || !ns.Data) return;
    if (els.paletteStatus) els.paletteStatus.textContent = t('editor.palette.loading');
    var loaded = await ns.Data.loadElementData();
    state.entries = loaded.entries;
    state.defaultElements = loaded.defaultElements;
    state.chineseMap = loaded.chineseMap;
    state.relationCorpus = loaded.relationCorpus || [];
    state.relationIndex = null;
    state.relationGraphVersion += 1;
    state.renderedRelationGraphVersion = -1;
    loadState();
    bindEvents();
    setEditorView(state.activeView);
    logEditor('editor.log.paletteReady', { count: state.entries.length, corpus: state.relationCorpus.length });
    renderAll(false);
  }

  function boot() {
    var ready = window.partialsReady && typeof window.partialsReady.then === 'function'
      ? window.partialsReady.catch(function () {})
      : Promise.resolve();
    ready.then(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  ns.Panel = { init: init, renderAll: renderAll, reloadPalette: reloadPalette };
})();