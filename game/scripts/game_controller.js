(function() {
    window.Game = window.Game || {};
    
    // 配置：'auto' (默认) 或 'manual' (沙盒)
    // 你可以通过控制台修改：Game.Controller.switchMode('manual')
    let currentMode = 'auto'; 
    let currentEngine = null;

    function init() {
        console.log("[Controller] Initializing Game Controller...");
        
        // 暴露启动方法
        window.Game.startFunction = startGame;
    }

    function startGame(config = {}) {
        // 决定模式
        const mode = config.mode || currentMode;
        currentMode = mode; // 启动：更新全局状态以匹配配置
        
        window.Game.GameState.isGameRunning = false; // 先重置状态

        // 清空移动日志
        if (window.Game.UI.MoveLog) {
            window.Game.UI.MoveLog.clear();
        }
        if (!window.Game.GameState.onlineMode && window.Game.Online && window.Game.Online.SyncManager && window.Game.Online.SyncManager.clearPerspectives) {
            window.Game.Online.SyncManager.clearPerspectives();
        }
        
        if (mode === 'manual' || mode === 'sandbox') {
            if (!window.Game.Engines || !window.Game.Engines.SandboxEngine) {
                console.error("SandboxEngine not loaded!");
                return;
            }
            console.log("[Controller] Starting Sandbox Mode");
            currentEngine = new window.Game.Engines.SandboxEngine();
            currentEngine.init(config);
            
            // 覆盖全局动作以指向引擎（如果 UI 需要）
            // UI 通常调用 Game.Core.playCard 或类似的。
            // 我们可能需要在这里映射手动操作。
            
        } else {
            // 默认 自动/流程模式（旧版 GameRun）
            // 现有的 game_core.js 逻辑基本上就是 "FlowEngine"
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
        // 转发给 Core 或 Engine
        if (window.Game.Core && window.Game.Core.setSpeed) {
            window.Game.Core.setSpeed(ms);
        }
    }

    // 辅助函数：动画逻辑
    const performFlipAnimation = (startRect, toArea, movedCard, animationHint, cardHTML, passedEl) => {
        if (!startRect || !window.Game.UI || !window.Game.UI.DragAnimation) return;
        const DragAnim = window.Game.UI.DragAnimation;

        // -------------------------------------------------------------
        // 特殊路径：如果指定了动画目标提示（Role Summary 或 Judge Area）
        // -------------------------------------------------------------
        if (animationHint && (animationHint.startsWith('role:') || animationHint.startsWith('role-judge:'))) {
            let container = document.querySelector(`[data-drop-zone="${animationHint}"]`);
            
            // Fallback for Judge Area
            if (!container && animationHint.startsWith('role-judge:')) {
                const roleId = animationHint.split(':')[1];
                container = document.querySelector(`[data-drop-zone="role:${roleId}"]`);
            }

            if (container) {
                // 使用 shared createGhost，支持传入 element 或 html string
                const flyer = DragAnim.createGhost(passedEl || cardHTML, startRect);
                if (!flyer) return;

                // 目标：定位到摘要角色的中心，且保持卡牌原有大小
                DragAnim.animateDropToPlaceholder(flyer, container, null, { matchSize: false });
                
                return; // 动画接管完成
            }
        }

        // -------------------------------------------------------------
        // 2. 标准移动：在容器中找到目标卡牌元素
        // -------------------------------------------------------------
            const areaName = toArea.name || toArea;
            
            // 查找容器
            let container = document.querySelector(`
                .cards-container[data-area-name="${areaName}"], 
                .cards-container[data-drop-zone="${areaName}"],
                .card-grid[data-drop-zone="${areaName}"]
            `);

            if (!container) {
                 container = document.getElementById(`${areaName}-container`);
                 if (!container) return; 
            }
            
            // 找到目标卡牌 (通常是最后加入的那张)
            let targetEl = null;

            if (container.lastElementChild) {
                targetEl = container.lastElementChild;
                if (targetEl.className === 'card-placeholder' && !targetEl.hasChildNodes()) {
                     targetEl = null; 
                }
            }
            
            // 如果提供了卡牌ID，尝试更精确匹配 (略)
            // ...

            if (targetEl) {
                // 使用 shared createGhost (克隆目标，因为目标已经是我们想要的样子)
                // 这里我们想模拟 "起飞然后降落"。
                // 此时 startRect 是旧位置。targetEl 是新位置。
                
                // 为了视觉连贯，我们应该克隆 targetEl (有正面的样式)，但放在 startRect。
                // *注意*: 如果是从背面翻到正面，或者样式改变，克隆 targetEl 是对的。
                const flyer = DragAnim.createGhost(targetEl, startRect);
                
                // 隐藏真实目标
                targetEl.style.visibility = 'hidden';
                
                // 执行动画 -> 飞向 targetEl (默认 matchSize=true)
                DragAnim.animateDropToPlaceholder(flyer, targetEl, () => {
                    if (targetEl) targetEl.style.visibility = '';
                });
            }
    };

    // 辅助函数：查找卡牌当前区域
    const findCardSource = (card) => {
        if (!card) return null;
        if (typeof card === 'object' && card.lyingArea) return card.lyingArea;
        
        // 在 GameState 中暴力搜索
        const gs = window.Game.GameState;
        if (!gs) return null;

        if (gs.players) {
            for (let p of gs.players) {
                if (p.hand && p.hand.cards.includes(card)) return p.hand;
                if (p.equipSlots) {
                    for (const slot of p.equipSlots) {
                        if (slot && slot.cards.includes(card)) return slot;
                    }
                }
                if (p.judgeArea && p.judgeArea.cards.includes(card)) return p.judgeArea;
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
            const roleId = parseInt(identifier.split(':')[1]);
            const p = gs.players.find(pl => pl.id === roleId);
            if (p) {
                return isJudge ? p.judgeArea : p.hand;
            }
        }

        // 'hand-0', 'equip-1' 等
        // ... (将来若有需要在此扩展)

        return null;
    };

    const getAreaPath = (area) => window.Game.Models && window.Game.Models.getAreaPath ? window.Game.Models.getAreaPath(area) : null;
    const getAreaPathForLog = (area, card) => window.Game.Models && window.Game.Models.getAreaPathForLog ? window.Game.Models.getAreaPathForLog(area, card) : getAreaPath(area);


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
        init,
        startGame,
        switchMode,
        setSpeed,
        performFlipAnimation,
    };

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
