---
title: Migrate MyVault TODO Vaults
type: chore
priority: high
tags:
  - obsidian
  - migration
  - kanstack
---

# Migrate MyVault TODO Vaults

Migrate the legacy Obsidian kanban `todo.md` files in `MyVault` into the new per-folder `TODO/` vault format and wire up the vault root so it opens cleanly in KanStack.

## Spec

- Create a root `TODO/` vault for `MyVault` if it does not already exist.
- Preserve the existing `Personal/TODO` and `VUW/TODO` workspaces and migrate legacy board items into card files under the matching `TODO/cards/` directories.
- Convert legacy columns to the new board columns with `Next` and `Doing` mapped into `In Progress`.
- Preserve due dates and existing wikilinks in migrated card content.
- Avoid overwriting existing card files unless a deterministic migration requires it.

## Checklist

- [x] Inspect the source vault and identify legacy `todo.md` files to migrate.
- [x] Create or update a root `MyVault/TODO` board with sub-board links.
- [x] Migrate `Personal/todo.md` into `Personal/TODO`.
- [x] Migrate course todo boards into their matching `TODO/` workspaces.
- [ ] Remove or archive legacy board files only if the migration completes cleanly.
- [x] Verify migrated boards, cards, and sub-board links.

## Review Notes

- Created `/Users/galengreen/Documents/ObsidianVault/MyVault/TODO` as the root KanStack board and linked `Personal/TODO` plus `VUW/TODO` as sub-boards.
- Migrated 30 legacy checklist items into per-board card files under the existing `TODO/cards/` folders and rewrote the target `TODO/todo.md` files with KanStack card links.
- Mapped legacy `Next` and `Doing` items into `In Progress`; for those cards, preserved the original lane name in the card body.
- Left the legacy board markdown files in place as a safety backup instead of deleting them during the migration.
- Preserved legacy wikilinks in card bodies, but 20 of those links currently point at note files that do not exist in the vault.

## Verification

- [x] Confirm each migrated board has the expected cards in the expected columns.
- [x] Confirm each migrated card file has a title and preserved due/body content.
- [x] Confirm `MyVault/TODO/todo.md` can act as the root board for the vault.

- Validation script confirmed 30 board card links resolve to on-disk card files.
- Validation script confirmed the new root board links resolve to `Personal/TODO` and `VUW/TODO`.
- Validation script found 20 preserved `Related note` wikilinks whose target note files do not currently exist in the vault.
