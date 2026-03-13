# Header Logo Section Design

## Goal

Replace the plain text-only header brand block with a more intentional logo section while keeping the app shell compact and minimal.

## Approved Direction

- add a compact monogram mark beside the KanStack wordmark
- keep the current monochrome palette and restrained visual weight
- preserve the existing header layout, navigation, and overall density

## Component Map

- `AppHeader.vue`: continues to own the full header shell and navigation
- brand area inside `AppHeader.vue`: gains a logo mark plus text block, but still remains a small, self-contained part of the same component

## Design Notes

- use a small geometric mark that reads as a deliberate product symbol rather than decorative art
- keep `local markdown` as the secondary eyebrow under or beside the main wordmark
- rely on spacing, border treatment, and contrast instead of accent colors
- keep the mark compact enough that breadcrumbs and board chips still dominate the header's utility space

## Verification

- the header brand area now contains a monogram plus wordmark
- the result still fits the current header height and monochrome design language
- navigation and sub-board controls remain visually balanced beside the updated brand block
