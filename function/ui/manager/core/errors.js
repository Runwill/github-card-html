// 核心错误处理与响应解析工具。
// CardUI Manager Core - error helpers
(function(){
  'use strict';
  var w = window;
  var ns = w.CardUI.Manager.Core;

  async function parseErrorResponse(resp){
    try {
      var data = await resp.clone().json();
      return { message: (data && data.message) || '', data: data };
    } catch (_){
      try {
        var text = await resp.clone().text();
        var fallback = (typeof w.t === 'function') ? w.t('error.parse.json') : 'error.parse.json';
        return { message: (text && text.length < 200 ? text : fallback), data: null };
      } catch {
        var fallback2 = (typeof w.t === 'function') ? w.t('error.parse.unknown') : 'error.parse.unknown';
        return { message: fallback2, data: null };
      }
    }
  }

  ns.errors = { parseErrorResponse: parseErrorResponse };
})();
