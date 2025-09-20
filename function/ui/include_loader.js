;(function(){
  const onReady=cb=> document.readyState==='loading'? document.addEventListener('DOMContentLoaded', cb) : cb();
  async function load(){
    const nodes=[...document.querySelectorAll('[data-include]')]; if(!nodes.length) return;
    await Promise.all(nodes.map(async el=>{
      const url=el.getAttribute('data-include'); if(!url) return;
      try{
        const html=await (await fetch(url,{cache:'no-cache'})).text();
        el.insertAdjacentHTML('beforebegin', html);
        el.parentNode && el.parentNode.removeChild(el);
      }catch(_){ try{ el.innerHTML='<!-- include failed: '+(url||'')+' -->' }catch(_){} }
    }));
  }
  let res,rej; const p=new Promise((r,j)=>{res=r;rej=j});
  try{ Object.defineProperty(window,'partialsReady',{ value:p, writable:false, configurable:true }) }catch(_){ window.partialsReady=p }
  onReady(()=>{ load().then(()=>res()).catch(rej) })
})()
