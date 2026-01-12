(function() {
    window.Game = window.Game || {};

    // --- Game Flow Definitions ---
    // Node Types: 'process' (container), 'ticking' (semantic duration), 'tick' (leaf timing)
    
    const createStageProcess = (stageName) => {
        const capName = stageName.charAt(0).toUpperCase() + stageName.slice(1);
        return {
            type: 'process',
            name: `${stageName}StageProcess`,
            children: [
                { type: 'tick', name: `before${capName}StageStart` },
                {
                    type: 'ticking', // Changed from 'process' to 'ticking'
                    name: `${stageName}Stage`,
                    children: [
                        { type: 'tick', name: `when${capName}StageStart` },
                        { type: 'tick', name: stageName }, // The core action tick
                        { type: 'tick', name: `when${capName}StageFinish` }
                    ]
                },
                { type: 'tick', name: `after${capName}StageFinish` }
            ]
        };
    };

    const GAME_FLOW = {
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

    window.Game.Def = {
        GAME_FLOW
    };

})();
