// 文本动画控制器
class TextAnimationController {
    constructor() {
        this.observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };
        this.observer = null;
        this.init();
    }

    init() {
        this.assignAnimationIndexes();
        this.setupInitialAnimations();
        this.setupScrollAnimations();
        this.listenTabSwitch();
    }

    assignAnimationIndexes() {
        document.querySelectorAll('h1, h2, h3, .indent, padding').forEach((element, index) => {
            element.style.setProperty('--index', index);
        });
    }

    setupInitialAnimations() {
        const addLoadedClass = () => document.body.classList.add('loaded');
        document.readyState === 'loading' ? 
            document.addEventListener('DOMContentLoaded', addLoadedClass) : 
            addLoadedClass();
    }

    startAnimations() {
        document.querySelectorAll('h1, h2, h3, .indent, padding').forEach(element => {
            element.classList.add('animate-in');
            element.addEventListener('animationend', () => {
                element.classList.add('animate-done');
            }, { once: true });
        });
    }

    setupScrollAnimations() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this.cascadeChildAnimations(entry.target);
                }
            });
        }, this.observerOptions);

        document.querySelectorAll('.scroll, .indent, padding').forEach(el => {
            el.classList.add('fade-in-on-scroll');
            this.observer.observe(el);
        });
    }

    cascadeChildAnimations(parent) {
        parent.querySelectorAll('h1, h2, h3, .indent, padding').forEach((child, index) => {
            setTimeout(() => child.classList.add('visible'), index * 100);
        });
    }

    // 重播指定面板内的文本入场动画
    replayAnimations(panel) {
        if (!panel) return;
        const sel = 'h1, h2, h3, .indent, padding';
        const targets = panel.querySelectorAll(sel);
        if (!targets.length) return;

        // 1) 移除动画状态类
        targets.forEach(el => {
            el.classList.remove('animate-in', 'animate-done', 'visible');
        });
        // 滚动元素也重置
        panel.querySelectorAll('.scroll, .indent, padding').forEach(el => {
            el.classList.remove('visible');
        });

        // 2) 强制回流，让浏览器识别状态重置
        void panel.offsetWidth;

        // 3) 重新分配动画索引并触发动画
        targets.forEach((el, index) => {
            el.style.setProperty('--index', index);
            el.classList.add('animate-in');
            el.addEventListener('animationend', () => {
                el.classList.add('animate-done');
            }, { once: true });
        });

        // 4) 重新观察滚动元素
        if (this.observer) {
            panel.querySelectorAll('.scroll, .indent, padding').forEach(el => {
                this.observer.unobserve(el);
                this.observer.observe(el);
            });
        }
    }

    // 监听 tab 切换，对新激活面板重播动画
    listenTabSwitch() {
        const hook = () => {
            document.querySelectorAll('#main-tabs a[href^="#panel_"]').forEach(a => {
                a.addEventListener('click', () => {
                    const href = a.getAttribute('href') || '';
                    const panel = document.querySelector(href);
                    // 若面板已处于激活状态（重复点击同一 tab），跳过动画重播
                    if (panel && !panel.classList.contains('is-active')) {
                        // 延迟一帧确保 Foundation 已完成面板切换（display 从 none 变为 block）
                        requestAnimationFrame(() => this.replayAnimations(panel));
                    }
                }, { passive: true });
            });
        };
        // 等 partials 加载完毕再绑定
        if (window.partialsReady && window.partialsReady.then) {
            window.partialsReady.then(hook).catch(hook);
        } else {
            hook();
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.textAnimationController = new TextAnimationController();
});
