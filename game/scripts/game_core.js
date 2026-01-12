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
    }

    // Game State
    const GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
        isPaused: false,
        
        // Areas
        pile: new Area('pile', { apartOrTogether: 1, forOrAgainst: 1 }), // Together, Against
        discardPile: new Area('discardPile', { apartOrTogether: 1, forOrAgainst: 0 }), // Together, For
        treatmentArea: new Area('treatmentArea', { apartOrTogether: 0, forOrAgainst: 0 }), // Apart, For

        // Stack of active nodes (indices in their parent's children array)
        flowStack: [],
        
        // Dynamic Event Stack (for events like Damage, Recover, etc.)
        // Each item is an object: { type: 'event', name: 'damage', steps: [], currentStepIndex: 0, context: {} }
        eventStack: []
    };

    const Settings = {
        autoRunDelay: 50 // Default 50ms
    };

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

    function startGame(customConfig) {
        let playersData;
        
        if (customConfig && Array.isArray(customConfig.players)) {
             // 使用自定义配置（来自 Setup 环节）
             playersData = customConfig.players;
        } else {
             // 使用默认 Mock 数据
             playersData = mockCharacters;
        }

        GameState.players = playersData.map((char, index) => {
            const player = {
                ...char,
                id: index,
                seat: index + 1,
                liveStatus: true,
                health: char.hp,
                healthLimit: char.maxHp,
                handLimit: char.hp, // Initial hand limit equals health
                reach: 1,
                hand: new Area('hand', { apartOrTogether: 0, forOrAgainst: 1 }),
                equipArea: new Area('equipArea', { apartOrTogether: 0, forOrAgainst: 0 }) // Apart, For
            };
            
            // Populate Hand Area (Mock or Empty)
             // 暂时仍然生成 Mock 手牌，或者如果 customConfig 提供初始手牌则使用
            const cards = generateMockHand();
            cards.forEach(c => player.hand.add(c));
            
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
        GameState.flowStack = [0]; 

        document.getElementById('btn-start-game').classList.add('hidden');
        document.getElementById('game-main-area').classList.remove('hidden');
        document.getElementById('game-board-panel').classList.remove('hidden');

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
            const parentNode = getNodeByStack(GameState.flowStack); // Get parent using remaining stack
            
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
            // End of TurnProcess, start next player turn
            endTurn();
        } else {
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            checkAutoAdvance();
        }
    }

    function endTurn() {
        GameState.currentPlayerIndex++;
        if (GameState.currentPlayerIndex >= GameState.players.length) {
            GameState.currentPlayerIndex = 0;
            GameState.round++;
        }
        // Reset Flow to start
        GameState.flowStack = [0];

        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
        checkAutoAdvance();
    }

    function checkAutoAdvance() {
        if (!GameState.isGameRunning || GameState.isPaused) return;
        
        const currentNode = getCurrentNode();
        if (currentNode && !isInteractive(currentNode)) {
            // Use configurable speed
            let delay = Settings.autoRunDelay; 
            
            // Slower for Event Steps to be visible if needed, or faster
            // For now, let's respect the slider globally, or maybe half speed for ticks?
            // Let's stick to the slider value as the baseline beat.
            
            if (currentNode.type === 'event-step') {
                delay = 0; // Steps inside event might still be instant logic, but maybe we want to see them?
                // If user wants to see "WhenDamage", "AfterDamage" etc, we should wait.
                // Let's make it consistent:
                delay = Settings.autoRunDelay;
            }
            // Start of stage might need extra pause?
            else if (currentNode.name.startsWith('when') && currentNode.name.includes('StageStart')) {
                // delay = delay * 1.5; // Optional: pause longer at start
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
        trigger: function(name, steps, context, onStep) {
            GameState.eventStack.push({
                type: 'event',
                name: name,
                steps: steps,
                currentStepIndex: 0,
                context: context,
                onStep: onStep
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
