(function() {
    window.Game = window.Game || {};
    
    // 确保模型已加载
    const Area = window.Game.Models && window.Game.Models.Area;

    // 游戏状态
    window.Game.GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
        isPaused: false,
        
        // Areas will be initialized immediately if Area class is available
        pile: null, 
        discardPile: null,
        treatmentArea: null,

        // Stack of active nodes (indices in their parent's children array)
        flowStack: [],
        
        // Dynamic Event Stack (for events like Damage, Recover, etc.)
        // Each item is an object: { type: 'event', name: 'damage', steps: [], currentStepIndex: 0, context: {} }
        eventStack: []
    };

    if (Area) {
        window.Game.GameState.pile = new Area('pile', Area.Configs.Pile);
        window.Game.GameState.discardPile = new Area('discardPile', Area.Configs.DiscardPile);
        window.Game.GameState.treatmentArea = new Area('treatmentArea', Area.Configs.TreatmentArea);
    } else {
        console.error("Game.Models.Area not found during State initialization. Make sure models.js is loaded before state.js");
    }

    // 暴露模拟数据（如果需要可以添加其他数据）
    window.Game.MockData = {};

})();
