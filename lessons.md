# Lessons

## 2026-03-10

- When the user changes a core storage assumption, update the design around the new constraint instead of continuing to optimize the old structure.
- For markdown-first systems, treat file granularity as a first-class product decision before refining field-level schema details.
- When extending a markdown schema, prefer native heading hierarchy before inventing a custom syntax for grouping.
- When the user provides a concrete markdown example, align the schema to that pattern instead of preserving an older custom format.
- Keep required frontmatter minimal; avoid copying plugin-specific markers into the schema unless the user explicitly wants compatibility with them.
- When the user asks for the simplest possible frontend, remove extra product chrome like command launchers and prefer the smallest viable app shell.
- If the user does not want explicit IDs, use clean human-readable slugs consistently across filenames, wikilinks, and relationship fields.
- Before implementing markdown parsing, check `docs/schemas/` for an existing canonical contract and build the frontend around that schema.
- For frontend parsing code that runs in WebView, avoid Node-oriented markdown libraries that depend on globals like `Buffer`.
- In flex-based board layouts, give the column rail and inner card stack `min-height: 0` and local scrolling so cards do not overflow past the column frame.
- For local markdown viewers, add lightweight refresh behavior early and preserve user context across reloads instead of requiring a manual reopen after each file edit.
- When the user asks for file watching, use real filesystem watch events instead of polling loops.
- When the user wants the simplest editing flow, open directly into the editor and remove parallel read-only card views.
- When stripping markdown title headings from parsed card bodies, ignore leading blank lines after frontmatter so saves do not duplicate the heading.
- When the user wants editing to feel automatic, prefer autosave on blur plus a short debounce instead of explicit save/cancel controls.
- For nested board rollups, keep recursion in a derived view-model layer and add one simple visibility toggle before introducing per-board filters.
- For app-wide theming, centralize all non-semantic color literals in `src/style.css` and reference tokens everywhere else so monochrome passes stay consistent.
- When a board view toggle affects markdown behavior, persist it in the board `%% kanban:settings` block instead of keeping it as ephemeral UI-only state.
- For rolled-up sub-board cards, do not assume they are read-only; if drag support is needed, prefer preserving their source column/status unless the user explicitly wants cross-column moves.
- For rolled-up sub-board cards, allow cross-column drag when requested by writing the move into the source board and creating the destination column there if it does not exist.
- In aggregate board views, compute drag insertion relative to cards from the dragged card's source board so mixed parent/child display order does not create ambiguous writes.
- When interactive board behavior is not working yet, add targeted console debug logs around drag state, drop targets, computed insertion indexes, and persistence boundaries before changing the model further.
- In browser drag-and-drop, do not mount/unmount drop targets on drag start; keep the DOM stable and toggle drop-zone visibility with CSS to avoid immediate drag cancellation in WebKit.
- For board drag-and-drop, prefer whole-section drop targets with computed insertion indexes over tiny spacer targets; users will not reliably hit narrow drop strips.
- In Safari/WebKit drag flows, avoid reactive UI updates on drag start; keep the drag session in non-reactive state so native drag is not canceled before `dragover` fires.
- In Tauri/WKWebView, prefer pointer-capture drag with manual hit-testing over native HTML5 drag-and-drop for reliable board interactions.
- Do not rely solely on filesystem watcher rename events for app-initiated saves; emit an explicit workspace refresh event after successful writes so the UI always reflects persisted changes.
- For pointer-based drag UI, batch hover-target updates with `requestAnimationFrame` and ignore unchanged targets to reduce insertion-marker flicker.
- When cards can move out of named subgroups, add a simple column-root drop surface that maps to the unnamed/default section instead of overcomplicating subgroup-exit logic.
- When the product no longer wants task groups, flatten sections at the parser/view/serializer layers together instead of trying to hide them only in the UI.
- For card deletion, remove the card file and its board bullets together so the board UI cannot keep referencing a deleted card.
- For example/demo workspaces, prefer the user's requested kanban vocabulary and column set over a newly proposed board structure.

## 2026-03-11

- When a board column uses a bottom drop surface for drag-and-drop, make the final drop surface stretch to fill the remaining column height so the empty lower area stays a valid target.
- When users expect title edits to behave like true renames, preserve filename/slug updates and selection continuity; do not quietly regress to title-only edits.
- For commands that return a fresh workspace snapshot used to preserve live selection, avoid also emitting a workspace refresh event that can race in first and clear UI state.
- During watcher-driven refreshes, do not eagerly clear selected rename targets that may be temporarily missing mid-rename; let the active editor/session bridge that gap.
- For layered Escape behavior, prioritize dismissing the most foreground UI first (editor before selection clearing, selection before background panels) so shortcuts match desktop expectations.
