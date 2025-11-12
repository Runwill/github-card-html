;(function(){
  const onReady = (cb)=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', cb, {once:true}) : cb();
  const t = (typeof window.t==='function') ? window.t : (k)=>k;
  const $ = (id)=> document.getElementById(id);
  // 前端直读：使用相对路径，不再通过后端基址

  let cached = null; let loading = false; let lastError = null;

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
      const empty = document.createElement('div');
      empty.className = 'ann-empty';
      empty.textContent = t('announcements.empty');
      container.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((it)=>{
      const card = document.createElement('div');
      card.className = 'ann-card';
      const title = document.createElement('div');
      title.className = 'ann-card-title';
      title.textContent = (it.title || '');
      const meta = document.createElement('div');
      meta.className = 'ann-card-meta';
      meta.textContent = it.date ? String(it.date) : '';
      const body = document.createElement('div');
      body.className = 'ann-card-body';
      // 规范结构：changes 数组（字符串或对象）
      if (Array.isArray(it.changes) && it.changes.length) {
        const ul = document.createElement('ul');
        ul.className = 'ann-changes';
        it.changes.forEach((ch)=>{
          const li = document.createElement('li');
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
  container.textContent = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ann-loading';
  loadingDiv.textContent = '...';
  container.appendChild(loadingDiv);
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
