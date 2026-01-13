(function() {
    window.Game = window.Game || {};
    window.Game.Setup = window.Game.Setup || {};

    let characterCache = null;

    function init() {
        const setupBtn = document.getElementById('btn-show-setup');
        const startBtn = document.getElementById('btn-start-game');
        
        // 绑定“游戏设置”按钮
        if (setupBtn) {
            setupBtn.addEventListener('click', showSetupPanel);
        } else if (startBtn) {
            // 如果没有单独的 SetUp 按钮，暂时劫持 Start Game 按钮
            // 但我们的 panel_game.html 修改应该已经添加了 btn-show-setup
            // 保持兼容性：如果页面没刷新导致旧DOM存在
        }

        // 绑定“确认开始”按钮
        const confirmBtn = document.getElementById('btn-confirm-setup');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmSetup);
        }

        const cancelBtn = document.getElementById('btn-cancel-setup');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', hideSetupPanel);
        }

        const countSelect = document.getElementById('setup-player-count-select');
        if (countSelect) {
            countSelect.addEventListener('change', (e) => {
                renderPlayerSlots(parseInt(e.target.value));
            });
        }
    }

    async function showSetupPanel() {
        const panel = document.getElementById('game-setup-ui');
        const board = document.getElementById('game-board-panel');
        const main = document.getElementById('game-main-area');
        const table = document.getElementById('game-table-panel');
        
        if (panel) panel.classList.remove('hidden');
        if (board) board.classList.add('hidden');
        if (main) main.classList.add('hidden');
        if (table) table.classList.add('hidden');

        // 加载武将数据
        if (!characterCache) {
            try {
                // 尝试从新接口获取
                const res = await fetch('http://localhost:3000/api/tokens/public-list?collection=character');
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
        const panel = document.getElementById('game-setup-ui');
        if (panel) panel.classList.add('hidden');
    }

    function renderPlayerSlots(count) {
        const list = document.getElementById('setup-players-list');
        if (!list) return;
        list.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'row collapse';
            row.style.marginBottom = '10px';

            const colLabel = document.createElement('div');
            colLabel.className = 'small-4 columns';
            // User requested terminology change: Player -> Role
            colLabel.innerHTML = `<span class="prefix">Role ${i + 1}</span>`;
            
            const colSelect = document.createElement('div');
            colSelect.className = 'small-8 columns';
            
            const select = document.createElement('select');
            select.className = 'setup-char-select';
            select.dataset.playerIndex = i;
            
            // 填充选项
            if (characterCache && characterCache.length) {
                characterCache.forEach(char => {
                    const opt = document.createElement('option');
                    opt.value = char.id || char._id; // Prefer numeric ID if available
                    // 保存所有数据到 dataset 或 内存映射，这里简单存 JSON
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

            colSelect.appendChild(select);
            row.appendChild(colLabel);
            row.appendChild(colSelect);
            list.appendChild(row);
        }
    }

    function generateDeck(preset) {
        let deck = [];
        if (preset === '80sha80shan') {
            // Align with backend card data keys (see console logs: ATTACK, DODGE)
            for(let i=0; i<80; i++) deck.push('Attack');
            for(let i=0; i<80; i++) deck.push('Dodge');
        } else {
            // Standard fallback (mock standard deck)
            // Align keys with card data: Attack(Sha), Dodge(Shan), Peach(Tao), Wine(Jiu)
            // If keys don't match data, they will render as English tags <Key>
            const basic = ['Attack', 'Dodge', 'Peach', 'Wine'];
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
                avatar: charData.avatar || '', // 如果有
                _originalData: charData
            });
        });

        // 获取牌堆预设
        const presetSelect = document.getElementById('setup-card-preset-select');
        const preset = presetSelect ? presetSelect.value : 'standard';
        const deck = generateDeck(preset);

        // 隐藏设置面板
        hideSetupPanel();

        // 显示游戏面板（StartGame 内部会进一步处理 UI 状态，但我们需要确保容器可见）
        const board = document.getElementById('game-board-panel');
        const main = document.getElementById('game-main-area');
        // if (board) board.classList.remove('hidden'); // Let GameState handle this?
        // if (main) main.classList.remove('hidden');

        // 开始游戏
        if (window.Game.Core && window.Game.Core.startGame) {
            window.Game.Core.startGame({ players: playersConfig, deck: deck });
        }
    }

    window.Game.Setup.init = init;

})();


