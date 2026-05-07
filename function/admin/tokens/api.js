(function () {
  // tokens/api
  // 统一 API 封装：鉴权、JSON 序列化、错误处理

  window.tokensAdmin = window.tokensAdmin || {};

  // 获取认证信息（role/token）并判断是否可编辑
  function getAuth() {
    try {
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      return { role, token, canEdit: !!token && role === 'admin' };
    } catch (_) {
      return { role: null, token: null, canEdit: false };
    }
  }

  const CLIENT_ID = (()=>{
    try{
      const k='tokens_client_id';
      let v=localStorage.getItem(k);
      if(!v){ v = 'web_' + Math.random().toString(36).slice(2,10) + '_' + Date.now(); localStorage.setItem(k, v); }
      return v;
    }catch(_){ return 'web_' + Math.random().toString(36).slice(2,10); }
  })();

  function handleUnauthorized(){
    try { ['token','id','username','role','avatar'].forEach(key => localStorage.removeItem(key)); } catch (_) {}
    try {
      if (!/login\.html$/i.test(location.pathname)) {
        console.warn('登录已过期，请重新登录');
        location.href = 'login.html';
      }
    } catch (_) {}
  }

  // 统一的 JSON 请求封装
  function apiJson(endpoint, opts) {
    const requestOpts = Object.assign({ defaultMessage: '请求失败', onUnauthorized: handleUnauthorized }, opts || {});
    requestOpts.headers = Object.assign({}, requestOpts.headers || {}, { 'x-client-id': CLIENT_ID });
    return endpoints.requestJson(endpoint, requestOpts);
  }

  // 拉取统一存储的日志
  async function fetchTokenLogs(params){
    const q = new URLSearchParams();
    if (params) {
      if (params.page) q.set('page', String(params.page));
      if (params.pageSize) q.set('pageSize', String(params.pageSize));
      if (params.since) q.set('since', String(params.since));
      if (params.until) q.set('until', String(params.until));
      if (params.collection) q.set('collection', String(params.collection));
      if (params.docId) q.set('docId', String(params.docId));
      if (params.includeDeleted) q.set('includeDeleted', 'true');
    }
    return apiJson('/tokens/logs' + (q.toString()? ('?' + q.toString()) : ''), { auth: true });
  }

  // 统一的集合元信息
  const COLLECTIONS = Object.freeze({
    'term-fixed': { key: 'termFixed', url: '/term-fixed' },
    'term-dynamic': { key: 'termDynamic', url: '/term-dynamic' },
    'card': { key: 'cards', url: '/card' },
    'character': { key: 'characters', url: '/character' },
    'skill': { key: 'skills', url: '/skill' },
  });

  Object.assign(window.tokensAdmin, { getAuth, apiJson, COLLECTIONS, CLIENT_ID, fetchTokenLogs });
})();
