(function() {
    window.Game = window.Game || {};
    window.Game.Setup = window.Game.Setup || {};

    let characterCache = null;

    /** i18n helper */
    function t(key) { return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key; }

    /** Current mode value: 'auto' or 'sandbox' */
    let currentMode = 'sandbox';

    function byId(id) { return document.getElementById(id); }

    function bind(id, event, handler) {
        const el = byId(id);
        if (el) el.addEventListener(event, handler);
        return el;
    }

    function setToggle(toggle, active, label) {
        if (!toggle) return;
        toggle.dataset.value = active ? 'true' : 'false';
        toggle.textContent = label;
        toggle.classList.toggle('is-active', active);
    }

    function init() {
        // 绑定"游戏设置"按钮（点击切换：再次点击=取消）
        bind('btn-show-setup', 'click', toggleSetupPanel);

        // 绑定"确认开始"按钮
        bind('btn-confirm-setup', 'click', confirmSetup);

        const countSelect = byId('setup-player-count-select');
        if (countSelect) {
            countSelect.addEventListener('change', (e) => {
                renderPlayerSlots(parseInt(e.target.value));
            });
        }

        // 自动时机 click-toggle
        const modeToggle = byId('setup-mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => {
                // 在线房间内锁定为"否"，不可切换
                const isOnline = !!(window.Game.GameState && window.Game.GameState.onlineMode);
                if (isOnline) return;
                if (modeToggle.classList.contains('is-locked')) return;

                if (currentMode === 'sandbox') {
                    currentMode = 'auto';
                    setToggle(modeToggle, true, t('game.setup.autoTimingYes'));
                    modeToggle.dataset.value = 'auto';
                } else {
                    currentMode = 'sandbox';
                    setToggle(modeToggle, false, t('game.setup.autoTimingNo'));
                    modeToggle.dataset.value = 'sandbox';
                }
                // 更新座位数选项
                updateSeatCountOptions();
            });
        }

        // 允许旁观 click-toggle
    const spectateToggle = byId('setup-allow-spectate-toggle');
        if (spectateToggle) {
            spectateToggle.addEventListener('click', () => {
                const newVal = spectateToggle.dataset.value !== 'true';
        setToggle(spectateToggle, newVal, newVal ? '是' : '否');

                // 广播到房间
                if (window.Game.Online && window.Game.Online.RoomUI) {
                    const roomUI = window.Game.Online.RoomUI;
                    if (roomUI.currentRoom) {
                        roomUI.currentRoom.allowSpectate = newVal;
                    }
                    const client = window.Game.Online.RoomClient;
                    if (client && client.isConnected) {
                        client.updateRoomOption('allowSpectate', newVal);
                    }
                    roomUI.renderRoomInfo();
                }
            });
        }
    }

    /**
     * 根据当前模式更新座位数下拉选项
     * 否(sandbox) → 1-10, 是(auto) → 2-10
     */
    function updateSeatCountOptions() {
        const countSelect = byId('setup-player-count-select');
        if (!countSelect) return;
        const prevValue = parseInt(countSelect.value) || 4;
        const min = (currentMode === 'auto') ? 2 : 1;
        const max = 10;

        countSelect.innerHTML = '';
        for (let i = min; i <= max; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            countSelect.appendChild(opt);
        }

        // 保持之前选择值（如果仍然有效），否则选第一个有效值
        if (prevValue >= min && prevValue <= max) {
            countSelect.value = prevValue;
        } else {
            countSelect.value = min;
        }

        renderPlayerSlots(parseInt(countSelect.value));
    }

    /**
     * 切换设置面板（打开/关闭）
     */
    function toggleSetupPanel() {
        const cur = window.Game.UI.getCurrentView ? window.Game.UI.getCurrentView() : 'none';
        if (cur === 'setup') {
            hideSetupPanel();
            return;
        }
        showSetupPanel();
    }

    async function showSetupPanel() {
        // 切换到设置视图（互斥隐藏其他视图）
        if (window.Game.UI.switchGameView) {
            window.Game.UI.switchGameView('setup');
        }

        // 面板可见后重新计算 CustomSelect 选项字体缩放
        if (window.CustomSelect) window.CustomSelect.refreshAll();

        // 在线模式检测
        const isOnline = !!(window.Game.GameState && window.Game.GameState.onlineMode);
        const modeToggle = byId('setup-mode-toggle');

        // 在线模式下锁定自动时机为"否"
        if (isOnline && modeToggle) {
            currentMode = 'sandbox';
            setToggle(modeToggle, false, t('game.setup.autoTimingNo'));
            modeToggle.dataset.value = 'sandbox';
            modeToggle.classList.add('is-locked');
        } else if (modeToggle) {
            modeToggle.classList.remove('is-locked');
        }

        // 允许旁观 toggle: 仅在线 + 房主 + 在自己房间时显示
        const spectateGroup = byId('setup-allow-spectate-group');
        if (spectateGroup) {
            let showSpectate = false;
            if (isOnline && window.Game.Online && window.Game.Online.RoomUI) {
                const roomUI = window.Game.Online.RoomUI;
                const room = roomUI.currentRoom;
                if (room) {
                    const myId = localStorage.getItem('id');
                    showSpectate = (room.host === myId);
                    // 同步当前值
                    const toggle = byId('setup-allow-spectate-toggle');
                    if (toggle) {
                        const allowed = room.allowSpectate !== false;
                        setToggle(toggle, allowed, allowed ? '是' : '否');
                    }
                }
            }
            spectateGroup.classList.toggle('hidden', !showSpectate);
        }

        // 更新座位数选项
        updateSeatCountOptions();

        // 加载武将数据
        if (!characterCache) {
            try {
                // 尝试从新接口获取
                const res = await fetch(window.endpoints.api('/api/tokens/public-list?collection=character'));
                if (res.ok) {
                    characterCache = await res.json();
                } else {
                    console.warn('Failed to fetch characters, using mock.');
                    characterCache = []; // Fallback empty or mock
                }
            } catch (e) {
                console.error('Fetch error:', e);
                characterCache = [];
            }
        }

        // 初始渲染
        const countSelect = byId('setup-player-count-select');
        const count = countSelect ? parseInt(countSelect.value) : 4;
        renderPlayerSlots(count);
    }

    function hideSetupPanel() {
        // 恢复到之前的视图（如果对局在进行中则回到对局）
        if (window.Game.UI.restorePreviousView) {
            window.Game.UI.restorePreviousView();
        }
    }

    function renderPlayerSlots(count) {
        const list = byId('setup-players-list');
        if (!list) return;
        list.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const group = document.createElement('div');
            group.className = 'input-group';

            const label = document.createElement('span');
            label.className = 'input-group-label';
            label.textContent = `Role ${i + 1}`;

            const select = document.createElement('select');
            select.className = 'input-group-field setup-char-select';
            select.dataset.playerIndex = i;
            
            // 填充选项
            if (characterCache && characterCache.length) {
                characterCache.forEach(char => {
                    const opt = document.createElement('option');
                    opt.value = char.id || char._id;
                    opt.dataset.charData = JSON.stringify(char);
                    opt.textContent = `${char.name} (HP:${char.health})`;
                    select.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.textContent = 'Loading or No Data...';
                select.appendChild(opt);
            }
            
            // 简单随机默认选择
            if (select.options.length > i) {
                select.selectedIndex = i % select.options.length;
            }

            group.appendChild(label);
            group.appendChild(select);
            list.appendChild(group);
        }

        // Wrap dynamic selects with custom dropdown component
        if (window.CustomSelect) {
            window.CustomSelect.init(list);
        }
    }

    function repeatCard(card, count) { return Array(count).fill(card); }

    function generateDeck(preset) {
        if (preset === '80sha80shan') return repeatCard('attack', 80).concat(repeatCard('dodge', 80));
        return ['attack', 'dodge', 'peach', 'wine'].flatMap(card => repeatCard(card, 20));
    }

    function confirmSetup() {
        const selects = document.querySelectorAll('.setup-char-select');
        const playersConfig = [];

        selects.forEach((sel, index) => {
            const opt = sel.options[sel.selectedIndex];
            let charData = {};
            try {
                charData = JSON.parse(opt.dataset.charData || '{}');
            } catch (e) {}
            
            // 映射后端数据到游戏数据
            // Backend: { id, name, health, ... }
            // Game: { hp, maxHp, ... }
            playersConfig.push({
                name: charData.name || `Player ${index+1}`,
                characterId: charData.id, // 保存后端 ID
                character: [charData.name], // GameText 需要
                hp: charData.health || 4,
                maxHp: charData.health || 4, // 默认当前血量即上限
                position: charData.position || '', // 势力/位置，用于推导头像
                avatar: charData.avatar || '', // 如果有
                _originalData: charData
            });
        });

        // 获取牌堆预设
        const presetSelect = byId('setup-card-preset-select');
        const preset = presetSelect ? presetSelect.value : 'standard';
        const deck = generateDeck(preset);

        // Online: force sandbox mode (自动时机 = 否)
        const isOnline = !!(window.Game.GameState && window.Game.GameState.onlineMode);
        const mode = isOnline ? 'sandbox' : currentMode;

        // 隐藏设置面板
        hideSetupPanel();

        // 开始游戏
        const gameConfig = { mode: mode, players: playersConfig, deck: deck };
        if (window.Game.Controller && window.Game.Controller.startGame) {
            window.Game.Controller.startGame(gameConfig);
        } else if (window.Game.Core && window.Game.Core.startGame) {
            window.Game.Core.startGame({ players: playersConfig, deck: deck });
        }

        // Online: broadcast game start to room members
        if (isOnline && window.Game.Online) {
            try {
                const syncMgr = window.Game.Online.SyncManager;
                const client = window.Game.Online.RoomClient;
                if (syncMgr && client) {
                    const serializedState = syncMgr.serializeGameState();
                    client.notifyGameStart(gameConfig, serializedState);
                }
            } catch(e) { console.warn('[Online] game start broadcast error', e); }
        }
    }

    window.Game.Setup.init = init;

})();


