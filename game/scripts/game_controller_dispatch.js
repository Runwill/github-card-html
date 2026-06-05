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

function runMoveCallbacks(callbacks, accepted = true) {
    if (!callbacks || typeof callbacks === 'function') return;
    const handler = accepted ? callbacks.onMoveExecuted : callbacks.onMoveRejected;
    if (typeof handler === 'function') handler();
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
    const Animator = window.Game.UI?.CardMoveAnimator;
    let animPayload = null;
    const isDragMove = !!payload.isDrag;

    if (actionType === 'move' && Animator && payload.card && payload.toArea) {
        const card = payload.card;
        const cardId = (typeof card === 'object') ? card.id : card;
        const fromAreaObj = payload.fromArea || I.findCardSource(card);
        const toAreaObj = I.resolveArea(payload.toArea);
        const targetIndex = payload.position > 0 ? payload.position - 1 : -1;
        const fromAreaPath = I.getAreaPathForLog(fromAreaObj, card);
        const toAreaPath = I.getAreaLocationPath(toAreaObj, targetIndex);
        const targetIsSlotted = (window.Game.Models?.getAreaSlots?.(toAreaObj) || []).length > 0;

        if (cardId && (fromAreaPath || toAreaPath)) {
            const nextAnimPayload = { cardId, fromAreaPath, toAreaPath, position: payload.position };
            if (isDragMove && targetIsSlotted) {
                Animator.snapshotBeforeMove({ ...nextAnimPayload, layoutAreaPaths: [toAreaPath] });
            } else if (!isDragMove) {
                animPayload = nextAnimPayload;
                Animator.snapshotBeforeMove(animPayload);
            }
        }
    }

    // ── 动画触发辅助 ──
    const triggerCardMoveAnimation = () => {
        window.Game.UI?.updateUI?.();
        if (Animator && animPayload) {
            requestAnimationFrame(() => {
                Animator.animateAfterMove(animPayload);
            });
        }
    };

    const runDirectMove = (targetArea, sourceArea, moveFn) => {
        const moveLog = captureMoveLog(payload, payload.card, sourceArea);
        const moved = moveFn() !== false;
        if (!moved) {
            Animator?.clearSnapshot?.();
            runMoveCallbacks(payload.callbacks, false);
            window.Game.UI?.updateUI?.();
            return false;
        }
        commitMoveLog(moveLog, targetArea);
        runMoveCallbacks(payload.callbacks);
        triggerCardMoveAnimation();
        return true;
    };

    if (I.currentMode === 'manual' || I.currentMode === 'sandbox') {
        if (I.currentEngine) {
            let actionApplied = true;
            if (actionType === 'move') {
                // payload: { card, toArea, position, fromArea, fromIndex, callbacks }

                // 解析目标区域，确保它是 Area 对象
                const targetArea = I.resolveArea(payload.toArea);

                // 确保源区域被传递，以支持那些还没有 lyingArea 属性的新生卡牌 (如从 Pile 中拖出)
                const sourceArea = payload.fromArea || I.resolveArea(payload.fromArea);

                if (targetArea) {
                    actionApplied = runDirectMove(targetArea, sourceArea, () => I.currentEngine.moveCard(payload.card, targetArea, payload.position - 1, sourceArea));
                } else {
                    console.warn("[Controller] Manual Move Skipped: Invalid target area", payload.toArea);
                    actionApplied = false;
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
            if (actionApplied !== false) {
                try { window.Game.Online?.SyncManager?.interceptDispatch?.(actionType, payload); } catch(e) { console.warn('[Online] sync error', e); }
            }
        }
    } else {
        // 自动/流程模式：所有移动走事件栈
         if (actionType === 'move') {
             commitMoveLog(
                 captureMoveLog(payload, payload.card, payload.fromArea || (payload.card && payload.card.lyingArea)),
                 I.resolveArea(payload.toArea)
             );

             let callbacks = payload.callbacks || {};
             if (typeof callbacks === 'function') {
                 const oldCb = callbacks;
                 callbacks = { onComplete: oldCb };
             }

             const originalOnMove = callbacks.onMoveExecuted;
             callbacks.onMoveExecuted = (ctx) => {
                 if (originalOnMove) originalOnMove(ctx);
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


window.Game.Controller.dispatch = dispatch;
