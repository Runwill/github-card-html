(function() {
    window.Game = window.Game || {};
    
    // Ensure Models are loaded
    const Area = window.Game.Models && window.Game.Models.Area;

     // Mock Data for Characters
     const mockCharacters = [
        { name: "Character A", hp: 4, maxHp: 4, avatar: "source/青龙.png.bak" },
        { name: "Character B", hp: 3, maxHp: 3, avatar: "source/白虎_君主.png.bak" },
        { name: "Character C", hp: 4, maxHp: 4, avatar: "source/朱雀.png.bak" },
        { name: "Character D", hp: 3, maxHp: 3, avatar: "source/玄武_君主.png.bak" }
    ];

    // Game State
    window.Game.GameState = {
        players: [],
        currentPlayerIndex: 0,
        round: 1,
        isGameRunning: false,
        isPaused: false,
        
        // Areas will be initialized immediately if Area class is available
        pile: null, 
        discardPile: null,
        treatmentArea: null,

        // Stack of active nodes (indices in their parent's children array)
        flowStack: [],
        
        // Dynamic Event Stack (for events like Damage, Recover, etc.)
        // Each item is an object: { type: 'event', name: 'damage', steps: [], currentStepIndex: 0, context: {} }
        eventStack: []
    };

    if (Area) {
        window.Game.GameState.pile = new Area('pile', { apartOrTogether: 1, forOrAgainst: 1 });
        window.Game.GameState.discardPile = new Area('discardPile', { apartOrTogether: 1, forOrAgainst: 0 });
        window.Game.GameState.treatmentArea = new Area('treatmentArea', { apartOrTogether: 0, forOrAgainst: 0 });
    } else {
        console.error("Game.Models.Area not found during State initialization. Make sure models.js is loaded before state.js");
    }

    // Expose Mock Data
    window.Game.MockData = {
        mockCharacters
    };

})();
