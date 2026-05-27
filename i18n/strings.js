function loadPack(lang) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'i18n/' + lang + '.json', false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText || '{}');
    } catch (error) {
      try { console.error('[i18n] Failed to load language pack: ' + lang, error); } catch (_) {}
    }
    return {};
}

var debug = new Proxy({}, { get: function (_, key) { return String(key); } });
window.I18N_STRINGS = { zh: loadPack('zh'), en: loadPack('en'), debug: debug };
window.I18N_STRINGS_READY = Promise.resolve(window.I18N_STRINGS);
