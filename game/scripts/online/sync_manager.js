/**
 * Game State Sync Manager
 * 负责在线模式下的游戏状态同步
 * - 拦截本地游戏操作并广播
 * - 接收远程操作并应用到本地
 * - 管理视角与用户名映射
 */
window.Game = window.Game || {};
    window.Game.Online = window.Game.Online || {};

    const Client = () => window.Game.Online.RoomClient;
    const AREA_METADATA_KEYS = ['apartOrTogether', 'centered', 'forOrAgainst', 'fixedSlots', 'slots'];

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
        window.Game.UI?.updateUI?.();
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

    function areaMetadataFrom(source) {
        const metadata = {};
        AREA_METADATA_KEYS.forEach(key => {
            if (source && source[key] !== undefined) metadata[key] = source[key];
        });
        return metadata;
    }

    function serializeArea(area) {
        if (!area) return null;
        return {
            name: area.name,
            cards: area.cards.map(c => serializeCard(c)),
            ...areaMetadataFrom(area)
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
            equipArea: serializeArea(player.equipArea),
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

                restoreEquipmentAreas(player, pData, Card);

                return player;
            });

            // 设置在线模式标记
            gs.onlineMode = true;

            // 切换到对局视图（隐藏设置/在线面板，显示对局内容）
            window.Game.UI.switchGameView?.('play');

            refreshGameUI();
        } finally {
            isApplyingRemote = false;
        }
    }

    function deserializeArea(data, name, Area) {
        if (!data) return new Area(name);
        const area = new Area(data.name || name, areaMetadataFrom(data));
        area.cards = (data.cards || []).map(c => {
            const card = deserializeCard(c, window.Game.Models.Card);
            if (card) card.lyingArea = area;
            return card;
        });
        return area;
    }

    function restoreAreaMetadata(area, data) {
        if (!area || !data) return;
        AREA_METADATA_KEYS.forEach(key => {
            if (data[key] !== undefined) area[key] = data[key];
        });
    }

    function restoreAreaCards(area, data, Card) {
        if (!area || !data) return;
        restoreAreaMetadata(area, data);
        area.cards = (data.cards || []).map(c => deserializeCard(c, Card));
        area.cards.forEach(c => { if (c) c.lyingArea = area; });
        const slotCount = (window.Game.Models?.getAreaSlots?.(area) || []).length;
        while (area.fixedSlots && area.cards.length < slotCount) area.cards.push(null);
    }

    function restoreEquipmentAreas(player, playerData, Card) {
        if (!player) return;
        const equipAreaData = playerData?.equipArea || null;
        if (equipAreaData) restoreAreaCards(player.equipArea, equipAreaData, Card);

        const childAreaData = Array.isArray(equipAreaData?.childAreas) && equipAreaData.childAreas.length > 0
            ? equipAreaData.childAreas
            : (playerData?.equipSlots || []);

        childAreaData.forEach((slotData, slotIdx) => {
            if (!slotData || !player.equipArea) return;
            const cardData = Array.isArray(slotData.cards) ? slotData.cards.find(Boolean) : null;
            const card = deserializeCard(cardData, Card);
            player.equipArea.cards[slotIdx] = card || player.equipArea.cards[slotIdx] || null;
            if (card) card.lyingArea = player.equipArea;
        });
    }

    function deserializeCard(data, Card) {
        if (!data) return null;
        if (typeof data === 'string') return new Card(data);
        const card = new Card(data.name, data.type, data.suit, data.number, data.id);
        card.visibility = data.visibility || 0;
        if (data.visibleTo) card.visibleTo = new Set(data.visibleTo);
        return card;
    }

    function setSandboxTurnRemote(payload) {
        const gs = window.Game.GameState;
        if (!gs) return;
        gs.sandboxTurnIndex = payload.playerIndex;
        if (payload.playerIndex >= 0) {
            document.documentElement.style.setProperty('--turn-ring-color', '#48bb78');
        }
    }

    function applySpectateToggle(data, payload) {
        const fromUserId = data.from && data.from.userId;
        if (fromUserId && perspectives) {
            for (const idx in perspectives) {
                const arr = perspectives[idx];
                if (Array.isArray(arr)) {
                    const viewer = arr.find(v => v.userId === fromUserId);
                    if (viewer) { viewer.spectating = !!payload.spectating; break; }
                }
            }
        }
        if (window.Game.Online?.RoomUI) {
            const roomUI = window.Game.Online.RoomUI;
            if (roomUI.currentRoom && roomUI.currentRoom.users && data.from) {
                const ru = roomUI.currentRoom.users[data.from.userId];
                if (ru) ru.spectating = !!payload.spectating;
            }
            roomUI.renderRoomInfo();
        }
    }

    /**
     * 当远程用户执行了游戏动作
     */
    function onRemoteAction(data) {
        if (isApplyingRemote) return;
        isApplyingRemote = true;

        try {
            const { actionType, payload } = data;
            const Animator = window.Game.UI?.CardMoveAnimator;

            if (actionType === 'moveCard') {
                // ── 动画快照：在修改数据之前记录牌的当前 DOM 位置 ──
                let animPayload = null;
                const card = findCardById(payload.cardId);

                // 捕获移动前可见性快照
                const preVis = card ? card.visibility : 0;
                const preVisibleTo = card && card.visibleTo ? [...card.visibleTo] : [];

                if (Animator) {
                    const fromAreaPath = card ? getCardLocationPath(card) : null;
                    animPayload = {
                        cardId: payload.cardId,
                        fromAreaPath: fromAreaPath,
                        toAreaPath: payload.toAreaPath,
                        position: payload.position
                    };
                    Animator.snapshotBeforeMove(animPayload);
                }

                // 远程移动卡牌（修改数据模型 + 更新可见性）
                const moved = applyRemoteMove(payload);
                if (!moved) {
                    Animator?.clearSnapshot?.();
                    refreshGameUI();
                    return;
                }

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
                    if (window.Game.UI.MoveLog?.logMove) {
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
                const actionHandlers = {
                    modifyHealth:     () => applyRemoteHealthChange(payload),
                    modifyMaxHealth:  () => applyRemoteMaxHealthChange(payload),
                    fullSync:         () => applyFullState(payload.gameState),
                    setSandboxTurn:   () => setSandboxTurnRemote(payload),
                    spectateToggle:   () => applySpectateToggle(data, payload)
                };
                const handler = actionHandlers[actionType];
                if (handler) handler();

                refreshGameUI();
            }
        } finally {
            isApplyingRemote = false;
        }
    }

    function applyRemoteMove(payload) {
        const gs = window.Game.GameState;
        if (!gs) return false;

        // 找到卡牌
        const card = findCardById(payload.cardId);
        if (!card) {
            console.warn('[Sync] Remote move: card not found', payload.cardId);
            return false;
        }

        // 找到目标区域
        const location = resolveAreaLocationByPath(payload.toAreaPath);
        const toArea = location && location.area;
        if (!toArea) {
            console.warn('[Sync] Remote move: target area not found', payload.toAreaPath);
            return false;
        }

        const pos = location.slotIndex >= 0 ? location.slotIndex : (payload.position > 0 ? payload.position - 1 : payload.position);
        return window.Game.Models.moveCardToArea(card, toArea, pos, card.lyingArea);
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
        return window.Game.Models?.findCardById?.(cardId, window.Game.GameState) || null;
    }

    const resolveAreaByPath = (path) => window.Game.Models?.resolveAreaByPath?.(path) || null;
    const resolveAreaLocationByPath = (path) => window.Game.Models?.resolveAreaLocationByPath?.(path) || null;
    const getAreaPath = (area) => window.Game.Models?.getAreaPath?.(area) || (area && area.name) || null;
    const getAreaLocationPath = (area, slotIndex) => window.Game.Models?.getAreaLocationPath?.(area, slotIndex) || getAreaPath(area);
    const getCardLocationPath = (card) => window.Game.Models?.getCardLocationPath?.(card) || null;

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
            window.Game.Controller?.startGame?.(config);

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
        getAreaLocationPath,
        getCardLocationPath,
        resolveAreaByPath,
        resolveAreaLocationByPath,
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
        getAreaLocationPath,
        getCardLocationPath,
        resolveAreaByPath,
        resolveAreaLocationByPath,
        _resolveArea: resolveAreaByPath,
        get isApplyingRemote() { return isApplyingRemote; },
        get perspectives() { return perspectives; }
    };

    window.dispatchEvent(new CustomEvent('game-sync-manager-ready'));
