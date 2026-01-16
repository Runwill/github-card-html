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
        document.addEventListener('click', () => {
            contextMenuEl.classList.remove('visible');
        });
        
        return contextMenuEl;
    }

    function showContextMenu(x, y, player) {
        const menu = createContextMenu();
        menu.innerHTML = ''; // 清除之前的内容
        
        // 标题
        const header = document.createElement('div');
        header.className = 'context-menu-header';
        header.textContent = player.name;
        menu.appendChild(header);
        
        // 操作
        let actions = [];
        const isSandbox = window.Game.GameState && window.Game.GameState.mode === 'sandbox';

        if (isSandbox) {
            actions = [
                { label: '增加 1 点体力', action: () => window.Game.Controller.dispatch('modifyHealth', { roleId: player.id, delta: 1 }) },
                { label: '减少 1 点体力', action: () => window.Game.Controller.dispatch('modifyHealth', { roleId: player.id, delta: -1 }) },

                { label: '增加 1 点体力上限', action: () => window.Game.Controller.dispatch('modifyMaxHealth', { roleId: player.id, delta: 1 }) },
                { label: '减少 1 点体力上限', action: () => window.Game.Controller.dispatch('modifyMaxHealth', { roleId: player.id, delta: -1 }) }
            ];
        } else {
            actions = [
                { label: '造成 1 点伤害', action: () => window.Game.Core.Events.damage(null, player, 1) },
                { label: '治疗 1 点体力', action: () => window.Game.Core.Events.cure(null, player, 1) },
                { label: '回复 1 点体力', action: () => window.Game.Core.Events.recover(player, 1) },
                { label: '流失 1 点体力', action: () => window.Game.Core.Events.loss(player, 1) }
            ];
        }
        
        actions.forEach(item => {
            const el = document.createElement('div');
            el.className = 'context-menu-item';
            el.textContent = item.label;
            el.onclick = (e) => {
                e.stopPropagation(); // 防止文档点击立即关闭（虽然我们希望在操作后关闭）
                if (item.action) item.action();
                menu.classList.remove('visible');
            };
            menu.appendChild(el);
        });

        // 定位并显示
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('visible');
        
        // 如果超出边界则调整（简单检查）
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }

    window.Game.UI.showContextMenu = showContextMenu;
})();