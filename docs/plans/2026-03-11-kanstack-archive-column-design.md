# KanStack Archive Column Design

## Goal

Add a real archive workflow that keeps archived cards in the board markdown model while hiding them from the main board by default.

## Behavior

- boards may contain a normal `Archive` column with slug `archive`
- the archive column is hidden by default unless a board setting enables it
- the board header exposes a toggle for showing or hiding the archive column
- the card editor exposes an `archive` action that moves the card into the source board's archive column
- if the source board does not already have an archive column, archiving creates it on demand

## Ownership Rules

- local cards archive inside the current board
- rolled-up sub-board cards archive inside their source board, not the parent board currently being viewed
- archiving is a move, not a delete or metadata flag

## Data Model

- add `show-archive-column?: boolean` to board settings
- keep the markdown contract based on normal columns, so `## Archive` is serialized like any other column
- keep the archive column unnamed by default and use the existing section model if the user later adds sections there

## Implementation

- add shared archive constants/helpers for the archive column slug and setting key
- filter the rendered board view in `BoardCanvas` so the archive column is omitted unless the setting is on
- keep board serialization generic; use a focused archive move helper built on the existing move logic
- preserve source board context when opening the card editor so archive actions target the correct board

## Verification

- archived cards move into `## Archive`
- archiving creates the archive column when absent
- archive column stays hidden by default after reload
- archive toggle persists through the board settings block
- rolled-up card archive writes to the source board
