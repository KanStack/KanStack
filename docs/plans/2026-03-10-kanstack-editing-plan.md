# Kanstack Editing Implementation Plan

## Phase 1: File Write Foundation

- add Tauri write commands for card files and board files
- validate writes stay inside the active workspace
- keep writes atomic by replacing the full file content

## Phase 2: Card Editing

- create `CardEditorModal.vue`
- create `useCardEditor.ts`
- add card serialization utilities
- wire save and cancel flows

## Phase 3: Board Move Actions

- add board serialization utilities
- implement card move and reorder actions
- add sub-board reorder controls

## Phase 4: Interaction Polish

- add drag and drop for cards only
- keep the visual feedback minimal and clear
- preserve selection after watcher refresh

## Phase 5: Verification

- test card save flow against sample markdown files
- test card move flow across columns and sections
- test sub-board reorder flow
- run `npm run build`
- run `cargo check --manifest-path src-tauri/Cargo.toml`
