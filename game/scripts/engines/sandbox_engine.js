(function() {
    window.Game = window.Game || {};
    window.Game.Engines = window.Game.Engines || {};

    class SandboxEngine {
        constructor() {
            this.state = window.Game.GameState;
        }

        init(config) {
            console.log("[Sandbox] Initializing Manual Mode...");
            this.state.isGameRunning = true;
            this.state.mode = 'sandbox';
            
            this._setupPlayers(config);
            this._distributeCards();
            
            // --- UI Visibility Handling ---
            const btn = document.getElementById('btn-start-game');
            if (btn) btn.classList.add('hidden');
            
            const main = document.getElementById('game-main-area');
            if (main) main.classList.remove('hidden');
            
            const board = document.getElementById('game-board-panel');
            if (board) board.classList.remove('hidden');

            const table = document.getElementById('game-table-panel');
            if (table) table.classList.remove('hidden');
            // -------------------------------
            
            // In Sandbox, all areas might be treated as open or managed by user
            // We don't start any flow stack
            
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            console.log("[Sandbox] Ready.");
        }

        _setupPlayers(config) {
             let playersData;
             if (config && Array.isArray(config.players)) {
                  playersData = config.players;
             } else {
                  playersData = window.Game.MockData.mockCharacters;
             }
     
             this.state.players = playersData.map((char, index) => {
                 const Area = window.Game.Models.Area;
                 const player = {
                     ...char,
                     id: index,
                     characterId: char.characterId || char.id,
                     seat: index + 1,
                     liveStatus: true,
                     health: char.hp,
                     healthLimit: char.maxHp,
                     handLimit: char.hp,
                     reach: 1,
                     
                     // In sandbox, areas are just containers
                     hand: new Area('hand', { apartOrTogether: 0, forOrAgainst: 1 }),
                     equipArea: new Area('equipArea', { apartOrTogether: 0, forOrAgainst: 0 })
                 };
                 player.hand.owner = player;
                 player.equipArea.owner = player;
                 
                 // Sandbox: Make hand visible to owner (or everyone if hotseat)
                 player.hand.visible.add(player);
                 
                 return player;
             });
             
             // Reset Indices
             this.state.currentPlayerIndex = 0;
        }

        _distributeCards(config) {
             const Area = window.Game.Models.Area;
             const shuffle = window.Game.Utils.shuffle;
             
             // Reset Pile
             this.state.pile = new Area('pile', { apartOrTogether: 1, forOrAgainst: 1 });
             this.state.discardPile = new Area('discardPile', { apartOrTogether: 1, forOrAgainst: 0 });
             
             // Fill Pile
             const basic = ['Sha', 'Shan', 'Tao', 'Jiu'];
             for(let i=0; i<80; i++) {
                 // Convert string to Object to support properties like 'lyingArea'
                 this.state.pile.cards.push({
                     name: basic[i%basic.length],
                     type: 'basic', // Mock type
                     id: `card_${i}`
                 });
             }
             
             shuffle(this.state.pile.cards);
             
             // Initial Draw (Optional in Sandbox, maybe start empty?)
             // Let's give them 4 cards to start playing with
             this.state.players.forEach(player => {
                 for (let i = 0; i < 4; i++) {
                     if (this.state.pile.cards.length > 0) {
                         const card = this.state.pile.cards.pop();
                         card.lyingArea = player.hand; // Initialize location
                         player.hand.add(card);
                     }
                 }
             });
        }

        // --- Action Handlers for Sandbox ---

        // Directly move card without event stack
        moveCard(card, toArea, toIndex = -1) {
             // 1. Find and remove from old area
             // If card is string (legacy mock), we can't track it easily. 
             // Ideally we upgraded data in _distributeCards, but let's be safe.
             
             let fromArea = (typeof card === 'object') ? card.lyingArea : null; 
             
             if (fromArea) {
                 const idx = fromArea.cards.indexOf(card);
                 if (idx > -1) fromArea.cards.splice(idx, 1);
             } else {
                 // Fallback: This is a hack for string cards if still present
                 // We don't know where it came from unless passed explicitly.
                 // But moveCard signature is (card, toArea).
                 // Sandbox assumes object references.
             }
             
             // 2. Add to new area
             if (toIndex >= 0 && toIndex < toArea.cards.length) {
                 toArea.cards.splice(toIndex, 0, card);
             } else {
                 toArea.cards.push(card);
             }
             
             // 3. Update linkage
             if (typeof card === 'object') {
                card.lyingArea = toArea;
             }
             
             console.log(`[Sandbox] Moved card ${card.name || card} to ${toArea.name}`);
             
             if (window.Game.UI.updateUI) window.Game.UI.updateUI();
        }
        
        modifyHealth(roleId, delta) {
            const player = this.state.players.find(p => p.id === roleId);
            if (player) {
                // Manual mode: Allow exceeding health limit (removed Math.min)
                player.health = Math.max(player.health + delta, 0);
                if (window.Game.UI.updateUI) window.Game.UI.updateUI();
            }
        }

        modifyMaxHealth(roleId, delta) {
            const player = this.state.players.find(p => p.id === roleId);
            if (player) {
                player.healthLimit = Math.max(player.healthLimit + delta, 1);
                if (window.Game.UI.updateUI) window.Game.UI.updateUI();
            }
        }
    }

    window.Game.Engines.SandboxEngine = SandboxEngine;

})();
