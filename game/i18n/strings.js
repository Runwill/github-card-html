(function(){
    const zh = {
        'game.round': '第 {n} 轮',
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
        'game.endActing': '结束出牌',

        'game.characterName': '角色名'
    };

    const en = {
        'game.round': 'Round {n}',
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
        'game.endActing': 'End Acting',

        'game.characterName': 'Character Name'
    };

    if (window.I18N_STRINGS) {
        Object.assign(window.I18N_STRINGS.zh, zh);
        Object.assign(window.I18N_STRINGS.en, en);
    } else {
        console.warn('I18N_STRINGS not found, game strings not loaded');
    }
})();
