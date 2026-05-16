;(function () {
  'use strict';

  var ns = window.CardEditor = window.CardEditor || {};

  function variantsForValue(value) {
    if (!Array.isArray(value)) return [[String(value || ''), '']];
    return ns.Data.isVariantValue(value) ? value : [value];
  }

  function expandVariantPair(pair, defaultElements) {
    var sentinel = '___card_editor_variant_split___';
    var open = String(pair && pair[0] || '');
    var close = String(pair && pair.length > 1 ? pair[1] || '' : '');
    var expanded = ns.Data.expandShortcutHtml(open + sentinel + close, defaultElements || {});
    var parts = expanded.split(sentinel);
    if (parts.length === 2) return [parts[0], parts[1]];
    return [expanded, ''];
  }

  function findAllPositions(text, needle) {
    var found = [];
    if (!needle) return found;
    var from = 0;
    while (from <= text.length) {
      var index = text.indexOf(needle, from);
      if (index === -1) break;
      found.push(index);
      from = index + Math.max(1, needle.length);
    }
    return found;
  }

  function spansForPattern(text, pattern) {
    var spans = [];
    pattern.singles.forEach(function (single) {
      findAllPositions(text, single).forEach(function (pos) {
        spans.push({ cs: pos, ce: pos + single.length, os: pos, oe: pos, xs: pos + single.length, xe: pos + single.length, isPair: false });
      });
    });
    pattern.pairs.forEach(function (pair, pairIndex) {
      var events = [];
      findAllPositions(text, pair.open).forEach(function (pos) {
        events.push({ pos: pos, type: 0, pairIndex: pairIndex, length: pair.open.length });
      });
      findAllPositions(text, pair.close).forEach(function (pos) {
        events.push({ pos: pos, type: 1, pairIndex: pairIndex, length: pair.close.length });
      });
      events.sort(function (a, b) { return a.pos === b.pos ? a.type - b.type : a.pos - b.pos; });
      var stack = [];
      events.forEach(function (event) {
        if (event.type === 0) {
          stack.push(event);
        } else if (stack.length) {
          var openEvent = stack.pop();
          if (event.pos >= openEvent.pos + openEvent.length) {
            spans.push({
              cs: openEvent.pos + openEvent.length,
              ce: event.pos,
              os: openEvent.pos,
              oe: openEvent.pos + openEvent.length,
              xs: event.pos,
              xe: event.pos + event.length,
              isPair: true
            });
          }
        }
      });
    });
    return spans;
  }

  function containsSpan(outer, inner) {
    return outer.os < inner.os && inner.xe < outer.xe;
  }

  function isAdjacentGap(text, end, start) {
    if (end > start) return false;
    var gap = text.slice(end, start);
    if (gap.length > 2) return false;
    return /^[\s\u3000,，.。;；:：、|/\\\-—~·!！?？()（）\[\]【】{}"'`^+*=<>]*$/.test(gap);
  }

  function buildIndex(entries, defaultElements, relationCorpus) {
    var patterns = {};
    var corpus = [];
    entries.forEach(function (entry) {
      var pairs = [];
      var singles = [];
      variantsForValue(entry.value).forEach(function (variant) {
        var expanded = expandVariantPair(variant, defaultElements);
        if (expanded[0] && expanded[1]) pairs.push({ open: expanded[0], close: expanded[1] });
        else if (expanded[0]) singles.push(expanded[0]);
        var combined = expanded[0] + expanded[1];
        if (combined) corpus.push(combined);
      });
      patterns[entry.key] = { pairs: pairs, singles: singles };
    });
    (relationCorpus || []).forEach(function (text) {
      if (text) corpus.push(String(text));
    });
    return { patterns: patterns, corpus: corpus, cache: {} };
  }

  function getForKey(index, entries, key, bidirectionalMode, limit) {
    var cacheKey = (bidirectionalMode ? 'both:' : 'one:') + key;
    if (index.cache[cacheKey]) return index.cache[cacheKey];
    var sourcePattern = index.patterns[key];
    if (!sourcePattern) return [];
    var byKey = {};
    index.corpus.forEach(function (text) {
      var sourceSpans = spansForPattern(text, sourcePattern);
      if (!sourceSpans.length) return;
      entries.forEach(function (entry) {
        if (entry.key === key) return;
        var targetPattern = index.patterns[entry.key];
        if (!targetPattern) return;
        var targetSpans = spansForPattern(text, targetPattern);
        if (!targetSpans.length) return;
        var nested = 0;
        var adjacent = 0;
        sourceSpans.forEach(function (sourceSpan) {
          targetSpans.forEach(function (targetSpan) {
            if (containsSpan(sourceSpan, targetSpan)) nested += 1;
            if (bidirectionalMode && containsSpan(targetSpan, sourceSpan)) nested += 1;
            if (isAdjacentGap(text, sourceSpan.isPair ? sourceSpan.xe : sourceSpan.ce, targetSpan.isPair ? targetSpan.os : targetSpan.cs)) adjacent += 1;
            if (bidirectionalMode && isAdjacentGap(text, targetSpan.isPair ? targetSpan.xe : targetSpan.ce, sourceSpan.isPair ? sourceSpan.os : sourceSpan.cs)) adjacent += 1;
          });
        });
        if (!nested && !adjacent) return;
        if (!byKey[entry.key]) byKey[entry.key] = { entry: entry, score: 0, nested: 0, adjacent: 0 };
        byKey[entry.key].nested += nested;
        byKey[entry.key].adjacent += adjacent;
        byKey[entry.key].score += nested + adjacent;
      });
    });
    var result = Object.keys(byKey).map(function (itemKey) { return byKey[itemKey]; })
      .sort(function (a, b) { return b.score - a.score || b.nested - a.nested || b.adjacent - a.adjacent || a.entry.key.localeCompare(b.entry.key, 'zh-Hans-CN'); })
      .slice(0, limit || 30);
    index.cache[cacheKey] = result;
    return result;
  }

  function spanStart(span) {
    return span && span.isPair ? span.os : span.cs;
  }

  function spanEnd(span) {
    return span && span.isPair ? span.xe : span.ce;
  }

  function relationMetricsForSpans(text, sourceSpans, targetSpans) {
    var nested = 0;
    var adjacent = 0;
    sourceSpans.forEach(function (sourceSpan) {
      targetSpans.forEach(function (targetSpan) {
        if (containsSpan(sourceSpan, targetSpan)) nested += 1;
        if (containsSpan(targetSpan, sourceSpan)) nested += 1;
        if (isAdjacentGap(text, spanEnd(sourceSpan), spanStart(targetSpan))) adjacent += 1;
        if (isAdjacentGap(text, spanEnd(targetSpan), spanStart(sourceSpan))) adjacent += 1;
      });
    });
    return { nested: nested, adjacent: adjacent, score: nested + adjacent };
  }

  function buildGraph(index, entries) {
    if (!index) return { nodes: [], edges: [], maxScore: 0 };
    index.cache = index.cache || {};
    if (index.cache.graph) return index.cache.graph;
    var nodes = entries.map(function (entry, indexValue) {
      return {
        id: entry.key,
        key: entry.key,
        label: entry.key,
        source: entry.source || 'token',
        index: indexValue,
        degree: 0,
        score: 0,
        nested: 0,
        adjacent: 0
      };
    });
    var keyToIndex = {};
    nodes.forEach(function (node) { keyToIndex[node.key] = node.index; });
    var edgeMap = {};
    (index.corpus || []).forEach(function (textValue) {
      var text = String(textValue || '');
      if (!text) return;
      var present = [];
      entries.forEach(function (entry) {
        var pattern = index.patterns && index.patterns[entry.key];
        if (!pattern) return;
        var spans = spansForPattern(text, pattern);
        if (spans.length) present.push({ entry: entry, spans: spans });
      });
      for (var outer = 0; outer < present.length; outer++) {
        for (var inner = outer + 1; inner < present.length; inner++) {
          var metrics = relationMetricsForSpans(text, present[outer].spans, present[inner].spans);
          if (!metrics.score) continue;
          var sourceIndex = keyToIndex[present[outer].entry.key];
          var targetIndex = keyToIndex[present[inner].entry.key];
          if (sourceIndex == null || targetIndex == null) continue;
          var source = Math.min(sourceIndex, targetIndex);
          var target = Math.max(sourceIndex, targetIndex);
          var pairKey = source + '|' + target;
          if (!edgeMap[pairKey]) {
            edgeMap[pairKey] = {
              id: pairKey,
              source: source,
              target: target,
              sourceKey: nodes[source].key,
              targetKey: nodes[target].key,
              score: 0,
              nested: 0,
              adjacent: 0
            };
          }
          edgeMap[pairKey].score += metrics.score;
          edgeMap[pairKey].nested += metrics.nested;
          edgeMap[pairKey].adjacent += metrics.adjacent;
        }
      }
    });
    var edges = Object.keys(edgeMap).map(function (key) { return edgeMap[key]; })
      .sort(function (a, b) {
        return b.score - a.score || b.nested - a.nested || b.adjacent - a.adjacent || a.sourceKey.localeCompare(b.sourceKey, 'zh-Hans-CN');
      });
    var maxScore = 0;
    edges.forEach(function (edge) {
      maxScore = Math.max(maxScore, edge.score);
      var sourceNode = nodes[edge.source];
      var targetNode = nodes[edge.target];
      if (!sourceNode || !targetNode) return;
      sourceNode.degree += 1;
      targetNode.degree += 1;
      sourceNode.score += edge.score;
      targetNode.score += edge.score;
      sourceNode.nested += edge.nested;
      targetNode.nested += edge.nested;
      sourceNode.adjacent += edge.adjacent;
      targetNode.adjacent += edge.adjacent;
    });
    index.cache.graph = { nodes: nodes, edges: edges, maxScore: maxScore };
    return index.cache.graph;
  }

  ns.Recommendations = {
    buildIndex: buildIndex,
    getForKey: getForKey,
    buildGraph: buildGraph
  };
})();
