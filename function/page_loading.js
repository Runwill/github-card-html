// 随机文本列表
const loadingTexts = [
    "多少事 从来急"
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

// 随机选择一句并设置动态字间距和进度条时间
document.addEventListener('DOMContentLoaded', function () {
    const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
    const titleElement = document.getElementById('loading-title');
    
    // 设置文本内容
    titleElement.textContent = randomText;
    
    // 计算并应用动态字间距
    const dynamicSpacing = calculateLetterSpacing(randomText);
    titleElement.style.letterSpacing = `${dynamicSpacing}em`;
    
    // 计算动态进度条时间
    const progressBarDuration = calculateProgressBarDuration(randomText);
    
    // 动态修改进度条CSS动画时间
    const loadingBar = document.querySelector('.loading-bar');
    if (loadingBar) {
        loadingBar.style.animationDuration = `${progressBarDuration}s`;
    }

    // 将进度条时间传递给全局变量，供淡出逻辑使用
    window.currentProgressBarDuration = progressBarDuration;
});

// 加载状态跟踪
let domReady = false;
let resourcesReady = false;
let canComplete = false;

// 检查是否可以完成进度条
function checkLoadingComplete() {
    return domReady && resourcesReady;
}

// 平滑完成进度条
function completeProgressBar() {
    const loadingBar = document.querySelector('.loading-bar');
    if (loadingBar) {
        loadingBar.classList.add('accelerate');
    }
    
    // 等待最终动画完成后开始淡出
    setTimeout(() => {
        // 进度条完成，开始淡出和文本动画
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('fade-out');
        
        // 进度条完成时立即触发文本动画（与遮罩淡出同时进行）
        if (window.textAnimationController) {
            window.textAnimationController.startAnimations();
        }
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 3000); // 淡出时间保持不变
    }, 400); // 等待final动画完成
}

// 开始检查完成条件的循环
function startCompletionCheck() {
    canComplete = true;
    
    const checkInterval = setInterval(() => {
        if (checkLoadingComplete() && canComplete) {
            clearInterval(checkInterval);
            completeProgressBar();
        }
    }, 16); // 约60fps的检查频率，更流畅
}

// DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    domReady = true;
    console.log('DOM ready');
});

// 所有资源加载完成
window.addEventListener('load', function () {
    resourcesReady = true;
    console.log('Resources ready');
});

// 在进度条减速阶段开始检查完成条件
document.addEventListener('DOMContentLoaded', function () {
    const progressBarDuration = window.currentProgressBarDuration || 1.2;
    // 在进度条动画的90%时开始检查（此时进度条在85%左右）
    const checkStartTime = (progressBarDuration * 0.9 * 1000) + 800; // 90%时间点 + 容器渐入时间
    
    setTimeout(() => {
        startCompletionCheck();
    }, checkStartTime);
});