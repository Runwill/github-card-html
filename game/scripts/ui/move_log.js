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
     * 将区域路径转换为包含动态术语标签的 HTML
     * 使用 GameText 渲染区域名和角色名，使其拥有动态术语系统的悬浮/点击交互
     */
    function getAreaDisplayHTML(areaPath) {
        const GameText = window.Game.UI.GameText;

        if (!areaPath) return '<span class="move-log-unknown">???</span>';

        // 辅助：生成位置标签 HTML
        const posHTML = (n) => '<span class="move-log-pos">第' + (n + 1) + '张</span>';

        // ── 全局区域：pile:N, discardPile:N, treatmentArea:N ──
        const globalMatch = areaPath.match(/^(pile|discardPile|treatmentArea)(?::(\d+))?$/);
        if (globalMatch) {
            const areaHTML = GameText.render(globalMatch[1]);
            if (globalMatch[2] != null) {
                return areaHTML + posHTML(parseInt(globalMatch[2], 10));
            }
            return areaHTML;
        }

        // ── 玩家区域：player:X:subArea 或 player:X:subArea:N ──
        const playerMatch = areaPath.match(/^player:(\d+):(.+)$/);
        if (playerMatch && GameText) {
            const playerIdx = parseInt(playerMatch[1], 10);
            const rest = playerMatch[2]; // hand:3, judgeArea:1, equip:2
            const gs = window.Game.GameState;
            const player = gs && gs.players ? gs.players[playerIdx] : null;
            const playerName = window.Game.UI._RoleUtils?.roleCharacterKey?.(player) || (player && player.name) || '';
            const playerNameHTML = player
                ? GameText.render('Character', { id: player.characterId, name: playerName })
                : `P${playerIdx + 1}`;

            const areaWithPosition = (termKey, index) => GameText.render(termKey) + (index != null ? posHTML(parseInt(index, 10)) : '');
            let areaTermHTML = '';

            // hand 或 hand:N
            const handMatch = rest.match(/^hand(?::(\d+))?$/);
            if (handMatch) areaTermHTML = areaWithPosition('hand', handMatch[1]);

            // judgeArea 或 judgeArea:N
            const judgeMatch = !handMatch && rest.match(/^judgeArea(?::(\d+))?$/);
            if (judgeMatch) areaTermHTML = areaWithPosition('judgeArea', judgeMatch[1]);

            // equip:slot:slotIdx 或兼容旧 equip:slotIdx（slotIdx 本身就是位置，无需额外标注）
            const equipMatch = !handMatch && !judgeMatch && rest.match(/^equip(?::slot:(\d+)|:(\d+))?$/);
            if (equipMatch) {
                const slotIdx = parseInt(equipMatch[1] ?? equipMatch[2], 10);
                const slot = Number.isFinite(slotIdx) ? window.Game.Models?.getEquipSlot?.(player, slotIdx) : null;
                const termKey = slot?.labelKey || slot?.slotKey || 'equipArea';
                areaTermHTML = GameText.render(termKey);
            }

            if (areaTermHTML) {
                return playerNameHTML + areaTermHTML;
            }
        }

        return areaPath;
    }

    // 记录上一次渲染使用的视角索引，用于检测视角切换触发全量重渲染
    let _lastPerspective = -1;

    /**
     * 判断某条日志中的卡牌对当前视角是否可见
     * 规则：如果移动前可见 或 移动后可见，就显示真名；否则隐藏
     */
    function isCardVisibleToPerspective(entry) {
        const gs = window.Game.GameState;
        if (!gs) return true; // 无状态时默认显示

        const perspIdx = gs.perspectiveIndex != null ? gs.perspectiveIndex : 0;
        const perspPlayer = gs.players && gs.players[perspIdx];
        if (!perspPlayer) return true;

        const myId = perspPlayer.id;

        // 移动前：卡牌是否对我可见
        // visibility 0 → 公开(所有人可见); 1 → 私有(仅 visibleTo 中的角色可见)
        const beforeVisible = (entry.cardVisibility === 0) ||
            (entry.cardVisibleTo && entry.cardVisibleTo.includes(myId));

        // 移动后：目标区域是否对我可见
        // forOrAgainst 0 → 公开; 1 → 私有(仅 owner 可见)
        const afterVisible = (entry.toForOrAgainst === 0) ||
            (entry.toOwnerId === myId);

        return beforeVisible || afterVisible;
    }

    /**
     * 记录一次移动
     * @param {object} params
     * @param {object} params.moveRole - 移动者 Player 对象 (可为 null)
     * @param {object} params.card - Card 对象
     * @param {string} params.fromAreaPath - 来源区域路径
     * @param {string} params.toAreaPath - 目标区域路径
     * @param {number} [params.cardVisibility] - 移动前卡牌 visibility (0=公开, 1=私有)
     * @param {number[]} [params.cardVisibleTo] - 移动前 visibleTo 角色 ID 数组
     * @param {number} [params.toForOrAgainst] - 目标区域 forOrAgainst (0=公开, 1=私有)
     * @param {number|null} [params.toOwnerId] - 目标区域 owner ID
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
            moverName: moveRole ? (window.Game.UI._RoleUtils?.roleCharacterKey?.(moveRole) || moveRole.name || '') : null,
            moverCharacterId: moveRole ? moveRole.characterId : null,
            moverId: moveRole ? moveRole.id : null,
            cardName: card ? (card.name || card.key || 'unknown') : 'unknown',
            fromAreaPath,
            toAreaPath,
            // 可见性快照 —— 用于按视角过滤卡牌名称
            cardVisibility: params.cardVisibility != null ? params.cardVisibility : (card ? card.visibility : 0),
            cardVisibleTo: params.cardVisibleTo || (card && card.visibleTo ? [...card.visibleTo] : []),
            toForOrAgainst: params.toForOrAgainst != null ? params.toForOrAgainst : 0,
            toOwnerId: params.toOwnerId != null ? params.toOwnerId : null
        };

        logEntries.push(entry);

        // 限制日志条数
        if (logEntries.length > MAX_LOG_ENTRIES) logEntries = logEntries.slice(-MAX_LOG_ENTRIES);

        renderLog();
    }

    /**
     * 渲染日志到 DOM
     * 视角变更时自动全量重渲染以更新卡牌可见性显示
     */
    function renderLog() {
        const container = document.getElementById('game-move-log');
        if (!container) return;

        const GameText = window.Game.UI.GameText;
        if (!GameText) return;

        const gs = window.Game.GameState;
        const curPersp = gs ? (gs.perspectiveIndex != null ? gs.perspectiveIndex : 0) : 0;
        const perspChanged = (curPersp !== _lastPerspective);
        _lastPerspective = curPersp;

        const existingCount = container.children.length;

        // 视角变化 或 条目数不匹配 → 全量重渲染
        if (perspChanged || existingCount !== logEntries.length) {
            const fragment = document.createDocumentFragment();
            logEntries.forEach(entry => {
                fragment.appendChild(createLogEntry(entry, GameText));
            });
            container.replaceChildren(fragment);
        }
        // 否则不变（新条目已由上面的 count mismatch 路径处理）

        // 自动滚动到最新条目
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
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

        // 根据可见性决定是否显示真实卡牌名
        const showRealCard = isCardVisibleToPerspective(entry);
        const cardHTML = showRealCard
            ? GameText.render(entry.cardName)
            : '<span class="move-log-hidden-card"></span>';
        const fromHTML = getAreaDisplayHTML(entry.fromAreaPath);
        const toHTML = getAreaDisplayHTML(entry.toAreaPath);

        el.innerHTML = 
            '<span class="move-log-mover">' + moverHTML + '</span>' +
            ' <span class="move-log-card">' + cardHTML + '</span> ' +
            '<span class="move-log-from">' + fromHTML + '</span>' +
            ' → ' +
            '<span class="move-log-to">' + toHTML + '</span>';

        return el;
    }

    /**
     * 清空日志
     */
    function clear() {
        logEntries = [];
        _lastPerspective = -1;
        const container = document.getElementById('game-move-log');
        if (container) container.replaceChildren();
    }

    // 导出
    window.Game.UI.MoveLog = {
        logMove,
        clear,
        renderLog
    };

})();
