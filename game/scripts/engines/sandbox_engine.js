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
            
            // --- UI 可见性处理 ---
            const btn = document.getElementById('btn-start-game');
            if (btn) btn.classList.add('hidden');
            
            const main = document.getElementById('game-main-area');
            if (main) main.classList.remove('hidden');
            
            const board = document.getElementById('game-board-panel');
            if (board) board.classList.remove('hidden');

            const table = document.getElementById('game-table-panel');
            if (table) table.classList.remove('hidden');
            // -------------------------------
            
            // 在沙盒中，所有区域都可以视为开放或由此用户管理
            // 不需要启动任何流程堆栈
            
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
                  // 如果未提供配置，回退到一个基本配置，或者空数组
                  // playersData = window.Game.MockData.mockCharacters; // 已移除
                  playersData = [];
                  console.warn("[Sandbox] No players config provided and no MockData available.");
             }
     
             this.state.players = playersData.map((char, index) => {
                 const Player = window.Game.Models.Player;
                 return new Player(char, index);
             });
             
             // 重置索引
             this.state.currentPlayerIndex = 0;
        }

        _distributeCards(config) {
             const Area = window.Game.Models.Area;
             const Card = window.Game.Models.Card; // 使用 Card 类
             const shuffle = window.Game.Utils.shuffle;
             
             // 重置牌组
             this.state.pile = new Area('pile', Area.Configs.Pile);
             this.state.discardPile = new Area('discardPile', Area.Configs.DiscardPile);
             
             // 填充牌组 (统一使用 Card.generateStandardDeck)
             this.state.pile.cards = Card.generateStandardDeck(80);
             
             shuffle(this.state.pile.cards);
             
             // 初始抽牌 (可选的沙盒设置，或许从空手牌开始?)
             // Let's give them 4 cards to start playing with
             this.state.players.forEach(player => {
                 player.drawCards(this.state.pile, 4);
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
