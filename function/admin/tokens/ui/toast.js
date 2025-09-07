(function(){
  function showToast(message){
    try{
      let container=document.querySelector('.tokens-toast-container');
      if(!container){ container=document.createElement('div'); container.className='tokens-toast-container'; document.body.appendChild(container); }
      const isError = (typeof message==='string' && message.trim()==='无权限');
      const toast=document.createElement('div'); toast.className='tokens-toast' + (isError? ' tokens-toast--error': '');
      // 创建 SVG 图标（无 span 包裹）
      const NS='http://www.w3.org/2000/svg';
      const svg=document.createElementNS(NS,'svg');
      svg.setAttribute('width','18');
      svg.setAttribute('height','18');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.setAttribute('fill','none');
      svg.setAttribute('aria-hidden','true');
      const path=document.createElementNS(NS,'path');
      if(isError){
        path.setAttribute('d','M18 6L6 18M6 6l12 12');
      } else {
        path.setAttribute('d','M20 6L9 17l-5-5');
      }
      path.setAttribute('stroke','currentColor');
      path.setAttribute('stroke-width','2.5');
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-linejoin','round');
      svg.appendChild(path);
      toast.appendChild(svg);
      // 文本节点（无 span 包裹）
      toast.appendChild(document.createTextNode(' ' + (message || '操作成功')));
      container.appendChild(toast);
      setTimeout(()=>{ try{ toast.remove(); }catch(_){} if(container && container.children.length===0){ try{ container.remove(); }catch(_){} } }, 2200);
    }catch(_){ /* ignore */ }
  }
  window.tokensAdmin = window.tokensAdmin || {};
  window.tokensAdmin.showToast = showToast;
})();
