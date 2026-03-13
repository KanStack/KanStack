# Landing Page Empty State Design

## Goal

Refresh the no-workspace landing state without losing the app's minimal feel.

## Approved Direction

- keep the existing single-panel empty-state layout in the app shell
- replace the old title and copy with clearer first-run text
- add a `New Board` action beside `Open Workspace`
- keep the styling restrained and consistent with the current monochrome UI

## Interaction Model

- `New Board` uses the existing board-creation flow
- if no workspace is currently open, creating a board should open the new board afterward
- `Open Workspace` keeps using the existing folder-opening flow

## Constraints

- preserve the current app shell structure instead of introducing a marketing-style landing page
- keep technical workspace details concise and readable
- avoid adding decorative sections or feature grids

## Verification

- the empty state shows both `New Board` and `Open Workspace`
- the copy explains what KanStack opens or creates in one short sentence
- creating a board from the empty state works without an already-open workspace
