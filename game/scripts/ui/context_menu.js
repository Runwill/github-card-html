(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 上下文菜单逻辑
    let contextMenuEl = null;

    function createContextMenu() {
        if (contextMenuEl) return contextMenuEl;
        
        contextMenuEl = document.createElement('div');
        contextMenuEl.className = 'custom-context-menu';
        document.body.appendChild(contextMenuEl);
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (e.target.closest('.custom-context-menu')) return;
            contextMenuEl.classList.remove('visible');
        }, true);
        
        return contextMenuEl;
    }

    /**
     * 通用菜单渲染器
     * @param {number} x 
     * @param {number} y 
     * @param {string} title 
     * @param {Array<{label: string, action: Function}>} actions 
     */
    function renderMenu(x, y, title, actions) {
        const menu = createContextMenu();
        menu.innerHTML = ''; // 清除之前的内容
        
        // 标题
        const header = document.createElement('div');
        header.className = 'context-menu-header';
        header.textContent = title;
        menu.appendChild(header);

        // 动作列表
        actions.forEach(item => {
            // 分隔线
            if (!item.action && item.label && item.label.startsWith('───')) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
                return;
            }

            const el = document.createElement('div');
            el.className = 'context-menu-item';
            el.textContent = item.label;
            el.onclick = (e) => {
                e.stopPropagation(); // 防止文档点击立即关闭
                if (item.action) item.action();
                menu.classList.remove('visible');
            };
            menu.appendChild(el);
        });

        // 定位并显示
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('visible');
        
        // 边界检查
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }

    function showContextMenu(x, y, player) {
        let actions = [];
        const isSandbox = window.Game.GameState && window.Game.GameState.mode === 'sandbox';

        // ── 视角 / 回合角色（始终可用）──
        const gs = window.Game.GameState;
        if (gs && gs.players) {
            const playerIdx = gs.players.indexOf(player);
            const isCurrentPerspective = (playerIdx === gs.perspectiveIndex);
            if (playerIdx !== -1 && !isCurrentPerspective) {
                actions.push({
                    label: '👁 切换视角到此角色',
                    action: () => {
                        if (window.Game.UI.setPerspective) {
                            window.Game.UI.setPerspective(playerIdx);
                        }
                    }
                });
            }

            // ── 沙盒模式：设为/取消当前回合角色（紧跟视角切换）──
            if (isSandbox && playerIdx !== -1) {
                const isSandboxTurn = (gs.sandboxTurnIndex === playerIdx);
                if (!isSandboxTurn) {
                    actions.push({
                        label: '设为当前回合角色',
                        action: () => {
                            gs.sandboxTurnIndex = playerIdx;
                            document.documentElement.style.setProperty('--turn-ring-color', '#48bb78');
                            // 广播到其他客戶端
                            if (gs.onlineMode) {
                                const SyncMgr = window.Game.Online && window.Game.Online.SyncManager;
                                if (SyncMgr && SyncMgr.interceptDispatch) {
                                    SyncMgr.interceptDispatch('setSandboxTurn', { playerIndex: playerIdx });
                                }
                            }
                            if (window.Game.UI && window.Game.UI.updateUI) {
                                window.Game.UI.updateUI();
                            }
                        }
                    });
                } else {
                    actions.push({
                        label: '取消当前回合角色',
                        action: () => {
                            gs.sandboxTurnIndex = -1;
                            if (gs.onlineMode) {
                                const SyncMgr = window.Game.Online && window.Game.Online.SyncManager;
                                if (SyncMgr && SyncMgr.interceptDispatch) {
                                    SyncMgr.interceptDispatch('setSandboxTurn', { playerIndex: -1 });
                                }
                            }
                            if (window.Game.UI && window.Game.UI.updateUI) {
                                window.Game.UI.updateUI();
                            }
                        }
                    });
                }
            }
        }

        if (isSandbox) {
            if (actions.length > 0) actions.push({ label: '───', action: null }); // separator
            actions.push(
                { label: '增加 1 点体力', action: () => window.Game.Controller.dispatch('modifyHealth', { roleId: player.id, delta: 1 }) },
                { label: '减少 1 点体力', action: () => window.Game.Controller.dispatch('modifyHealth', { roleId: player.id, delta: -1 }) },

                { label: '增加 1 点体力上限', action: () => window.Game.Controller.dispatch('modifyMaxHealth', { roleId: player.id, delta: 1 }) },
                { label: '减少 1 点体力上限', action: () => window.Game.Controller.dispatch('modifyMaxHealth', { roleId: player.id, delta: -1 }) }
            );
        } else {
            if (actions.length > 0) actions.push({ label: '───', action: null }); // separator
            actions.push(
                { label: '造成 1 点伤害', action: () => window.Game.Core.Events.damage(null, player, 1) },
                { label: '治疗 1 点体力', action: () => window.Game.Core.Events.cure(null, player, 1) },
                { label: '回复 1 点体力', action: () => window.Game.Core.Events.recover(player, 1) },
                { label: '流失 1 点体力', action: () => window.Game.Core.Events.loss(player, 1) }
            );
        }
        
        renderMenu(x, y, player.name, actions);
    }

    function showCardContextMenu(x, y, card, currentAreaName, cardElement = null) {
        const actions = [];
        const state = window.Game.GameState;
        
        // 动作配置
        const targetConfigs = [
            { key: 'pile', label: '置于牌堆顶' },
            { key: 'discardPile', label: '置于弃牌堆顶' },
            { key: 'treatmentArea', label: '置于处理区' },
            { roleKey: 'hand', label: '置于手牌' },
            { roleKey: 'judgeArea', label: '置于判定区' },
        ];

        targetConfigs.forEach(conf => {
            let area = null;
            if (conf.key) area = state[conf.key];
            if (conf.roleKey) {
                const p = window.Game.UI.getMainPlayer();
                if (p) area = p[conf.roleKey];
            }
            
            if (area) {
                actions.push({
                    label: conf.label,
                    action: () => {
                        window.Game.Controller.dispatch('place', {
                            moveRole: window.Game.UI.getMainPlayer(),
                            card: card,
                            toArea: area,
                            element: cardElement
                        });
                    }
                });
            }
        });

        const title = typeof card === 'string' ? card : (card.name || 'Card');
        renderMenu(x, y, title, actions);
    }

    window.Game.UI.showContextMenu = showContextMenu;
    window.Game.UI.showCardContextMenu = showCardContextMenu;
})();