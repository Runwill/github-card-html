(function () {
  // tokens/schema
  // 从样本推导 schema、合并 schema、生成骨架对象、构建模板、集合默认值

  const T = window.tokensAdmin;
  const { setByPath } = T;

  function deriveSchema(val) {
    if (val === null || val === undefined) return { kind: 'null' };
    if (Array.isArray(val)) {
      if (val.length === 0) return { kind: 'arr', elem: { kind: 'empty' } };
      const elemSchemas = val.map(deriveSchema);
      const merged = mergeSchemas(elemSchemas);
      return { kind: 'arr', elem: merged };
    }
    const t = typeof val;
    if (t === 'string') return { kind: 'str' };
    if (t === 'number') return { kind: 'num' };
    if (t === 'boolean') return { kind: 'bool' };
    if (t === 'object') {
      // 过滤掉非持久化/聚合类字段（如列表拼音 py）以及内部字段
      const keys = Object.keys(val).filter(k => k !== '_id' && k !== '__v' && k !== '_v' && k !== 'py');
      keys.sort();
      const fields = {};
      for (const k of keys) fields[k] = deriveSchema(val[k]);
      return { kind: 'obj', fields };
    }
    return { kind: 'unknown' };
  }

  function mergeSchemas(schemas) {
    if (!schemas || schemas.length === 0) return { kind: 'empty' };
    const kinds = new Set(schemas.map(s => s && s.kind));
    if (kinds.size === 1) {
      const kind = schemas[0].kind;
      if (kind === 'obj') {
        const allKeys = new Set();
        schemas.forEach(s => { Object.keys(s.fields || {}).forEach(k => allKeys.add(k)); });
        const fields = {};
        Array.from(allKeys).sort().forEach(k => {
          const subs = schemas.map(s => (s.fields || {})[k]).filter(Boolean);
          fields[k] = mergeSchemas(subs);
        });
        return { kind: 'obj', fields };
      }
      if (kind === 'arr') {
        const elems = schemas.map(s => s.elem).filter(Boolean);
        return { kind: 'arr', elem: mergeSchemas(elems) };
      }
      return { kind };
    }
    const hasObj = schemas.some(s => s.kind === 'obj');
    const hasArr = schemas.some(s => s.kind === 'arr');
    if (hasObj) { const objSchemas = schemas.filter(s => s.kind === 'obj'); return mergeSchemas([{ kind: 'obj', fields: {} }, ...objSchemas]); }
    if (hasArr) { const arrSchemas = schemas.filter(s => s.kind === 'arr'); const elems = arrSchemas.map(s => s.elem).filter(Boolean); return { kind: 'arr', elem: mergeSchemas(elems) }; }
    return { kind: 'unknown' };
  }

  function schemaSignature(s) {
    if (!s) return 'null';
    switch (s.kind) {
      case 'str': case 'num': case 'bool': case 'null': case 'unknown': case 'empty': return s.kind;
      case 'arr': return `arr<${schemaSignature(s.elem)}>`;
      case 'obj': {
        const keys = Object.keys(s.fields || {}).sort();
        const inner = keys.map(k => `${k}:${schemaSignature(s.fields[k])}`).join(',');
        return `{${inner}}`;
      }
      default: return 'unknown';
    }
  }

  function skeletonFromSchema(s) {
    switch (s && s.kind) {
      case 'str': return '';
      case 'num': return 0;
      case 'bool': return false;
      case 'null': return '';
      case 'unknown': return '';
      case 'empty': return [];
      case 'arr': {
        const elem = s.elem || { kind: 'str' };
        if (elem.kind === 'obj') return [skeletonFromSchema(elem)];
        if (elem.kind === 'arr') return [skeletonFromSchema(elem)];
        return [skeletonFromSchema(elem)];
      }
      case 'obj': {
        const out = {};
        const keys = Object.keys(s.fields || {}).sort();
        for (const k of keys) out[k] = skeletonFromSchema(s.fields[k]);
        return out;
      }
      default: return '';
    }
  }

  function flattenHintsFromSchema(s, base = '') {
    const out = [];
    (function _f(sch, p) {
      if (!sch) return;
      const dot = (k) => p ? `${p}.${k}` : k;
      switch (sch.kind) {
        case 'str': case 'num': case 'bool': case 'null': case 'unknown': out.push({ name: p || '(root)', type: sch.kind }); break;
        case 'arr': {
          const t = schemaSignature(sch.elem);
          if (sch.elem && sch.elem.kind === 'obj') { _f(sch.elem, (p ? `${p}` : p) + '[]'); }
          else { out.push({ name: (p ? `${p}` : p) + '[]', type: `Array<${t}>` }); }
          break;
        }
        case 'obj': {
          const keys = Object.keys(sch.fields || {}).sort();
          if (!p && keys.length === 0) out.push({ name: '(root)', type: 'obj' });
          for (const k of keys) _f(sch.fields[k], dot(k));
          break;
        }
      }
    })(s, base);
    return out;
  }

  function buildTemplate(collection, shape) {
    const byTypeDefault = (t) => t === 'String' ? '' : t === 'Number' ? 0 : t === 'Boolean' ? false : t === 'Array' ? [] : {};
    const obj = {};
    const fields = Array.isArray(shape && shape.fields) ? shape.fields : [];
    const arrayBases = new Set();
    const arrayChildren = new Map();
    const setDefaultByPath = (path, defVal) => { try { setByPath(obj, path, defVal); } catch (_) {} };

    // 一轮：记录数组基、必填字段赋默认值
    for (const f of fields) {
      const raw = f && f.name;
      if (!raw) continue;
      if (raw === '_id' || raw === '__v') continue;
      if (raw.includes('[]')) {
        try {
          const base = raw.slice(0, raw.indexOf('[]'));
          if (base) {
            arrayBases.add(base);
            const after = raw.slice(raw.indexOf('[]') + 2);
            if (after.startsWith('.')) {
              const rel = after.slice(1);
              if (rel) {
                if (!arrayChildren.has(base)) arrayChildren.set(base, []);
                arrayChildren.get(base).push(rel);
              }
            }
          }
        } catch (_) {}
      }
      if (raw.endsWith('[]')) {
        if (f.required) { const base = raw.slice(0, -2); const def = Array.isArray(f.default) ? f.default : []; setDefaultByPath(base, def); }
        continue;
      }
      if (f.required) { const def = (f.default !== undefined) ? f.default : byTypeDefault(f.type); setDefaultByPath(raw, def); }
    }

    // 二轮：处理 a.b.c 这类点路径（去掉 []）
    for (const f of fields) {
      const raw = f && f.name;
      if (!raw || raw === '_id' || raw === '__v') continue;
      if (raw.includes('.')) { const normalized = raw.replace(/\[\]/g, ''); const def = (f.default !== undefined) ? f.default : byTypeDefault(f.type); setDefaultByPath(normalized, def); }
    }

    // 三轮：如果数组为空且有子项描述，构造一个原型对象
    for (const base of arrayBases) {
      if (!Array.isArray(obj[base])) obj[base] = [];
      try {
        const children = arrayChildren.get(base) || [];
        if (obj[base].length === 0 && children.length > 0) {
          const proto = {};
          for (const rel of children) {
            const defField = fields.find(ff => ff.name && (ff.name === `${base}[].${rel}`));
            const defVal = defField && defField.default !== undefined ? defField.default : byTypeDefault(defField ? defField.type : 'String');
            setByPath(proto, rel, defVal);
          }
          obj[base].push(proto);
        }
      } catch (_) {}
    }

    return applyCollectionDefaults(collection, obj, shape);
  }

  function applyCollectionDefaults(collection, obj, shape) {
    try {
      if (collection === 'character') {
        if (shape && shape.suggest && shape.suggest.nextId != null && obj.id == null) obj.id = shape.suggest.nextId;
        if (obj.name == null) obj.name = '新武将';
        if (obj.health == null) obj.health = 1;
        if (obj.dominator == null) obj.dominator = 0;
      } else if (collection === 'card') {
        if (obj.en == null) obj.en = 'new_card_en';
        if (obj.cn == null) obj.cn = '新卡牌';
        if (obj.type == null) obj.type = '';
      } else if (collection === 'term-fixed') {
        if (obj.en == null) obj.en = 'term_key';
        if (obj.cn == null) obj.cn = '术语中文';
        if (!Array.isArray(obj.part)) obj.part = [];
        if (!Array.isArray(obj.epithet)) obj.epithet = [];
      } else if (collection === 'term-dynamic') {
        if (obj.en == null) obj.en = 'term_key';
        if (!Array.isArray(obj.part)) obj.part = [];
      } else if (collection === 'skill') {
        if (obj.name == null) obj.name = '新技能';
        if (obj.content == null) obj.content = '技能描述';
        if (obj.strength == null) obj.strength = 0;
        if (!Array.isArray(obj.role)) obj.role = [];
      }
    } catch (_) {}
    return obj;
  }

  Object.assign(window.tokensAdmin, { deriveSchema, mergeSchemas, schemaSignature, skeletonFromSchema, flattenHintsFromSchema, buildTemplate, applyCollectionDefaults });
})();
