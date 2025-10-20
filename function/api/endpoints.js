// 统一 API 端点配置（支持 URL 参数 / localStorage / 环境默认）
// 暴露 window.endpoints：base/getBase/setBase/api/abs/character/skill/card/termDynamic/termFixed
;(function(){
  function readQueryApiBase(){
    try {
      if (typeof window === 'undefined' || !window.location) return '';
      var u = new URL(window.location.href);
      var b = u.searchParams.get('apiBase');
      if (b && /^https?:\/\//i.test(b)) {
        try { if (typeof localStorage!== 'undefined') localStorage.setItem('apiBase', b); } catch(e) {}
        return b;
      }
    } catch(e) {}
    return '';
  }

  function readLocalApiBase(){
    try {
      var saved = (typeof localStorage!== 'undefined') ? localStorage.getItem('apiBase') : '';
      if (saved && /^https?:\/\//i.test(saved)) return saved;
    } catch(e) {}
    return '';
  }

  function envDefaultBase(){
    try {
      if (typeof window === 'undefined' || !window.location) return 'http://localhost:3000';
      var loc = window.location;
      var host = (loc.hostname || '').toLowerCase();
      // 本地 / file 协议，默认连本机后端
      if (loc.protocol === 'file:' || !host) return 'http://localhost:3000';
      if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
      // 线上默认走同源（前后端同域部署）
      return String(loc.origin || '').replace(/\/$/, '');
    } catch(e) {
      return 'http://localhost:3000';
    }
  }

  var DEFAULT_BASE=(function(){
    // 优先级：URL 参数 > localStorage > 环境默认 > 公网后端
    var qb = readQueryApiBase(); if (qb) return qb;
    var lb = readLocalApiBase(); if (lb) return lb;
    var eb = envDefaultBase(); if (eb) return eb;
    return 'http://120.55.7.7:3000';
  })();

  function base(){ return String(DEFAULT_BASE||'').replace(/\/$/,'') }
  function withBase(p){ var b=base(); return b + (p && p.startsWith('/')? p : '/' + (p||'')) }

  function setBase(url){
    if (!url || !/^https?:\/\//i.test(url)) return;
    DEFAULT_BASE = url;
    try { if (typeof localStorage!== 'undefined') localStorage.setItem('apiBase', url); } catch(e) {}
  }
  function getBase(){ return base(); }

  window.endpoints={
    base,
    getBase,
    setBase,
    api: function(p){ return withBase(p) },
    abs: function(u){ if(!u) return ''; return /^https?:\/\//i.test(u)?u:withBase(u.startsWith('/')?u:'/'+u) },
    character: function(){ return withBase('/api/character') },
    skill: function(strength){ var s=strength || (typeof localStorage!== 'undefined' ? localStorage.getItem('strength') : ''); return withBase('/api/skill?strength='+encodeURIComponent(s||'')) },
    card: function(){ return withBase('/api/card') },
    termDynamic: function(){ return withBase('/api/term-dynamic') },
    termFixed: function(){ return withBase('/api/term-fixed') }
  }
})()
