/**
 * Game State Sync Manager
 * 负责在线模式下的游戏状态同步
 * - 拦截本地游戏操作并广播
 * - 接收远程操作并应用到本地
 * - 管理视角与用户名映射
 */
(function () {
    window.Game = window.Game || {};
    window.Game.Online = window.Game.Online || {};

    const Client = () => window.Game.Online.RoomClient;

    // 当前房间内的视角映射: perspectiveIndex -> [{ userId, username }]
    let perspectives = {};

    // 防止循环广播的标记
    let isApplyingRemote = false;

    /**
     * 初始化同步管理器（加入房间后调用）
     */
    function init() {
        const client = Client();
        if (!client) return;

        // 监听远程游戏动作
        client.on('gameAction', onRemoteAction);
        client.on('stateUpdated', onRemoteStateUpdate);
    }

    function refreshGameUI() {
        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
    }

    function clearPerspectives() {
        perspectives = {};
        refreshGameUI();
    }

    /**
     * 序列化游戏状态（用于网络传输）
     * 将 GameState 中的关键数据转为 JSON 安全格式
     */
    function serializeGameState() {
        const gs = window.Game.GameState;
        if (!gs) return null;

        return {
            mode: gs.mode,
            isGameRunning: gs.isGameRunning,
            isPaused: gs.isPaused,
            currentPlayerIndex: gs.currentPlayerIndex,
            sandboxTurnIndex: gs.sandboxTurnIndex != null ? gs.sandboxTurnIndex : -1,
            round: gs.round,
            players: gs.players.map(p => serializePlayer(p)),
            pile: serializeArea(gs.pile),
            discardPile: serializeArea(gs.discardPile),
            treatmentArea: serializeArea(gs.treatmentArea),
            flowStack: gs.flowStack ? [...gs.flowStack] : [],
            eventStack: gs.eventStack ? [...gs.eventStack] : []
        };
    }

    function serializeArea(area) {
        if (!area) return null;
        return {
            name: area.name,
            cards: area.cards.map(c => serializeCard(c)),
            apartOrTogether: area.apartOrTogether,
            centered: area.centered,
            forOrAgainst: area.forOrAgainst,
            fixedSlots: area.fixedSlots
        };
    }

    function serializeCard(card) {
        if (!card) return null;
        if (typeof card === 'string') return card;
        return {
            id: card.id,
            name: card.name,
            type: card.type,
            suit: card.suit,
            number: card.number,
            visibility: card.visibility,
            visibleTo: Array.from(card.visibleTo || [])
        };
    }

    function serializePlayer(player) {
        if (!player) return null;
        return {
            id: player.id,
            characterId: player.characterId,
            name: player.name,
            character: player.character,
            avatar: player.avatar,
            position: player.position,
            health: player.health,
            healthLimit: player.healthLimit,
            handLimit: player.handLimit,
            reach: player.reach,
            liveStatus: player.liveStatus,
            seat: player.seat,
            hand: serializeArea(player.hand),
            judgeArea: serializeArea(player.judgeArea),
            equipSlots: player.equipSlots ? player.equipSlots.map(s => serializeArea(s)) : [],
            hp: player.health,
            maxHp: player.healthLimit,
            _originalData: player._originalData
        };
    }

    /**
     * 从序列化数据恢复游戏状态
     */
    function applyFullState(stateData) {
        if (!stateData) return;
        isApplyingRemote = true;

        try {
            const gs = window.Game.GameState;
            const Area = window.Game.Models.Area;
            const Card = window.Game.Models.Card;
            const Player = window.Game.Models.Player;

            gs.mode = stateData.mode || 'sandbox';
            gs.isGameRunning = stateData.isGameRunning;
            gs.isPaused = stateData.isPaused;
            gs.currentPlayerIndex = stateData.currentPlayerIndex;
            gs.sandboxTurnIndex = stateData.sandboxTurnIndex != null ? stateData.sandboxTurnIndex : -1;
            if (gs.sandboxTurnIndex >= 0) {
                document.documentElement.style.setProperty('--turn-ring-color', '#48bb78');
            }
            gs.round = stateData.round;
            gs.flowStack = stateData.flowStack || [];
            gs.eventStack = stateData.eventStack || [];

            // 恢复公共区域
            gs.pile = deserializeArea(stateData.pile, 'pile', Area);
            gs.discardPile = deserializeArea(stateData.discardPile, 'discardPile', Area);
            gs.treatmentArea = deserializeArea(stateData.treatmentArea, 'treatmentArea', Area);

            // 恢复玩家
            gs.players = (stateData.players || []).map((pData, index) => {
                const config = {
                    name: pData.name,
                    characterId: pData.characterId,
                    character: pData.character,
                    avatar: pData.avatar,
                    position: pData.position,
                    hp: pData.health,
                    maxHp: pData.healthLimit,
                    _originalData: pData._originalData
                };
                const player = new Player(config, index);
                player.health = pData.health;
                player.healthLimit = pData.healthLimit;
                player.handLimit = pData.handLimit;
                player.reach = pData.reach;
                player.liveStatus = pData.liveStatus;

                // 恢复手牌
                restoreAreaCards(player.hand, pData.hand, Card);

                // 恢复判定区
                restoreAreaCards(player.judgeArea, pData.judgeArea, Card);

                // 恢复装备栏
                if (pData.equipSlots) {
                    pData.equipSlots.forEach((slotData, slotIdx) => {
                        if (player.equipSlots[slotIdx] && slotData) {
                            restoreAreaCards(player.equipSlots[slotIdx], slotData, Card);
                        }
                    });
                }

                return player;
            });

            // 设置在线模式标记
            gs.onlineMode = true;

            // 切换到对局视图（隐藏设置/在线面板，显示对局内容）
            if (window.Game.UI.switchGameView) {
                window.Game.UI.switchGameView('play');
            }

            refreshGameUI();
        } finally {
            isApplyingRemote = false;
        }
    }

    function deserializeArea(data, name, Area) {
        if (!data) return new Area(name);
        const area = new Area(data.name || name, {
            apartOrTogether: data.apartOrTogether,
            centered: data.centered,
            forOrAgainst: data.forOrAgainst,
            fixedSlots: data.fixedSlots
        });
        area.cards = (data.cards || []).map(c => {
            const card = deserializeCard(c, window.Game.Models.Card);
            if (card) card.lyingArea = area;
            return card;
        }).filter(Boolean);
        return area;
    }

    function restoreAreaCards(area, data, Card) {
        if (!area || !data) return;
        area.cards = (data.cards || []).map(c => deserializeCard(c, Card));
        area.cards.forEach(c => { if (c) c.lyingArea = area; });
    }

    function deserializeCard(data, Card) {
        if (!data) return null;
        if (typeof data === 'string') return new Card(data);
        const card = new Card(data.name, data.type, data.suit, data.number, data.id);
        card.visibility = data.visibility || 0;
        if (data.visibleTo) card.visibleTo = new Set(data.visibleTo);
        return card;
    }

    /**
     * 当远程用户执行了游戏动作
     */
    function onRemoteAction(data) {
        if (isApplyingRemote) return;
        isApplyingRemote = true;

        try {
            const { actionType, payload } = data;
            const Animator = window.Game.UI && window.Game.UI.CardMoveAnimator;

            if (actionType === 'moveCard') {
                // ── 动画快照：在修改数据之前记录牌的当前 DOM 位置 ──
                let animPayload = null;
                const card = findCardById(payload.cardId);

                // 捕获移动前可见性快照
                const preVis = card ? card.visibility : 0;
                const preVisibleTo = card && card.visibleTo ? [...card.visibleTo] : [];

                if (Animator) {
                    const fromAreaPath = card && card.lyingArea ? getAreaPath(card.lyingArea) : null;
                    animPayload = {
                        cardId: payload.cardId,
                        fromAreaPath: fromAreaPath,
                        toAreaPath: payload.toAreaPath,
                        position: payload.position
                    };
                    Animator.snapshotBeforeMove(animPayload);
                }

                // 远程移动卡牌（修改数据模型 + 更新可见性）
                applyRemoteMove(payload);

                // ── 记录移动者信息到卡牌 + 移动日志 ──
                if (payload.moveRole) {
                    const movedCard = findCardById(payload.cardId);
                    if (movedCard) {
                        movedCard._lastMoveBy = {
                            id: payload.moveRole.id,
                            characterId: payload.moveRole.characterId,
                            name: payload.moveRole.name
                        };
                    }
                    if (window.Game.UI.MoveLog) {
                        const fromPath = animPayload ? animPayload.fromAreaPath : null;
                        const toArea = movedCard ? movedCard.lyingArea : null;
                        window.Game.UI.MoveLog.logMove({
                            moveRole: payload.moveRole,
                            card: movedCard,
                            fromAreaPath: fromPath,
                            toAreaPath: payload.toAreaPath,
                            cardVisibility: preVis,
                            cardVisibleTo: preVisibleTo,
                            toForOrAgainst: toArea ? (toArea.forOrAgainst != null ? toArea.forOrAgainst : 0) : 0,
                            toOwnerId: toArea && toArea.owner ? toArea.owner.id : null
                        });
                    }
                }

                refreshGameUI();

                // ── 动画播放：在 UI 更新后播放弧形飞行 + FLIP 动画 ──
                if (Animator && animPayload) {
                    requestAnimationFrame(() => {
                        Animator.animateAfterMove(animPayload);
                    });
                }
            } else {
                if (actionType === 'modifyHealth') {
                    applyRemoteHealthChange(payload);
                } else if (actionType === 'modifyMaxHealth') {
                    applyRemoteMaxHealthChange(payload);
                } else if (actionType === 'fullSync') {
                    applyFullState(payload.gameState);
                } else if (actionType === 'setSandboxTurn') {
                    const gs = window.Game.GameState;
                    if (gs) {
                        gs.sandboxTurnIndex = payload.playerIndex;
                        if (payload.playerIndex >= 0) {
                            document.documentElement.style.setProperty('--turn-ring-color', '#48bb78');
                        }
                    }
                } else if (actionType === 'spectateToggle') {
                    // 远程用户切换了旁观状态 → 更新 perspectives 中的 spectating 标记
                    const fromUserId = data.from && data.from.userId;
                    if (fromUserId && perspectives) {
                        for (const idx in perspectives) {
                            const arr = perspectives[idx];
                            if (Array.isArray(arr)) {
                                const viewer = arr.find(v => v.userId === fromUserId);
                                if (viewer) {
                                    viewer.spectating = !!payload.spectating;
                                    break;
                                }
                            }
                        }
                    }
                    // 同步房间用户列表数据
                    if (window.Game.Online && window.Game.Online.RoomUI) {
                        const roomUI = window.Game.Online.RoomUI;
                        if (roomUI.currentRoom && roomUI.currentRoom.users && data.from) {
                            const ru = roomUI.currentRoom.users[data.from.userId];
                            if (ru) ru.spectating = !!payload.spectating;
                        }
                        roomUI.renderRoomInfo();
                    }
                }

                refreshGameUI();
            }
        } finally {
            isApplyingRemote = false;
        }
    }

    function applyRemoteMove(payload) {
        const gs = window.Game.GameState;
        if (!gs) return;

        // 找到卡牌
        const card = findCardById(payload.cardId);
        if (!card) {
            console.warn('[Sync] Remote move: card not found', payload.cardId);
            return;
        }

        // 找到目标区域
        const toArea = resolveAreaByPath(payload.toAreaPath);
        if (!toArea) {
            console.warn('[Sync] Remote move: target area not found', payload.toAreaPath);
            return;
        }

        const pos = payload.position > 0 ? payload.position - 1 : payload.position;
        window.Game.Models.moveCardToArea(card, toArea, pos, card.lyingArea);
    }

    function applyRemoteHealthChange(payload) {
        adjustPlayerField(payload, 'health', 0);
    }

    function applyRemoteMaxHealthChange(payload) {
        adjustPlayerField(payload, 'healthLimit', 1);
    }

    function adjustPlayerField(payload, field, minValue) {
        const gs = window.Game.GameState;
        if (!gs) return;
        const player = gs.players.find(p => p.id === payload.roleId);
        if (player) {
            player[field] = Math.max(player[field] + payload.delta, minValue);
        }
    }

    function findCardById(cardId) {
        const gs = window.Game.GameState;
        if (!gs) return null;

        const roleAreas = (gs.players || []).flatMap(p => [p.hand, p.judgeArea].concat(p.equipSlots || []));
        const areas = [gs.pile, gs.discardPile, gs.treatmentArea].concat(roleAreas);

        for (const area of areas) {
            if (!area || !area.cards) continue;
            const card = area.cards.find(c => c && c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    const resolveAreaByPath = (path) => window.Game.Models?.resolveAreaByPath?.(path) || null;
    const getAreaPath = (area) => window.Game.Models?.getAreaPath?.(area) || (area && area.name) || null;

    /**
     * 远程状态全量更新
     */
    function onRemoteStateUpdate(data) {
        if (isApplyingRemote) return;
        applyFullState(data.gameState);
    }

    /**
     * 视角更新回调
     */
    function onPerspectivesChanged(newPerspectives) {
        perspectives = newPerspectives || {};
        // 更新 UI 显示
        refreshGameUI();
    }

    function removeUserFromPerspectives(userId) {
        if (!userId || !perspectives) return;

        let changed = false;
        Object.keys(perspectives).forEach(index => {
            const viewers = perspectives[index];
            if (!Array.isArray(viewers)) return;
            const next = viewers.filter(viewer => viewer && viewer.userId !== userId);
            if (next.length !== viewers.length) {
                perspectives[index] = next;
                changed = true;
            }
        });

        if (changed) refreshGameUI();
    }

    /**
     * 远程游戏开始回调
     * 先通过 Controller.startGame 初始化引擎，再用收到的状态覆盖
     */
    function onRemoteGameStart(gameConfig, gameState) {
        if (!gameConfig && !gameState) return;
        isApplyingRemote = true;

        try {
            // 1. 强制 sandbox 模式
            const config = Object.assign({}, gameConfig || {}, { mode: 'sandbox' });

            // 2. 用 gameConfig 里的 players/deck 让引擎初始化一次（创建 GameState 结构）
            if (window.Game.Controller && window.Game.Controller.startGame) {
                window.Game.Controller.startGame(config);
            }

            // 3. 用房主传过来的完整状态覆盖（牌序、血量等）
            if (gameState) {
                applyFullState(gameState);
            }
        } finally {
            isApplyingRemote = false;
        }
    }


    // ── 内部 API 供 sync_broadcaster.js 使用 ──
    window.Game.Online._SyncInternal = {
        Client,
        getAreaPath,
        resolveAreaByPath,
        serializeGameState,
        get isApplyingRemote() { return isApplyingRemote; },
        get perspectives() { return perspectives; },
        set perspectives(v) { perspectives = v; },
    };

    // ===== 导出（接收端）=====
    window.Game.Online.SyncManager = {
        init,
        serializeGameState,
        applyFullState,
        onPerspectivesChanged,
        removeUserFromPerspectives,
        clearPerspectives,
        onRemoteGameStart,
        getAreaPath,
        resolveAreaByPath,
        _resolveArea: resolveAreaByPath,
        get isApplyingRemote() { return isApplyingRemote; },
        get perspectives() { return perspectives; }
    };

})();
