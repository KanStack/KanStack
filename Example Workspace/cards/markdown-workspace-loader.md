---
title: Markdown Workspace Loader
type: feature
priority: high
assignee: galen
tags:
  - markdown
  - parser
---

# Markdown Workspace Loader

Added workspace loading for `boards/` and `cards/` so the app can build a normalized in-memory view directly from markdown files.

The loader follows the parser schema in `docs/schemas/kanban-parser-schema.ts` instead of inventing a separate frontend-only model.
