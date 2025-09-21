;(function(){
  const onReady=cb=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', cb, {once:true}) : cb();
  async function load(){
    const nodes=[...document.querySelectorAll('[data-include]')]; if(!nodes.length) return;
    await Promise.all(nodes.map(async el=>{
      const url=el.getAttribute('data-include'); if(!url) return;
      try{
        const html=await (await fetch(url,{cache:'no-cache'})).text();
        el.insertAdjacentHTML('beforebegin', html);
        el.parentNode?.removeChild(el);
      }catch(_){ try{ el.innerHTML='<!-- include failed: '+(url||'')+' -->' }catch(_){} }
    }));
  }
  window.partialsReady=new Promise(r=>onReady(()=>load().then(r)));
})()
