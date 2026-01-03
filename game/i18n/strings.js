(function(){
    const zh = {
        'game.round': '第 {n} 轮',
        'game.start': '开始游戏',
        'game.endTurn': '结束回合',
        'game.hp': '体力: {hp}/{maxHp}',
        'game.handCards': '手牌',
        'game.otherCharacters': '其他角色',
        'game.characterName': '角色名',
    };

    const en = {
        'game.round': 'Round {n}',
        'game.start': 'Start Game',
        'game.endTurn': 'End Turn',
        'game.hp': 'HP: {hp}/{maxHp}',
        'game.handCards': 'Hand Cards',
        'game.otherCharacters': 'Other Characters',
        'game.characterName': 'Character Name',
    };

    if (window.I18N_STRINGS) {
        Object.assign(window.I18N_STRINGS.zh, zh);
        Object.assign(window.I18N_STRINGS.en, en);
    } else {
        console.warn('I18N_STRINGS not found, game strings not loaded');
    }
})();
