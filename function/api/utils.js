// 轻量 API 工具：
// - window.getEndpointUrl(key, fallback): 读取 endpoints[key]()，失败时返回 fallback
// - window.fetchJSON(url, fallback): GET JSON，失败时返回 fallback（默认 []）
;(function(){
  if(typeof window==='undefined') return
  window.getEndpointUrl ||= function(key, fallback){
    try{ return window.endpoints && typeof window.endpoints[key]==='function' ? window.endpoints[key]() : fallback }catch(_){ return fallback }
  }
  window.fetchJSON ||= function(url, fallbackOnError=[]){
    return new Promise(r=> $.ajax({url, type:'GET', dataType:'json'}).done(d=>r(d)).fail(()=>r(fallbackOnError)))
  }
})()
