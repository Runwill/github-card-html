;(function(){
  const KEY='theme', root=document.documentElement, media=matchMedia('(prefers-color-scheme: dark)')
  let timer=null
  const apply=t=>{
    if(t==='dark') return root.setAttribute('data-theme','dark')
    if(t==='light') return root.removeAttribute('data-theme')
    media.matches ? root.setAttribute('data-theme','dark') : root.removeAttribute('data-theme')
  }
  const fade=t=>{ if(timer) clearTimeout(timer); root.classList.add('theme-switching'); requestAnimationFrame(()=>{ apply(t); timer=setTimeout(()=>{ root.classList.remove('theme-switching'); timer=null },180) }) }
  const saved=localStorage.getItem(KEY)||'system'; apply(saved)
  if(saved==='system'){ const h=()=>fade('system'); try{ media.addEventListener('change',h) }catch(_){ media.addListener(h) } }
  window.setTheme=function(t){ const v=(t==='light'||t==='dark')?t:'system'; localStorage.setItem(KEY,v); fade(v) }
})()
