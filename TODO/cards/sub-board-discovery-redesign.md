---
title: Sub-Board Discovery Redesign
type: feature
priority: high
tags:
  - boards
  - discovery
  - architecture
assignee: ai-agent
due: 2026-03-12T23:59
---

# Sub-Board Discovery Redesign

Revisit the current `Find Sub Boards` model because recursive filesystem scanning across large trees is too slow and unreliable.

## Spec

- Re-evaluate how boards become related without expensive recursive scans.
- Propose cheaper, more reliable alternatives.
- Support attaching both known and not-yet-known boards.
- Auto-build parent/child relationships for known boards when they can be inferred cheaply.
- Reserve `Attach Existing Board` for boards that are not yet known to the app.
- If a known board path can no longer be resolved, remove it from the known set and require manual re-attachment.
- Keep planning here until a redesign is approved.

## Checklist

- [x] Capture the correction about recursive discovery being too expensive
- [x] Propose 2-3 alternative discovery/relationship models
- [x] Recommend one redesigned model
- [x] Capture the approved design before implementation
- [x] Implement the known-board index and auto-tree rebuild flow
- [x] Replace `Find Sub Boards` with `Attach Existing Board` for unknown boards
- [x] Update docs, tests, and verification
- [x] Move this card to `Review`

## Review Notes

- Current recursive directory scanning is too expensive on real home-directory trees and still runs into reliability issues.
- Updated direction: `Attach Existing Board` cannot rely only on the local index; it also needs a way to pick an unknown board directly.
- Updated direction: the index is still useful, but mainly for known-board suggestions and cheap tree inference rather than full recursive discovery.
- Clarified direction: known boards should have relationships auto-built from the known-board set; manual attach is only for unknown boards.
- Clarified direction: missing or moved boards should be removed from the known set and the user should manually add them again.
- Approved redesign: rebuild the tree only when the known-board set changes, using nearest-containing-known-board inference instead of recursive disk scans.
- Design doc saved at `docs/plans/2026-03-12-sub-board-discovery-redesign.md`.
- Implemented a known-board index in frontend storage and a backend `sync_known_board_tree` command that rewrites `## Sub Boards` from inferred nearest-ancestor relationships.
- Added `Attach Existing Board` for unknown boards and removed the expensive recursive discovery action from the normal menu flow.
- Preserved manual unknown links already present in `## Sub Boards` while auto-managing links for known boards.
- Follow-up fix: stale links to known boards are no longer preserved on the wrong parent during tree rebuilds, so a child board only appears under its inferred nearest known parent.

## Verification

- [x] Approved redesign avoids broad recursive scans during normal board operations
- [x] `npm test`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
