// Foundation 与页面初始化（等价精简）
// 顺序：等待 partials -> 初始化 Foundation -> 召唤区块 -> 名称/术语替换与检查 -> 代词校验
const sr = (fn)=>{ try { return typeof fn === 'function' ? fn() : undefined } catch(_) {} }
const delay = (ms)=>new Promise(r=>setTimeout(r,ms))
const withTimeout = (promise, ms)=>Promise.race([
  Promise.resolve(promise).catch(()=>{}),
  delay(ms).then(()=>{})
])

window.whenDOMReady().then(()=> window.whenPartialsReady().then(()=>{
      try{ $(document).foundation() }catch(_){}
      sr(typeof window.summonCharacters==='function' && window.summonCharacters)
      const afterSkills = withTimeout(sr(typeof window.summonCharacterSkill==='function' && window.summonCharacterSkill), 4500)
      afterSkills.then(()=>{
        // 收集需要等待的替换 Promise，确保进度条可感知
        const tasks = []
        sr(()=> window.decompress?.('base/compression.json'))
        sr(()=> window.replace_character_name && tasks.push(Promise.resolve(window.replace_character_name(window.endpoints.character()))))
        sr(()=> window.replace_skill_name && tasks.push(Promise.resolve(window.replace_skill_name(window.endpoints.skill()))))
        sr(()=> window.replace_card_name && tasks.push(Promise.resolve(window.replace_card_name(window.endpoints.card()))))
        sr(()=> window.check_strength?.())
        sr(()=> window.add_button_wave?.())
        sr(()=> window.replace_term && tasks.push(Promise.resolve(window.replace_term(window.endpoints.termDynamic(),1))))
        sr(()=> window.replace_term && tasks.push(Promise.resolve(window.replace_term(window.endpoints.termFixed(),1))))

        // 向全局暴露术语/名称替换完成信号，供加载覆盖层附加等待
        window.replacementsReady = tasks.length ? Promise.all(tasks.map(task=>withTimeout(task, 4500))).catch(()=>{}) : Promise.resolve()

        setTimeout(()=>{ try{ window.pronounCheck?.() }catch(_){} },100)
      }).catch(()=>{ window.replacementsReady = Promise.resolve() })
}))
