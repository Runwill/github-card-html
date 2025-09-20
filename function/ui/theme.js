/* 主题初始化与切换（等价精简）：
 * - 读取 localStorage.theme（light/dark/system）
 * - 暴露 window.setTheme 供 UI 调用；跟随系统时监听 prefers-color-scheme
 */
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
