# KanStack

KanStack is a local-first desktop app for working with markdown kanban boards.

It opens a `TODO/` folder, loads `todo.md` plus local cards, and lets you manage nested sub-boards from a Tauri + Vue desktop UI.

## What it does

- opens a local markdown workspace
- renders boards, columns, cards, and sub-boards
- edits card content and board structure without adding a database
- keeps the markdown files as the source of truth

## Quick start

Requires Node.js, npm, and a working Rust/Tauri desktop toolchain.

1. Install dependencies:

```sh
npm install
```

2. Start the desktop app:

```sh
npm run tauri:dev
```

3. When the app opens, choose a `TODO/` folder that contains `todo.md` and `cards/`.

To try the app with the workspace already in this repo, open `TODO/`.

## Workspace shape

KanStack expects a board root like this:

```text
project/
  TODO/
    todo.md
    README.md
    cards/
      some-card.md
```

- `todo.md` controls column order, card placement, and saved sub-board links
- `cards/*.md` holds metadata and long-form content for the current board
- `README.md` can hold local notes for that board root
- sub-boards are saved in `## Sub Boards` as relative paths to descendant `TODO/` folders

For a fuller walkthrough of the workspace format, see `TODO/README.md` and `docs/schemas/kanban-parser-schema.ts`.

## Development

Useful commands:

```sh
npm run tauri:dev
npm run build
npm run test
```

The frontend lives in `src/` and the Tauri shell/backend lives in `src-tauri/`.

## Repo layout

- `src/` - Vue app and markdown workspace logic
- `src-tauri/` - desktop shell and filesystem commands
- `docs/` - plans and schema notes
- `TODO/` - the repo's own KanStack workspace used for task tracking
