(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 自动缩小 .player-name 字号，使其不会成为撑宽 .role-summary 的最宽元素。
     * - 先重置到 CSS 变量定义的基准字号
     * - 测量siblings（头像容器、stats行）的自然宽度
     * - 如果名字比最宽的sibling还宽，按比例缩小 font-size
     * - 最小不低于 8px，不省略文本
     * @param {HTMLElement} nameEl - .player-name 元素
     */
    function fitSummaryName(nameEl) {
        if (!nameEl) return;
        const summary = nameEl.closest('.role-summary');
        if (!summary) return;

        // 重置到 CSS 基准字号
        nameEl.style.fontSize = '';

        // 获取基准字号
        const baseFontSize = parseFloat(getComputedStyle(nameEl).fontSize);
        if (!baseFontSize || baseFontSize <= 0) return;

        // 测量 siblings 的宽度（排除 name 自身）
        let maxSiblingWidth = 0;
        for (const child of summary.children) {
            if (child === nameEl) continue;
            // 只看可见子元素
            if (child.offsetWidth > 0) {
                maxSiblingWidth = Math.max(maxSiblingWidth, child.scrollWidth);
            }
        }

        // 如果没有 sibling 或 sibling 宽度为 0，不处理
        if (maxSiblingWidth <= 0) return;

        // 测量名字的自然宽度
        const nameWidth = nameEl.scrollWidth;
        if (nameWidth <= maxSiblingWidth) return;  // 名字没超过，无需缩

        // 按比例缩小
        const MIN_FONT_SIZE = 8;
        let newSize = Math.max(MIN_FONT_SIZE, baseFontSize * (maxSiblingWidth / nameWidth));
        nameEl.style.fontSize = newSize + 'px';
    }

    /**
     * 设置手牌检视器 (Hand Inspector)
     * 类似 PileInspector，允许点击角色头像/摘要查看其手牌
     */
    function setupHandInspector(element, role) {
        if (!element || !role) return;

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
                    const perspIdx = (gs && gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
                    const isSelf = (gs && gs.players && gs.players[perspIdx] === currentRole);
                    if (!isManual && !isSelf) forceFaceDown = true;
                }

                const GameText = window.Game.UI.GameText;
                const titleSuffix = GameText.render(isJudge ? 'judgeArea' : 'hand');
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
                    ownerName: ownerNameHtml,
                    areaName: titleSuffix
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
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;
                startPress(e);
            });
            element.addEventListener('touchstart', (e) => {
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;
                startPress(e);
            }, {passive: true});

            element.addEventListener('mouseup', (e) => {
                cancelPress();
            });
            element.addEventListener('touchend', (e) => {
                cancelPress();
                if (isLongPress) return;
            });
            
            element.addEventListener('click', (e) => {
                if (e.target.closest('#btn-equip-detail') || e.target.closest('.equip-detail-btn')) return;

                if (isLongPress) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    isLongPress = false;
                    return;
                }
                
                if (window.Game && window.Game.UI && window.Game.UI.DragState && window.Game.UI.DragState.isDragging) return;
                e.stopPropagation();
                openHandInspector();
            });
            
            element.addEventListener('mouseleave', cancelPress);
            element.addEventListener('touchmove', cancelPress, { passive: true });
        }
    }

    /**
     * 解析头像图片路径的辅助函数
     */
    function resolveAvatarUrl(role) {
        return role.avatar || '';
    }

    function roleCharacterKey(role) {
        let key = role && role.character;
        if (Array.isArray(key) && key.length > 0) key = key[0];
        return key || (role && role.name) || '';
    }

    function updateAvatarImage(img, role) {
        if (!img) return;
        const avatarUrl = resolveAvatarUrl(role);
        if (!avatarUrl || img.getAttribute('src') === avatarUrl) return;
        img.src = avatarUrl;
        img.classList.toggle('position-avatar', avatarUrl.startsWith('source/'));
    }

    function updateCountBadge(el, count) {
        if (!el) return;
        if (count > 0) {
            el.style.display = 'flex';
            if (el.textContent !== String(count)) {
                el.classList.remove('count-changed');
                void el.offsetWidth;
                el.classList.add('count-changed');
                el.textContent = String(count);
            }
        } else {
            el.style.display = 'none';
        }
    }

    function renderEquipNames(container, role, GameText) {
        if (!container || !role || !role.equipSlots) return;
        const equipNames = role.equipSlots
            .map(slot => (slot.cards && slot.cards.length > 0) ? slot.cards[0].name : null)
            .filter(Boolean);
        const equipKey = equipNames.join(',');
        if (container.dataset.equipKey === equipKey) return;
        container.dataset.equipKey = equipKey;
        if (equipNames.length > 0) {
            const GT = GameText || window.Game.UI.GameText;
            container.innerHTML = equipNames.map(n => `<span class="equip-name-tag">${GT ? GT.render(n) : n}</span>`).join('');
            container.style.display = '';
        } else {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    /**
     * 打开判定区查看器（共用逻辑，供 setupJudgeButton / judge badge 等复用）
     */
    function openJudgeViewer(role) {
        if (!role || !role.judgeArea) return;
        const GT = window.Game.UI.GameText;
        const titleSuffix = GT ? GT.render('judgeArea') : 'Judge Area';
        const title = `${role.name} ${titleSuffix}`;
        const sourceId = `role-judge:${role.id}`;
        const cards = role.judgeArea.cards || [];

        const charNameKey = roleCharacterKey(role);

        let ownerNameHtml = charNameKey;
        if (GT) {
            ownerNameHtml = GT.render('Character', { id: role.characterId, name: charNameKey });
        }

        const openOptions = { 
            forceFaceDown: false,
            ownerName: ownerNameHtml,
            areaName: titleSuffix
        };

        if (window.Game.UI.toggleCardViewer) {
            window.Game.UI.toggleCardViewer(title, cards, sourceId, openOptions);
        } else if (window.Game.UI.openCardViewer) {
            window.Game.UI.openCardViewer(title, cards, sourceId, openOptions);
        }
    }

    /**
     * Binds click event to a judge button to open the judge area viewer
     */
    function setupJudgeButton(btn, role, GameText) {
        if (!btn || !role) return;
        btn.onclick = (e) => {
            e.stopPropagation();
            openJudgeViewer(role);
        };
    }

    /**
     * Binds click event to an equipment button to open the equipment viewer
     */
    function setupEquipmentButton(btn, role, GameText) {
        if (!btn || !role) return;

        btn.onclick = (e) => {
             e.stopPropagation();
             
             if (window.Game.UI.openCardViewer) {
                 const viewerSourceId = `role:${role.id}:equip`;
                 const existing = window.Game.UI.viewers && window.Game.UI.viewers[viewerSourceId];
                 
                 if (existing) {
                     existing.cleanup();
                     return;
                 }

                 let equipData = [];
                 if (role.equipSlots) {
                     equipData = role.equipSlots.map(slot => slot.cards || []);
                 } else {
                     equipData = [[], [], [], []]; 
                 }
                 
                 const charNameKey = roleCharacterKey(role);
                 const GT = GameText || window.Game.UI.GameText;
                 const ownerNameHtml = GT.render('Character', { id: role.characterId, name: charNameKey });

                 const slotsDef = [
                     { index: 0, label: GT.render('weaponSlot') },
                     { index: 1, label: GT.render('armorSlot') },
                     { index: 2, label: GT.render('defensiveSlot') },
                     { index: 3, label: GT.render('offensiveSlot') }
                 ];

                 window.Game.UI.openCardViewer(null, equipData, viewerSourceId, {
                     ownerName: ownerNameHtml,
                     areaName: GT.render('equipArea'),
                     slots: slotsDef
                 });
             }
        };
    }

    /**
     * 更新角色头像上方的在线用户名标签
     */
    function updateViewerLabels(avatarContainer, playerIndex) {
        if (!avatarContainer) return;

        const syncTopRowReserve = () => {
            const topRow = avatarContainer.closest && avatarContainer.closest('#role-list-top');
            if (!topRow) return;
            topRow.classList.toggle('has-online-viewers', !!topRow.querySelector('.online-viewer-labels'));
        };
        
        const gs = window.Game.GameState;
        if (!gs || !gs.onlineMode) {
            const existing = avatarContainer.querySelector('.online-viewer-labels');
            if (existing) existing.remove();
            syncTopRowReserve();
            return;
        }
        
        const SyncManager = window.Game.Online && window.Game.Online.SyncManager;
        const viewers = SyncManager ? SyncManager.getViewersForPlayer(playerIndex) : [];

        let container = avatarContainer.querySelector('.online-viewer-labels');

        if (viewers.length === 0) {
            if (container) container.remove();
            syncTopRowReserve();
            return;
        }

        if (!container) {
            container = document.createElement('div');
            container.className = 'online-viewer-labels';
            avatarContainer.appendChild(container);
        }

        const key = viewers.map(v => `${v.username}:${v.spectating ? 's' : 'p'}`).join('|');
        if (container.dataset.viewerKey !== key) {
            container.dataset.viewerKey = key;
            container.innerHTML = viewers.map(v =>
                `<span class="online-viewer-label${v.spectating ? ' is-spectator' : ''}">${v.username}</span>`
            ).join('');
        }
        syncTopRowReserve();
    }

    // Expose utilities for sibling renderer files
    window.Game.UI._RoleUtils = {
        fitSummaryName,
        setupHandInspector,
        resolveAvatarUrl,
        roleCharacterKey,
        updateAvatarImage,
        updateCountBadge,
        renderEquipNames,
        setupJudgeButton,
        setupEquipmentButton,
        updateViewerLabels,
        openJudgeViewer
    };

    // 窗口尺寸变化时重新适配所有摘要角色名
    let _fitResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(_fitResizeTimer);
        _fitResizeTimer = setTimeout(() => {
            document.querySelectorAll('.role-summary .player-name').forEach(fitSummaryName);
        }, 150);
    });
})();
