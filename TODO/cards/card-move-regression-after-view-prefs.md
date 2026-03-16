---
title: Card move regression after view prefs
type: bug
priority: medium
assignee: AGENT
---

# Card move regression after view prefs

Inspect commit `298a928` and confirm why card movement stopped working for drag-and-drop and keyboard shortcuts.

## Spec

- Identify the exact behavior change in `298a928` that disables card movement.
- Confirm whether drag-and-drop and keyboard movement fail for the same reason.
- Keep notes focused on current shipped code paths so a follow-up fix can be scoped quickly.

## Checklist

- [x] Inspect the commit diff around board movement, selection, and view preferences
- [x] Trace the drag-and-drop path from card pointer down to move action
- [x] Trace the keyboard move path from shortcut handling to move action
- [x] Add a focused regression test that fails under the current view-preferences gate
- [x] Decide on the follow-up fix and add a regression test before changing behavior
- [x] Restore card reorder eligibility for sorted and filtered board views
- [x] Re-run the affected board utility tests

## Review Notes

- `src/utils/appConfig.ts` now disables card reorder whenever sort is not `manual` or any board filter is active.
- `src/components/board/BoardColumn.vue` now blocks drag start when `cardReorderEnabled` is false.
- `src/App.vue` now blocks entering keyboard card-move mode and early-returns from keyboard moves when reorder is disabled.
- The low-level move action still appears intact; the regression is in the new eligibility gate introduced with persisted view preferences.
- Recommended fix: keep view preferences affecting only display order/filtering, and stop using them to block reorder initiation paths.
- Added `src/utils/appConfig.test.ts` to lock the shared drag/keyboard reorder gate back open for sorted and filtered views.
- Updated `src/utils/boardViewPreferences.test.ts` so filtering still narrows the display without disabling card movement.

## Verification

- [x] Reviewed `git show 298a928 --stat` and the relevant diff hunks for `src/App.vue`, `src/components/board/BoardCanvas.vue`, `src/components/board/BoardColumn.vue`, and `src/utils/appConfig.ts`
- [x] Cross-checked the current tests in `src/utils/boardViewPreferences.test.ts`
- [x] `npm test -- src/utils/appConfig.test.ts`
- [x] `npm test -- src/utils/appConfig.test.ts src/utils/boardViewPreferences.test.ts`
- [x] `npm test -- src/utils/appConfig.test.ts src/utils/boardViewPreferences.test.ts src/utils/boardMarkdown.test.ts`
