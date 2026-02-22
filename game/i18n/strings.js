(function(){
    const zh = {
        'game.start': '开始游戏',
        'game.setup': '游戏设置',
        'game.setup.playerCount': '角色人数',
        'game.setup.cardPreset': '牌堆预设',
        'game.setup.start': '确认开始',
        'game.pause': '暂停游戏',
        'game.resume': '恢复游戏',
        'game.endTurn': '结束回合',
        'game.nextStep': '下一步',
        'game.playCard': '使用/打出牌',

        // Online Room
        'online.room': '在线房间',
        'online.title': '在线房间',
        'online.roomId': '房间ID',
        'online.create': '创建房间',
        'online.creating': '创建中…',
        'online.joining': '加入中…',
        'online.refresh': '刷新',
        'online.roomList': '房间列表',
        'online.noRooms': '暂无房间',
        'online.join': '加入',
        'online.players': '人',
        'online.gaming': '游戏中',
        'online.waiting': '等待中',
        'online.leave': '离开房间',
        'online.currentRoom': '当前房间：',
        'online.sandboxHint': '在线模式下固定为 Sandbox 模式，请通过「游戏设置」选择武将和牌堆后开始游戏。',
        'online.connecting': '连接中…',
        'online.connected': '已连接',
        'online.disconnected': '已断开',
        'online.connectFailed': '连接失败',
        'online.roomCreated': '房间已创建',
        'online.joined': '已加入房间',
        'online.left': '已离开房间',
        'online.host': '房主',
        'online.you': '(你)',
        'online.hasJoined': ' 加入了房间',
        'online.hasLeft': ' 离开了房间',
        'online.back': '返回',
        'online.enterRoomId': '请输入房间ID',
        'online.notConnected': '未连接到服务器'
    };

    const en = {
        'game.start': 'Start Game',
        'game.setup': 'Game Setup',
        'game.setup.playerCount': 'Player Count',
        'game.setup.cardPreset': 'Card Preset',
        'game.setup.start': 'Confirm Start',
        'game.pause': 'Pause Game',
        'game.resume': 'Resume Game',
        'game.endTurn': 'End Turn',
        'game.nextStep': 'Next Step',
        'game.playCard': 'Use/Play Card',

        // Online Room
        'online.room': 'Online Room',
        'online.title': 'Online Room',
        'online.roomId': 'Room ID',
        'online.create': 'Create',
        'online.creating': 'Creating…',
        'online.joining': 'Joining…',
        'online.refresh': 'Refresh',
        'online.roomList': 'Room List',
        'online.noRooms': 'No rooms available',
        'online.join': 'Join',
        'online.players': 'players',
        'online.gaming': 'In Game',
        'online.waiting': 'Waiting',
        'online.leave': 'Leave Room',
        'online.currentRoom': 'Current Room: ',
        'online.sandboxHint': 'Online mode uses Sandbox mode. Choose characters and card presets in Game Setup to start.',
        'online.connecting': 'Connecting…',
        'online.connected': 'Connected',
        'online.disconnected': 'Disconnected',
        'online.connectFailed': 'Connection Failed',
        'online.roomCreated': 'Room created',
        'online.joined': 'Joined room',
        'online.left': 'Left room',
        'online.host': 'Host',
        'online.you': '(you)',
        'online.hasJoined': ' joined the room',
        'online.hasLeft': ' left the room',
        'online.back': 'Back',
        'online.enterRoomId': 'Enter Room ID',
        'online.notConnected': 'Not connected to server'
    };

    if (window.I18N_STRINGS) {
        Object.assign(window.I18N_STRINGS.zh, zh);
        Object.assign(window.I18N_STRINGS.en, en);
    } else {
        console.warn('I18N_STRINGS not found, game strings not loaded');
    }
})();
