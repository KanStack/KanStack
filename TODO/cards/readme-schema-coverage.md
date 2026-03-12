---
title: README and Schema Alignment
type: chore
priority: high
tags:
  - docs
  - workflow
assignee: ai-agent
---

# README and Schema Alignment

Align the local docs and schema with the current shipped markdown format and app behavior so the repo does not describe proposal-only features as if they already exist.

## Spec

- Review the schema and schema-adjacent docs before editing the README.
- Check implementation files too so the README does not describe proposal-only behavior as shipped behavior.
- Update the schema and docs so they match the current implementation in full.
- Make the board example show current board behavior without promising unshipped features.
- Make the card example show current editor behavior while explaining preserved metadata accurately.
- Call out what is canonical, what is parsed-and-preserved, and what is only proposal work.
- Keep the guidance simple enough to copy-paste.

## Checklist

- [x] Review the schema and current README guidance
- [x] Identify missing board features and optional settings
- [x] Identify missing card metadata and optional sections
- [x] Re-review parser and app implementation for actually shipped behavior
- [x] Update `TODO/README.md` to remove proposal-only claims
- [x] Update the schema and parser docs to match current behavior
- [x] Mark proposal docs as proposal-only where needed
- [x] Add review notes and verification details

## Review Notes

- Re-reviewed the README and schema docs against the current implementation in `src/utils/parseWorkspace.ts`, `src/utils/serializeBoard.ts`, `src/utils/serializeBoardSettings.ts`, `src/utils/kanbanPath.ts`, and `src/composables/useCardEditor.ts`.
- Corrected the board example to match current behavior: settings are shown near the top, and the example now only uses active board toggles.
- Tightened the card example to match the current editor fields while still documenting additional schema metadata as parsed-and-preserved.
- Removed proposal-only board settings from `docs/schemas/kanban-parser-schema.ts` so the typed contract matches what the app currently ships.
- Updated `docs/plans/2026-03-10-markdown-kanban-parser-schema.md` to match title precedence, settings-block behavior, extensionless targets, current diagnostics, and body-only wikilink extraction.
- Added a clear proposal-only disclaimer and current-format fixes to `docs/plans/2026-03-10-markdown-kanban-v2-proposal.md`.

## Verification

- [x] Schema coverage checked against `docs/schemas/kanban-parser-schema.ts`
- [x] README examples reviewed for copy-paste correctness
- [x] Confirmed the README now distinguishes active behavior from parsed-and-preserved metadata/settings.
- [x] Confirmed the README no longer presents proposal-only features as shipped behavior.
- [x] Confirmed the schema and parser docs now match the current implementation contract.
- [x] Ran `npm test`
- [x] Ran `npm run build`
