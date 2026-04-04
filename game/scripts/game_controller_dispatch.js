(function() {
    // game_controller — 调度层: 统一动作调度
    // 工具函数在 game_controller.js 中，通过 _ControllerInternal 共享
    const I = window.Game._ControllerInternal;

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
        if (actionType === 'move' && !payload.fromArea && payload.card) {
             payload.fromArea = I.findCardSource(payload.card);
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
                        // ── 记录移动者信息到卡牌 (用于处理区显示) ──
                        if (payload.card && typeof payload.card === 'object' && payload.moveRole) {
                            payload.card._lastMoveBy = {
                                id: payload.moveRole.id,
                                characterId: payload.moveRole.characterId,
                                name: payload.moveRole.name
                            };
                        }

                        // 在移动前捕获可见性快照和来源路径
                        const preVis = payload.card ? payload.card.visibility : 0;
                        const preVisibleTo = payload.card && payload.card.visibleTo ? [...payload.card.visibleTo] : [];
                        const fromAreaPath = I.getAreaPathForLog(sourceArea, payload.card);

                        I.currentEngine.moveCard(payload.card, targetArea, payload.position - 1, sourceArea); 
                        
                        // 移动后捕获目标路径（含位置信息）
                        const toAreaPath = I.getAreaPathForLog(targetArea, payload.card);

                        // ── 移动日志 ──
                        if (window.Game.UI.MoveLog) {
                            window.Game.UI.MoveLog.logMove({
                                moveRole: payload.moveRole,
                                card: payload.card,
                                fromAreaPath,
                                toAreaPath,
                                cardVisibility: preVis,
                                cardVisibleTo: preVisibleTo,
                                toForOrAgainst: targetArea.forOrAgainst != null ? targetArea.forOrAgainst : 0,
                                toOwnerId: targetArea.owner ? targetArea.owner.id : null
                            });
                        }

                        // 触发 UI 回调
                        if (payload.callbacks) {
                            if (typeof payload.callbacks.onMoveExecuted === 'function') {
                                payload.callbacks.onMoveExecuted();
                            }
                            setTimeout(() => {
                               if (typeof payload.callbacks.onComplete === 'function') payload.callbacks.onComplete();
                            }, 50); 
                        }
                        
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
                 // ── 记录移动者信息到卡牌 (用于处理区显示) ──
                 if (payload.card && typeof payload.card === 'object' && payload.moveRole) {
                     payload.card._lastMoveBy = {
                         id: payload.moveRole.id,
                         characterId: payload.moveRole.characterId,
                         name: payload.moveRole.name
                     };
                 }

                 if (isDragMove) {
                     // ── 拖拽移动：使用同步路径，避免事件栈时序导致的重复动画 ──
                     // 拖拽操作应和沙盒模式一样同步执行，确保动画逻辑一致
                     const targetArea = I.resolveArea(payload.toArea);
                     const sourceArea = payload.fromArea || I.findCardSource(payload.card);

                     if (targetArea && payload.card) {
                         const card = payload.card;

                         // 捕获移动前可见性快照
                         const preVis = card.visibility;
                         const preVisibleTo = card.visibleTo ? [...card.visibleTo] : [];
                         const fromAreaPath = I.getAreaPathForLog(sourceArea, card);

                         // 直接同步移动卡牌（不走事件栈）
                         const fromArea = sourceArea || card.lyingArea;
                         if (fromArea) {
                             const idx = fromArea.cards.indexOf(card);
                             if (idx > -1) fromArea.cards.splice(idx, 1);
                         }
                         const insertIdx = Math.max(0, (payload.position || 1) - 1);
                         if (insertIdx < targetArea.cards.length) {
                             targetArea.cards.splice(insertIdx, 0, card);
                         } else {
                             targetArea.cards.push(card);
                         }
                         card.lyingArea = targetArea;

                         // 更新可见性（与 Events.move whenPlaced 逻辑一致）
                         if (targetArea.forOrAgainst !== undefined) {
                             card.visibility = targetArea.forOrAgainst;
                         }
                         card.visibleTo = new Set();
                         if (targetArea.owner && targetArea.owner.id !== undefined) {
                             card.visibleTo.add(targetArea.owner.id);
                         }

                         const toAreaPath = I.getAreaPathForLog(targetArea, card);

                         // ── 移动日志 ──
                         if (window.Game.UI.MoveLog) {
                             window.Game.UI.MoveLog.logMove({
                                 moveRole: payload.moveRole,
                                 card: card,
                                 fromAreaPath,
                                 toAreaPath,
                                 cardVisibility: preVis,
                                 cardVisibleTo: preVisibleTo,
                                 toForOrAgainst: targetArea.forOrAgainst != null ? targetArea.forOrAgainst : 0,
                                 toOwnerId: targetArea.owner ? targetArea.owner.id : null
                             });
                         }

                         // 触发 UI 回调（与沙盒模式一致）
                         if (payload.callbacks) {
                             if (typeof payload.callbacks.onMoveExecuted === 'function') {
                                 payload.callbacks.onMoveExecuted();
                             }
                             setTimeout(() => {
                                 if (typeof payload.callbacks.onComplete === 'function') payload.callbacks.onComplete();
                             }, 50);
                         }

                         triggerCardMoveAnimation();
                     }
                 } else {
                     // ── 非拖拽移动：走事件栈 ──

                     // 捕获移动前可见性快照
                     const preVis = payload.card ? payload.card.visibility : 0;
                     const preVisibleTo = payload.card && payload.card.visibleTo ? [...payload.card.visibleTo] : [];

                     // ── 移动日志 ──
                     if (window.Game.UI.MoveLog) {
                         const fromAreaObj = payload.fromArea || (payload.card && payload.card.lyingArea);
                         const toAreaObj = I.resolveArea(payload.toArea);
                         window.Game.UI.MoveLog.logMove({
                             moveRole: payload.moveRole,
                             card: payload.card,
                             fromAreaPath: I.getAreaPathForLog(fromAreaObj, payload.card),
                             toAreaPath: I.getAreaPathForLog(toAreaObj, payload.card),
                             cardVisibility: preVis,
                             cardVisibleTo: preVisibleTo,
                             toForOrAgainst: toAreaObj ? (toAreaObj.forOrAgainst != null ? toAreaObj.forOrAgainst : 0) : 0,
                             toOwnerId: toAreaObj && toAreaObj.owner ? toAreaObj.owner.id : null
                         });
                     }

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
