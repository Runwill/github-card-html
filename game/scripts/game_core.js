(function() {
    window.Game = window.Game || {};

    // 依赖项
    const GameState = window.Game.GameState;
    const Area = window.Game.Models.Area;
    const shuffle = window.Game.Utils.shuffle;
    const Events = window.Game.Core.Events;
    const MockData = window.Game.MockData; 


    const Settings = {
        autoRunDelay: 50 // 默认 50ms
    };

    let recursionDepth = 0;
    const MAX_RECURSION = 50; // 0ms 延迟下的最大同步步骤

    function setSpeed(ms) {
        Settings.autoRunDelay = ms;
        // console.log(`[Game] Speed set to ${ms}ms`);
    }

    // 辅助函数：从堆栈获取当前节点
    function getCurrentNode() {
        // 优先级 1：事件堆栈
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

        // 优先级 2：流程堆栈
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

    // 辅助函数：获取所有活跃进程名称 (用于 UI)
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
             // 使用默认 Mock 数据 (已移除，设为空)
             playersData = [];
             // playersData = MockData.mockCharacters;
        }

        // Initialize Public Areas (Reset all to clean state)
        const Area = window.Game.Models.Area;
        GameState.pile = new Area('pile', Area.Configs.Pile);
        GameState.discardPile = new Area('discardPile', Area.Configs.DiscardPile);
        GameState.treatmentArea = new Area('treatmentArea', Area.Configs.TreatmentArea);

        // Fill the Deck
        const Card = window.Game.Models.Card; // 使用 Card 类

        if (customConfig && Array.isArray(customConfig.deck)) {
            // 确保即使传入的是字符串数组，也转换为 Card 对象
            GameState.pile.cards = customConfig.deck.map((c, i) => {
                if (typeof c === 'string') {
                    return new Card(c, 'basic', 'none', 0, `card_${i}`);
                }
                // 已经是对象则不做处理（假设它是合法的 Card 或近似结构）
                return c;
            });
        } else {
            // Default Fallback
            // 统一使用 Card.generateStandardDeck
            GameState.pile.cards = Card.generateStandardDeck(80);
        }
        
        // Shuffle the pile before distribution
        shuffle(GameState.pile.cards);

        console.log(`[Game Core] Deck initialized with ${GameState.pile.cards.length} cards.`);

        GameState.players = playersData.map((char, index) => {
            const Player = window.Game.Models.Player;
            const player = new Player(char, index);
            
            // Distribute 4 cards from the Top of the Pile
            player.drawCards(GameState.pile, 4);
            
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


