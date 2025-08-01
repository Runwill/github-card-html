// 文本动画控制器
class TextAnimationController {
    constructor() {
        this.observer = null;
        this.animatedElements = new Set();
        this.init();
    }

    init() {
        // 创建交集观察器来检测元素进入视窗
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
                    this.triggerFadeInAnimation(entry.target);
                    this.animatedElements.add(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        // 初始化所有动画
        this.initializeAnimations();
        this.bindEvents();
    }

    initializeAnimations() {
        // 为所有粗体元素设置初始状态和观察
        const boldElements = document.querySelectorAll('.bold, strong, b');
        boldElements.forEach(element => {
            // 添加过渡类
            element.classList.add('bold');
            // 观察元素
            this.observer.observe(element);
        });

        // 为所有indent段落设置初始状态和观察
        const indentElements = document.querySelectorAll('.indent');
        indentElements.forEach(element => {
            this.observer.observe(element);
        });

        // 为标题中的粗体元素添加特殊处理
        const headingBolds = document.querySelectorAll('h1 .bold, h2 .bold, h3 .bold, h1 strong, h2 strong, h3 strong');
        headingBolds.forEach(element => {
            element.classList.add('bold');
        });
    }

    triggerFadeInAnimation(element) {
        // 添加延迟以创建更自然的效果
        const delay = Math.random() * 200;
        
        setTimeout(() => {
            if (element.classList.contains('indent')) {
                element.classList.add('slide-in');
            } else {
                element.classList.add('fade-in');
            }
        }, delay);
    }

    // 重新初始化动画（用于动态内容）
    reinitialize() {
        // 清除已动画元素的记录
        this.animatedElements.clear();
        
        // 移除现有的动画类
        document.querySelectorAll('.fade-in, .slide-in').forEach(element => {
            element.classList.remove('fade-in', 'slide-in');
        });

        // 重新初始化
        setTimeout(() => {
            this.initializeAnimations();
        }, 50);
    }

    // 为面板切换添加特殊处理
    handlePanelSwitch(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // 为面板内的元素重新触发动画
        const boldElements = panel.querySelectorAll('.bold, strong, b');
        const indentElements = panel.querySelectorAll('.indent');

        // 清除这些元素的动画状态
        [...boldElements, ...indentElements].forEach(element => {
            element.classList.remove('fade-in', 'slide-in');
            this.animatedElements.delete(element);
        });

        // 重新触发动画
        setTimeout(() => {
            boldElements.forEach(element => {
                if (this.isElementVisible(element)) {
                    this.triggerFadeInAnimation(element);
                }
            });
            indentElements.forEach(element => {
                if (this.isElementVisible(element)) {
                    this.triggerFadeInAnimation(element);
                }
            });
        }, 100);
    }

    // 检查元素是否在视窗中可见
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    bindEvents() {
        // 监听面板切换
        document.querySelectorAll('[data-tabs] a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = e.target.getAttribute('href');
                if (href && href.startsWith('#panel_')) {
                    setTimeout(() => {
                        this.handlePanelSwitch(href.substring(1));
                    }, 100);
                }
            });
        });

        // 监听搜索框变化（如果存在）
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.reinitialize();
                }, 300);
            });
        }

        // 监听Foundation标签页切换
        $(document).on('change.zf.tabs', () => {
            setTimeout(() => {
                this.reinitialize();
            }, 100);
        });
    }

    // 销毁方法
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.animatedElements.clear();
    }
}

// 全局实例
let textAnimationController;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    textAnimationController = new TextAnimationController();
});

// 导出给其他脚本使用
if (typeof window !== 'undefined') {
    window.TextAnimationController = TextAnimationController;
    window.textAnimationController = textAnimationController;
}
