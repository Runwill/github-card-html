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
    const performFlipAnimation = (startRect, toArea, movedCard) => {
        if (!startRect || !window.Game.UI) return;
        
        requestAnimationFrame(() => {
            // 1. 寻找目标容器
            let container = null;

            // 优先级 1：如果可用，使用集中式 UI 辅助函数（最适合扩展）
            // (假设 window.Game.UI.getAreaContainer 已实现，用于处理当前玩家的 "hand", "judge", "equip" 等)
            if (typeof window.Game.UI.getAreaContainer === 'function') {
                 container = window.Game.UI.getAreaContainer(toArea);
            }
            
            // 优先级 2：通用 data-attribute 查找（强大的后备方案）
            // 适用于 "treatmentArea", "discardPile" 等，如果它们遵循约定
            if (!container) {
                // 对可能重名但归属不同的玩家区域进行特殊处理
                // 理想情况下 getAreaContainer 处理这个问题。 
                // 如果是简单的查找：
                container = document.querySelector(`[data-drop-zone="${toArea.name}"]`);
                
                // 修正 'hand' -> 通常在单设备视图中暗示当前玩家的手牌
                if (toArea.name === 'hand' && !container) {
                     container = document.getElementById('hand-cards-container');
                }
            }
            
            if (!container) {
                // console.warn(`[Animation] Container not found for area: ${toArea.name}`);
                return; 
            }
            
            // 2. 在容器中找到卡牌元素
            // 因为我们刚刚添加了它，通常 "Place To" 把它放在末尾或特定索引
            // 目前，如果没有索引跟踪，假设它是最后一个，或者尝试匹配
            let targetEl = null;

            // 简单的启发式更新：如果是新添加到末尾的
            if (container.lastElementChild) {
                targetEl = container.lastElementChild;
                if(targetEl.classList.contains('card-placeholder')) targetEl = null; // 跳过占位符（如果有）
            }
            
            // 改进：如果可能，尝试通过 ID 匹配 (Sandbox)
            if (movedCard && typeof movedCard === 'object' && movedCard.id) {
                 // 通过某些属性查找？渲染器通常不把 ID 放在 DOM 上，除非我们更新了 card_renderer
            }

            if (targetEl) {
                const endRect = targetEl.getBoundingClientRect();
                const dx = startRect.left - endRect.left;
                const dy = startRect.top - endRect.top;

                // 翻转 (Invert)
                targetEl.style.transform = `translate(${dx}px, ${dy}px)`;
                targetEl.style.transition = 'none';
                targetEl.style.zIndex = 1000;

                // 播放 (Play)
                requestAnimationFrame(() => {
                    targetEl.style.transform = '';
                    targetEl.style.transition = 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)';
                    
                    targetEl.addEventListener('transitionend', () => {
                        targetEl.style.transition = '';
                        targetEl.style.zIndex = '';
                    }, {once: true});
                });
            }
        });
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
        let startRect = null;
        if (payload.element) {
            startRect = payload.element.getBoundingClientRect();
        }

        // 包装执行以在之后触发动画
        const triggerAnimation = () => {
             if(startRect && payload.toArea) {
                 performFlipAnimation(startRect, payload.toArea, payload.card);
             }
        };

        if (currentMode === 'manual' || currentMode === 'sandbox') {
            if (currentEngine) {
                if (actionType === 'move') {
                    // payload: { card, toArea, position, fromArea, fromIndex, callbacks, element }
                    currentEngine.moveCard(payload.card, payload.toArea, payload.position - 1); 
                    
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
                     if (window.Game.UI && window.Game.UI.updateUI) window.Game.UI.updateUI();

                     // 等待 UI 更新（微任务或小超时）
                     setTimeout(() => {
                        triggerAnimation(); 
                     }, 20); // 稍微增加缓冲
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
