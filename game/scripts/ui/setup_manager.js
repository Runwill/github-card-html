(function() {
    window.Game = window.Game || {};
    window.Game.Setup = window.Game.Setup || {};

    let characterCache = null;

    function init() {
        const setupBtn = document.getElementById('btn-show-setup');
        const startBtn = document.getElementById('btn-start-game');
        
        // 绑定"游戏设置"按钮（点击切换：再次点击=取消）
        if (setupBtn) {
            setupBtn.addEventListener('click', toggleSetupPanel);
        }

        // 绑定"确认开始"按钮
        const confirmBtn = document.getElementById('btn-confirm-setup');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmSetup);
        }

        const countSelect = document.getElementById('setup-player-count-select');
        if (countSelect) {
            countSelect.addEventListener('change', (e) => {
                renderPlayerSlots(parseInt(e.target.value));
            });
        }
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
        const countSelect = document.getElementById('setup-player-count-select');
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
        const list = document.getElementById('setup-players-list');
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

    function generateDeck(preset) {
        let deck = [];
        if (preset === '80sha80shan') {
            // Updated to lowercase to match panel_card definitions (attack, dodge)
            for(let i=0; i<80; i++) deck.push('attack');
            for(let i=0; i<80; i++) deck.push('dodge');
        } else {
            // Standard fallback (mock standard deck)
            // Updated to lowercase to match panel_card definitions
            const basic = ['attack', 'dodge', 'peach', 'wine'];
            // 简单的每种20张用于测试
            basic.forEach(card => {
                for(let i=0; i<20; i++) deck.push(card);
            });
        }
        return deck;
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
        const presetSelect = document.getElementById('setup-card-preset-select');
        const preset = presetSelect ? presetSelect.value : 'standard';
        const deck = generateDeck(preset);

        // 获取模式预设
        const modeSelect = document.getElementById('setup-mode-select');
        let mode = modeSelect ? modeSelect.value : 'auto';

        // Online: force sandbox mode
        const isOnline = !!(window.Game.GameState && window.Game.GameState.onlineMode);
        if (isOnline) {
            mode = 'sandbox';
        }

        // 隐藏设置面板
        hideSetupPanel();

        // 显示游戏面板（StartGame 内部会进一步处理 UI 状态，但我们需要确保容器可见）
        const board = document.getElementById('game-board-panel');
        const main = document.getElementById('game-main-area');
        // if (board) board.classList.remove('hidden'); // Let GameState handle this?
        // if (main) main.classList.remove('hidden');

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


