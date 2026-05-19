// 用户名与个人简介的内联编辑及待审提示控制器。
// CardUI Manager Controllers - username & intro inline edit
(function(){
  'use strict';
  var w = window;
  var dom = w.CardUI.Manager.Core.dom;

  var $ = dom.$;
  var requestJson = w.endpoints && w.endpoints.requestJson;

  function currentUserId(){ return w.localStorage ? w.localStorage.getItem('id') : ''; }
  function setLocalValue(key, value){ if (w.localStorage) w.localStorage.setItem(key, value); }
  function currentUserIdOrAlert(){ var id = currentUserId(); if (!id) alert(t('error.noLoginSimple')); return id; }
  function clearPendingHtml(el){ collapsePending(el, function(){ el.innerHTML = ''; }); }

  function makeInlinePendingButton(id, text, handler) {
    var btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.onclick = handler;
    return btn;
  }

  // 共享 flash message 辅助
  function showFlash(type, text){
    var msgEl = $('account-info-message');
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'modal-message ' + (type || '');
    msgEl.classList.remove('msg-flash');
    void msgEl.offsetWidth;
    msgEl.classList.add('msg-flash');
    var onEnd = function(){ msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onEnd); };
    msgEl.addEventListener('animationend', onEnd);
  }

  // 通用保存辅助: fetch + 错误/busy 状态管理
  // state = { saveFailed, lastTried } 会被函数修改
  async function trySave(url, body, state, onOk) {
    try {
      var respJson = await requestJson(url, { method: 'POST', body: body, defaultMessage: t('error.updateFailed') });
      state.saveFailed = false;
      state.lastTried = '';
      await onOk(respJson);
    } catch(e) {
      if (e && e.status) { showFlash('error', e.message || t('error.updateFailed')); state.saveFailed = true; return; }
      console.error(e);
      showFlash('error', t('error.networkRetryLater'));
      state.saveFailed = true;
    }
  }

  // ── Smooth expand / collapse via .is-expanded class ──
  function expandPending(el) {
    if (!el || el.classList.contains('is-expanded')) return;
    el.classList.add('is-expanded');
  }
  function collapsePending(el, callback) {
    if (!el || !el.classList.contains('is-expanded')) { if (callback) callback(); return; }
    el.classList.remove('is-expanded');
    window.CollapsibleAnim.onTransitionEnd(el, callback, 400, function(e){ return e.target === el; });
  }

  function refreshUsernameUI(newName){
    var nameMainEl = $('account-info-username-main');
    var nameTextEl = $('account-info-username-text');
    if (nameMainEl) nameMainEl.textContent = newName || '';
    if (nameTextEl) nameTextEl.textContent = newName || '';
  }

  function setupIntroInlineEdit(){
    var introEl = $('account-info-intro');
    if (!introEl || introEl.tagName !== 'TEXTAREA') return;
    if (introEl.__profileInlineEditBound) return;
    introEl.__profileInlineEditBound = true;
    var original = introEl.value || '';
    var saving = false;
    var _introState = { saveFailed: false, lastTried: '' };
    var doSave = async function(){
      var id = currentUserIdOrAlert();
      if (!id) return;
      var newIntro = (introEl.value || '').trim();
      if (_introState.saveFailed && newIntro === _introState.lastTried) { try { introEl.focus(); } catch(_){ } return; }
      if (newIntro === original) { return; }
      if (newIntro.length > 500) { showFlash('error', t('error.introMax')); return; }
      saving = true;
      _introState.lastTried = newIntro;
      await trySave('/intro/change', { userId: id, newIntro: newIntro }, _introState, async function(respJson) {
        if (respJson && respJson.applied) {
          setLocalValue('intro', newIntro);
          original = newIntro; introEl.value = newIntro;
          showFlash('success', t('success.introUpdatedImmediate'));
          try { var wrap = $('account-info-intro-pending'); if (wrap) clearPendingHtml(wrap); } catch(_){ }
        } else {
          showFlash('success', t('success.introSubmitted'));
          introEl.value = original;
          await loadPendingIntroBadge();
        }
      });
      saving = false;
    };

    var onKeydown = function(ev){
      if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) { ev.preventDefault(); doSave(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); introEl.value = original; introEl.blur(); }
    };
    introEl.addEventListener('focus', function(){ original = introEl.value || ''; });
    introEl.addEventListener('keydown', onKeydown);
    introEl.addEventListener('blur', function(){ if (!saving) doSave(); });
  }

  async function loadPendingIntroBadge(){
    var container = $('account-info-intro-pending');
    if (!container) return;
    try {
      var id = currentUserId();
      if (!id) return;
      var data = await requestJson('/intro/pending/me?userId=' + encodeURIComponent(id));
      if (!(data && typeof data.newIntro === 'string')) {
        clearPendingHtml(container);
        return;
      }
      var full = (data.newIntro || '').replace(/\s+/g, ' ');
      var span = document.createElement('span');
      span.id = 'account-info-intro-pending-inline';
      span.textContent = t('account.info.pending') + full;
      var btn = makeInlinePendingButton('account-info-intro-cancel-inline', t('account.info.cancel'), cancelPendingIntroChange);
      container.replaceChildren(span, btn);
      expandPending(container);
    } catch(_){
      clearPendingHtml(container);
    }
  }

  async function cancelPendingChange(endpoint, reload) {
    try {
      var id = currentUserId();
      if (!id) return;
      await requestJson(endpoint, { method: 'POST', body: { userId: id }, defaultMessage: t('error.revokeFailed') });
      await reload();
    } catch(e){ alert(e && e.status ? (e.message || t('error.revokeFailed')) : t('error.networkRevokeFailed')); }
  }

  async function cancelPendingIntroChange(){ return cancelPendingChange('/intro/cancel', loadPendingIntroBadge); }

  function setupUsernameInlineEdit(){
    var nameEl = $('account-info-username-main'); if (!nameEl) return;
    if (nameEl.__profileInlineEditBound) return;
    nameEl.__profileInlineEditBound = true;
    try { nameEl.classList.add('is-editable'); } catch(_){ }
    var _isEditing = false; var _usernameState = { saveFailed: false, lastTried: '' }; var _saving = false;

    var startEdit = function(){
      if (_isEditing) return; _isEditing = true;
      var oldName = nameEl.textContent || '';
      nameEl.setAttribute('contenteditable', 'true'); nameEl.classList.add('is-editing');
      var sel = w.getSelection && w.getSelection(); var range = document.createRange(); range.selectNodeContents(nameEl); if (sel) { sel.removeAllRanges(); sel.addRange(range); } nameEl.focus();
      var cleanup = function(){ nameEl.removeAttribute('contenteditable'); nameEl.classList.remove('is-editing'); _isEditing = false; };

      var doSave = async function(){
        var newName = (nameEl.textContent || '').trim();
        if (_usernameState.saveFailed && newName === _usernameState.lastTried) { try { nameEl.focus(); } catch(_){ } return; }
        if (!newName || newName === oldName) { cleanup(); return; }
        
        var pendingTag = $('account-info-username-pending-inline');
        if (pendingTag && pendingTag.dataset.pendingName === newName) {
          showFlash('success', t('success.usernameSubmitted'));
          cleanup(); return;
        }

        if (newName.length > 12) {
          showFlash('error', t('error.usernameMax'));
          try { nameEl.focus(); } catch(_){ }
          return;
        }
        var id = currentUserIdOrAlert();
        if (!id) { cleanup(); return; }
        _saving = true;
        _usernameState.lastTried = newName;
        await trySave('/username/change', { userId: id, newUsername: newName }, _usernameState, async function(respJson) {
          if (respJson && respJson.applied) {
            setLocalValue('username', newName);
            refreshUsernameUI(newName);
            showFlash('success', t('success.usernameUpdatedImmediate'));
            try { var wrap = $('account-info-username-pending-wrap'); if (wrap) collapsePending(wrap, function(){ var t2 = $('account-info-username-pending-inline'); if (t2) t2.textContent = ''; }); } catch(_){ }
          } else {
            showFlash('success', t('success.usernameSubmitted'));
            nameEl.textContent = oldName;
            loadPendingUsernameBadge();
          }
        });
        _saving = false; cleanup();
      };
      var onKey = function(ev){ if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); doSave(); } else if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); } };
      var onBlur = function(){ if (!_saving) cleanup(); };
      nameEl.addEventListener('keydown', onKey);
      nameEl.addEventListener('blur', onBlur, { once: true });
      var onInput = function(){ if (_usernameState.saveFailed) { _usernameState.saveFailed = false; } };
      nameEl.addEventListener('input', onInput, { once: false });
    };

    nameEl.addEventListener('click', startEdit);
    nameEl.setAttribute('tabindex', '0');
    nameEl.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); startEdit(); } });
  }

  async function loadPendingUsernameBadge(){
    var wrap = $('account-info-username-pending-wrap');
    var tag = $('account-info-username-pending-inline');
    var cancelBtn = $('account-info-username-cancel-inline');
    if (!wrap || !tag) return;
    try {
      var id = currentUserId();
      if (!id) return;
      var data = await requestJson('/username/pending/me?userId=' + encodeURIComponent(id));
      if (data && data.newUsername) {
        // 填充内容
        tag.textContent = t('account.info.pending') + data.newUsername;
        tag.dataset.pendingName = data.newUsername;
        // 绑定撤回按钮（onclick 自然覆盖旧处理器，无需 cloneNode）
        if (cancelBtn) cancelBtn.onclick = function(){ cancelPendingUsernameChange(); };
        // 显示
        expandPending(wrap);
      } else {
        // 先动画收起，完成后清理文本
        collapsePending(wrap, function(){
          tag.textContent = '';
          delete tag.dataset.pendingName;
        });
      }
    } catch(_){ }
  }

  async function cancelPendingUsernameChange(){
    return cancelPendingChange('/username/cancel', loadPendingUsernameBadge);
  }

  w.CardUI.Manager.Controllers.profileInlineEdit = {
    refreshUsernameUI: refreshUsernameUI,
    setupIntroInlineEdit: setupIntroInlineEdit,
    loadPendingIntroBadge: loadPendingIntroBadge,
    cancelPendingIntroChange: cancelPendingIntroChange,
    setupUsernameInlineEdit: setupUsernameInlineEdit,
    loadPendingUsernameBadge: loadPendingUsernameBadge,
    cancelPendingUsernameChange: cancelPendingUsernameChange
  };
})();
