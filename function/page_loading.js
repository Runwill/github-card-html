// 随机文本列表
const loadingTexts = [
    "多少事 从来急",
    "雖萬被戮 豈有悔哉",
    "書不能盡意 故略陳固陋"
];

// 计算动态字间距的函数
function calculateLetterSpacing(text) {
    // 去除空格计算实际字符数
    const actualLength = text.replace(/\s/g, '').length;
    
    // 基础字间距设置
    const baseSpacing = 1; // 对应"多少事 从来急"（6个字）的字间距
    const baseLength = 6;   // 基准文本长度
    
    // 动态调整公式：字越多，间距越小
    let spacing;
    if (actualLength <= baseLength) {
        // 字数不超过基准，保持基础间距
        spacing = baseSpacing;
    } else {
        // 字数超过基准，按比例减少间距
        // 使用反比例关系，但设置最小间距避免过于紧密
        spacing = Math.max(0.3, baseSpacing * (baseLength / actualLength));
    }
    
    return spacing;
}

// 计算动态进度条时间的函数
function calculateProgressBarDuration(text) {
    // 去除空格计算实际字符数
    const actualLength = text.replace(/\s/g, '').length;
    
    // 基础设置
    const baseDuration = 1.2; // 对应"多少事 从来急"（6个字）的进度条时间（秒）
    const baseLength = 6;     // 基准文本长度
    
    // 动态调整公式：字越多，时间稍微延长
    let duration;
    if (actualLength <= baseLength) {
        // 字数不超过基准，保持基础时间
        duration = baseDuration;
    } else {
        // 字数超过基准，按比例适当延长时间
        // 使用线性函数让时间增长更快，设置最大时间限制
        const ratio = actualLength / baseLength;
        duration = Math.min(3.0, baseDuration * ratio);
    }
    
    return duration;
}

// 等待 DOM 与 partials 注入完毕后再设置加载文本与进度条时间
function whenDOMReady() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
        } else {
            resolve();
        }
    });
}

function whenPartialsReady() {
    // 如果没有使用 partials，也立即继续
    if (!window.partialsReady || typeof window.partialsReady.then !== 'function') {
        return Promise.resolve();
    }
    return window.partialsReady.catch(() => {});
}

(async function initLoadingOverlay() {
    await whenDOMReady();
    await whenPartialsReady();

    const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
    const titleElement = document.getElementById('loading-title');

    if (titleElement) {
        // 设置文本内容与字间距（带保护）
        titleElement.textContent = randomText;
        const dynamicSpacing = calculateLetterSpacing(randomText);
        titleElement.style.letterSpacing = `${dynamicSpacing}em`;
    }

    // 计算并应用进度条动画时长
    const progressBarDuration = calculateProgressBarDuration(randomText);
    const loadingBar = document.querySelector('.loading-bar');
    if (loadingBar) {
        loadingBar.style.setProperty('--pb-duration', `${progressBarDuration}s`);
        // 根据进度条整体时长微调结束比例，使时间长时稍微多前进一点点
        const adaptiveEnd = progressBarDuration <= 1.2 ? 0.88 : Math.min(0.93, 0.88 + (progressBarDuration - 1.2) * 0.08);
        loadingBar.style.setProperty('--pb-end', adaptiveEnd.toString());
    }
    window.currentProgressBarDuration = progressBarDuration;

    // 在容器淡入后、进度条约90%时启动完成检测（保持与原逻辑等价）
    const checkStartTime = (progressBarDuration * 0.9 * 1000) + 800;
    setTimeout(() => {
        startCompletionCheck();
    }, checkStartTime);
})();

// 加载状态跟踪
let domReady = false;
let resourcesReady = false;
let canComplete = false;
let completionStarted = false; // 防止重复触发

// 检查是否可以完成进度条
function checkLoadingComplete() {
    return domReady && resourcesReady;
}

// 平滑完成进度条
function completeProgressBar() {
    if (completionStarted) return; // 双重保护
    completionStarted = true;
    const loadingBar = document.querySelector('.loading-bar');
    const overlay = document.getElementById('loading-overlay');
    // 使用 rAF 把样式修改放到同一帧，减少 layout 合并时机不确定性
    requestAnimationFrame(() => {
        if (loadingBar) loadingBar.classList.add('accelerate');
        // 进度条最终加速后，延时处理淡出
        setTimeout(() => {
            requestAnimationFrame(() => {
                if (!overlay) return;
                overlay.classList.add('fade-out');
                if (window.textAnimationController) {
                    window.textAnimationController.startAnimations();
                }
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 3000);
            });
        }, 400);
    });
}

// 开始检查完成条件的循环
function startCompletionCheck() {
    canComplete = true;
    attemptCompletion(); // 立即尝试一次
}

function attemptCompletion() {
    if (!canComplete || completionStarted) return;
    if (checkLoadingComplete()) {
        completeProgressBar();
    }
}

// DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    domReady = true;
    console.log('DOM ready');
    attemptCompletion();
});

// 所有资源加载完成
window.addEventListener('load', function () {
    resourcesReady = true;
    console.log('Resources ready');
    attemptCompletion();
});

// 进度检查的定时已在 initLoadingOverlay 中按 partialsReady 之后统一安排
