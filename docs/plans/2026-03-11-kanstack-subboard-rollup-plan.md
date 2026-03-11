# Kanstack Sub-board Rollup Implementation Plan

## Phase 1: Recursive View Model

- create a derived board view helper that can walk descendant boards recursively
- detect and skip cycles or duplicate descendant boards
- return merged columns and sections for the active board view

## Phase 2: Toggle State

- add a simple sub-board toggle to the board header
- default the toggle to on or off based on the most sensible reading experience
- keep the toggle local UI state for now

## Phase 3: Card Rendering

- extend the rendered card shape with rollup metadata
- show a small source indicator on rolled-up cards
- preserve the existing card click/edit flow

## Phase 4: Verification

- test parent boards with nested descendants
- test missing child boards
- test cycles
- run `npm run build`
