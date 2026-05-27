// sync_manager — 广播端: 拦截本地操作并广播到房间
// 接收端在 sync_manager.js 中，通过 _SyncInternal 共享
function getInternal() {
    return window.Game.Online?._SyncInternal || null;
}

function getClient() {
    return getInternal()?.Client?.() || null;
}

    /**
     * 拦截本地 dispatch，用于在线模式广播
     * 在 game_controller.js 中调用
     */
    function interceptDispatch(actionType, payload) {
        const I = getInternal();
        if (!I) return;
        if (I.isApplyingRemote) return; // 不广播远程操作

        const gs = window.Game.GameState;
        if (!gs || !gs.onlineMode) return;

        const client = getClient();
        if (!client || !client.isConnected || !client.currentRoomId) return;

        if (actionType === 'move' && payload.card) {
            const moveRoleData = payload.moveRole ? {
                id: payload.moveRole.id,
                characterId: payload.moveRole.characterId,
                name: payload.moveRole.name
            } : null;
            const targetArea = resolveLocalArea(payload.toArea);
            const targetIndex = payload.position > 0 ? payload.position - 1 : -1;
            client.broadcastAction('moveCard', {
                cardId: payload.card.id,
                toAreaPath: I.getCardLocationPath(payload.card) || I.getAreaLocationPath(targetArea, targetIndex),
                position: payload.position || -1,
                moveRole: moveRoleData
            });
        } else if (actionType === 'modifyHealth') {
            client.broadcastAction('modifyHealth', {
                roleId: payload.roleId,
                delta: payload.delta
            });
        } else if (actionType === 'modifyMaxHealth') {
            client.broadcastAction('modifyMaxHealth', {
                roleId: payload.roleId,
                delta: payload.delta
            });
        } else if (actionType === 'setSandboxTurn') {
            client.broadcastAction('setSandboxTurn', {
                playerIndex: payload.playerIndex
            });
        }
    }

    function resolveLocalArea(areaOrId) {
        return window.Game._ControllerInternal?.resolveArea?.(areaOrId) || null;
    }

    /**
     * 视角切换时的在线广播
     */
    function broadcastPerspectiveChange(perspectiveIndex) {
        const gs = window.Game.GameState;
        if (!gs || !gs.onlineMode) return;

        const client = getClient();
        if (client && client.isConnected) {
            client.setPerspective(perspectiveIndex);
        }
    }

    /**
     * 获取某个角色（玩家索引）的观察者用户名列表
     */
    function getViewersForPlayer(playerIndex) {
        const perspectives = getInternal()?.perspectives;
        if (!perspectives) return [];
        const viewers = perspectives[playerIndex];
        if (!viewers || !Array.isArray(viewers)) return [];
        return viewers.map(v => ({ username: v.username, spectating: !!v.spectating }));
    }

    /**
     * 更新本地用户在 perspectives 中的旁观标记，使 viewer label 能正确渲染旁观样式。
     * 仅修改本机 perspectives 数据（广播由调用方负责）。
     */
    function updateLocalSpectating(isSpectating) {
        const perspectives = getInternal()?.perspectives;
        if (!perspectives) return;
        const myId = localStorage.getItem('id');
        if (!myId) return;
        for (const idx in perspectives) {
            const arr = perspectives[idx];
            if (Array.isArray(arr)) {
                const viewer = arr.find(v => v.userId === myId);
                if (viewer) {
                    viewer.spectating = !!isSpectating;
                    break;
                }
            }
        }
    }

    /**
     * 全量同步当前状态到房间（用于游戏开始后或手动触发）
     */
    function pushFullState() {
        const I = getInternal();
        const client = getClient();
        if (!I) return;
        if (!client || !client.isConnected) return;
        const state = I.serializeGameState();
        client.syncFullState(state);
    }


    // ===== 扩展导出（广播端）=====
const broadcasterApi = {
        interceptDispatch,
        broadcastPerspectiveChange,
        getViewersForPlayer,
        updateLocalSpectating,
        pushFullState,
    };

function attachBroadcasterApi() {
    const syncManager = window.Game.Online?.SyncManager;
    if (!syncManager) return false;
    Object.assign(syncManager, broadcasterApi);
    return true;
}

if (!attachBroadcasterApi()) {
    window.addEventListener('game-sync-manager-ready', attachBroadcasterApi, { once: true });
}
