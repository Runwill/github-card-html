;(function(){
  const onReady = (cb)=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', cb, {once:true}) : cb();
  const t = (typeof window.t==='function') ? window.t : (k)=>k;
  const $ = (id)=> document.getElementById(id);
  const h = (tag, cls, text)=> { const e = document.createElement(tag); if(cls) e.className = cls; if(text!==undefined) e.textContent = text; return e; };
  // 前端直读：使用相对路径，不再通过后端基址

  let cached = null; let loading = false; let lastError = null;

  // 鼠标位置追踪（用于滚动时计算悬浮态）
  let gMx = 0, gMy = 0;
  try { document.addEventListener('mousemove', (e)=>{ gMx=e.clientX; gMy=e.clientY; }, {passive:true}); } catch(_){}

  function attachScrollHover(container){
    if (!container || container.__scrollHoverBound) return;
    container.__scrollHoverBound = true;

    const clear = ()=> {
      const els = container.querySelectorAll('.ann-card.is-hovered');
      els.forEach(el => el.classList.remove('is-hovered'));
    };

    // 滚动时手动计算 hover
    container.addEventListener('scroll', ()=>{
      if (container._ticking) return;
      container._ticking = true;
      requestAnimationFrame(()=>{
        clear();
        try {
          const el = document.elementFromPoint(gMx, gMy);
          if (el) {
            const card = el.closest('.ann-card');
            if (card && container.contains(card)) card.classList.add('is-hovered');
          }
        } catch(_){}
        container._ticking = false;
      });
    }, {passive:true});

    // 鼠标移动时清除手动状态，交还给 CSS :hover
    container.addEventListener('mousemove', clear, {passive:true});
    container.addEventListener('mouseleave', clear, {passive:true});
  }

  async function fetchAnnouncements(){
    const url = 'base/announcements.json';
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    // 仅支持规范结构：{ announcements: [] }
    return (data && Array.isArray(data.announcements)) ? data.announcements : [];
  }

  function render(list){
    const container = $('announcements-content');
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0){
      container.appendChild(h('div','ann-empty',t('announcements.empty')));
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((it)=>{
      const card = h('div','ann-card');
      if (it.important) card.classList.add('is-important');
      
      const title = h('div','ann-card-title', it.title || '');
      if (it.important) {
        title.prepend(h('span','ann-badge-important','★ ' + t('announcements.important', '重要')));
      }

      const meta = h('div','ann-card-meta', it.date ? String(it.date) : '');
      const body = h('div','ann-card-body');
      // 规范结构：changes 数组（字符串或对象）
      if (Array.isArray(it.changes) && it.changes.length) {
        const ul = document.createElement('ul');
        ul.className = 'ann-changes';

        const buckets = new Map();
        const order = ['新增', '优化', '修复'];
        const alias = {
          '添加': '新增',
          '样式': '优化', '交互': '优化', '动画': '优化', '名片': '优化',
          '逻辑': '优化', '性能': '优化', '体验': '优化',
          '结构': '优化', '修改': '优化'
        };
        const others = [];

        it.changes.forEach((ch) => {
          if (typeof ch !== 'string') { others.push({ content: ch }); return; }
          const match = ch.match(/^(.+?)：(.*)$/);
          if (match) {
            let key = match[1];
            if (alias[key]) key = alias[key];
            if (order.includes(key)) {
              if (!buckets.has(key)) buckets.set(key, []);
              buckets.get(key).push(match[2]);
            } else { others.push({ content: ch }); }
          } else { others.push({ content: ch }); }
        });

        order.forEach(key => {
          if (buckets.has(key)) {
            const list = buckets.get(key);
            if (list.length > 0) {
              const liGroup = h('li','ann-group');
              liGroup.appendChild(h('span',`ann-group-label ann-label-${key}`, key));
              const subUl = h('ul','ann-sub-list');
              list.forEach(text => {
                const subLi = document.createElement('li');
                subLi.innerHTML = text;
                subUl.appendChild(subLi);
              });
              liGroup.appendChild(subUl);
              ul.appendChild(liGroup);
            }
          }
        });

        others.forEach(item => {
          const li = document.createElement('li');
          const ch = item.content;
          if (typeof ch === 'string') { li.textContent = ch; }
          else if (ch && typeof ch === 'object') {
            if (ch.html) li.innerHTML = String(ch.html);
            else if (ch.text) li.textContent = String(ch.text);
            else if (ch.title) li.textContent = String(ch.title);
            else li.textContent = '';
          } else { li.textContent = ''; }
          ul.appendChild(li);
        });
        body.appendChild(ul);
      }
      card.appendChild(title); card.appendChild(meta); card.appendChild(body);
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  async function load(){
    const container = $('announcements-content');
    if (!container) return;
    attachScrollHover(container);
  container.textContent = '';
  container.appendChild(h('div','ann-loading','...'));
    try {
      loading = true; lastError = null;
      const data = await fetchAnnouncements();
      cached = data; render(cached);
    } catch(err){
      lastError = err;
      container.textContent = t('announcements.error.loadFailed');
    } finally { loading = false; }
  }

  // 暴露给 bindings 调用
  window.loadAnnouncements = function(){
    // 每次点击都尝试刷新；如需缓存可判断 cached
    return load();
  };

  // 可选：当语言切换时重新应用容器中的 i18n（内容本身不翻译）
  try { window.addEventListener('i18n:changed', ()=>{ const el=$('announcements-modal'); if(el && typeof window.i18n?.apply==='function'){ window.i18n.apply(el); } }); } catch(_){ }
})();
