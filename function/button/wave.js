// 增强波浪按钮效果管理器
class WaveButtonManager {
    constructor() {
        this.activeRipples = new Set();
        this.animationFrameId = null;
        this.pendingCleanup = new Set();
        this.isDocumentReady = false;
        this.init();
    }

    init() {
        // 确保DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.isDocumentReady = true;
                this.setupEventListeners();
            });
        } else {
            this.isDocumentReady = true;
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // 使用被动监听器优化性能，立即响应点击
        document.addEventListener('click', this.handleClick.bind(this), { 
            passive: false, 
            capture: true  // 在捕获阶段处理，提前响应
        });

        // 页面卸载时清理资源
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    handleClick(event) {
        const button = event.target.closest('.button.wave');
        if (button) {
            // 立即创建波纹效果，不等待DOM检查
            this.createRipple(event, button);
        }
    }

    createRipple(event, button) {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // 计算最大扩散半径，确保覆盖整个按钮
        const maxRadius = Math.max(
            Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
            Math.sqrt(Math.pow(rect.width - x, 2) + Math.pow(y, 2)),
            Math.sqrt(Math.pow(x, 2) + Math.pow(rect.height - y, 2)),
            Math.sqrt(Math.pow(rect.width - x, 2) + Math.pow(rect.height - y, 2))
        );

        // 获取按钮的主题色调
        const computedStyle = window.getComputedStyle(button);
        const rippleColor = this.getRippleColor(computedStyle);

        const ripple = document.createElement('span');
        ripple.className = 'wave-ripple';

        // 使用CSS变量和transform优化性能，减少动画时长提高响应速度
        ripple.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${maxRadius * 2}px;
            height: ${maxRadius * 2}px;
            position: absolute;
            background: ${rippleColor};
            transform: translate(-50%, -50%) scale(0);
            pointer-events: none;
            border-radius: 50%;
            opacity: 0.6;
            z-index: 1;
            animation: waveRipple 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        `;

        // 确保按钮有相对定位和溢出隐藏
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        button.style.overflow = 'hidden';

        button.classList.add('ripple-active');
        button.appendChild(ripple);
        this.activeRipples.add(ripple);

        // 优化的清理机制
        const cleanup = () => {
            this.removeRipple(ripple, button);
        };

        // 使用事件监听而不是定时器
        ripple.addEventListener('animationend', cleanup, { once: true });

        // 备用清理机制，缩短时间提高响应速度
        setTimeout(() => {
            if (this.activeRipples.has(ripple)) {
                cleanup();
            }
        }, 400);
    }

    getRippleColor(computedStyle) {
        const bgColor = computedStyle.backgroundColor;
        const textColor = computedStyle.color;

        // 如果是透明背景，使用文字颜色的透明版本
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            return this.addOpacity(textColor, 0.2);
        }

        // 否则使用白色或黑色，根据背景亮度决定
        const brightness = this.getBrightness(bgColor);
        return brightness > 128 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
    }

    getBrightness(color) {
        // 简单的亮度计算
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            return (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        }
        return 128; // 默认中等亮度
    }

    addOpacity(color, opacity) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
        }
        return `rgba(255, 255, 255, ${opacity})`;
    }

    removeRipple(ripple, button) {
        if (ripple && ripple.parentNode) {
            // 使用requestAnimationFrame优化DOM操作
            this.animationFrameId = requestAnimationFrame(() => {
                ripple.parentNode.removeChild(ripple);
                button.classList.remove('ripple-active');
            });
        }
        this.activeRipples.delete(ripple);
    }

    // 清理所有活动的波纹效果
    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.activeRipples.forEach(ripple => {
            if (ripple && ripple.parentNode) {
                const button = ripple.parentNode;
                ripple.parentNode.removeChild(ripple);
                button.classList.remove('ripple-active');
            }
        });

        this.activeRipples.clear();
        this.pendingCleanup.clear();
    }

    // 获取性能统计
    getStats() {
        return {
            activeRipples: this.activeRipples.size,
            isReady: this.isDocumentReady
        };
    }
}

// 初始化波浪按钮管理器
let waveButtonManager;

function add_button_wave() {
    if (!waveButtonManager) {
        waveButtonManager = new WaveButtonManager();

        // 添加CSS动画样式
        if (!document.getElementById('wave-ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'wave-ripple-styles';
            style.textContent = `
                @keyframes waveRipple {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0.6;
                    }
                    50% {
                        opacity: 0.3;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0;
                    }
                }

                .button.wave {
                    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .button.wave:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .button.wave:active {
                    transform: translateY(0);
                    transition-duration: 0.05s;
                }

                .wave-ripple {
                    will-change: transform, opacity;
                }
            `;
            document.head.appendChild(style);
        }
    }
    return waveButtonManager;
}

// 导出管理器实例以供外部使用
window.WaveButtonManager = WaveButtonManager;

// 自动初始化
document.addEventListener('DOMContentLoaded', add_button_wave);