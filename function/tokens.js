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
        return `
          <div class="type-tile${active}" data-type="${t.type}" role="button" tabindex="0" aria-pressed="${isActive}"
               style="border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:${t.color}">
            <div style="font-size:12px;color:#4A5568;">${t.key}</div>
            <div style="font-weight:700; font-size:22px; color:#2D3748;">${t.value}</div>
          </div>
        `;
      }).join('');

  const section = (title, items, renderItem) => {
    const id = 'sec-' + Math.random().toString(36).slice(2,8);
    const total = Array.isArray(items)? items.length : 0;
    const preview = (items||[]).slice(0, 2);
    const html = `
      <div style="border:1px solid #e2e8f0; border-radius:8px; margin-top:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F7FAFC; border-bottom:1px solid #e2e8f0;">
          <div style=\"font-weight:600; color:#2D3748;\">${title} <span class=\"count-badge\" style=\"color:#718096;font-weight:400;\">(${total})</span></div>
          ${total>2 ? `<button id=\"btn-${id}\" class=\"btn btn--secondary btn--sm expand-btn\" aria-expanded=\"false\" onclick=\"toggleTokensSection('${id}')\">展开</button>`: ''}
        </div>
        <div id="${id}" data-expanded="0" style="padding:10px 12px;">
          <div class="token-list">
            ${preview.map(renderItem).join('') || '<div style="color:#A0AEC0;">空</div>'}
          </div>
          ${total>2 ? `
            <div id=\"more-${id}\" class=\"js-more token-list collapsible\" style=\"margin-top:8px;\">
              ${(items||[]).slice(2).map(renderItem).join('')}
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
          return `<div class="kv-row" data-path="${esc(basePath)}"><div class="kv-key">value</div><div class="kv-val" data-path="${esc(basePath)}" data-type="${typeof obj}">${esc(obj)}</div></div>`;
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
              return `<div class="kv-row" data-path="${esc(curPath)}.${idx}"><div class="kv-key">[${idx}]</div><div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="单击编辑">${esc(it)}</div></div>`;
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
            parts.push(`<div class="kv-row" data-path="${esc(curPath)}"><div class="kv-key">${esc(k)}</div><div class="kv-val" data-path="${esc(curPath)}" data-type="${typeof v}" title="单击编辑">${esc(v)}</div></div>`);
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
  const termFixedItem = (t) => { const col = getAccent(t); const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : ''; return `<div class="token-card"${style}${tagAttrs('term-fixed', t)}>${renderKV(t, 0, col, '')}</div>`; };
  const termDynamicItem = (t) => { const col = getAccent(t); const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : ''; return `<div class="token-card"${style}${tagAttrs('term-dynamic', t)}>${renderKV(t, 0, col, '')}</div>`; };
  const cardItem = (c) => { const col = getAccent(c); const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : ''; return `<div class="token-card"${style}${tagAttrs('card', c)}>${renderKV(c, 0, col, '')}</div>`; };
  const characterItem = (ch) => { const col = getAccent(ch); const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : ''; return `<div class="token-card"${style}${tagAttrs('character', ch)}>${renderKV(ch, 0, col, '')}</div>`; };
  const skillItem = (s) => { const col = getAccent(s); const style = col ? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"` : ''; return `<div class="token-card"${style}${tagAttrs('skill', s)}>${renderKV(s, 0, col, '')}</div>`; };

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
      const html = filteredSections.map(s => section(s.title, s.items, s.render)).join('');
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

  // 启用双击编辑（仅管理员）
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
  const canEdit = !!token && role === 'admin';
      if (canEdit) {
        enableInlineEdit(contentEl);
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
  
  // 事件委托与更新逻辑
  function enableInlineEdit(rootEl) {
    rootEl.addEventListener('click', function(ev) {
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
})();
