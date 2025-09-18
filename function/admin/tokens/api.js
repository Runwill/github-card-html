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

  const API_BASE = 'http://localhost:3000/api';
  const CLIENT_ID = (()=>{
    try{
      const k='tokens_client_id';
      let v=localStorage.getItem(k);
      if(!v){ v = 'web_' + Math.random().toString(36).slice(2,10) + '_' + Date.now(); localStorage.setItem(k, v); }
      return v;
    }catch(_){ return 'web_' + Math.random().toString(36).slice(2,10); }
  })();

  // 统一的 JSON 请求封装
  async function apiJson(endpoint, opts) {
    const { method = 'GET', headers = {}, body, auth = false } = opts || {};
    const { token } = getAuth();

    // 构建请求头
  const h = Object.assign({}, headers);
  try { h['x-client-id'] = CLIENT_ID; } catch(_){}
    if (auth && token) h['Authorization'] = `Bearer ${token}`;

    // 处理 body 与 Content-Type
    let payload = body;
    if (body != null && typeof body !== 'string') {
      h['Content-Type'] = h['Content-Type'] || 'application/json';
      payload = JSON.stringify(body);
    }

    // 构建 URL
    const url = endpoint.startsWith('http') ? endpoint : (API_BASE + endpoint);

    // 发起请求
    const resp = await fetch(url, { method, headers: h, body: payload });

    // 401 统一处理：清理登录态并跳转登录页
    if (resp.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('id');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('avatar');
      } catch (_) {}
      // 避免在登录页循环跳转
      try {
        if (!/login\.html$/i.test(location.pathname)) {
          // 轻量提示（可选）
          console.warn('登录已过期，请重新登录');
          location.href = 'login.html';
        }
      } catch (_) {}
    }

    // 尝试解析 JSON；解析失败回退为 {}
    const out = await resp.json().catch(() => ({}));

    // 非 2xx 抛错，优先使用返回的 message
    if (!resp.ok) throw new Error((out && out.message) || '请求失败');

    return out;
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
    }
    return apiJson('/tokens/logs' + (q.toString()? ('?' + q.toString()) : ''), { auth: true });
  }

  // 统一的集合元信息
  const COLLECTIONS = Object.freeze({
    'term-fixed': { key: 'termFixed', url: API_BASE + '/term-fixed' },
    'term-dynamic': { key: 'termDynamic', url: API_BASE + '/term-dynamic' },
    'card': { key: 'cards', url: API_BASE + '/card' },
    'character': { key: 'characters', url: API_BASE + '/character' },
    'skill': { key: 'skills', url: API_BASE + '/skill' },
  });

  Object.assign(window.tokensAdmin, { getAuth, apiJson, API_BASE, COLLECTIONS, CLIENT_ID, fetchTokenLogs });
})();
