(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // --- Card Viewer Modal Logic ---
    window.Game.UI.openCardViewer = function(title, cards, sourceId) {
        const modal = document.getElementById('card-viewer-modal');
        const grid = document.getElementById('card-viewer-grid');
        const titleEl = document.getElementById('card-viewer-title');
        const backdrop = document.getElementById('modal-backdrop');
        
        if (!modal || !grid) return;
        
        // Update Title
        titleEl.textContent = `${title} (${cards.length})`;
        
        // Use standard renderer to allow Drag & Drop
        if (window.Game.UI.renderCardList && sourceId) {
            // Ensure the grid has an ID for proper diffing if needed (it does: card-viewer-grid)
            // But renderCardList expects an Area ID mostly for logic mapping.
            // Using sourceId (e.g. 'pile') as dropZoneId ensures move logic works:
            // "Move from pile to pile at index X" works as Reorder.
            
            // Note: forceBack is REMOVED from params.
            // Visibility is now determined by:
            // 1. renderCardList internal logic (using card.visibility and mainPlayer)
            // 2. Or explicit 'forceFaceDown' option if we wanted to enforce it, but user requested to rely on area properties.
            // Since 'renderCardList' contains the "Visibility System" checks (card.visibleTo), 
            // relying on it without 'forceFaceDown: true' allows the card's own state to decide.
            // Exception: For PILE, the cards usually HAVE visibility=1 (Private).
            // So they will render as Back by default unless 'visibleTo' includes Main Player (Searching).
            // This aligns with "Window corresponds to area properties".
            
            // Clear innerHTML first to safely switch modes if needed, or let diffing handle it
            // Since this is an "Open Once" action, clearing is safer to remove stale state.
            grid.innerHTML = '';
            
            window.Game.UI.renderCardList('card-viewer-grid', cards, sourceId, { 
                // forceFaceDown: removed, let defaults handle it
                skipLayout: true // Don't let auto-spreader mess with grid CSS
            });
            
        } else {
            // Fallback (ReadOnly)
            grid.innerHTML = '';
            cards.forEach(card => {
                const el = document.createElement('div');
                el.className = 'card-placeholder';
                const name = card.name || card.key || '???';
                 if (window.Game.UI.GameText) {
                    el.innerHTML = window.Game.UI.GameText.render(name);
                } else {
                    el.textContent = name;
                }
                grid.appendChild(el);
            });
        }
        
        // Show Modal
        modal.classList.add('show');
        backdrop.classList.add('show');
        
        // Close on Backdrop Click
        const closeFn = (e) => {
            if (e.target === backdrop) {
                modal.classList.remove('show');
                backdrop.classList.remove('show');
                backdrop.removeEventListener('click', closeFn);
                // Clean up renderer binding to avoid ghost updates?
                // Not strictly necessary as renderCardList is stateless DOM manipulation.
            }
        };
        backdrop.addEventListener('click', closeFn);
    };

})();
