(function() {
    // Initialize UI
    function init() {
        console.log("Initializing Game UI...");
        
        // Load Terms and Colors
        // This will fetch JSONs and trigger updateUI when done
        if (window.Game.UI.loadTermColors) {
            window.Game.UI.loadTermColors();
        } else {
            console.error("Game.UI.loadTermColors not found. Check script loading order.");
        }

        // Initial Render (might be empty until state is ready, but good to ensure)
        if (window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
    }

    // Expose init
    window.Game.UI.init = init;

    // Auto-start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();