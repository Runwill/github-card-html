// 拉取并渲染词元仪表盘
(function(){
  // 简单缓存与搜索状态
  const state = {
    data: null,
    q: '',
    timer: null,
  };

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
        { key: '静态术语', value: Array.isArray(termFixed)? termFixed.length : 0, color: '#EDF2F7' },
        { key: '动态术语', value: Array.isArray(termDynamic)? termDynamic.length : 0, color: '#E6FFFA' },
        { key: '牌', value: Array.isArray(cards)? cards.length : 0, color: '#FEF3C7' },
        { key: '武将', value: Array.isArray(characters)? characters.length : 0, color: '#E9D8FD' },
        { key: '技能', value: Array.isArray(skills)? skills.length : 0, color: '#C6F6D5' },
      ];
      summaryEl.innerHTML = tiles.map(t => `
        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:${t.color}">
          <div style="font-size:12px;color:#4A5568;">${t.key}</div>
          <div style="font-weight:700; font-size:22px; color:#2D3748;">${t.value}</div>
        </div>
      `).join('');

  const section = (title, items, renderItem) => {
    const id = 'sec-' + Math.random().toString(36).slice(2,8);
        const total = Array.isArray(items)? items.length : 0;
        const preview = (items||[]).slice(0, 10);
        const html = `
          <div style="border:1px solid #e2e8f0; border-radius:8px; margin-top:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#F7FAFC; border-bottom:1px solid #e2e8f0;">
      <div style=\"font-weight:600; color:#2D3748;\">${title} <span class=\"count-badge\" style=\"color:#718096;font-weight:400;\">(${total})</span></div>
      ${total>10 ? `<button id=\"btn-${id}\" class=\"btn btn--sm\" onclick=\"(function(){var el=document.getElementById('${id}'); if(!el) return; var expanded=el.getAttribute('data-expanded')==='1'; var next=!expanded; el.setAttribute('data-expanded', next?'1':'0'); var more=el.querySelector('.js-more'); if(more){more.style.display= next?'block':'none';} var btn=document.getElementById('btn-${id}'); if(btn){btn.textContent= next?'收起':'展开';}})()\">展开</button>`: ''}
            </div>
            <div id="${id}" data-expanded="0" style="padding:10px 12px;">
              <div class="token-list">
                ${preview.map(renderItem).join('') || '<div style="color:#A0AEC0;">空</div>'}
              </div>
              ${total>10 ? `<div class=\"js-more token-list\" style=\"display:none; margin-top:8px;\">${(items||[]).slice(10).map(renderItem).join('')}</div>` : ''}
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
              return `<div class="kv-row" data-path="${esc(curPath)}.${idx}"><div class="kv-key">[${idx}]</div><div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="双击编辑">${esc(it)}</div></div>`;
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
            parts.push(`<div class="kv-row" data-path="${esc(curPath)}"><div class="kv-key">${esc(k)}</div><div class="kv-val" data-path="${esc(curPath)}" data-type="${typeof v}" title="双击编辑">${esc(v)}</div></div>`);
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
      const html = [
        section('静态术语', Array.isArray(termFixed)? filterByQuery(termFixed, q): [], termFixedItem),
        section('动态术语', Array.isArray(termDynamic)? filterByQuery(termDynamic, q): [], termDynamicItem),
        section('牌', Array.isArray(cards)? filterByQuery(cards, q): [], cardItem),
        section('武将', Array.isArray(characters)? filterByQuery(characters, q): [], characterItem),
        section('技能', Array.isArray(skills)? filterByQuery(skills, q): [], skillItem),
      ].join('');
      contentEl.innerHTML = html;
      setupSearch();

      // 启用双击编辑（仅管理员或审核员）
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      const canEdit = !!token && (role === 'admin' || role === 'moderator');
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
  window.tokensRefresh = function(){
    state.data = null; // 强制重新拉取
    renderTokensDashboard(true);
  };
  
  // 事件委托与更新逻辑
  function enableInlineEdit(rootEl) {
    rootEl.addEventListener('dblclick', function(ev) {
      const target = ev.target;
      if (!target || !target.classList || !target.classList.contains('kv-val')) return;
      const path = target.getAttribute('data-path');
      // 屏蔽非法或空路径、隐藏字段
      if (!path || path.startsWith('_') || path.includes('.__v')) return;
      const type = target.getAttribute('data-type') || 'string';
      const tokenCard = target.closest('.token-card');
      if (!tokenCard) return;
      const coll = tokenCard.getAttribute('data-coll');
      const id = tokenCard.getAttribute('data-id');
      if (!coll || !id) return;

      // 避免重复编辑同一元素
      if (target.getAttribute('data-editing') === '1') return;
      target.setAttribute('data-editing', '1');
      const oldText = target.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = oldText;
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.font = 'inherit';
      input.style.padding = '2px 6px';
      input.style.border = '1px solid #CBD5E0';
      input.style.borderRadius = '4px';
      // 清空并插入输入框
      target.textContent = '';
      target.appendChild(input);
      input.focus();
      input.select();

      const cleanup = () => {
        target.removeAttribute('data-editing');
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
        input.style.opacity = '0.6';
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
          // 成功：更新文本
          target.textContent = (type === 'boolean' || type === 'number') ? String(value) : value;
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
          target.style.background = '#F0FFF4';
          setTimeout(() => { target.style.background = ''; }, 400);
          cleanup();
        } catch (e) {
          alert(e.message || '更新失败');
          revert();
        }
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); revert(); }
      });
      input.addEventListener('blur', () => {
        // 失焦取消编辑，不保存
        revert();
      });
    });
  }
})();
