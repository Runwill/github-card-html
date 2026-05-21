(function() {
    window.Game = window.Game || {};
    
    // 配置：'auto' (默认) 或 'manual' (沙盒)
    // 你可以通过控制台修改：Game.Controller.switchMode('manual')
    let currentMode = 'auto'; 
    let currentEngine = null;

    function startGame(config = {}) {
        // 决定模式
        const mode = config.mode || currentMode;
        currentMode = mode; // 启动：更新全局状态以匹配配置
        
        window.Game.GameState.isGameRunning = false; // 先重置状态

        // 清空移动日志
        window.Game.UI.MoveLog?.clear?.();
        if (!window.Game.GameState.onlineMode) window.Game.Online?.SyncManager?.clearPerspectives?.();
        
        if (mode === 'manual' || mode === 'sandbox') {
            if (!window.Game.Engines || !window.Game.Engines.SandboxEngine) {
                console.error("SandboxEngine not loaded!");
                return;
            }
            currentEngine = new window.Game.Engines.SandboxEngine();
            currentEngine.init(config);
            
            // 覆盖全局动作以指向引擎（如果 UI 需要）
            // UI 通常调用 Game.Core.playCard 或类似的。
            // 我们可能需要在这里映射手动操作。
            
        } else {
            // 默认 自动/流程模式（旧版 GameRun）
            // 现有的 game_core.js 逻辑基本上就是 "FlowEngine"
            window.Game.Core?.startGame?.(config);
        }
    }
    
    function switchMode(mode) {
        currentMode = mode;
    }

    function setSpeed(ms) {
        // 转发给 Core 或 Engine
        window.Game.Core?.setSpeed?.(ms);
    }

    // 辅助函数：查找卡牌当前区域
    const findCardSource = (card) => {
        if (!card) return null;
        if (typeof card === 'object' && card.lyingArea) return card.lyingArea;
        
        // 在 GameState 中暴力搜索
        const gs = window.Game.GameState;
        if (!gs) return null;

        if (gs.players) {
            for (let p of gs.players) {
                const areas = window.Game.Models?.getPlayerAreas?.(p) || [p.hand, p.judgeArea].concat(p.equipSlots || []);
                for (const area of areas) {
                    if (area && area.cards && area.cards.includes(card)) return area;
                }
            }
        }
        if (gs.pile && gs.pile.cards.includes(card)) return gs.pile;
        if (gs.discardPile && gs.discardPile.cards.includes(card)) return gs.discardPile;
        if (gs.treatmentArea && gs.treatmentArea.cards.includes(card)) return gs.treatmentArea;
        
        return null;
    };

    // 辅助函数：解析区域标识符为对象 (支持 Manual Mode 直接拖拽)
    const resolveArea = (identifier) => {
        if (!identifier) return null;
        if (typeof identifier === 'object') return identifier; 

        const gs = window.Game.GameState;
        if (!gs) return null;

        // 1. 检查全局区域 Key (pile, discardPile, treatmentArea等)
        if (gs[identifier]) return gs[identifier];

        // 'hand' -> 当前视角玩家手牌（perspectiveIndex）
        // 手动模式下通常认为操作者是主视角玩家 (UI底部)
        if (identifier === 'hand') {
            const perspIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
            const p = gs.players && (gs.players[perspIdx] || gs.players[0]);
            return p ? p.hand : null;
        }

        // 'role:X' -> 玩家 X 手牌 (拖拽到头像)
        // 'role-judge:X' -> 玩家 X 判定区
        if (typeof identifier === 'string' && (identifier.startsWith('role:') || identifier.startsWith('role-judge:'))) {
            const isJudge = identifier.startsWith('role-judge:');
            const isEquip = identifier.includes(':equip');
            const roleId = parseInt(identifier.split(':')[1]);
            const p = gs.players.find(pl => pl.id === roleId);
            if (p) {
                if (isEquip) {
                    const slotMatch = identifier.match(/:slot:(\d+)/);
                    const slotIndex = slotMatch ? parseInt(slotMatch[1], 10) : -1;
                    if (slotIndex >= 0) {
                        return p.equipArea?.getChildArea?.(slotIndex)
                            || (p.equipSlots ? p.equipSlots[slotIndex] : null)
                            || null;
                    }
                    return window.Game.Models?.getDefaultChildArea?.(p.equipArea) || p.equipSlots?.[0] || p.equipArea || null;
                }
                return isJudge ? p.judgeArea : p.hand;
            }
        }

        // 'hand-0', 'equip-1' 等
        // ... (将来若有需要在此扩展)

        return null;
    };

    const getAreaPath = area => window.Game.Models?.getAreaPath?.(area) || null;
    const getAreaPathForLog = (area, card) => window.Game.Models?.getAreaPathForLog ? window.Game.Models.getAreaPathForLog(area, card) : getAreaPath(area);


    // ── 内部 API 供 game_controller_dispatch.js 使用 ──
    window.Game._ControllerInternal = {
        get currentMode() { return currentMode; },
        get currentEngine() { return currentEngine; },
        findCardSource,
        resolveArea,
        getAreaPath,
        getAreaPathForLog,
    };

    window.Game.Controller = {
        startGame,
        switchMode,
        setSpeed,
    };

})();
