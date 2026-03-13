---
title: Cant rename column by clicking title any more
type: bug
priority: low
assignee: AGENT
---

# Cant rename column by clicking title any more

Restore inline column-title rename so clicking the selected column header title re-enters rename mode.

## Spec

- Reproduce the current regression with an automated test before changing behavior.
- Keep the existing rename persistence path unchanged; fix the interaction layer that starts editing.
- Preserve current column selection and drag/reorder behavior while allowing title-click rename again.

## Checklist

- [x] Inspect the current column header click and rename flow
- [x] Add a regression test that fails on the current behavior
- [x] Implement the smallest fix that restores title-click rename
- [x] Verify the regression test passes

## Review Notes

- Added a focused regression test for column-header pointer gating so title controls do not arm column drag.
- Restored title-click rename by skipping header drag setup when the pointer starts from the title button or title input.
- Kept the existing app-level column rename flow unchanged.

## Verification

- [x] `npm test -- src/components/board/columnHeaderInteraction.test.ts`
- [x] `npm test -- src/utils/boardMarkdown.test.ts`
