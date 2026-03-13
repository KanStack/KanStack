# Example Workspace Refresh Design

## Goal

Replace the existing example workspace with a single realistic board that reflects the actual shipped state of the current `KanStack` app and a small amount of believable next-step work.

## Shape

- one board only: `Example Workspace/boards/todo.md`
- flat columns only: `Backlog`, `In Progress`, `Review`, `Done`
- no sub-boards
- no task groups
- card files named from their titles using the app's current title-driven slug model

## Content Strategy

- `Done` captures shipped project progress already visible in the app and repo history
- `Review` captures implemented work still being tightened or validated
- `In Progress` captures believable active polish work
- `Backlog` captures concrete next steps that naturally follow from the shipped app

## Card Themes

- app shell and markdown workspace loading
- workspace watching and refresh behavior
- autosave card editing
- title-based rename with link updates
- delete flow
- pointer-based drag and drop
- drag ghost and drop-target polish
- monochrome theme cleanup
- new card flow

## Constraints

- example copy should read like real project work, not generic demo filler
- cards should align with the current product state after recent fixes
- filenames, board links, and titles should remain consistent with title-derived card paths

## Verification

- `Example Workspace/boards/todo.md` should reference only card files that exist
- no `## Sub Boards` block
- no `###` subgroup headings
- cards should map cleanly into the current single-board app model
