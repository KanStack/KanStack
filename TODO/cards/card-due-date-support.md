---
title: Card Due Date Support
type: feature
priority: high
tags:
  - cards
  - editor
  - metadata
assignee: ai-agent
due: 2026-03-12T22:57
---

# Card Due Date Support

Add due date support to cards in the editor and card workflow.

## Spec

- Review the current parser, serializer, and card editor support for `due` metadata.
- Define the input format and editing behavior for due date + time values.
- Keep planning in this card until the design is approved.

## Checklist

- [x] Review the current schema and editor behavior
- [x] Clarify due date format and behavior
- [x] Propose options and recommend one
- [x] Capture the approved design before implementation
- [x] Add a due datetime field to the card editor
- [x] Save and restore `metadata.due` as a local datetime string
- [x] Update docs and verification notes

## Review Notes

- The parser schema already supports `metadata.due` and the docs already mention `YYYY-MM-DD` for optional dates.
- The current card editor only exposes `title`, `type`, `priority`, `assignee`, `tags`, `estimate`, and `body`, so this is mostly an editor/save-flow feature.
- User clarified that due dates should include both date and time, not date-only values.
- Approved direction: use local datetime strings with a `datetime-local` input and keep the first pass editor-only.
- Design doc saved at `docs/plans/2026-03-12-card-due-date-support-design.md`.
- Added a `Due` field to the card editor using `datetime-local` and wired it into draft hydration and save normalization.
- `metadata.due` now round-trips as a local datetime string in `YYYY-MM-DDTHH:mm` format, and clearing the field removes it.
- Updated `TODO/README.md` to document the editor support and local datetime storage format.

## Verification

- [x] Approved design covers editor input, save format, and any display/sorting impact
- [x] `npm test`
- [x] `npm run build`
