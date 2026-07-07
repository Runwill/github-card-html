// 上下文帮助面板：按 ? 或从设置菜单打开，显示当前面板相关提示
import { elem as node } from '../admin/log_utils.js?v=202607072241';

  let data = null;
  let popoverEl = null;
  let visible = false;

  // Panel ID → nav i18n key
  const PANEL_NAV_KEY = {
    panel_term: 'nav.term',
    panel_skill: 'nav.skill',
    panel_card: 'nav.card',
    panel_character: 'nav.character',
    panel_draft: 'nav.draft',
    panel_tokens: 'nav.tokens',
    token_detail: 'tokens.detail.title',
    panel_permissions: 'nav.permissions',
    panel_game: 'nav.game'
  };

  // Overlay ID → i18n title key
  const OVERLAY_TITLE_KEY = {
    'sidebar-menu': 'help.overlay.sidebar',
    'account-menu': 'help.overlay.account',
    'settings-menu': 'help.overlay.settings',
    'key-settings-modal': 'help.overlay.keySettings',
    'game-settings-modal': 'help.overlay.gameSettings',
    'update-account-modal': 'help.overlay.password',
    'approve-user-modal': 'help.overlay.approve',
    'avatar-modal': 'help.overlay.avatar',
    'avatar-crop-modal': 'help.overlay.crop',
    'account-info-modal': 'help.overlay.accountInfo',
    'announcements-modal': 'help.overlay.announcements'
  };

  // 面板子视图 → i18n key
  const PANEL_VIEW_LABEL = {
    panel_term: {
      normal: 'help.term.viewRead',
      debug: 'help.term.viewDebug'
    },
    token_detail: {
      document: 'tokens.detail.tabDocument',
      related: 'tokens.detail.tabRelated',
      logs: 'tokens.detail.tabLogs',
      peers: 'tokens.detail.tabPeers'
    },
    panel_draft: {
      editor: 'editor.view.editor',
      relations: 'editor.view.relations'
    },
    panel_game: {
      setup: 'help.game.viewSetup',
      online: 'help.game.viewOnline',
      play: 'help.game.viewPlay'
    }
  };

  function getGameView() {
    try { return window.Game.UI.getCurrentView(); } catch (_) { return 'none'; }
  }

  function getDraftView() {
    var page = document.querySelector('#panel_draft .draft-page');
    return page && page.dataset.editorView === 'relations' ? 'relations' : 'editor';
  }

  function getProgramView() {
    try { return window.ProgramPanelDebug?.isOpen?.() ? 'debug' : 'normal'; } catch (_) { return 'normal'; }
  }

  function getTokenDetailView() {
    var tab = document.querySelector('.tokens-detail-tab.is-active[data-token-detail-tab]');
    return tab ? tab.getAttribute('data-token-detail-tab') : 'document';
  }

  function getPanelView(panelId) {
    if (panelId === 'token_detail') return getTokenDetailView();
    if (panelId === 'panel_term') return getProgramView();
    if (panelId === 'panel_game') return getGameView();
    if (panelId === 'panel_draft') return getDraftView();
    return null;
  }

  // ── 当前上下文检测（overlay 优先于面板） ──
  function getActiveContext() {
    try {
      var overlay = window.CardUI.Manager.Controllers.overlay;
      if (overlay && overlay.isAnyOpen()) {
        var id = overlay.current();
        if (id) return { type: 'overlay', id: id };
      }
    } catch (_) {}
    return { type: 'panel', id: getActivePanel() };
  }

  // ── 数据加载 ──
  async function loadData() {
    if (data) return data;
    try {
      if (window.AppPreload && typeof window.AppPreload.json === 'function') {
        data = await window.AppPreload.json('base/help.json', { cache: 'no-cache' });
      } else {
        const resp = await fetch('base/help.json', { cache: 'no-cache' });
        data = await resp.json();
      }
    } catch (e) {
      console.warn('[Help] Failed to load help.json', e);
      data = { global: [], panels: {} };
    }
    return data;
  }

  // ── 当前面板检测 ──
  function getActivePanel() {
    if (document.documentElement.classList.contains('token-detail-root') || document.body.classList.contains('token-detail-page')) {
      return 'token_detail';
    }
    return window.TabsUI?.getActivePanelId?.('panel_term') || 'panel_term';
  }

  function globalTipsForContext(ctx) {
    var tips = data.global || [];
    if (ctx && ctx.type === 'panel' && ctx.id === 'token_detail') {
      return tips.filter(function (tip) {
        return tip.desc !== 'help.nav.scroll' && tip.desc !== 'help.nav.sidebar';
      });
    }
    return tips;
  }

  // ── DOM 创建 ──
  function ensurePopover() {
    if (popoverEl) return popoverEl;

    popoverEl = document.createElement('div');
    popoverEl.id = 'help-popover';
    popoverEl.className = 'help-popover';
    popoverEl.innerHTML =
      '<div class="help-popover__header">' +
        '<span class="help-popover__title"></span>' +
        '<button class="help-popover__close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="help-popover__body scrollbar-thin"></div>' +
      '<div class="help-popover__hint"></div>';
    document.body.appendChild(popoverEl);

    popoverEl.querySelector('.help-popover__close').addEventListener('click', function () {
      hideHelp();
    });

    return popoverEl;
  }

  // ── 渲染 ──
  function renderContent(ctx) {
    var t = window.i18n ? window.i18n.t.bind(window.i18n) : function (k) { return k; };
    var el = ensurePopover();

    var body = el.querySelector('.help-popover__body');
    body.innerHTML = '';

    var title, panelTips;

    if (ctx.type === 'overlay') {
      // ── Overlay / 弹窗 ──
      var titleKey = OVERLAY_TITLE_KEY[ctx.id];
      title = titleKey ? t(titleKey) : ctx.id;
      panelTips = (data.overlays && data.overlays[ctx.id]) || [];
    } else {
      // ── 面板 ──
      var panelId = ctx.id;
      var navKey = PANEL_NAV_KEY[panelId] || 'nav.term';
      title = t(navKey);
      var panelView = getPanelView(panelId);
      if (panelView) {
        var labelKey = PANEL_VIEW_LABEL[panelId] && PANEL_VIEW_LABEL[panelId][panelView];
        if (labelKey) title += ' · ' + t(labelKey);
      }

      var panelData = data.panels && data.panels[panelId];
      if (panelData && !Array.isArray(panelData)) {
        panelTips = (panelData[panelView] || []).concat(panelData.common || []);
      } else {
        panelTips = panelData || [];
      }
    }

    el.querySelector('.help-popover__title').textContent = title + ' — ' + t('sidebar.help');

    for (var i = 0; i < panelTips.length; i++) {
      body.appendChild(renderRow(panelTips[i], t));
    }

    // Separator + global tips
    var globalTips = globalTipsForContext(ctx);
    if (globalTips.length > 0) {
      body.appendChild(node('div', 'help-popover__separator', t('help.global')));
      for (var j = 0; j < globalTips.length; j++) {
        body.appendChild(renderRow(globalTips[j], t));
      }
    }

    if (panelTips.length === 0 && globalTips.length === 0) {
      body.appendChild(node('div', 'help-popover__empty', t('help.empty')));
    }

    // Hint
    el.querySelector('.help-popover__hint').textContent = t('help.hint');
  }

  function getActionKeyText(action) {
    var settings = window.KeySettings;
    if (settings && typeof settings.getBindingText === 'function') return settings.getBindingText(action);
    return action;
  }

  function tipKeys(tip) {
    var keys = (Array.isArray(tip.actions) ? tip.actions.map(getActionKeyText) : [])
      .concat(Array.isArray(tip.keys) ? tip.keys : []);
    return keys.length ? keys : [''];
  }

  function renderRow(tip, t) {
    var row = node('div', 'help-row');

    var keysEl = node('span', 'help-keys');
    var keys = tipKeys(tip);
    for (var i = 0; i < keys.length; i++) {
      keysEl.appendChild(node('kbd', '', keys[i]));
    }

    var descEl = node('span', 'help-desc', t(tip.desc));

    row.appendChild(keysEl);
    row.appendChild(descEl);
    return row;
  }

  // ── 显示 / 隐藏 ──
  async function showHelp() {
    await loadData();
    renderContent(getActiveContext());
    ensurePopover().classList.add('is-visible');
    visible = true;
  }

  function hideHelp() {
    if (!popoverEl) return;
    popoverEl.classList.remove('is-visible');
    visible = false;
  }

  function toggleHelp() {
    if (visible) hideHelp(); else showHelp();
  }

  whenReady(()=>{
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.target.isContentEditable) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggleHelp();
      }
      if (e.key === 'Escape' && visible) {
        hideHelp();
      }
    });

    // Tab 切换时静默更新内容（不关闭）
    var mainTabs = document.getElementById('main-tabs');
    if (mainTabs && typeof jQuery !== 'undefined') {
      jQuery(mainTabs).on('change.zf.tabs', function () {
        if (visible) {
          renderContent(getActiveContext());
        }
      });
    }

    // Overlay 打开/关闭时更新帮助内容
    document.addEventListener('click', function () {
      if (!visible) return;
      // 等待 overlay 栈变化后再渲染
      setTimeout(function () { renderContent(getActiveContext()); }, 80);
    }, true);

    window.addEventListener('keybindings-changed', function () {
      if (visible) renderContent(getActiveContext());
    });
    window.addEventListener('program-debug:changed', function () {
      if (visible) renderContent(getActiveContext());
    });
    window.addEventListener('token-detail:tab-changed', function () {
      if (visible) renderContent(getActiveContext());
    });
    window.addEventListener('i18n:changed', function () {
      if (visible) renderContent(getActiveContext());
    });
  });

  window.openHelpPanel = toggleHelp;
  window.preloadHelpPanel = loadData;
