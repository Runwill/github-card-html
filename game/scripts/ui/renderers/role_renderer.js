(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 设置手牌检视器 (Hand Inspector)
     * 类似 PileInspector，允许点击角色头像/摘要查看其手牌
     */
    function setupHandInspector(element, role) {
        if (!element || !role) return;

        // Cleanup legacy if any
        // ...

        // update data
        element._inspectorRole = role;

        if (!element.hasAttribute('data-hand-inspector-bound')) {
            element.setAttribute('data-hand-inspector-bound', 'true');
            element.style.cursor = 'pointer';

            // Long Press Logic using simple timeout
            let pressTimer = null;
            let isLongPress = false;
            
            const startPress = (e) => {
                 // Check valid left click & no drag
                 if (e.button !== 0) return;
                 if (window.Game && window.Game.UI && window.Game.UI.DragState && window.Game.UI.DragState.isDragging) return;
                 
                 isLongPress = false;
                 pressTimer = setTimeout(() => {
                     isLongPress = true;
                     openJudgeInspector();
                 }, 400); // 400ms for long press
            };
            
            const cancelPress = () => {
                 if (pressTimer) clearTimeout(pressTimer);
                 pressTimer = null;
            };

            const openAreaInspector = (areaType) => {
                const currentRole = element._inspectorRole;
                if (!currentRole) return;

                const isJudge = (areaType === 'judge');
                const areaKey = isJudge ? 'judgeArea' : 'hand';
                
                if (!currentRole[areaKey]) return;

                // Visibility Details
                let forceFaceDown = false;
                if (!isJudge) {
                    const gs = window.Game.GameState;
                    const isManual = (gs && (gs.mode === 'manual' || gs.mode === 'sandbox'));
                    const isSelf = (gs && gs.players && gs.players[gs.currentPlayerIndex] === currentRole);
                    if (!isManual && !isSelf) forceFaceDown = true;
                }

                const GameText = window.Game.UI.GameText;
                const titleSuffix = GameText.render(isJudge ? 'judgeArea' : 'hand');
                // Use plain text for window title if needed, or allow HTML if the window title supports it. 
                // Usually window title is plain text for browser windows, but here it's an overlay.
                // But let's keep the `title` variable loosely capable of string ops.
                // Actually, `toggleCardViewer` uses `title` for the modal header if provided?
                // The current implementation of `openCardViewer` doesn't seem to use `title` for rendering a header inside the modal body,
                // but maybe it's used elsewhere or future proofing.
                // Let's keep `title` simply constructed for now, or use the area name.
                const title = `${currentRole.name} ${titleSuffix}`;
                
                const prefix = isJudge ? 'role-judge:' : 'role:';
                const sourceId = `${prefix}${currentRole.id}`;
                
                const cards = currentRole[areaKey].cards || [];

                // 优先使用 character 字段 (武将名)，回退使用 role.name
                let charNameKey = currentRole.character;
                if (Array.isArray(charNameKey) && charNameKey.length > 0) charNameKey = charNameKey[0];
                if (!charNameKey) charNameKey = currentRole.name;

                // 使用 GameText 渲染 Character (武将) HTML
                let ownerNameHtml = charNameKey;
                if (GameText) {
                    ownerNameHtml = GameText.render('Character', { id: currentRole.characterId, name: charNameKey });
                }

                const openOptions = { 
                    forceFaceDown,
                    ownerName: ownerNameHtml, // HTML string with <characterName> tag
                    areaName: titleSuffix        // HTML string from GameText
                };

                if (window.Game.UI.toggleCardViewer) {
                    window.Game.UI.toggleCardViewer(title, cards, sourceId, openOptions);
                } else if (window.Game.UI.openCardViewer) {
                    window.Game.UI.openCardViewer(title, cards, sourceId, openOptions);
                }
            };

            // Aliases for Event Handlers
            const openJudgeInspector = () => openAreaInspector('judge');
            const openHandInspector = () => openAreaInspector('hand');
            
            // Events
            element.addEventListener('mousedown', (e) => {
                // Ignore clicks on equipment button to prevent double opening
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;
                startPress(e);
            });
            element.addEventListener('touchstart', (e) => {
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;
                startPress(e);
            }, {passive: true});

            element.addEventListener('mouseup', (e) => {
                cancelPress();
                // We do NOT handle Short Click here anymore to avoid double-trigger with 'click' event.
                // 'click' event will fire naturally after mouseup if it was a short press.
            });
            element.addEventListener('touchend', (e) => {
                cancelPress();
                if (isLongPress) return;
                 // Touch equivalence for click
                 // Note: 'click' event usually fires after touchend, so we might need to prevent double trigger
                 // But for simplicity, let's rely on 'click' unless we want pure touch handling.
                 // Actually, mixed mouse/touch logic can be tricky.
                 // Let's stick to mouseup for desktop and use click for everything if simpler, 
                 // but long press requires separating down/up.
                 
                 // If we use 'click' listener for short press, we can just block it if isLongPress was true?
            });
            
            // Fallback: If original logic was just 'click', we replace it.
            // But we need to be careful not to break standard Click behavior (e.g. accessibility).
            
            // Robust Implementation:
            // 1. mousedown/touchstart starts timer.
            // 2. mouseup/touchend clears timer.
            // 3. 'click' listener handles Short Press (Hand).
            //    BUT we need to prevent 'click' if Long Press occurred.
            
            element.addEventListener('click', (e) => {
                // Ignore clicks on equipment button
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;

                // If long press triggered, consume this click
                if (isLongPress) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    isLongPress = false; // Reset
                    return;
                }
                
                // Normal Click -> Open Hand
                if (window.Game && window.Game.UI && window.Game.UI.DragState && window.Game.UI.DragState.isDragging) return;
                e.stopPropagation();
                openHandInspector();
            });
            
            // Cancel on move/drag
            element.addEventListener('mousemove', () => { /* Optional movement threshold check? Simplify for now */ });
            element.addEventListener('mouseleave', cancelPress);
            element.addEventListener('touchmove', cancelPress, { passive: true });
        }
    }

    /**
     * 解析头像图片路径的辅助函数
     * @deprecated 具体的路径推导逻辑已移至 Game.Models.Player 类中。
     * 这里仅保留作为简单的访问器。
     */
    function resolveAvatarUrl(role) {
        // 模型层（Player Class）现在负责确保 avatar 属性总是存在的
        return role.avatar || '';
    }

    /**
     * Binds click event to a judge button to open the judge area viewer
     */
    function setupJudgeButton(btn, role, GameText) {
        if (!btn || !role) return;
        
        btn.onclick = (e) => {
            e.stopPropagation();

            const areaKey = 'judgeArea';
            // Even if empty, we might want to show it? Assuming logic similar to others.
            // But usually we check if area exists.
            if (!role[areaKey]) return;

            const GT = GameText || window.Game.UI.GameText;
            const titleSuffix = GT ? GT.render('judgeArea') : 'Judge Area';
            const title = `${role.name} ${titleSuffix}`;
            const prefix = 'role-judge:';
            const sourceId = `${prefix}${role.id}`;
            const cards = role[areaKey].cards || [];

            // Resolve Name
            let charNameKey = role.character;
            if (Array.isArray(charNameKey) && charNameKey.length > 0) charNameKey = charNameKey[0];
            if (!charNameKey) charNameKey = role.name;

            let ownerNameHtml = charNameKey;
            if (GT) {
                ownerNameHtml = GT.render('Character', { id: role.characterId, name: charNameKey });
            }

            const openOptions = { 
                forceFaceDown: false, // Judge area is public
                ownerName: ownerNameHtml,
                areaName: titleSuffix
            };

            if (window.Game.UI.toggleCardViewer) {
                window.Game.UI.toggleCardViewer(title, cards, sourceId, openOptions);
            } else if (window.Game.UI.openCardViewer) {
                window.Game.UI.openCardViewer(title, cards, sourceId, openOptions);
            }
        };
    }

    /**
     * Binds click event to an equipment button to open the equipment viewer
     */
    function setupEquipmentButton(btn, role, GameText) {
        if (!btn || !role) return;

        btn.onclick = (e) => {
             e.stopPropagation(); // Prevent triggering parent click (Hand Inspector)
             
             if (window.Game.UI.createEquipmentViewer) {
                 // Check if already open to Toggle Closed
                 const existing = window.Game.UI.viewers && window.Game.UI.viewers['equipArea'];
                 
                 // Toggle Logic: If exists and belongs to THIS role, close and do nothing else.
                 if (existing) {
                     // We need to match the owner. 
                     // Note: createEquipmentViewer returns the DOM el, not the viewer object.
                     // The viewer object is in window.Game.UI.viewers['equipArea'].
                     // We must ensure we tagged the viewer object correctly last time.
                     if (existing._ownerId === role.id) {
                         existing.cleanup();
                         return;
                     }
                 }

                 // Pass equipArea data (assuming standard Models structure)
                 // NEW LOGIC: Use `equipSlots` if available for precise positioning
                 let equipData = [];
                 if (role.equipSlots) {
                     // Map slots to full arrays [ [Card], [Card,Card], [], [Card] ]
                     equipData = role.equipSlots.map(slot => slot.cards || []);
                 } else {
                     // Fallback
                     equipData = role.equipArea ? role.equipArea.cards : [];
                 }
                 
                 // Helper: Resolve Rich HTML Name
                 const charNameKey = role.character || role.name;
                 // GameText might need to be retrieved from window if not passed, but we pass it or fallback
                 const GT = GameText || window.Game.UI.GameText;
                 const ownerNameHtml = GT.render('Character', { id: role.characterId, name: charNameKey });

                 // Use a distinct sourceId for this role's equipment area
                 // Format: role:{id}:equip
                 const viewerSourceId = `role:${role.id}:equip`;

                 // Create (this internally closes any existing viewers)
                 window.Game.UI.createEquipmentViewer(viewerSourceId, equipData, {
                     ownerName: ownerNameHtml,
                     areaName: 'Equipment' 
                 });
                 
                 // Tag the NEW control object in the registry
                 const newViewer = window.Game.UI.viewers[viewerSourceId];
                 if (newViewer) newViewer._ownerId = role.id; 
             }
        };
    }

    /**
     * 渲染自身角色信息 (Self Role Info)
     * 对应用户操作的当前角色 (UI底部面板)
     */
    function updateSelfRoleInfo(GameState, GameText) {
        
        const selfRole = GameState.players[GameState.currentPlayerIndex];
        if (!selfRole) return;
        
        // 绑定自身面板的 Inspector
        const currentPanel = document.querySelector('.current-character-panel');
        let isRoleChanged = false;
        
        if (currentPanel) {
            const oldId = currentPanel.getAttribute('data-role-id');
            // Check if ID changed
            if (oldId !== String(selfRole.id)) {
                isRoleChanged = true;
            }

            if (!currentPanel.hasAttribute('data-inspector-type')) {
                currentPanel.setAttribute('data-inspector-type', 'role');
            }
             // Ensure ID is correct
            currentPanel.setAttribute('data-role-id', selfRole.id);
            
            // Attach Hand Inspector Click
            setupHandInspector(currentPanel, selfRole);
        }
        // 头像 (Avatar) - Main View
        const mainAvatarImg = document.getElementById('char-img');
        if (mainAvatarImg) {
            const avatarUrl = resolveAvatarUrl(selfRole);
            // Only update if changed and valid
            if (avatarUrl && mainAvatarImg.getAttribute('src') !== avatarUrl) {
                mainAvatarImg.src = avatarUrl;
                // Mark as position symbol if from source/
                if (avatarUrl.startsWith('source/')) {
                    mainAvatarImg.classList.add('position-avatar');
                } else {
                    mainAvatarImg.classList.remove('position-avatar');
                }
            }
        }
        // 名字 (角色/武将)
        const nameEl = document.getElementById('char-name');
        if (nameEl) {
             // 优先使用 character 字段 (武将名)，回退使用 role.name
             let key = selfRole.character;
             if (Array.isArray(key) && key.length > 0) key = key[0];
             if (!key) key = selfRole.name;

             // 使用 GameText 渲染 Character (武将)
             // 构造一个唯一标识，用于检查数据是否真正改变
             const renderKey = selfRole.characterId ? `char:${selfRole.characterId}:${key}` : `char:default:${key}`;

             const html = GameText.render('Character', { id: selfRole.characterId, name: key });

             // 使用 GameText.UI.safeRender 替代手动脏检查，更健壮
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
             // Main View Seat Number
             // Insert before HP if not exists
             let seatEl = document.getElementById('char-seat-display');
             if (!seatEl) {
                 seatEl = document.createElement('span');
                 seatEl.id = 'char-seat-display';
                 seatEl.className = 'player-seat'; // Reuse utility class
                 if (hpEl.parentNode) {
                     hpEl.parentNode.insertBefore(seatEl, hpEl);
                 }
             }

             // Seat Temporarily Hidden
             const realIndex = GameState.players.findIndex(p => p.id === selfRole.id);
             // const seatText = `${realIndex >= 0 ? realIndex + 1 : '?'}`;
             /*
             if (seatEl.textContent !== seatText) {
                 seatEl.textContent = seatText;
             }
             */
             // Ensure hidden
             if (seatEl) seatEl.style.display = 'none';

             // Ensure correct style if class was different
             if (seatEl.className !== 'player-seat') seatEl.className = 'player-seat';
            
            const finalHpText = `${selfRole.health}/${selfRole.healthLimit}`;

            if (hpEl.textContent !== finalHpText) {
                hpEl.classList.remove('hp-changed');
                
                // Only animate if NOT a role switch AND not empty initial state
                const isInitial = hpEl.textContent.trim() === '';
                if (!isRoleChanged && !isInitial) {
                    void hpEl.offsetWidth; 
                    hpEl.classList.add('hp-changed');
                }
                hpEl.textContent = finalHpText;
            }

            // Main View Judge Count (New Feature)
            // Displayed on the corner of the avatar
            // We append it to .char-avatar container which holds #char-img
            const charImg = document.getElementById('char-img');
            if (charImg && charImg.parentElement && charImg.parentElement.classList.contains('char-avatar')) {
                let judgeCountEl = document.getElementById('char-judge-count');
                if (!judgeCountEl) {
                    judgeCountEl = document.createElement('span');
                    judgeCountEl.id = 'char-judge-count';
                    judgeCountEl.className = 'player-judge-count';
                    charImg.parentElement.appendChild(judgeCountEl);
                }

                // Calculate Judge Count
                let jCount = 0;
                if (selfRole.judgeArea && selfRole.judgeArea.cards) {
                    jCount = selfRole.judgeArea.cards.length;
                }

                if (jCount > 0) {
                    judgeCountEl.style.display = 'flex';
                    if (judgeCountEl.textContent !== String(jCount)) {
                        // Animation for value change
                        judgeCountEl.classList.remove('count-changed');
                        void judgeCountEl.offsetWidth; // Force Reflow
                        judgeCountEl.classList.add('count-changed');
                        
                        judgeCountEl.textContent = String(jCount);
                    }
                } else {
                    judgeCountEl.style.display = 'none';
                }
            }

            // Main View Hand Count
            // Check if element exists, create if not
            let handCountEl = document.getElementById('char-hand-count');
            if (!handCountEl) {
                handCountEl = document.createElement('span');
                handCountEl.id = 'char-hand-count';
                handCountEl.className = 'player-hand-count'; // Reuse utility class
                // Insert BEFORE hpEl (and after seatEl if exists)
                if (hpEl.parentNode) {
                    hpEl.parentNode.insertBefore(handCountEl, hpEl);
                }
            } else {
                // Check order in DOM if needed, but usually creation only happens once.
                // If reuse, ensure it is before header
                if (handCountEl.nextSibling !== hpEl) {
                     if (hpEl.parentNode) {
                        hpEl.parentNode.insertBefore(handCountEl, hpEl);
                     }
                }
                
                // Update class if needed to match summary style
                if (handCountEl.className !== 'player-hand-count') {
                    handCountEl.className = 'player-hand-count';
                }
            }

            // Calc count
            // 模型层保证 hand 是 Area 实例，cards 是数组
            let count = 0;
            if (selfRole.hand && selfRole.hand.cards) {
                count = selfRole.hand.cards.length;
            }

            const handText = ` ${count}`; // format: space + count
            if (handCountEl.textContent !== handText) {
                handCountEl.textContent = handText;
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
                
                window.Game.UI.safeRender(el, GameText.render(key), renderKey);
            }
            // 渲染卡牌
            const handCards = selfRole.hand.cards ? selfRole.hand.cards : selfRole.hand;
            
            // 应用布局样式
            const container = document.getElementById('hand-cards-container');
            if (container) {
                // 读取配置，如果 selfRole.hand 是 Area 对象则读取其属性，否则使用默认值
                // Hand 默认：spread(0), left(0) [Area.Configs.Hand 定义]
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
                
                // Drop Zone Config (Trigger Mode)
                pEl.setAttribute('data-drop-zone', `role:${role.id}`); 
                pEl.setAttribute('data-accept-placeholder', 'false'); // Do not accept physical card insertion

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
                    // Restore original zone if needed (optional: reset immediately on leave? 
                    // or keep it until drop? usually reset on leave is safer for UI consistency)
                    if (pEl.getAttribute('data-drop-zone') === judgeZoneId) {
                         pEl.setAttribute('data-drop-zone', originalZoneId);
                         pEl.classList.remove('judge-area-active'); // Optional visual class
                         // Restore tooltip or name if changed
                         const nameEl = pEl.querySelector('.player-name');
                         if (nameEl && nameEl._origName) {
                             nameEl.innerText = nameEl._origName;
                             delete nameEl._origName;
                         }
                    }
                };

                // Native Drag Events (if using native D&D)
                // Note: The custom interactions.js might use mousemove/touchmove simulating drag.
                // We'll try native events first as they often bubble up from `interactions.js` logic or work in parallel.
                // If the system uses custom pointer events for drag, we might need to attach to those or rely on CSS :hover state detection in JS loop.
                // Assuming standard DOM events for now or that interactions.js fires them.
                
                // Workaround: interactions.js likely uses pointer events and `elementFromPoint`.
                // It might NOT fire native `dragenter`.
                // However, let's try standard mouse events which might still fire if pointer-events aren't none on drag object (they often are none).
                
                // Let's bind 'mouseenter' and check global DragState
                pEl.addEventListener('mouseenter', () => {
                    const dragState = window.Game.UI.DragState; // Assuming typical location
                    if (!dragState || !dragState.isDragging) return;

                    clearHoverTimer();
                    dragHoverTimer = setTimeout(() => {
                        // Switch to Judge Area
                        pEl.setAttribute('data-drop-zone', judgeZoneId);
                        pEl.classList.add('judge-area-active');
                        
                        // Visual Feedback: Temporarily change name
                        const nameEl = pEl.querySelector('.player-name');
                        if (nameEl) {
                            nameEl._origName = nameEl.innerText;
                            nameEl.innerText = "判定区";
                        }
                    }, 400); // 400ms hover
                });

                pEl.addEventListener('mouseleave', clearHoverTimer);
                pEl.addEventListener('mouseup', clearHoverTimer); // Drop happens on mouseup
                
                // -----------------------------------------------------------------
                
                // Avatar
                // Use .char-avatar container to reuse Main View styles from game.css
                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'char-avatar role-list-avatar'; // role-list-avatar for size override
                
                const avatarImg = document.createElement('img');
                // Removed .player-avatar class to avoid style conflicts, relying on .char-avatar img
                avatarImg.src = ''; 
                
                avatarContainer.appendChild(avatarImg);
                
                // Add Judge Count Badge to Avatar Container (Corner)
                const judgeCountSpan = document.createElement('span');
                judgeCountSpan.className = 'player-judge-count';
                judgeCountSpan.style.display = 'none'; // Default hidden
                avatarContainer.appendChild(judgeCountSpan);

                pEl.appendChild(avatarContainer);

                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name';
                pEl.appendChild(nameSpan);
                
                // Container for stats (Seat, HP, Hand) to keep them inline
                const statsDiv = document.createElement('div');
                statsDiv.className = 'player-stats-row';
                
                // Seat / Index
                const seatSpan = document.createElement('span');
                seatSpan.className = 'player-seat';
                statsDiv.appendChild(seatSpan);

                // Hand Count (Now before HP)
                const handResultSpan = document.createElement('span');
                handResultSpan.className = 'player-hand-count';
                statsDiv.appendChild(handResultSpan);

                // HP
                const hpSpan = document.createElement('span');
                hpSpan.className = 'player-hp stat-hp';
                statsDiv.appendChild(hpSpan);

                // Equipment Button (Summary View) - Hidden by default, shown on hover
                const summaryEquipBtn = document.createElement('button');
                summaryEquipBtn.className = 'equip-detail-btn summary-equip-btn';
                summaryEquipBtn.title = 'Equipment';
                summaryEquipBtn.innerText = '備'; 
                // Style adjustment for summary context if needed is done via CSS
                statsDiv.appendChild(summaryEquipBtn);
                
                pEl.appendChild(statsDiv);
                
                // Add animation class for new elements (e.g. moving from Main View to Role View)
                pEl.classList.add('role-moving');
                
                if (targetContainer) targetContainer.appendChild(pEl);
            } else {
                // Ensure it is in the correct container (in case players added dynamically or re-sorted)
                if (targetContainer && pEl.parentElement !== targetContainer) {
                    pEl.classList.remove('role-moving');
                    targetContainer.appendChild(pEl);
                    
                    // Trigger reflow to play animation
                    void pEl.offsetWidth;
                    pEl.classList.add('role-moving');
                }
            }
            
            // Attach Hand Inspector Click (Updates data reference)
            setupHandInspector(pEl, role);
            
            // 激活状态 (当前回合角色)
            
            // 激活状态 (当前回合角色)
            if (index === GameState.currentPlayerIndex) {
                pEl.classList.add('active');
            } else {
                pEl.classList.remove('active');
            }
            
            // 头像 (Avatar)
            const avatarImg = pEl.querySelector('.char-avatar img');
            if (avatarImg) {
                const avatarUrl = resolveAvatarUrl(role);
                
                if (avatarUrl && avatarImg.getAttribute('src') !== avatarUrl) {
                    avatarImg.src = avatarUrl;
                    // Mark as position symbol if from source/
                    if (avatarUrl.startsWith('source/')) {
                        avatarImg.classList.add('position-avatar');
                    } else {
                        avatarImg.classList.remove('position-avatar');
                    }
                }
            }

            // 名字 (角色/武将)
            const nameSpan = pEl.querySelector('.player-name');
            // ... (name update logic) ...
            let key = role.character;
            if (Array.isArray(key) && key.length > 0) key = key[0];
            if (!key) key = role.name;
            const renderKey = role.characterId ? `char:${role.characterId}:${key}` : `char:default:${key}`;
            if (nameSpan.getAttribute('data-render-key') !== renderKey) {
                const newNameHtml = GameText.render('Character', { id: role.characterId, name: key });
                nameSpan.innerHTML = newNameHtml;
                nameSpan.setAttribute('data-render-key', renderKey);
            }
            
            // 判定区牌数 (Judge Count) - 右上角角标
            const judgeCountSpan = pEl.querySelector('.player-judge-count');
            if (judgeCountSpan) {
                let jCount = 0;
                if (role.judgeArea && role.judgeArea.cards) {
                    jCount = role.judgeArea.cards.length;
                }
                
                if (jCount > 0) {
                    judgeCountSpan.style.display = 'flex';
                    if (judgeCountSpan.textContent !== String(jCount)) {
                        // Animation for value change
                        judgeCountSpan.classList.remove('count-changed');
                        void judgeCountSpan.offsetWidth; // Force Reflow
                        judgeCountSpan.classList.add('count-changed');
                        
                        judgeCountSpan.textContent = String(jCount);
                    }
                } else {
                    judgeCountSpan.style.display = 'none';
                }
            }

            // Stats Row Updates
            const statsDiv = pEl.querySelector('.player-stats-row') || pEl;

            // Ensure Wrapper Group exists
            let btnGroup = pEl.querySelector('.stats-btn-group');
            if (!btnGroup) {
                btnGroup = document.createElement('div');
                btnGroup.className = 'stats-btn-group';
                statsDiv.appendChild(btnGroup);
            }

            // Bind Judge Button
            let summaryJudgeBtn = pEl.querySelector('.summary-judge-btn');
            if (!summaryJudgeBtn) {
                 summaryJudgeBtn = document.createElement('button');
                 summaryJudgeBtn.className = 'judge-detail-btn summary-judge-btn';
                 summaryJudgeBtn.innerText = '判';
                 // Insert Logic for ordering is simplified if we just append to group
                 // But if we want specific order [Judge] [Equip]
                 const equipBtn = btnGroup.querySelector('.summary-equip-btn');
                 if (equipBtn) {
                     btnGroup.insertBefore(summaryJudgeBtn, equipBtn);
                 } else {
                     btnGroup.appendChild(summaryJudgeBtn);
                 }
            } else {
                // Determine if it needs moving to wrapper (Upgrade from old layout)
                if (summaryJudgeBtn.parentElement !== btnGroup) {
                    btnGroup.appendChild(summaryJudgeBtn);
                }
            }
            setupJudgeButton(summaryJudgeBtn, role, GameText);
            
            // Bind Equipment Button (Ensure it exists for legacy elements or updates)
            let summaryEquipBtn = pEl.querySelector('.summary-equip-btn');
            if (!summaryEquipBtn) {
                 summaryEquipBtn = document.createElement('button');
                 summaryEquipBtn.className = 'equip-detail-btn summary-equip-btn';
                 summaryEquipBtn.innerText = '備';
                 btnGroup.appendChild(summaryEquipBtn);
            } else {
                // Ensure in wrapper
                if (summaryEquipBtn.parentElement !== btnGroup) {
                    btnGroup.appendChild(summaryEquipBtn);
                }
            }
            setupEquipmentButton(summaryEquipBtn, role, GameText);

            // 座次 (Seat)
            const seatSpan = pEl.querySelector('.player-seat');
            /* Seat Temporarily Hidden
            // Display valid index (0-based or 1-based?). Usually 1-based for UI.
            // Using the current 'index' from forEach which is the absolute player index.
            const seatText = `${index + 1}`; 
            if (seatSpan && seatSpan.textContent !== seatText) {
                seatSpan.textContent = seatText;
                seatSpan.style.display = 'none'; // Ensure hidden
            }
            */
           if (seatSpan) seatSpan.style.display = 'none';

            // 血量
            const hpSpan = pEl.querySelector('.player-hp');
            const finalHpText = `${role.health}/${role.healthLimit}`;
            
            if (hpSpan.textContent !== finalHpText) {
                // ... hp logic ...
                hpSpan.classList.remove('hp-changed');
                if (hpSpan.textContent.trim() !== '') {
                    void hpSpan.offsetWidth;
                    hpSpan.classList.add('hp-changed');
                }
                hpSpan.textContent = finalHpText;
            }

            // 手牌数 (Hand Count) - 去掉图标
            const handCountSpan = pEl.querySelector('.player-hand-count');
            if (handCountSpan) {
                // 模型层保证 hand 是 Area 实例，cards 是数组
                let count = 0;
                if (role.hand && role.hand.cards) {
                    count = role.hand.cards.length;
                }
                
                // 仅显示数字，根据需求 "写在体力值之后"
                // 格式: space + count
                const handText = ` ${count}`;
                if (handCountSpan.textContent !== handText) {
                    handCountSpan.textContent = handText;
                    // Remove dynamic opacity, keep style consistent
                    handCountSpan.style.opacity = '1';
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








