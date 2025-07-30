// 波浪按钮效果管理器
class WaveButtonManager {
    constructor() {
        this.activeRipples = new Set();
        this.init();
    }

    init() {
        // 使用事件代理优化性能
        document.addEventListener('click', (e) => {
            if (e.target.matches('.button.wave')) {
                this.createRipple(e);
            }
        });
    }

    createRipple(event) {
        const button = event.target;
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            position: absolute;
            background: #ffffff;
            transform: translate(-50%, -50%);
            pointer-events: none;
            border-radius: 50%;
            animation: animate 1s linear forwards;
        `;

        button.appendChild(ripple);
        this.activeRipples.add(ripple);

        // 使用 animationend 事件而不是 setTimeout
        ripple.addEventListener('animationend', () => {
            this.removeRipple(ripple);
        });

        // 备用清理机制
        setTimeout(() => {
            if (this.activeRipples.has(ripple)) {
                this.removeRipple(ripple);
            }
        }, 1100);
    }

    removeRipple(ripple) {
        if (ripple && ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
        this.activeRipples.delete(ripple);
    }

    // 清理所有活动的波纹效果
    cleanup() {
        this.activeRipples.forEach(ripple => {
            this.removeRipple(ripple);
        });
    }
}

// 初始化波浪按钮管理器
let waveButtonManager;

function add_button_wave() {
    if (!waveButtonManager) {
        waveButtonManager = new WaveButtonManager();
    }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', add_button_wave);