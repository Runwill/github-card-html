;(function () {
  'use strict';

  var ns = window.CardEditor = window.CardEditor || {};
  var ATTRS = ['class_name', 'epithet'];

  var EDITOR_DATA_BASE = 'editor/data/';
  var editorStaticDataPromise = null;

  function responseJson(response) {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  function fetchEditorJson(fileName, fallback) {
    return fetch(EDITOR_DATA_BASE + fileName).then(responseJson).catch(function () { return fallback; });
  }

  function loadStaticEditorData() {
    if (!editorStaticDataPromise) {
      editorStaticDataPromise = Promise.all([
        fetchEditorJson('pinyin_table.json', {}),
        fetchEditorJson('compressed_elements.json', {})
      ]).then(function (data) {
        return { pinyinTable: data[0] || {}, compressedElements: data[1] || {} };
      });
    }
    return editorStaticDataPromise;
  }

  function t(key, params) {
    return window.t ? window.t(key, params) : key;
  }

  function fetchList(url) {
    if (!url) return Promise.resolve([]);
    return window.fetchJsonCached(url).catch(function () { return []; });
  }

  function partsForSource(item, sourceType) {
    if (!Array.isArray(item.part) || !item.part.length) return [];
    return sourceType === 'dynamic' ? item.part.slice(0, 1) : item.part;
  }

  function epithetText(item, fallback) {
    return fallback || (Array.isArray(item.epithet) ? item.epithet.map(function (ep) { return ep && ep.cn; }).filter(Boolean).join('/') : '');
  }

  function isVariantValue(value) {
    return Array.isArray(value) && Array.isArray(value[0]);
  }

  function normalizeVariants(value) {
    if (!Array.isArray(value)) return [[String(value || '')]];
    return isVariantValue(value) ? value : [value];
  }

  function getVariant(value, index) {
    var variants = normalizeVariants(value);
    var selected = variants[Math.max(0, Math.min(index || 0, variants.length - 1))] || variants[0] || [''];
    return [String(selected[0] || ''), String(selected.length > 1 ? selected[1] || '' : '')];
  }

  function stripTags(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || '').trim();
  }

  function mergeInheritedAttributes(openHtml, cNode) {
    if (!/>\s*$/.test(openHtml || '')) return openHtml;
    var className = (cNode.getAttribute('class') || '').trim();
    var epithet = (cNode.getAttribute('epithet') || '').trim();
    var insertion = '';
    if (className) insertion += ' class="' + escapeAttr(className) + '"';
    if (epithet) insertion += ' epithet="' + escapeAttr(epithet) + '"';
    if (!insertion) return openHtml;
    return openHtml.replace(/>\s*$/, insertion + '>');
  }

  function expandShortcutHtml(html, defaultElements) {
    var holder = document.createElement('template');
    holder.innerHTML = html || '';

    for (var guard = 0; guard < 1200; guard++) {
      var cNode = holder.content.querySelector('c[name]');
      if (!cNode) break;
      var name = cNode.getAttribute('name') || '';
      var value = defaultElements && defaultElements[name];
      if (!value) {
        var fallback = document.createTextNode(cNode.textContent || '');
        cNode.replaceWith(fallback);
        continue;
      }
      var variantIndex = Number(cNode.getAttribute('type') || 0);
      if (!Number.isFinite(variantIndex)) variantIndex = 0;
      var pair = getVariant(value, variantIndex);
      var openHtml = mergeInheritedAttributes(pair[0], cNode);
      var wrapper = document.createElement('template');
      wrapper.innerHTML = openHtml + cNode.innerHTML + pair[1];
      cNode.replaceWith(wrapper.content.cloneNode(true));
    }

    return Array.from(holder.content.childNodes).map(function (node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
      if (node.outerHTML != null) return node.outerHTML;
      var div = document.createElement('div');
      div.appendChild(node.cloneNode(true));
      return div.innerHTML;
    }).join('');
  }

  function transformToBottomElements(dataList, sourceType) {
    var result = {};
    if (!Array.isArray(dataList)) return result;
    dataList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var en = item.en || '';
      var cn = item.cn || '';
      if (cn) result[cn] = ['<' + en + '>', '</' + en + '>'];

      var parts = partsForSource(item, sourceType);
      if (parts.length) {
        parts.forEach(function (sub) {
          if (!sub || typeof sub !== 'object') return;
          if (sub.cn) result[sub.cn] = ['<' + (sub.en || '') + '>', '</' + (sub.en || '') + '>'];
        });
      }

      if (Array.isArray(item.epithet) && item.epithet.length) {
        var text = epithetText(item, '');
        if (text) result[text] = ['<' + en + '>', '</' + en + '>'];
      }

      if (!cn && en && !result[en]) result[en] = ['<' + en + '>', '</' + en + '>'];
    });
    return result;
  }

  function transformToChineseMap(dataList, sourceType) {
    var result = {};
    if (!Array.isArray(dataList)) return result;
    dataList.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var en = String(item.en || '').toLowerCase();
      var cn = item.cn || '';
      var color = item.color || '';
      if (!en) return;

      var parts = partsForSource(item, sourceType);
      if (parts.length) {
        if (cn) result[en] = { label: cn, color: color, py: item.py || '', abbr: item.pyAbbr || '' };
        parts.forEach(function (sub) {
          if (!sub || typeof sub !== 'object') return;
          var partEn = String(sub.en || '').toLowerCase();
          var partCn = sub.cn || '';
          if (!partEn || !partCn) return;
          result[partEn] = {
            label: partCn,
            color: sub.termedPart ? String(color || '') + '60' : color,
            py: item.py || '',
            abbr: item.pyAbbr || ''
          };
        });
      } else if (Array.isArray(item.epithet) && item.epithet.length) {
        result[en] = { label: epithetText(item, cn), color: color, py: item.py || '', abbr: item.pyAbbr || '' };
      } else {
        result[en] = { label: cn, color: color, py: item.py || '', abbr: item.pyAbbr || '' };
      }
    });
    return result;
  }

  function makeEntry(key, value, chineseMap, pinyinTable, source) {
    var variants = normalizeVariants(value);
    var html = variants.map(function (pair) { return String(pair[0] || '') + String(pair[1] || ''); }).join(' ');
    var plain = stripTags(html);
    var meta = (chineseMap[String(key).toLowerCase()] || {});
    return {
      key: key,
      value: value,
      source: source,
      hasVariant: variants.length > 1,
      searchText: [key, html, plain, meta.py || '', meta.abbr || '', pinyinSearchText(key + ' ' + plain, pinyinTable)].join(' ').toLowerCase()
    };
  }

  function pinyinSearchText(text, pinyinTable) {
    var full = [];
    var compact = [];
    var abbr = [];
    String(text || '').split('').forEach(function (ch) {
      var py = pinyinTable[ch];
      if (py) {
        full.push(py);
        compact.push(py);
        abbr.push(py.charAt(0));
      } else if (/^[a-z0-9]$/i.test(ch)) {
        var lower = ch.toLowerCase();
        full.push(lower);
        compact.push(lower);
        abbr.push(lower);
      }
    });
    return [full.join(' '), compact.join(''), abbr.join('')].join(' ');
  }

  async function loadElementData() {
    var fixed = [];
    var dynamic = [];
    var cards = [];
    var skills = [];
    var staticData = await loadStaticEditorData();
    var compressedElements = staticData.compressedElements;
    var pinyinTable = staticData.pinyinTable;
    if (window.endpoints) {
      var data = await Promise.all([
        fetchList(window.endpoints.termFixed && window.endpoints.termFixed()),
        fetchList(window.endpoints.termDynamic && window.endpoints.termDynamic()),
        fetchList(window.endpoints.card && window.endpoints.card()),
        fetchList(window.endpoints.skill && window.endpoints.skill())
      ]);
      fixed = data[0] || [];
      dynamic = data[1] || [];
      cards = data[2] || [];
      skills = data[3] || [];
    }

    var bottomElements = Object.assign(
      {},
      transformToBottomElements(fixed, 'fixed'),
      transformToBottomElements(dynamic, 'dynamic'),
      transformToBottomElements(cards, 'card')
    );
    var defaultElements = Object.assign({}, bottomElements, compressedElements);
    var chineseMap = Object.assign(
      {},
      transformToChineseMap(fixed, 'fixed'),
      transformToChineseMap(dynamic, 'dynamic'),
      transformToChineseMap(cards, 'card')
    );

    var keys = Object.keys(defaultElements).sort(function (a, b) {
      return a.length === b.length ? a.localeCompare(b, 'zh-Hans-CN') : a.length - b.length;
    });
    var entries = keys.map(function (key) {
      return makeEntry(key, defaultElements[key], chineseMap, pinyinTable, Object.prototype.hasOwnProperty.call(compressedElements, key) ? 'snippet' : 'token');
    });

    var relationCorpus = [];
    if (Array.isArray(skills)) {
      skills.forEach(function (skill) {
        if (skill && skill.content) relationCorpus.push(String(skill.content));
      });
    }

    return { entries: entries, defaultElements: defaultElements, chineseMap: chineseMap, relationCorpus: relationCorpus };
  }

  function makeId() {
    return 'ed_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function displayNameForTag(tag, chineseMap) {
    var meta = chineseMap && chineseMap[String(tag || '').toLowerCase()];
    return (meta && meta.label) || tag || '';
  }

  function nodeFromDom(domNode, chineseMap) {
    if (domNode.nodeType === Node.TEXT_NODE) {
      return { id: makeId(), element: false, text: domNode.nodeValue || '', tag: domNode.nodeValue || '', attrs: {}, children: [] };
    }
    if (domNode.nodeType !== Node.ELEMENT_NODE) return null;
    var tag = String(domNode.tagName || '').toLowerCase();
    var attrs = {};
    ATTRS.forEach(function (attr) {
      var domAttr = attr === 'class_name' ? 'class' : attr;
      attrs[attr] = domNode.getAttribute(domAttr) || '';
    });
    var children = Array.from(domNode.childNodes).map(function (child) {
      return nodeFromDom(child, chineseMap);
    }).filter(Boolean);
    return {
      id: makeId(),
      element: true,
      text: displayNameForTag(tag, chineseMap),
      tag: tag,
      attrs: attrs,
      children: children,
      expanded: true
    };
  }

  function parseHtmlToNodes(html, defaultElements, chineseMap) {
    var expanded = expandShortcutHtml(String(html || '').replace(/\\"/g, '"'), defaultElements || {});
    var template = document.createElement('template');
    template.innerHTML = expanded;
    return Array.from(template.content.childNodes).map(function (node) {
      return nodeFromDom(node, chineseMap || {});
    }).filter(Boolean);
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function serializeNode(node) {
    if (!node) return '';
    if (!node.element) return node.text || '';
    var tag = node.tag || 'span';
    var attrText = ATTRS.map(function (attr) {
      var value = node.attrs && node.attrs[attr];
      if (!value) return '';
      return ' ' + (attr === 'class_name' ? 'class' : attr) + '="' + escapeAttr(value) + '"';
    }).join('');
    var inner = (node.children || []).map(serializeNode).join('');
    return '<' + tag + attrText + '>' + inner + '</' + tag + '>';
  }

  function serializeNodes(nodes, escapeQuotes) {
    var html = (nodes || []).map(serializeNode).join('');
    return escapeQuotes ? html.replace(/"/g, '\\"') : html;
  }

  function refreshLabels(nodes, chineseMap) {
    (nodes || []).forEach(function (node) {
      if (node.element) node.text = displayNameForTag(node.tag, chineseMap || {});
      refreshLabels(node.children || [], chineseMap || {});
    });
  }

  function sourceLabel(source) {
    return source === 'snippet' ? t('editor.source.snippet') : t('editor.source.token');
  }

  ns.Data = {
    ATTRS: ATTRS,
    loadElementData: loadElementData,
    parseHtmlToNodes: parseHtmlToNodes,
    serializeNodes: serializeNodes,
    expandShortcutHtml: expandShortcutHtml,
    getVariant: getVariant,
    refreshLabels: refreshLabels,
    sourceLabel: sourceLabel,
    isVariantValue: isVariantValue,
    makeId: makeId
  };
})();