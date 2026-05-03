(function () {
    // sync_manager — 广播端: 拦截本地操作并广播到房间
    // 接收端在 sync_manager.js 中，通过 _SyncInternal 共享
    const I = window.Game.Online._SyncInternal;
    const SM = window.Game.Online.SyncManager;
    const Client = I.Client;

    /**
     * 拦截本地 dispatch，用于在线模式广播
     * 在 game_controller.js 中调用
     */
    function interceptDispatch(actionType, payload) {
        if (I.isApplyingRemote) return; // 不广播远程操作

        const gs = window.Game.GameState;
        if (!gs || !gs.onlineMode) return;

        const client = Client();
        if (!client || !client.isConnected || !client.currentRoomId) return;

        if (actionType === 'move' && payload.card) {
            const moveRoleData = payload.moveRole ? {
                id: payload.moveRole.id,
                characterId: payload.moveRole.characterId,
                name: payload.moveRole.name
            } : null;
            client.broadcastAction('moveCard', {
                cardId: payload.card.id,
                toAreaPath: I.getAreaPath(resolveLocalArea(payload.toArea)),
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
        if (!areaOrId) return null;
        if (typeof areaOrId === 'object') return areaOrId;
        // If string identifier, use controller's resolveArea concept
        const gs = window.Game.GameState;
        if (!gs) return null;
        if (gs[areaOrId]) return gs[areaOrId];

        if (areaOrId === 'hand') {
            const perspIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
            const p = gs.players && gs.players[perspIdx];
            return p ? p.hand : null;
        }

        if (typeof areaOrId === 'string' && (areaOrId.startsWith('role:') || areaOrId.startsWith('role-judge:'))) {
            const isJudge = areaOrId.startsWith('role-judge:');
            const isEquip = areaOrId.includes(':equip');
            const roleId = parseInt(areaOrId.split(':')[1]);
            const p = gs.players.find(pl => pl.id === roleId);
            if (p) {
                if (isJudge) return p.judgeArea;
                if (isEquip && p.equipSlots) {
                    const slotMatch = areaOrId.match(/:slot:(\d+)/);
                    const slotIndex = slotMatch ? parseInt(slotMatch[1]) : 0;
                    return p.equipSlots[slotIndex] || null;
                }
                return p.hand;
            }
        }

        return null;
    }

    /**
     * 视角切换时的在线广播
     */
    function broadcastPerspectiveChange(perspectiveIndex) {
        const gs = window.Game.GameState;
        if (!gs || !gs.onlineMode) return;

        const client = Client();
        if (client && client.isConnected) {
            client.setPerspective(perspectiveIndex);
        }
    }

    /**
     * 获取某个角色（玩家索引）的观察者用户名列表
     */
    function getViewersForPlayer(playerIndex) {
        const perspectives = I.perspectives;
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
        const perspectives = I.perspectives;
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
        const client = Client();
        if (!client || !client.isConnected) return;
        const state = I.serializeGameState();
        client.syncFullState(state);
    }


    // ===== 扩展导出（广播端）=====
    Object.assign(SM, {
        interceptDispatch,
        broadcastPerspectiveChange,
        getViewersForPlayer,
        updateLocalSpectating,
        pushFullState,
    });

})();
