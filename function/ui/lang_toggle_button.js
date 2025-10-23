;(function(){
  function label(btn){ try { btn.textContent = window.i18n.t('lang.button.label', { lang: window.i18n.nameOf(window.i18n.getLang()) }); } catch(_){} }
  function onClick(){ try { const next = window.i18n.nextLang(); window.i18n.setLang(next); const btn = document.getElementById('lang-toggle-button'); if (btn) label(btn); } catch(_){} }
  function bind(){ const btn = document.getElementById('lang-toggle-button'); if(!btn || !window.i18n) return; label(btn); btn.addEventListener('click', onClick); }
  try{ (window.partialsReady||Promise.resolve()).then(bind).catch(bind) }catch(_){ document.readyState==='loading'?document.addEventListener('DOMContentLoaded', bind):bind() }
  window.addEventListener('i18n:changed', ()=>{ try{ const btn=document.getElementById('lang-toggle-button'); if(btn) label(btn); }catch(_){} });
})();
