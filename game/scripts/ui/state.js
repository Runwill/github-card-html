(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};
    window.Game.UI.termColors = new Map();

    /**
     * 获取当前 UI 视角下的"主玩家" (Main Player)
     * 通常是当前回合行动的玩家 (Current Active Player)，显示在屏幕底部中心。
     */
    window.Game.UI.getMainPlayer = function() {
        const state = window.Game.GameState;
        if (!state || !state.players) return null;
        // 优先使用当前回合玩家，兜底使用玩家0
        return state.players[state.currentPlayerIndex] || state.players[0];
    };
})();