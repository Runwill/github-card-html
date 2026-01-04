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

    // Game State
    const GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
        
        // Stack of active nodes (indices in their parent's children array)
        flowStack: [] 
    };

    // Helper to get current node from stack
    function getCurrentNode() {
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
        let node = window.Game.Def.GAME_FLOW;
        const processes = [node.name]; // Root is always active if we are running
        for (let i = 0; i < GameState.flowStack.length; i++) {
            if (node.children && node.children[GameState.flowStack[i]]) {
                node = node.children[GameState.flowStack[i]];
                if (node.type === 'process') {
                    processes.push(node.name);
                }
            } else {
                break;
            }
        }
        return processes;
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

    function startGame() {
        GameState.players = mockCharacters.map((char, index) => ({
            ...char,
            id: index,
            seat: index + 1,
            liveStatus: true,
            health: char.hp,
            healthLimit: char.maxHp,
            handLimit: char.hp, // Initial hand limit equals health
            reach: 1,
            hand: generateMockHand()
        }));
        GameState.currentPlayerIndex = 0;
        GameState.round = 1;
        GameState.isGameRunning = true;
        
        // Initialize Flow Stack to point to the first leaf node
        GameState.flowStack = [0]; 

        document.getElementById('btn-start-game').classList.add('hidden');
        document.getElementById('game-main-area').classList.remove('hidden');

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

        let foundNext = false;
        
        while (!foundNext && GameState.flowStack.length > 0) {
            const currentIdx = GameState.flowStack.pop();
            const parentNode = getNodeByStack(GameState.flowStack); // Get parent using remaining stack
            
            if (currentIdx + 1 < parentNode.children.length) {
                // Move to next sibling
                GameState.flowStack.push(currentIdx + 1);
                
                // Drill down to first leaf
                let node = getNodeByStack(GameState.flowStack);
                while (node.type === 'process') {
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
        if (!GameState.isGameRunning) return;
        
        const currentNode = getCurrentNode();
        if (currentNode && !isInteractive(currentNode)) {
            // Default fast tick speed (50ms)
            let delay = 50; 
            // If we are at the start of a stage, pause longer (80ms) to match animation
            if (currentNode.name.startsWith('when') && currentNode.name.includes('StageStart')) {
                delay = 80;
            }
            
            setTimeout(advanceState, delay);
        }
    }

    window.Game.Core = {
        GameState,
        startGame,
        advanceState,
        playCard,
        getCurrentNode,
        getActiveProcesses,
        isInteractive,
        checkAutoAdvance
    };

})();
