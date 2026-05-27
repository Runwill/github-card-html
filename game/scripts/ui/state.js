window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};
window.Game.UI.termColors = new Map();

/**
 * 获取当前 UI 视角下的"主玩家" (Main Player)
 * 由 perspectiveIndex 控制，可手动切换，与回合进程无关。
 */
window.Game.UI.getMainPlayer = function() {
    const state = window.Game.GameState;
    if (!state || !state.players) return null;
    const idx = (state.perspectiveIndex != null) ? state.perspectiveIndex : 0;
    return state.players[idx] || state.players[0];
};

/**
 * 切换主视角到指定玩家索引，然后刷新 UI。
 * @param {number} playerIndex - players 数组中的索引
 */
window.Game.UI.setPerspective = function(playerIndex) {
    const state = window.Game.GameState;
    if (!state || !state.players) return;
    if (playerIndex < 0 || playerIndex >= state.players.length) return;
    state.perspectiveIndex = playerIndex;

    // Online: broadcast perspective change to room
    try { window.Game.Online?.SyncManager?.broadcastPerspectiveChange?.(playerIndex); } catch(e) { console.warn('[Online] perspective sync error', e); }
    window.Game.UI.updateUI?.();
};
