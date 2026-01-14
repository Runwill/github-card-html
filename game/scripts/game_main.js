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
        const pauseBtn = document.getElementById('btn-pause-game');

        if (startBtn) {
            startBtn.addEventListener('click', window.Game.Core.startGame);
        }
        
        // Initialize Setup Manager if available
        if (window.Game.Setup && window.Game.Setup.init) {
            window.Game.Setup.init();
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                window.Game.Core.togglePause();
            });
        }
        
        // Speed Control
        const speedRange = document.getElementById('game-speed-range');
        const speedVal = document.getElementById('game-speed-val');
        if (speedRange && speedVal) {
            speedRange.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                speedVal.textContent = `${val}ms`;
                if (window.Game.Core && window.Game.Core.setSpeed) {
                    window.Game.Core.setSpeed(val);
                }
            });
            // Init default
            if (window.Game.Core && window.Game.Core.setSpeed) {
                window.Game.Core.setSpeed(parseInt(speedRange.value, 10));
            }
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
    
    // --- Interaction Handler ---
    window.Game.UI = window.Game.UI || {};
    window.Game.UI.onCardDrop = function(cardData, sourceZoneId, targetZoneId, targetIndex, sourceIndex) {
        console.log('Dropped:', cardData, sourceZoneId, '->', targetZoneId);
        
        const GameState = window.Game.Core.GameState;
        if (!GameState) return;

        // Logic for Hand -> Treatment Area (Playing a card)
        // Also allow 'area:hand' logic if zone ID is prefixed
        const isSourceHand = sourceZoneId === 'hand' || sourceZoneId === 'area:hand';
        const isTargetTreatment = targetZoneId === 'treatmentArea';

        if (isSourceHand && isTargetTreatment) {
             // 1. Remove from Hand
             const player = GameState.players[GameState.currentPlayerIndex];
             let handArray = null;
             
             if (Array.isArray(player.hand)) {
                 handArray = player.hand;
             } else if (player.hand && Array.isArray(player.hand.cards)) {
                 handArray = player.hand.cards;
             }
             
             if (handArray) {
                 // Remove by index (most reliable if sourceIndex provided)
                 if (sourceIndex >= 0 && sourceIndex < handArray.length) {
                     // Verify match if possible?
                     handArray.splice(sourceIndex, 1);
                 } else {
                     // Fallback check by data loop
                     const idx = handArray.findIndex(c => c === cardData || c.key === cardData.key);
                     if (idx !== -1) handArray.splice(idx, 1);
                 }
                 
                 // 2. Add to Treatment Area
                 if (!GameState.treatmentArea) {
                     GameState.treatmentArea = { cards: [] };
                 }
                 if (!GameState.treatmentArea.cards) {
                     GameState.treatmentArea.cards = [];
                 }
                 
                 if (targetIndex >= 0 && targetIndex <= GameState.treatmentArea.cards.length) {
                      GameState.treatmentArea.cards.splice(targetIndex, 0, cardData);
                 } else {
                      GameState.treatmentArea.cards.push(cardData);
                 }
                 
                 // 3. Trigger Update
                 window.Game.UI.updateUI();
             }
        }
        
        // Logic for Treatment Area -> Treatment Area (Reordering)
        else if (sourceZoneId === 'treatmentArea' && targetZoneId === 'treatmentArea') {
             const areaCards = GameState.treatmentArea.cards;
             if (areaCards && sourceIndex >= 0 && sourceIndex < areaCards.length) {
                 const [movedCard] = areaCards.splice(sourceIndex, 1);
                 
                 // Adjust target index if shifting
                 let finalTarget = targetIndex;
                 // Note: interactions.js calculates raw index in the siblings list.
                 // If source was before target, the target slot shifts "up" (numerically lower) by 1 after removal.
                 // However, "targetIndex" from drop handler usually means "insert at this visual index".
                 /*
                    Example: [A, B, C, D]
                    Move A (0) to after C (viz index 3?)
                    Remove A -> [B, C, D]
                    Insert at 2? -> [B, C, A, D]
                 */
                 // Simple approach: trust the targetIndex but clamp it
                 if (sourceIndex < targetIndex) {
                     finalTarget--; 
                 }
                 
                 if (finalTarget < 0) finalTarget = 0;
                 if (finalTarget > areaCards.length) finalTarget = areaCards.length;
                 
                 areaCards.splice(finalTarget, 0, movedCard);
                 window.Game.UI.updateUI();
             }
        }
    };

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
