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
                if (pData.hand) {
                    player.hand.cards = (pData.hand.cards || []).map(c => deserializeCard(c, Card));
                    player.hand.cards.forEach(c => { if (c) c.lyingArea = player.hand; });
                }

                // 恢复判定区
                if (pData.judgeArea) {
                    player.judgeArea.cards = (pData.judgeArea.cards || []).map(c => deserializeCard(c, Card));
                    player.judgeArea.cards.forEach(c => { if (c) c.lyingArea = player.judgeArea; });
                }

                // 恢复装备栏
                if (pData.equipSlots) {
                    pData.equipSlots.forEach((slotData, slotIdx) => {
                        if (player.equipSlots[slotIdx] && slotData) {
                            player.equipSlots[slotIdx].cards = (slotData.cards || []).map(c => deserializeCard(c, Card));
                            player.equipSlots[slotIdx].cards.forEach(c => {
                                if (c) c.lyingArea = player.equipSlots[slotIdx];
                            });
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

            // 更新 UI
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
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
                if (Animator) {
                    const card = findCardById(payload.cardId);
                    const fromAreaPath = card && card.lyingArea ? getAreaPath(card.lyingArea) : null;
                    animPayload = {
                        cardId: payload.cardId,
                        fromAreaPath: fromAreaPath,
                        toAreaPath: payload.toAreaPath,
                        position: payload.position
                    };
                    Animator.snapshotBeforeMove(animPayload);
                }

                // 远程移动卡牌（修改数据模型）
                applyRemoteMove(payload);

                // ── 记录移动者信息到卡牌 + 移动日志 ──
                if (payload.moveRole) {
                    const card = findCardById(payload.cardId);
                    if (card) {
                        card._lastMoveBy = {
                            id: payload.moveRole.id,
                            characterId: payload.moveRole.characterId,
                            name: payload.moveRole.name
                        };
                    }
                    if (window.Game.UI.MoveLog) {
                        const fromPath = animPayload ? animPayload.fromAreaPath : null;
                        window.Game.UI.MoveLog.logMove({
                            moveRole: payload.moveRole,
                            card: findCardById(payload.cardId),
                            fromAreaPath: fromPath,
                            toAreaPath: payload.toAreaPath
                        });
                    }
                }

                // 更新 UI
                if (window.Game.UI && window.Game.UI.updateUI) {
                    window.Game.UI.updateUI();
                }

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

                // 更新 UI
                if (window.Game.UI && window.Game.UI.updateUI) {
                    window.Game.UI.updateUI();
                }
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

        // 从旧区域移除
        if (card.lyingArea) {
            const idx = card.lyingArea.cards.indexOf(card);
            if (idx > -1) card.lyingArea.cards.splice(idx, 1);
        }

        // 加入新区域
        const pos = payload.position;
        if (pos >= 0 && pos < toArea.cards.length) {
            toArea.cards.splice(pos, 0, card);
        } else {
            toArea.cards.push(card);
        }
        card.lyingArea = toArea;
    }

    function applyRemoteHealthChange(payload) {
        const gs = window.Game.GameState;
        if (!gs) return;
        const player = gs.players.find(p => p.id === payload.roleId);
        if (player) {
            player.health = Math.max(player.health + payload.delta, 0);
        }
    }

    function applyRemoteMaxHealthChange(payload) {
        const gs = window.Game.GameState;
        if (!gs) return;
        const player = gs.players.find(p => p.id === payload.roleId);
        if (player) {
            player.healthLimit = Math.max(player.healthLimit + payload.delta, 1);
        }
    }

    function findCardById(cardId) {
        const gs = window.Game.GameState;
        if (!gs) return null;

        // 搜索所有区域
        const areas = [gs.pile, gs.discardPile, gs.treatmentArea];
        if (gs.players) {
            gs.players.forEach(p => {
                areas.push(p.hand, p.judgeArea);
                if (p.equipSlots) p.equipSlots.forEach(s => areas.push(s));
            });
        }

        for (const area of areas) {
            if (!area || !area.cards) continue;
            const card = area.cards.find(c => c && c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    function resolveAreaByPath(path) {
        if (!path) return null;
        const gs = window.Game.GameState;
        if (!gs) return null;

        // 格式: "pile", "discardPile", "treatmentArea", "player:0:hand", "player:0:judgeArea", "player:0:equip:1"
        if (gs[path]) return gs[path];

        const parts = path.split(':');
        if (parts[0] === 'player' && gs.players) {
            const playerIdx = parseInt(parts[1]);
            const player = gs.players[playerIdx];
            if (!player) return null;

            if (parts[2] === 'hand') return player.hand;
            if (parts[2] === 'judgeArea') return player.judgeArea;
            if (parts[2] === 'equip' && player.equipSlots) {
                return player.equipSlots[parseInt(parts[3])];
            }
        }
        return null;
    }

    /**
     * 获取区域路径（用于序列化）
     */
    function getAreaPath(area) {
        if (!area) return null;
        const gs = window.Game.GameState;
        if (!gs) return null;

        if (area === gs.pile) return 'pile';
        if (area === gs.discardPile) return 'discardPile';
        if (area === gs.treatmentArea) return 'treatmentArea';

        if (gs.players) {
            for (let i = 0; i < gs.players.length; i++) {
                const p = gs.players[i];
                if (area === p.hand) return `player:${i}:hand`;
                if (area === p.judgeArea) return `player:${i}:judgeArea`;
                if (p.equipSlots) {
                    for (let j = 0; j < p.equipSlots.length; j++) {
                        if (area === p.equipSlots[j]) return `player:${i}:equip:${j}`;
                    }
                }
            }
        }
        return area.name;
    }

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
        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
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

    /**
     * 拦截本地 dispatch，用于在线模式广播
     * 在 game_controller.js 中调用
     */
    function interceptDispatch(actionType, payload) {
        if (isApplyingRemote) return; // 不广播远程操作

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
                toAreaPath: getAreaPath(resolveLocalArea(payload.toArea)),
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
            const roleId = parseInt(areaOrId.split(':')[1]);
            const p = gs.players.find(pl => pl.id === roleId);
            if (p) return isJudge ? p.judgeArea : p.hand;
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
        const state = serializeGameState();
        client.syncFullState(state);
    }

    // ===== 导出 =====

    window.Game.Online.SyncManager = {
        init,
        serializeGameState,
        applyFullState,
        interceptDispatch,
        broadcastPerspectiveChange,
        getViewersForPlayer,
        updateLocalSpectating,
        pushFullState,
        onPerspectivesChanged,
        onRemoteGameStart,
        getAreaPath,
        get isApplyingRemote() { return isApplyingRemote; },
        get perspectives() { return perspectives; }
    };

})();
