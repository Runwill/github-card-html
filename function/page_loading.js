// 随机文本列表
const loadingTexts = [
    "多少事 从来急"
];

// 优化的加载管理器
class LoadingManager {
    constructor() {
        this.overlay = null;
        this.titleElement = null;
        this.isLoaded = false;
    }

    init() {
        // 缓存DOM元素
        this.overlay = document.getElementById('loading-overlay');
        this.titleElement = document.getElementById('loading-title');
        
        if (this.titleElement) {
            this.setRandomText();
        }
    }

    setRandomText() {
        const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
        this.titleElement.textContent = randomText;
    }

    hide() {
        if (this.isLoaded || !this.overlay) return;
        
        this.isLoaded = true;
        this.overlay.classList.add('fade-out');
        
        // 使用requestAnimationFrame优化动画
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
                // 清理引用，避免内存泄漏
                this.overlay = null;
                this.titleElement = null;
            }
        }, 3000);
    }
}

// 实例化加载管理器
const loadingManager = new LoadingManager();

// 事件监听
document.addEventListener('DOMContentLoaded', () => loadingManager.init());
window.addEventListener('load', () => {
    setTimeout(() => loadingManager.hide(), 1200);
});