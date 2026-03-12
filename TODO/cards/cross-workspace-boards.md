---
title: Cross Workspace Boards
type: feature
priority: high
tags:
  - architecture
  - boards
  - workspace
assignee: ai-agent
---

# Cross Workspace Boards

Redesign KanStack so a top-level board can reference sub-boards that live anywhere on disk, including other projects, while each board keeps its own local `TODO/` folder and card files.

## Spec

- Define a tree-based board model where sub-boards only exist under the current board's directory subtree.
- Preserve a markdown-first format that still works for local boards and cards.
- Clarify identity, path resolution, loading, watching, and navigation for cross-workspace board graphs.
- Define a manual `find sub boards` action that scans under the parent directory of the current board's `TODO/` folder.
- Persist discovered sub-board paths into markdown sub-board lists instead of relying on always-live auto discovery.
- Do not support arbitrary external sub-board links; sub-boards are only discovered from the filesystem tree.
- Keep planning in this card until the design is approved.

## Checklist

- [x] Review current workspace and sub-board assumptions in the repo
- [x] Clarify the new top-level board and nested board model
- [x] Propose options and recommend one design direction
- [x] Capture the approved design in docs and this card
- [x] Implement the per-board `TODO/` workspace model
- [x] Implement manual `Find Sub Boards` discovery and markdown persistence
- [x] Update tests and docs for path-based board loading
- [x] Run verification and move the card to `Review`

## Review Notes

- Initial repo review shows the current app assumes one workspace root with sibling `boards/` and `cards/` directories.
- Board and card identity are currently slug-based, so cross-project child boards would collide without a path-based or explicit ID model.
- New requirement: boards should be able to discover nearby `TODO/` folders recursively under the parent directory that contains the current board's own `TODO/` folder.
- Clarified direction: sub-boards are only allowed under the local filesystem tree, and discovery should be user-triggered from the system menu rather than always-on.
- Discovered results should be written back into markdown as canonical sub-board path entries.
- Approved design doc saved at `docs/plans/2026-03-12-cross-workspace-boards-design.md`.
- Reworked loading and persistence so the app opens a board-local `TODO/` root, loads `todo.md` plus nested board roots, and keys boards/cards by path-based IDs.
- Added a `Find Sub Boards` system-menu action that scans descendant directories, writes relative `TODO/` paths into `## Sub Boards`, and reloads the tree from markdown.
- Updated the repo's own KanStack workspace and core docs to use `TODO/todo.md` instead of a shared `boards/` directory.
- Added Rust-side coverage for the remaining markdown link helpers so `cargo test` validates the backend utility layer after the refactor.

## Verification

- [x] `npm test`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
