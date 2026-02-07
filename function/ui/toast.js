// 全局 Toast 通知（唯一实现）
// 用法：window.showToast(message)          成功样式
//       window.showToast(message, 'error')  错误样式
(function(){
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function showToast(message, type){
    try {
      var container = document.querySelector('.tokens-toast-container');
      if (!container){ container = document.createElement('div'); container.className = 'tokens-toast-container'; document.body.appendChild(container); }

      var isError = (type === 'error');
      if (!isError && typeof message === 'string'){
        try { var noPerm = window.t('common.noPermission'); if (noPerm) isError = (message.trim() === String(noPerm).trim()); } catch(_){}
      }

      var toast = document.createElement('div');
      toast.className = 'tokens-toast' + (isError ? ' tokens-toast--error' : '');

      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width','18'); svg.setAttribute('height','18');
      svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none');
      svg.setAttribute('aria-hidden','true');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', isError ? 'M18 6L6 18M6 6l12 12' : 'M20 6L9 17l-5-5');
      path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2.5');
      path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
      svg.appendChild(path);
      toast.appendChild(svg);

      toast.appendChild(document.createTextNode(' ' + (message || (isError ? '错误' : '操作成功'))));
      container.appendChild(toast);
      setTimeout(function(){ try{ toast.remove(); }catch(_){} if(container && container.children.length===0){ try{ container.remove(); }catch(_){} } }, 2200);
    } catch(_){}
  }

  window.showToast = showToast;
})();
