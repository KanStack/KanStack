---
title: Largest File Simplification Pass
type: chore
priority: high
tags:
  - refactor
  - architecture
  - frontend
  - backend
assignee: ai-agent
---

# Largest File Simplification Pass

Review the biggest source files first, identify high-value simplifications, and make small behavior-preserving refactors that reduce complexity and improve maintainability.

## Spec

- Rank active source files by size and use that list to drive the review order.
- Start with the largest files that look like architecture hotspots.
- Prefer simplifications that reduce responsibilities, extract reusable logic, or clarify state flow without changing product behavior.
- Record concrete follow-up ideas for files that should be split further but are too risky for the first pass.

## Checklist

- [x] Inventory the largest frontend and backend source files
- [ ] Review the current biggest file and identify the main complexity drivers
- [ ] Apply the safest high-value simplification for the first file
- [ ] Run targeted verification for the changed area
- [ ] Update this card with review notes and next files to inspect

## Review Notes

- Current size ranking starts with `src/App.vue`, `src/composables/useWorkspace.ts`, `src/components/board/BoardCanvas.vue`, `src/utils/parseWorkspace.ts`, and `src/components/card/CardEditorModal.vue`.
- First pass will start with `src/App.vue` because it is much larger than every other source file and likely owns too many responsibilities.

## Verification

- [ ] Relevant tests or build checks pass for the touched area
