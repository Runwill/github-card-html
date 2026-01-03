(function() {
    // Game State
    const GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
    };

    // Mock Data for Characters
    const mockCharacters = [
        { name: "Character A", hp: 4, maxHp: 4, avatar: "source/青龙.png.bak" },
        { name: "Character B", hp: 3, maxHp: 3, avatar: "source/白虎_君主.png.bak" },
        { name: "Character C", hp: 4, maxHp: 4, avatar: "source/朱雀.png.bak" },
        { name: "Character D", hp: 3, maxHp: 3, avatar: "source/玄武_君主.png.bak" }
    ];

    // Initialization
    function initGame() {
        const startBtn = document.getElementById('btn-start-game');
        const endTurnBtn = document.getElementById('btn-end-turn');

        if (startBtn) {
            startBtn.addEventListener('click', startGame);
        }
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', endTurn);
        }
    }

    function startGame() {
        GameState.players = mockCharacters.map((char, index) => ({
            ...char,
            id: index,
            hand: generateMockHand()
        }));
        GameState.currentPlayerIndex = 0;
        GameState.round = 1;
        GameState.isGameRunning = true;

        document.getElementById('btn-start-game').classList.add('hidden');
        document.getElementById('btn-end-turn').classList.remove('hidden');
        document.getElementById('game-main-area').classList.remove('hidden');

        updateUI();
    }

    function endTurn() {
        if (!GameState.isGameRunning) return;

        GameState.currentPlayerIndex++;
        if (GameState.currentPlayerIndex >= GameState.players.length) {
            GameState.currentPlayerIndex = 0;
            GameState.round++;
        }

        updateUI();
    }

    function updateUI() {
        // Update Round Info
        document.getElementById('game-round-info').textContent = i18n.t('game.round', { n: GameState.round });

        // Update Current Character
        const currentPlayer = GameState.players[GameState.currentPlayerIndex];
        document.getElementById('char-name').textContent = currentPlayer.name;
        // document.getElementById('char-img').src = currentPlayer.avatar; // Uncomment when images are real
        document.getElementById('char-hp-display').textContent = i18n.t('game.hp', { hp: currentPlayer.hp, maxHp: currentPlayer.maxHp });
        
        // Render Hand
        const handContainer = document.getElementById('hand-cards-container');
        handContainer.innerHTML = '';
        currentPlayer.hand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-placeholder';
            cardEl.textContent = card;
            handContainer.appendChild(cardEl);
        });

        // Render Other Players
        const otherPlayersContainer = document.getElementById('other-players-container');
        otherPlayersContainer.innerHTML = '';
        GameState.players.forEach((player, index) => {
            const pEl = document.createElement('div');
            pEl.className = 'other-player-summary';
            if (index === GameState.currentPlayerIndex) {
                pEl.classList.add('active');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            
            const hpSpan = document.createElement('span');
            hpSpan.className = 'player-hp';
            hpSpan.textContent = i18n.t('game.hp', { hp: player.hp, maxHp: player.maxHp });
            
            pEl.appendChild(nameSpan);
            pEl.appendChild(hpSpan);
            
            otherPlayersContainer.appendChild(pEl);
        });
    }

    function generateMockHand() {
        const count = Math.floor(Math.random() * 3) + 2;
        const cards = ['Slash', 'Dodge', 'Peach', 'Wine', 'Duel'];
        const hand = [];
        for (let i = 0; i < count; i++) {
            hand.push(cards[Math.floor(Math.random() * cards.length)]);
        }
        return hand;
    }

    // Hook into window load or wait for partials
    document.addEventListener('DOMContentLoaded', () => {
        // Simple check to see if partials are loaded, or just retry
        // Since the app uses a custom loader, we might need to wait for that.
        // For now, let's try a simple timeout or check if the element exists.
        const checkInterval = setInterval(() => {
            if (document.getElementById('panel_game')) {
                clearInterval(checkInterval);
                initGame();
            }
        }, 500);
    });

})();
