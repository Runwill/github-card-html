(function() {
    // 初始化
    function initGame() {
        if (!window.Game || !window.Game.UI || !window.Game.Core) {
            console.error("Game modules not loaded correctly.");
            return;
        }

        window.Game.UI.loadTermColors();
        const startBtn = document.getElementById('btn-start-game');
        const endTurnBtn = document.getElementById('btn-end-turn');
        const playCardBtn = document.getElementById('btn-play-card');
        const pauseBtn = document.getElementById('btn-pause-game');

        if (startBtn) {
            // startBtn.addEventListener('click', window.Game.Core.startGame);
            // 修改为使用控制器，默认启用 'auto' 模式
            startBtn.addEventListener('click', () => {
                 if (window.Game.Controller && window.Game.Controller.startGame) {
                     window.Game.Controller.startGame();
                 } else {
                     window.Game.Core.startGame();
                 }
            });
        }
        
        // Initialize Setup Manager if available
        if (window.Game.Setup && window.Game.Setup.init) {
            window.Game.Setup.init();
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                // window.Game.Core.togglePause();
                window.Game.Controller.togglePause();
            });
        }
        
        // Speed Control
        const speedRange = document.getElementById('game-speed-range');
        const speedVal = document.getElementById('game-speed-val');
        const STORAGE_KEY_SPEED = 'card_game_speed_setting';

        if (speedRange && speedVal) {
            // Load saved speed
            const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);
            if (savedSpeed !== null) {
                const val = parseInt(savedSpeed, 10);
                if (!isNaN(val)) {
                    speedRange.value = val;
                    speedVal.textContent = `${val}ms`;
                }
            }

            // Sync initial value to Controller
            const currentVal = parseInt(speedRange.value, 10);
            window.Game.Controller.setSpeed(currentVal);

            speedRange.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                speedVal.textContent = `${val}ms`;
                
                // Save to storage
                localStorage.setItem(STORAGE_KEY_SPEED, val);

                // if (window.Game.Core && window.Game.Core.setSpeed) {
                //    window.Game.Core.setSpeed(val);
                // }
                window.Game.Controller.setSpeed(val);
            });
        }

        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', window.Game.Core.advanceState);
            // Update button text to "Next Step"
            if (window.i18n) {
                endTurnBtn.textContent = i18n.t('game.nextStep');
            }
        }
        if (playCardBtn) {
            playCardBtn.addEventListener('click', window.Game.Core.playCard);
        }

        // Listen for theme changes to update colors
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    window.Game.UI.updateUI();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // Hook into window load or wait for partials
    document.addEventListener('DOMContentLoaded', () => {
        // Simple check to see if partials are loaded, or just retry
        // Since the app uses a custom loader, we might need to wait for that.
        const checkInterval = setInterval(() => {
            if (document.getElementById('panel_game')) {
                clearInterval(checkInterval);
                initGame();
            }
        }, 500);
    });

})();
