(function () {
  // tokens/diff
  // 计算对象差异并通过 API 应用（删除优先，后设置）

  const T = window.tokensAdmin;
  const { setByPath, deleteFieldInDocByPath } = T;

  function pathJoin(base, key) { return base ? (base + '.' + key) : String(key); }
  function isPrimitive(v) { return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'; }

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

        // 简单按索引比较，适配“按路径更新”的后端 API
        // 避免 LCS 对齐导致“移动但内容未变”的项被忽略，从而未能更新其新位置的值
        const len = Math.max(oa.length, na.length);
        for (let i = 0; i < len; i++) {
          const sub = pathJoin(p, String(i));
          if (i >= na.length) {
            addDel(sub, oa[i]);
          } else {
            walk(oa[i], na[i], sub);
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
