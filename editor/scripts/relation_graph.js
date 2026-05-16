;(function () {
  'use strict';

  var ns = window.CardEditor = window.CardEditor || {};
  var minLinkPercent = 10;
  var maxLinkPercent = 100;
  var state = {
    root: null,
    canvas: null,
    ctx: null,
    stage: null,
    detail: null,
    empty: null,
    status: null,
    search: null,
    density: null,
    filterValue: null,
    reset: null,
    modeButton: null,
    scaleBadge: null,
    mode: 'combined',
    densityValue: 50,
    graph: null,
    nodes: [],
    edges: [],
    visibleEdges: [],
    availableEdges: 0,
    selectedNode: null,
    hoveredNode: null,
    pointer: null,
    query: '',
    scale: 1,
    panX: 0,
    panY: 0,
    width: 0,
    height: 0,
    dragging: false,
    dragStart: null,
    didDrag: false,
    layoutKey: '',
    dataReady: false,
    layoutAnimationFrame: 0,
    viewportAnimationFrame: 0,
    visuals: {},
    visualAnimationFrame: 0,
    lastVisualTime: 0
  };
  var modes = ['combined', 'nested', 'adjacent'];

  function t(key, params) {
    return window.t ? window.t(key, params || {}) : key;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function hashText(text) {
    var hash = 2166136261;
    String(text || '').split('').forEach(function (ch) {
      hash ^= ch.charCodeAt(0);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    });
    return Math.abs(hash >>> 0);
  }

  function sourceLabel(source) {
    var isSnippet = source === 'snippet';
    return cleanLabel(t(isSnippet ? 'editor.source.snippet' : 'editor.source.token')) || (isSnippet ? '片段' : '词元');
  }

  function scoreForEdge(edge) {
    if (state.mode === 'nested') return edge.nested || 0;
    if (state.mode === 'adjacent') return edge.adjacent || 0;
    return edge.score || 0;
  }

  function modeLabelKey(mode) {
    if (mode === 'nested') return 'editor.graph.modeNested';
    if (mode === 'adjacent') return 'editor.graph.modeAdjacent';
    return 'editor.graph.modeCombined';
  }

  function updateModeButton() {
    if (!state.modeButton) return;
    state.modeButton.dataset.graphMode = state.mode;
    state.modeButton.textContent = t(modeLabelKey(state.mode));
    state.modeButton.setAttribute('aria-label', t('editor.graph.modeButton', { mode: t(modeLabelKey(state.mode)) }));
  }

  function updateScaleBadge() {
    if (!state.scaleBadge) return;
    state.scaleBadge.textContent = t('editor.graph.scale', { scale: formatScalePercent(state.scale) });
  }

  function formatScalePercent(scale) {
    var percent = Math.max(0, scale * 100);
    if (percent >= 10) return String(Math.round(percent));
    if (percent >= 1) return String(Math.round(percent * 10) / 10).replace(/\.0$/, '');
    return String(Math.round(percent * 100) / 100).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  function clampLinkPercent(value) {
    var next = Number(value);
    if (!Number.isFinite(next)) next = 50;
    return Math.max(minLinkPercent, Math.min(maxLinkPercent, Math.round(next / 10) * 10));
  }

  function updateFilterValue() {
    if (state.filterValue) state.filterValue.textContent = state.densityValue + '%';
    if (state.density) state.density.setAttribute('aria-label', t('editor.graph.density'));
  }

  function targetVisibleEdgeCount(total) {
    if (!total) return 0;
    return Math.min(total, Math.max(1, Math.ceil(total * state.densityValue / 100)));
  }

  function cloneGraph(graph) {
    var nodes = (graph.nodes || []).map(function (node) {
      var seed = hashText(node.key || node.id);
      return Object.assign({}, node, {
        seed: seed,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: Math.max(3.2, Math.min(10.5, 3.2 + Math.sqrt(node.score || 0) * 0.34))
      });
    });
    var edges = (graph.edges || []).map(function (edge) { return Object.assign({}, edge); });
    return { nodes: nodes, edges: edges };
  }

  function filterEdges() {
    var scored = state.edges.map(function (edge) {
      edge.activeScore = scoreForEdge(edge);
      return edge;
    }).filter(function (edge) { return edge.activeScore > 0; })
      .sort(function (a, b) { return b.activeScore - a.activeScore || a.id.localeCompare(b.id); });
    state.availableEdges = scored.length;
    state.visibleEdges = scored.slice(0, targetVisibleEdgeCount(scored.length));
    updateFilterValue();
  }

  function resizeCanvas() {
    if (!state.canvas) return false;
    var rect = state.canvas.getBoundingClientRect();
    var width = Math.max(1, Math.floor(rect.width));
    var height = Math.max(1, Math.floor(rect.height));
    var ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    if (width === state.width && height === state.height && state.canvas.width === Math.floor(width * ratio)) return false;
    state.width = width;
    state.height = height;
    state.canvas.width = Math.floor(width * ratio);
    state.canvas.height = Math.floor(height * ratio);
    state.ctx = state.canvas.getContext('2d');
    state.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return true;
  }

  function initializePositions() {
    var count = Math.max(1, state.nodes.length);
    var radius = Math.max(180, Math.sqrt(count) * 34);
    state.nodes.forEach(function (node, index) {
      var turn = (index / count) + ((node.seed % 997) / 997) * 0.18;
      var angle = turn * Math.PI * 2;
      var inner = 0.3 + ((node.seed % 311) / 311) * 0.7;
      var sourceBias = node.source === 'snippet' ? -radius * 0.22 : radius * 0.16;
      node.x = Math.cos(angle) * radius * inner + sourceBias;
      node.y = Math.sin(angle) * radius * inner * 0.72;
      node.vx = 0;
      node.vy = 0;
    });
  }

  function runLayout() {
    if (!state.nodes.length) return;
    initializePositions();
    var nodes = state.nodes;
    var edges = state.visibleEdges;
    var iterations = Math.max(45, Math.min(115, Math.floor(22000 / Math.max(80, nodes.length))));
    var repulsion = Math.max(140, Math.min(420, 12000 / Math.sqrt(nodes.length + 8)));
    for (var step = 0; step < iterations; step++) {
      var cooling = 1 - step / iterations;
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i];
          var b = nodes[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var dist2 = Math.max(36, dx * dx + dy * dy);
          var force = repulsion / dist2 * cooling;
          a.vx -= dx * force;
          a.vy -= dy * force;
          b.vx += dx * force;
          b.vy += dy * force;
        }
      }
      edges.forEach(function (edge) {
        var source = nodes[edge.source];
        var target = nodes[edge.target];
        if (!source || !target) return;
        var dx = target.x - source.x;
        var dy = target.y - source.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var score = Math.max(1, edge.activeScore || edge.score || 1);
        var targetLength = Math.max(54, 145 - Math.log(score + 1) * 18);
        var force = (dist - targetLength) * 0.006 * cooling;
        var fx = dx / dist * force;
        var fy = dy / dist * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });
      nodes.forEach(function (node) {
        var clusterX = node.source === 'snippet' ? -90 : 58;
        node.vx += (clusterX - node.x) * 0.0025 * cooling;
        node.vy += (0 - node.y) * 0.0022 * cooling;
        node.vx *= 0.78;
        node.vy *= 0.78;
        node.x += node.vx;
        node.y += node.vy;
      });
    }
    state.layoutKey = state.mode + ':' + state.densityValue + ':' + state.nodes.length + ':' + state.visibleEdges.length;
  }

  function captureNodePositions() {
    var positions = {};
    state.nodes.forEach(function (node) {
      positions[node.id] = { x: node.x, y: node.y };
    });
    return positions;
  }

  function cancelLayoutAnimation() {
    if (!state.layoutAnimationFrame) return;
    window.cancelAnimationFrame(state.layoutAnimationFrame);
    state.layoutAnimationFrame = 0;
  }

  function cancelVisualAnimation() {
    if (!state.visualAnimationFrame) return;
    window.cancelAnimationFrame(state.visualAnimationFrame);
    state.visualAnimationFrame = 0;
  }

  function cancelViewportAnimation() {
    if (!state.viewportAnimationFrame) return;
    window.cancelAnimationFrame(state.viewportAnimationFrame);
    state.viewportAnimationFrame = 0;
  }

  function requestVisualFrame() {
    if (state.visualAnimationFrame) return;
    state.visualAnimationFrame = window.requestAnimationFrame(function () {
      state.visualAnimationFrame = 0;
      draw();
    });
  }

  function animateNodePositions(fromPositions) {
    var items = state.nodes.map(function (node) {
      var from = fromPositions && fromPositions[node.id] ? fromPositions[node.id] : { x: node.x, y: node.y };
      return {
        node: node,
        fromX: from.x,
        fromY: from.y,
        toX: node.x,
        toY: node.y
      };
    });
    var hasMovement = items.some(function (item) {
      return Math.abs(item.fromX - item.toX) > 0.2 || Math.abs(item.fromY - item.toY) > 0.2;
    });
    if (!hasMovement) {
      draw();
      return;
    }
    cancelLayoutAnimation();
    items.forEach(function (item) {
      item.node.x = item.fromX;
      item.node.y = item.fromY;
      item.node.vx = 0;
      item.node.vy = 0;
    });
    var start = window.performance && window.performance.now ? window.performance.now() : Date.now();
    var duration = 240;
    function step() {
      var now = window.performance && window.performance.now ? window.performance.now() : Date.now();
      var elapsed = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - elapsed, 3);
      items.forEach(function (item) {
        item.node.x = item.fromX + (item.toX - item.fromX) * eased;
        item.node.y = item.fromY + (item.toY - item.fromY) * eased;
      });
      draw();
      if (elapsed < 1) {
        state.layoutAnimationFrame = window.requestAnimationFrame(step);
      } else {
        state.layoutAnimationFrame = 0;
      }
    }
    state.layoutAnimationFrame = window.requestAnimationFrame(step);
  }

  function graphBounds() {
    if (!state.nodes.length) return null;
    return state.nodes.reduce(function (acc, node) {
      var radius = node.radius || 0;
      acc.minX = Math.min(acc.minX, node.x - radius);
      acc.maxX = Math.max(acc.maxX, node.x + radius);
      acc.minY = Math.min(acc.minY, node.y - radius);
      acc.maxY = Math.max(acc.maxY, node.y + radius);
      return acc;
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  }

  function fitScaleForBounds(bounds) {
    if (!bounds || !state.width || !state.height) return 1;
    var padding = Math.max(18, Math.min(76, Math.min(state.width, state.height) * 0.08));
    var availableWidth = Math.max(1, state.width - padding * 2);
    var availableHeight = Math.max(1, state.height - padding * 2);
    var graphWidth = Math.max(1, bounds.maxX - bounds.minX);
    var graphHeight = Math.max(1, bounds.maxY - bounds.minY);
    return Math.min(availableWidth / graphWidth, availableHeight / graphHeight);
  }

  function minimumScale() {
    var fitScale = fitScaleForBounds(graphBounds());
    return Math.max(0.0001, Math.min(0.02, fitScale * 0.72));
  }

  function fittedScale() {
    return Math.max(0.0001, Math.min(1.65, fitScaleForBounds(graphBounds())));
  }

  function relativeZoom() {
    return Math.max(0.001, state.scale / fittedScale());
  }

  function resetView() {
    cancelLayoutAnimation();
    cancelViewportAnimation();
    resizeCanvas();
    if (!state.nodes.length || !state.width || !state.height) return;
    var bounds = graphBounds();
    state.scale = Math.max(0.0001, Math.min(1.65, fitScaleForBounds(bounds)));
    state.panX = -((bounds.minX + bounds.maxX) / 2) * state.scale;
    state.panY = -((bounds.minY + bounds.maxY) / 2) * state.scale;
    draw();
  }

  function worldToScreen(node) {
    return {
      x: state.width / 2 + state.panX + node.x * state.scale,
      y: state.height / 2 + state.panY + node.y * state.scale
    };
  }

  function screenToWorld(clientX, clientY) {
    var rect = state.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - state.width / 2 - state.panX) / state.scale,
      y: (clientY - rect.top - state.height / 2 - state.panY) / state.scale
    };
  }

  function themeValue(name, fallback) {
    if (!state.root) return fallback;
    var value = window.getComputedStyle(state.root).getPropertyValue(name).trim();
    return value || fallback;
  }

  function nodeColor(node) {
    if (node && !node.degree) return themeValue('--relation-graph-isolated', themeValue('--text-subtle', 'CanvasText'));
    return node.source === 'snippet'
      ? themeValue('--relation-graph-snippet', themeValue('--primary-3', themeValue('--primary-2', 'CanvasText')))
      : themeValue('--relation-graph-token', themeValue('--success', themeValue('--primary-2', 'CanvasText')));
  }

  function cleanLabel(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      value = value.label || value.key || value.name || value.cn || value.en || value.id || '';
    }
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function displayLabel(node) {
    if (!node) return '';
    var candidates = [node.label, node.key, node.title, node.name, node.cn, node.en, node.id, node.sourceKey, node.targetKey];
    for (var index = 0; index < candidates.length; index++) {
      var label = cleanLabel(candidates[index]);
      if (label) return label;
    }
    var numericIndex = Number(node.index);
    if (Number.isFinite(numericIndex)) return sourceLabel(node.source) + ' #' + (numericIndex + 1);
    return sourceLabel(node.source);
  }

  function pointerFromEvent(event) {
    if (!state.canvas) return null;
    var rect = state.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function spotlightRadius(zoom) {
    var base = Math.max(78, Math.min(128, Math.min(state.width, state.height) * 0.16));
    var zoomValue = Number.isFinite(zoom) ? zoom : relativeZoom();
    var zoomWeight = Math.max(0.62, Math.min(2.35, Math.sqrt(zoomValue)));
    return base * zoomWeight;
  }

  function spotlightStrength(node, point, radius) {
    if (!node || !state.pointer) return 0;
    point = point || worldToScreen(node);
    var dx = point.x - state.pointer.x;
    var dy = point.y - state.pointer.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    radius = Number.isFinite(radius) ? radius : spotlightRadius();
    return Math.max(0, Math.min(1, 1 - distance / radius));
  }

  function spotlightFocus(spotlights) {
    if (!state.pointer) return null;
    var best = null;
    var bestStrength = 0;
    state.nodes.forEach(function (node) {
      var strength = spotlights[node.index] || 0;
      if (strength > bestStrength) {
        best = node;
        bestStrength = strength;
      }
    });
    return bestStrength > 0.08 ? best : null;
  }

  function visualKey(node) {
    return node && (node.id || node.key || String(node.index));
  }

  function smoothValue(current, target, mix) {
    current = Number.isFinite(current) ? current : 0;
    target = Number.isFinite(target) ? target : 0;
    var next = current + (target - current) * mix;
    return Math.abs(next - target) < 0.003 ? target : next;
  }

  function labelAlphaTarget(rawLight, isFocus, isPinned) {
    if (isFocus) return 1;
    var pinnedAlpha = isPinned ? 0.68 : 0;
    var lightAlpha = rawLight > 0.02 ? Math.min(0.42, rawLight * 0.48) : 0;
    return Math.max(pinnedAlpha, lightAlpha);
  }

  function updateVisuals(targets) {
    var now = window.performance && window.performance.now ? window.performance.now() : Date.now();
    var delta = state.lastVisualTime ? Math.max(0, Math.min(80, now - state.lastVisualTime)) : 16;
    state.lastVisualTime = now;
    var mix = 1 - Math.exp(-delta / 120);
    var active = false;
    var seen = {};
    state.nodes.forEach(function (node) {
      var key = visualKey(node);
      if (!key) return;
      seen[key] = true;
      var target = targets[key] || {};
      var visual = state.visuals[key] || { light: 0, focus: 0, hover: 0, labelAlpha: 0 };
      visual.light = smoothValue(visual.light, target.light || 0, mix);
      visual.focus = smoothValue(visual.focus, target.focus || 0, mix);
      visual.hover = smoothValue(visual.hover, target.hover || 0, mix);
      visual.labelAlpha = smoothValue(visual.labelAlpha, target.labelAlpha || 0, mix);
      if (Math.abs(visual.light - (target.light || 0)) > 0.003
        || Math.abs(visual.focus - (target.focus || 0)) > 0.003
        || Math.abs(visual.hover - (target.hover || 0)) > 0.003
        || Math.abs(visual.labelAlpha - (target.labelAlpha || 0)) > 0.003) {
        active = true;
      }
      state.visuals[key] = visual;
    });
    Object.keys(state.visuals).forEach(function (key) {
      if (!seen[key]) delete state.visuals[key];
    });
    if (active) requestVisualFrame();
    return state.visuals;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function matchesQuery(node) {
    if (!state.query) return false;
    return displayLabel(node).toLowerCase().indexOf(state.query) !== -1;
  }

  function neighborSet() {
    var selected = state.selectedNode;
    var set = new Set();
    if (!selected) return set;
    state.visibleEdges.forEach(function (edge) {
      if (edge.source === selected.index) set.add(edge.target);
      if (edge.target === selected.index) set.add(edge.source);
    });
    return set;
  }

  function edgeLineWidth(edge, zoom) {
    var base = Math.max(0.48, Math.min(2.25, 0.48 + Math.sqrt(edge.activeScore || 1) * 0.13));
    var zoomWeight = Math.max(0.74, Math.min(1.12, Math.pow(Math.max(zoom || 1, 0.001), 0.18)));
    return Math.max(0.45, base * zoomWeight);
  }

  function edgeAlpha(edge, isActive, maxScore, zoom) {
    if (state.selectedNode && !isActive) return 0.12;
    var alpha = Math.min(0.72, 0.22 + (edge.activeScore || 1) / maxScore * 0.46);
    return state.scale < 0.18 && (zoom || 1) < 1.5 ? Math.min(0.82, alpha + 0.08) : alpha;
  }

  function draw() {
    if (!state.ctx || !state.canvas) return;
    resizeCanvas();
    updateScaleBadge();
    var ctx = state.ctx;
    ctx.clearRect(0, 0, state.width, state.height);
    if (!state.nodes.length) return;
    var selected = state.selectedNode;
    var neighbors = neighborSet();
    var zoom = relativeZoom();
    var spotlightRange = spotlightRadius(zoom);
    var rawSpotlights = state.nodes.map(function (node) { return spotlightStrength(node, null, spotlightRange); });
    var focusNode = state.hoveredNode || spotlightFocus(rawSpotlights);
    var visualTargets = {};
    state.nodes.forEach(function (node) {
      var key = visualKey(node);
      if (!key) return;
      var selectedOrNear = selected && (selected.index === node.index || neighbors.has(node.index));
      var isQuery = matchesQuery(node);
      var isFocus = focusNode && focusNode.index === node.index;
      var isHovered = node === state.hoveredNode;
      visualTargets[key] = {
        light: rawSpotlights[node.index] || 0,
        focus: isFocus ? 1 : 0,
        hover: isHovered ? 1 : 0,
        labelAlpha: labelAlphaTarget(rawSpotlights[node.index] || 0, isFocus, selectedOrNear || isQuery || isHovered)
      };
    });
    var visuals = updateVisuals(visualTargets);
    var edgeColor = themeValue('--relation-graph-edge', themeValue('--border', 'CanvasText'));
    var edgeStrong = themeValue('--relation-graph-edge-strong', themeValue('--primary-2', 'CanvasText'));
    var labelColor = themeValue('--relation-graph-label', themeValue('--text', 'CanvasText'));
    var labelBg = themeValue('--relation-graph-label-bg', themeValue('--surface', 'Canvas'));
    var selectedColor = themeValue('--relation-graph-selected', themeValue('--primary-2', 'CanvasText'));
    var maxScore = Math.max(1, state.visibleEdges.reduce(function (max, edge) { return Math.max(max, edge.activeScore || 0); }, 0));

    state.visibleEdges.forEach(function (edge) {
      var source = state.nodes[edge.source];
      var target = state.nodes[edge.target];
      if (!source || !target) return;
      var sourcePoint = worldToScreen(source);
      var targetPoint = worldToScreen(target);
      var isActive = !!(selected && (edge.source === selected.index || edge.target === selected.index));
      var edgeLight = Math.max((visuals[visualKey(source)] || {}).light || 0, (visuals[visualKey(target)] || {}).light || 0);
      ctx.beginPath();
      ctx.moveTo(sourcePoint.x, sourcePoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.strokeStyle = edgeColor;
      ctx.globalAlpha = edgeAlpha(edge, isActive, maxScore, zoom);
      var lineWidth = edgeLineWidth(edge, zoom);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      if (isActive || edgeLight > 0.01) {
        ctx.beginPath();
        ctx.moveTo(sourcePoint.x, sourcePoint.y);
        ctx.lineTo(targetPoint.x, targetPoint.y);
        ctx.strokeStyle = edgeStrong;
        ctx.globalAlpha = isActive ? 0.42 : Math.min(0.42, edgeLight * 0.42);
        ctx.lineWidth = Math.max(0.35, lineWidth * 0.72);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    state.nodes.forEach(function (node) {
      var point = worldToScreen(node);
      var isSelected = selected && selected.index === node.index;
      var isNeighbor = neighbors.has(node.index);
      var isQuery = matchesQuery(node);
      var isIsolated = !node.degree;
      var muted = selected && !isSelected && !isNeighbor;
      var visual = visuals[visualKey(node)] || {};
      var light = visual.light || 0;
      var radius = Math.max(2.5, node.radius * state.scale);
      var color = isSelected ? selectedColor : nodeColor(node);
      if (light > 0.01 && !muted) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 4 + light * 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.07 + light * 0.08;
        ctx.fill();
      }
      if (isIsolated && !isSelected) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + light * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = muted ? 0.22 : 0.42 + light * 0.22;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + (isSelected ? 2.4 : isQuery ? 1.8 : 0), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = muted ? 0.28 : Math.min(0.92, 0.72 + light * 0.16);
        ctx.fill();
      }
      if (isSelected || isQuery || (visual.hover || 0) > 0.02) {
        ctx.lineWidth = Math.max(1, 1.3 * state.scale);
        ctx.strokeStyle = selectedColor;
        ctx.globalAlpha = isSelected || isQuery ? 1 : Math.min(1, visual.hover || 0);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    var labelItems = [];
    state.nodes.forEach(function (node) {
      var selectedOrNear = selected && (selected.index === node.index || neighbors.has(node.index));
      var visual = visuals[visualKey(node)] || {};
      var light = visual.light || 0;
      var focusWeight = visual.focus || 0;
      var isPinned = selectedOrNear || matchesQuery(node) || (visual.hover || 0) > 0.02;
      var point = worldToScreen(node);
      var text = displayLabel(node);
      var alpha = visual.labelAlpha || 0;
      if (alpha <= 0.04 || !text) return;
      var nodeRadius = Math.max(2.5, node.radius * state.scale);
      var fontSize = 11.5;
      ctx.font = fontSize + 'px ' + themeValue('--font-ui', 'sans-serif');
      var width = ctx.measureText(text).width + 12;
      var height = 18;
      var x = Math.min(Math.max(4, point.x - width / 2), Math.max(4, state.width - width - 4));
      var y = Math.min(Math.max(4, point.y + nodeRadius + 8), Math.max(4, state.height - height - 4));
      labelItems.push({
        text: text,
        x: x,
        y: y,
        width: width,
        height: height,
        fontSize: fontSize,
        alpha: alpha,
        priority: focusWeight * 3 + (isPinned ? 2 : 0) + light
      });
    });
    labelItems.sort(function (a, b) { return a.priority - b.priority || a.alpha - b.alpha; });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    labelItems.forEach(function (item) {
      ctx.font = item.fontSize + 'px ' + themeValue('--font-ui', 'sans-serif');
      roundedRect(ctx, item.x, item.y, item.width, item.height, 8);
      ctx.fillStyle = labelBg;
      ctx.globalAlpha = 0.42 * item.alpha;
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.globalAlpha = item.alpha;
      ctx.fillText(item.text, item.x + item.width / 2, item.y + item.height / 2 + 0.5);
    });
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
    updateDetailPosition();
  }

  function nearestNode(clientX, clientY) {
    var point = screenToWorld(clientX, clientY);
    var best = null;
    var bestDistance = Infinity;
    state.nodes.forEach(function (node) {
      var dx = point.x - node.x;
      var dy = point.y - node.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var threshold = Math.max(10 / state.scale, node.radius + 6 / state.scale);
      if (distance <= threshold && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    });
    return best;
  }

  function relatedEdges(node) {
    if (!node) return [];
    return state.edges.filter(function (edge) { return edge.source === node.index || edge.target === node.index; })
      .map(function (edge) {
        var otherIndex = edge.source === node.index ? edge.target : edge.source;
        return { edge: edge, node: state.nodes[otherIndex], score: scoreForEdge(edge) };
      })
      .filter(function (item) { return item.node && item.score > 0; })
      .sort(function (a, b) { return b.score - a.score || displayLabel(a.node).localeCompare(displayLabel(b.node), 'zh-Hans-CN'); });
  }

  function renderDetail() {
    if (!state.detail) return;
    var node = state.selectedNode;
    state.detail.innerHTML = '';
    state.detail.hidden = !node;
    if (!node) return;
    var titleText = displayLabel(node);
    var title = document.createElement('div');
    title.className = 'relation-graph-detail__title';
    title.textContent = titleText || sourceLabel(node.source);
    state.detail.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'relation-graph-detail__meta';
    meta.textContent = sourceLabel(node.source) + ' · ' + t('editor.graph.nodeStats', { degree: node.degree || 0, score: node.score || 0 });
    state.detail.appendChild(meta);

    var score = document.createElement('div');
    score.className = 'relation-graph-detail__score';
    score.textContent = t('editor.graph.scoreDetail', { score: node.score || 0, nested: node.nested || 0, adjacent: node.adjacent || 0 });
    state.detail.appendChild(score);

    var listTitle = document.createElement('div');
    listTitle.className = 'relation-graph-detail__subtitle';
    listTitle.textContent = t('editor.graph.related');
    state.detail.appendChild(listTitle);

    var list = document.createElement('div');
    list.className = 'relation-graph-detail__list';
    relatedEdges(node).slice(0, 8).forEach(function (item) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'relation-graph-detail__item';
      row.dataset.nodeIndex = String(item.node.index);
      var name = document.createElement('span');
      name.textContent = displayLabel(item.node);
      var value = document.createElement('span');
      value.textContent = String(item.score);
      row.appendChild(name);
      row.appendChild(value);
      list.appendChild(row);
    });
    if (!list.children.length) {
      var empty = document.createElement('div');
      empty.className = 'relation-graph-detail__empty';
      empty.textContent = t('editor.graph.noRelated');
      list.appendChild(empty);
    }
    state.detail.appendChild(list);
    updateDetailPosition();
  }

  function updateDetailPosition() {
    if (!state.detail || state.detail.hidden || !state.selectedNode || !state.stage) return;
    var point = worldToScreen(state.selectedNode);
    var rect = state.stage.getBoundingClientRect();
    var detailRect = state.detail.getBoundingClientRect();
    var left = Math.min(Math.max(8, point.x + 16), Math.max(8, rect.width - detailRect.width - 8));
    var top = Math.min(Math.max(8, point.y + 16), Math.max(8, rect.height - detailRect.height - 8));
    state.detail.style.left = left + 'px';
    state.detail.style.top = top + 'px';
  }

  function setSelected(node, center) {
    state.selectedNode = node || null;
    if (node && center) centerNode(node);
    renderDetail();
    draw();
  }

  function centerNode(node) {
    if (!node) return;
    animateViewportTo(-node.x * state.scale, -node.y * state.scale);
  }

  function animateViewportTo(targetPanX, targetPanY) {
    cancelViewportAnimation();
    var fromPanX = state.panX;
    var fromPanY = state.panY;
    if (Math.abs(fromPanX - targetPanX) < 0.5 && Math.abs(fromPanY - targetPanY) < 0.5) {
      state.panX = targetPanX;
      state.panY = targetPanY;
      draw();
      return;
    }
    var start = window.performance && window.performance.now ? window.performance.now() : Date.now();
    var duration = 180;
    function step() {
      var now = window.performance && window.performance.now ? window.performance.now() : Date.now();
      var elapsed = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - elapsed, 3);
      state.panX = fromPanX + (targetPanX - fromPanX) * eased;
      state.panY = fromPanY + (targetPanY - fromPanY) * eased;
      draw();
      if (elapsed < 1) {
        state.viewportAnimationFrame = window.requestAnimationFrame(step);
      } else {
        state.viewportAnimationFrame = 0;
      }
    }
    state.viewportAnimationFrame = window.requestAnimationFrame(step);
  }

  function updateStatus() {
    if (state.status) {
      state.status.textContent = t('editor.graph.status', {
        nodes: state.nodes.length,
        edges: state.visibleEdges.length,
        total: state.availableEdges,
        percent: state.densityValue
      });
    }
    if (state.empty) state.empty.hidden = !!state.nodes.length;
  }

  function rebuildLayout(reset) {
    if (reset) cancelLayoutAnimation();
    var previousPositions = reset ? null : captureNodePositions();
    filterEdges();
    runLayout();
    if (reset) resetView();
    else animateNodePositions(previousPositions);
    updateStatus();
  }

  function setMode(mode) {
    if (!mode || state.mode === mode) return;
    state.mode = mode;
    updateModeButton();
    rebuildLayout(false);
  }

  function cycleMode() {
    var index = modes.indexOf(state.mode);
    setMode(modes[(index + 1) % modes.length]);
  }

  function setDensity(value) {
    var next = clampLinkPercent(value);
    if (state.densityValue === next) return;
    state.densityValue = next;
    rebuildLayout(false);
  }

  function updateSearch(value) {
    state.query = String(value || '').trim().toLowerCase();
    if (state.query) {
      var hit = state.nodes.find(matchesQuery);
      if (hit) setSelected(hit, true);
      else draw();
    } else {
      draw();
    }
  }

  function onPointerDown(event) {
    if (!state.canvas) return;
    cancelViewportAnimation();
    state.dragging = true;
    state.didDrag = false;
    state.pointer = null;
    state.hoveredNode = null;
    state.canvas.classList.remove('is-hovering-node');
    state.dragStart = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
    state.canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (state.dragging && state.dragStart) {
      var dx = event.clientX - state.dragStart.x;
      var dy = event.clientY - state.dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) state.didDrag = true;
      state.panX = state.dragStart.panX + dx;
      state.panY = state.dragStart.panY + dy;
      draw();
      return;
    }
    state.pointer = pointerFromEvent(event);
    var hover = nearestNode(event.clientX, event.clientY);
    if (hover !== state.hoveredNode) {
      state.hoveredNode = hover;
      state.canvas.classList.toggle('is-hovering-node', !!hover);
    }
    draw();
  }

  function onPointerLeave() {
    if (state.dragging) return;
    state.pointer = null;
    state.hoveredNode = null;
    if (state.canvas) state.canvas.classList.remove('is-hovering-node');
    draw();
  }

  function onPointerUp(event) {
    if (!state.dragging) return;
    state.dragging = false;
    state.canvas.releasePointerCapture(event.pointerId);
    if (!state.didDrag) setSelected(nearestNode(event.clientX, event.clientY), false);
  }

  function onWheel(event) {
    if (!state.canvas) return;
    cancelViewportAnimation();
    event.preventDefault();
    var rect = state.canvas.getBoundingClientRect();
    var before = screenToWorld(event.clientX, event.clientY);
    var factor = event.deltaY < 0 ? 1.12 : 0.89;
    state.scale = Math.max(minimumScale(), Math.min(3.4, state.scale * factor));
    var afterX = state.width / 2 + state.panX + before.x * state.scale;
    var afterY = state.height / 2 + state.panY + before.y * state.scale;
    state.panX += event.clientX - rect.left - afterX;
    state.panY += event.clientY - rect.top - afterY;
    draw();
  }

  function bindControls() {
    if (state.modeButton) state.modeButton.addEventListener('click', cycleMode);
    if (state.density) state.density.addEventListener('input', function () { setDensity(state.density.value); });
    if (state.reset) state.reset.addEventListener('click', resetView);
    if (state.search) state.search.addEventListener('input', function () { updateSearch(state.search.value); });
    if (state.canvas) {
      state.canvas.addEventListener('pointerdown', onPointerDown);
      state.canvas.addEventListener('pointermove', onPointerMove);
      state.canvas.addEventListener('pointerup', onPointerUp);
      state.canvas.addEventListener('pointercancel', onPointerUp);
      state.canvas.addEventListener('pointerleave', onPointerLeave);
      state.canvas.addEventListener('wheel', onWheel, { passive: false });
    }
    if (state.detail) {
      state.detail.addEventListener('click', function (event) {
        var item = event.target.closest('.relation-graph-detail__item');
        if (!item) return;
        var node = state.nodes[Number(item.dataset.nodeIndex)];
        if (node) setSelected(node, true);
      });
    }
    window.addEventListener('resize', function () {
      if (!state.root || state.root.hidden) return;
      resizeCanvas();
      draw();
    });
    window.addEventListener('i18n:changed', function () {
      updateModeButton();
      updateScaleBadge();
      updateFilterValue();
      updateStatus();
      renderDetail();
      draw();
    });
  }

  function mount(root) {
    root = root || byId('draft-relations-view');
    if (!root || root.dataset.relationGraphMounted === '1') return !!root;
    state.root = root;
    state.canvas = byId('relation-graph-canvas');
    state.stage = byId('relation-graph-stage');
    state.detail = byId('relation-graph-detail');
    state.empty = byId('relation-graph-empty');
    state.status = byId('relation-graph-status');
    state.search = byId('relation-graph-search');
    state.density = byId('relation-graph-density');
    state.filterValue = byId('relation-graph-filter-value');
    state.reset = byId('relation-graph-reset');
    state.modeButton = byId('relation-graph-mode');
    state.scaleBadge = byId('relation-graph-scale');
    if (!state.canvas) return false;
    root.dataset.relationGraphMounted = '1';
    if (state.density) state.density.value = String(state.densityValue);
    resizeCanvas();
    updateModeButton();
    updateScaleBadge();
    updateFilterValue();
    bindControls();
    return true;
  }

  function update(payload) {
    if (!payload || !payload.index || !payload.entries || !ns.Recommendations || !ns.Recommendations.buildGraph) return;
    if (!mount(payload.root)) return;
    var graph = ns.Recommendations.buildGraph(payload.index, payload.entries);
    var cloned = cloneGraph(graph);
    state.graph = graph;
    state.nodes = cloned.nodes;
    state.edges = cloned.edges;
    state.selectedNode = null;
    state.hoveredNode = null;
    cancelViewportAnimation();
    cancelVisualAnimation();
    state.visuals = {};
    state.lastVisualTime = 0;
    state.dataReady = true;
    renderDetail();
    rebuildLayout(true);
  }

  function activate() {
    if (!mount()) return;
    resizeCanvas();
    if (state.dataReady && (!state.layoutKey || !state.visibleEdges.length)) rebuildLayout(true);
    else draw();
  }

  ns.RelationGraph = {
    mount: mount,
    update: update,
    activate: activate,
    reset: resetView
  };
})();