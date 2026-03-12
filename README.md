# KanStack

KanStack is a local-first desktop app for working with markdown kanban boards.

It opens a folder that contains `boards/*.md` and `cards/*.md`, renders the board structure, and lets you manage cards and boards from a Tauri + Vue desktop UI.

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

3. When the app opens, choose a workspace folder with `boards/` and `cards/`.

To try the app with the workspace already in this repo, open `TODO/`.

## Workspace shape

KanStack expects a markdown workspace like this:

```text
workspace/
  boards/
    main.md
  cards/
    some-card.md
```

- board files control column order and card placement
- card files hold metadata and long-form content
- sub-boards are linked from board markdown, not stored in a separate database

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
