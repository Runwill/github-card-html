// 核心 DOM 与 URL 助手方法（IIFE + 全局命名空间）。
// CardUI Manager Core - DOM and URL helpers (IIFE + window namespace)
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};

  var ns = w.CardUI.Manager.Core;

  function $(id){ return document.getElementById(id); }
  function qs(sel){ return document.querySelector(sel); }

  function abs(u){
    return (w.endpoints && typeof w.endpoints.abs === 'function') ? w.endpoints.abs(u) : u;
  }
  function api(u){
    return (w.endpoints && typeof w.endpoints.api === 'function') ? w.endpoints.api(u) : u;
  }

  function resolveAvatarUrl(u){
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return abs(u);
    return u;
  }

  function show(el, display){ if (el) el.style.display = (display == null ? 'block' : display); }
  function hide(el){ if (el) el.style.display = 'none'; }

  ns.dom = { $, qs, abs, api, resolveAvatarUrl, show, hide };
})();
