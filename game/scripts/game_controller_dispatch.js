(function() {
    // game_controller — 调度层: 统一动作调度
    // 工具函数在 game_controller.js 中，通过 _ControllerInternal 共享
    const I = window.Game._ControllerInternal;

    function rememberMoveActor(card, moveRole) {
        if (card && typeof card === 'object' && moveRole) {
            card._lastMoveBy = {
                id: moveRole.id,
                characterId: moveRole.characterId,
                name: moveRole.name
            };
        }
    }

    function captureMoveLog(payload, card, sourceArea) {
        if (!window.Game.UI.MoveLog) return null;
        return {
            moveRole: payload.moveRole,
            card,
            fromAreaPath: I.getAreaPathForLog(sourceArea, card),
            cardVisibility: card ? card.visibility : 0,
            cardVisibleTo: card && card.visibleTo ? [...card.visibleTo] : []
        };
    }

    function commitMoveLog(entry, targetArea) {
        if (!entry || !window.Game.UI.MoveLog) return;
        window.Game.UI.MoveLog.logMove({
            ...entry,
            toAreaPath: I.getAreaPathForLog(targetArea, entry.card),
            toForOrAgainst: targetArea ? (targetArea.forOrAgainst != null ? targetArea.forOrAgainst : 0) : 0,
            toOwnerId: targetArea && targetArea.owner ? targetArea.owner.id : null
        });
    }

    function runMoveCallbacks(callbacks) {
        if (!callbacks || typeof callbacks === 'function') return;
        if (typeof callbacks.onMoveExecuted === 'function') callbacks.onMoveExecuted();
        setTimeout(() => {
            if (typeof callbacks.onComplete === 'function') callbacks.onComplete();
        }, 50);
    }

    // UI 动作的统一调度方法
    function dispatch(actionType, payload) {
        // --- 动作链 ---
        // 'place' 是触发 'move' 的高级动作
        if (actionType === 'place') {
            const card = payload.card;
            const fromArea = payload.fromArea || I.findCardSource(card);
            
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
        if (actionType === 'move') {
            if (!payload.fromArea && payload.card) payload.fromArea = I.findCardSource(payload.card);
            rememberMoveActor(payload.card, payload.moveRole);
        }

        // ── CardMoveAnimator 快照准备 ──
        // 跳过拖拽产生的移动（拖拽有自己的动画系统）
        const Animator = window.Game.UI && window.Game.UI.CardMoveAnimator;
        let animPayload = null;
        const isDragMove = !!(payload.isDrag || payload.dragElement || payload.startRect);

        if (actionType === 'move' && Animator && payload.card && payload.toArea && !isDragMove) {
            const card = payload.card;
            const cardId = (typeof card === 'object') ? card.id : card;
            const fromAreaObj = payload.fromArea || I.findCardSource(card);
            const toAreaObj = I.resolveArea(payload.toArea);
            const fromAreaPath = I.getAreaPath(fromAreaObj);
            const toAreaPath = I.getAreaPath(toAreaObj);

            if (cardId && (fromAreaPath || toAreaPath)) {
                animPayload = { cardId, fromAreaPath, toAreaPath, position: payload.position };
                Animator.snapshotBeforeMove(animPayload);
            }
        }

        // ── 动画触发辅助 ──
        const triggerCardMoveAnimation = () => {
            if (window.Game.UI && window.Game.UI.updateUI) window.Game.UI.updateUI();
            if (Animator && animPayload) {
                requestAnimationFrame(() => {
                    Animator.animateAfterMove(animPayload);
                });
            }
        };

        if (I.currentMode === 'manual' || I.currentMode === 'sandbox') {
            if (I.currentEngine) {
                if (actionType === 'move') {
                    // payload: { card, toArea, position, fromArea, fromIndex, callbacks, element }
                    
                    // 解析目标区域，确保它是 Area 对象
                    const targetArea = I.resolveArea(payload.toArea);

                    // 确保源区域被传递，以支持那些还没有 lyingArea 属性的新生卡牌 (如从 Pile 中拖出)
                    const sourceArea = payload.fromArea || I.resolveArea(payload.fromArea);

                    if (targetArea) {
                        const moveLog = captureMoveLog(payload, payload.card, sourceArea);

                        I.currentEngine.moveCard(payload.card, targetArea, payload.position - 1, sourceArea); 
                        commitMoveLog(moveLog, targetArea);

                        // 触发 UI 回调
                        runMoveCallbacks(payload.callbacks);
                        
                        // 触发 CardMoveAnimator 动画（统一动画路径）
                        triggerCardMoveAnimation();
                    } else {
                        console.warn("[Controller] Manual Move Skipped: Invalid target area", payload.toArea);
                    }
                } else if (actionType === 'modifyHealth') {
                    // payload: { roleId, delta }
                    if (I.currentEngine.modifyHealth) {
                        I.currentEngine.modifyHealth(payload.roleId, payload.delta);
                    }
                } else if (actionType === 'modifyMaxHealth') {
                    // payload: { roleId, delta }
                    if (I.currentEngine.modifyMaxHealth) {
                        I.currentEngine.modifyMaxHealth(payload.roleId, payload.delta);
                    }
                }

                // Online sync: broadcast action to other room members
                if (window.Game.Online && window.Game.Online.SyncManager) {
                    try { window.Game.Online.SyncManager.interceptDispatch(actionType, payload); } catch(e) { console.warn('[Online] sync error', e); }
                }
            }
        } else {
            // 自动/流程模式
             if (actionType === 'move') {
                 if (isDragMove) {
                     // ── 拖拽移动：使用同步路径，避免事件栈时序导致的重复动画 ──
                     // 拖拽操作应和沙盒模式一样同步执行，确保动画逻辑一致
                     const targetArea = I.resolveArea(payload.toArea);
                     const sourceArea = payload.fromArea || I.findCardSource(payload.card);

                     if (targetArea && payload.card) {
                         const card = payload.card;
                         const moveLog = captureMoveLog(payload, card, sourceArea);

                         const insertIdx = Math.max(0, (payload.position || 1) - 1);
                         window.Game.Models.moveCardToArea(card, targetArea, insertIdx, sourceArea);
                         commitMoveLog(moveLog, targetArea);

                         // 触发 UI 回调（与沙盒模式一致）
                         runMoveCallbacks(payload.callbacks);

                         triggerCardMoveAnimation();
                     }
                 } else {
                     // ── 非拖拽移动：走事件栈 ──
                     commitMoveLog(
                         captureMoveLog(payload, payload.card, payload.fromArea || (payload.card && payload.card.lyingArea)),
                         I.resolveArea(payload.toArea)
                     );

                     // 注入动画回调
                     let callbacks = payload.callbacks || {};
                     if (typeof callbacks === 'function') {
                         const oldCb = callbacks;
                         callbacks = { onComplete: oldCb };
                     }

                     const originalOnMove = callbacks.onMoveExecuted;
                     callbacks.onMoveExecuted = (ctx) => {
                         if (originalOnMove) originalOnMove(ctx);
                         
                         // 触发 CardMoveAnimator 动画（统一动画路径）
                         triggerCardMoveAnimation();
                     };
                     
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
    }


    window.Game.Controller.dispatch = dispatch;

})();
