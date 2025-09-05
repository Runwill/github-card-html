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

  // 统一的 JSON 请求封装
  async function apiJson(endpoint, opts) {
    const { method = 'GET', headers = {}, body, auth = false } = opts || {};
    const { token } = getAuth();

    // 构建请求头
    const h = Object.assign({}, headers);
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

    // 尝试解析 JSON；解析失败回退为 {}
    const out = await resp.json().catch(() => ({}));

    // 非 2xx 抛错，优先使用返回的 message
    if (!resp.ok) throw new Error((out && out.message) || '请求失败');

    return out;
  }

  // 统一的集合元信息
  const COLLECTIONS = Object.freeze({
    'term-fixed': { key: 'termFixed', url: API_BASE + '/term-fixed' },
    'term-dynamic': { key: 'termDynamic', url: API_BASE + '/term-dynamic' },
    'card': { key: 'cards', url: API_BASE + '/card' },
    'character': { key: 'characters', url: API_BASE + '/character' },
    'skill': { key: null, url: null, urls: [API_BASE + '/skill0', API_BASE + '/skill1', API_BASE + '/skill2'] },
  });

  Object.assign(window.tokensAdmin, { getAuth, apiJson, API_BASE, COLLECTIONS });
})();
