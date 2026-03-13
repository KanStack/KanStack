---
title: KanStack Name Casing Consistency
type: chore
priority: medium
assignee: AGENT
tags:
  - branding
  - docs
  - ui
---

# KanStack Name Casing Consistency

Make user-facing references to the app use the exact `KanStack` casing consistently.

## Spec

- Update shipped user-facing app/config/UI references from `Kanstack`, `KANSTACK`, or lowercase branding to `KanStack`.
- Update docs and task-tracking references that mention the app as a proper name.
- Preserve technical identifiers that should remain lowercase, such as package names, bundle IDs, event names, storage keys, and file slugs.

## Checklist

- [x] Audit current name variants across shipped UI, config, and docs
- [x] Update user-facing references to `KanStack`
- [x] Verify technical lowercase identifiers remain unchanged where appropriate
- [x] Run targeted verification

## Review Notes

- Updated the product name, HTML title, and visible UI branding to `KanStack`; the native window title text has since been removed from the window bar.
- Normalized user-facing docs and task text that referred to the app as `Kanstack` or `KANSTACK`.
- Left technical lowercase identifiers unchanged where they should remain stable, such as package names, event names, storage keys, bundle identifiers, and skill/file slugs.

## Verification

- [x] `npm run build`
- [x] `cargo check --manifest-path "src-tauri/Cargo.toml"`
- [x] Searched `.md`, `.vue`, `.json`, and `.html` for remaining `Kanstack`/`KANSTACK` user-facing variants
