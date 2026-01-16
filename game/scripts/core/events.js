(function() {
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
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            if (window.Game.Core.checkAutoAdvance) {
                window.Game.Core.checkAutoAdvance(); // 开始处理
            }
        },

        // recover: 角色回复 value 点体力
        recover: function(role, value) {
            if (!role) return;
            // 步骤: beforeRecover -> whenRecover (动作) -> afterRecover
            this.trigger('Recover', ['beforeRecover', 'whenRecover', 'afterRecover'], { role, value }, (step, ctx) => {
                if (step === 'whenRecover') {
                    const oldHealth = ctx.role.health;
                    ctx.role.health = Math.min(ctx.role.health + ctx.value, ctx.role.healthLimit);
                    console.log(`[Event] Recover: ${ctx.role.name} recovered ${ctx.value} health. (${oldHealth} -> ${ctx.role.health})`);
                }
            });
        },

        // loss: 角色流失 value 点体力（直接流失，非伤害）
        loss: function(role, value) {
            if (!role) return;
            // 步骤: beforeLoss -> whenLoss (动作) -> afterLoss
            this.trigger('Loss', ['beforeLoss', 'whenLoss', 'afterLoss'], { role, value }, (step, ctx) => {
                if (step === 'whenLoss') {
                    const oldHealth = ctx.role.health;
                    ctx.role.health = Math.max(ctx.role.health - ctx.value, 0);
                    console.log(`[Event] Loss: ${ctx.role.name} lost ${ctx.value} health. (${oldHealth} -> ${ctx.role.health})`);
                    if (ctx.role.health <= 0) console.log(`[Event] ${ctx.role.name} is dying!`);
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
                    const oldHealth = ctx.target.health;
                    ctx.target.health = Math.min(ctx.target.health + ctx.value, ctx.target.healthLimit);
                    console.log(`[Event] Cure: ${ctx.source ? ctx.source.name : 'System'} cured ${ctx.target.name} for ${ctx.value}. (${oldHealth} -> ${ctx.target.health})`);
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
                    const oldHealth = ctx.target.health;
                    ctx.target.health = Math.max(ctx.target.health - ctx.value, 0);
                    console.log(`[Event] Damage: ${ctx.source ? ctx.source.name : 'System'} damaged ${ctx.target.name} for ${ctx.value}. (${oldHealth} -> ${ctx.target.health})`);
                    if (ctx.target.health <= 0) console.log(`[Event] ${ctx.target.name} is dying!`);
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

            if (typeof callbacks === 'function') {
                onComplete = callbacks;
            } else if (typeof callbacks === 'object' && callbacks !== null) {
                onComplete = callbacks.onComplete;
                onMoveExecuted = callbacks.onMoveExecuted;
            }

            // 如果缺少 fromArea，自动解析（健壮性修复）
            if (!fromArea && movedCard) {
                const card = Array.isArray(movedCard) ? movedCard[0] : movedCard;
                const gs = window.Game.GameState;
                
                // 1. 检查卡牌属性（如果是对象）
                if (card && typeof card === 'object' && card.lyingArea) {
                    fromArea = card.lyingArea;
                }
                
                // 2. 在 GameState 中搜索（暴力搜索作为安全网）
                if (!fromArea && gs) {
                    // 检查玩家
                    if (gs.players) {
                        for (let p of gs.players) {
                            if (p.hand && p.hand.cards.includes(card)) { fromArea = p.hand; break; }
                            if (p.equipArea && p.equipArea.cards.includes(card)) { fromArea = p.equipArea; break; }
                            if (p.judgeArea && p.judgeArea.cards.includes(card)) { fromArea = p.judgeArea; break; }
                        }
                    }
                    // 检查牌堆（额外检查是否存在）
                    if (!fromArea && gs.pile && gs.pile.cards.includes(card)) fromArea = gs.pile;
                    if (!fromArea && gs.discardPile && gs.discardPile.cards.includes(card)) fromArea = gs.discardPile;
                    if (!fromArea && gs.treatmentArea && gs.treatmentArea.cards.includes(card)) fromArea = gs.treatmentArea;
                }
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

                     cards.forEach(card => {
                         // Try to remove from old area
                         let removed = false;

                         // 1. Explicit fromArea
                         if (ctx.fromArea) {
                             if (ctx.fromIndex !== undefined && ctx.fromIndex > -1 && typeof ctx.fromArea.removeAt === 'function') {
                                ctx.fromArea.removeAt(ctx.fromIndex);
                                removed = true;
                                // Reset index to avoid reusing for next card if multiple (though rare for drag)
                                ctx.fromIndex = -1; 
                             } else if (typeof ctx.fromArea.remove === 'function') {
                                 ctx.fromArea.remove(card);
                                 removed = true;
                             }
                         }
                         
                         // 2. Object property (Fallback)
                         if (!removed && card && card.lyingArea && typeof card.lyingArea.remove === 'function') {
                             card.lyingArea.remove(card);
                         } 
                     });

                     // Insert into new area
                     // Arrays are 0-indexed, movedAtPosition is 1-based default.
                     if (ctx.movedInArea.cards && Array.isArray(ctx.movedInArea.cards)) {
                         const insertIdx = Math.max(0, (ctx.movedAtPosition || 1) - 1);
                         ctx.movedInArea.cards.splice(insertIdx, 0, ...cards);
                     }
                     
                     // Update properties
                     cards.forEach(card => {
                         if (card && typeof card === 'object') {
                             card.lyingArea = ctx.movedInArea;
                             // We don't track 'position' property explicitly as it is array index
                         }
                     });
                     
                     console.log('[Game] Event: Move executed.', { 
                         cards: cards.length, 
                         to: ctx.movedInArea.name + (ctx.movedInArea.owner ? ` (${ctx.movedInArea.owner.name})` : ''), 
                         pos: ctx.movedAtPosition,
                         from: ctx.fromArea ? (ctx.fromArea.name + (ctx.fromArea.owner ? ` (${ctx.fromArea.owner.name})` : '')) : 'unknown'
                     });

                     // Trigger specific callback if provided
                     if (onMoveExecuted) {
                         onMoveExecuted(ctx);
                     }
                 }
            }, onComplete);
        }
    };

    window.Game.Core.Events = Events;

})();
