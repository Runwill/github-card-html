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
        this.assignAnimationIndexes();
        this.setupInitialAnimations();
        this.setupScrollAnimations();
        this.setupInteractiveAnimations();
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
        });
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this.cascadeChildAnimations(entry.target);
                }
            });
        }, this.observerOptions);

        document.querySelectorAll('.scroll, .indent, padding').forEach(el => {
            el.classList.add('fade-in-on-scroll');
            observer.observe(el);
        });
    }

    cascadeChildAnimations(parent) {
        parent.querySelectorAll('h1, h2, h3, .indent, padding').forEach((child, index) => {
            setTimeout(() => child.classList.add('visible'), index * 100);
        });
    }

    setupInteractiveAnimations() {
        document.querySelectorAll('.button').forEach(button => {
            button.addEventListener('click', this.createRippleEffect);
        });
    }

    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        Object.assign(ripple.style, {
            width: size + 'px',
            height: size + 'px',
            left: x + 'px',
            top: y + 'px'
        });
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.textAnimationController = new TextAnimationController();
});
