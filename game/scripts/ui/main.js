(function() {
    // 初始化 UI
    function init() {
        console.log("Initializing Game UI...");
        
        // 加载术语和颜色
        // 这将获取 JSON 并完成后触发 updateUI
        if (window.Game.UI.loadTermColors) {
            window.Game.UI.loadTermColors();
        } else {
            console.error("Game.UI.loadTermColors not found. Check script loading order.");
        }

        // 初始渲染（在状态就绪前可能为空，但确保安全）
        if (window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }

        // 初始化检查器 (Tooltip)
        if (window.Game.UI.Inspector && window.Game.UI.Inspector.init) {
            window.Game.UI.Inspector.init();
        }
    }

    // 暴露 init
    window.Game.UI.init = init;

    // 自动启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();