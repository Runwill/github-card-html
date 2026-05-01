// 页面加载覆盖层：随机文案 + 动态字距 + 进度条时长与完成时机
// 加载提示语
const loadingTexts=[
    "多少事 从来急",
    "雖萬被戮 豈有悔哉",
    "書不能盡意 故略陳固陋",
    "輕輕的告訴我 不要喧嘩",
    "儻所謂天道 是耶非耶",
    "不照綺羅筵 只照逃亡屋"
]

// 计算动态字间距的函数
function calculateLetterSpacing(text){ const n=text.replace(/\s/g,'').length, base=1, len=6; return n<=len?base:Math.max(0.3, base*(len/n)) }

let loadingTitleText=''
function fitLoadingTitleLetterSpacing(title, base){
    const bar=document.querySelector('.loading-bar-container')
    if(!title || !bar) return base
    title.style.letterSpacing=`${base}em`
    const target=bar.getBoundingClientRect().width, width=title.getBoundingClientRect().width
    const fontSize=parseFloat(getComputedStyle(title).fontSize)||1
    const gaps=Math.max(Array.from(title.textContent||'').length-1,1)
    if(!target || !width || width<=target) return base
    return Math.max(0.3, base-((width-target)/(gaps*fontSize))-0.02)
}
function applyLoadingTitleSpacing(){
    const title=document.getElementById('loading-title')
    if(!title || !loadingTitleText) return
    title.style.letterSpacing=`${fitLoadingTitleLetterSpacing(title, calculateLetterSpacing(loadingTitleText))}em`
}

// 计算动态进度条时间的函数
function calculateProgressBarDuration(text){
    const last=sessionStorage.getItem('loading_last_shown'), now=Date.now();
    const isSpeed = last && (now - last < 180000);
    // 极速模式：基准0.8s，上限1.2s；普通模式：基准1.2s，上限3s
    const base = isSpeed ? 0.8 : 1.2;
    const cap = isSpeed ? 1.2 : 3.0;
    const n=text.replace(/\s/g,'').length, len=6;
    return n<=len ? base : Math.min(cap, base*(n/len));
}

// 等待 DOM 与 partials 注入完毕后再设置加载文本与进度条时间
function whenDOMReady(){ return new Promise(r=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', r, {once:true}) : r()) }

function whenPartialsReady(){ return window.partialsReady?.then ? window.partialsReady.catch(()=>{}) : Promise.resolve() }

// 统一的随机选文案
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)] }

;(async function(){
    await whenDOMReady(); await whenPartialsReady();
    const text=pickRandom(loadingTexts), title=document.getElementById('loading-title');
    if(title){ loadingTitleText=text; title.textContent=text; applyLoadingTitleSpacing(); }
    const dur=calculateProgressBarDuration(text), bar=document.querySelector('.loading-bar');
    if(bar){ bar.style.setProperty('--pb-duration', `${dur}s`); const end= dur<=1.2?0.88:Math.min(0.93,0.88+(dur-1.2)*0.08); bar.style.setProperty('--pb-end', String(end)); }
    setTimeout(startCompletionCheck, dur*900+800);
})()

window.addEventListener('resize', applyLoadingTitleSpacing)

// 加载状态跟踪
// domReady/resourcesReady/fontsReady/replacementsReady：四条件满足且 canComplete=true 时触发完成
let domReady=false, resourcesReady=false, fontsReady=false, replacementsReady=false, canComplete=false, completionStarted=false

// 状态描述：进度条停留超过一定时间后显示当前等待项
let statusTimer=null
function updateStatus(){
    const el=document.getElementById('loading-status'); if(!el) return
    if(completionStarted){ el.classList.remove('is-visible'); return }
    const pending=[]
    if(!domReady) pending.push('DOM')
    if(!resourcesReady) pending.push('资源')
    if(!fontsReady) pending.push('字体')
    if(!replacementsReady) pending.push('数据')
    if(pending.length){ el.textContent='等待: '+pending.join(' / '); el.classList.add('is-visible') }
    else { el.classList.remove('is-visible') }
}
function scheduleStatus(){ if(!statusTimer) statusTimer=setTimeout(updateStatus, 4000) }

// 平滑完成进度条
function completeProgressBar(){
    if(completionStarted) return; completionStarted=true
    sessionStorage.setItem('loading_last_shown', Date.now())
    const bar=document.querySelector('.loading-bar'), overlay=document.getElementById('loading-overlay')
    requestAnimationFrame(()=>{
        bar?.classList.add('accelerate')
        setTimeout(()=>{ requestAnimationFrame(()=>{ if(!overlay) return; overlay.classList.add('fade-out'); window.textAnimationController?.startAnimations?.(); setTimeout(()=>{ overlay.style.display='none' },3000) }) },400)
    })
}

// 开始检查完成条件的循环
function startCompletionCheck(){ canComplete=true; attemptCompletion() }

function attemptCompletion(){ updateStatus(); if(!canComplete || completionStarted) return; if(domReady && resourcesReady && fontsReady && replacementsReady) completeProgressBar() }

// DOM加载完成
document.addEventListener('DOMContentLoaded', ()=>{ domReady=true; scheduleStatus(); attemptCompletion() })

// 所有资源加载完成
window.addEventListener('load', ()=>{ resourcesReady=true; scheduleStatus(); attemptCompletion() })

// 名称 / 术语等替换完成（由 app_bootstrap.js 暴露）
;(function(){
    try{
        // 支持“迟到”的赋值：若此时尚未设置 window.replacementsReady，则拦截其后续 set
        const hook = (p)=>{
            if(p && typeof p.then === 'function'){
                p.then(()=>{ replacementsReady=true; attemptCompletion() })
                 .catch(()=>{ replacementsReady=true; attemptCompletion() })
            }else{
                // 未提供 Promise，视作不阻塞
                replacementsReady=true; attemptCompletion()
            }
        }

        if(Object.prototype.hasOwnProperty.call(window,'replacementsReady')){
            hook(window.replacementsReady)
        }else{
            let _val
            Object.defineProperty(window,'replacementsReady',{
                configurable: true,
                enumerable: true,
                get(){ return _val },
                set(v){ _val = v; hook(v) }
            })
        }
    }catch(_){ replacementsReady=true; attemptCompletion() }
})()

// 字体加载完成（使用 FontFaceSet API；若不支持则回退为已就绪）
;(function(){
    try{
        if(document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function'){
            // 严格等待：全局字体就绪 + 关键字体（康熙）加载完毕
            const allFontsReady = document.fonts.ready
            const keyFontPromise = document.fonts.load("1em '康熙'").catch(()=>{})
            Promise.all([allFontsReady, keyFontPromise]).then(()=>{ applyLoadingTitleSpacing(); fontsReady=true; attemptCompletion() })
        } else {
            // 不支持 FontFaceSet：不阻塞完成
            fontsReady=true; attemptCompletion()
        }
    }catch(e){
        fontsReady=true; attemptCompletion()
    }
})()

// 进度检查的定时已在 initLoadingOverlay 中按 partialsReady 之后统一安排
