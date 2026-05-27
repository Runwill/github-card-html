  const t = (typeof window.t==='function') ? window.t : (k)=>k;
  const $ = (id)=> document.getElementById(id);
  const h = (tag, cls, text)=> { const e = document.createElement(tag); if(cls) e.className = cls; if(text!==undefined) e.textContent = text; return e; };
  const ANN_URL = 'base/announcements.json';
  const OPEN_RENDER_DELAY = 280;
  let dataCache = null;
  let dataPromise = null;
  let renderSeq = 0;
  // 前端直读：使用相对路径，不再通过后端基址

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
          const card = document.elementFromPoint(gMx, gMy)?.closest?.('.ann-card');
          if (card && container.contains(card)) card.classList.add('is-hovered');
        } catch(_){}
        container._ticking = false;
      });
    }, {passive:true});

    // 鼠标移动时清除手动状态，交还给 CSS :hover
    container.addEventListener('mousemove', clear, {passive:true});
    container.addEventListener('mouseleave', clear, {passive:true});
  }

  async function fetchAnnouncements(force){
    if (!force && dataCache) return dataCache;
    if (!force && dataPromise) return dataPromise;
    const loader = window.AppPreload?.json
      ? window.AppPreload.json(ANN_URL, { cache: 'no-cache' })
      : fetch(ANN_URL, { cache: 'no-cache' }).then(res => {
          if (!res.ok) throw new Error('HTTP '+res.status);
          return res.json();
        });
    dataPromise = Promise.resolve(loader)
      .then(data => {
        dataCache = (data && Array.isArray(data.announcements)) ? data.announcements : [];
        return dataCache;
      })
      .finally(() => { dataPromise = null; });
    return dataPromise;
  }

  function render(list){
    const container = $('announcements-content');
    if (!container) return;
    if (!Array.isArray(list) || list.length === 0){
      container.replaceChildren(h('div','ann-empty',t('announcements.empty')));
      container.dataset.announcementsRendered = '1';
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
          const list = buckets.get(key);
          if (list && list.length > 0) {
              const liGroup = h('li','ann-group');
              liGroup.append(h('span',`ann-group-label ann-label-${key}`, key));
              const subUl = h('ul','ann-sub-list');
              list.forEach(text => {
                const subLi = document.createElement('li');
                subLi.innerHTML = text;
                subUl.append(subLi);
              });
              liGroup.append(subUl);
              ul.append(liGroup);
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
          ul.append(li);
        });
        body.append(ul);
      }
      card.append(title, meta, body);
      frag.append(card);
    });
    container.replaceChildren(frag);
    container.dataset.announcementsRendered = '1';
  }

  function showLoading(container){
    if (!container || container.dataset.announcementsRendered === '1') return;
    container.replaceChildren(h('div','ann-loading','...'));
  }

  async function load(options){
    const opts = options || {};
    const container = $('announcements-content');
    if (!container) return;
    attachScrollHover(container);
    if (dataCache && container.dataset.announcementsRendered === '1') return;
    showLoading(container);
    const seq = ++renderSeq;
    try {
      const data = await fetchAnnouncements();
      if (opts.afterOpen) await new Promise(resolve => setTimeout(resolve, OPEN_RENDER_DELAY));
      if (seq !== renderSeq) return;
      render(data);
    } catch(err){
      if (seq !== renderSeq) return;
      container.replaceChildren(h('div','ann-empty',t('announcements.error.loadFailed')));
    }
  }

  function preload(){
    const container = $('announcements-content');
    if (!container) return;
    attachScrollHover(container);
    fetchAnnouncements().then(data => {
      if (container.dataset.announcementsRendered !== '1') render(data);
    }).catch(()=>{});
  }

  // 暴露给 bindings 调用
  window.loadAnnouncements = load;
  window.preloadAnnouncements = preload;

  // 可选：当语言切换时重新应用容器中的 i18n（内容本身不翻译）
  try { window.addEventListener('i18n:changed', ()=>{ const el=$('announcements-modal'); if(el) window.i18n?.applySafe?.(el); }); } catch(_){ }
