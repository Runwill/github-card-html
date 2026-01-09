# Interactions.js Refactoring

## Changes
To improve code readability without complicating the build system with multiple files:

1.  **Extracted `updatePlaceholderPosition`**: The logic for calculating where the placeholder (and thus the drop target) should move to has been pulled out of the monolithic `handlePointerMove` function.
2.  **Extracted `animateDropToPlaceholder`**: The logic for the "Fly to placeholder" animation and subsequent DOM cleanup has been pulled out of `finishDrag` into its own function.

## Benefits
- **Readability**: The main event handlers (`mousemove`, `mouseup`) now read like high-level logic flows rather than implementation details.
- **Maintainability**: If we want to change *how* sorting detection works (e.g. from mouse position to intersection ratio), we only change `updatePlaceholderPosition`.
- **Length**: The file length is roughly the same, but the cognitive load per function is drastically reduced.
