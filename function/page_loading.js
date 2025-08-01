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

// 加载动画淡出逻辑
window.addEventListener('load', function () {
    // 获取动态进度条时间，如果没有设置则使用默认值
    const progressBarDuration = window.currentProgressBarDuration || 1.2;
    
    // 计算等待时间：进度条时间 + 容器渐入时间
    const waitTime = (progressBarDuration * 1000) + 800; // 转换为毫秒并添加800ms容器渐入时间
    
    // 进度条动画完成后，延迟一点再淡出
    setTimeout(function () {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 15000); // 淡出时间保持不变
    }, waitTime);
});