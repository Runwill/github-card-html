(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 渲染自身角色信息 (Self Role Info)
     * 对应用户操作的当前角色 (UI底部面板)
     */
    function updateSelfRoleInfo(GameState, GameText) {
        if (!GameText) return;
        // selfRole: 当前用户操作的角色实体
        const selfRole = GameState.players[GameState.currentPlayerIndex];
        if (!selfRole) return;
        
        // 绑定自身面板的 Inspector
        const currentPanel = document.querySelector('.current-character-panel');
        if (currentPanel && !currentPanel.hasAttribute('data-inspector-type')) {
            currentPanel.setAttribute('data-inspector-type', 'role');
            currentPanel.setAttribute('data-role-id', selfRole.id);
        } else if (currentPanel) {
            // 确保 ID 正确 (如果是 hotseat 模式可能会变)
            currentPanel.setAttribute('data-role-id', selfRole.id);
        }

        // 名字 (角色/武将)
        const nameEl = document.getElementById('char-name');
        if (nameEl) {
             // 优先使用 character 字段 (武将名)，回退使用 role.name
             let key = selfRole.character;
             if (Array.isArray(key) && key.length > 0) key = key[0];
             if (!key) key = selfRole.name;

             // 使用 GameText 渲染 Character (武将)
             let html;
             // 构造一个唯一标识，用于检查数据是否真正改变
             const renderKey = selfRole.characterId ? `char:${selfRole.characterId}:${key}` : `char:default:${key}`;

             if (selfRole.characterId) {
                 html = GameText.render('Character', { id: selfRole.characterId, name: key });
             } else {
                 html = GameText.render(key);
             }

             // 使用 data-render-key 进行脏检查
             if (nameEl.getAttribute('data-render-key') !== renderKey) {
                 nameEl.innerHTML = html;
                 nameEl.setAttribute('data-render-key', renderKey);
             }
        }
        
        // 血量
        const hpEl = document.getElementById('char-hp-display');
        if (hpEl) {
            const finalHpText = `${selfRole.health}/${selfRole.healthLimit}`;

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
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, selfRole);
                }
            };
        }

        // 区域（手牌）
        // (处理区已移至 board_renderer.js)
        
        // 手牌
        if (selfRole.hand) {
            const el = document.getElementById('header-hand-area');
            if (el) {
                // Add Inspector
                el.setAttribute('data-inspector-type', 'area');
                el.setAttribute('data-area-name', 'hand'); // 注意：这里的 hand 上下文依赖于当前角色

                const key = selfRole.hand.name || 'hand';
                const renderKey = `area:${key}`;
                
                if (el.getAttribute('data-render-key') !== renderKey) {
                    const html = GameText.render(key);
                    el.innerHTML = html;
                    el.setAttribute('data-render-key', renderKey);
                }
            }
            // 渲染卡牌
            const handCards = selfRole.hand.cards ? selfRole.hand.cards : selfRole.hand;
            if (window.Game.UI.renderCardList) {
                window.Game.UI.renderCardList('hand-cards-container', handCards, 'hand');
            }
        }
    }
    
    /**
     * 渲染角色列表 (Role List)
     * 场上所有角色的列表
     */
    function renderRoleList(GameState, GameText) {
        // Find split containers
        const containerLeft = document.getElementById('role-list-left');
        const containerTop = document.getElementById('role-list-top');
        const containerRight = document.getElementById('role-list-right');

        // Fallback for setups without new layout (if any)
        const legacyContainer = document.getElementById('role-list-container');
        
        if (!containerLeft && !containerTop && !containerRight && !legacyContainer) return;

        // "Main" player is now the Current Active Player (Center of attention)
        const mainPlayerIndex = GameState.currentPlayerIndex; 
        const playerCount = GameState.players.length;

        GameState.players.forEach((role, index) => {
            // Calculate relative position based on Current Player
            // diff = 0 (Main/Bottom), 1 (Right), N-1 (Left), Others (Top)
            const diff = (index - mainPlayerIndex + playerCount) % playerCount;

            // EXCLUDE MAIN PLAYER from Table (They are in Main/Bottom view)
            if (diff === 0) return;

            // Determine Target Container
            let targetContainer = legacyContainer;
            if (!targetContainer) {
                if (diff === 1) targetContainer = containerRight;
                else if (diff === playerCount - 1) targetContainer = containerLeft;
                else targetContainer = containerTop;
            }

            // 虽然HTML ID 仍沿用 player-summary- 以匹配旧 CSS，但逻辑上这是 Role
            let pEl = document.getElementById(`player-summary-${role.id}`);
            
            if (!pEl) {
                pEl = document.createElement('div');
                pEl.id = `player-summary-${role.id}`;
                pEl.className = 'role-summary';
                // Inspector Meta
                pEl.setAttribute('data-inspector-type', 'role');
                pEl.setAttribute('data-role-id', role.id);
                
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
                
                if (targetContainer) targetContainer.appendChild(pEl);
            } else {
                // Ensure it is in the correct container (in case players added dynamically or re-sorted)
                if (targetContainer && pEl.parentElement !== targetContainer) {
                    targetContainer.appendChild(pEl);
                }
            }
            
            // 激活状态 (当前回合角色)
            
            // 激活状态 (当前回合角色)
            if (index === GameState.currentPlayerIndex) {
                pEl.classList.add('active');
            } else {
                pEl.classList.remove('active');
            }
            
            // 名字 (角色/武将)
            const nameSpan = pEl.querySelector('.player-name');
            
            let key = role.character;
            if (Array.isArray(key) && key.length > 0) key = key[0];
            if (!key) key = role.name;

            // FIX: Use dirty check key to prevent infinite replace loop
            const renderKey = role.characterId ? `char:${role.characterId}:${key}` : `char:default:${key}`;

            // Check using stable key instead of volatile innerHTML
            if (nameSpan.getAttribute('data-render-key') !== renderKey) {
                // 使用 GameText 渲染 Character (武将)
                let newNameHtml;
                if (role.characterId && GameText) {
                     newNameHtml = GameText.render('Character', { id: role.characterId, name: key });
                } else {
                     newNameHtml = GameText ? GameText.render(key) : key;
                }

                nameSpan.innerHTML = newNameHtml;
                nameSpan.setAttribute('data-render-key', renderKey);
            }
            
            // 血量
            const hpSpan = pEl.querySelector('.player-hp');
            const finalHpText = `${role.health}/${role.healthLimit}`;
            
            if (hpSpan.textContent !== finalHpText) {
                hpSpan.classList.remove('hp-changed');
                void hpSpan.offsetWidth;
                hpSpan.classList.add('hp-changed');
                hpSpan.textContent = finalHpText;
            }
            
            // 装备区
            const equipDiv = pEl.querySelector('.player-equips');
            if (equipDiv) {
                if (role.equipArea && role.equipArea.cards && role.equipArea.cards.length > 0) {
                     const equipNames = role.equipArea.cards.map(c => {
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
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, role);
                }
            };
        });
        
        // 清理移除的角色
        const allContainers = [containerLeft, containerTop, containerRight, legacyContainer];
        allContainers.forEach(container => {
            if (!container) return;
            Array.from(container.children).forEach(child => {
                const id = parseInt(child.id.replace('player-summary-', ''));
                const playerExists = GameState.players.find(p => p.id === id);
                
                // Remove if player doesn't exist OR if this player is now the Main Player (Bottom View)
                // The Main Player is GameState.players[GameState.currentPlayerIndex]
                const isMainNow = (GameState.players[GameState.currentPlayerIndex] && GameState.players[GameState.currentPlayerIndex].id === id);

                if (!playerExists || isMainNow) {
                    container.removeChild(child);
                }
            });
        });
    }

    // 导出 (使用 Role 术语)
    window.Game.UI.updateSelfRoleInfo = updateSelfRoleInfo;
    window.Game.UI.renderRoleList = renderRoleList;
    
    // (保留旧名以防其他地方调用遗漏，尽管我们即将更新 main_renderer)
    window.Game.UI.updateCharacterInfo = updateSelfRoleInfo; 
    window.Game.UI.renderOtherRoles = renderRoleList;
    window.Game.UI.renderOtherPlayers = renderRoleList;
})();








