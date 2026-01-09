# Drag and Drop Issue Analysis

## Issues Identified
1. **Disappearing Card causing by Swap:** caused by a race condition where the UI re-render (triggered by backend update) took longer than the hardcoded 10ms timeout. The code would then fail to find the new card element in the DOM (or find the wrong one) and improperly handle the animation cleanup, leading to the card disappearing.
2. **Jump/Glitch at Drop:** caused by using `getBoundingClientRect()` on the rotated (dragged) element to calculate the starting position for the drop animation. The bounding box of a rotated element is different from its visual center/origin, causing a visual "snap" when the rotation is removed.

## Solutions Applied
1. **Implemented Polling (`waitForDropAndAnimate`):** Instead of a fixed 10ms wait, the code now intelligently polls the DOM (up to 500ms) to wait for the new card element to appear.
2. **Improved Target Matching:** The card matching logic now checks neighbors of the target index and then falls back to scanning all children by text content, ensuring the correct card is found even if indices shift.
3. **Fixed Coordinate Calculation:** The "From" position for the animation is now calculated using `DragState.initial` + `DragState.current` (translation), which is independent of the element's rotation. This eliminates the visual jump when the card snaps into place.
