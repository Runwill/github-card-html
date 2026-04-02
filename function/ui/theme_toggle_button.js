;(function(){
  const mode=()=>{ const v=document.documentElement.getAttribute('data-theme'); return v==='dark'?'dark':v==='elegant'?'elegant':'light' }
  const label=(btn)=>{
    if(!btn) return;
  const tSafe = (typeof window.t==='function') ? window.t : (k=>k)
    try{
      const cur = mode(); const key = cur==='light' ? 'theme.toggle.toDark' : cur==='dark' ? 'theme.toggle.toElegant' : 'theme.toggle.toLight';
      // 同步 i18n key，避免后续 i18n.apply 覆盖为错误文案
      btn.setAttribute('data-i18n', key);
      // 立即设置一次文本，确保无需等待 i18n.apply
      btn.textContent = tSafe(key);
    }catch(_){ const cur=mode(); btn.textContent = cur==='light' ? 'theme.toggle.toDark' : cur==='dark' ? 'theme.toggle.toElegant' : 'theme.toggle.toLight'; }
  }
  const onClick=()=>{ const cur=mode(); const next=cur==='light'?'dark':cur==='dark'?'elegant':'light'; window.setTheme?.(next); label(document.getElementById('theme-toggle-button')) }
  const bind=()=>{ const btn=document.getElementById('theme-toggle-button'); if(!btn) return; label(btn); btn.addEventListener('click', onClick); new MutationObserver(()=>label(btn)).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme']}); window.addEventListener('i18n:changed', ()=>label(btn)); }
  window.ThemeToggle = { toggle: onClick };
  try{ (window.partialsReady||Promise.resolve()).then(bind).catch(bind) }catch(_){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', bind) : bind() }
})()
