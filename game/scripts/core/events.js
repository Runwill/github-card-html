window.Game = window.Game || {};
window.Game.Core = window.Game.Core || {};

// 事件逻辑实现
const Events = {
    // 辅助函数：将事件推入堆栈
    trigger: function(name, steps, context, onStep, onFinish) {
        const GameState = window.Game.GameState;
        GameState.eventStack.push({
            type: 'event',
            name: name,
            steps: steps,
            currentStepIndex: 0,
            context: context,
            onStep: onStep,
            onFinish: onFinish
        });
        // 立即触发 UI 更新以显示事件开始
        window.Game.UI?.updateUI?.();
        window.Game.Core.checkAutoAdvance?.(); // 开始处理
    },

    // recover: 角色回复 value 点体力
    recover: function(role, value) {
        if (!role) return;
        // 步骤: beforeRecover -> whenRecover (动作) -> afterRecover
        this.trigger('Recover', ['beforeRecover', 'whenRecover', 'afterRecover'], { role, value }, (step, ctx) => {
            if (step === 'whenRecover') {
                ctx.role.health = Math.min(ctx.role.health + ctx.value, ctx.role.healthLimit);
            }
        });
    },

    // loss: 角色流失 value 点体力（直接流失，非伤害）
    loss: function(role, value) {
        if (!role) return;
        // 步骤: beforeLoss -> whenLoss (动作) -> afterLoss
        this.trigger('Loss', ['beforeLoss', 'whenLoss', 'afterLoss'], { role, value }, (step, ctx) => {
            if (step === 'whenLoss') {
                ctx.role.health = Math.max(ctx.role.health - ctx.value, 0);
            }
        });
    },

    // cure: 来源对目标进行 value 点治疗
    cure: function(source, target, value) {
        if (!target) return;
        // 步骤: beforeCure -> beforeCured -> whenCure -> whenCured (动作) -> afterCure -> afterCured
        const steps = ['beforeCure', 'beforeCured', 'whenCure', 'whenCured', 'afterCure', 'afterCured'];
        this.trigger('Cure', steps, { source, target, value }, (step, ctx) => {
            if (step === 'whenCured') {
                ctx.target.health = Math.min(ctx.target.health + ctx.value, ctx.target.healthLimit);
            }
        });
    },

    // damage: 来源对目标造成 value 点伤害
    damage: function(source, target, value) {
        if (!target) return;
        // 步骤: beforeDamage -> beforeDamaged -> whenDamage -> whenDamaged (动作) -> afterDamage -> afterDamaged
        const steps = ['beforeDamage', 'beforeDamaged', 'whenDamage', 'whenDamaged', 'afterDamage', 'afterDamaged'];
        this.trigger('Damage', steps, { source, target, value }, (step, ctx) => {
            if (step === 'whenDamaged') {
                ctx.target.health = Math.max(ctx.target.health - ctx.value, 0);
            }
        });
    },

    // move: moveRole 将 movedCard 移动到 movedInArea 的 movedAtPosition 位置
    move: function(moveRole, movedCard, movedInArea, movedAtPosition = 1, fromArea = null, fromIndex = -1, callbacks = null) {
        // 多态：如果跳过了 fromIndex 且按预期传递了 callbacks，则进行处理
        // 如果第6个参数是函数或对象，且第7个参数是 null/undefined，则移动参数
        if ((typeof fromIndex === 'function' || (typeof fromIndex === 'object' && fromIndex !== null)) && callbacks === null) {
            callbacks = fromIndex;
            fromIndex = -1;
        }

        let onComplete = null;
        let onMoveExecuted = null;
        let onMoveRejected = null;

        if (typeof callbacks === 'function') {
            onComplete = callbacks;
        } else if (typeof callbacks === 'object' && callbacks !== null) {
            onComplete = callbacks.onComplete;
            onMoveExecuted = callbacks.onMoveExecuted;
            onMoveRejected = callbacks.onMoveRejected;
        }

        // 如果缺少 fromArea，自动解析（健壮性修复）
        if (!fromArea && movedCard) {
            const card = Array.isArray(movedCard) ? movedCard[0] : movedCard;
            fromArea = window.Game.Models?.findCardArea?.(card, window.Game.GameState) || null;
        }

        // 输入: moveRole (Role/null), movedCard (Array), movedInArea (Area), movedAtPosition (int), fromArea (Area/null)
        const context = { moveRole, movedCard, movedInArea, movedAtPosition, fromArea, fromIndex };

        const steps = [];
        if (moveRole) steps.push('beforePlace');
        steps.push('beforePlaced');
        if (moveRole) steps.push('whenPlace');
        steps.push('whenPlaced');
        if (moveRole) steps.push('afterPlace');
        steps.push('afterPlaced');

        this.trigger('Move', steps, context, (step, ctx) => {
             if (step === 'whenPlaced') {
                 // 逻辑:
                 // 1. 从源移除卡牌（如果可能）
                 // 2. 添加到 movedInArea

                 if (!ctx.movedInArea) return;

                 // 确保 movedCard 是数组
                 const cards = Array.isArray(ctx.movedCard) ? ctx.movedCard : [ctx.movedCard];
                 ctx.moveSucceeded = true;

                 cards.forEach((card, index) => {
                     const insertIdx = Math.max(0, (ctx.movedAtPosition || 1) - 1) + index;
                     const moved = window.Game.Models.moveCardToArea(card, ctx.movedInArea, insertIdx, ctx.fromArea, ctx.fromIndex);
                     if (!moved) ctx.moveSucceeded = false;
                     else ctx.fromIndex = -1;
                 });

                 // Trigger specific callback if provided
                 if (ctx.moveSucceeded && onMoveExecuted) {
                     onMoveExecuted(ctx);
                 } else if (!ctx.moveSucceeded && onMoveRejected) {
                     onMoveRejected(ctx);
                 }
             }
        }, onComplete);
    }
};

window.Game.Core.Events = Events;
