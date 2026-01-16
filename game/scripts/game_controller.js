(function() {
    window.Game = window.Game || {};
    
    // Config: 'auto' (default) or 'manual' (sandbox)
    // You can change this via console: Game.Controller.switchMode('manual')
    let currentMode = 'auto'; 
    let currentEngine = null;

    function init() {
        console.log("[Controller] Initializing Game Controller...");
        
        // Expose Setup Method
        window.Game.startFunction = startGame;
    }

    function startGame(config = {}) {
        // Decide mode
        const mode = config.mode || currentMode;
        currentMode = mode; // Start: Update global state to match config
        
        window.Game.GameState.isGameRunning = false; // Reset first
        
        if (mode === 'manual' || mode === 'sandbox') {
            if (!window.Game.Engines || !window.Game.Engines.SandboxEngine) {
                console.error("SandboxEngine not loaded!");
                return;
            }
            console.log("[Controller] Starting Sandbox Mode");
            currentEngine = new window.Game.Engines.SandboxEngine();
            currentEngine.init(config);
            
            // Override global Actions to point to Engine (if needed by UI)
            // UI usually calls Game.Core.playCard or similar.
            // We might need to map manual actions here.
            
        } else {
            // Default Auto/Flow Mode (Legacy GameRun)
            // The existing game_core.js logic is basically the "FlowEngine"
            console.log("[Controller] Starting Auto/Flow Mode");
            
            if (window.Game.Core && window.Game.Core.startGame) {
                window.Game.Core.startGame(config);
            }
        }
    }
    
    function switchMode(mode) {
        currentMode = mode;
        console.log(`[Controller] Mode switched to ${mode}. Restart game to apply.`);
    }

    function setSpeed(ms) {
        // Forward to Core or Engine
        if (window.Game.Core && window.Game.Core.setSpeed) {
            window.Game.Core.setSpeed(ms);
        }
    }

    // Unified dispatch method for UI actions
    function dispatch(actionType, payload) {
        if (currentMode === 'manual' || currentMode === 'sandbox') {
            if (currentEngine) {
                if (actionType === 'move') {
                    // payload: { card, toArea, position, fromArea, fromIndex, callbacks }
                    // Engine expects: moveCard(card, toArea, toIndex = -1)
                    // We need to support 'callbacks' for UI animations in manual mode too
                    
                    // Direct manipulation
                    currentEngine.moveCard(payload.card, payload.toArea, payload.position - 1); // 0-based
                    
                    // Trigger UI callbacks manually since there's no event stack
                    if (payload.callbacks) {
                        if (typeof payload.callbacks.onMoveExecuted === 'function') {
                            payload.callbacks.onMoveExecuted();
                        }
                        // Simulate async animation or just complete
                        setTimeout(() => {
                            if (typeof payload.callbacks.onComplete === 'function') {
                                payload.callbacks.onComplete();
                            }
                        }, 50); 
                    }
                } else if (actionType === 'modifyHealth') {
                    // payload: { roleId, delta }
                    if (currentEngine.modifyHealth) {
                        currentEngine.modifyHealth(payload.roleId, payload.delta);
                    }
                } else if (actionType === 'modifyMaxHealth') {
                    // payload: { roleId, delta }
                    if (currentEngine.modifyMaxHealth) {
                        currentEngine.modifyMaxHealth(payload.roleId, payload.delta);
                    }
                }
            }
        } else {
            // Auto/Flow Mode
             if (actionType === 'move') {
                 // Forward to Core Event
                 window.Game.Core.Events.move(
                     payload.moveRole,
                     payload.card,
                     payload.toArea,
                     payload.position,
                     payload.fromArea,
                     payload.fromIndex,
                     payload.callbacks
                 );
             }
        }
    }

    window.Game.Controller = {
        init,
        startGame,
        switchMode,
        setSpeed,
        dispatch
    };

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
