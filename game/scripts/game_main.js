(function() {
    // Initialization
    function initGame() {
        if (!window.Game || !window.Game.UI || !window.Game.Core) {
            console.error("Game modules not loaded correctly.");
            return;
        }

        window.Game.UI.loadTermColors();
        const startBtn = document.getElementById('btn-start-game');
        const endTurnBtn = document.getElementById('btn-end-turn');
        const playCardBtn = document.getElementById('btn-play-card');

        if (startBtn) {
            startBtn.addEventListener('click', window.Game.Core.startGame);
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
