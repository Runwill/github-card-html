// Shared token-detail renderer.
import { renderProgramTreeNodes } from '../../../summon/program_panel.js?v=202607072241';

const T = window.tokensAdmin || (window.tokensAdmin = {});

const esc = T.esc || (value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;'));

const TERM_COLLECTIONS = new Set(['term-fixed', 'term-dynamic']);

function tr(key, fallback, params) {
  try { return window.t ? window.t(key, params) : fallback; } catch (_) { return fallback; }
}

function collectionName(collection) {
  const conf = T.COLLECTIONS && T.COLLECTIONS[collection];
  return conf ? tr(conf.sectionKey, collection) : collection;
}

function shortId(id) {
  const s = String(id || '');
  return s.length > 12 ? s.slice(0, 4) + '...' + s.slice(-6) : s;
}

function primitiveText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value, null, 2); } catch (_) { return String(value); }
}

function visibleKeys(value) {
  if (!value || typeof value !== 'object') return [];
  const hide = T.HIDE_KEYS;
  return Object.keys(value).filter(key => !(hide && hide.has && hide.has(key)));
}

function labelOf(detail) {
  const semantic = detail && detail.semantic || {};
  const token = detail && detail.token || {};
  return semantic.label || token.cn || token.name || token.en || token.id || detail?.id || tr('tokens.detail.title', '词元详情');
}

function semanticLine(detail) {
  const semantic = detail && detail.semantic || {};
  return [
    collectionName(detail && detail.collection),
    semantic.targetType || '',
    semantic.key || ''
  ].filter(Boolean).join(' · ');
}

function safeTagName(value) {
  const tag = String(value || '').trim();
  return /^[A-Za-z][A-Za-z0-9_-]*$/.test(tag) ? tag : '';
}

