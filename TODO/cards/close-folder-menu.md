---
title: Close Folder Menu
type: feature
priority: medium
tags:
  - menu
  - workspace
  - ux
assignee: ai-agent
---

# Close Folder Menu

Add a menu bar action to close the current folder and return the app to the empty open-folder state.

## Spec

- Add `File -> Close Folder`.
- Stop the active workspace watch and clear the current workspace state.
- Return the app to the empty state without quitting the app.

## Checklist

- [x] Add a close-workspace action in frontend state management
- [x] Add a `Close Folder` file-menu item and menu dispatch
- [x] Run relevant verification and move this card to `Review`

## Review Notes

- The app already has `clearWorkspaceState()` and `stopWorkspaceWatch()` helpers in `src/composables/useWorkspace.ts`, so the feature should stay small.
- Added a `closeWorkspace()` action in `src/composables/useWorkspace.ts` that stops the active watch, clears the workspace, and removes the persisted workspace path.
- Wired `File -> Close Folder` with `Cmd/Ctrl+W` in `src-tauri/src/main.rs` and handled the menu action in `src/App.vue`.
- The app now returns to the empty open-folder state without quitting.

## Verification

- [x] `Close Folder` clears the current workspace without quitting the app
- [x] `npm run build`
- [x] `npm test`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
