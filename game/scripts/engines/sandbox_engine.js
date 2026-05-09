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
            this.state.isPaused = false;
            this.state.mode = 'sandbox';
            this.state.round = 1;
            this.state.flowStack = [];
            this.state.eventStack = [];
            
            // 清空日志面板 DOM
            const breadcrumbsEl = document.getElementById('game-breadcrumbs');
            if (breadcrumbsEl) breadcrumbsEl.innerHTML = '';
            const timingBadgeEl = document.getElementById('game-timing-badge');
            if (timingBadgeEl) timingBadgeEl.innerHTML = '';

            this._setupPlayers(config);
            this._distributeCards(config);
            
            // --- UI 可见性处理：切换到对局视图 ---
            if (window.Game.UI.switchGameView) {
                window.Game.UI.switchGameView('play');
            }
            // -------------------------------
            
            // 在沙盒中，所有区域都可以视为开放或由此用户管理
            // 不需要启动任何流程堆栈
            
            if (window.Game.UI && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
            console.log("[Sandbox] Ready.");
        }

        _setupPlayers(config) {
               const hasPlayersConfig = config && Array.isArray(config.players);
               const playersData = hasPlayersConfig ? config.players : [];
               if (!hasPlayersConfig) console.warn("[Sandbox] No players config provided; starting with no players.");
     
             this.state.players = playersData.map((char, index) => {
                 const Player = window.Game.Models.Player;
                 return new Player(char, index);
             });
             
             // 重置索引
             this.state.currentPlayerIndex = 0;
             this.state.perspectiveIndex = 0;
             this.state.sandboxTurnIndex = -1;  // -1 = 无手动指定的回合角色
        }

        _distributeCards(config) {
             const Area = window.Game.Models.Area;
                         const Card = window.Game.Models.Card;
             const shuffle = window.Game.Utils.shuffle;
             
             // 重置牌组
             this.state.pile = new Area('pile', Area.Configs.Pile);
             this.state.discardPile = new Area('discardPile', Area.Configs.DiscardPile);
             this.state.treatmentArea = new Area('treatmentArea', Area.Configs.TreatmentArea);
             
             // 填充牌组 
             if (config && Array.isArray(config.deck) && config.deck.length > 0) {
                 // 使用配置中的 deck (字符串数组)
                 this.state.pile.cards = config.deck.map(cardName => new Card(cardName));
             } else {
                 // 默认备选 (80张标准)
                 this.state.pile.cards = Card.generateStandardDeck(80);
             }
             
             shuffle(this.state.pile.cards);

             // 初始化牌堆卡牌的可见性和区域引用
             this.state.pile.cards.forEach(c => {
                 if (c && typeof c === 'object') {
                     c.lyingArea = this.state.pile;
                     window.Game.Models.applyCardVisibility(c, this.state.pile);
                 }
             });
             
             // 初始抽牌
             this.state.players.forEach(player => {
                 player.drawCards(this.state.pile, 4);
                 // 修正抽到手牌的可见性：手牌对持有者可见
                 player.hand.cards.forEach(c => {
                     if (c && typeof c === 'object') {
                         window.Game.Models.applyCardVisibility(c, player.hand);
                     }
                 });
             });
        }

        // --- Action Handlers for Sandbox ---

        // Directly move card without event stack
        moveCard(card, toArea, toIndex = -1, fromAreaHint = null) {
             window.Game.Models.moveCardToArea(card, toArea, toIndex, fromAreaHint);
             
             console.log(`[Sandbox] Moved card ${card.name || card} to ${toArea.name}`);
             
             if (window.Game.UI.updateUI) window.Game.UI.updateUI();
        }
        
        modifyHealth(roleId, delta) {
            const player = this.state.players.find(p => p.id === roleId);
            if (player) {
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