function safeClassToken(value) {
  const cls = String(value || '').trim();
  return cls && !/[\s"'<>`=]/.test(cls) ? cls : '';
}

function classAttr(tokens) {
  return tokens.filter(Boolean).map(esc).join(' ');
}

function renderTokenInline(detail, className = 'token-detail-title-token') {
  const token = detail && detail.token || {};
  const collection = detail && detail.collection;
  const baseClass = safeClassToken(className) || 'token-detail-title-token';
  const fallback = esc(labelOf(detail));

  if (TERM_COLLECTIONS.has(collection)) {
    const tag = safeTagName(token.en);
    if (tag) return '<' + tag + ' class="' + classAttr([baseClass, 'irreplaceable']) + '">' + fallback + '</' + tag + '>';
  }

  if (collection === 'card') {
    const tag = safeTagName(token.en);
    if (tag) return '<' + tag + ' class="' + esc(baseClass) + '">' + fallback + '</' + tag + '>';
  }

  if (collection === 'character') {
    const id = String(token.id == null ? '' : token.id).trim();
    if (/^\d+$/.test(id)) return '<characterName class="' + classAttr(['characterID' + id, baseClass]) + '">' + fallback + '</characterName>';
  }

  if (collection === 'skill') {
    const skillClass = safeClassToken(token.name || token.cn || token.en);
    if (skillClass) return '<characterSkillElement class="' + classAttr([skillClass, baseClass]) + '">' + fallback + '</characterSkillElement>';
  }

  return '<span class="' + esc(baseClass + ' is-static') + '">' + fallback + '</span>';
}

function detailFromPeer(peer, currentDetail) {
  const collection = peer && peer.collection || '';
  const semanticKey = String(currentDetail?.semantic?.key || peer?.key || peer?.label || '').trim();
  const label = peer?.label || semanticKey || peer?.id || collection;
  const token = {};

  if (TERM_COLLECTIONS.has(collection) || collection === 'card') {
    token.en = semanticKey || peer?.en || label;
    token.cn = peer?.cn || label;
  } else if (collection === 'skill') {
    token.name = semanticKey || peer?.name || label;
    token.cn = label;
  } else if (collection === 'character') {
    token.id = semanticKey || peer?.characterId || peer?.id;
    token.name = label;
  }

  return {
    collection,
    id: peer?.id,
    token,
    semantic: { label, key: semanticKey }
  };
}

function renderMetaChip(label, value, className = '') {
  const extra = className ? ' ' + className : '';
  return '<span class="tokens-detail-chip' + extra + '"><i>' + esc(label) + '</i><strong>' + esc(value || '-') + '</strong></span>';
}

function renderJsonLeaf(key, value, path) {
  return '<div class="tokens-detail-kv__row" data-path="' + esc(path || key || '') + '">' +
    '<div class="tokens-detail-kv__key">' + esc(key || 'value') + '</div>' +
    '<pre class="tokens-detail-kv__value">' + esc(primitiveText(value)) + '</pre>' +
  '</div>';
}

function renderJsonTree(value, path = '', depth = 0) {
  if (value == null || typeof value !== 'object') return renderJsonLeaf(path || 'value', value, path);
  const keys = Array.isArray(value) ? value.map((_, index) => String(index)) : visibleKeys(value);
  if (!keys.length) return '<div class="tokens-detail-empty">' + esc(tr('common.empty', '空')) + '</div>';
  return keys.map(key => {
    const child = value[key];
    const childPath = path ? path + '.' + key : key;
    if (child && typeof child === 'object') {
      const count = Array.isArray(child) ? child.length : visibleKeys(child).length;
      const open = depth < 2 ? ' open' : '';
      return '<details class="tokens-detail-kv__nest"' + open + '>' +
        '<summary><span>' + esc(key) + '</span><i>' + esc(String(count)) + '</i></summary>' +
        '<div class="tokens-detail-kv__children">' + renderJsonTree(child, childPath, depth + 1) + '</div>' +
      '</details>';
    }
    return renderJsonLeaf(key, child, childPath);
  }).join('');
}

function renderFieldGrid(detail) {
  const token = detail && detail.token || {};
  const fields = [
    ['en', token.en],
    ['cn', token.cn],
    ['name', token.name],
    ['id', token.id],
    ['strength', token.strength],
    ['color', token.color]
  ].filter(([, value]) => value !== undefined && value !== null && String(value) !== '');

  if (!fields.length) return '<div class="tokens-detail-empty">' + esc(tr('common.empty', '空')) + '</div>';

  return '<div class="tokens-detail-fields">' + fields.map(([label, value]) =>
    '<div class="tokens-detail-field">' +
      '<span>' + esc(label) + '</span>' +
      '<strong>' + esc(primitiveText(value)) + '</strong>' +
    '</div>'
  ).join('') + '</div>';
}

function rawProgramSource(match) {
  if (!match || typeof match !== 'object') return '';
  if (Array.isArray(match.nodes)) return renderProgramTreeNodes(match.nodes, []);
  if (match.node && typeof match.node === 'object') return renderProgramTreeNodes([match.node], []);
  const keys = ['html', 'sourceHtml', 'source', 'markup'];
  for (const key of keys) {
    if (typeof match[key] === 'string' && match[key].trim()) return match[key];
  }
  return '';
}

function renderProgramMatch(match, index) {
  const source = rawProgramSource(match);
  const title = tr('tokens.detail.programMatch', '程序页词条 {n}', { n: index + 1 });
  const terms = Array.isArray(match && match.terms) ? match.terms.join(' / ') : '';
  return '<article class="tokens-detail-program">' +
    '<div class="tokens-detail-program__head">' +
      '<h4>' + esc(title) + '</h4>' +
      (terms ? '<span>' + esc(terms) + '</span>' : '') +
    '</div>' +
    '<div class="tokens-detail-program__preview" data-dynamic-html-scope>' + source + '</div>' +
    '<details class="tokens-detail-source">' +
      '<summary>' + esc(tr('tokens.detail.source', 'HTML 源')) + '</summary>' +
      '<pre class="scrollbar-thin">' + esc(source) + '</pre>' +
    '</details>' +
  '</article>';
}

function renderRelated(detail) {
  const related = detail && detail.related;
  const semantic = detail && detail.semantic || {};
  if (!related) return '';
  if (semantic.targetType !== 'term') {
    return '<section class="tokens-detail-section tokens-detail-section--related">' +
      '<div class="tokens-detail-section__head"><h3>' + esc(tr('tokens.detail.related', '关联内容')) + '</h3></div>' +
      '<div class="tokens-detail-note">' + esc(tr('tokens.detail.locatorOnly', '该类型当前展示语义定位，展开内容由对应页面逻辑处理。')) + '</div>' +
    '</section>';
  }
  const matches = Array.isArray(related.matches) ? related.matches : [];
  let note = '';
  if (related.status === 'conflict') note = tr('tokens.detail.programConflict', '找到多个程序页词条，请检查语义 key 是否重复。');
  else if (related.status === 'none') note = tr('tokens.detail.programNone', '没有找到对应的程序页词条。');
  else if (related.status === 'missing-panel') note = tr('tokens.detail.programMissing', '程序页数据未加载。');
  return '<section class="tokens-detail-section tokens-detail-section--related">' +
    '<div class="tokens-detail-section__head">' +
      '<h3>' + esc(tr('tokens.detail.programContent', '程序页展开内容')) + '</h3>' +
      (related.key ? renderMetaChip(tr('tokens.detail.semanticKey', '语义 key'), related.key) : '') +
    '</div>' +
    (note ? '<div class="tokens-detail-note' + (related.status === 'conflict' ? ' is-warning' : '') + '">' + esc(note) + '</div>' : '') +
    (matches.length ? '<div class="tokens-detail-program-list">' + matches.map(renderProgramMatch).join('') + '</div>' : '') +
  '</section>';
}

function logTime(log) {
  const raw = log && (log.createdAt || log.ts || log.time);
  if (!raw) return '';
  try { return new Date(raw).toLocaleString(); } catch (_) { return String(raw); }
}

function logBadge(log) {
  const type = log && log.type || '';
  const key = type === 'create' ? 'tokens.log.create'
    : type === 'delete-doc' ? 'tokens.log.deleteDoc'
    : type === 'delete-field' ? 'tokens.log.deleteField'
    : type === 'save-edits' ? 'tokens.edit.submit'
    : 'tokens.log.update';
  return tr(key, type || 'log');
}

function renderLogValue(label, value) {
  if (value === undefined) return '';
  return '<div class="tokens-detail-log__value">' +
    '<span>' + esc(label) + '</span>' +
    '<pre>' + esc(primitiveText(value)) + '</pre>' +
  '</div>';
}

function renderLog(log) {
  const path = log && log.path ? String(log.path) : '';
  const user = log && log.username ? String(log.username) : '';
  const afterValue = log && (log.value !== undefined ? log.value : log.to);
  return '<article class="tokens-detail-log">' +
    '<div class="tokens-detail-log__head">' +
      '<span class="tokens-detail-log__badge">' + esc(logBadge(log)) + '</span>' +
      (logTime(log) ? '<time>' + esc(logTime(log)) + '</time>' : '') +
      (user ? '<i>' + esc(user) + '</i>' : '') +
    '</div>' +
    (path ? '<code class="tokens-detail-log__path">' + esc(path) + '</code>' : '') +
    '<div class="tokens-detail-log__diff">' +
      renderLogValue(tr('tokens.detail.before', '修改前'), log && log.from) +
      renderLogValue(tr('tokens.detail.after', '修改后'), afterValue) +
    '</div>' +
  '</article>';
}

function renderLogs(titleKey, fallback, list) {
  const logs = Array.isArray(list) ? list : [];
  return '<section class="tokens-detail-section">' +
    '<div class="tokens-detail-section__head"><h3>' + esc(tr(titleKey, fallback)) + '</h3><span>' + logs.length + '</span></div>' +
    (logs.length
      ? '<div class="tokens-detail-logs">' + logs.map(renderLog).join('') + '</div>'
      : '<div class="tokens-detail-empty">' + esc(tr('tokens.detail.noLogs', '暂无记录')) + '</div>') +
  '</section>';
}

function renderSemantic(detail) {
  const semantic = detail.semantic || {};
  const peers = Array.isArray(semantic.peers) ? semantic.peers : [];
  const conflict = semantic.targetType === 'term' && peers.length > 1;
  return '<section class="tokens-detail-summary">' +
    renderMetaChip(tr('tokens.detail.collection', '类型'), collectionName(detail.collection)) +
    renderMetaChip(tr('tokens.detail.semanticType', '语义类型'), semantic.targetType || '-') +
    renderMetaChip(tr('tokens.detail.semanticKey', '语义 key'), semantic.key || '-') +
    renderMetaChip('ID', shortId(detail.id)) +
    (conflict ? '<div class="tokens-detail-summary__wide tokens-detail-note is-warning">' + esc(tr('tokens.detail.semanticConflict', '同一语义 key 对应多个词元。')) + '</div>' : '') +
  '</section>';
}

function renderPeers(detail) {
  const peers = Array.isArray(detail?.semantic?.peers) ? detail.semantic.peers : [];
  return '<section class="tokens-detail-section">' +
    '<div class="tokens-detail-section__head"><h3>' + esc(tr('tokens.detail.sameSemantic', '同语义词元')) + '</h3><span>' + peers.length + '</span></div>' +
    (peers.length ? '<div class="tokens-detail-peers">' + peers.map(peer => {
      const current = peer.current ? ' is-current' : '';
      const extra = peer.strength != null ? ' · S' + peer.strength : '';
      const attrs = peer.current ? ' disabled aria-current="true"' : '';
      const tokenHtml = renderTokenInline(detailFromPeer(peer, detail), 'tokens-detail-peer__token');
      return '<button type="button" class="tokens-detail-peer' + current + '" data-token-detail-peer data-collection="' + esc(peer.collection || '') + '" data-id="' + esc(peer.id || '') + '"' + attrs + '>' +
        '<strong>' + tokenHtml + '</strong>' +
        '<span>' + esc(collectionName(peer.collection) + extra) + '</span>' +
        (peer.current ? '<em>' + esc(tr('tokens.detail.currentToken', '当前词元')) + '</em>' : '') +
      '</button>';
    }).join('') + '</div>' : '<div class="tokens-detail-empty">' + esc(tr('tokens.detail.noPeers', '暂无同语义词元')) + '</div>') +
  '</section>';
}

function renderDetailTab(id, key, fallback, active, hintKey, hintFallback, count) {
  return '<button type="button" class="tokens-detail-tab' + (active ? ' is-active' : '') + '" data-token-detail-tab="' + esc(id) + '" aria-selected="' + (active ? 'true' : 'false') + '">' +
    '<span class="tokens-detail-tab__label">' + esc(tr(key, fallback)) + '</span>' +
    '<span class="tokens-detail-tab__hint">' + esc(tr(hintKey, hintFallback)) + '</span>' +
    (count != null ? '<span class="tokens-detail-tab__count">' + esc(String(count)) + '</span>' : '') +
  '</button>';
}

function renderDetailPane(id, content, active) {
  return '<section class="tokens-detail-pane' + (active ? ' is-active' : '') + '" data-token-detail-pane="' + esc(id) + '"' + (active ? '' : ' hidden') + '>' +
    content +
  '</section>';
}

function renderDocumentPane(detail) {
  return '<section class="tokens-detail-section tokens-detail-section--document">' +
    '<div class="tokens-detail-section__head"><h3>' + esc(tr('tokens.detail.document', '词元数据')) + '</h3><span>' + esc(shortId(detail.id)) + '</span></div>' +
    '<div class="tokens-detail-document">' +
      renderFieldGrid(detail) +
      '<div class="tokens-detail-raw">' +
        '<div class="tokens-detail-raw__title">' + esc(tr('tokens.detail.fullDocument', '完整数据库文档')) + '</div>' +
        '<div class="tokens-detail-kv">' + renderJsonTree(detail.token || {}) + '</div>' +
      '</div>' +
    '</div>' +
  '</section>';
}

function renderLogsPane(detail) {
  return '<div class="tokens-detail-log-columns">' +
    renderLogs('tokens.detail.tokenLogs', '词元改动记录', detail.logs && detail.logs.token) +
    renderLogs('tokens.detail.relatedLogs', '关联内容改动记录', detail.logs && detail.logs.related) +
  '</div>';
}

function countRelated(detail) {
  const related = detail && detail.related;
  return Array.isArray(related && related.matches) ? related.matches.length : 0;
}

function countLogs(detail) {
  const tokenLogs = Array.isArray(detail?.logs?.token) ? detail.logs.token.length : 0;
  const relatedLogs = Array.isArray(detail?.logs?.related) ? detail.logs.related.length : 0;
  return tokenLogs + relatedLogs;
}

function renderDetail(detail, options = {}) {
  const includeSummary = options.includeSummary === true;
  const peers = Array.isArray(detail?.semantic?.peers) ? detail.semantic.peers.length : 0;
  return '<div class="tokens-detail">' +
    (includeSummary ? '<div class="tokens-detail__overview">' + renderSemantic(detail) + '</div>' : '') +
    '<aside class="tokens-detail__rail">' +
      '<div class="tokens-detail-tabs" role="tablist">' +
        renderDetailTab('document', 'tokens.detail.tabDocument', '词元数据', true, 'tokens.detail.tabDocumentHint', '数据库字段', visibleKeys(detail.token || {}).length) +
        renderDetailTab('related', 'tokens.detail.tabRelated', '关联内容', false, 'tokens.detail.tabRelatedHint', '页面展开', countRelated(detail)) +
        renderDetailTab('logs', 'tokens.detail.tabLogs', '改动记录', false, 'tokens.detail.tabLogsHint', '词元与内容', countLogs(detail)) +
        renderDetailTab('peers', 'tokens.detail.tabPeers', '同语义词元', false, 'tokens.detail.tabPeersHint', '语义关联', peers) +
      '</div>' +
      '<button type="button" class="btn btn--secondary btn--sm tokens-detail__goto" data-token-detail-goto>' + esc(tr('tokens.detail.goto', '跳转位置')) + '</button>' +
    '</aside>' +
    '<div class="tokens-detail__panes">' +
      renderDetailPane('document', renderDocumentPane(detail), true) +
      renderDetailPane('related', renderRelated(detail), false) +
      renderDetailPane('logs', renderLogsPane(detail), false) +
      renderDetailPane('peers', renderPeers(detail), false) +
    '</div>' +
  '</div>';
}

function applyLocator(locator, opts) {
  if (!locator) return false;
  const actions = window.scrollActions;
  if (!actions) return false;
  const scrollOpts = Object.assign({ behavior: 'smooth', stop: true }, opts || {});
  if (locator.method === 'tag') actions.scrollToTagAndFlash?.(locator.panelId, locator.key, scrollOpts);
  else if (locator.method === 'selector') actions.scrollToSelectorAndFlash?.(locator.panelId, locator.selector, scrollOpts);
  else if (locator.method === 'class') actions.scrollToClassAndFlash?.(locator.panelId, locator.className, scrollOpts);
  else if (locator.method === 'classWithCenter') actions.scrollToClassWithCenter?.(locator.panelId, locator.className, locator.centerSelector, scrollOpts);
  else return false;
  return true;
}

function buildLocatorUrl(locator) {
  const encoded = encodeURIComponent(JSON.stringify(locator || {}));
  return 'index.html?tokenLocator=' + encoded;
}

function openLocator(locator, options = {}) {
  if (!locator) return false;
  if (options.tryLocal !== false && applyLocator(locator, options.scrollOptions)) return true;
  const url = buildLocatorUrl(locator);
  if (options.newTab) {
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url;
  } else {
    window.location.href = url;
  }
  return true;
}

function buildTokenDetailUrl(collection, id, options = {}) {
  const q = new URLSearchParams();
  q.set('collection', String(collection || ''));
  q.set('id', String(id || ''));
  const sourcePanel = String(options.sourcePanel || options.panelId || '');
  if (/^panel_[A-Za-z0-9_-]+$/.test(sourcePanel)) q.set('sourcePanel', sourcePanel);
  return 'token_detail.html?' + q.toString();
}

Object.assign(T, {
  renderTokenDetail: renderDetail,
  renderTokenDetailInline: renderTokenInline,
  buildTokenDetailUrl,
  openTokenDetailLocator: openLocator,
  applyTokenDetailLocator: applyLocator,
  buildTokenDetailLocatorUrl: buildLocatorUrl
});

export {
  renderDetail,
  renderTokenInline,
  labelOf,
  semanticLine,
  collectionName,
  shortId,
  buildTokenDetailUrl,
  applyLocator,
  openLocator,
  buildLocatorUrl
};
