async function loadIncludes(){
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

window.whenDOMReady().then(loadIncludes).catch(function(){}).then(function(){ window.__partialsReadySeed?.resolve?.(); try{ delete window.__partialsReadySeed; }catch(_){} });
