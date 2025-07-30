// 滚动管理器
class ScrollManager {
    constructor() {
        this.scrollPositions = new Map();
        this.throttleDelay = 100;
        this.smoothScrollBehavior = 'smooth';
        this.init();
    }

    init() {
        this.bindEvents();
    }

    // 节流函数
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay);
            }
        };
    }

    // 保存滚动位置
    saveScrollPosition() {
        const activeElements = document.querySelectorAll(".is-active");
        activeElements.forEach(element => {
            const scrollHeight = window.pageYOffset || 
                               document.body.scrollTop || 
                               document.documentElement.scrollTop;
            this.scrollPositions.set(`scrollHeight${element.id}`, scrollHeight);
            
            // 使用sessionStorage代替localStorage，避免跨页面污染
            sessionStorage.setItem(`scrollHeight${element.id}`, scrollHeight);
        });
    }

    // 恢复滚动位置
    restoreScrollPosition() {
        // 使用requestAnimationFrame确保DOM渲染完成
        requestAnimationFrame(() => {
            const activeElements = document.querySelectorAll(".is-active");
            activeElements.forEach(element => {
                const scrollHeight = sessionStorage.getItem(`scrollHeight${element.id}`);
                if (scrollHeight) {
                    // 添加小延迟确保页面完全渲染
                    setTimeout(() => {
                        window.scrollTo({
                            top: parseInt(scrollHeight),
                            behavior: this.smoothScrollBehavior
                        });
                    }, 15);
                }
            });
        });
    }

    // 平滑滚动到元素
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
        const targetPosition = elementTop - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: this.smoothScrollBehavior
        });
    }

    // 绑定事件
    bindEvents() {
        // 标题点击事件
        const titleElements = document.querySelectorAll(".title-a");
        titleElements.forEach(title => {
            title.addEventListener('click', () => {
                if (!window.location.hash) {
                    setTimeout(() => this.restoreScrollPosition(), 0);
                }
            });
        });

        // 滚动监听（使用节流）
        const throttledSavePosition = this.throttle(
            () => this.saveScrollPosition(), 
            this.throttleDelay
        );
        
        window.addEventListener('scroll', throttledSavePosition, { passive: true });
    }

    // 高亮元素并滚动
    highlightAndScroll(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element.outerHTML.startsWith(`<${window.location.hash.slice(1)} `)) {
                if (!element.classList.contains('fadeOnly')) {
                    this.scrollToElement(element);
                }
                
                // 使用Web Animations API替代jQuery
                element.animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], {
                    duration: 1200,
                    easing: 'ease-in-out'
                });
            }
        });
    }

    // 清理存储的滚动位置
    clearScrollPositions() {
        this.scrollPositions.clear();
        // 清理sessionStorage中的滚动位置
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('scrollHeight')) {
                sessionStorage.removeItem(key);
            }
        });
    }
}

// 初始化滚动管理器
const scrollManager = new ScrollManager();

// jQuery兼容性保持
$(function() {
    // 现有的功能已经在ScrollManager中实现
    // 这里保持空函数以避免错误
});