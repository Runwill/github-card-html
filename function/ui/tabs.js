// Tabs 行为（等价精简）：标题切换、权限控制、草稿自适应高度、词元页刷新按钮
;(function(){
  const onReady=(fn)=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn()
  const titles=['程序','技能','牌库','将池','草稿','词元']
  function changeTitle(n){ try{ document.title='Document丨'+(titles[n]||'') }catch(_){} }
  const isAdmin=()=>{ try{ return localStorage.getItem('role')==='admin' }catch(_){ return false } }

  onReady(()=>{
    const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve()
    ready.then(()=>{
      document.querySelectorAll('#example-tabs a.title-a').forEach((a,idx)=>{
        a.addEventListener('click',e=>{
          const href=a.getAttribute('href')||''
          if(href==='#panel_tokens'){
            if(!isAdmin()) { e.preventDefault(); return }
            try{ window.renderTokensDashboard && window.renderTokensDashboard() }catch(_){}
          }
          if(href==='#panel_draft'){
            try{ requestAnimationFrame(()=>{ window.draftPanel?.autosize && window.draftPanel.autosize() }) }catch(_){}
          }
          changeTitle(idx)
        })
      })
  const refreshBtn=document.getElementById('tokens-refresh-btn')
  refreshBtn?.addEventListener('click',()=>{ try{ window.tokensRefresh ? window.tokensRefresh() : window.renderTokensDashboard && window.renderTokensDashboard() }catch(_ ){} })
    })
  })
  window.changeTitle=changeTitle
})()
