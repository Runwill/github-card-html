(function() {
    const { fitSummaryName, setupHandInspector, roleCharacterKey, updateAvatarImage, updateCountBadge, renderEquipNames, setupJudgeButton, setupEquipmentButton, updateViewerLabels, openJudgeViewer } = window.Game.UI._RoleUtils;

    function createSummaryButton(className, text, title) {
        const button = document.createElement('button');
        button.className = className;
        button.innerText = text;
        if (title) button.title = title;
        return button;
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

        if (!containerLeft && !containerTop && !containerRight) return;

        // "Main" player is now the Perspective Player (Center of layout)
        const mainPlayerIndex = (GameState.perspectiveIndex != null) ? GameState.perspectiveIndex : 0;
        const playerCount = GameState.players.length;

        GameState.players.forEach((role, index) => {
            const diff = (index - mainPlayerIndex + playerCount) % playerCount;

            // EXCLUDE MAIN PLAYER from Table (They are in Main/Bottom view)
            if (diff === 0) return;

            // Determine Target Container
            let targetContainer;
            if (playerCount >= 4 && diff === 1) targetContainer = containerRight;
            else if (playerCount >= 4 && diff === playerCount - 1) targetContainer = containerLeft;
            else targetContainer = containerTop;

            let pEl = document.getElementById(`player-summary-${role.id}`);
            
            if (!pEl) {
                pEl = document.createElement('div');
                pEl.id = `player-summary-${role.id}`;
                pEl.className = 'role-summary';
                
                // Drop Zone Config (Trigger Mode)
                pEl.setAttribute('data-drop-zone', `role:${role.id}`); 
                pEl.setAttribute('data-accept-placeholder', 'false');

                // -----------------------------------------------------------------
                // Feature: Drag Long Hover -> Switch to Judge Area
                // -----------------------------------------------------------------
                let dragHoverTimer = null;
                const originalZoneId = `role:${role.id}`;
                const judgeZoneId = `role-judge:${role.id}`;

                const clearHoverTimer = () => {
                    if (dragHoverTimer) {
                        clearTimeout(dragHoverTimer);
                        dragHoverTimer = null;
                    }
                    if (pEl.getAttribute('data-drop-zone') === judgeZoneId) {
                         pEl.setAttribute('data-drop-zone', originalZoneId);
                         pEl.classList.remove('judge-area-active');
                         const nameEl = pEl.querySelector('.player-name');
                         if (nameEl && nameEl._origName) {
                             nameEl.innerText = nameEl._origName;
                             delete nameEl._origName;
                         }
                    }
                };

                pEl.addEventListener('mouseenter', () => {
                    const dragState = window.Game.UI.DragState;
                    if (!dragState || !dragState.isDragging) return;

                    clearHoverTimer();
                    dragHoverTimer = setTimeout(() => {
                        pEl.setAttribute('data-drop-zone', judgeZoneId);
                        pEl.classList.add('judge-area-active');
                        
                        const nameEl = pEl.querySelector('.player-name');
                        if (nameEl) {
                            nameEl._origName = nameEl.innerText;
                            nameEl.innerText = "判定区";
                        }
                    }, 400);
                });

                pEl.addEventListener('mouseleave', clearHoverTimer);
                pEl.addEventListener('mouseup', clearHoverTimer);
                
                // -----------------------------------------------------------------
                
                // Avatar
                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'char-avatar role-list-avatar';
                
                const avatarImg = document.createElement('img');
                avatarImg.src = ''; 
                
                avatarContainer.appendChild(avatarImg);
                
                // Judge Count Badge
                const judgeCountSpan = document.createElement('span');
                judgeCountSpan.className = 'player-judge-count';
                judgeCountSpan.style.display = 'none';
                judgeCountSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const role = pEl._role;
                    if (role) openJudgeViewer(role);
                });
                avatarContainer.appendChild(judgeCountSpan);

                pEl.appendChild(avatarContainer);

                // Equipment names overlay
                const equipNamesEl = document.createElement('div');
                equipNamesEl.className = 'player-equip-names';
                avatarContainer.appendChild(equipNamesEl);

                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name';
                pEl.appendChild(nameSpan);
                
                // Container for stats
                const statsDiv = document.createElement('div');
                statsDiv.className = 'player-stats-row';
                
                const handResultSpan = document.createElement('span');
                handResultSpan.className = 'player-hand-count';
                statsDiv.appendChild(handResultSpan);

                const hpSpan = document.createElement('span');
                hpSpan.className = 'player-hp stat-hp';
                statsDiv.appendChild(hpSpan);

                const btnGroup = document.createElement('div');
                btnGroup.className = 'stats-btn-group';

                const summaryJudgeBtn = createSummaryButton('judge-detail-btn summary-judge-btn', '判');
                btnGroup.appendChild(summaryJudgeBtn);

                const summaryEquipBtn = createSummaryButton('equip-detail-btn summary-equip-btn', '備', 'Equipment');
                btnGroup.appendChild(summaryEquipBtn);

                statsDiv.appendChild(btnGroup);
                
                pEl.appendChild(statsDiv);
                
                pEl.classList.add('role-moving');
                
                if (targetContainer) targetContainer.appendChild(pEl);
            } else {
                if (targetContainer && pEl.parentElement !== targetContainer) {
                    pEl.classList.remove('role-moving');
                    targetContainer.appendChild(pEl);
                    
                    void pEl.offsetWidth;
                    pEl.classList.add('role-moving');
                }
            }
            
            setupHandInspector(pEl, role);
            pEl._role = role;
            
            // 当前回合标识
            const avatarWrap = pEl.querySelector('.char-avatar');
            if (avatarWrap) {
                const inTurn = window.Game.Core.isInTurn && window.Game.Core.isInTurn();
                const sandboxTurn = (GameState.mode === 'sandbox' && GameState.sandboxTurnIndex != null && GameState.sandboxTurnIndex >= 0);
                avatarWrap.classList.toggle('is-current-turn', (inTurn && index === GameState.currentPlayerIndex) || (sandboxTurn && index === GameState.sandboxTurnIndex));
                updateViewerLabels(avatarWrap, index);
            }
            
            // 头像
            const avatarImg = pEl.querySelector('.char-avatar img');
            updateAvatarImage(avatarImg, role);

            // 名字
            const nameSpan = pEl.querySelector('.player-name');
            const key = roleCharacterKey(role);
            const renderKey = role.characterId ? `char:${role.characterId}:${key}` : `char:default:${key}`;
            if (nameSpan.getAttribute('data-render-key') !== renderKey) {
                const newNameHtml = GameText.render('Character', { id: role.characterId, name: key });
                nameSpan.innerHTML = newNameHtml;
                nameSpan.setAttribute('data-render-key', renderKey);
                fitSummaryName(nameSpan);
            }
            
            // 判定区牌数
            const judgeCountSpan = pEl.querySelector('.player-judge-count');
            updateCountBadge(judgeCountSpan, role.judgeArea && role.judgeArea.cards ? role.judgeArea.cards.length : 0);

            // Stats Row Updates
            const statsDiv = pEl.querySelector('.player-stats-row') || pEl;

            let btnGroup = pEl.querySelector('.stats-btn-group');
            if (!btnGroup) {
                btnGroup = document.createElement('div');
                btnGroup.className = 'stats-btn-group';
                statsDiv.appendChild(btnGroup);
            }

            // Judge Button
            let summaryJudgeBtn = pEl.querySelector('.summary-judge-btn');
            if (!summaryJudgeBtn) {
                 summaryJudgeBtn = createSummaryButton('judge-detail-btn summary-judge-btn', '判');
            }
            if (summaryJudgeBtn.parentElement !== btnGroup) {
                const equipBtn = btnGroup.querySelector('.summary-equip-btn');
                btnGroup.insertBefore(summaryJudgeBtn, equipBtn || null);
            }
            setupJudgeButton(summaryJudgeBtn, role, GameText);
            
            // Equipment Button
            let summaryEquipBtn = pEl.querySelector('.summary-equip-btn');
            if (!summaryEquipBtn) {
                 summaryEquipBtn = createSummaryButton('equip-detail-btn summary-equip-btn', '備', 'Equipment');
                 btnGroup.appendChild(summaryEquipBtn);
            } else if (summaryEquipBtn.parentElement !== btnGroup) {
                btnGroup.appendChild(summaryEquipBtn);
            }
            setupEquipmentButton(summaryEquipBtn, role, GameText);

            // 血量
            const hpSpan = pEl.querySelector('.player-hp');
            const finalHpText = `${role.health}/${role.healthLimit}`;
            
            if (hpSpan.textContent !== finalHpText) {
                hpSpan.classList.remove('hp-changed');
                if (hpSpan.textContent.trim() !== '') {
                    void hpSpan.offsetWidth;
                    hpSpan.classList.add('hp-changed');
                }
                hpSpan.textContent = finalHpText;
            }

            // 手牌数
            const handCountSpan = pEl.querySelector('.player-hand-count');
            if (handCountSpan) {
                let count = 0;
                if (role.hand && role.hand.cards) {
                    count = role.hand.cards.length;
                }
                
                const handText = ` ${count}`;
                if (handCountSpan.textContent !== handText) {
                    handCountSpan.textContent = handText;
                    handCountSpan.style.opacity = '1';
                }
            }
            
            // 装备区卡牌名称
            const equipNamesEl = pEl.querySelector('.player-equip-names');
            renderEquipNames(equipNamesEl, role, GameText);

            // 右键菜单
            pEl.oncontextmenu = (e) => {
                e.preventDefault();
                if (window.Game.UI.showContextMenu) {
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, role);
                }
            };
        });
        
        // 清理移除的角色
        const allContainers = [containerLeft, containerTop, containerRight];
        allContainers.forEach(container => {
            if (!container) return;
            Array.from(container.children).forEach(child => {
                const id = parseInt(child.id.replace('player-summary-', ''));
                const playerExists = GameState.players.find(p => p.id === id);
                
                const perspIdx = (GameState.perspectiveIndex != null) ? GameState.perspectiveIndex : 0;
                const isMainNow = (GameState.players[perspIdx] && GameState.players[perspIdx].id === id);

                if (!playerExists || isMainNow) {
                    container.removeChild(child);
                }
            });
        });
    }

    // 导出
    window.Game.UI.renderRoleList = renderRoleList;
})();
