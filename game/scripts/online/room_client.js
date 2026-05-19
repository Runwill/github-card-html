/**
 * Online Room Client
 * Socket.IO 客户端，管理与服务器的房间通信
 */
(function () {
    window.Game = window.Game || {};
    window.Game.Online = window.Game.Online || {};

    let socket = null;
    let currentRoomId = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 5;

    // 事件回调注册
    const eventHandlers = {};

    function on(event, handler) {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
    }

    function off(event, handler) {
        if (!eventHandlers[event]) return;
        if (handler) {
            eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
        } else {
            delete eventHandlers[event];
        }
    }

    function emit(event, data) {
        if (!eventHandlers[event]) return;
        eventHandlers[event].forEach(h => {
            try { h(data); } catch (e) { console.error(`[Online] Event handler error for ${event}:`, e); }
        });
    }

    /**
     * 获取当前用户信息
     */
    function getUserInfo() {
        return {
            userId: localStorage.getItem('id') || `guest_${Date.now()}`,
            username: localStorage.getItem('username') || '未命名用户'
        };
    }

    /**
     * 连接到服务器
     */
    function connect() {
        if (socket && socket.connected) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const baseUrl = window.endpoints ? window.endpoints.getBase() : 'http://localhost:3000';

            // socket.io-client 通过 CDN 加载
            if (typeof io === 'undefined') {
                console.error('[Online] Socket.IO client not loaded');
                reject(new Error('Socket.IO client not loaded'));
                return;
            }

            socket = io(baseUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnectionAttempts: MAX_RECONNECT
            });

            socket.on('connect', () => {
                console.log('[Online] 已连接到服务器');
                isConnected = true;
                reconnectAttempts = 0;
                emit('connected');
                resolve();
            });

            socket.on('disconnect', (reason) => {
                console.log('[Online] 断开连接:', reason);
                isConnected = false;
                emit('disconnected', { reason });
            });

            socket.on('connect_error', (err) => {
                console.error('[Online] 连接错误:', err.message);
                reconnectAttempts++;
                if (reconnectAttempts >= MAX_RECONNECT) {
                    reject(new Error('连接失败'));
                }
                emit('error', { message: err.message });
            });

            // 服务器事件监听
            socket.on('room:user-joined', (data) => emit('userJoined', data));
            socket.on('room:user-left', (data) => emit('userLeft', data));
            socket.on('room:dissolved', (data) => {
                // 房间被房主解散
                if (currentRoomId === data.roomId) {
                    currentRoomId = null;
                }
                emit('roomDissolved', data);
            });
            socket.on('room:perspectives-updated', (data) => emit('perspectivesUpdated', data));
            socket.on('room:config-updated', (data) => emit('configUpdated', data));
            socket.on('room:option-updated', (data) => emit('roomOptionUpdated', data));
            socket.on('room:game-started', (data) => emit('gameStarted', data));
            socket.on('game:action', (data) => emit('gameAction', data));
            socket.on('game:state-updated', (data) => emit('stateUpdated', data));
        });
    }

    /**
     * 断开连接
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        isConnected = false;
        currentRoomId = null;
    }

    function socketRequest(eventName, payload, handler) {
        return new Promise((resolve, reject) => {
            if (!socket || !socket.connected) {
                reject(new Error('未连接到服务器'));
                return;
            }
            const done = (response) => handler(response, resolve, reject);
            if (payload === undefined) socket.emit(eventName, done);
            else socket.emit(eventName, payload, done);
        });
    }

    function emitInRoom(eventName, payload) {
        if (!socket || !socket.connected || !currentRoomId) return;
        socket.emit(eventName, payload);
    }

    function requestRoom(eventName, roomId, fallbackError) {
        return socketRequest(eventName, { roomId, userInfo: getUserInfo() }, (response, resolve, reject) => {
            if (response.success) {
                currentRoomId = roomId;
                resolve(response);
            } else {
                reject(new Error(response.error || fallbackError));
            }
        });
    }

    /**
     * 创建房间
     */
    function createRoom(roomId) {
        return requestRoom('room:create', roomId, '创建房间失败');
    }

    /**
     * 加入房间
     */
    function joinRoom(roomId) {
        return requestRoom('room:join', roomId, '加入房间失败');
    }

    /**
     * 离开房间
     */
    function leaveRoom() {
        return new Promise((resolve) => {
            if (!socket || !socket.connected) {
                currentRoomId = null;
                resolve();
                return;
            }

            socket.emit('room:leave', () => {
                currentRoomId = null;
                resolve();
            });
        });
    }

    /**
     * 解散房间（房主专用）
     */
    function dissolveRoom(roomId) {
        return socketRequest('room:dissolve', { roomId }, (response, resolve, reject) => {
            if (response.success) {
                if (currentRoomId === roomId) currentRoomId = null;
                resolve(response);
            } else {
                reject(new Error(response.error || '解散房间失败'));
            }
        });
    }

    /**
     * 获取房间列表
     */
    function listRooms() {
        return socketRequest('room:list', undefined, (rooms, resolve) => resolve(rooms));
    }

    /**
     * 设置视角
     */
    function setPerspective(perspectiveIndex) {
        emitInRoom('room:set-perspective', { perspectiveIndex });
    }

    /**
     * 广播游戏动作
     */
    function broadcastAction(actionType, payload) {
        emitInRoom('game:action', {
            actionType,
            payload,
            timestamp: Date.now()
        });
    }

    /**
     * 同步完整游戏状态
     */
    function syncFullState(gameState) {
        emitInRoom('game:sync-state', { gameState });
    }

    /**
     * 通知游戏开始
     */
    function notifyGameStart(gameConfig, gameState) {
        emitInRoom('room:start-game', {
            roomId: currentRoomId,
            gameConfig,
            gameState
        });
    }

    /**
     * 更新房间选项（如允许旁观）
     */
    function updateRoomOption(key, value) {
        emitInRoom('room:update-option', { key, value });
    }

    /**
     * 更新游戏配置
     */
    function updateConfig(config) {
        emitInRoom('room:update-config', {
            roomId: currentRoomId,
            config
        });
    }

    // 导出 API
    window.Game.Online.RoomClient = {
        connect,
        disconnect,
        createRoom,
        joinRoom,
        leaveRoom,
        dissolveRoom,
        listRooms,
        setPerspective,
        broadcastAction,
        syncFullState,
        notifyGameStart,
        updateRoomOption,
        updateConfig,
        getUserInfo,
        on,
        off,
        get isConnected() { return isConnected; },
        get currentRoomId() { return currentRoomId; },
        get socket() { return socket; }
    };

})();
