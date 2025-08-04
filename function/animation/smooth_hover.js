// 平滑悬浮动画
class SmoothHover {
    constructor() {
        this.init();
    }

    init() {
        this.setupIndentAnimation();
        this.setupTitleAnimation();
    }

    setupIndentAnimation() {
        document.querySelectorAll('.indent').forEach(element => {
            if (element.querySelector('.button, button')) return;
            
            let isAnimating = false;
            let pendingState = null;
            
            const setState = (isHover) => {
                if (isAnimating) {
                    pendingState = isHover ? 'hover' : 'leave';
                    return;
                }
                
                isAnimating = true;
                Object.assign(element.style, {
                    transform: isHover ? 'translateX(4px)' : 'translateX(0)',
                    borderLeft: isHover ? '3px solid rgba(134, 152, 255, 0.6)' : '3px solid transparent',
                    paddingLeft: isHover ? '12px' : '0',
                    color: isHover ? '#2d3748' : ''
                });
                
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState) {
                        setState(pendingState === 'hover');
                        pendingState = null;
                    }
                }, 400);
            };
            
            element.addEventListener('mouseenter', () => setState(true));
            element.addEventListener('mouseleave', () => setState(false));
        });
    }

    setupTitleAnimation() {
        document.querySelectorAll('h1, h2, h3').forEach(element => {
            let isAnimating = false;
            let pendingState = null;
            
            const setState = (isHover) => {
                if (isAnimating) {
                    pendingState = isHover ? 'hover' : 'leave';
                    return;
                }
                
                isAnimating = true;
                element.style.letterSpacing = isHover ? '0.02em' : '0';
                
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState) {
                        setState(pendingState === 'hover');
                        pendingState = null;
                    }
                }, 500);
            };
            
            element.addEventListener('mouseenter', () => setState(true));
            element.addEventListener('mouseleave', () => setState(false));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new SmoothHover());
