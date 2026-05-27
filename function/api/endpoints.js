// 统一 API 端点配置（支持 URL 参数 / localStorage / 环境默认）
// 暴露 window.endpoints：base/getBase/setBase/api/abs/character/skill/card/termDynamic/termFixed
function storageGet(key){ try { return (typeof localStorage!== 'undefined' && localStorage.getItem(key)) || ''; } catch(e) { return ''; } }
  function storageSet(key, value){ try { if (typeof localStorage!== 'undefined') localStorage.setItem(key, value); } catch(e) {} }

  function readQueryApiBase(){
    try {
      if (typeof window === 'undefined' || !window.location) return '';
      var u = new URL(window.location.href);
      var b = u.searchParams.get('apiBase');
      if (b && /^https?:\/\//i.test(b)) {
        storageSet('apiBase', b);
        return b;
      }
    } catch(e) {}
    return '';
  }

  function readLocalApiBase(){
    var saved = storageGet('apiBase');
    return saved && /^https?:\/\//i.test(saved) ? saved : '';
  }

  function envDefaultBase(){
    try {
      if (typeof window === 'undefined' || !window.location) return 'http://localhost:3000';
      var loc = window.location;
      var host = (loc.hostname || '').toLowerCase();
      // 本地 / file 协议，默认连本机后端
      if (loc.protocol === 'file:' || !host) return 'http://localhost:3000';
      if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
      // 特殊处理 120.55.7.7，后端在 3000 端口
      if (host === '120.55.7.7') return 'http://120.55.7.7:3000';
      // 线上默认走同源（前后端同域部署）
      return String(loc.origin || '').replace(/\/$/, '');
    } catch(e) {
      return 'http://localhost:3000';
    }
  }

let DEFAULT_BASE=(function(){
    // 优先级：URL 参数 > localStorage > 环境默认 > 公网后端
    return readQueryApiBase() || readLocalApiBase() || envDefaultBase() || 'http://120.55.7.7:3000';
  })();

  function base(){ return String(DEFAULT_BASE||'').replace(/\/$/,'') }
  function withBase(p){ var b=base(); return b + (p && p.startsWith('/')? p : '/' + (p||'')) }

  function setBase(url){
    if (!url || !/^https?:\/\//i.test(url)) return;
    DEFAULT_BASE = url;
    storageSet('apiBase', url);
  }
  function getBase(){ return base(); }

  function authHeader(includeEmpty){
    var token = storageGet('token');
    return token || includeEmpty ? { 'Authorization': 'Bearer ' + token } : {};
  }

  async function requestJson(endpoint, opts){
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    if (opts.auth) Object.assign(headers, authHeader(opts.auth === 'always'));

    var payload = opts.body;
    if (payload != null && typeof payload !== 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      payload = JSON.stringify(payload);
    }

    var raw = String(endpoint || '');
    var resp = await fetch(/^https?:\/\//i.test(raw) ? raw : withBase('/api' + (raw.startsWith('/') ? raw : '/' + raw)), {
      method: opts.method || 'GET',
      headers: headers,
      body: payload
    });
    var out = await resp.json().catch(function(){ return {}; });

    if (!resp.ok) {
      if (resp.status === 401 && typeof opts.onUnauthorized === 'function') {
        try { opts.onUnauthorized(resp, out); } catch(e) {}
      }
      var message = (opts.preferJsonMessage !== false && out && out.message) || opts.defaultMessage || ('HTTP ' + resp.status);
      var err = new Error(message);
      try { Object.assign(err, { status: resp.status, data: out, response: resp }); } catch(e) {}
      throw err;
    }

    return out;
  }

window.endpoints={
    base,
    getBase,
    setBase,
    authHeader,
    requestJson,
    api: function(p){ return withBase(p) },
    abs: function(u){ if(!u) return ''; return /^https?:\/\//i.test(u)?u:withBase(u.startsWith('/')?u:'/'+u) },
    character: function(){ return withBase('/api/character') },
    skill: function(strength){ var s=strength || storageGet('strength'); return withBase('/api/skill?strength='+encodeURIComponent(s||'')) },
    card: function(){ return withBase('/api/card') },
    termDynamic: function(){ return withBase('/api/term-dynamic') },
    termFixed: function(){ return withBase('/api/term-fixed') }
};
