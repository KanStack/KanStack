---
title: Workspace File Watch
type: feature
priority: high
assignee: galen
tags:
  - tauri
  - filesystem
---

# Workspace File Watch

Replaced naive polling with a real filesystem watch path in Tauri so markdown edits refresh the UI from disk.

This keeps the app aligned with a local-first workflow where the markdown files remain the source of truth.
