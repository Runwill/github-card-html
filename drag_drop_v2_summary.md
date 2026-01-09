# Drag and Drop V2: "One Element" Motion

## Concept
To ensure perfect visual continuity, we switched from "Drag -> Drop -> Re-render -> Animate" to "Drag -> Drop -> Animate to Placeholder -> Update Data/UI".
The key changes are:

1.  **Live Placeholder Sorting**:
    During drag, the `placeholder` element now actually moves in the DOM as you hover over other cards. This gives immediate visual feedback of where the card will land.

2.  **Animation BEFORE Data Update**:
    When the user drops, we do NOT immediately call the backend/UI update.
    First, we animate the floating card to the exact position of the `placeholder` (which is already in the correct DOM spot).
    Once the card visually "snaps" purely into the placeholder's slot, only *then* do we trigger `onCardDrop`.
    
3.  **Seamless Handover**:
    When `onCardDrop` fires, the UI re-renders. But since the card was already visually at the correct destination, the replacement happens instantly and invisibly to the user.

## Files Modified
- `game/scripts/ui/interactions.js`
