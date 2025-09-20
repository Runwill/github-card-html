// Foundation 与页面初始化（等价精简）
// 顺序：等待 partials -> 初始化 Foundation -> 召唤区块 -> 名称/术语替换与检查 -> 代词校验
;(function(){
  const sr = (fn)=>{ try { return typeof fn === 'function' ? fn() : undefined } catch(_) {} }
  window.delay ||= (ms)=>new Promise(r=>setTimeout(r,ms))
  window.filterParagraphs ||= function(){
    try{
      const q=(document.getElementById('search-input')?.value||'').trim().toLowerCase()
      document.querySelectorAll('.characterParagraph').forEach(p=>{
        const t=(p.textContent||'').toLowerCase()
        const m=[...q].every(ch=>t.includes(ch))
        p.classList.toggle('hidden',!m)
      })
    }catch(_){}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const ready = window.partialsReady?.then ? window.partialsReady : Promise.resolve()
    ready.then(()=>{
      try{ $(document).foundation() }catch(_){}
      sr(typeof window.summonCharacters==='function' && window.summonCharacters)
      const afterSkills = Promise.resolve(typeof window.summonCharacterSkill==='function' ? window.summonCharacterSkill() : undefined)
      afterSkills.then(()=>{
        sr(()=> window.decompress && window.decompress('base/compression.json'))
        sr(()=> window.replace_character_name && window.replace_character_name(endpoints.character()))
        sr(()=> window.replace_skill_name && window.replace_skill_name(endpoints.skill()))
        sr(()=> window.replace_card_name && window.replace_card_name(endpoints.card()))
        sr(()=> window.check_strength && window.check_strength())
        sr(()=> window.add_button_wave && window.add_button_wave())
        sr(()=> window.replace_term && window.replace_term(endpoints.termDynamic(),1))
        sr(()=> window.replace_term && window.replace_term(endpoints.termFixed(),1))
        setTimeout(()=>{ try{ window.pronounCheck && window.pronounCheck() }catch(_){} },100)
      }).catch(()=>{})
    })
  })
})()
