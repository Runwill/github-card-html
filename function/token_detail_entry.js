import './ui/theme.js?v=202607072241';
import './ui/color_utils.js?v=202607072241';
import './state/term_status.js?v=202607072241';
import '../i18n/strings.js?v=202607072241';
import './admin/tokens/i18n/strings.js?v=202607072241';
import './i18n/i18n.js?v=202607072241';
import './api/endpoints.js?v=202607072241';
import './auth/login_check.js?v=202607072241';
import './ui/theme_toggle_button.js?v=202607072241';
import './ui/lang_toggle_button.js?v=202607072241';
import './ui/key_bindings.js?v=202607072241';
import './ui/help_panel.js?v=202607072241';
import './admin/tokens/state.js?v=202607072241';
import './admin/tokens/utils.js?v=202607072241';
import './admin/tokens/api.js?v=202607072241';
import './animation/highlight.js?v=202607072241';
import './button/utils.js?v=202607072241';
import './button/hide.js?v=202607072241';
import './button/replace.js?v=202607072241';
import './button/wave.js?v=202607072241';
import './replace/utils.js?v=202607072241';
import './replace/replace_common.js?v=202607072241';
import './replace/decompress.js?v=202607072241';
import './replace/character_name.js?v=202607072241';
import './replace/skill_name.js?v=202607072241';
import './replace/term.js?v=202607072241';
import './replace/card_name.js?v=202607072241';
import './ui/tooltip.js?v=202607072241';
import './ui/event_bindings.js?v=202607072241';
import {
  renderDetail,
  renderTokenInline,
  labelOf,
  semanticLine,
  collectionName,
  buildLocatorUrl,
  buildTokenDetailUrl
} from './admin/tokens/ui/detail.js?v=202607072241';

const T = window.tokensAdmin;
let currentDetail = null;
const TOKEN_DETAIL_CHANNEL = 'card-html-token-detail';
const RETURN_ACK_TIMEOUT = 1600;
let returnRequestSeq = 0;

function tr(key, fallback, params) {
  try { return window.t ? window.t(key, params) : fallback; } catch (_) { return fallback; }
}

function qs(selector) {
  return document.querySelector(selector);
}

function setStatus(text, type) {
  const el = qs('#token-detail-status');
  if (!el) return;
  el.textContent = text || '';
  el.hidden = !text;
  el.className = 'token-detail-status' + (type ? ' is-' + type : '');
}

function updateHeader(detail) {
  const title = qs('#token-detail-title');
  const subtitle = qs('#token-detail-subtitle');
  const meta = qs('#token-detail-meta');
  const shell = qs('.token-detail-page__shell');
  const label = labelOf(detail);
  const semantic = detail?.semantic || {};
  const token = detail?.token || {};
  if (title) {
    title.removeAttribute('data-i18n');
    title.innerHTML = renderTokenInline(detail);
  }
  if (subtitle) subtitle.textContent = semanticLine(detail);
  if (shell) {
    const accent = typeof token.color === 'string' && token.color.trim() ? token.color.trim() : '';
    if (accent) shell.style.setProperty('--token-detail-accent', accent);
    else shell.style.removeProperty('--token-detail-accent');
  }
  if (meta) {
    meta.innerHTML = [
      ['tokens.detail.collection', '类型', collectionName(detail.collection)],
      ['tokens.detail.semanticType', '语义类型', semantic.targetType || '-'],
      ['tokens.detail.semanticKey', '语义 key', semantic.key || '-'],
      ['ID', 'ID', detail.id || '-']
    ].map(([key, fallback, value]) => {
      const labelText = key === 'ID' ? 'ID' : tr(key, fallback);
      return '<div class="token-detail-meta__item"><span>' +
        T.esc(labelText) + '</span><strong>' + T.esc(value) + '</strong></div>';
    }).join('');
  }
  document.title = tr('tokens.detail.pageTitle', '词元详情：{name}', { name: label });
}

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const sourcePanel = params.get('sourcePanel') || '';
  return {
    collection: params.get('collection') || '',
    id: params.get('id') || '',
    sourcePanel: /^panel_[A-Za-z0-9_-]+$/.test(sourcePanel) ? sourcePanel : ''
  };
}

function messageTargetOrigin() {
  try {
    return window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
  } catch (_) {
    return '*';
  }
}

function nextReturnRequestId() {
  return Date.now().toString(36) + '-' + (++returnRequestSeq).toString(36);
}

