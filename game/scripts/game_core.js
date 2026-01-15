(function() {
    window.Game = window.Game || {};

    // Mock Data for Characters
    const mockCharacters = [
        { name: "Character A", hp: 4, maxHp: 4, avatar: "source/青龙.png.bak" },
        { name: "Character B", hp: 3, maxHp: 3, avatar: "source/白虎_君主.png.bak" },
        { name: "Character C", hp: 4, maxHp: 4, avatar: "source/朱雀.png.bak" },
        { name: "Character D", hp: 3, maxHp: 3, avatar: "source/玄武_君主.png.bak" }
    ];

    function generateMockHand() {
        const count = Math.floor(Math.random() * 3) + 2;
        const cards = ['Slash', 'Dodge', 'Peach', 'Wine', 'Duel'];
        const hand = [];
        for (let i = 0; i < count; i++) {
            hand.push(cards[Math.floor(Math.random() * cards.length)]);
        }
        return hand;
    }

    // Area Class
    class Area {
        constructor(name, options = {}) {
            this.name = name;
            this.cards = []; // objectInArea
            this.owner = options.owner || null; // Role who owns this area
            
            // Default options
            this.visible = options.visible || new Set(); // Roles who can see cards
            this.forOrAgainst = options.forOrAgainst !== undefined ? options.forOrAgainst : 0; // 0: for, 1: against
            this.verticalOrHorizontal = options.verticalOrHorizontal !== undefined ? options.verticalOrHorizontal : 0; // 0: vertical, 1: horizontal
            this.apartOrTogether = options.apartOrTogether !== undefined ? options.apartOrTogether : 0; // 0: apart, 1: together
        }

        add(card) {
            this.cards.push(card);
        }

        remove(card) {
            const index = this.cards.indexOf(card);
            if (index > -1) {
                this.cards.splice(index, 1);
            }
        }

        removeAt(index) {
            if (index > -1 && index < this.cards.length) {
                this.cards.splice(index, 1);
            }
        }
    }

    // Game State
    const GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
        isPaused: false,
        
        // Areas
        pile: new Area('pile', { apartOrTogether: 1, forOrAgainst: 1 }), // Together, Against (Draw Pile)
        discardPile: new Area('discardPile', { apartOrTogether: 1, forOrAgainst: 0 }), // Together, For
        treatmentArea: new Area('treatmentArea', { apartOrTogether: 0, forOrAgainst: 0 }), // Apart, For

        // Stack of active nodes (indices in their parent's children array)
        flowStack: [],
        
        // Dynamic Event Stack (for events like Damage, Recover, etc.)
        // Each item is an object: { type: 'event', name: 'damage', steps: [], currentStepIndex: 0, context: {} }
        eventStack: []
    };

    function shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }

    // Helper: Distribute initial cards (4 cards per role)
    // Remaining cards stay in the pile
    function distributeInitialCards() {
        // Shuffle the pile first
        if (GameState.pile.cards.length > 0) {
            shuffle(GameState.pile.cards);
        }

        GameState.players.forEach(player => {
            // Ensure player has a hand area
            if (!player.hand) {
                player.hand = new Area('hand', { owner: player });
            } else if (!player.hand.owner) {
                player.hand.owner = player;
            }
            
            // Draw 4 cards
            for (let i = 0; i < 4; i++) {
                if (GameState.pile.cards.length > 0) {
                    const card = GameState.pile.cards.pop();
                    player.hand.add(card);
                } else {
                    console.warn('[Game] Deck is empty during initial distribution!');
                    break;
                }
            }
        });
        
        console.log('[Game] Initial cards distributed (4 per role).');
    }

    const Settings = {
        autoRunDelay: 50 // Default 50ms
    };

    let recursionDepth = 0;
    const MAX_RECURSION = 50; // Max synchronous steps for 0ms delay

    function setSpeed(ms) {
        Settings.autoRunDelay = ms;
        // console.log(`[Game] Speed set to ${ms}ms`);
    }

    // Helper to get current node from stack
    function getCurrentNode() {
        // Priority 1: Event Stack
        if (GameState.eventStack.length > 0) {
            const activeEvent = GameState.eventStack[GameState.eventStack.length - 1];
            if (activeEvent.steps && activeEvent.steps.length > 0) {
                return {
                    name: activeEvent.steps[activeEvent.currentStepIndex],
                    type: 'event-step',
                    description: activeEvent.description || activeEvent.name
                };
            }
        }

        // Priority 2: Flow Stack
        let node = window.Game.Def.GAME_FLOW;
        for (let i = 0; i < GameState.flowStack.length; i++) {
            if (node.children && node.children[GameState.flowStack[i]]) {
                node = node.children[GameState.flowStack[i]];
            } else {
                return null;
            }
        }
        return node;
    }

    // Helper to get all active process names (for UI)
    function getActiveProcesses() {
        // Renamed to return full node info: [{name, type, ...}]
        const path = [];
        
        // 1. Traverse Flow Stack
        let node = window.Game.Def.GAME_FLOW;
        // Check root
        if (node) {
            path.push({ name: node.name, type: node.type });
        }

        for (let i = 0; i < GameState.flowStack.length; i++) {
            if (node.children && node.children[GameState.flowStack[i]]) {
                node = node.children[GameState.flowStack[i]];
                path.push({ name: node.name, type: node.type });
            } else {
                break;
            }
        }

        // 2. Traverse Event Stack
        GameState.eventStack.forEach(evt => {
            // Push the Event itself
            path.push({ name: evt.name, type: 'event', context: evt.context });
            
            // Push the current step (Tick) of the event
            if (evt.steps && evt.steps[evt.currentStepIndex]) {
                 path.push({ name: evt.steps[evt.currentStepIndex], type: 'tick' });
            }
        });

        return path;
    }

    function getNodeByStack(stack) {
        let node = window.Game.Def.GAME_FLOW;
        for (let i = 0; i < stack.length; i++) {
            node = node.children[stack[i]];
        }
        return node;
    }

    function isInteractive(node) {
        // Currently only 'acting' tick is interactive
        return node.name === 'acting';
    }

    function shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }

    function startGame(customConfig) {
        let playersData;
        
        if (customConfig && Array.isArray(customConfig.players)) {
             // 使用自定义配置（来自 Setup 环节）
             playersData = customConfig.players;
        } else {
             // 使用默认 Mock 数据
             playersData = mockCharacters;
        }

        // Initialize Deck (Pile)
        // Check if custom deck is provided
        GameState.pile.cards = [];
        if (customConfig && Array.isArray(customConfig.deck)) {
            GameState.pile.cards = [...customConfig.deck];
        } else {
            // Default Fallback
            const basic = ['Sha', 'Shan', 'Tao', 'Jiu'];
            for(let i=0; i<80; i++) GameState.pile.cards.push(basic[i%basic.length]);
        }
        
        // Shuffle the pile before distribution
        shuffle(GameState.pile.cards);

        console.log(`[Game Core] Deck initialized with ${GameState.pile.cards.length} cards.`);

        GameState.players = playersData.map((char, index) => {
            const player = {
                ...char,
                id: index,
                characterId: char.characterId || char.id, // Ensure characterId is available
                seat: index + 1,
                liveStatus: true,
                health: char.hp,
                healthLimit: char.maxHp,
                handLimit: char.hp, // Initial hand limit equals health
                reach: 1,
                // Assign owner later or use temporary object to ref?
                // Use default and assign owner immediately after
                hand: new Area('hand', { apartOrTogether: 0, forOrAgainst: 1 }),
                equipArea: new Area('equipArea', { apartOrTogether: 0, forOrAgainst: 0 }) // Apart, For
            };
            player.hand.owner = player;
            player.equipArea.owner = player;
            
            // Distribute 4 cards from the Top of the Pile
            for (let i = 0; i < 4; i++) {
                if (GameState.pile.cards.length > 0) {
                    const card = GameState.pile.cards.pop();
                    player.hand.add(card);
                }
            }
            
            // Set visibility: Hand is visible to its owner 
            player.hand.visible.add(player);
            // Equip area is visible to all (implied empty set could mean public if we handle it that way, or we add all players)
            // For now, we assume 'equipArea' is public information.

            return player;
        });
        GameState.currentPlayerIndex = 0;
        GameState.round = 1;
        GameState.isGameRunning = true;
        
        // Initialize Flow Stack to point to the first leaf node
        // Root is RoundProcess -> beforeRoundStart
        GameState.flowStack = [];
        let node = window.Game.Def.GAME_FLOW;
        while (node && (node.type === 'process' || node.type === 'ticking')) {
             if (!node.children || node.children.length === 0) break;
             GameState.flowStack.push(0);
             node = node.children[0];
        } 

        const btn = document.getElementById('btn-start-game');
        if (btn) btn.classList.add('hidden');
        
        const main = document.getElementById('game-main-area');
        if (main) main.classList.remove('hidden');
        
        const board = document.getElementById('game-board-panel');
        if (board) board.classList.remove('hidden');

        const table = document.getElementById('game-table-panel');
        if (table) table.classList.remove('hidden');

        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
        checkAutoAdvance();
    }

    function playCard() {
        // Placeholder logic for playing a card
        console.log("Player played a card.");
        // In a real implementation, this would handle card selection and effects
    }

    function advanceState() {
        if (!GameState.isGameRunning) return;

        // 1. Check Event Stack First
        if (GameState.eventStack.length > 0) {
            const activeEvent = GameState.eventStack[GameState.eventStack.length - 1];
            
            // Execute current step logic if any
            if (activeEvent.onStep) {
                activeEvent.onStep(activeEvent.steps[activeEvent.currentStepIndex], activeEvent.context);
            }

            // Advance step
            activeEvent.currentStepIndex++;

            // Check if event is finished
            if (activeEvent.currentStepIndex >= activeEvent.steps.length) {
                GameState.eventStack.pop(); // Remove finished event
                if (activeEvent.onFinish) {
                    activeEvent.onFinish(activeEvent.context);
                }
            }

            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            checkAutoAdvance();
            return; // Don't advance flow stack if we processed an event
        }

        // 2. Normal Flow Stack Logic
        let foundNext = false;
        
        while (!foundNext && GameState.flowStack.length > 0) {
            const currentIdx = GameState.flowStack.pop();
            const parentNode = getNodeByStack(GameState.flowStack); 
            
            // Special handling for TurnProcess loop within Round
            // parentNode is 'Round' (the ticking container), children[1] is TurnProcess
            if (parentNode.children && parentNode.children[currentIdx] && parentNode.children[currentIdx].name === 'TurnProcess') {
                // We just finished a TurnProcess
                GameState.currentPlayerIndex++;
                if (GameState.currentPlayerIndex < GameState.players.length) {
                    // Next player, restart TurnProcess
                    GameState.flowStack.push(currentIdx); // Push TurnProcess index back
                    
                    // Drill down to start of TurnProcess
                    let node = parentNode.children[currentIdx];
                    while (node.type === 'process' || node.type === 'ticking') {
                        GameState.flowStack.push(0);
                        node = node.children[0];
                    }
                    foundNext = true;
                    // Trigger UI update to reflect player change
                    if (window.Game.UI && window.Game.UI.updateUI) {
                        window.Game.UI.updateUI();
                    }
                    break; 
                } else {
                    // Round finished (all players done)
                    GameState.currentPlayerIndex = 0;
                    // GameState.round++; // MOVED to GameProcess loop
                    // Fall through to standard sibling logic (proceed to whenRoundFinish)
                }
            }

            // Special handling for RoundProcess loop within GameProcess
            if (parentNode && parentNode.name === 'GameProcess' && parentNode.children[currentIdx] && parentNode.children[currentIdx].name === 'RoundProcess') {
                // RoundProcess finished. Loop back to start of RoundProcess
                // Incremenet Round count here, so it applies to the NEW round
                GameState.round++;
                
                GameState.flowStack.push(currentIdx); // Push RoundProcess index back
                
                // Drill down to start of RoundProcess
                let node = parentNode.children[currentIdx];
                while (node.type === 'process' || node.type === 'ticking') {
                    GameState.flowStack.push(0);
                    node = node.children[0];
                }
                foundNext = true;
                break;
            }

            if (currentIdx + 1 < parentNode.children.length) {
                // Move to next sibling
                GameState.flowStack.push(currentIdx + 1);
                
                // Drill down to first leaf
                let node = getNodeByStack(GameState.flowStack);
                while (node.type === 'process' || node.type === 'ticking') {
                    GameState.flowStack.push(0); // Enter first child
                    node = node.children[0];
                }
                foundNext = true;
            } else {
                // No more siblings, loop continues to pop up
            }
        }

        if (!foundNext) {
            // End of entire GAME_FLOW (RoundProcess ends)
            // Restart RoundProcess for next round? 
            // Usually Game stops or loops indefinitely?
            // "Cycle roundProcess" implies infinite loop.
            // Reset to start of RoundProcess?
            // Root is RoundProcess. 
            // If we popped everything, flowStack is empty.
            
            // Restart game loop (RoundProcess)
             GameState.flowStack = [0]; 
             // Logic above handles drilling down
             let node = window.Game.Def.GAME_FLOW;
             while (node.type === 'process' || node.type === 'ticking') {
                GameState.flowStack.push(0);
                node = node.children[0];
             }
             
             if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
             }
             checkAutoAdvance();
        } else {
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            checkAutoAdvance();
        }
    }

    function endTurn() {
        // Deprecated/Modified logic
        // This function was used when flow was just TurnProcess. 
        // Now flow handles it naturally.
        // We can force advance until TurnProcess ends if needed, but for now let's just use advanceState.
        advanceState(); 
    }

    function checkAutoAdvance() {
        if (!GameState.isGameRunning || GameState.isPaused) return;
        
        const currentNode = getCurrentNode();
        if (currentNode && !isInteractive(currentNode)) {
            // Use configurable speed
            let delay = Settings.autoRunDelay; 
            
            if (currentNode.type === 'event-step') {
                delay = Settings.autoRunDelay;
            }
            // Start of stage might need extra pause?
            else if (currentNode.name.startsWith('when') && currentNode.name.includes('StageStart')) {
                // delay = delay * 1.5; // Optional: pause longer at start
            }
            
            if (delay === 0) {
                if (recursionDepth < MAX_RECURSION) {
                    recursionDepth++;
                    try {
                        advanceState();
                    } catch (e) {
                         console.error("[Game] Error in auto-advance:", e);
                    } finally {
                        recursionDepth--;
                    }
                    return;
                }
            }

            setTimeout(advanceState, delay);
        }
    }

    function togglePause() {
        GameState.isPaused = !GameState.isPaused;
        console.log(`[Game] Paused: ${GameState.isPaused}`);
        if (!GameState.isPaused) {
            checkAutoAdvance();
        }
        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
        return GameState.isPaused;
    }

    // Event Logic Implementation
    const Events = {
        // Helper to push event to stack
        trigger: function(name, steps, context, onStep, onFinish) {
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
            checkAutoAdvance(); // Start processing
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

    window.Game.Core = {
        GameState,
        startGame,
        advanceState,
        playCard,
        getCurrentNode,
        getActiveProcesses,
        isInteractive,
        checkAutoAdvance,
        togglePause,
        setSpeed,
        Events
    };

})();


