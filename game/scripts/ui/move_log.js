(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * MoveLog - 卡牌移动日志系统
     * 
     * 在沙盒模式下记录并显示卡牌移动记录。
     * 每条记录包含：移动者、被移动的牌、来源区域、目标区域。
     * 过滤规则：同一角色从自己手牌移到自己手牌的移动不记录。
     */

    const MAX_LOG_ENTRIES = 200;
    let logEntries = [];

    /**
     * 将区域路径转换为可读文本 (i18n)
     */
    function getAreaDisplayName(areaPath) {
        const t = window.i18n ? window.i18n.t.bind(window.i18n) : (k) => k;
        const gs = window.Game.GameState;

        if (!areaPath) return t('game.area.unknown');

        if (areaPath === 'pile') return t('game.area.pile');
        if (areaPath === 'discardPile') return t('game.area.discardPile');
        if (areaPath === 'treatmentArea') return t('game.area.treatmentArea');

        // player:X:hand, player:X:judgeArea, player:X:equip:Y
        const playerMatch = areaPath.match(/^player:(\d+):(.+)$/);
        if (playerMatch && gs && gs.players) {
            const playerIdx = parseInt(playerMatch[1]);
            const subArea = playerMatch[2];
            const player = gs.players[playerIdx];
            const playerName = player ? player.name : `P${playerIdx + 1}`;

            if (subArea === 'hand') {
                return t('game.area.hand').replace('{name}', playerName);
            }
            if (subArea === 'judgeArea') {
                return t('game.area.judgeArea').replace('{name}', playerName);
            }
            if (subArea.startsWith('equip')) {
                return t('game.area.equip').replace('{name}', playerName);
            }
        }

        return areaPath;
    }

    /**
     * 记录一次移动
     * @param {object} params
     * @param {object} params.moveRole - 移动者 Player 对象 (可为 null)
     * @param {object} params.card - Card 对象
     * @param {string} params.fromAreaPath - 来源区域路径
     * @param {string} params.toAreaPath - 目标区域路径
     */
    function logMove(params) {
        const { moveRole, card, fromAreaPath, toAreaPath } = params;

        // 过滤：同一角色从自己手牌移到自己手牌
        if (fromAreaPath && toAreaPath && moveRole) {
            const fromMatch = fromAreaPath.match(/^player:(\d+):hand$/);
            const toMatch = toAreaPath.match(/^player:(\d+):hand$/);
            if (fromMatch && toMatch && fromMatch[1] === toMatch[1]) {
                // 同一玩家手牌之间的移动，不记录
                return;
            }
        }

        const entry = {
            timestamp: Date.now(),
            moverName: moveRole ? moveRole.name : null,
            moverCharacterId: moveRole ? moveRole.characterId : null,
            moverId: moveRole ? moveRole.id : null,
            cardName: card ? (card.name || card.key || 'unknown') : 'unknown',
            fromAreaPath,
            toAreaPath
        };

        logEntries.push(entry);

        // 限制日志条数
        if (logEntries.length > MAX_LOG_ENTRIES) {
            logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
        }

        renderLog();
    }

    /**
     * 渲染日志到 DOM
     */
    function renderLog() {
        const container = document.getElementById('game-move-log');
        if (!container) return;

        const GameText = window.Game.UI.GameText;
        if (!GameText) return;

        // 增量渲染：只添加新条目
        const existingCount = container.children.length;
        const startIdx = Math.max(0, logEntries.length - MAX_LOG_ENTRIES);

        // 如果现有条目数与预期不符，全量重渲染
        if (existingCount !== logEntries.length - (logEntries.length - existingCount < 50 ? logEntries.length - existingCount : 0)) {
            // 简单的全量渲染策略（性能足够 for ≤200 条）
            const fragment = document.createDocumentFragment();
            
            logEntries.forEach(entry => {
                fragment.appendChild(createLogEntry(entry, GameText));
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        } else {
            // 追加新条目
            for (let i = existingCount; i < logEntries.length; i++) {
                container.appendChild(createLogEntry(logEntries[i], GameText));
            }
        }

        // 自动滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 创建单条日志 DOM 元素
     */
    function createLogEntry(entry, GameText) {
        const el = document.createElement('div');
        el.className = 'move-log-entry';

        // 构建各部分的 HTML
        let moverHTML;
        if (entry.moverName && entry.moverCharacterId != null) {
            moverHTML = GameText.render('Character', { id: entry.moverCharacterId, name: entry.moverName });
        } else {
            moverHTML = '<span class="move-log-unknown">???</span>';
        }

        const cardHTML = GameText.render(entry.cardName);
        const fromText = getAreaDisplayName(entry.fromAreaPath);
        const toText = getAreaDisplayName(entry.toAreaPath);

        el.innerHTML = 
            '<span class="move-log-mover">' + moverHTML + '</span>' +
            ' <span class="move-log-card">' + cardHTML + '</span> ' +
            '<span class="move-log-from">' + fromText + '</span>' +
            ' → ' +
            '<span class="move-log-to">' + toText + '</span>';

        return el;
    }

    /**
     * 清空日志
     */
    function clear() {
        logEntries = [];
        const container = document.getElementById('game-move-log');
        if (container) container.innerHTML = '';
    }

    // 导出
    window.Game.UI.MoveLog = {
        logMove,
        clear,
        renderLog
    };

})();
