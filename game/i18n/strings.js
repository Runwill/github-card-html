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

        // Areas
        'game.area.treatmentArea': '处理区',
        'game.area.hand': '手牌',
        'game.area.equipArea': '装备区',
        'game.area.judgeArea': '判定区',

        'game.timing.beforeTurnStart': '回合开始前',
        'game.timing.whenTurnStart': '回合开始时',
        'game.timing.whenTurnFinish': '回合结束时',
        'game.timing.afterTurnFinish': '回合结束后',

        // Preparing Stage
        'game.timing.beforePreparingStageStart': '准备阶段开始前',
        'game.timing.whenPreparingStageStart': '准备阶段开始时',
        'game.timing.preparing': '准备阶段',
        'game.timing.whenPreparingStageFinish': '准备阶段结束时',
        'game.timing.afterPreparingStageFinish': '准备阶段结束后',

        // Dealing Stage
        'game.timing.beforeDealingStageStart': '判定阶段开始前',
        'game.timing.whenDealingStageStart': '判定阶段开始时',
        'game.timing.dealing': '判定阶段',
        'game.timing.whenDealingStageFinish': '判定阶段结束时',
        'game.timing.afterDealingStageFinish': '判定阶段结束后',

        // Getting Stage
        'game.timing.beforeGettingStageStart': '摸牌阶段开始前',
        'game.timing.whenGettingStageStart': '摸牌阶段开始时',
        'game.timing.getting': '摸牌阶段',
        'game.timing.whenGettingStageFinish': '摸牌阶段结束时',
        'game.timing.afterGettingStageFinish': '摸牌阶段结束后',

        // Acting Stage
        'game.timing.beforeActingStageStart': '出牌阶段开始前',
        'game.timing.whenActingStageStart': '出牌阶段开始时',
        'game.timing.acting': '出牌阶段',
        'game.timing.whenActingStageFinish': '出牌阶段结束时',
        'game.timing.afterActingStageFinish': '出牌阶段结束后',

        // Throwing Stage
        'game.timing.beforeThrowingStageStart': '弃牌阶段开始前',
        'game.timing.whenThrowingStageStart': '弃牌阶段开始时',
        'game.timing.throwing': '弃牌阶段',
        'game.timing.whenThrowingStageFinish': '弃牌阶段结束时',
        'game.timing.afterThrowingStageFinish': '弃牌阶段结束后',

        // Concluding Stage
        'game.timing.beforeConcludingStageStart': '结束阶段开始前',
        'game.timing.whenConcludingStageStart': '结束阶段开始时',
        'game.timing.concluding': '结束阶段',
        'game.timing.whenConcludingStageFinish': '结束阶段结束时',
        'game.timing.afterConcludingStageFinish': '结束阶段结束后',

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

        'game.timing.beforeTurnStart': 'Before Turn Start',
        'game.timing.whenTurnStart': 'When Turn Start',
        'game.timing.whenTurnFinish': 'When Turn Finish',
        'game.timing.afterTurnFinish': 'After Turn Finish',

        // Preparing Stage
        'game.timing.beforePreparingStageStart': 'Before Preparing Stage Start',
        'game.timing.whenPreparingStageStart': 'When Preparing Stage Start',
        'game.timing.preparing': 'Preparing Stage',
        'game.timing.whenPreparingStageFinish': 'When Preparing Stage Finish',
        'game.timing.afterPreparingStageFinish': 'After Preparing Stage Finish',

        // Dealing Stage
        'game.timing.beforeDealingStageStart': 'Before Dealing Stage Start',
        'game.timing.whenDealingStageStart': 'When Dealing Stage Start',
        'game.timing.dealing': 'Dealing Stage',
        'game.timing.whenDealingStageFinish': 'When Dealing Stage Finish',
        'game.timing.afterDealingStageFinish': 'After Dealing Stage Finish',

        // Getting Stage
        'game.timing.beforeGettingStageStart': 'Before Getting Stage Start',
        'game.timing.whenGettingStageStart': 'When Getting Stage Start',
        'game.timing.getting': 'Getting Stage',
        'game.timing.whenGettingStageFinish': 'When Getting Stage Finish',
        'game.timing.afterGettingStageFinish': 'After Getting Stage Finish',

        // Acting Stage
        'game.timing.beforeActingStageStart': 'Before Acting Stage Start',
        'game.timing.whenActingStageStart': 'When Acting Stage Start',
        'game.timing.acting': 'Acting Stage',
        'game.timing.whenActingStageFinish': 'When Acting Stage Finish',
        'game.timing.afterActingStageFinish': 'After Acting Stage Finish',

        // Throwing Stage
        'game.timing.beforeThrowingStageStart': 'Before Throwing Stage Start',
        'game.timing.whenThrowingStageStart': 'When Throwing Stage Start',
        'game.timing.throwing': 'Throwing Stage',
        'game.timing.whenThrowingStageFinish': 'When Throwing Stage Finish',
        'game.timing.afterThrowingStageFinish': 'After Throwing Stage Finish',

        // Concluding Stage
        'game.timing.beforeConcludingStageStart': 'Before Concluding Stage Start',
        'game.timing.whenConcludingStageStart': 'When Concluding Stage Start',
        'game.timing.concluding': 'Concluding Stage',
        'game.timing.whenConcludingStageFinish': 'When Concluding Stage Finish',
        'game.timing.afterConcludingStageFinish': 'After Concluding Stage Finish',

        'game.characterName': 'Character Name'
    };

    if (window.I18N_STRINGS) {
        Object.assign(window.I18N_STRINGS.zh, zh);
        Object.assign(window.I18N_STRINGS.en, en);
    } else {
        console.warn('I18N_STRINGS not found, game strings not loaded');
    }
})();
