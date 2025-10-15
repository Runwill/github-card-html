(function () {
  // tokens/diff
  // 计算对象差异并通过 API 应用（删除优先，后设置）

  const T = window.tokensAdmin;
  const { setByPath, deleteFieldInDocByPath } = T;

  function pathJoin(base, key) { return base ? (base + '.' + key) : String(key); }
  function isPrimitive(v) { return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'; }

  // 稳定序列化：对象键按字母序，确保等价对象得到相同签名
  function stableStringify(obj) {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    const parts = [];
    for (const k of keys) parts.push(JSON.stringify(k) + ':' + stableStringify(obj[k]));
    return '{' + parts.join(',') + '}';
  }

  // 为数组元素生成“对齐键”：优先使用稳定字段，其次使用稳定序列化
  function elemKey(e) {
    if (e && typeof e === 'object') {
      const cand = e._id ?? e.en ?? e.id ?? e.key ?? e.name;
      if (cand != null) return String(cand);
    }
    return stableStringify(e);
  }

  // 计算两序列的 LCS 索引映射，返回匹配对 [iOld, jNew] 按 jNew 递增
  function lcsIndexMap(a, b) {
    const n = a.length, m = b.length;
    const dp = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const pairs = [];
    let i = n, j = m;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { pairs.push([i - 1, j - 1]); i--; j--; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
    }
    pairs.reverse();
    return pairs; // sorted by both indexes ascending
  }

  function diffObjects(orig, next, base = '') {
    const sets = [], dels = [];
    const addSet = (p, from, to) => {
      const t = (typeof to === 'number') ? 'number' : (typeof to === 'boolean') ? 'boolean' : 'string';
      sets.push({ path: p, from, to, value: to, valueType: t });
    };
    const addDel = (p, from) => { dels.push({ path: p, from }); };
    const walk = (o, n, p) => {
      if (isPrimitive(o) || isPrimitive(n)) {
        if (JSON.stringify(o) !== JSON.stringify(n)) addSet(p, o, n);
        return;
      }
      if (Array.isArray(o) || Array.isArray(n)) {
        const oa = Array.isArray(o) ? o : [];
        const na = Array.isArray(n) ? n : [];

        // 基于键的 LCS 对齐，最小化“修改”并明确“新增/删除”
        const ak = oa.map(elemKey);
        const bk = na.map(elemKey);
        const pairs = lcsIndexMap(ak, bk);
        const mappedOld = new Set(pairs.map(x => x[0]));
        const mappedNew = new Set(pairs.map(x => x[1]));

        // 删除：未映射的旧项
        for (let i = 0; i < oa.length; i++) {
          if (!mappedOld.has(i)) addDel(pathJoin(p, String(i)), oa[i]);
        }
        // 新增/递归：映射的项按新索引递归比较；未映射的新项按新增处理
        let pi = 0; // 指向 pairs
        for (let j = 0; j < na.length; j++) {
          if (mappedNew.has(j)) {
            // 找到对应旧索引
            while (pi < pairs.length && pairs[pi][1] < j) pi++;
            const oi = (pi < pairs.length && pairs[pi][1] === j) ? pairs[pi][0] : null;
            if (oi != null) walk(oa[oi], na[j], pathJoin(p, String(j)));
          } else {
            const np = pathJoin(p, String(j));
            if (isPrimitive(na[j])) addSet(np, undefined, na[j]); else walk(undefined, na[j], np);
          }
        }
        return;
      }
      const ok = Object.keys(o || {});
      const nk = Object.keys(n || {});
      const keySet = new Set([...ok, ...nk]);
      for (const k of keySet) {
        if (n && !Object.prototype.hasOwnProperty.call(n, k)) { addDel(pathJoin(p, k), o && o[k]); continue; }
        if (o && !Object.prototype.hasOwnProperty.call(o, k)) {
          const v = n[k];
          if (isPrimitive(v)) addSet(pathJoin(p, k), undefined, v);
          else walk(undefined, v, pathJoin(p, k));
          continue;
        }
        const ov = o[k], nv = n[k];
        if (isPrimitive(ov) || isPrimitive(nv)) {
          if (JSON.stringify(ov) !== JSON.stringify(nv)) addSet(pathJoin(p, k), ov, nv);
        }
        else { walk(ov, nv, pathJoin(p, k)); }
      }
    };
    walk(orig, next, base);
    return { sets, dels };
  }

  async function applyObjectEdits(collection, id, orig, next) {
    const { apiJson } = window.tokensAdmin;
    const { sets, dels } = diffObjects(orig, next, '');

    const isHidden = (p) => /^(\_id|__v|_v)(\.|$)/.test(p);
    const detailedSets = sets.filter(x => x && x.path && !isHidden(x.path));
    const detailedDels = dels.filter(x => x && x.path && !isHidden(x.path));
    const sets2 = detailedSets.map(x => ({ path: x.path, value: x.to, valueType: x.valueType }));
    const dels2 = detailedDels.map(x => x.path);

    // 删除路径从深到浅，避免父删影响子删
    dels2.sort((a, b) => {
      const al = a.split('.'), bl = b.split('.');
      if (al.length !== bl.length) return bl.length - al.length;
      const an = al[al.length - 1], bn = bl[bl.length - 1];
      const ai = /^\d+$/.test(an) ? parseInt(an, 10) : NaN;
      const bi = /^\d+$/.test(bn) ? parseInt(bn, 10) : NaN;
      if (!Number.isNaN(ai) && !Number.isNaN(bi)) return bi - ai; // 数组索引从大到小
      return 0;
    });

    // 先删再设
  for (const p of dels2) {
      await apiJson('/tokens/delete', { method: 'POST', auth: true, body: { collection, id, path: p } });
    }
  for (const s of sets2) {
      await apiJson('/tokens/update', { method: 'POST', auth: true, body: { collection, id, path: s.path, value: s.value, valueType: s.valueType } });
    }

    // 同步到本地缓存
    const target = window.tokensAdmin.findDocInState(collection, id);
    if (target) {
      for (const p of dels2) { try { deleteFieldInDocByPath(target, p); } catch (_) { } }
      for (const s of sets2) { try { setByPath(target, s.path, s.value); } catch (_) { } }
    }

    // 返回详细 diff，供日志展示
    return { sets: detailedSets, dels: detailedDels };
  }

  Object.assign(window.tokensAdmin, { diffObjects, applyObjectEdits });
})();
