;(function(){
  var root = document.documentElement, saved = 'system', script = document.currentScript, resolvePartialsReady;
  try{ saved = localStorage.getItem('theme') || 'system'; }catch(_){}
  if(saved === 'dark' || saved === 'elegant' || (saved === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) root.setAttribute('data-theme', saved === 'elegant' ? 'elegant' : 'dark');
  else root.removeAttribute('data-theme');

  if(typeof window.whenDOMReady !== 'function') window.whenDOMReady = function(){ return document.readyState === 'loading' ? new Promise(function(resolve){ document.addEventListener('DOMContentLoaded', resolve, { once: true }); }) : Promise.resolve(); };
  if(script && script.hasAttribute('data-partials') && (!window.partialsReady || typeof window.partialsReady.then !== 'function')){
    window.partialsReady = new Promise(function(resolve){ resolvePartialsReady = resolve; });
    window.__partialsReadySeed = { resolve: resolvePartialsReady };
  }
  window.whenPartialsReady = function(){ return window.partialsReady && typeof window.partialsReady.then === 'function' ? window.partialsReady.catch(function(){}) : Promise.resolve(); };
  window.whenReady = function(fn){ return window.whenDOMReady().then(function(){ return window.whenPartialsReady(); }).then(fn); };
})();