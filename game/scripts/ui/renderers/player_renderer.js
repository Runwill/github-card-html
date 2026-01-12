(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function updateCharacterInfo(GameState, GameText) {
        if (!GameText) return;
        const currentPlayer = GameState.players[GameState.currentPlayerIndex];
        if (!currentPlayer) return;

        // 名字
        const nameEl = document.getElementById('char-name');
        if (nameEl) {
             // "角色名全部重构为后端第一个武将的名称"
             // 优先使用 character 字段 (可能是数组，取第一个)，回退使用 name
             let key = currentPlayer.character;
             if (Array.isArray(key) && key.length > 0) key = key[0];
             if (!key) key = currentPlayer.name;

             // 使用新的 GameText 系统渲染为武将术语
             // 传入 id 以匹配 <characterName class="characterID{id}"> 模板
             let html;
             if (currentPlayer.characterId) {
                 html = GameText.render('Character', { id: currentPlayer.characterId, name: key });
             } else {
                 html = GameText.render(key);
             }

             if (nameEl.innerHTML !== html) nameEl.innerHTML = html;
        }
        
        // 血量
        const hpEl = document.getElementById('char-hp-display');
        if (hpEl) {
            const newHpText = `${currentPlayer.health}/${currentPlayer.healthLimit}`; // 简单格式，或使用 i18n
            // 如果使用了 i18n: i18n.t('game.hp', { hp: ..., maxHp: ... })
            // 为了保持一致性，如果有 i18n 则使用
            const finalHpText = (typeof i18n !== 'undefined' && i18n.t) 
                ? i18n.t('game.hp', { hp: currentPlayer.health, maxHp: currentPlayer.healthLimit })
                : newHpText;

            if (hpEl.textContent !== finalHpText) {
                hpEl.classList.remove('hp-changed');
                void hpEl.offsetWidth; 
                hpEl.classList.add('hp-changed');
                hpEl.textContent = finalHpText;
            }
        }
        
        // 上下文菜单绑定
        const charInfoPanel = document.querySelector('.character-info');
        if (charInfoPanel) {
            charInfoPanel.oncontextmenu = (e) => {
                e.preventDefault();
                if (window.Game.UI.showContextMenu) {
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, currentPlayer);
                }
            };
        }

        // 区域（手牌、处理区）
        // 处理区
        if (GameState.treatmentArea) {
            const el = document.getElementById('header-treatment-area');
            if (el) {
                const key = GameState.treatmentArea.name || 'treatmentArea';
                const html = GameText.render(key);
                if (el.innerHTML !== html) el.innerHTML = html;
            }
            // 渲染卡牌
            if (window.Game.UI.renderCardList) {
                window.Game.UI.renderCardList('treatment-area-container', GameState.treatmentArea.cards || [], 'treatmentArea');
            }
        }
        
        // 手牌
        if (currentPlayer.hand) {
            const el = document.getElementById('header-hand-area');
            if (el) {
                const key = currentPlayer.hand.name || 'hand';
                const html = GameText.render(key);
                if (el.innerHTML !== html) el.innerHTML = html;
            }
            // 渲染卡牌
            const handCards = currentPlayer.hand.cards ? currentPlayer.hand.cards : currentPlayer.hand;
            if (window.Game.UI.renderCardList) {
                window.Game.UI.renderCardList('hand-cards-container', handCards, 'hand');
            }
        }
    }
    
    function renderOtherPlayers(GameState, GameText) {
        const otherPlayersContainer = document.getElementById('other-players-container');
        if (!otherPlayersContainer) return;
        
        // 同步玩家列表
        GameState.players.forEach((player, index) => {
            let pEl = document.getElementById(`player-summary-${player.id}`);
            
            if (!pEl) {
                pEl = document.createElement('div');
                pEl.id = `player-summary-${player.id}`;
                pEl.className = 'other-player-summary';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name';
                pEl.appendChild(nameSpan);
                
                const hpSpan = document.createElement('span');
                hpSpan.className = 'player-hp stat-hp';
                pEl.appendChild(hpSpan);
                
                const equipDiv = document.createElement('div');
                equipDiv.className = 'player-equips';
                equipDiv.style.fontSize = '0.8em';
                equipDiv.style.color = '#aaa';
                pEl.appendChild(equipDiv);

                otherPlayersContainer.appendChild(pEl);
            }
            
            // 激活状态
            if (index === GameState.currentPlayerIndex) {
                pEl.classList.add('active');
            } else {
                pEl.classList.remove('active');
            }
            
            // 名字
            const nameSpan = pEl.querySelector('.player-name');
            
            // "角色名全部重构为后端第一个武将的名称"
            let key = player.character;
            if (Array.isArray(key) && key.length > 0) key = key[0];
            if (!key) key = player.name;

            // 使用 GameText 渲染武将术语
            let newNameHtml;
            if (player.characterId && GameText) {
                 newNameHtml = GameText.render('Character', { id: player.characterId, name: key });
            } else {
                 newNameHtml = GameText ? GameText.render(key) : key;
            }

            if (nameSpan.innerHTML !== newNameHtml) nameSpan.innerHTML = newNameHtml;
            
            // 血量
            const hpSpan = pEl.querySelector('.player-hp');
            const finalHpText = (typeof i18n !== 'undefined' && i18n.t) 
                ? i18n.t('game.hp', { hp: player.health, maxHp: player.healthLimit })
                : `${player.health}/${player.healthLimit}`;
            
            if (hpSpan.textContent !== finalHpText) {
                hpSpan.classList.remove('hp-changed');
                void hpSpan.offsetWidth;
                hpSpan.classList.add('hp-changed');
                hpSpan.textContent = finalHpText;
            }
            
            // 装备区 (简易显示)
            const equipDiv = pEl.querySelector('.player-equips');
            if (equipDiv) {
                if (player.equipArea && player.equipArea.cards && player.equipArea.cards.length > 0) {
                     // 也尝试翻译卡牌名
                     const equipNames = player.equipArea.cards.map(c => {
                         const cName = typeof c === 'string' ? c : c.name;
                         return (typeof i18n !== 'undefined' && i18n.t) ? i18n.t(`game.card.${cName}`, {defaultValue: cName}) : cName;
                     });
                     equipDiv.textContent = `[${equipNames.join(',')}]`;
                } else {
                     equipDiv.textContent = '';
                }
            }

            // 右键菜单
            pEl.oncontextmenu = (e) => {
                e.preventDefault();
                if (window.Game.UI.showContextMenu) {
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, player);
                }
            };
        });
        
        // 清理移除的玩家
        Array.from(otherPlayersContainer.children).forEach(child => {
            const id = parseInt(child.id.replace('player-summary-', ''));
            if (!GameState.players.find(p => p.id === id)) {
                otherPlayersContainer.removeChild(child);
            }
        });
    }

    // 导出
    window.Game.UI.updateCharacterInfo = updateCharacterInfo;
    window.Game.UI.renderOtherPlayers = renderOtherPlayers;
})();
