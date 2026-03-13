# Menu Reorganization Design

## Goal

Reorganize the native Tauri menu so actions are grouped by the object they affect instead of mixing board, column, card, and workspace concerns in a single menu.

## Approved Structure

- `KanStack`: `About KanStack`
- `File`: `Open Folder`, `Close Folder`
- `Edit`: `Undo`, `Redo`
- `Board`: `New Board`, `Attach Existing Board`, `Toggle Archive Column`, `Toggle Sub Boards`, `Delete Current Board`
- `Column`: `New Column`, `Rename Column`, `Delete Column`
- `Card`: `New Card`, `Archive Selected`, `Delete Selected`

## Constraints

- Keep existing menu actions and accelerators unless the reorganization itself requires a move.
- Do not change frontend action IDs or dispatch wiring.
- Keep destructive actions visually separated where it improves scanability.
- In the `Card` menu, `Delete` should archive and `Shift+Delete` should permanently delete.
- Put `About KanStack` under the app-named `KanStack` menu instead of a separate `Help` menu.
- Use the native macOS about panel with Tauri's built-in about metadata and bundle-provided credits content.
- The about surface should show the real app icon, a single version line with no duplicate parenthetical build value, `Developed by Galen Green`, and a clickable link to `kanstack.dev`.

## Implementation Notes

- Update only the native menu construction in `src-tauri/src/main.rs`.
- Keep native About customization lightweight; prefer bundled `Credits.html` and Tauri metadata over direct Cocoa bindings.
- Preserve `map_menu_action` so frontend dispatch behavior stays unchanged.
- Run Rust formatting after the menu builder change.

## Verification

- The top-level menu bar matches the approved object-based grouping without a separate `Workspace` menu.
- Existing menu actions still emit the same action IDs.
- Keyboard accelerators still appear on the moved items.
- The menu includes `KanStack -> About KanStack`.
- The native about surface shows the app icon instead of the generic folder glyph.
- The native about surface shows the custom credit line and `kanstack.dev` link.
- The native about surface shows one version line with no duplicate parenthetical build text.
