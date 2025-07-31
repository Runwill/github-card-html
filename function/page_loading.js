// 随机文本列表
const loadingTexts = [
    "多少事 从来急"
];
// 随机选择一句
document.addEventListener('DOMContentLoaded', function () {
    const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
    document.getElementById('loading-title').textContent = randomText;
});

// 加载动画淡出逻辑
window.addEventListener('load', function () {
    // 进度条动画已自动播放，延迟一点再淡出
    setTimeout(function () {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 3000); // 与CSS transition一致
    }, 1200); // 与进度条动画时长一致
});