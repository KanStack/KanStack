---
title: Root README
type: docs
priority: medium
tags:
  - docs
  - onboarding
assignee: ai-agent
---

# Root README

Create a simple root `README.md` so the repo has a clear entry point for what KanStack is, how to run it, and where the markdown workspace lives.

## Spec

- Add a concise root README for the current shipped app.
- Keep it simple and easy to scan.
- Cover what the project is, basic local setup, and the main repo folders a contributor needs first.
- Avoid promising unshipped features or stale workflow details.

## Checklist

- [x] Review current project structure and package scripts
- [x] Confirm README audience and scope
- [x] Draft the README content
- [x] Verify commands and file references

## Review Notes

- Added a new root `README.md` that explains what KanStack is, how to start the Tauri app, and how to open the repo's `TODO/` workspace.
- Kept the README user-first, then pointed contributors to the main commands and core repo folders.
- Fixed the local KanStack docs and skill references to use `TODO/boards/main.md` and restored `lessons.md` as the lessons location.

## Verification

- [x] Check the README against current scripts and file layout
- [x] Confirm the README is simpler than the internal planning docs
