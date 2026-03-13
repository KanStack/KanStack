---
title: Reorganize Menu Items
type: feature
priority: medium
assignee: AGENT
tags:
  - menu
  - ux
---

# Reorganize Menu Items

Reorganize and recategorize the native app menu so actions are grouped more clearly and match how the app is used.

## Spec

- Review the current Tauri menu layout and related keyboard/menu dispatch behavior.
- Define a clearer grouping model for workspace, board, and card actions.
- Preserve existing actions unless the approved design explicitly removes or renames them.
- Remove the unused `Open Selected` and `Close Editor` native menu items from the `Card` menu.

## Checklist

- [x] Inspect current menu structure and supporting docs
- [x] Confirm desired reorganization direction
- [x] Propose menu grouping options with a recommendation
- [x] Write an approved design before implementation
- [x] Implement the approved menu grouping in Tauri
- [x] Verify the new menu layout and accelerators

## Review Notes

- Reorganized the native menu into `File`, `Edit`, `Board`, `Column`, and `Card` top-level groups, with board creation and attachment actions living under `Board`.
- Added `About KanStack` under the app-named `KanStack` menu and wired it to the native macOS about panel with custom icon and credits metadata.
- Synced the Tauri bundle version with the app package version and adjusted the native about metadata so the panel shows a single version value.
- Final tweak: set the native about metadata so macOS renders `Version 0.5.0` without the duplicate `(0.5.0)` suffix.
- Simplified the native about implementation to use Tauri's built-in about item plus bundled `Credits.html` instead of custom Objective-C bindings.
- Kept existing action IDs and accelerators so frontend dispatch behavior stays unchanged.
- Updated the menu design doc and the shortcuts/menu planning doc to match the shipped structure.
- Removed the unused `Open Selected` and `Close Editor` entries from the native `Card` menu.
- Changed selected-card shortcuts so `Delete` archives and `Shift+Delete` deletes.
- Follow-up: removed the standalone `Workspace` top-level menu and folded its items into `Board`.
- Follow-up: moved `About KanStack` out of `Help` and into the `KanStack` app menu, then replaced the generic about content with native custom metadata.

## Verification

- [x] `cargo fmt --manifest-path "src-tauri/Cargo.toml"`
- [x] `cargo check --manifest-path "src-tauri/Cargo.toml"`
- [x] Compared `src-tauri/src/main.rs` against `docs/plans/2026-03-13-menu-reorganization-design.md`
- [x] Confirmed `New Board` and `Attach Existing Board` now appear under `Board` and there is no separate `Workspace` menu
- [x] Confirmed the `Card` menu now exposes only `New Card`, `Archive Selected`, and `Delete Selected`
- [x] Confirmed the menu includes `KanStack -> About KanStack`
- [x] Confirmed the native about panel shows the app icon, `Developed by Galen Green`, and a `kanstack.dev` link
- [x] Confirmed the native about panel shows a single consistent version string
- [x] Confirmed via macOS UI scripting that the native about panel text is `Version 0.5.0`
- [x] Confirmed the native about panel still works after removing the custom Cocoa bridge code
- [x] `npm run build`
- [x] Confirmed `Delete` archives selected cards and `Shift+Delete` deletes them in `src/App.vue`
