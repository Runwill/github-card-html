(function() {
    window.Game = window.Game || {};

    // --- 游戏流程定义 ---
    // 节点类型: 'process' (容器), 'ticking' (语义持续时间), 'tick' (叶子计时点)
    
    const createStageProcess = (stageName) => {
        const capName = stageName.charAt(0).toUpperCase() + stageName.slice(1);
        return {
            type: 'process',
            name: `${stageName}StageProcess`,
            children: [
                { type: 'tick', name: `before${capName}StageStart` },
                {
                    type: 'ticking', // 从 'process' 更改为 'ticking'
                    name: `${stageName}Stage`,
                    children: [
                        { type: 'tick', name: `when${capName}StageStart` },
                        { type: 'tick', name: stageName }, // 核心动作计时点
                        { type: 'tick', name: `when${capName}StageFinish` }
                    ]
                },
                { type: 'tick', name: `after${capName}StageFinish` }
            ]
        };
    };

    const TurnProcess = {
        type: 'process',
        name: 'TurnProcess',
        children: [
            { type: 'tick', name: 'beforeTurnStart' },
            {
                type: 'ticking', // Changed from 'process' to 'ticking'
                name: 'Turn',
                children: [
                    { type: 'tick', name: 'whenTurnStart' },
                    createStageProcess('preparing'),
                    createStageProcess('dealing'),
                    createStageProcess('getting'),
                    createStageProcess('acting'),
                    createStageProcess('throwing'),
                    createStageProcess('concluding'),
                    { type: 'tick', name: 'whenTurnFinish' }
                ]
            },
            { type: 'tick', name: 'afterTurnFinish' }
        ]
    };

    const RoundProcess = {
        type: 'process',
        name: 'RoundProcess',
        children: [
            { type: 'tick', name: 'beforeRoundStart' },
            {
                type: 'ticking',
                name: 'Round', // round epithet=1
                children: [
                    { type: 'tick', name: 'whenRoundStart' },
                    TurnProcess,
                    { type: 'tick', name: 'whenRoundFinish' }
                ]
            },
            { type: 'tick', name: 'afterRoundFinish' }
        ]
    };

    const GameProcess = {
        type: 'process',
        name: 'GameProcess',
        children: [
            { type: 'tick', name: 'beforeGameStart' },
            { type: 'tick', name: 'whenGameStart' },
            RoundProcess
        ]
    };

    window.Game.Def = {
        GAME_FLOW: GameProcess,
        GameProcess,
        RoundProcess,
        TurnProcess
    };

})();
