// 页面加载覆盖层：随机文案 + 动态字距 + 进度条时长与完成时机
// 加载提示语
const loadingTexts=["多少事 从来急","雖萬被戮 豈有悔哉","書不能盡意 故略陳固陋"]

// 计算动态字间距的函数
function calculateLetterSpacing(text){ const n=text.replace(/\s/g,'').length, base=1, len=6; return n<=len?base:Math.max(0.3, base*(len/n)) }

// 计算动态进度条时间的函数
function calculateProgressBarDuration(text){ const n=text.replace(/\s/g,'').length, base=1.2, len=6; return n<=len?base:Math.min(3, base*(n/len)) }

// 等待 DOM 与 partials 注入完毕后再设置加载文本与进度条时间
function whenDOMReady(){ return new Promise(r=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', r, {once:true}) : r()) }

function whenPartialsReady(){ return window.partialsReady?.then ? window.partialsReady.catch(()=>{}) : Promise.resolve() }

// 统一的随机选文案
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)] }

;(async function(){
    await whenDOMReady(); await whenPartialsReady();
    const text=pickRandom(loadingTexts), title=document.getElementById('loading-title');
    if(title){ title.textContent=text; title.style.letterSpacing=`${calculateLetterSpacing(text)}em`; }
    const dur=calculateProgressBarDuration(text), bar=document.querySelector('.loading-bar');
    if(bar){ bar.style.setProperty('--pb-duration', `${dur}s`); const end= dur<=1.2?0.88:Math.min(0.93,0.88+(dur-1.2)*0.08); bar.style.setProperty('--pb-end', String(end)); }
    setTimeout(startCompletionCheck, dur*900+800);
})()

// 加载状态跟踪
// domReady/resourcesReady/fontsReady/replacementsReady：四条件满足且 canComplete=true 时触发完成
let domReady=false, resourcesReady=false, fontsReady=false, replacementsReady=false, canComplete=false, completionStarted=false

// 检查是否可以完成进度条

// 平滑完成进度条
function completeProgressBar(){
    if(completionStarted) return; completionStarted=true
    const bar=document.querySelector('.loading-bar'), overlay=document.getElementById('loading-overlay')
    requestAnimationFrame(()=>{
        bar?.classList.add('accelerate')
        setTimeout(()=>{ requestAnimationFrame(()=>{ if(!overlay) return; overlay.classList.add('fade-out'); window.textAnimationController?.startAnimations?.(); setTimeout(()=>{ overlay.style.display='none' },3000) }) },400)
    })
}

// 开始检查完成条件的循环
function startCompletionCheck(){ canComplete=true; attemptCompletion() }

function attemptCompletion(){ if(!canComplete || completionStarted) return; if(domReady && resourcesReady && fontsReady && replacementsReady) completeProgressBar() }

// DOM加载完成
document.addEventListener('DOMContentLoaded', ()=>{ domReady=true; attemptCompletion() })

// 所有资源加载完成
window.addEventListener('load', ()=>{ resourcesReady=true; attemptCompletion() })

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
            Promise.all([allFontsReady, keyFontPromise]).then(()=>{ fontsReady=true; attemptCompletion() })
        } else {
            // 不支持 FontFaceSet：不阻塞完成
            fontsReady=true; attemptCompletion()
        }
    }catch(e){
        fontsReady=true; attemptCompletion()
    }
})()

// 进度检查的定时已在 initLoadingOverlay 中按 partialsReady 之后统一安排
