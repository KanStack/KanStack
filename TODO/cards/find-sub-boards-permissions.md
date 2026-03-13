---
title: Find Sub Boards Permission Errors
type: bug
priority: high
tags:
  - boards
  - discovery
  - filesystem
assignee: ai-agent
---

# Find Sub Boards Permission Errors

Fix `Find Sub Boards` so unreadable directories under a board tree do not abort discovery with `Operation not permitted`.

## Spec

- Reproduce the permission-denied failure with a Rust test first.
- Make sub-board discovery skip unreadable directories instead of failing the entire scan.
- Preserve discovery of readable child boards in the same tree.

## Checklist

- [x] Review the current discovery implementation
- [x] Add a failing Rust test for unreadable directories
- [x] Fix discovery to ignore permission-denied directories
- [x] Run verification and move this card to `Review`

## Review Notes

- Current recursive discovery uses `fs::read_dir(...)?` at every level, so a single unreadable folder aborts the whole scan.
- Added a Rust regression test that creates an unreadable sibling directory and verifies discovery still finds readable child boards.
- Updated recursive discovery to skip `PermissionDenied` directory reads and per-entry permission errors instead of aborting the whole scan.

## Verification

- [x] Rust test covers unreadable child directories
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
