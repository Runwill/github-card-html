// 用户名与个人简介的内联编辑及待审提示控制器。
// CardUI Manager Controllers - username & intro inline edit
(function(){
  'use strict';
  var w = window;
  var dom = (w.CardUI.Manager.Core.dom) || {};
  var messages = (w.CardUI.Manager.Core.messages) || {};

  var $ = dom.$ || function(id){ return document.getElementById(id); };
  var api = dom.api || function(u){ return u; };

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
  async function trySave(el, url, body, state, onOk) {
    el.setAttribute('aria-busy', 'true');
    try {
      var resp = await fetch(api(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var respJson = await resp.clone().json().catch(function(){ return null; });
      if (!resp.ok) {
        var msg = t('error.updateFailed');
        try { var data = await resp.json(); msg = (data && (data.message || msg)); } catch(_){ }
        showFlash('error', msg);
        state.saveFailed = true;
        return;
      }
      state.saveFailed = false;
      state.lastTried = '';
      await onOk(respJson);
    } catch(e) {
      console.error(e);
      showFlash('error', t('error.networkRetryLater'));
      state.saveFailed = true;
    } finally {
      el.removeAttribute('aria-busy');
    }
  }

  // Animation helpers
  function animateShow(el, displayType) {
    if (!el) return;
    el.classList.remove('anim-fade-leave', 'anim-fade-leave-active');
    el.style.display = displayType || '';
    el.classList.add('anim-fade-enter');
    void el.offsetWidth; // reflow
    el.classList.add('anim-fade-enter-active');
    var onEnd = function() {
      el.classList.remove('anim-fade-enter', 'anim-fade-enter-active');
      el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd, { once: true });
  }

  function animateHide(el, callback) {
    if (!el || el.style.display === 'none') { if(callback) callback(); return; }
    el.classList.remove('anim-fade-enter', 'anim-fade-enter-active');
    el.classList.add('anim-fade-leave');
    void el.offsetWidth; // reflow
    el.classList.add('anim-fade-leave-active');
    var onEnd = function() {
      el.style.display = 'none';
      el.classList.remove('anim-fade-leave', 'anim-fade-leave-active');
      if (callback) callback();
    };
    el.addEventListener('transitionend', onEnd, { once: true });
    // Fallback if transition fails or element hidden
    setTimeout(function(){ if(el.style.display !== 'none') { el.style.display = 'none'; if(callback) callback(); } }, 250);
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
    var original = introEl.value || '';
    var saving = false;
    var _introState = { saveFailed: false, lastTried: '' };
    var doSave = async function(){
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) { alert(t('error.noLoginSimple')); return; }
      var newIntro = (introEl.value || '').trim();
      if (_introState.saveFailed && newIntro === _introState.lastTried) { try { introEl.focus(); } catch(_){ } return; }
      if (newIntro === original) { return; }
      if (newIntro.length > 500) { showFlash('error', t('error.introMax')); return; }
      saving = true;
      _introState.lastTried = newIntro;
      await trySave(introEl, '/api/intro/change', { userId: id, newIntro: newIntro }, _introState, async function(respJson) {
        if (respJson && respJson.applied) {
          if (w.localStorage) w.localStorage.setItem('intro', newIntro);
          original = newIntro; introEl.value = newIntro;
          showFlash('success', t('success.introUpdatedImmediate'));
          try { var wrap = document.getElementById('account-info-intro-pending'); if (wrap) animateHide(wrap, function(){ wrap.innerHTML = ''; }); } catch(_){ }
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
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var container = $('account-info-intro-pending'); if (!container) return;
      var resp = await fetch(api('/api/intro/pending/me?userId=' + encodeURIComponent(id)));
      if (!resp.ok) { animateHide(container); return; }
      var data = await resp.json();
      var show = !!(data && typeof data.newIntro === 'string');
      if (!show) { animateHide(container, function(){ container.innerHTML = ''; }); return; }
      var full = (data.newIntro || '').replace(/\s+/g, ' ');
      container.innerHTML = '';
      var span = document.createElement('span'); span.id = 'account-info-intro-pending-inline'; span.textContent = t('account.info.pending') + full; span.title = full;
      var btn = document.createElement('button'); btn.id = 'account-info-intro-cancel-inline'; btn.textContent = t('account.info.cancel'); btn.addEventListener('click', function(){ cancelPendingIntroChange(); });
      container.appendChild(span); container.appendChild(btn); 
      if (container.style.display === 'none') animateShow(container, 'flex');
    } catch(_){ var container2 = $('account-info-intro-pending'); if (container2) { animateHide(container2, function(){ container2.innerHTML = ''; }); } }
  }

  async function cancelPendingIntroChange(){
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var resp = await fetch(api('/api/intro/cancel'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
      if (!resp.ok) {
        try { var e = await resp.json(); alert(e && e.message ? e.message : t('error.revokeFailed')); } catch(_){ alert(t('error.revokeFailed')); }
        return;
      }
      await loadPendingIntroBadge();
    } catch(_){ alert(t('error.networkRevokeFailed')); }
  }

  function setupUsernameInlineEdit(){
    var nameEl = $('account-info-username-main'); if (!nameEl) return;
    try { nameEl.classList.add('is-editable'); } catch(_){ }
    var _isEditing = false; var _usernameState = { saveFailed: false, lastTried: '' }; var _saving = false;

    var startEdit = function(){
      if (_isEditing) return; _isEditing = true;
      var oldName = nameEl.textContent || '';
      nameEl.setAttribute('contenteditable', 'true'); nameEl.classList.add('is-editing'); nameEl.setAttribute('role', 'textbox'); nameEl.setAttribute('aria-label', t('account.info.editUsername'));
      var sel = w.getSelection && w.getSelection(); var range = document.createRange(); range.selectNodeContents(nameEl); if (sel) { sel.removeAllRanges(); sel.addRange(range); } nameEl.focus();
      var cleanup = function(){ nameEl.removeAttribute('contenteditable'); nameEl.classList.remove('is-editing'); nameEl.removeAttribute('role'); nameEl.removeAttribute('aria-label'); _isEditing = false; };

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
        var id = w.localStorage ? w.localStorage.getItem('id') : '';
        if (!id) { alert(t('error.noLoginSimple')); cleanup(); return; }
        _saving = true;
        _usernameState.lastTried = newName;
        await trySave(nameEl, '/api/username/change', { userId: id, newUsername: newName }, _usernameState, async function(respJson) {
          if (respJson && respJson.applied) {
            if (w.localStorage) w.localStorage.setItem('username', newName);
            refreshUsernameUI(newName);
            showFlash('success', t('success.usernameUpdatedImmediate'));
            try { var tag = $('account-info-username-pending-inline'); if (tag) animateHide(tag, function(){ tag.textContent = ''; }); var btn = $('account-info-username-cancel-inline'); if (btn) animateHide(btn); } catch(_){ }
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
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var tag = $('account-info-username-pending-inline');
      var cancelBtn = $('account-info-username-cancel-inline');
      var resp = await fetch(api('/api/username/pending/me?userId=' + encodeURIComponent(id)));
      if (!resp.ok) return;
      var data = await resp.json();
      var show = !!(data && data.newUsername);
      if (tag) {
        var prefix = t('account.info.pending');
        if (show) {
          tag.textContent = prefix + data.newUsername;
          tag.dataset.pendingName = data.newUsername;
          if (tag.style.display === 'none') animateShow(tag, 'inline');
        } else {
          delete tag.dataset.pendingName;
          animateHide(tag, function(){ tag.textContent = ''; });
        }
      }
      if (cancelBtn) {
        var newBtn = cancelBtn.cloneNode(true);
        // Preserve display state for animation continuity
        newBtn.style.display = cancelBtn.style.display;
        cancelBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', function(){ cancelPendingUsernameChange(); });
        
        if (show) {
          if (newBtn.style.display === 'none') animateShow(newBtn, 'inline-flex');
        } else {
          animateHide(newBtn);
        }
      }
    } catch(_){ }
  }

  async function cancelPendingUsernameChange(){
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var resp = await fetch(api('/api/username/cancel'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) });
      if (!resp.ok) { try { var e = await resp.json(); alert(e && e.message ? e.message : t('error.revokeFailed')); } catch(_){ alert(t('error.revokeFailed')); } return; }
      loadPendingUsernameBadge();
    } catch(_){ alert(t('error.networkRevokeFailed')); }
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
