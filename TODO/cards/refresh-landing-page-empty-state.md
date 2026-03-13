---
title: Refresh Landing Page Empty State
type: feature
priority: medium
assignee: AGENT
tags:
  - ui
  - onboarding
---

# Refresh Landing Page Empty State

Refresh the app landing page/empty state with clearer text and a more useful first-action layout.

## Spec

- Rework the no-workspace landing state in the app shell.
- Add a visible `New Board` action alongside the existing workspace-opening flow.
- Update the copy so the first-run state explains KanStack more clearly.

## Checklist

- [x] Inspect the current empty-state layout and supporting actions
- [x] Confirm the desired direction for the landing page refresh
- [x] Propose a few layout/copy approaches with a recommendation
- [x] Write an approved design before implementation
- [x] Implement the approved minimal landing page refresh
- [x] Verify the new landing page actions and text

## Review Notes

- Kept the existing single-panel empty-state layout and refreshed only the title, copy, and actions.
- Added a visible `New Board` action beside `Open Workspace` without turning the screen into a marketing-style landing page.
- Updated board creation so creating a board from the empty state works even when no workspace is already open.

## Verification

- [x] `npm run build`
- [x] `cargo check --manifest-path "src-tauri/Cargo.toml"`
- [x] Confirmed the empty state now exposes both `New Board` and `Open Workspace` in `src/App.vue`
- [x] Confirmed new-board creation now falls back to default starter columns and opens the created board when launched from the empty state
