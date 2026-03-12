# Kanstack Shortcuts and Selection Design

## Goal

Add desktop-style keyboard shortcuts, menu integration, and visible-board multi-selection for card actions.

## Card Selection

- single click selects one card
- double click opens the card editor
- `Cmd/Ctrl+click` toggles a card in the selection set
- `Shift+click` range-selects across the whole visible board order
- selection may span rolled-up cards from multiple source boards

## Keyboard

- `Escape` clears selection first, then closes the board navigation panel, then cancels inline board rename, then closes the editor
- `Enter` opens the selected card when exactly one card is selected and no text input is focused
- `Delete` / `Backspace` deletes the selected card set when no text input is focused
- `Cmd/Ctrl+O` opens the workspace folder picker
- `Cmd/Ctrl+N` creates a new card in the current board
- `Cmd/Ctrl+Shift+N` creates a new sub board from the current board
- `Cmd/Ctrl+Shift+A` toggles the archive column for the current board
- `Cmd/Ctrl+.` toggles the board navigation panel

## Batch Actions

- delete confirms once for the whole selected set
- archive and delete execute in source-board-aware batches under the hood
- menu actions and keyboard shortcuts use the same frontend action dispatcher as pointer interactions

## Menu Bar

- `File`: Open Folder, New Card, New Sub Board
- `Board`: Toggle Board Menu, Toggle Archive Column, Toggle Sub Boards
- `Card`: Open Selected, Archive Selected, Delete Selected, Close Editor

## Implementation

- add app-level visible-board selection state and shortcut dispatching
- emit visible card order from the board view so range selection is deterministic
- add native Tauri menu items that emit action events into the frontend
- keep text inputs safe by ignoring destructive shortcuts while an editable element is focused

## Verification

- click, cmd/ctrl-click, and shift-click selection behave correctly across the visible board
- double click opens without breaking single-click selection
- delete/archive shortcuts work across mixed source boards
- native menu items trigger the same actions as keyboard shortcuts
