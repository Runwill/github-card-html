(function() {
    window.Game = window.Game || {};

    // 依赖项
    const GameState = window.Game.GameState;
    const shuffle = window.Game.Utils.shuffle;
    const Events = window.Game.Core.Events;

    const Settings = {
        autoRunDelay: 0 // 默认 0ms
    };

    let recursionDepth = 0;
    const MAX_RECURSION = 50; // 0ms 延迟下的最大同步步骤

    function setSpeed(ms) {
        Settings.autoRunDelay = ms;
        // console.log(`[Game] Speed set to ${ms}ms`);
    }

    function updateGameUI() {
        window.Game.UI?.updateUI?.();
    }

    function switchToPlayView() {
        window.Game.UI.switchGameView?.('play');
    }

    function pushFirstLeafFrom(node) {
        while (node && (node.type === 'process' || node.type === 'ticking')) {
             if (!node.children || node.children.length === 0) break;
             GameState.flowStack.push(0);
             node = node.children[0];
        }
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

    /**
     * 判断当前流程是否处于 Turn (ticking) 节点内部。
     * 严格匹配面包屑显示逻辑：面包屑过滤掉 'TurnProcess' 等 process 容器，
     * 只有进入 Turn (ticking) 子节点后才算"在回合中"。
     * 即 beforeTurnStart / afterTurnFinish 不算在回合内。
     */
    function isInTurn() {
        let node = window.Game.Def.GAME_FLOW;
        for (let i = 0; i < GameState.flowStack.length; i++) {
            if (node.children && node.children[GameState.flowStack[i]]) {
                node = node.children[GameState.flowStack[i]];
                if (node.name === 'Turn' && node.type === 'ticking') return true;
            } else {
                break;
            }
        }
        return false;
    }

    function isInteractive(node) {
        // Currently only 'acting' tick is interactive
        return node.name === 'acting';
    }

    function startGame(customConfig) {
        const playersData = (customConfig && Array.isArray(customConfig.players)) ? customConfig.players : [];

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
            GameState.pile.cards = Card.generateStandardDeck(80);
        }
        
        // Shuffle the pile before distribution
        shuffle(GameState.pile.cards);

        GameState.players = playersData.map((char, index) => {
            const Player = window.Game.Models.Player;
            const player = new Player(char, index);
            
            // Distribute 4 cards from the Top of the Pile
            player.drawCards(GameState.pile, 4);
            
            return player;
        });
        GameState.currentPlayerIndex = 0;
        GameState.perspectiveIndex = 0;
        GameState.round = 1;
        GameState.isGameRunning = true;
        GameState.isPaused = false;
        GameState.eventStack = [];
        
        // 清空日志面板 DOM
        const breadcrumbsEl = document.getElementById('game-breadcrumbs');
        if (breadcrumbsEl) breadcrumbsEl.innerHTML = '';
        const timingBadgeEl = document.getElementById('game-timing-badge');
        if (timingBadgeEl) timingBadgeEl.innerHTML = '';

        // Initialize Flow Stack to point to the first leaf node
        // Root is RoundProcess -> beforeRoundStart
        GameState.flowStack = [];
        pushFirstLeafFrom(window.Game.Def.GAME_FLOW);

        // 切换到对局视图
        switchToPlayView();

        updateGameUI();
        checkAutoAdvance();
    }

    function playCard() {
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

            updateGameUI();
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
                    pushFirstLeafFrom(parentNode.children[currentIdx]);
                    foundNext = true;
                    // Trigger UI update to reflect player change
                    updateGameUI();
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
                pushFirstLeafFrom(parentNode.children[currentIdx]);
                foundNext = true;
                break;
            }

            if (currentIdx + 1 < parentNode.children.length) {
                // Move to next sibling
                GameState.flowStack.push(currentIdx + 1);
                
                // Drill down to first leaf
                pushFirstLeafFrom(getNodeByStack(GameState.flowStack));
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
             pushFirstLeafFrom(window.Game.Def.GAME_FLOW);
             
             updateGameUI();
             checkAutoAdvance();
        } else {
            updateGameUI();
            checkAutoAdvance();
        }
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
        if (!GameState.isPaused) {
            checkAutoAdvance();
        }
        updateGameUI();
        return GameState.isPaused;
    }



    window.Game.Core = {
        GameState,
        startGame,
        advanceState,
        playCard,
        getCurrentNode,
        getActiveProcesses,
        isInTurn,
        isInteractive,
        checkAutoAdvance,
        togglePause,
        setSpeed,
        Events
    };

})();


