// Lightweight HTML partial include loader
// Usage: <div data-include="partials/header.html"></div>
// Exposes window.partialsReady (Promise) to allow other scripts to wait.
(function(){
  function onReady(cb){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  async function loadPartials(){
    const nodes = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    if (!nodes.length) return;
    await Promise.all(nodes.map(async function(el){
      const url = el.getAttribute('data-include');
      if (!url) return;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const html = await res.text();
        // Replace the placeholder node with fetched HTML
        el.insertAdjacentHTML('beforebegin', html);
        el.parentNode && el.parentNode.removeChild(el);
      } catch (err) {
        try {
          el.innerHTML = '<!-- include failed: ' + (url || '') + ' -->';
        } catch(_) {}
      }
    }));
  }

  // Create a promise others can await
  var resolveFn, rejectFn;
  var p = new Promise(function(resolve, reject){ resolveFn = resolve; rejectFn = reject; });
  try { Object.defineProperty(window, 'partialsReady', { value: p, writable: false, configurable: true }); } catch(_) { window.partialsReady = p; }

  onReady(function(){
    loadPartials().then(function(){ resolveFn(); }).catch(function(e){ rejectFn(e); });
  });
})();