function isReturnAck(data, requestId) {
  return data &&
    data.source === TOKEN_DETAIL_CHANNEL &&
    data.type === 'return-ack' &&
    data.requestId === requestId;
}

function waitForReturnAck(requestId, channel) {
  return new Promise(resolve => {
    let done = false;
    let timer = null;
    const finish = value => {
      if (done) return;
      done = true;
      try { window.removeEventListener('message', onMessage); } catch (_) {}
      try { if (channel) channel.close(); } catch (_) {}
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    const onMessage = ev => {
      try {
        if (ev.origin && ev.origin !== 'null' && ev.origin !== window.location.origin) return;
      } catch (_) {}
      if (isReturnAck(ev.data, requestId)) finish(ev.data);
    };
    window.addEventListener('message', onMessage);
    if (channel) {
      channel.onmessage = ev => {
        if (isReturnAck(ev.data, requestId)) finish(ev.data);
      };
    }
    timer = setTimeout(() => finish(null), RETURN_ACK_TIMEOUT);
  });
}

function openReturnChannel() {
  try {
    if ('BroadcastChannel' in window) return new BroadcastChannel(TOKEN_DETAIL_CHANNEL);
  } catch (_) {}
  return null;
}

function postReturnMessage(payload, channel) {
  let sent = false;
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, messageTargetOrigin());
      return true;
    }
  } catch (_) {}
  try {
    if (channel) {
      channel.postMessage(payload);
      sent = true;
    }
  } catch (_) {}
  return sent;
}

function canHistoryBackToSource() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    return !!(ref && ref.origin === window.location.origin && /(?:^|\/)index\.html$|\/$/.test(ref.pathname) && window.history.length > 1);
  } catch (_) {}
  return false;
}

function fallbackToSource() {
  const { sourcePanel } = parseParams();
  if (canHistoryBackToSource()) {
    window.history.back();
    return;
  }
  window.location.href = 'index.html?openPanel=' + encodeURIComponent(sourcePanel || 'panel_tokens');
}

function closeAfterAck() {
  try { window.close(); } catch (_) {}
}

function sendReturnRequest(payload, fallback) {
  const requestId = nextReturnRequestId();
  const channel = openReturnChannel();
  const data = Object.assign({ source: TOKEN_DETAIL_CHANNEL, requestId }, payload || {});
  const ack = waitForReturnAck(requestId, channel);
  const sent = postReturnMessage(data, channel);
  if (!sent) {
    try { if (channel) channel.close(); } catch (_) {}
    fallback();
    return;
  }
  ack.then(received => {
    if (received) {
      closeAfterAck();
      return;
    }
    fallback();
  });
}

function focusOpenerAndClose() {
  try {
    if (!window.opener || window.opener.closed) return false;
    window.opener.focus();
    closeAfterAck();
    return true;
  } catch (_) {
    return false;
  }
}

function returnToSource() {
  if (focusOpenerAndClose()) return;
  if (canHistoryBackToSource()) {
    fallbackToSource();
    return;
  }
  sendReturnRequest({ type: 'source' }, fallbackToSource);
}

function returnToTokens() {
  returnToSource();
}

function returnToLocator(locator) {
  sendReturnRequest({ type: 'locator', locator }, () => { window.location.href = buildLocatorUrl(locator); });
}

function routeToMainLocator(locator) {
  if (!locator) return false;
  returnToLocator(locator);
  return true;
}

function installDetailBridges() {
  window.scrollActions = Object.assign(window.scrollActions || {}, {
    scrollToSelectorAndFlash(panelId, selector) {
      return routeToMainLocator({ method: 'selector', panelId, selector });
    },
    scrollToClassAndFlash(panelId, className) {
      return routeToMainLocator({ method: 'class', panelId, className });
    },
    scrollToTagAndFlash(panelId, key) {
      return routeToMainLocator({ method: 'tag', panelId, key });
    },
    scrollToClassWithCenter(panelId, className, centerSelector) {
      return routeToMainLocator({ method: 'classWithCenter', panelId, className, centerSelector });
    },
    applyTokenLocator(locator) {
      return routeToMainLocator(locator);
    },
    cancel() {}
  });
  window.TokenDetailPage = Object.assign(window.TokenDetailPage || {}, {
    returnToLocator,
    returnToSource,
    returnToTokens
  });
}

