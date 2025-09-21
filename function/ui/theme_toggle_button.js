;(function(){
  const mode=()=> document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'
  const label=btn=> btn && (btn.textContent= mode()==='dark'?'切换为浅色':'切换为深色')
  const onClick=()=>{ const next=mode()==='dark'?'light':'dark'; window.setTheme?.(next); label(document.getElementById('theme-toggle-button')) }
  const bind=()=>{ const btn=document.getElementById('theme-toggle-button'); if(!btn) return; label(btn); btn.addEventListener('click', onClick); new MutationObserver(()=>label(btn)).observe(document.documentElement,{attributes:true, attributeFilter:['data-theme']}) }
  try{ window.partialsReady?.then(bind).catch(bind) }catch(_){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', bind) : bind() }
})()
