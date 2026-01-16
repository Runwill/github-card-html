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
        
        // 关键修复：移除 requestAnimationFrame 包装
        // 因为调用者（dispatch）已经负责了时机控制 (requestAnimationFrame 或微任务)
        // 双重 RAF 会导致逻辑推迟到下一帧，从而导致一帧的“闪烁”（即卡牌先在目标位置渲染了一次）
        
        // 2. 在容器中找到卡牌元素
        // 优化：查找容器，同时兼容 HTML 静态属性 (data-area-name) 和 渲染器动态属性 (data-drop-zone)
            // 关键：必须使用 :not(.card) 排除卡牌自身，因为 renderCardList 也会给卡牌元素标记相同的区域名
            
            const areaName = toArea.name || toArea;
            
            // 核心修复：
            // 1. 使用 let 声明变量，防止污染全局
            // 2. 增加 .cards-container 类限制，防止选中 Header（例如 #header-hand-area）或 Card 自身
            //    原因：Project 中 role_renderer 给 Header 加了 data-area-name，card_renderer 给 card 也加了。
            //    querySelector 默认会选中 DOM 中靠前的 Header，导致动画目标错误。
            let container = document.querySelector(`.cards-container[data-area-name="${areaName}"], .cards-container[data-drop-zone="${areaName}"]`);

            if (!container) {
                 // Fallback：如果没有 .cards-container 类，尝试 ID 规则（兼容旧布局）
                 container = document.getElementById(`${areaName}-container`);
                 // console.warn(`[Animation] Container not found for area: ${areaName}`);
                 if (!container) return; 
            }
            
            // 3. 在容器中找到目标卡牌 (通常是最后加入的那张)
            // 因为我们刚刚添加了它，通常 "Place To" 把它放在末尾或特定索引
            // 目前，如果没有索引跟踪，假设它是最后一个，或者尝试匹配
            let targetEl = null;

            // 简单的启发式更新：如果是新添加到末尾的
            if (container.lastElementChild) {
                targetEl = container.lastElementChild;
                // 注意：旧代码曾排除 'card-placeholder'，但现在的 CardRenderer 默认使用此 class 作为卡牌容器
                // 因此我们只应该排除那些完全为空或明显不可见的元素
                if (targetEl.className === 'card-placeholder' && !targetEl.hasChildNodes()) {
                     targetEl = null; 
                }
            }
            
            // 改进：如果可能，尝试通过 ID 匹配 (Sandbox)
            if (movedCard && typeof movedCard === 'object' && movedCard.id) {
                 // 通过某些属性查找？渲染器通常不把 ID 放在 DOM 上，除非我们更新了 card_renderer
            }

            if (targetEl) {
                // -------------------------------------------------------------
                // 统一动画体验：使用 Interactions.animateDropToPlaceholder
                // -------------------------------------------------------------
                if (window.Game.UI.Interactions && window.Game.UI.Interactions.animateDropToPlaceholder) {
                    
                    // 1. 克隆一个用于飞行的元素
                    // 由于 targetEl 已经是渲染好的样子，我们直接克隆它，或者创建一个临时的 visually identical element
                    // 为了简单起见，且为了包含 CardRenderer 的效果，我们克隆 targetEl
                    const clone = targetEl.cloneNode(true);
                    
                    // 2. 设置克隆体的初始状态 (Match startRect)
                    clone.style.position = 'fixed';
                    clone.style.left = `${startRect.left}px`;
                    clone.style.top = `${startRect.top}px`;
                    clone.style.width = `${startRect.width}px`;
                    clone.style.height = `${startRect.height}px`;
                    clone.style.margin = '0';
                    clone.style.zIndex = '9999';
                    clone.style.pointerEvents = 'none'; // 防止干扰鼠标
                    clone.style.transition = 'none';
                    clone.style.transform = ''; // 确保没有 transform
                    // clone.classList.remove('card-placeholder'); // 错误：不要移除，它是卡牌的基础样式！
                    
                    // 添加 "正在拖拽" 的视觉效果 (阴影/透明度)
                    clone.classList.add('dragging-real'); 
                    
                    // 如果原元素有特定背景或颜色可能是由其他 class 控制的，保留它们
                    clone.classList.add('draggable-item'); // 确保样式一致
                    
                    // 3. 将克隆体添加到 body
                    document.body.appendChild(clone);
                    
                    // 4. 隐藏真实目标 (作为 placeholder)
                    // 使用 visibility: hidden 占据空间但不显示
                    targetEl.style.visibility = 'hidden';
                    
                    // 5. 执行动画
                    // animateDropToPlaceholder(el, placeholder, onComplete)
                    window.Game.UI.Interactions.animateDropToPlaceholder(clone, targetEl, () => {
                        // 动画结束，animateDropToPlaceholder 会移除 clone 并恢复 targetEl 的 visibility
                        // 但我们需要确保 CSS Timer 或其他清理也是正确的
                        // interactions.js 内部已经处理了: element.remove(), placeholder.style.visibility = ''
                        
                        // 强制再确认一次，防止任何意外
                        if (targetEl) targetEl.style.visibility = '';
                    });
                    
                    return; // 动画交接完成，退出
                }

                // -------------------------------------------------------------
                // Fallback: 旧的 CSS FLIP 实现
                // -------------------------------------------------------------
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
            // console.log(`[Animation] Captured startRect for ${actionType}:`, startRect);
        } else {
            // console.warn(`[Animation] No start element provided for ${actionType}`);
        }

        // 包装执行以在之后触发动画
        const triggerAnimation = () => {
             // console.log("[Animation] Triggering animation...", { startRect, toArea: payload.toArea, card: payload.card });
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
