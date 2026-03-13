---
title: Known Board Index On Disk
type: feature
priority: high
tags:
  - boards
  - persistence
  - architecture
assignee: ai-agent
---

# Known Board Index On Disk

Move the known-board index out of WebView local storage and onto local disk.

## Spec

- Review the current local-storage persistence for known boards.
- Design a local-disk storage format and location for the known-board index.
- Keep planning here until the redesign is approved.

## Checklist

- [x] Capture the correction that the index should live on disk
- [x] Propose storage-location options and recommend one
- [x] Clarify scope and portability expectations
- [x] Capture the approved design before implementation
- [x] Move known-board persistence from WebView local storage into the Tauri app data file
- [x] Remove the old frontend local-storage index flow
- [x] Run verification and move this card to `Review`

## Review Notes

- Current known-board persistence uses WebView local storage under `kanstack.knownBoardRoots`.
- User correction: this should live on local disk instead.
- Original approved direction: store the known-board index in an app-global JSON file at the Tauri app data/config location, using `known-boards.json` as the filename.
- Design doc saved at `docs/plans/2026-03-12-known-board-index-on-disk-design.md`.
- Shipped persistence now lives in the unified machine-local `config.md` file after later local-config consolidation.
- `sync_known_board_tree` now reads and writes the known-board set from disk, while the frontend only passes additional roots to register.
- WebView local storage is only used as a legacy migration source for the previously open workspace path; active machine-local state now lives in `config.md`.

## Verification

- [x] Approved design stores the known-board index on disk instead of browser local storage
- [x] `npm test`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
