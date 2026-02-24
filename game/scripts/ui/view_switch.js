/**
 * Game View Switch
 * 统一管理游戏面板内三个互斥视图的切换：
 *   - 'setup'  : 游戏设置面板 (#game-view-setup)
 *   - 'online' : 在线房间面板 (#game-view-online)
 *   - 'play'   : 对局内容面板 (#game-view-play)
 *   - 'none'   : 全部隐藏（初始状态）
 *
 * 同时控制底部区域(game-main-area) 仅在 'play' 时显示。
 */
(function () {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const VIEW_IDS = {
        setup:  'game-view-setup',
        online: 'game-view-online',
        play:   'game-view-play'
    };

    // 与 play 视图联动的元素
    const PLAY_ELEMENTS = [
        'game-table-panel',
        'game-board-panel',
        'game-main-area'
    ];

    /**
     * 按钮 ID 与视图名的映射（用于切换 active 状态）
     */
    const VIEW_BTN_MAP = {
        setup:  'btn-show-setup',
        online: 'btn-show-online'
    };

    let currentView = 'none';
    let previousView = 'none';

    /**
     * 切换到指定视图，隐藏其他所有视图
     * @param {'setup'|'online'|'play'|'none'} viewName
     */
    function switchGameView(viewName) {
        // 记录前一个视图（用于取消时恢复）
        previousView = currentView;
        // 隐藏所有 view 容器
        Object.values(VIEW_IDS).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        // 更新按钮 active 状态
        Object.entries(VIEW_BTN_MAP).forEach(([view, btnId]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (view === viewName) {
                    btn.classList.add('is-active');
                } else {
                    btn.classList.remove('is-active');
                }
            }
        });

        // 如果不是 play 视图，隐藏对局相关元素
        if (viewName !== 'play') {
            PLAY_ELEMENTS.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
        }

        // 显示目标视图
        if (viewName && viewName !== 'none' && VIEW_IDS[viewName]) {
            const el = document.getElementById(VIEW_IDS[viewName]);
            if (el) el.classList.remove('hidden');
        }

        // play 视图：同时显示对局子面板
        if (viewName === 'play') {
            PLAY_ELEMENTS.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
            // 隐藏 start 按钮（对局已开始）
            const startBtn = document.getElementById('btn-start-game');
            if (startBtn) startBtn.classList.add('hidden');
        }

        currentView = viewName;
    }

    /**
     * 获取当前活跃视图名称
     */
    function getCurrentView() {
        return currentView;
    }

    /**
     * 恢复到上一个视图（用于取消操作）
     * 如果上一个视图就是当前视图或 'none'，则检测游戏是否在进行中
     */
    function restorePreviousView() {
        // 如果有对局在进行，优先恢复到对局视图
        const gs = window.Game.GameState;
        if (gs && gs.isGameRunning) {
            switchGameView('play');
        } else if (previousView && previousView !== currentView) {
            switchGameView(previousView);
        } else {
            switchGameView('none');
        }
    }

    window.Game.UI.switchGameView = switchGameView;
    window.Game.UI.getCurrentView = getCurrentView;
    window.Game.UI.restorePreviousView = restorePreviousView;
})();
