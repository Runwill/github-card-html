// 文本动画控制器
class TextAnimationController {
    constructor() {
        this.observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };
        
        this.init();
    }

    init() {
        // 为元素分配动画索引
        this.assignAnimationIndexes();
        
        // 页面加载完成后立即触发动画
        this.setupInitialAnimations();
        
        // 设置滚动触发的动画
        this.setupScrollAnimations();
        
        // 设置交互式动画
        this.setupInteractiveAnimations();
    }

    assignAnimationIndexes() {
        // 为基础动画元素分配索引，特殊元素动画已移除
        const animatableElements = document.querySelectorAll(`
            h1, h2, h3, .indent, padding
        `);
        
        animatableElements.forEach((element, index) => {
            element.style.setProperty('--index', index);
        });
    }

    setupInitialAnimations() {
        // 使用DOMContentLoaded而不是load，更快触发
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.classList.add('loaded');
                this.animateInitialElements();
            });
        } else {
            // 如果DOM已经加载完成，立即执行
            document.body.classList.add('loaded');
            this.animateInitialElements();
        }
    }

    animateInitialElements() {
        // 为所有主要文本元素添加动画类
        const elements = document.querySelectorAll('h1, h2, h3, .indent, padding');
        
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('animate-in');
            }, index * 20); // 减少到20ms的错位延迟
        });
    }

    setupScrollAnimations() {
        // 创建 Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // 为子元素添加级联动画
                    this.cascadeChildAnimations(entry.target);
                }
            });
        }, this.observerOptions);

        // 观察所有需要滚动动画的元素
        const scrollElements = document.querySelectorAll('.scroll, .indent, padding');
        scrollElements.forEach(el => {
            el.classList.add('fade-in-on-scroll');
            observer.observe(el);
        });
    }

    cascadeChildAnimations(parent) {
        const children = parent.querySelectorAll('h1, h2, h3, .indent, padding');
        children.forEach((child, index) => {
            setTimeout(() => {
                child.classList.add('visible');
            }, index * 100);
        });
    }

    setupInteractiveAnimations() {
        // 为标题添加悬停动画已移除
        
        // 为按钮添加特殊动画
        const buttons = document.querySelectorAll('.button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e);
            });
        });

        // 为第一个h1添加打字机效果已移除

        // 脉冲动画已移除
    }

    // animateHeadingHover方法已移除

    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    }



    // addTypewriterEffect方法已移除
    // createTextParticles方法已移除
    // addWaveEffect方法已移除
}

// 页面加载时初始化动画控制器
document.addEventListener('DOMContentLoaded', () => {
    window.textAnimationController = new TextAnimationController();
});

// addWaveAnimation函数已移除
// addTypewriterAnimation函数已移除  
// createTextExplosion函数已移除

// switchAnimationTheme函数已移除
