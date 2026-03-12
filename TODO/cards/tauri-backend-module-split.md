---
title: Tauri Backend Module Split
type: chore
priority: high
tags:
  - refactor
  - tauri
  - backend
assignee: ai-agent
---

# Tauri Backend Module Split

Refactor the oversized Tauri backend entrypoint so commands, workspace logic, markdown helpers, and app wiring live in focused Rust modules without changing behavior.

## Spec

- Keep the current board-root and sub-board discovery behavior intact.
- Reduce `src-tauri/src/main.rs` to app bootstrap and lightweight wiring.
- Move command handlers and pure helpers into cohesive modules.
- Preserve existing command names and frontend integration points.

## Checklist

- [x] Review the current `main.rs` responsibilities and choose module boundaries
- [x] Extract pure workspace/path/markdown helper functions into modules
- [x] Move Tauri command handlers into backend modules and keep app wiring thin
- [x] Extract shared command-level helpers for repeated root/board/card path resolution
- [x] Simplify board/card command handlers around the shared helpers
- [x] Simplify workspace loading helpers in `loading.rs`
- [x] Simplify write/rename helpers in `fs.rs`
- [x] Run `npm test`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] Move this card to `Review`

## Review Notes

- Follow-up refactor after the `TODO/` board-root redesign to make the Rust backend easier to reason about and maintain.
- Reduced `src-tauri/src/main.rs` to app wiring, menu construction, and command registration; it is now 162 lines instead of holding all backend logic.
- Split the backend into `src-tauri/src/backend/commands.rs`, `src-tauri/src/backend/workspace.rs`, and `src-tauri/src/backend/models.rs` so command handlers, filesystem/path helpers, and shared data types are separated.
- Continued the split so commands now live in `src-tauri/src/backend/commands/{workspace,card,board,watcher}.rs` and workspace helpers live in `src-tauri/src/backend/workspace/{paths,markdown,discovery,loading,fs}.rs`.
- Kept the existing Tauri command names and frontend integration points intact while narrowing each Rust file to a single concern and moving the Rust unit tests into `src-tauri/src/backend/workspace/markdown.rs`.
- Added `src-tauri/src/backend/commands/support.rs` so board/card commands can share board-path resolution, common write builders, and local markdown slug parsing.
- Restored path-kind enforcement while simplifying the code: board writes must target `TODO/todo.md`, card writes must target `cards/*.md`, and board notes must target `TODO/README.md`.
- Simplified `src-tauri/src/backend/workspace/loading.rs` with smaller helpers for project-root derivation, workspace file construction, snapshot path collection, and cleanup filtering.
- Simplified `src-tauri/src/backend/workspace/fs.rs` with explicit helpers for path normalization, write resolution, write application, and owned-write cloning while preserving rollback behavior.

## Verification

- [x] `src-tauri/src/main.rs` is substantially smaller and mostly wiring
- [x] Existing frontend commands still compile and behave the same
- [x] `npm test`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
