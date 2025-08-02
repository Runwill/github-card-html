// 防止快速悬浮时的动画闪动问题
class SmoothHover {
    constructor() {
        this.animatingElements = new Set();
        this.init();
    }

    init() {
        // 为所有 indent 元素添加平滑悬浮效果
        this.setupIndentAnimation();
        // 为所有标题元素添加平滑悬浮效果  
        this.setupTitleAnimation();
    }

    setupIndentAnimation() {
        const indentElements = document.querySelectorAll('.indent');
        
        indentElements.forEach(element => {
            let isAnimating = false;
            let pendingState = null; // 'hover' 或 'leave' 或 null
            
            const applyHoverState = () => {
                if (isAnimating) {
                    pendingState = 'hover';
                    return;
                }
                
                isAnimating = true;
                element.style.transform = 'translateX(8px)';
                element.style.borderLeft = '3px solid rgba(134, 152, 255, 0.6)';
                element.style.paddingLeft = '12px';
                element.style.color = '#2d3748';
                
                // 动画完成后处理待处理状态
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState === 'leave') {
                        applyLeaveState();
                    }
                    pendingState = null;
                }, 400); // 与 CSS transition 时间一致
            };
            
            const applyLeaveState = () => {
                if (isAnimating) {
                    pendingState = 'leave';
                    return;
                }
                
                isAnimating = true;
                element.style.transform = 'translateX(0)';
                element.style.borderLeft = '3px solid transparent';
                element.style.paddingLeft = '0';
                element.style.color = '';
                element.style.textShadow = '';
                
                // 动画完成后处理待处理状态
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState === 'hover') {
                        applyHoverState();
                    }
                    pendingState = null;
                }, 400); // 与 CSS transition 时间一致
            };
            
            element.addEventListener('mouseenter', applyHoverState);
            element.addEventListener('mouseleave', applyLeaveState);
        });
    }

    setupTitleAnimation() {
        const titleElements = document.querySelectorAll('h1, h2, h3');
        
        titleElements.forEach(element => {
            let isAnimating = false;
            let pendingState = null; // 'hover' 或 'leave' 或 null
            
            const applyHoverState = () => {
                if (isAnimating) {
                    pendingState = 'hover';
                    return;
                }
                
                isAnimating = true;
                element.style.letterSpacing = '0.02em';
                
                // 动画完成后处理待处理状态
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState === 'leave') {
                        applyLeaveState();
                    }
                    pendingState = null;
                }, 500); // 与 CSS transition 时间一致
            };
            
            const applyLeaveState = () => {
                if (isAnimating) {
                    pendingState = 'leave';
                    return;
                }
                
                isAnimating = true;
                element.style.letterSpacing = '0';
                
                // 动画完成后处理待处理状态
                setTimeout(() => {
                    isAnimating = false;
                    if (pendingState === 'hover') {
                        applyHoverState();
                    }
                    pendingState = null;
                }, 500); // 与 CSS transition 时间一致
            };
            
            element.addEventListener('mouseenter', applyHoverState);
            element.addEventListener('mouseleave', applyLeaveState);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SmoothHover();
});
