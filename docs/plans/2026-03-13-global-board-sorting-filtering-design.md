# Global Board Sorting and Filtering Design

## Goal

Add sorting and filtering as a global board-view feature that changes how cards render across the app without changing markdown order on disk.

## Product Direction

- sorting and filtering are app-level view preferences, not board-owned behavior
- the same active view rules apply to every board
- markdown remains the canonical manual order and source of truth
- non-manual views change rendering only

## Persistence Model

- store machine-local settings in a single app-data markdown file: `config.md`
- move known boards into that same local config file instead of keeping `known-boards.json`
- store global view preferences there too, so sorting/filtering and known boards share one extensible config surface
- future machine-local settings such as last workspace path should also move there over time
- do not persist render sorting/filtering in board markdown
- remove or stop using board-level sort/filter settings for this feature path

### Config Shape

- use markdown with structured frontmatter as the machine-readable source of truth
- keep the body optional and human-readable so the file can explain what each setting means
- prefer a single top-level shape that can grow cleanly, for example:

```md
---
knownBoardRoots:
  - /path/to/project/TODO
workspacePath: /path/to/project/TODO
view:
  sort: manual
  filters:
    text: ""
    assignee: null
    tags: []
---

# KanStack Config

Local machine settings for KanStack.
```

- this keeps the file human-editable while remaining simpler to extend than multiple standalone json files

## Rendering Model

1. load the canonical board data from markdown
2. build the merged board view as normal
3. apply the active global filter to the rendered card set
4. apply the active global sort to the rendered card order
5. render the derived result without writing back ordering changes

## Interaction Rules

- `manual` sort renders the markdown order exactly
- non-manual sort modes are read-only view modes with respect to ordering
- when a non-manual sort or active filter is applied, drag/reorder interactions that imply persisted order should be disabled
- this avoids ambiguity between canonical order and rendered order

## Initial Scope

### Sort

- `manual`
- `title`
- `due`
- `priority`

### Filter

- text query
- assignee
- tags
- priority
- type
- due status

## UI Direction

- add a compact global `View` control area near the board header actions
- show current sort/filter state clearly
- include a simple reset back to `manual` with no filters
- keep the UI lightweight and identical across boards

## Architecture

- add a frontend app-level preferences source near workspace/session state
- add backend read/write commands for the unified local `config.md`
- keep `BoardCanvas.vue` mostly presentation-focused
- evolve `buildBoardView.ts` or an adjacent view-derivation layer to apply global sorting/filtering cleanly after canonical view construction
- avoid scattering sort/filter logic across individual components

## Local Config Consolidation

- replace `known-boards.json` with `config.md`
- stop using standalone local-storage-only ownership for workspace path once the config plumbing exists
- centralize machine-local app state behind one config reader/writer so later settings do not create more one-off files

## Board Settings Cleanup

- board-level `sort-order` should no longer drive render sorting
- per-board or per-column view overrides are out of scope
- if legacy settings exist in schema/docs, update shipped behavior and docs so the app clearly uses global view preferences instead

## Future Growth

- saved named views can be added later if needed
- per-column overrides can be added later if a strong case emerges
- v1 should prove the global model first

## Verification

- view preferences persist across app restarts
- known boards persist through the same local config file
- the same sort/filter rules apply across all boards
- markdown order is unchanged after using non-manual sorts or filters
- reorder interactions are only available when ordering semantics are unambiguous
