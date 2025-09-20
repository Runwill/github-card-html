// 统一 API 端点配置（单点配置）
// 直接修改下面这一行的地址即可切换后端环境。
// 例如：'http://192.168.1.88:3000' 或 'https://api.example.com'
(function(){
  var DEFAULT_BASE = 'http://localhost:3000';
  function resolveBase(){
    return String(DEFAULT_BASE || '').replace(/\/$/, '');
  }
  function withBase(path){
    var base = resolveBase();
    return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
  }
  window.endpoints = {
    base: resolveBase,
    // 拼接通用 API 路径，如 endpoints.api('/api/login')
    api: function(path){ return withBase(path); },
    // 将相对路径（如 /uploads/...）转为绝对；已是 http 开头则原样返回
    abs: function(u){
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u;
      return withBase(u.startsWith('/') ? u : '/' + u);
    },
    character: function(){ return withBase('/api/character'); },
    skill: function(strength){
      var s = strength || (typeof localStorage !== 'undefined' ? localStorage.getItem('strength') : '');
      return withBase('/api/skill?strength=' + encodeURIComponent(s || ''));
    },
    card: function(){ return withBase('/api/card'); },
    termDynamic: function(){ return withBase('/api/term-dynamic'); },
    termFixed: function(){ return withBase('/api/term-fixed'); }
  };
})();
