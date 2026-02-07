// 增强波浪按钮效果管理器
class WaveButtonManager {
    constructor() {
        this.activeRipples = new Set();
        document.addEventListener('click', this.handleClick.bind(this), true);
    }

    handleClick(event) {
    const button = event.target.closest('.ripple-button');
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
        const d=(a,b)=>a*a+b*b;
        const maxRadius = Math.sqrt(Math.max(
            d(x, y),
            d(rect.width - x, y),
            d(x, rect.height - y),
            d(rect.width - x, rect.height - y)
        ));

        // 获取按钮的主题色调
    const rippleColor = this.getRippleColor(window.getComputedStyle(button));

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

        button.appendChild(ripple);
        this.activeRipples.add(ripple);

        // 清理机制：优先依赖动画结束事件，备用超时兜底
        const remove = () => this.removeRipple(ripple);
        ripple.addEventListener('animationend', remove, { once: true });
        setTimeout(() => { if (this.activeRipples.has(ripple)) remove(); }, 400);
    }

    getRippleColor(computedStyle) {
        const bgColor = computedStyle.backgroundColor;
        // 如果是透明背景，使用文字颜色的透明版本
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            const rgb = computedStyle.color.match(/\d+/g);
            return (rgb && rgb.length >= 3) ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)` : 'rgba(255, 255, 255, 0.2)';
        }

        // 否则使用白色或黑色，根据背景亮度决定
        const m = bgColor.match(/\d+/g);
        const brightness = (m && m.length >= 3)
          ? (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000
          : 128;
        return brightness > 128 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
    }

    removeRipple(ripple) {
        if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple);
        this.activeRipples.delete(ripple);
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

                /* 波纹按钮的悬停/按下过渡效果 */
                .ripple-button {
                    transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                .ripple-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .ripple-button:active {
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
}