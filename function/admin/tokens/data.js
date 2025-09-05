(function () {
  // tokens/data
  // 本地内存数据操作：插入/更新/删除/查找 和 搜索过滤

  const T = window.tokensAdmin;
  const { state } = T;

  function ensureArraysForSkills() {
    if (!state.data) state.data = {};
    if (!Array.isArray(state.data.s0)) state.data.s0 = [];
    if (!Array.isArray(state.data.s1)) state.data.s1 = [];
    if (!Array.isArray(state.data.s2)) state.data.s2 = [];
  }

  function pushDocToState(collection, doc) {
    if (!state.data) state.data = {};
    if (collection === 'term-fixed') {
      (state.data.termFixed ||= []).unshift(doc);
    } else if (collection === 'term-dynamic') {
      (state.data.termDynamic ||= []).unshift(doc);
    } else if (collection === 'card') {
      (state.data.cards ||= []).unshift(doc);
    } else if (collection === 'character') {
      (state.data.characters ||= []).unshift(doc);
    } else if (collection === 'skill') {
      ensureArraysForSkills();
      const s = Number(doc && doc.strength);
      if (s === 1) state.data.s1.unshift(doc);
      else if (s === 2) state.data.s2.unshift(doc);
      else state.data.s0.unshift(doc);
    }
  }

  function updateDocInState(collection, id, updater) {
    if (!state.data) return false;
    const touch = (arr) => {
      if (!Array.isArray(arr)) return false;
      for (const d of arr) {
        if (d && String(d._id) === String(id)) {
          updater(d);
          return true;
        }
      }
      return false;
    };
    let updated = false;
    if (collection === 'term-fixed') updated = touch(state.data.termFixed);
    else if (collection === 'term-dynamic') updated = touch(state.data.termDynamic);
    else if (collection === 'card') updated = touch(state.data.cards);
    else if (collection === 'character') updated = touch(state.data.characters);
    else if (collection === 'skill') updated = touch(state.data.s0) || touch(state.data.s1) || touch(state.data.s2);
    if (!updated) {
      for (const k of Object.keys(state.data)) {
        if (touch(state.data[k])) { updated = true; break; }
      }
    }
    return updated;
  }

  function removeDocFromState(collection, id) {
    if (!state.data) return false;
    const rm = (arr) => {
      if (!Array.isArray(arr)) return false;
      const i = arr.findIndex(d => d && String(d._id) === String(id));
      if (i >= 0) { arr.splice(i, 1); return true; }
      return false;
    };
    if (collection === 'term-fixed') return rm(state.data.termFixed);
    if (collection === 'term-dynamic') return rm(state.data.termDynamic);
    if (collection === 'card') return rm(state.data.cards);
    if (collection === 'character') return rm(state.data.characters);
    if (collection === 'skill') return rm(state.data.s0) || rm(state.data.s1) || rm(state.data.s2);
    for (const k of Object.keys(state.data)) { if (rm(state.data[k])) return true; }
    return false;
  }

  function findDocInState(collection, id) {
    if (!state.data) return null;
    const pick = (arr) => Array.isArray(arr) ? (arr.find(d => d && String(d._id) === String(id)) || null) : null;
    if (collection === 'term-fixed') return pick(state.data.termFixed);
    if (collection === 'term-dynamic') return pick(state.data.termDynamic);
    if (collection === 'card') return pick(state.data.cards);
    if (collection === 'character') return pick(state.data.characters);
    if (collection === 'skill') return pick(state.data.s0) || pick(state.data.s1) || pick(state.data.s2);
    for (const k of Object.keys(state.data)) { const hit = pick(state.data[k]); if (hit) return hit; }
    return null;
  }

  const HIDE_KEYS = new Set(['_id', '__v', '_v']);

  // 递归包含判断（限制深度，忽略隐藏字段）
  function deepContains(v, kw, depth = 0) {
    try {
      if (depth > 6) return false;
      if (v == null) return false;
      const t = typeof v;
      if (t === 'string') return v.toLowerCase().includes(kw);
      if (t === 'number' || t === 'boolean') return String(v).toLowerCase().includes(kw);
      if (Array.isArray(v)) {
        for (const it of v) { if (deepContains(it, kw, depth + 1)) return true; }
        return false;
      }
      if (t === 'object') {
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
    HIDE_KEYS,
  });
})();
