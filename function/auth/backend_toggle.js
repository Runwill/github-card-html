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
    var publicBase = isPublic(current);
    var key = publicBase ? 'login.backend.publicSelected' : 'login.backend.localSelected';
    btn.classList.remove('btn--primary', 'btn--secondary', 'btn--success', 'btn--danger');
    btn.classList.add(publicBase ? 'btn--success' : 'btn--danger');
    try { btn.setAttribute('data-i18n', key); btn.textContent = window.t(key); } catch (_) { btn.textContent = publicBase ? '公网后端 (已选)' : '本地后端 (已选)'; }
  }

  function currentBase() { try { return endpoints?.getBase?.() || LOCAL_URL; } catch (e) { return LOCAL_URL; } }
  function setBase(u) { try { endpoints?.setBase?.(u); } catch (e) {} }

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
    window.i18n?.applySafe?.(document);
    init();
    try { window.addEventListener('i18n:changed', function () { applyStyle(currentBase()); refreshMessage(); }); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
