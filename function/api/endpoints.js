// 统一 API 端点配置（修改 DEFAULT_BASE 切换环境）
// 暴露 window.endpoints：base/api/abs/character/skill/card/termDynamic/termFixed
;(function(){
  var DEFAULT_BASE='http://localhost:3000'
  function base(){ return String(DEFAULT_BASE||'').replace(/\/$/,'') }
  function withBase(p){ var b=base(); return b + (p.startsWith('/')? p : '/' + p) }
  window.endpoints={
    base,
    api: function(p){ return withBase(p) },
    abs: function(u){ if(!u) return ''; return /^https?:\/\//i.test(u)?u:withBase(u.startsWith('/')?u:'/'+u) },
    character: function(){ return withBase('/api/character') },
    skill: function(strength){ var s=strength || (typeof localStorage!=='undefined' ? localStorage.getItem('strength') : ''); return withBase('/api/skill?strength='+encodeURIComponent(s||'')) },
    card: function(){ return withBase('/api/card') },
    termDynamic: function(){ return withBase('/api/term-dynamic') },
    termFixed: function(){ return withBase('/api/term-fixed') }
  }
})()
