;(function(){
  'use strict';

  var tasks = [];
  var started = false;
  var activeContext = null;
  var readyPromise = null;
  var jsonCache = new Map();
  var resourceCache = new Set();

  function detectContext(){
    return /(?:^|\/)login\.html(?:$|[?#])/.test(location.pathname) ? 'login' : 'app';
  }

  function matchesContext(task, context){
    var allowed = task.context || 'app';
    if (allowed === 'all' || allowed === context) return true;
    return Array.isArray(allowed) && allowed.indexOf(context) !== -1;
  }

  function whenDomReady(){
    return document.readyState === 'loading'
      ? new Promise(function(resolve){ document.addEventListener('DOMContentLoaded', resolve, { once: true }); })
      : Promise.resolve();
  }

  function whenReady(context){
    return whenDomReady().then(function(){
      if (context === 'app' && window.partialsReady && typeof window.partialsReady.then === 'function') {
        return window.partialsReady.catch(function(){});
      }
    });
  }

  function idle(fn, timeout){
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(fn, { timeout: timeout || 1600 });
    }
    return setTimeout(fn, Math.min(timeout || 180, 360));
  }

  function runTask(task){
    if (!task || task.done) return Promise.resolve();
    task.done = true;
    try {
      var result = task.run && task.run();
      return Promise.resolve(result).catch(function(err){
        if (window.console && console.debug) console.debug('[preload] skipped ' + task.name, err);
      });
    } catch(err) {
      if (window.console && console.debug) console.debug('[preload] skipped ' + task.name, err);
      return Promise.resolve();
    }
  }

  function schedule(task){
    if (!task || task.scheduled) return;
    task.scheduled = true;
    var delay = task.delay || 0;
    var launch = function(){ setTimeout(function(){ runTask(task); }, delay); };
    if (task.stage === 'ready') launch();
    else idle(launch, task.timeout);
  }

  function register(name, run, options){
    if (!name || typeof run !== 'function') return;
    var task = Object.assign({ name: name, run: run, stage: 'idle', priority: 50 }, options || {});
    tasks.push(task);
    if (started && matchesContext(task, activeContext || detectContext())) {
      (readyPromise || Promise.resolve()).then(function(){ schedule(task); });
    }
  }

  function start(options){
    if (started) return;
    started = true;
    activeContext = (options && options.context) || detectContext();
    readyPromise = whenReady(activeContext).then(function(){
      tasks
        .filter(function(task){ return matchesContext(task, activeContext); })
        .sort(function(a, b){ return (a.priority || 50) - (b.priority || 50); })
        .forEach(schedule);
    });
  }

  function json(url, options){
    if (!url) return Promise.resolve(null);
    if (jsonCache.has(url)) return jsonCache.get(url);
    var loader = window.fetchJsonCached || function(path, fetchOptions){
      return fetch(path, fetchOptions).then(function(resp){
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' for ' + path);
        return resp.json();
      });
    };
    var promise = Promise.resolve(loader(url, options)).catch(function(err){
      jsonCache.delete(url);
      throw err;
    });
    jsonCache.set(url, promise);
    return promise;
  }

  function prefetch(url, asType){
    if (!url || resourceCache.has(url)) return;
    resourceCache.add(url);
    var link = document.createElement('link');
    link.rel = 'prefetch';
    if (asType) link.as = asType;
    link.href = url;
    document.head.appendChild(link);
  }

  function loadFont(family, text){
    if (!family || !document.fonts || typeof document.fonts.load !== 'function') return Promise.resolve();
    return document.fonts.load("1em '" + family + "'", text || family).catch(function(){});
  }

  function decodeImage(url){
    if (!url || resourceCache.has('img:' + url)) return Promise.resolve();
    resourceCache.add('img:' + url);
    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){
        if (img.decode) img.decode().then(resolve).catch(resolve);
        else resolve();
      };
      img.onerror = resolve;
      img.src = url;
    });
  }

  window.AppPreload = {
    register: register,
    start: start,
    idle: idle,
    json: json,
    prefetch: prefetch,
    loadFont: loadFont,
    decodeImage: decodeImage
  };
})();