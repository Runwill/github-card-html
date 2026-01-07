(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Context Menu Logic
    let contextMenuEl = null;

    function createContextMenu() {
        if (contextMenuEl) return contextMenuEl;
        
        contextMenuEl = document.createElement('div');
        contextMenuEl.className = 'custom-context-menu';
        document.body.appendChild(contextMenuEl);
        
        // Close on click outside
        document.addEventListener('click', () => {
            contextMenuEl.classList.remove('visible');
        });
        
        return contextMenuEl;
    }

    function showContextMenu(x, y, player) {
        const menu = createContextMenu();
        menu.innerHTML = ''; // Clear previous content
        
        // Header
        const header = document.createElement('div');
        header.className = 'context-menu-header';
        header.textContent = player.name;
        menu.appendChild(header);
        
        // Actions
        const actions = [
            { label: 'Damage 1 HP', action: () => window.Game.Core.Events.damage(null, player, 1) },
            { label: 'Cure 1 HP', action: () => window.Game.Core.Events.cure(null, player, 1) },
            { label: 'Recover 1 HP', action: () => window.Game.Core.Events.recover(player, 1) },
            { label: 'Loss 1 HP', action: () => window.Game.Core.Events.loss(player, 1) }
        ];
        
        actions.forEach(item => {
            const el = document.createElement('div');
            el.className = 'context-menu-item';
            el.textContent = item.label;
            el.onclick = (e) => {
                e.stopPropagation(); // Prevent document click from closing immediately (though we want it to close after action)
                item.action();
                menu.classList.remove('visible');
            };
            menu.appendChild(el);
        });

        // Position and Show
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('visible');
        
        // Adjust if out of bounds (simple check)
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