# KanStack Board Navigation Design

## Goal

Replace the flat board selector with context-first navigation that reflects parent and sub-board relationships.

## Navigation Model

- the header shows a breadcrumb for the true parent chain only
- the current board is the final crumb and acts as the trigger for a context panel
- the context panel contains nearby navigation targets instead of every board in the workspace

## Header Behavior

- parent crumbs are clickable and navigate directly to that board
- clicking the current board crumb toggles a small panel
- the panel contains:
  - sibling boards
  - sub boards
  - `new sub board`
- `open folder` remains separate from board navigation

## Data Requirements

- derive parent-child relationships from each board's `subBoards` links
- expose current lineage, siblings, and children from `useWorkspace`
- treat boards with no parent as top-level boards for sibling calculations

## UX Notes

- keep the current board visually prominent
- hide empty sections in the context panel when there are no siblings or children
- on mobile, keep the breadcrumb visible and let the current-board trigger open the same panel below it

## Implementation

- replace the header `<select>` in `src/components/app/AppHeader.vue` with breadcrumb and context panel UI
- derive board navigation context inside `src/composables/useWorkspace.ts`
- move `new sub board` into the header panel and call the existing sub-board creation flow from the current board context

## Verification

- current board path renders correctly for nested boards
- parent crumb navigation works
- sibling and child board navigation works from the current-board panel
- `new sub board` still creates and opens the new board
