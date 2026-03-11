---
title: Safe Card Delete
type: feature
priority: high
assignee: galen
tags:
  - editing
  - cleanup
---

# Safe Card Delete

Added a delete flow from the editor that removes the card file and strips its board references so the UI cannot keep pointing at a deleted card.

The next check is making the destructive action feel safe without adding too much ceremony.
