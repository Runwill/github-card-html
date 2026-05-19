(function () {
  // tokens/data
  // 本地内存数据操作：插入/更新/删除/查找 和 搜索过滤

  const T = window.tokensAdmin;
  const { state, HIDE_KEYS } = T;

  function ensureArraysForSkills() {
    if (!state.data) state.data = {};
    ['s0', 's1', 's2'].forEach(k => { if (!Array.isArray(state.data[k])) state.data[k] = []; });
  }

  // collection → state 数组映射
  const COL_MAP = {
    'term-fixed':   'termFixed',
    'term-dynamic': 'termDynamic',
    'card':         'cards',
    'character':    'characters',
  };
  function getArrays(collection) {
    if (!state.data) state.data = {};
    const key = COL_MAP[collection];
    if (key) return [state.data[key] ||= []];
    if (collection === 'skill') {
      ensureArraysForSkills();
      return ['s0', 's1', 's2'].map(k => state.data[k]);
    }
    return Object.keys(state.data)
      .map(k => state.data[k])
      .filter(Array.isArray);
  }

  function pushDocToState(collection, doc) {
    if (collection === 'skill') {
      ensureArraysForSkills();
      const bucket = Number(doc && doc.strength) === 1 ? state.data.s1 : Number(doc && doc.strength) === 2 ? state.data.s2 : state.data.s0;
      bucket.unshift(doc);
    } else {
      const arrs = getArrays(collection);
      if (arrs[0]) arrs[0].unshift(doc);
    }
  }

  function findDocEntry(collection, id) {
    if (!state.data) return null;
    const sid = String(id);
    for (const arr of getArrays(collection)) {
      const index = arr.findIndex(d => d && String(d._id) === sid);
      if (index >= 0) return { arr, index, doc: arr[index] };
    }
    return null;
  }

  function updateDocInState(collection, id, updater) {
    const entry = findDocEntry(collection, id);
    if (!entry) return false;
    updater(entry.doc);
    return true;
  }

  function removeDocFromState(collection, id) {
    const entry = findDocEntry(collection, id);
    if (!entry) return false;
    entry.arr.splice(entry.index, 1);
    return true;
  }

  function findDocInState(collection, id) {
    const entry = findDocEntry(collection, id);
    return entry ? entry.doc : null;
  }

  // 递归包含判断（限制深度，忽略隐藏字段）
  function deepContains(v, kw, depth = 0) {
    try {
      if (depth > 6) return false;
      if (v == null) return false;
      const t = typeof v;
      // 统一关键字：原样小写匹配 + 归一化（仅字母数字，去空白/连字符等）匹配
      const kwRaw = String(kw || '').toLowerCase();
      const kwNorm = kwRaw.replace(/[^a-z0-9]/g, '');

      if (t === 'string') {
        const s = v.toLowerCase();
        // 常规包含
        if (s.includes(kwRaw)) return true;
        // 对 ASCII 字段（如拼音/英文）再做归一化匹配：移除非字母数字，避免空格影响
        if (/[a-z0-9]/.test(s)) {
          const sNorm = s.replace(/[^a-z0-9]/g, '');
          if (kwNorm && sNorm.includes(kwNorm)) return true;
        }
        return false;
      }
      if (t === 'number' || t === 'boolean') return String(v).toLowerCase().includes(kw);
      if (Array.isArray(v)) {
        for (const it of v) { if (deepContains(it, kw, depth + 1)) return true; }
        return false;
      }
      if (t === 'object') {
        // 优先：若对象上存在聚合拼音字段 py（原 _py），以支持拼音搜索
        try {
          const p = v.py ? String(v.py).toLowerCase() : '';
          if (p) {
            if (p.includes(kwRaw)) return true;
            if (kwNorm) {
              const pNorm = p.replace(/[^a-z0-9]/g, '');
              if (pNorm && pNorm.includes(kwNorm)) return true;
            }
          }
        } catch (_) {}
        for (const k of Object.keys(v)) {
          if (HIDE_KEYS.has(k)) continue;
          if (deepContains(v[k], kw, depth + 1)) return true;
        }
        return false;
      }
      return false;
    } catch (_) { return false; }
  }

  function filterByQuery(arr, q) {
    try {
      const kw = (q || '').trim().toLowerCase();
      if (!kw) return Array.isArray(arr) ? arr.slice() : [];
      return (arr || []).filter(it => it && typeof it === 'object' && deepContains(it, kw));
    } catch (_) {
      return Array.isArray(arr) ? arr.slice() : [];
    }
  }

  Object.assign(window.tokensAdmin, {
    ensureArraysForSkills,
    pushDocToState,
    updateDocInState,
    removeDocFromState,
    findDocInState,
    deepContains,
    filterByQuery,
  });
})();
