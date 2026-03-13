# Card Chip Due Date Display Design

## Goal

Show saved due dates on board card chips without changing sorting, filtering, or card-preview behavior.

## Scope

- add due date display to card chips only
- keep board sorting and grouping unchanged
- keep existing preview and badge behavior

## Placement

- show a compact due label above the card title
- when a card is rolled up from a child board, share the existing top line with the source label
- when a card is local to the board, render the top line only if a due date exists

## Formatting

- read `metadata.due` as the stored local datetime string
- format it into a short readable label such as `Due 12 Mar 2:30pm`
- if parsing fails, fall back to the raw stored string so the chip still surfaces the value

## Implementation Shape

- extend `src/components/board/CardTile.vue` with a computed due label
- keep formatting logic local to the component for this first pass
- add minimal styles for a compact due pill/label in the top row

## Verification

- cards with `due` show a compact due label on the chip
- rolled-up cards still show their source board alongside the due label
- cards without `due` render as before
- `npm test`
- `npm run build`
