---
title: Card Chip Due Date Display
type: feature
priority: medium
tags:
  - cards
  - ui
  - due-dates
assignee: ai-agent
---

# Card Chip Due Date Display

Show saved due dates on board card chips.

## Spec

- Review the current card chip component and due-date metadata flow.
- Define how due dates should appear on card chips.
- Keep planning here until the design is approved.

## Checklist

- [x] Review current card chip UI and due-date data flow
- [x] Propose display options and recommend one
- [x] Capture the approved design before implementation
- [x] Implement compact due date display on card chips
- [x] Run frontend verification and move this card to `Review`

## Review Notes

- The card chip UI lives in `src/components/board/CardTile.vue` and currently renders title, preview, and up to three metadata badges.
- Due dates now save as local datetime strings in `metadata.due`, but the card chip does not surface them yet.
- Approved direction: show a compact due label above the title, sharing the top line with the rolled-up source when present, while leaving badges and preview unchanged.
- Design doc saved at `docs/plans/2026-03-12-card-chip-due-date-display-design.md`.
- Implemented a compact due label in `src/components/board/CardTile.vue` using local datetime formatting, with a raw-string fallback if parsing fails.
- Rolled-up cards now share the top line between source and due label; local cards only render the due label when present.

## Verification

- [x] Approved design covers placement, formatting, and overflow behavior on the card chip
- [x] `npm test`
- [x] `npm run build`
