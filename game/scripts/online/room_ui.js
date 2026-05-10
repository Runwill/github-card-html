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
    let isSpectating = false;

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

        // 回车键 = 点击创建房间
        const roomInput = document.getElementById('input-room-id');
        if (roomInput) {
            roomInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateRoom();
                }
            });
        }

        const refreshBtn = document.getElementById('btn-refresh-rooms');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshRoomList);
        }

        const leaveBtn = document.getElementById('btn-leave-room');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', handleLeaveRoom);
        }

        const backBtn = document.getElementById('btn-back-lobby');
        if (backBtn) {
            backBtn.addEventListener('click', handleBackToLobby);
        }

        const spectateBtn = document.getElementById('btn-spectate');
        if (spectateBtn) {
            spectateBtn.addEventListener('click', handleToggleSpectate);
        }

        // 注册事件回调
        const client = Client();
        if (client) {
            client.on('userJoined', onUserJoined);
            client.on('userLeft', onUserLeft);
            client.on('perspectivesUpdated', onPerspectivesUpdated);
            client.on('roomOptionUpdated', onRoomOptionUpdated);
            client.on('gameStarted', onRemoteGameStarted);
            client.on('disconnected', onDisconnected);
            client.on('roomDissolved', onRoomDissolved);
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

        setStatus(t('online.connecting'));

        try {
            const client = Client();
            await client.connect();
            setStatus(t('online.connected'));

            // 优先进入当前所在的房间，否则显示大厅
            if (currentRoom) {
                showInRoom();
                renderRoomInfo();
            } else {
                showLobby();
            }

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

        const myId = localStorage.getItem('id');
        const myCurrentRoomId = Client() ? Client().currentRoomId : null;

        list.innerHTML = rooms.map(room => {
            const isCurrent = myCurrentRoomId && room.id === myCurrentRoomId;
            const isHost = myId && room.host === myId;
            // 已在此房间：显示"进入"按钮（不同样式）；否则显示"加入"
            const joinBtnClass = isCurrent ? 'btn btn--sm btn--success btn--lift btn-enter-room' : 'btn btn--sm btn--primary btn--lift btn-join-room';
            const joinBtnText = isCurrent ? t('online.enter') : t('online.join');
            const noSpectate = room.allowSpectate === false;
            return `
            <div class="room-item${isCurrent ? ' is-current' : ''}" data-room-id="${escapeHtml(room.id)}">
                <div class="room-item-info">
                    <span class="room-item-name">${escapeHtml(room.id)}</span>
                    <span class="room-item-status">
                        <span class="room-item-users">${room.userCount} ${t('online.players')}</span>
                        ${room.gameStarted ? `<span class="room-item-tag gaming">${t('online.gaming')}</span>` : `<span class="room-item-tag waiting">${t('online.waiting')}</span>`}
                        ${noSpectate ? `<span class="room-item-tag no-spectate">禁止旁观</span>` : ''}
                    </span>
                </div>
                <div class="room-item-actions">
                    ${isHost ? `<button class="btn btn--sm btn--danger btn--lift btn-dissolve-room">${t('online.dissolve')}</button>` : ''}
                    <button class="${joinBtnClass}">${joinBtnText}</button>
                </div>
            </div>`;
        }).join('');

        // 绑定加入按钮
        list.querySelectorAll('.btn-join-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.closest('.room-item').dataset.roomId;
                handleJoinRoom(roomId);
            });
        });

        // 绑定进入按钮（已在房间中，直接切换到房间内视图）
        list.querySelectorAll('.btn-enter-room').forEach(btn => {
            btn.addEventListener('click', () => {
                showInRoom();
                renderRoomInfo();
            });
        });

        // 绑定解散按钮
        list.querySelectorAll('.btn-dissolve-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.closest('.room-item').dataset.roomId;
                handleDissolveRoom(roomId);
            });
        });
    }

    async function leaveCurrentRoom(client) {
        if (currentRoom && client) {
            try { await client.leaveRoom(); } catch (_) { /* ignore */ }
            currentRoom = null;
        }
        if (window.Game.Online.SyncManager && window.Game.Online.SyncManager.clearPerspectives) {
            window.Game.Online.SyncManager.clearPerspectives();
        }
    }

    function setOnlineMode(enabled) { if (window.Game.GameState) window.Game.GameState.onlineMode = enabled; }

    function enterRoom(result) {
        currentRoom = result.room;
        setOnlineMode(true);
        if (currentRoom.perspectives && window.Game.Online.SyncManager) {
            window.Game.Online.SyncManager.onPerspectivesChanged(currentRoom.perspectives);
        }
        showInRoom();
        renderRoomInfo();
    }

    function returnToLobbyAfterRoomExit() {
        currentRoom = null;
        setOnlineMode(false);
        if (window.Game.Online.SyncManager && window.Game.Online.SyncManager.clearPerspectives) {
            window.Game.Online.SyncManager.clearPerspectives();
        }
        showLobby();
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

        await leaveCurrentRoom(client);

        try {
            setStatus(t('online.creating'));
            const result = await client.createRoom(roomId);
            enterRoom(result);
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

        await leaveCurrentRoom(client);

        try {
            setStatus(t('online.joining'));
            const result = await client.joinRoom(roomId);
            enterRoom(result);
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
     * 解散房间（房主专用）
     */
    async function handleDissolveRoom(roomId) {
        const client = Client();
        if (!client || !client.isConnected) return;

        try {
            await client.dissolveRoom(roomId);
            // 如果自己正在这个房间里，清除状态
            if (currentRoom && currentRoom.id === roomId) {
                returnToLobbyAfterRoomExit();
            }
            setStatus(t('online.roomDissolved'));
            refreshRoomList();
        } catch (e) {
            setStatus(e.message, 'error');
        }
    }

    /**
     * 返回大厅（不离开房间）
     */
    function handleBackToLobby() {
        showLobby();
        refreshRoomList();
    }

    /**
     * 离开房间
     */
    async function handleLeaveRoom() {
        const client = Client();
        if (client) {
            await client.leaveRoom();
        }
        returnToLobbyAfterRoomExit();
        setStatus(t('online.left'));
        refreshRoomList();
    }

    /**
     * 切换旁观模式
     */
    function handleToggleSpectate() {
        isSpectating = !isSpectating;
        if (window.Game.GameState) {
            window.Game.GameState.isSpectating = isSpectating;
        }

        // 立即更新本地房间数据中的旁观状态
        if (currentRoom && currentRoom.users) {
            const myId = localStorage.getItem('id');
            if (myId && currentRoom.users[myId]) {
                currentRoom.users[myId].spectating = isSpectating;
            }
        }

        // 更新本地 perspectives 中的旁观标记（使 viewer label 渲染旁观样式）
        const SyncManager = window.Game.Online && window.Game.Online.SyncManager;
        if (SyncManager && SyncManager.updateLocalSpectating) {
            SyncManager.updateLocalSpectating(isSpectating);
        }

        // 广播旁观状态给房间
        const client = Client();
        if (client && client.isConnected) {
            client.broadcastAction('spectateToggle', { spectating: isSpectating });
        }

        renderRoomInfo();
        // 刷新游戏 UI 以更新头像上的 viewer label
        if (window.Game.UI && window.Game.UI.updateUI) {
            window.Game.UI.updateUI();
        }
    }

    /**

     * 渲染房间内信息
     */
    function renderRoomInfo() {
        if (!currentRoom) return;

        const nameEl = document.getElementById('current-room-name');
        if (nameEl) nameEl.textContent = currentRoom.id;

        // 更新旁观按钮可见性
        const spectateBtn = document.getElementById('btn-spectate');
        if (spectateBtn) {
            const allowSpectate = currentRoom.allowSpectate !== false; // default true
            if (allowSpectate) {
                spectateBtn.classList.remove('hidden');
                spectateBtn.textContent = isSpectating ? t('online.cancelSpectate') : t('online.spectate');
                spectateBtn.classList.toggle('is-active', isSpectating);
            } else {
                spectateBtn.classList.add('hidden');
                // 如果旁观被关闭，重置旁观状态
                if (isSpectating) {
                    isSpectating = false;
                    if (window.Game.GameState) window.Game.GameState.isSpectating = false;
                }
            }
        }

        // 房间内禁止旁观提示
        const noSpectateHint = document.getElementById('room-no-spectate-hint');
        if (noSpectateHint) {
            const allowed = currentRoom.allowSpectate !== false;
            noSpectateHint.classList.toggle('hidden', allowed);
        }

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
            <div class="room-user ${userId === myId ? 'room-user-self' : ''} ${info.spectating ? 'room-user-spectating' : ''}">
                <span class="room-user-name">${escapeHtml(info.username)}</span>
                ${userId === currentRoom.host ? `<span class="room-user-badge host">${t('online.host')}</span>` : ''}
                ${userId === myId ? `<span class="room-user-badge self">${t('online.you')}</span>` : ''}
                ${info.spectating ? `<span class="room-user-spectate-icon" title="${t('online.spectating')}">👁</span>` : ''}
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
        if (data.userId && window.Game.Online.SyncManager && window.Game.Online.SyncManager.removeUserFromPerspectives) {
            window.Game.Online.SyncManager.removeUserFromPerspectives(data.userId);
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

    function onRoomOptionUpdated(data) {
        if (!currentRoom) return;
        if (data.key === 'allowSpectate') {
            currentRoom.allowSpectate = data.value;
            // 同步设置面板上的 toggle 状态
            const toggle = document.getElementById('setup-allow-spectate-toggle');
            if (toggle) {
                toggle.dataset.value = String(!!data.value);
                toggle.textContent = data.value ? '是' : '否';
                toggle.classList.toggle('is-active', !!data.value);
            }
        }
        renderRoomInfo();
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

    function onRoomDissolved(data) {
        // 被房主解散的房间 — 回到大厅
        if (currentRoom && currentRoom.id === data.roomId) {
            returnToLobbyAfterRoomExit();
        }
        setStatus(t('online.roomDissolved'));
        refreshRoomList();
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
        set currentRoom(v) { currentRoom = v; },
        get isSpectating() { return isSpectating; },
        set isSpectating(v) { isSpectating = v; }
    };

})();
