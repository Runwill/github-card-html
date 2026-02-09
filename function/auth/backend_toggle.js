// 登录页后端切换（公网 / 本地）控制器
(function () {
  'use strict';

  var PUBLIC_URL = 'http://120.55.7.7:3000';
  var LOCAL_URL  = 'http://localhost:3000';
  var btn = document.getElementById('backend-toggle');
  var msg = document.getElementById('login-message');

  function isPublic(u) { return typeof u === 'string' && u.indexOf('120.55.7.7') >= 0; }
  function normalize(u) { return String(u || '').replace(/\/$/, ''); }

  function applyStyle(current) {
    btn.classList.remove('btn--primary', 'btn--secondary', 'btn--success', 'btn--danger');
    if (isPublic(current)) {
      btn.classList.add('btn--success');
      try { btn.setAttribute('data-i18n', 'login.backend.publicSelected'); } catch (_) {}
      try { btn.textContent = window.t('login.backend.publicSelected'); } catch (_) { btn.textContent = '公网后端 (已选)'; }
    } else {
      btn.classList.add('btn--danger');
      try { btn.setAttribute('data-i18n', 'login.backend.localSelected'); } catch (_) {}
      try { btn.textContent = window.t('login.backend.localSelected'); } catch (_) { btn.textContent = '本地后端 (已选)'; }
    }
  }

  function currentBase() { try { return endpoints && endpoints.getBase ? endpoints.getBase() : LOCAL_URL; } catch (e) { return LOCAL_URL; } }
  function setBase(u) { try { if (endpoints && endpoints.setBase) endpoints.setBase(u); } catch (e) {} }

  function refreshMessage() {
    var b = currentBase();
    if (msg) {
      msg.className = 'modal-message';
      msg.textContent = window.t('login.backend.currentPrefix', { url: normalize(b) });
    }
  }

  function init() {
    var b = currentBase();
    applyStyle(b);
    refreshMessage();
  }

  if (btn) {
    btn.addEventListener('click', function () {
      var b = currentBase();
      var next = isPublic(b) ? LOCAL_URL : PUBLIC_URL;
      setBase(next);
      applyStyle(next);
      refreshMessage();
    });
  }

  function boot() {
    try { if (window.i18n && window.i18n.apply) window.i18n.apply(document); } catch (_) {}
    init();
    try { window.addEventListener('i18n:changed', function () { applyStyle(currentBase()); refreshMessage(); }); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
