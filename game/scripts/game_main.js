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
            startBtn.addEventListener('click', () => {
                const controller = window.Game.Controller;
                if (controller?.startGame) {
                    controller.startGame();
                } else {
                    window.Game.Core.startGame();
                }
            });
        }
        
        // Initialize Custom Select dropdowns for static selects
        window.CustomSelect?.init(document.querySelector('.game-panel'));

        // Initialize Setup Manager if available
        window.Game.Setup?.init?.();

        // Initialize Online Room modules if available
        if (window.Game.Online) {
            window.Game.Online.SyncManager?.init?.();
            window.Game.Online.RoomUI?.init?.();
        }
        
        // Load saved game settings (speed, inertia)
        window.KeySettings?.loadGameSettings?.();

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                window.Game.Controller.togglePause();
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
        const observer = new MutationObserver(() => window.Game.UI.updateUI());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    whenDOMReady().then(() => whenPartialsReady().then(initGame));

})();