function applyPreviewReplacements(root) {
  if (!root) return;
  try { window.decompress?.('base/compression.json', root); } catch (_) {}
  try { mirrorProgramPreviewScrollMarkers(root); } catch (_) {}
  try { window.runTextReplacers?.(root); } catch (_) {}
  try { window.syncTermPanelButtonStates?.(); } catch (_) {}
  try { window.add_button_wave?.(); } catch (_) {}
}

function mirrorProgramPreviewScrollMarkers(root) {
  const previews = root.querySelectorAll?.('.tokens-detail-program__preview .scroll') || [];
  previews.forEach(marker => {
    const tag = marker.tagName ? marker.tagName.toLowerCase() : '';
    if (tag && tag !== 'div' && tag !== 'h1' && tag !== 'h2' && tag !== 'h3' && tag !== 'h4' && tag !== 'h5' && tag !== 'h6') return;
    Array.from(marker.children || []).forEach(child => {
      const childTag = child.tagName ? child.tagName.toLowerCase() : '';
      if (!childTag || ['span', 'div', 'button', 'a', 'em', 'strong', 'i', 'b'].includes(childTag)) return;
      child.classList.add('scroll');
    });
  });
}

function setActiveDetailTab(name) {
  const root = qs('#token-detail-content .tokens-detail');
  if (!root || !name) return;
  root.querySelectorAll('[data-token-detail-tab]').forEach(btn => {
    const active = btn.getAttribute('data-token-detail-tab') === name;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  root.querySelectorAll('[data-token-detail-pane]').forEach(pane => {
    const active = pane.getAttribute('data-token-detail-pane') === name;
    pane.classList.toggle('is-active', active);
    pane.hidden = !active;
    if (active) pane.scrollTop = 0;
  });
  try {
    window.dispatchEvent(new CustomEvent('token-detail:tab-changed', { detail: { tab: name } }));
  } catch (_) {}
}

function bindActions() {
  qs('#token-detail-back')?.addEventListener('click', () => {
    returnToSource();
  });
  qs('#token-detail-help')?.addEventListener('click', () => {
    window.openHelpPanel?.();
  });
  qs('#token-detail-content')?.addEventListener('click', ev => {
    const tab = ev.target && ev.target.closest ? ev.target.closest('[data-token-detail-tab]') : null;
    if (tab) {
      ev.preventDefault();
      setActiveDetailTab(tab.getAttribute('data-token-detail-tab'));
      return;
    }
    const peer = ev.target && ev.target.closest ? ev.target.closest('[data-token-detail-peer]') : null;
    if (peer) {
      ev.preventDefault();
      if (peer.disabled) return;
      const collection = peer.getAttribute('data-collection') || '';
      const id = peer.getAttribute('data-id') || '';
      if (collection && id) window.location.href = buildTokenDetailUrl(collection, id, { sourcePanel: parseParams().sourcePanel });
      return;
    }
    const btn = ev.target && ev.target.closest ? ev.target.closest('[data-token-detail-goto]') : null;
    if (!btn) return;
    ev.preventDefault();
    const locator = currentDetail?.semantic?.locator;
    if (!locator) {
      setStatus(tr('tokens.go.notFound', '未找到跳转目标'), 'error');
      return;
    }
    returnToLocator(locator);
  });
}

async function loadDetail() {
  const content = qs('#token-detail-content');
  const { collection, id } = parseParams();
  if (!content) return;
  if (!collection || !id) {
    setStatus(tr('tokens.detail.missingParams', '缺少词元详情参数'), 'error');
    content.innerHTML = '';
    return;
  }

  setStatus(tr('tokens.detail.loading', '详情加载中…'), 'loading');
  content.innerHTML = '';
  try {
    const detail = await T.fetchTokenDetail(collection, id);
    currentDetail = detail;
    updateHeader(detail);
    content.innerHTML = renderDetail(detail, { includeSummary: false });
    window.i18n?.applySafe?.(content);
    applyPreviewReplacements(qs('.token-detail-page__shell') || content);
    setActiveDetailTab('document');
    setStatus('', '');
  } catch (err) {
    const message = err?.message || tr('tokens.detail.loadFailed', '详情加载失败');
    setStatus(message, 'error');
    content.innerHTML = '<div class="tokens-detail-status is-error">' + T.esc(message) + '</div>';
  }
}

const ready = typeof window.whenReady === 'function'
  ? window.whenReady.bind(window)
  : (fn) => Promise.resolve().then(fn);

ready(() => {
  installDetailBridges();
  bindActions();
  loadDetail();
});
