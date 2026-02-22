/**
 * Online Room UI
 * 在线房间的界面管理（大厅、创建/加入房间）
 */
(function () {
    window.Game = window.Game || {};
    window.Game.Online = window.Game.Online || {};

    const Client = () => window.Game.Online.RoomClient;
    let currentRoom = null;
    let refreshTimer = null;

    function t(key) {
        return (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    }

    /**
     * 初始化在线房间 UI
     */
    function init() {
        const onlineBtn = document.getElementById('btn-show-online');
        if (onlineBtn) {
            onlineBtn.addEventListener('click', toggleOnlinePanel);
        }

        const createBtn = document.getElementById('btn-create-room');
        if (createBtn) {
            createBtn.addEventListener('click', handleCreateRoom);
        }

        const refreshBtn = document.getElementById('btn-refresh-rooms');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshRoomList);
        }

        const leaveBtn = document.getElementById('btn-leave-room');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', handleLeaveRoom);
        }

        // 注册事件回调
        const client = Client();
        if (client) {
            client.on('userJoined', onUserJoined);
            client.on('userLeft', onUserLeft);
            client.on('perspectivesUpdated', onPerspectivesUpdated);
            client.on('gameStarted', onRemoteGameStarted);
            client.on('disconnected', onDisconnected);
        }
    }

    /**
     * 显示在线房间面板
     */
    /**
     * 切换在线面板（打开/关闭）
     */
    function toggleOnlinePanel() {
        const cur = window.Game.UI.getCurrentView ? window.Game.UI.getCurrentView() : 'none';
        if (cur === 'online') {
            hideOnlinePanel();
            return;
        }
        showOnlinePanel();
    }

    async function showOnlinePanel() {
        // 切换到在线房间视图（互斥隐藏其他视图）
        if (window.Game.UI.switchGameView) {
            window.Game.UI.switchGameView('online');
        }

        // 显示大厅，隐藏房间内视图
        showLobby();

        setStatus(t('online.connecting'));

        try {
            const client = Client();
            await client.connect();
            setStatus(t('online.connected'));
            await refreshRoomList();
        } catch (e) {
            setStatus(t('online.connectFailed') + ': ' + e.message, 'error');
        }
    }

    /**
     * 隐藏在线房间面板
     */
    function hideOnlinePanel() {
        // 恢复到之前的视图（如果对局在进行中则回到对局）
        if (window.Game.UI.restorePreviousView) {
            window.Game.UI.restorePreviousView();
        }
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    /**
     * 显示大厅视图
     */
    function showLobby() {
        const lobby = document.getElementById('online-lobby');
        const inRoom = document.getElementById('online-in-room');
        if (lobby) lobby.classList.remove('hidden');
        if (inRoom) inRoom.classList.add('hidden');
    }

    /**
     * 显示房间内视图
     */
    function showInRoom() {
        const lobby = document.getElementById('online-lobby');
        const inRoom = document.getElementById('online-in-room');
        if (lobby) lobby.classList.add('hidden');
        if (inRoom) inRoom.classList.remove('hidden');
    }

    /**
     * 设置状态信息
     */
    function setStatus(text, type) {
        const el = document.getElementById('online-status');
        if (!el) return;
        el.textContent = text;
        el.className = 'online-status';
        if (type) el.classList.add(type);
    }

    /**
     * 刷新房间列表
     */
    async function refreshRoomList() {
        const client = Client();
        if (!client || !client.isConnected) return;

        try {
            const rooms = await client.listRooms();
            renderRoomList(rooms);
        } catch (e) {
            console.error('[Online] 获取房间列表失败:', e);
        }
    }

    /**
     * 渲染房间列表
     */
    function renderRoomList(rooms) {
        const list = document.getElementById('room-list');
        if (!list) return;

        if (!rooms || rooms.length === 0) {
            list.innerHTML = `<div class="room-empty">${t('online.noRooms')}</div>`;
            return;
        }

        list.innerHTML = rooms.map(room => `
            <div class="room-item" data-room-id="${room.id}">
                <div class="room-item-info">
                    <span class="room-item-name">${escapeHtml(room.id)}</span>
                    <span class="room-item-status">
                        <span class="room-item-users">${room.userCount} ${t('online.players')}</span>
                        ${room.gameStarted ? `<span class="room-item-tag gaming">${t('online.gaming')}</span>` : `<span class="room-item-tag waiting">${t('online.waiting')}</span>`}
                    </span>
                </div>
                <button class="btn btn--sm btn--primary btn-join-room">${t('online.join')}</button>
            </div>
        `).join('');

        // 绑定加入按钮
        list.querySelectorAll('.btn-join-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.closest('.room-item').dataset.roomId;
                handleJoinRoom(roomId);
            });
        });
    }

    /**
     * 创建房间
     */
    async function handleCreateRoom() {
        const input = document.getElementById('input-room-id');
        const roomId = input ? input.value.trim() : '';

        if (!roomId) {
            setStatus(t('online.enterRoomId'), 'error');
            return;
        }

        const client = Client();
        if (!client || !client.isConnected) {
            setStatus(t('online.notConnected'), 'error');
            return;
        }

        try {
            setStatus(t('online.creating'));
            const result = await client.createRoom(roomId);
            currentRoom = result.room;

            // 标记在线模式
            if (window.Game.GameState) window.Game.GameState.onlineMode = true;

            // 初始化 SyncManager 的 perspectives 数据
            if (currentRoom.perspectives && window.Game.Online.SyncManager) {
                window.Game.Online.SyncManager.onPerspectivesChanged(currentRoom.perspectives);
            }

            showInRoom();
            renderRoomInfo();
            setStatus(t('online.roomCreated'));
        } catch (e) {
            setStatus(e.message, 'error');
        }
    }

    /**
     * 加入房间
     */
    async function handleJoinRoom(roomId) {
        const client = Client();
        if (!client || !client.isConnected) return;

        try {
            setStatus(t('online.joining'));
            const result = await client.joinRoom(roomId);
            currentRoom = result.room;

            // 标记在线模式
            if (window.Game.GameState) window.Game.GameState.onlineMode = true;

            // 初始化 SyncManager 的 perspectives 数据
            if (currentRoom.perspectives && window.Game.Online.SyncManager) {
                window.Game.Online.SyncManager.onPerspectivesChanged(currentRoom.perspectives);
            }

            showInRoom();
            renderRoomInfo();
            setStatus(t('online.joined'));

            // 如果游戏已经开始，通过引擎初始化 + 状态覆盖恢复
            if (currentRoom.gameStarted && window.Game.Online.SyncManager) {
                const gameConfig = result.gameConfig || currentRoom.gameConfig;
                window.Game.Online.SyncManager.onRemoteGameStart(
                    gameConfig,
                    result.gameState
                );
            }
        } catch (e) {
            setStatus(e.message, 'error');
        }
    }

    /**
     * 离开房间
     */
    async function handleLeaveRoom() {
        const client = Client();
        if (client) {
            await client.leaveRoom();
        }
        currentRoom = null;

        // 清除在线模式标记
        if (window.Game.GameState) {
            window.Game.GameState.onlineMode = false;
        }

        showLobby();
        setStatus(t('online.left'));
        refreshRoomList();
    }

    /**
     * 渲染房间内信息
     */
    function renderRoomInfo() {
        if (!currentRoom) return;

        const nameEl = document.getElementById('current-room-name');
        if (nameEl) nameEl.textContent = currentRoom.id;

        renderUserList();
    }

    /**
     * 渲染用户列表
     */
    function renderUserList() {
        if (!currentRoom) return;
        const container = document.getElementById('room-user-list');
        if (!container) return;

        const users = currentRoom.users || {};
        const myId = localStorage.getItem('id');

        container.innerHTML = Object.entries(users).map(([userId, info]) => `
            <div class="room-user ${userId === myId ? 'room-user-self' : ''}">
                <span class="room-user-name">${escapeHtml(info.username)}</span>
                ${userId === currentRoom.host ? `<span class="room-user-badge host">${t('online.host')}</span>` : ''}
                ${userId === myId ? `<span class="room-user-badge self">${t('online.you')}</span>` : ''}
            </div>
        `).join('');

        // 更新用户数显示
        const countEl = document.getElementById('room-user-count');
        if (countEl) countEl.textContent = Object.keys(users).length;
    }

    // ===== 事件处理 =====

    function onUserJoined(data) {
        if (data.room) {
            currentRoom = data.room;
            renderRoomInfo();
        }
        setStatus(`${data.username} ${t('online.hasJoined')}`);
    }

    function onUserLeft(data) {
        if (data.room) {
            currentRoom = data.room;
            renderRoomInfo();
        }
        setStatus(`${data.username} ${t('online.hasLeft')}`);
    }

    function onPerspectivesUpdated(data) {
        if (currentRoom) {
            currentRoom.perspectives = data.perspectives;
        }
        // 触发 UI 更新钩子
        if (window.Game.Online.SyncManager && window.Game.Online.SyncManager.onPerspectivesChanged) {
            window.Game.Online.SyncManager.onPerspectivesChanged(data.perspectives);
        }
    }

    function onRemoteGameStarted(data) {
        // 非房主收到游戏开始通知
        if (window.Game.Online.SyncManager) {
            window.Game.Online.SyncManager.onRemoteGameStart(data.gameConfig, data.gameState);
        }
    }

    function onDisconnected(data) {
        setStatus(t('online.disconnected'), 'error');
    }

    // ===== 工具函数 =====

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== 导出 =====

    window.Game.Online.RoomUI = {
        init,
        showOnlinePanel,
        hideOnlinePanel,
        renderRoomInfo,
        refreshRoomList,
        setStatus,
        get currentRoom() { return currentRoom; },
        set currentRoom(v) { currentRoom = v; }
    };

})();
