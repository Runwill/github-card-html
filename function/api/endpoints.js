// 统一 API 端点配置（支持从 localStorage 读取/切换 BASE）
// 暴露 window.endpoints：base/getBase/setBase/api/abs/character/skill/card/termDynamic/termFixed
;(function(){
  var DEFAULT_BASE=(function(){
    try {
      var saved = (typeof localStorage!== 'undefined') ? localStorage.getItem('apiBase') : '';
      if (saved && /^https?:\/\//i.test(saved)) return saved;
    } catch(e) {}
    // 如未通过 localStorage 指定，默认走公网后端
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
    skill: function(strength){ var s=strength || (typeof localStorage!=='undefined' ? localStorage.getItem('strength') : ''); return withBase('/api/skill?strength='+encodeURIComponent(s||'')) },
    card: function(){ return withBase('/api/card') },
    termDynamic: function(){ return withBase('/api/term-dynamic') },
    termFixed: function(){ return withBase('/api/term-fixed') }
  }
})()
