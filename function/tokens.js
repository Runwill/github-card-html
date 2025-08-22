// 拉取并渲染词元仪表盘
(function(){
  // 简单缓存与搜索状态
  const state = {
    data: null,
    q: '',
    timer: null,
  activeType: null, // 当前筛选的类型：'term-fixed' | 'term-dynamic' | 'card' | 'character' | 'skill' | null
  };
  
  // 工具：按 dot path 设置对象的值，支持数组索引
  function setByPath(obj, path, value) {
    if (!obj || !path) return;
    const parts = path.split('.');
    let cursor = obj;
    for (let i = 0; i < parts.length; i++) {
      const k = parts[i];
      const isLast = i === parts.length - 1;
      const key = /^\d+$/.test(k) ? Number(k) : k;
      if (isLast) {
        cursor[key] = value;
      } else {
        if (cursor[key] == null || typeof cursor[key] !== 'object') {
          // 下一段是数字则建数组，否则建对象
          const nextIsIndex = /^\d+$/.test(parts[i+1] || '');
          cursor[key] = nextIsIndex ? [] : {};
        }
        cursor = cursor[key];
      }
    }
  }

  function setupSearch() {
    const inp = document.getElementById('tokens-search');
    if (!inp) return;
    inp.value = state.q;
    inp.oninput = function() {
      const val = (this.value || '').trim();
      state.q = val;
      // 防抖
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        renderTokensDashboard(false);
      }, 200);
    };
  }

  // 对数组按关键字进行过滤（对所有可见字段做字符串搜索）
  function filterByQuery(arr, q) {
    if (!q) return arr;
    q = q.toLowerCase();
    const hit = (v) => {
      if (v == null) return false;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return String(v).toLowerCase().includes(q);
      }
      if (Array.isArray(v)) return v.some(hit);
      if (typeof v === 'object') return Object.keys(v).some(k => hit(v[k]));
      return false;
    };
    return (arr || []).filter(it => hit(it));
  }

  async function renderTokensDashboard(forceReload = false) {
    // 样式已移至外部文件 style/tokens.css
    const summaryEl = document.getElementById('tokens-summary');
    const contentEl = document.getElementById('tokens-content');
    if (!summaryEl || !contentEl) return;
    summaryEl.innerHTML = '<div style="grid-column:1/-1;color:#718096;">加载中…</div>';
    contentEl.innerHTML = '';
  // 权限：仅管理员可新增/编辑
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const canEdit = !!token && role === 'admin';

    const fetchJson = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    };

  try {
      if (!state.data || forceReload) {
        const [termFixed, termDynamic, cards, characters, s0, s1, s2] = await Promise.all([
          fetchJson('http://localhost:3000/api/term-fixed'),
          fetchJson('http://localhost:3000/api/term-dynamic'),
          fetchJson('http://localhost:3000/api/card'),
          fetchJson('http://localhost:3000/api/character'),
          fetchJson('http://localhost:3000/api/skill0'),
          fetchJson('http://localhost:3000/api/skill1'),
          fetchJson('http://localhost:3000/api/skill2')
        ]);
        state.data = { termFixed, termDynamic, cards, characters, s0, s1, s2 };
      }
      const { termFixed, termDynamic, cards, characters, s0, s1, s2 } = state.data;
      const skills = ([]).concat(s0||[], s1||[], s2||[]);

      const tiles = [
        { type: 'term-fixed', key: '静态术语', value: Array.isArray(termFixed)? termFixed.length : 0, color: '#EDF2F7' },
        { type: 'term-dynamic', key: '动态术语', value: Array.isArray(termDynamic)? termDynamic.length : 0, color: '#E6FFFA' },
        { type: 'card', key: '牌', value: Array.isArray(cards)? cards.length : 0, color: '#FEF3C7' },
        { type: 'character', key: '武将', value: Array.isArray(characters)? characters.length : 0, color: '#E9D8FD' },
        { type: 'skill', key: '技能', value: Array.isArray(skills)? skills.length : 0, color: '#C6F6D5' },
      ];
      summaryEl.innerHTML = tiles.map(t => {
        const isActive = state.activeType === t.type;
        const active = isActive ? ' is-active' : '';
        const dim = state.activeType && !isActive ? ' is-dim' : '';
        return `
          <div class="type-tile${active}${dim}" data-type="${t.type}" role="button" tabindex="0" aria-pressed="${isActive}"
               style="border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:${t.color}">
            <div style="font-size:12px;color:#4A5568;">${t.key}</div>
            <div style="font-weight:700; font-size:22px; color:#2D3748;">${t.value}</div>
          </div>
        `;
      }).join('');

  const section = (type, title, items, renderItem) => {
    const id = 'sec-' + Math.random().toString(36).slice(2,8);
    const total = Array.isArray(items)? items.length : 0;
    const preview = (items||[]).slice(0, 1);
    const shouldPreOpen = !!state.activeType && state.activeType === type && total > 1;
    const html = `
      <div style="border:1px solid #e2e8f0; border-radius:8px; margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F7FAFC; border-bottom:1px solid #e2e8f0;">
          <div style=\"font-weight:600; color:#2D3748;\">${title} <span class=\"count-badge\" style=\"color:#718096;font-weight:400;\">(${total})</span></div>
          <div style=\"display:flex;align-items:center;gap:8px;\">
            ${canEdit ? `<button class=\"btn btn--secondary btn--sm\" onclick=\"tokensOpenCreate('${type}')\">新增</button>` : ''}
            ${total>1 ? `<button id=\"btn-${id}\" class=\"btn btn--secondary btn--sm expand-btn${shouldPreOpen ? ' is-expanded' : ''}\" aria-expanded=\"${shouldPreOpen ? 'true' : 'false'}\" onclick=\"toggleTokensSection('${id}')\">${shouldPreOpen ? '收起' : '展开'}</button>`: ''}
          </div>
        </div>
        <div id="${id}" data-expanded="${shouldPreOpen ? '1' : '0'}" style="padding:10px 12px;">
          <div class="token-list">
            ${preview.map(renderItem).join('') || '<div style="color:#A0AEC0;">空</div>'}
          </div>
          ${total>1 ? `
            <div id=\"more-${id}\" class=\"js-more token-list collapsible${shouldPreOpen ? ' is-open' : ''}\" style=\"margin-top:8px;\">
              ${(items||[]).slice(1).map(renderItem).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    return html;
  };

      const esc = (s) => (s==null? '' : String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])));
      const HIDE_KEYS = new Set(['_id','__v','_v']);
      const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

      // 递归渲染所有属性，隐藏 _id/__v/_v，并对嵌套对象/数组分层展示
      const renderKV = (obj, level = 0, accent = null, basePath = '') => {
        if (!obj || typeof obj !== 'object') {
          return `<div class="kv-row" data-path="${esc(basePath)}">
            <div class="kv-key">value</div>
            <div class="kv-val" data-path="${esc(basePath)}" data-type="${typeof obj}" title="单击编辑">${esc(obj)}</div>
            <div class="kv-actions" role="group" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
          </div>`;
        }
        const parts = [];
        for (const k of Object.keys(obj)) {
          if (HIDE_KEYS.has(k)) continue;
          const v = obj[k];
          const curPath = basePath ? `${basePath}.${k}` : k;
          if (Array.isArray(v)) {
            const items = v.map((it, idx) => {
              if (isObj(it) || Array.isArray(it)) {
                const style = accent ? ` style="--token-accent:${esc(accent)}"` : '';
                return `<div class="arr-item"><div class="arr-index">#${idx}</div><div class="token-card"${style}>${renderKV(it, level+1, accent, `${curPath}.${idx}`)}</div></div>`;
              }
              return `<div class="kv-row" data-path="${esc(curPath)}.${idx}">
                <div class="kv-key">[${idx}]</div>
                <div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="单击编辑">${esc(it)}</div>
                <div class="kv-actions" role="group" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
              </div>`;
            }).join('');
            parts.push(`
              <div class="nest-block"${accent ? ` style=\"--token-accent:${esc(accent)}\"` : ''}>
                <div class="nest-title">${esc(k)} [${v.length}]</div>
                <div class="nest-body" style="background:transparent">${items || '<div class="kv-row"><div class="kv-key">(空)</div><div class="kv-val"></div></div>'}</div>
              </div>
            `);
          } else if (isObj(v)) {
            parts.push(`
              <div class="nest-block"${accent ? ` style=\"--token-accent:${esc(accent)}\"` : ''}>
                <div class="nest-title">${esc(k)}</div>
                <div class="nest-body" style="background:transparent">${renderKV(v, level+1, accent, curPath)}</div>
              </div>
            `);
          } else {
            parts.push(`<div class="kv-row" data-path="${esc(curPath)}">
              <div class="kv-key">${esc(k)}</div>
              <div class="kv-val" data-path="${esc(curPath)}" data-type="${typeof v}" title="单击编辑">${esc(v)}</div>
              <div class="kv-actions" role="group" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
            </div>`);
          }
        }
        return parts.join('');
      };

      const getAccent = (o) => {
        const v = (o && typeof o.color === 'string') ? o.color.trim() : '';
        if (!v) return null;
        // 仅允许安全颜色值：十六进制或英文命名色
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
        if (/^[a-zA-Z]+$/.test(v)) return v;
        return null;
      };
      // 计算浅色背景：将颜色与白色按比例混合（更浅）
      const computeTint = (col, ratio = 0.95) => {
        if (!col) return '';
        const hexToRgb = (h) => {
          let r,g,b;
          if (/^#([\da-fA-F]{3})$/.test(h)) {
            const m = h.slice(1);
            r = parseInt(m[0] + m[0], 16);
            g = parseInt(m[1] + m[1], 16);
            b = parseInt(m[2] + m[2], 16);
            return {r,g,b};
          }
          if (/^#([\da-fA-F]{6})$/.test(h)) {
            const m = h.slice(1);
            r = parseInt(m.slice(0,2),16);
            g = parseInt(m.slice(2,4),16);
            b = parseInt(m.slice(4,6),16);
            return {r,g,b};
          }
          return null;
        };
        const rgb = hexToRgb(col);
        if (rgb) {
          const r = Math.round(rgb.r * (1 - ratio) + 255 * ratio);
          const g = Math.round(rgb.g * (1 - ratio) + 255 * ratio);
          const b = Math.round(rgb.b * (1 - ratio) + 255 * ratio);
          return `rgba(${r}, ${g}, ${b}, 1)`;
        }
        // 命名色：使用 color-mix 作为回退
        return `color-mix(in srgb, ${col} ${Math.round(ratio*100)}%, white)`;
      };

  const tagAttrs = (coll, obj) => ` data-coll="${coll}" data-id="${esc(obj && obj._id || '')}"`;
  function cardShell(coll, obj, innerHtml) {
    const col = getAccent(obj);
    const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : '';
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      const canEdit = !!token && role === 'admin';
      return `<div class="token-card"${style}${tagAttrs(coll, obj)}>
        ${canEdit ? `<div class="token-card__toolbar" role="toolbar" aria-label="对象操作">` +
          `<button class="btn btn--danger btn--xs btn-del-doc" title="删除对象" aria-label="删除对象">删除对象</button>` +
        `</div>` : ''}
        ${innerHtml}
      </div>`;
  }
  const termFixedItem = (t) => cardShell('term-fixed', t, renderKV(t, 0, getAccent(t), ''));
  const termDynamicItem = (t) => cardShell('term-dynamic', t, renderKV(t, 0, getAccent(t), ''));
  const cardItem = (c) => cardShell('card', c, renderKV(c, 0, getAccent(c), ''));
  const characterItem = (ch) => cardShell('character', ch, renderKV(ch, 0, getAccent(ch), ''));
  const skillItem = (s) => cardShell('skill', s, renderKV(s, 0, getAccent(s), ''));

      // 过滤后的视图
      const q = state.q;
      const sections = [
        { type: 'term-fixed', title: '静态术语', items: Array.isArray(termFixed)? filterByQuery(termFixed, q): [], render: termFixedItem },
        { type: 'term-dynamic', title: '动态术语', items: Array.isArray(termDynamic)? filterByQuery(termDynamic, q): [], render: termDynamicItem },
        { type: 'card', title: '牌', items: Array.isArray(cards)? filterByQuery(cards, q): [], render: cardItem },
        { type: 'character', title: '武将', items: Array.isArray(characters)? filterByQuery(characters, q): [], render: characterItem },
        { type: 'skill', title: '技能', items: Array.isArray(skills)? filterByQuery(skills, q): [], render: skillItem },
      ];
      const filteredSections = state.activeType ? sections.filter(s => s.type === state.activeType) : sections;
  const html = filteredSections.map(s => section(s.type, s.title, s.items, s.render)).join('');
      contentEl.innerHTML = html;
      // 为新渲染的卡片添加入场延迟（交错动画）
      try {
        const cards = contentEl.querySelectorAll('.token-card');
        cards.forEach((el, i) => {
          const delay = Math.min(i, 12) * 40; // 最多 12 个交错
          el.style.setProperty('--enter-delay', delay + 'ms');
        });
      } catch (_) {}
      setupSearch();
      // 绑定类型筛选（只绑定一次）
      (function setupTypeFilter(){
        if (summaryEl.__bindTypeFilter) return;
        summaryEl.__bindTypeFilter = true;
        const handler = (ev) => {
          const t = ev.target && ev.target.closest ? ev.target.closest('.type-tile') : null;
          if (!t) return;
          const tp = t.getAttribute('data-type');
          if (!tp) return;
          // 单选：再次点击取消筛选
          state.activeType = (state.activeType === tp) ? null : tp;
          renderTokensDashboard(false);
        };
        summaryEl.addEventListener('click', handler);
        summaryEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
        });
      })();

  // 启用编辑/删除（仅管理员）
      if (canEdit) {
        if (!contentEl.__inlineEditBound) { enableInlineEdit(contentEl); contentEl.__inlineEditBound = true; }
        if (!contentEl.__inlineDeleteBound) { enableInlineDelete(contentEl); contentEl.__inlineDeleteBound = true; }
        if (!contentEl.__deleteDocBound) { enableDeleteDoc(contentEl); contentEl.__deleteDocBound = true; }
      }
    } catch (e) {
      console.error('加载词元数据失败:', e);
      summaryEl.innerHTML = '<div style="grid-column:1/-1;color:#E53E3E;">加载失败，请点击“刷新”重试</div>';
    }
  }

  // 初次进入页面时预取一次，便于用户切到该页立即可见
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const role = localStorage.getItem('role');
      if (role === 'admin') renderTokensDashboard();
    } catch(e){}
    // Ctrl 键按下状态：用于启用危险操作 UI（删除对象）
    try {
      const setCtrl = (down) => {
        if (down) document.body.classList.add('ctrl-down');
        else document.body.classList.remove('ctrl-down');
      };
      let ctrlLatch = false;
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !ctrlLatch) { ctrlLatch = true; setCtrl(true); }
      });
      window.addEventListener('keyup', (e) => {
        // 当 Ctrl 松开或任意键事件报告 ctrlKey=false 时清除
        if (!e.ctrlKey) { ctrlLatch = false; setCtrl(false); }
      });
      window.addEventListener('blur', () => { ctrlLatch = false; setCtrl(false); });
    } catch(_){}
  });

  // 暴露到全局用于手动刷新
  window.renderTokensDashboard = renderTokensDashboard;
  // 动画展开/收起区块
  window.toggleTokensSection = function(baseId){
    try {
      const root = document.getElementById(baseId);
      if (!root) return;
      const btn = document.getElementById('btn-' + baseId);
      const more = document.getElementById('more-' + baseId) || root.querySelector('.js-more');
      if (!more) return;

      const expanded = root.getAttribute('data-expanded') === '1';
  const transitionMs = 400; // 与 CSS .collapsible 的高度过渡时长对齐
      const setBtn = (isOpen) => {
        if (btn) {
          btn.textContent = isOpen ? '收起' : '展开';
          btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          btn.classList.toggle('is-expanded', isOpen);
        }
      };

      const onEnd = (cb) => {
        let called = false;
        const handler = () => { if (called) return; called = true; more.removeEventListener('transitionend', handler); cb && cb(); };
        more.addEventListener('transitionend', handler, { once: true });
        // 保险兜底
        setTimeout(handler, transitionMs + 50);
      };

      if (!expanded) {
        // 展开
        more.style.display = 'block';
        more.classList.add('is-opening');
        more.style.height = '0px';
        // 强制回流以应用初始高度
        void more.offsetHeight;
        const target = more.scrollHeight;
        more.style.height = target + 'px';
        onEnd(() => {
          more.classList.remove('is-opening');
          more.classList.add('is-open');
          more.style.height = 'auto';
        });
        root.setAttribute('data-expanded', '1');
        setBtn(true);
      } else {
        // 收起
        const from = more.scrollHeight;
        more.style.height = from + 'px';
        // 强制回流
        void more.offsetHeight;
        more.classList.remove('is-open');
        more.classList.add('is-closing');
        more.style.height = '0px';
        onEnd(() => {
          more.classList.remove('is-closing');
          more.style.display = 'none';
          more.style.height = '0px';
        });
        root.setAttribute('data-expanded', '0');
        setBtn(false);
      }
    } catch(_){}
  };
  window.tokensRefresh = function(){
    state.data = null; // 强制重新拉取
    renderTokensDashboard(true);
  };
  // —— 新增：打开创建弹窗 ——
  window.tokensOpenCreate = async function(collection){
    try {
      const token = localStorage.getItem('token') || '';
      const url = `http://localhost:3000/api/tokens/shape?collection=${encodeURIComponent(collection)}`;
      const resp = await fetch(url, { headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
      const shape = await resp.json();
      if (!resp.ok) throw new Error(shape && shape.message || '获取结构失败');
      const tpl = buildTemplate(collection, shape);
      showCreateModal(collection, shape, tpl);
    } catch (e) {
      alert(e.message || '获取结构失败');
    }
  };

  function buildTemplate(collection, shape){
    const byTypeDefault = (t) => t === 'String' ? '' : t === 'Number' ? 0 : t === 'Boolean' ? false : t === 'Array' ? [] : {};
    const obj = {};
    const fields = Array.isArray(shape.fields) ? shape.fields : [];
    for (const f of fields) {
      const name = f.name;
      if (name === '_id' || name === '__v' || name.endsWith('[]')) continue;
      if (f.required) obj[name] = (f.default !== undefined) ? f.default : byTypeDefault(f.type);
    }
    if (collection === 'character') {
      if (shape.suggest && shape.suggest.nextId != null) obj.id = shape.suggest.nextId;
      obj.name = obj.name || '新武将';
      obj.health = obj.health || 1;
      obj.dominator = obj.dominator || 0;
    } else if (collection === 'card') {
      obj.en = obj.en || 'new_card_en';
      obj.cn = obj.cn || '新卡牌';
      obj.type = obj.type || '';
    } else if (collection === 'term-fixed') {
      obj.en = obj.en || 'term_key';
      obj.cn = obj.cn || '术语中文';
      if (obj.part == null) obj.part = {};
      if (obj.epithet == null) obj.epithet = {};
    } else if (collection === 'term-dynamic') {
      obj.en = obj.en || 'term_key';
      if (obj.part == null) obj.part = {};
    } else if (collection === 'skill') {
      obj.name = obj.name || '新技能';
      obj.content = obj.content || '技能描述';
      obj.strength = obj.strength != null ? obj.strength : 0;
      if (!Array.isArray(obj.role)) obj.role = [];
    }
    return obj;
  }

  function ensureCreateModal(){
    let backdrop = document.getElementById('tokens-create-backdrop');
    let modal = document.getElementById('tokens-create-modal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tokens-create-backdrop';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tokens-create-modal';
      modal.className = 'modal approve-modal';
      modal.innerHTML = `
        <div class="modal-header"><h2>新增对象</h2></div>
        <div class="modal-form" style="display:grid;grid-template-columns:320px 1fr;gap:12px;">
          <div id="tokens-create-hints" style="font-size:12px;color:#4A5568;background:#F7FAFC;border:1px solid #e2e8f0;border-radius:8px;padding:10px;"></div>
          <textarea id="tokens-create-editor" style="min-height:200px;width:100%;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:12px; line-height:1.4; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#fff; box-sizing:border-box;"></textarea>
          <div id="tokens-create-actions" style="grid-column:1 / -1;position:sticky;bottom:0;display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn btn--secondary" id="tokens-create-cancel">取消</button>
            <button type="button" class="btn btn--primary" id="tokens-create-submit">创建</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      backdrop.addEventListener('click', hideCreateModal);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCreateModal(); });
    }
    return { backdrop, modal };
  }

  function showCreateModal(collection, shape, tpl){
    const { backdrop, modal } = ensureCreateModal();
    const editor = modal.querySelector('#tokens-create-editor');
    const hints = modal.querySelector('#tokens-create-hints');
    const btnCancel = modal.querySelector('#tokens-create-cancel');
    const btnSubmit = modal.querySelector('#tokens-create-submit');
    const fields = shape && Array.isArray(shape.fields) ? shape.fields : [];
    const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const list = (fields
      .filter(f => !f.name.endsWith('[]') && f.name !== '_id' && f.name !== '__v')
      .map(f => {
        const badge = `(${f.type}${f.enum ? ': ' + f.enum.join('|') : ''})`;
        const bullet = f.required ? '•' : '○';
        return `
          <div class="hint-row">
            <div class="hint-name">${bullet} ${escHtml(f.name)}</div>
            <div class="hint-type">${escHtml(badge)}</div>
          </div>`;
      })
      .join(''));
    const extra = shape && shape.suggest && shape.suggest.mixedKeys && shape.suggest.mixedKeys.length
      ? `<div style="margin-top:6px;color:#718096;">可能的可选键：${shape.suggest.mixedKeys.slice(0,20).join(', ')}${shape.suggest.mixedKeys.length>20?' …':''}</div>`
      : '';
  hints.innerHTML = `<div><strong>${collection}</strong> 字段（• 必填）：</div><div class="hints-list" style="margin-top:6px;">${list || '无'}</div>${extra}`;
    editor.value = JSON.stringify(tpl || {}, null, 2);
    const submit = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        let payload;
        try { payload = JSON.parse(editor.value); } catch (_) { throw new Error('JSON 不合法'); }
        const resp = await fetch('http://localhost:3000/api/tokens/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          body: JSON.stringify({ collection, data: payload })
        });
        const out = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(out && out.message || '创建失败');
        const doc = out.doc;
        // 更新缓存
        try {
          if (!state.data) state.data = {};
          if (collection === 'term-fixed') {
            state.data.termFixed = Array.isArray(state.data.termFixed) ? state.data.termFixed : [];
            state.data.termFixed.unshift(doc);
          } else if (collection === 'term-dynamic') {
            state.data.termDynamic = Array.isArray(state.data.termDynamic) ? state.data.termDynamic : [];
            state.data.termDynamic.unshift(doc);
          } else if (collection === 'card') {
            state.data.cards = Array.isArray(state.data.cards) ? state.data.cards : [];
            state.data.cards.unshift(doc);
          } else if (collection === 'character') {
            state.data.characters = Array.isArray(state.data.characters) ? state.data.characters : [];
            state.data.characters.unshift(doc);
          } else if (collection === 'skill') {
            const s = Number(doc && doc.strength);
            if (s === 1) {
              state.data.s1 = Array.isArray(state.data.s1) ? state.data.s1 : [];
              state.data.s1.unshift(doc);
            } else if (s === 2) {
              state.data.s2 = Array.isArray(state.data.s2) ? state.data.s2 : [];
              state.data.s2.unshift(doc);
            } else {
              state.data.s0 = Array.isArray(state.data.s0) ? state.data.s0 : [];
              state.data.s0.unshift(doc);
            }
          }
        } catch(_){}
        hideCreateModal();
        try { showTokensToast('创建成功'); } catch(_){}
        renderTokensDashboard(false);
      } catch (e) {
        alert(e.message || '创建失败');
      }
    };
    btnCancel.onclick = hideCreateModal;
    btnSubmit.onclick = submit;
    backdrop.classList.add('show');
    modal.classList.add('show');
    setTimeout(() => { try { editor.focus(); } catch(_){} }, 50);
  }

  function hideCreateModal(){
    const backdrop = document.getElementById('tokens-create-backdrop');
    const modal = document.getElementById('tokens-create-modal');
    if (backdrop) backdrop.classList.remove('show');
    if (modal) modal.classList.remove('show');
  }
  
  // 事件委托与更新逻辑
  function enableInlineEdit(rootEl) {
  if (rootEl.__inlineEditBound) return; rootEl.__inlineEditBound = true;
    rootEl.addEventListener('click', function(ev) {
  // 按住 Ctrl 时禁用属性编辑，保留整对象删除入口
  if (ev.ctrlKey || document.body.classList.contains('ctrl-down')) return;
      const host = ev.target && ev.target.closest ? ev.target.closest('.kv-val') : null;
      if (!host) return;
      const target = host;
      // 若已有其他编辑框，先关闭它，避免两个动画叠加
      const openEditing = rootEl.querySelector('.kv-val[data-editing="1"]');
      if (openEditing && openEditing !== target) {
        // 找到其输入框，触发一次安全的还原
        const old = openEditing.getAttribute('data-old-text') || '';
        openEditing.textContent = old;
        openEditing.removeAttribute('data-editing');
        openEditing.removeAttribute('data-old-text');
        openEditing.classList.remove('is-editing','is-saving');
      }
      const path = target.getAttribute('data-path');
      // 屏蔽非法或空路径、隐藏字段
      if (!path || path.startsWith('_') || path.includes('.__v')) return;
      const type = target.getAttribute('data-type') || 'string';
  // 向上查找带数据属性的卡片（顶层 token-card 才有 data-coll/data-id）
  const tokenCard = target.closest('.token-card[data-coll][data-id]');
      if (!tokenCard) return;
      const coll = tokenCard.getAttribute('data-coll');
      const id = tokenCard.getAttribute('data-id');
      if (!coll || !id) return;

  // 避免重复编辑同一元素
  if (target.getAttribute('data-editing') === '1') return;
  // 若内部已有输入控件（点击到控件本身），则忽略
  if (target.querySelector('.inline-edit')) return;
    target.setAttribute('data-editing', '1');
  const oldText = target.textContent;
  // 存储原始文本，便于在强制关闭上一个编辑框时准确还原
  target.setAttribute('data-old-text', oldText);
  // 标记编辑态，使用 CSS 控制视觉而非内联阴影
  target.classList.add('is-editing');

  // 判断是否颜色字段（更严格）：仅当键名以 color 结尾，或值为十六进制/函数色值
  const looksLikeHex = (s) => /^#([\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test((s||'').trim());
  const looksLikeFuncColor = (s) => /^(?:rgb|rgba|hsl|hsla)\s*\(/i.test((s||'').trim());
  const endsWithColorKey = /(^|\.)color$/i.test(path);
  const isColorField = endsWithColorKey || looksLikeHex(oldText) || looksLikeFuncColor(oldText);

  let input; // 将用于提交的输入控件
  let colorPicker = null;
  const applyPreview = (val) => {
    try {
      if (!tokenCard || !val) return;
      const col = String(val).trim();
      if (!col) return;
      const tint = computeTint(col);
      tokenCard.style.setProperty('--token-accent', col);
      if (tint) tokenCard.style.setProperty('--token-bg', tint);
      tokenCard.style.borderLeft = `3px solid ${col}`;
    } catch(_){}
  };

  if (isColorField) {
    const wrap = document.createElement('div');
    wrap.className = 'inline-edit-color';
  // 入场动画触发：先加 is-enter 再下一帧移除
  try { wrap.classList.add('is-enter'); requestAnimationFrame(() => { try { wrap.classList.remove('is-enter'); } catch(_){} }); } catch(_){ }
    colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'color-picker';
    const to6Hex = (s) => {
      s = (s||'').trim();
      if (!s.startsWith('#')) return null;
      const hex = s.slice(1);
      if (hex.length === 3) return '#' + hex.split('').map(c=>c+c).join('');
      if (hex.length === 4) return '#' + hex.slice(0,3).split('').map(c=>c+c).join('');
      if (hex.length === 6) return '#' + hex;
      if (hex.length === 8) return '#' + hex.slice(0,6);
      return null;
    };
    colorPicker.value = to6Hex(oldText) || '#3399ff';
    const text = document.createElement('input');
    text.type = 'text';
    text.value = oldText;
    text.className = 'inline-edit';
    wrap.appendChild(colorPicker);
    wrap.appendChild(text);
    // 清空并插入
    target.textContent = '';
    target.appendChild(wrap);
    input = text;

    // 联动：picker -> text；text -> picker（仅 hex 时）并实时预览
    colorPicker.addEventListener('input', () => {
      const v = colorPicker.value;
      input.value = v;
      applyPreview(v);
  // 小脉冲提示
  try { colorPicker.classList.remove('is-pulse'); void colorPicker.offsetWidth; colorPicker.classList.add('is-pulse'); } catch(_){ }
    });
    colorPicker.addEventListener('change', () => {
      const v = colorPicker.value;
      input.value = v;
      commit();
    });
    input.addEventListener('input', () => {
      const v = input.value;
      if (looksLikeHex(v)) {
        const hx = to6Hex(v);
        if (hx) colorPicker.value = hx;
      }
      applyPreview(v);
    });
    input.focus();
    input.select();
  } else {
    const ta = document.createElement('textarea');
    ta.value = oldText;
  ta.className = 'inline-edit';
  // 入场动画：添加 is-enter 再在下一帧移除
  try { ta.classList.add('is-enter'); requestAnimationFrame(() => { try { ta.classList.remove('is-enter'); } catch(_){} }); } catch(_){ }
    ta.setAttribute('rows', '1');
    ta.setAttribute('wrap', 'soft');
    // 清空并插入
    target.textContent = '';
    target.appendChild(ta);
    input = ta;
    // 自动高度
    const autoSize = () => { try { ta.style.height = 'auto'; ta.style.height = Math.max(24, ta.scrollHeight) + 'px'; } catch(_){} };
    ta.addEventListener('input', autoSize);
    autoSize();
    ta.focus();
    ta.select();
  }
  // 删除逻辑已在顶层定义

  // 删除逻辑已在顶层定义

      let committing = false; // 标记是否正在提交，避免 blur 触发还原造成闪烁
      let revertTimer = null; // 延迟还原，平滑从一个编辑框切换到另一个
      const cleanup = () => {
        committing = false;
        target.removeAttribute('data-editing');
        target.classList.remove('is-editing');
        target.classList.remove('is-saving');
        target.removeAttribute('data-old-text');
        if (revertTimer) { clearTimeout(revertTimer); revertTimer = null; }
      };

      const revert = () => {
        target.textContent = oldText;
        cleanup();
      };

      const convertValue = (txt, t) => {
        if (t === 'number') {
          const n = Number(txt.trim());
          if (Number.isNaN(n)) throw new Error('请输入数字');
          return n;
        }
        if (t === 'boolean') {
          const s = txt.trim().toLowerCase();
          if (s === 'true') return true;
          if (s === 'false') return false;
          throw new Error('请输入 true 或 false');
        }
        return txt; // 默认字符串
      };

      const commit = async () => {
        const txt = input.value;
        // 未变化直接还原
        if (txt === oldText) { revert(); return; }
        let value;
        try {
          value = convertValue(txt, type);
        } catch (err) {
          alert(err.message || '值不合法');
          return;
        }
  input.disabled = true;
  target.classList.add('is-saving');
        committing = true;
        try {
          const token = localStorage.getItem('token') || '';
          const resp = await fetch('http://localhost:3000/api/tokens/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ collection: coll, id, path, value, valueType: type })
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(data && data.message || '更新失败');
          // 成功：更新文本并显示绿色提示小弹窗（toast）
          target.textContent = (type === 'boolean' || type === 'number') ? String(value) : value;
          try {
            showTokensToast('已保存');
          } catch(_){ }
          // 同步更新缓存数据，确保后续刷新/折叠展开不丢失
          try {
            if (state.data) {
              const updateDocIn = (arr) => {
                if (!Array.isArray(arr)) return false;
                for (const doc of arr) {
                  if (doc && String(doc._id) === String(id)) {
                    setByPath(doc, path, value);
                    return true;
                  }
                }
                return false;
              };
              let updated = false;
              if (coll === 'term-fixed') updated = updateDocIn(state.data.termFixed);
              else if (coll === 'term-dynamic') updated = updateDocIn(state.data.termDynamic);
              else if (coll === 'card') updated = updateDocIn(state.data.cards);
              else if (coll === 'character') updated = updateDocIn(state.data.characters);
              else if (coll === 'skill') {
                updated = updateDocIn(state.data.s0) || updateDocIn(state.data.s1) || updateDocIn(state.data.s2);
              }
              // 兜底：全量扫描
              if (!updated) {
                for (const key of Object.keys(state.data)) {
                  if (updateDocIn(state.data[key])) { updated = true; break; }
                }
              }
            }
          } catch (_) {}
          // 若修改的是顶层 color，则同步更新卡片样式
          if (path === 'color') {
            const col = value;
            const tint = computeTint(col);
            if (tokenCard && col) {
              tokenCard.style.setProperty('--token-accent', col);
              if (tint) tokenCard.style.setProperty('--token-bg', tint);
              tokenCard.style.borderLeft = `3px solid ${col}`;
            }
          }
          cleanup();
        } catch (e) {
          alert(e.message || '更新失败');
          revert();
        }
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); revert(); }
      });
      const safeBlur = () => {
        if (committing) return;
        // 稍作延时，若焦点仍在当前编辑容器内，则不还原
        revertTimer = setTimeout(() => {
          if (committing) return;
          const ae = document.activeElement;
          if (!target.contains(ae)) revert();
        }, 110);
      };
      input.addEventListener('blur', safeBlur);
      if (colorPicker) {
        colorPicker.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); revert(); }
        });
        colorPicker.addEventListener('blur', safeBlur);
      }
    });
  }
  
  // 删除逻辑：点击删除按钮 -> 确认 -> 调用后端 -> 更新缓存与 DOM（顶层）
  function enableInlineDelete(rootEl) {
  if (rootEl.__inlineDeleteBound) return; rootEl.__inlineDeleteBound = true;
    rootEl.addEventListener('click', async function(ev) {
      // 按住 Ctrl 时拦截属性删除
      if (ev.ctrlKey || document.body.classList.contains('ctrl-down')) {
        const maybe = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
        if (maybe) {
          try { showTokensToast('按 Ctrl 时仅支持删除对象'); } catch(_){}
          ev.preventDefault();
          return;
        }
      }
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
      if (!btn) return;
      const row = btn.closest('.kv-row');
      if (!row) return;
      const path = row.getAttribute('data-path');
      if (!path || path.startsWith('_') || path.includes('.__v')) return;
      const tokenCard = row.closest('.token-card[data-coll][data-id]');
      if (!tokenCard) return;
      const coll = tokenCard.getAttribute('data-coll');
      const id = tokenCard.getAttribute('data-id');
      // 二次确认
      const keyNameEl = row.querySelector('.kv-key');
      const keyName = keyNameEl ? keyNameEl.textContent.trim() : path.split('.').pop();
      if (!confirm(`确定删除「${keyName}」吗？此操作不可撤销。`)) return;
      // 调后端
      try {
        const token = localStorage.getItem('token') || '';
        const resp = await fetch('http://localhost:3000/api/tokens/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ collection: coll, id, path })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data && data.message || '删除失败');
        // 成功：从缓存中移除
        try {
          if (state.data) {
            const deleteIn = (arr) => {
              if (!Array.isArray(arr)) return false;
              for (const doc of arr) {
                if (doc && String(doc._id) === String(id)) {
                  const parts = String(path).split('.');
                  let parent = doc;
                  for (let i = 0; i < parts.length - 1; i++) {
                    const k = parts[i];
                    const key = /^\d+$/.test(k) ? Number(k) : k;
                    parent = parent ? parent[key] : undefined;
                  }
                  const lastRaw = parts[parts.length - 1];
                  const isIdx = /^\d+$/.test(lastRaw);
                  const lastKey = isIdx ? Number(lastRaw) : lastRaw;
                  if (Array.isArray(parent) && isIdx) parent.splice(lastKey, 1);
                  else if (parent && typeof parent === 'object') delete parent[lastKey];
                  return true;
                }
              }
              return false;
            };
            let updated = false;
            if (coll === 'term-fixed') updated = deleteIn(state.data.termFixed);
            else if (coll === 'term-dynamic') updated = deleteIn(state.data.termDynamic);
            else if (coll === 'card') updated = deleteIn(state.data.cards);
            else if (coll === 'character') updated = deleteIn(state.data.characters);
            else if (coll === 'skill') {
              updated = deleteIn(state.data.s0) || deleteIn(state.data.s1) || deleteIn(state.data.s2);
            }
            if (!updated) {
              for (const key of Object.keys(state.data)) {
                if (deleteIn(state.data[key])) { updated = true; break; }
              }
            }
          }
        } catch(_){ }
        // 从 DOM 移除行
        row.remove();
        try { showTokensToast('已删除'); } catch(_){ }
      } catch (e) {
        alert(e.message || '删除失败');
      }
    });
  }
  // 词元页绿色提示小弹窗（toast）
  function showTokensToast(message) {
    try {
      let container = document.querySelector('.tokens-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'tokens-toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = 'tokens-toast';
      toast.textContent = message || '操作成功';
      container.appendChild(toast);
      // 自动移除
      setTimeout(() => {
        try { toast.remove(); } catch(_) {}
        // 若容器空了也移除
        if (container && container.children.length === 0) {
          try { container.remove(); } catch(_) {}
        }
      }, 2200);
    } catch(_) { /* 忽略 */ }
  }

  // 删除整个对象（文档）
  function enableDeleteDoc(rootEl){
  if (rootEl.__deleteDocBound) return; rootEl.__deleteDocBound = true;
    rootEl.addEventListener('click', async function(ev){
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del-doc') : null;
      if (!btn) return;
      // 需要按住 Ctrl 键
      if (!ev.ctrlKey && !document.body.classList.contains('ctrl-down')) {
        try { showTokensToast('按住 Ctrl 键以启用删除'); } catch(_){}
        return;
      }
      const card = btn.closest('.token-card[data-coll][data-id]');
      if (!card) return;
      const coll = card.getAttribute('data-coll');
      const id = card.getAttribute('data-id');
      if (!coll || !id) return;
      if (!confirm('确定删除整个对象吗？此操作不可撤销。')) return;
      try {
        const token = localStorage.getItem('token') || '';
        const resp = await fetch('http://localhost:3000/api/tokens/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          body: JSON.stringify({ collection: coll, id })
        });
        const data = await resp.json().catch(()=>({}));
        if (!resp.ok) throw new Error(data && data.message || '删除失败');
        // 更新缓存
        try {
          if (state.data) {
            const removeFrom = (arr) => {
              if (!Array.isArray(arr)) return false;
              const i = arr.findIndex(d => d && String(d._id) === String(id));
              if (i >= 0) { arr.splice(i, 1); return true; }
              return false;
            };
            if (coll === 'term-fixed') removeFrom(state.data.termFixed);
            else if (coll === 'term-dynamic') removeFrom(state.data.termDynamic);
            else if (coll === 'card') removeFrom(state.data.cards);
            else if (coll === 'character') removeFrom(state.data.characters);
            else if (coll === 'skill') { removeFrom(state.data.s0); removeFrom(state.data.s1); removeFrom(state.data.s2); }
          }
        } catch(_){ }
        // 从 DOM 移除卡片
        card.remove();
        try { showTokensToast('对象已删除'); } catch(_){ }
      } catch (e) {
        alert(e.message || '删除失败');
      }
    });
  }
})();
