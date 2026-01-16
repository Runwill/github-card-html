(function() {
    window.Game = window.Game || {};
    window.Game.Core = window.Game.Core || {};

    // Event Logic Implementation
    const Events = {
        // Helper to push event to stack
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
            // Trigger UI update immediately to show start of event
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            if (window.Game.Core.checkAutoAdvance) {
                window.Game.Core.checkAutoAdvance(); // Start processing
            }
        },

        // recover: Role recovers value health
        recover: function(role, value) {
            if (!role) return;
            // Steps: beforeRecover -> whenRecover (Action) -> afterRecover
            this.trigger('Recover', ['beforeRecover', 'whenRecover', 'afterRecover'], { role, value }, (step, ctx) => {
                if (step === 'whenRecover') {
                    const oldHealth = ctx.role.health;
                    ctx.role.health = Math.min(ctx.role.health + ctx.value, ctx.role.healthLimit);
                    console.log(`[Event] Recover: ${ctx.role.name} recovered ${ctx.value} health. (${oldHealth} -> ${ctx.role.health})`);
                }
            });
        },

        // loss: Role loses value health (direct loss, not damage)
        loss: function(role, value) {
            if (!role) return;
            // Steps: beforeLoss -> whenLoss (Action) -> afterLoss
            this.trigger('Loss', ['beforeLoss', 'whenLoss', 'afterLoss'], { role, value }, (step, ctx) => {
                if (step === 'whenLoss') {
                    const oldHealth = ctx.role.health;
                    ctx.role.health = Math.max(ctx.role.health - ctx.value, 0);
                    console.log(`[Event] Loss: ${ctx.role.name} lost ${ctx.value} health. (${oldHealth} -> ${ctx.role.health})`);
                    if (ctx.role.health <= 0) console.log(`[Event] ${ctx.role.name} is dying!`);
                }
            });
        },

        // cure: Source cures Target for value
        cure: function(source, target, value) {
            if (!target) return;
            // Steps: beforeCure -> beforeCured -> whenCure -> whenCured (Action) -> afterCure -> afterCured
            const steps = ['beforeCure', 'beforeCured', 'whenCure', 'whenCured', 'afterCure', 'afterCured'];
            this.trigger('Cure', steps, { source, target, value }, (step, ctx) => {
                if (step === 'whenCured') {
                    const oldHealth = ctx.target.health;
                    ctx.target.health = Math.min(ctx.target.health + ctx.value, ctx.target.healthLimit);
                    console.log(`[Event] Cure: ${ctx.source ? ctx.source.name : 'System'} cured ${ctx.target.name} for ${ctx.value}. (${oldHealth} -> ${ctx.target.health})`);
                }
            });
        },

        // damage: Source damages Target for value
        damage: function(source, target, value) {
            if (!target) return;
            // Steps: beforeDamage -> beforeDamaged -> whenDamage -> whenDamaged (Action) -> afterDamage -> afterDamaged
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

        // move: moveRole moves movedCard to movedInArea at movedAtPosition
        move: function(moveRole, movedCard, movedInArea, movedAtPosition = 1, fromArea = null, fromIndex = -1, callbacks = null) {
            // Polymorphism: handle if fromIndex is skipped and callbacks is passed as expected
            // If the 6th arg is function or object, and 7th is null/undefined, shift args
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

            // Auto-resolve fromArea if missing (Robustness Fix)
            if (!fromArea && movedCard) {
                const card = Array.isArray(movedCard) ? movedCard[0] : movedCard;
                const gs = window.Game.GameState;
                
                // 1. Check card property (if object)
                if (card && typeof card === 'object' && card.lyingArea) {
                    fromArea = card.lyingArea;
                }
                
                // 2. Search in GameState (Brute force safety net)
                if (!fromArea && gs) {
                    // Check players
                    if (gs.players) {
                        for (let p of gs.players) {
                            if (p.hand && p.hand.cards.includes(card)) { fromArea = p.hand; break; }
                            if (p.equipArea && p.equipArea.cards.includes(card)) { fromArea = p.equipArea; break; }
                            if (p.judgeArea && p.judgeArea.cards.includes(card)) { fromArea = p.judgeArea; break; }
                        }
                    }
                    // Check piles with extra checks for existence
                    if (!fromArea && gs.pile && gs.pile.cards.includes(card)) fromArea = gs.pile;
                    if (!fromArea && gs.discardPile && gs.discardPile.cards.includes(card)) fromArea = gs.discardPile;
                }
            }

            // Inputs: moveRole (Role/null), movedCard (Array), movedInArea (Area), movedAtPosition (int), fromArea (Area/null)
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
                     // Logic:
                     // 1. Remove cards from source (if possible)
                     // 2. Add to movedInArea
                     
                     if (!ctx.movedInArea) return;
                     
                     // Ensure movedCard is array
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
