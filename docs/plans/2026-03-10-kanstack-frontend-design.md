# Kanstack Frontend Design

## Goal

Build the smallest useful Vue + Tauri desktop frontend that can open a local markdown workspace and render boards from `boards/*.md` and `cards/*.md`.

## Product Shape

- one desktop window
- one slim header with app name, workspace path, open-folder action, and board selector
- one main board canvas with horizontally scrollable columns
- one lightweight modal for card details
- no router, no command launcher, no complex side panels, no editing in v1

## Visual Direction

- OpenCode-inspired but restrained
- dark graphite surfaces with sharp borders
- mono-first typography and terminal-like labels
- subtle blue accent for focus and selection
- sparse glow and grid texture, not a flashy dashboard

## Data Model

- the selected folder is the workspace root
- boards are loaded from `boards/*.md`
- cards are loaded from `cards/*.md`
- board parser reads frontmatter, `##` columns, `###` sections, wikilink bullets, and `## Sub Boards`
- card parser reads frontmatter and markdown body
- board placement remains the source of truth for card status

## Component Map

- `App.vue` - thin composition shell for loading state, header, board view, and modal
- `components/app/AppHeader.vue` - workspace actions and board selector
- `components/board/BoardCanvas.vue` - renders board columns and sub-board links
- `components/board/BoardColumn.vue` - renders a single column and its optional sections
- `components/board/CardTile.vue` - renders a compact card preview
- `components/card/CardModal.vue` - shows selected card details
- `composables/useWorkspace.ts` - owns folder selection, loading, parse orchestration, and persisted workspace path

## Technical Approach

- Vue 3 with `<script setup lang="ts">`
- Tauri 2 plugins for dialog and filesystem access
- parser output follows `docs/schemas/kanban-parser-schema.ts`
- small parser utilities in TypeScript instead of a heavy state layer
- `yaml` plus a tiny local frontmatter splitter for browser-safe parsing
- card details render raw markdown text in the modal for a smaller v1 surface
- local component state and computed derivations only; no Pinia

## States

- empty state before a folder is chosen
- loading state while markdown files are read and parsed
- error state if the workspace is missing `boards/` or `cards/`
- normal state with board selector and rendered columns

## Verification

- `npm run build` must pass for the web frontend
- `cargo check` under `src-tauri` must pass for the desktop shell
- app should successfully render the sample workspace in this repo when opened as a folder
