# New Board Save Location Design

## Goal

Change board creation so KanStack can create a new board anywhere on disk without assuming it is immediately a sub-board of the current board.

## Picker Model

- add a generic `New Board` action
- `New Board` opens a native folder picker
- the picker selects a normal project folder, not a `TODO/` folder and not a `todo.md` file
- after selection, KanStack creates a `TODO/` root inside the chosen folder

## Creation Flow

- user triggers `New Board`
- KanStack opens a native folder picker
- user selects a destination project folder
- KanStack creates:
  - `<selected>/TODO/todo.md`
  - `<selected>/TODO/README.md`
  - `<selected>/TODO/cards/`
- the new board starts with default board content and title `Untitled Board`
- the current board and current session stay unchanged after creation
- no markdown link is written during board creation

## Relationship Model

- creation and discovery are separate actions
- a newly created board is added to the known-board set
- known-board relationships are rebuilt from the known set instead of recursive filesystem discovery
- if the new board lives under an already known board tree, the next known-board sync can make it a child automatically
- if the new board lives elsewhere or above the current board, it simply becomes another known board root until path inference gives it a parent

## Constraints

- if the selected folder already contains `TODO/`, creation stops with a clear error
- if the picker is canceled, nothing changes
- v1 does not add a second naming dialog; renaming happens after creation
- v1 does not automatically switch to the new board after creation

## Implementation Shape

### Frontend

- replace the current child-specific `New Sub Board` flow with a generic `New Board` flow
- request a destination folder before calling the backend create command
- stop precomputing child board paths or parent sub-board links in the frontend

### Backend

- replace the child-specific create command with a generic board creation command
- derive the target board root as `<selected>/TODO/`
- validate overwrite safety before writing files
- do not update parent board markdown as part of creation

## Verification

- creating a board opens the folder picker
- selecting a folder creates a new `TODO/` root there
- canceling the picker makes no file or markdown changes
- selecting a folder that already contains `TODO/` shows an error and does not overwrite
- creating a board does not change the current board selection
- a later known-board tree rebuild can relate newly created boards that live under already known parents
- `npm test`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
