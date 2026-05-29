const KEY='theme', root=window.document.documentElement, media=window.matchMedia('(prefers-color-scheme: dark)')
let timer=null
const apply=t=>{
  if(t==='dark') return root.setAttribute('data-theme','dark')
  if(t==='elegant') return root.setAttribute('data-theme','elegant')
  if(t==='light') return root.removeAttribute('data-theme')
  media.matches ? root.setAttribute('data-theme','dark') : root.removeAttribute('data-theme')
}
/* 主题切换前：标记所有已完成入场动画的元素，防止 CSS 变量重算导致
   animation-fill-mode 失效、元素回到 opacity:0（文本消失）*/
const freezeAnimated=()=>{
  window.document.querySelectorAll('.animate-in:not(.animate-done)').forEach(el=>el.classList.add('animate-done'))
}
const fade=t=>{
  freezeAnimated()
  // 优先使用 View Transitions API (Chromium 111+)，提供极其流畅的全页颜色交叉淡入淡出
  if (window.document.startViewTransition) {
    let applied=false
    window.document.startViewTransition(() => { applied=true; apply(t) })
    window.setTimeout(()=>{ if(!applied) apply(t) }, 120)
    return;
  }
  // 降级方案：通过 body 透明度闪烁来掩盖 DOM 变化的突兀感
  if(timer) clearTimeout(timer);
  root.classList.add('theme-switching');
  window.requestAnimationFrame(()=>{
    apply(t);
    timer=window.setTimeout(()=>{ root.classList.remove('theme-switching'); timer=null },180)
  })
}
const saved=window.endpoints?.storageGet?.(KEY)||'system'; apply(saved)
if(saved==='system'){ const h=()=>fade('system'); try{ media.addEventListener('change',h) }catch(_){ media.addListener(h) } }
window.setTheme=function(t){ const v=(t==='light'||t==='dark'||t==='elegant')?t:'system'; window.endpoints?.storageSet?.(KEY,v); fade(v) }
