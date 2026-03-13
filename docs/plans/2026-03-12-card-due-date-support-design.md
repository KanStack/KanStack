# Card Due Date Support Design

## Goal

Add due date editing to cards using a local date-and-time value without expanding the first pass into broader display work.

## Scope

- add editor support only in v1
- do not add new due-date rendering in board/card list views yet
- do not add timezone conversion logic

## Data Format

- store `due` in card frontmatter as a local datetime string
- format: `YYYY-MM-DDTHH:mm`
- example:

```yaml
due: 2026-03-12T14:30
```

- if the field is empty, omit `due` from metadata

## Editor Behavior

- add a `Due` field to the card editor
- use a native `datetime-local` input
- preload the input from existing `metadata.due` when present
- save the raw local datetime string without timezone conversion
- clearing the field removes the `due` metadata entry

## Implementation Shape

### Frontend

- extend the card editor draft state with `due`
- hydrate from `card.metadata.due`
- normalize and save the field into `KanbanCardMetadata`
- keep the rest of the card editor flow unchanged

### Parser and Serializer

- existing schema already supports `due` as a string field
- serializer should preserve the local datetime string exactly
- no parser contract changes are needed beyond docs clarification

## Documentation

- update `TODO/README.md` to clarify that `due` supports local datetime strings in `YYYY-MM-DDTHH:mm` format

## Verification

- creating or editing a card can save a due datetime
- reopening the card restores the same local datetime value
- clearing the field removes `due` from frontmatter
- `npm test`
- `npm run build`
