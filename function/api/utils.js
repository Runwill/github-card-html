// API 辅助：getEndpointUrl / fetchJSON
;(function(){
  if(typeof window==='undefined') return
  window.getEndpointUrl ||= (k,f)=>{ try{ return window.endpoints?.[k]?.() ?? f }catch(_){ return f } }
  window.fetchJSON ||= (u,f=[])=> new Promise(r=> $.ajax({url:u,type:'GET',dataType:'json'}).done(d=>r(d)).fail(()=>r(f)))
})()
