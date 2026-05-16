(function() {
    const { setupHandInspector, roleCharacterKey, updateAvatarImage, updateCountBadge, renderEquipNames, setupJudgeButton, setupEquipmentButton, updateViewerLabels, openJudgeViewer } = window.Game.UI._RoleUtils;

    /**
     * 渲染自身角色信息 (Self Role Info)
     * 对应主视角角色 (perspectiveIndex) (UI底部面板)
     */
    function updateSelfRoleInfo(GameState, GameText) {
        const perspIdx = (GameState.perspectiveIndex != null) ? GameState.perspectiveIndex : 0;
        const selfRole = GameState.players[perspIdx];
        if (!selfRole) return;

        // 标记主视角角色是否正处于当前回合（仅在流程真正进入 TurnProcess 时才算）
        const inTurn = window.Game.Core.isInTurn && window.Game.Core.isInTurn();
        // 沙盒模式：支持手动设置的当前回合角色
        const sandboxTurn = (GameState.mode === 'sandbox' && GameState.sandboxTurnIndex != null && GameState.sandboxTurnIndex >= 0);
        const isTurnOwner = (inTurn && perspIdx === GameState.currentPlayerIndex) || (sandboxTurn && perspIdx === GameState.sandboxTurnIndex);
        
        const currentPanel = document.querySelector('.current-character-panel');
        let isRoleChanged = false;
        
        if (currentPanel) {
            const oldId = currentPanel._roleId;
            if (oldId !== String(selfRole.id)) {
                isRoleChanged = true;
            }

            currentPanel._roleId = String(selfRole.id);
            currentPanel.setAttribute('data-inspector-type', 'role');
            currentPanel.setAttribute('data-role-id', selfRole.id);
            
            setupHandInspector(currentPanel, selfRole);
        }
        // 头像 (Avatar) - Main View
        const mainAvatarImg = document.getElementById('char-img');
        if (mainAvatarImg) {
            updateAvatarImage(mainAvatarImg, selfRole);
            const mainAvatarWrap = mainAvatarImg.closest('.char-avatar');
            if (mainAvatarWrap) {
                mainAvatarWrap.classList.toggle('is-current-turn', isTurnOwner);
                updateViewerLabels(mainAvatarWrap, perspIdx);
            }
        }
        // 名字 (角色/武将)
        const nameEl = document.getElementById('char-name');
        if (nameEl) {
               const key = roleCharacterKey(selfRole);

             const renderKey = selfRole.characterId ? `char:${selfRole.characterId}:${key}` : `char:default:${key}`;

             const html = GameText.render('Character', { id: selfRole.characterId, name: key });

             window.Game.UI.safeRender(nameEl, html, renderKey);
        }
        
        // 装备区入口绑定 (Equipment Button)
        const equipBtn = document.querySelector('.main-equip-btn');
        if (equipBtn) {
            setupEquipmentButton(equipBtn, selfRole, GameText);
        }
        
        // 判定区入口绑定 (Judge Button)
        const judgeBtn = document.querySelector('.main-judge-btn');
        if (judgeBtn) {
            setupJudgeButton(judgeBtn, selfRole, GameText);
        }

        // 血量 (Main View)
        const hpEl = document.getElementById('char-hp-display');
        if (hpEl) {
            const finalHpText = `${selfRole.health}/${selfRole.healthLimit}`;

            if (hpEl.textContent !== finalHpText) {
                hpEl.classList.remove('hp-changed');
                
                const isInitial = hpEl.textContent.trim() === '';
                if (!isRoleChanged && !isInitial) {
                    void hpEl.offsetWidth; 
                    hpEl.classList.add('hp-changed');
                }
                hpEl.textContent = finalHpText;
            }

            // Main View Judge Count
            const charImg = document.getElementById('char-img');
            if (charImg && charImg.parentElement && charImg.parentElement.classList.contains('char-avatar')) {
                let judgeCountEl = document.getElementById('char-judge-count');
                if (!judgeCountEl) {
                    judgeCountEl = document.createElement('span');
                    judgeCountEl.id = 'char-judge-count';
                    judgeCountEl.className = 'player-judge-count';
                    judgeCountEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const gs = window.Game.GameState;
                        if (!gs) return;
                        const pIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
                        const role = gs.players && gs.players[pIdx];
                        if (role) openJudgeViewer(role);
                    });
                    charImg.parentElement.appendChild(judgeCountEl);
                }

                updateCountBadge(judgeCountEl, selfRole.judgeArea && selfRole.judgeArea.cards ? selfRole.judgeArea.cards.length : 0);
            }

            // Main View Hand Count
            let handCountEl = document.getElementById('char-hand-count');
            if (!handCountEl) {
                handCountEl = document.createElement('span');
                handCountEl.id = 'char-hand-count';
                handCountEl.className = 'player-hand-count';
                if (hpEl.parentNode) {
                    hpEl.parentNode.insertBefore(handCountEl, hpEl);
                }
            } else {
                if (handCountEl.nextSibling !== hpEl) {
                     if (hpEl.parentNode) {
                        hpEl.parentNode.insertBefore(handCountEl, hpEl);
                     }
                }
                
                if (handCountEl.className !== 'player-hand-count') {
                    handCountEl.className = 'player-hand-count';
                }
            }

            let count = 0;
            if (selfRole.hand && selfRole.hand.cards) {
                count = selfRole.hand.cards.length;
            }

            const handText = ` ${count}`;
            if (handCountEl.textContent !== handText) {
                handCountEl.textContent = handText;
            }
        }
        
        // 上下文菜单绑定
        const charInfoPanel = document.querySelector('.character-info');
        if (charInfoPanel) {
            charInfoPanel.setAttribute('data-inspector-type', 'role');
            charInfoPanel.setAttribute('data-role-id', selfRole.id);
            charInfoPanel.oncontextmenu = (e) => {
                e.preventDefault();
                if (window.Game.UI.showContextMenu) {
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, selfRole);
                }
            };

            // 主视角装备区卡牌名称
            let mainEquipNames = charInfoPanel.querySelector('.player-equip-names');
            if (!mainEquipNames) {
                mainEquipNames = document.createElement('div');
                mainEquipNames.className = 'player-equip-names';
                charInfoPanel.appendChild(mainEquipNames);
            }
            if (selfRole.equipSlots) {
                renderEquipNames(mainEquipNames, selfRole, GameText);
            }
        }

        // 手牌
        if (selfRole.hand) {
            const el = document.getElementById('header-hand-area');
            if (el) {
                el.setAttribute('data-area-name', 'hand');
                el.setAttribute('data-inspector-type', 'area');

                const key = selfRole.hand.name || 'hand';
                const renderKey = `area:${key}`;
                
                window.Game.UI.safeRender(el, GameText.render(key), renderKey);
            }
            const handCards = selfRole.hand.cards ? selfRole.hand.cards : selfRole.hand;
            
            const container = document.getElementById('hand-cards-container');
            if (container) {
                container.setAttribute('data-inspector-type', 'area');
                container.setAttribute('data-area-name', 'hand');
                const isStacked = selfRole.hand.apartOrTogether === 1;
                const isCentered = selfRole.hand.centered === 1;
                
                if (isCentered) {
                    container.classList.add('area-centered');
                    container.classList.remove('area-left');
                } else {
                    container.classList.add('area-left');
                    container.classList.remove('area-centered');
                }
                
                if (isStacked) {
                     container.classList.add('area-stacked');
                     container.classList.remove('area-spread');
                } else { 
                     container.classList.add('area-spread');
                     container.classList.remove('area-stacked');
                }
            }

            if (window.Game.UI.renderCardList) {
                window.Game.UI.renderCardList('hand-cards-container', handCards, 'hand');
            }
        }
    }

    // 导出
    window.Game.UI.updateSelfRoleInfo = updateSelfRoleInfo;
})();
