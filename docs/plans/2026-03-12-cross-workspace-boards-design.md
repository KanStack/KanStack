# Cross Workspace Boards Design

## Goal

Replace the single shared `boards/` workspace model with a per-board `TODO/` root that can load nested sub-boards and persist them as markdown paths.

## Board Root Model

- each board is a `TODO/` folder
- the canonical board file is `TODO/todo.md`
- cards live in `TODO/cards/*.md`
- `TODO/README.md` stays available for local board notes and onboarding
- the app opens a board root, not a shared workspace containing sibling `boards/` and `cards/`

## Sub-board Discovery

- sub-boards only live under the current board's local filesystem tree
- discovery is manual, not live
- add `Find Sub Boards` to the system menu for the current board
- scanning starts from the directory that contains the current board's `TODO/` folder
- the scan looks for descendant directories named `TODO`
- the current board's own `TODO/` folder is ignored
- only the nearest discovered `TODO/` folders become children of the current board for that scan

## Markdown Persistence

- `TODO/todo.md` remains the source of truth
- `## Sub Boards` stores child board links
- each sub-board link target points to the child `TODO/` folder, not to `todo.md`
- save discovered paths as normalized relative paths, for example `[[services/api/TODO|API]]`
- outside an explicit scan, KanStack loads only the paths already written into markdown

## Identity

- board identity is path-based, not filename-based
- use the normalized board `TODO/` path within the opened tree as the stable board key
- card identity is derived from board path plus local card slug so cards from different boards do not collide
- board and card titles remain presentation data only

## Loading Model

- opening a board loads the selected `TODO/todo.md` and local `TODO/cards/*.md`
- the loader resolves `## Sub Boards` links relative to each board's project root and loads child boards recursively
- missing child paths remain visible as unresolved links instead of being silently deleted
- filesystem watching follows the loaded board roots rather than one shared `boards/` directory

## Editing Rules

- board markdown writes update `TODO/todo.md`
- card writes stay local to the owning board's `TODO/cards/`
- creating a sub-board creates a child directory with its own `TODO/`, `TODO/todo.md`, `TODO/cards/`, and `TODO/README.md`
- renaming a board updates its title only; board identity stays path-based

## Verification

- opening `TODO/` loads `todo.md` and local cards without a shared `boards/` folder
- `Find Sub Boards` discovers descendant `TODO/` folders and rewrites `## Sub Boards`
- reloading reconstructs the same tree from markdown without re-scanning
- cards with the same local filename in different boards remain distinct in the UI and persistence layer
- missing child boards surface as unresolved entries without crashing the app
