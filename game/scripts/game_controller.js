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
                if (p.equipArea && p.equipArea.cards.includes(card)) return p.equipArea;
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

        // 2. 检查特定 Player 关联
        // 'hand' -> 当前玩家手牌 (Pending: 具体指哪个 ID? 默认主视角)
        // 手动模式下通常认为操作者是主视角玩家 (UI底部)
        if (identifier === 'hand') {
            const p = gs.players && (gs.players[gs.currentPlayerIndex || 0] || gs.players[0]);
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

    // UI 动作的统一调度方法
    function dispatch(actionType, payload) {
        // --- 动作链 ---
        // 'place' 是触发 'move' 的高级动作
        if (actionType === 'place') {
            const card = payload.card;
            const fromArea = payload.fromArea || findCardSource(card);
            
            // 调度 'move' 并带上计算出的上下文
            dispatch('move', {
                ...payload,
                fromArea: fromArea, // 确保源被传递
                position: 9999 // 追加到末尾/顶部
            });
            return;
        }

        // --- 'move' 的逻辑 ---
        // 如果可能，确保 fromArea 被解析（为了健壮性）
        if (actionType === 'move' && !payload.fromArea && payload.card) {
             payload.fromArea = findCardSource(payload.card);
        }

        // 捕获动画开始状态
        let startRect = payload.startRect; // 优先使用直接传递的 startRect (例如来自 interactions.js 的值传递)
        
        if (!startRect && payload.element) {
            startRect = payload.element.getBoundingClientRect();
            // console.log(`[Animation] Captured startRect from element for ${actionType}:`, startRect);
        }

        // 包装执行以在之后触发动画
        const triggerAnimation = () => {
             // console.log("[Animation] Triggering animation...", { startRect, toArea: payload.toArea, card: payload.card });
             if(startRect && payload.toArea) {
                 performFlipAnimation(startRect, payload.toArea, payload.card, payload.animationHint, payload.cardHTML, payload.dragElement);
             }
        };

        if (currentMode === 'manual' || currentMode === 'sandbox') {
            if (currentEngine) {
                if (actionType === 'move') {
                    // payload: { card, toArea, position, fromArea, fromIndex, callbacks, element }
                    
                    // 解析目标区域，确保它是 Area 对象
                    const targetArea = resolveArea(payload.toArea);

                    // 确保源区域被传递，以支持那些还没有 lyingArea 属性的新生卡牌 (如从 Pile 中拖出)
                    const sourceArea = payload.fromArea || resolveArea(payload.fromArea);

                    if (targetArea) {
                        currentEngine.moveCard(payload.card, targetArea, payload.position - 1, sourceArea); 
                        
                        // 触发 UI 回调
                        if (payload.callbacks) {
                            if (typeof payload.callbacks.onMoveExecuted === 'function') {
                                payload.callbacks.onMoveExecuted();
                            }
                            setTimeout(() => {
                               if (typeof payload.callbacks.onComplete === 'function') payload.callbacks.onComplete();
                            }, 50); 
                        }
                        
                        // 触发动画
                        triggerAnimation();
                    } else {
                        console.warn("[Controller] Manual Move Skipped: Invalid target area", payload.toArea);
                    }
                } else if (actionType === 'modifyHealth') {
                    // payload: { roleId, delta }
                    if (currentEngine.modifyHealth) {
                        currentEngine.modifyHealth(payload.roleId, payload.delta);
                    }
                } else if (actionType === 'modifyMaxHealth') {
                    // payload: { roleId, delta }
                    if (currentEngine.modifyMaxHealth) {
                        currentEngine.modifyMaxHealth(payload.roleId, payload.delta);
                    }
                }
            }
        } else {
            // 自动/流程模式
             if (actionType === 'move') {
                 // 转发给核心事件
                 
                 // 注入动画回调
                 let callbacks = payload.callbacks || {};
                 // 确保我们要处理 callbacks 只是一个函数的情况（虽然在我们的用法中不太可能）
                 if (typeof callbacks === 'function') {
                     const oldCb = callbacks;
                     callbacks = { onComplete: oldCb };
                 }

                 const originalOnMove = callbacks.onMoveExecuted;
                 callbacks.onMoveExecuted = (ctx) => {
                     if (originalOnMove) originalOnMove(ctx);
                     
                     // 强制 UI 更新以确保 DOM 为动画准备就绪
                     // 注意：updateUI 通常包含同步 DOM 操作
                     if (window.Game.UI && window.Game.UI.updateUI) window.Game.UI.updateUI();

                     // 优化：移除 setTimeout 以消除闪烁
                     // 使用 requestAnimationFrame 确保在浏览器重绘之前执行动画逻辑 (隐藏 targetEl)
                     requestAnimationFrame(() => {
                        triggerAnimation(); 
                     });
                 };
                 
                 // 重构 payload.callbacks 逻辑处理如果它为空的情况
                 // 但是 Events.move 签名需要对象
                 
                 window.Game.Core.Events.move(
                     payload.moveRole,
                     payload.card,
                     payload.toArea,
                     payload.position,
                     payload.fromArea,
                     payload.fromIndex,
                     callbacks
                 );
             }
        }
    }

    window.Game.Controller = {
        init,
        startGame,
        switchMode,
        setSpeed,
        dispatch
    };

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
