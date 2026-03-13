# KanStack Rename Behavior Design

## Goal

Restore true rename behavior for cards and add the same safety model for boards.

## Behavior

- card title edits remain inline in the editor, but if the title changes enough to produce a new slug, the card file path is renamed too
- board title edits happen inline from the board header and can rename the board file path/slug as well
- parent and board links that reference renamed cards or boards are rewritten to the new target and title
- the current board stays open across a board rename
- the card editor stays open across a card rename, and the board underneath stays open too

## Architecture

- shared rename target helpers derive a safe title/slug/path plan for cards and boards
- frontend editors emit workspace mutation payloads after rename commands complete
- `useWorkspace` applies returned snapshots immediately so selection continuity does not depend on async watcher refresh timing
- Tauri rename commands perform transactional writes, rename the target file, rewrite board links, and return a fresh workspace snapshot

## Verification

- renaming a card updates its file path and keeps the editor attached to the renamed card
- renaming a board updates its file path and keeps the current board selected
- board markdown links to renamed cards and boards are rewritten safely
