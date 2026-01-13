(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function updateControls(GameState) {
        const currentNode = window.Game.Core.getCurrentNode();
        const isWaiting = currentNode && window.Game.Core.isInteractive(currentNode);
        
        const endTurnBtn = document.getElementById('btn-end-turn');
        const playCardBtn = document.getElementById('btn-play-card');
        const pauseBtn = document.getElementById('btn-pause-game');
        
        if (pauseBtn) {
            if (GameState.isGameRunning) {
                pauseBtn.classList.remove('hidden');
                const btnText = GameState.isPaused ? 
                    (i18n.t('game.resume') || 'resume') : 
                    (i18n.t('game.pause') || 'pause');
                
                if (pauseBtn.textContent !== btnText) {
                    pauseBtn.textContent = btnText;
                }
            } else {
                pauseBtn.classList.add('hidden');
            }
        }

        if (isWaiting) {
            if (playCardBtn) playCardBtn.classList.remove('hidden');
            if (endTurnBtn) {
                endTurnBtn.classList.remove('hidden');
            }
        } else {
            if (playCardBtn) playCardBtn.classList.add('hidden');
            if (endTurnBtn) endTurnBtn.classList.add('hidden');
        }
    }

    // 导出
    window.Game.UI.updateControls = updateControls;
})();
