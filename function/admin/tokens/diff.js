(function () {
  // tokens/diff
  // 计算对象差异并通过 API 应用（删除优先，后设置）

  const T = window.tokensAdmin;
  const { setByPath, deleteFieldInDocByPath } = T;

  function pathJoin(base, key) { return base ? (base + '.' + key) : String(key); }
  function isPrimitive(v) { return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'; }

  function diffObjects(orig, next, base = '') {
    const sets = [], dels = [];
    const addSet = (p, v) => { const t = (typeof v === 'number') ? 'number' : (typeof v === 'boolean') ? 'boolean' : 'string'; sets.push({ path: p, value: v, valueType: t }); };
    const walk = (o, n, p) => {
      if (isPrimitive(o) || isPrimitive(n)) { if (JSON.stringify(o) !== JSON.stringify(n)) addSet(p, n); return; }
      if (Array.isArray(o) || Array.isArray(n)) {
        const oa = Array.isArray(o) ? o : [];
        const na = Array.isArray(n) ? n : [];
        const len = Math.max(oa.length, na.length);
        for (let i = 0; i < len; i++) {
          const op = pathJoin(p, String(i));
          if (i >= na.length) { dels.push(op); }
          else if (i >= oa.length) { if (isPrimitive(na[i])) addSet(op, na[i]); else { walk(undefined, na[i], op); } }
          else {
            if (isPrimitive(oa[i]) || isPrimitive(na[i])) { if (JSON.stringify(oa[i]) !== JSON.stringify(na[i])) addSet(op, na[i]); }
            else { walk(oa[i], na[i], op); }
          }
        }
        return;
      }
      const ok = Object.keys(o || {});
      const nk = Object.keys(n || {});
      const keySet = new Set([...ok, ...nk]);
      for (const k of keySet) {
        if (n && !Object.prototype.hasOwnProperty.call(n, k)) { dels.push(pathJoin(p, k)); continue; }
        if (o && !Object.prototype.hasOwnProperty.call(o, k)) { const v = n[k]; if (isPrimitive(v)) addSet(pathJoin(p, k), v); else walk(undefined, v, pathJoin(p, k)); continue; }
        const ov = o[k], nv = n[k];
        if (isPrimitive(ov) || isPrimitive(nv)) { if (JSON.stringify(ov) !== JSON.stringify(nv)) addSet(pathJoin(p, k), nv); }
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
    const sets2 = sets.filter(x => x && x.path && !isHidden(x.path));
    const dels2 = dels.filter(p => p && !isHidden(p));

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
  }

  Object.assign(window.tokensAdmin, { diffObjects, applyObjectEdits });
})();
