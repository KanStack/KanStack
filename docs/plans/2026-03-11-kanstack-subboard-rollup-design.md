# Kanstack Sub-board Rollup Design

## Goal

Let parent boards show cards from descendant boards while keeping the board view simple, readable, and markdown-first.

## Core Behavior

- sub-board rollup is recursive
- a parent board can show cards from all descendant boards
- rolled-up cards render in the same columns and sections as local cards
- rolled-up cards include a small source indicator so they can be distinguished from local cards

## Initial UX

- add a simple toggle in the board header for sub-board visibility
- the toggle controls whether descendant-board cards are included in the current board view
- the toggle state is persisted in the board `%% kanban:settings` block
- local cards always remain visible
- when sub-board items are visible, child-board cards appear inline in their matching columns and sections

## Scope for v1

- one toggle only: sub-boards on or off
- recursive traversal across all descendants
- no per-child board selector yet
- no separate grouped child-board area
- no custom rollup filters yet

## Rendering Rules

- local cards keep their current appearance
- rolled-up cards use the same card component
- rolled-up cards add a small source badge such as the child board slug or title
- local cards should sort ahead of rolled-up cards when they share the same section unless the board later defines a different order rule

## Data Model Direction

- keep the parser schema unchanged for now
- derive rollup data in the frontend view model layer
- build a recursive board graph from `subBoards`
- flatten descendant cards into the parent board view only when the toggle is enabled
- attach lightweight view metadata to rolled-up cards, such as `sourceBoardSlug`, `sourceBoardTitle`, and `isRolledUp`

## Safety Rules

- guard against cycles in recursive sub-board links
- do not duplicate the same board twice in one rollup traversal
- if a descendant board is missing, skip it and continue rendering the rest of the view

## Why This Stays Minimal

- no schema migration is required
- no board file changes are required
- the base board rendering path stays intact
- the toggle is a view concern rather than a persistence concern

## Verification

- toggling sub-boards on should include descendant cards recursively
- toggling sub-boards off should return to local-only board rendering
- rolled-up cards should show a visible source indicator
- cycles in sub-board links should not crash the UI or loop forever
