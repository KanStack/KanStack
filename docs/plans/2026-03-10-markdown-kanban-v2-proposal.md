# Markdown Kanban v2 Proposal

This file is forward-looking design work. It is not the shipped contract for the current app.

Today the app actively uses `show-sub-boards` and `show-archive-column`, preserves a broader set of settings and metadata, and does not yet implement the proposal features below.

## Goal

Extend the current markdown-first Kanban schema with richer planning features while keeping boards easy to read, diff, and edit by hand.

## Design Direction

- keep `boards/*.md` as the source of truth for column order, section order, and sub-board links
- keep `cards/*.md` as the source of truth for task metadata and long-form content
- keep board behavior in the `%% kanban:settings` JSON block
- prefer additive metadata over new custom markdown syntax

## Recommended v2 Features

### 1. Rich Card Metadata

Add commonly needed planning fields to card frontmatter:

- `type`: `task`, `bug`, `feature`, `research`, `chore`
- `status`: optional derived cache only; board placement stays canonical
- `estimate`: numeric size estimate
- `blocked_by`: list of card slugs
- `blocks`: list of card slugs
- `related`: list of card slugs
- `owners`: list of people when a card has multiple contributors
- `completed`, `started`, `scheduled`: optional dates

Example:

```md
---
title: Implement authentication
type: feature
priority: high
tags: [auth, backend]
assignee: galen
owners: [galen, ai-agent]
due: 2026-03-20
estimate: 3
blocked_by: [session-model]
related: [oauth-spike]
created: 2026-03-10
updated: 2026-03-10
---
```

### 2. Column Metadata in Board Settings

Add optional per-column configuration to the board settings block:

- WIP limits
- column collapse state
- column sort override
- hidden columns in a specific view

Example:

```json
{
  "column-settings": {
    "backlog": { "sort-order": "manual" },
    "in-progress": { "wip-limit": 3 },
    "review": { "wip-limit": 2, "collapsed": false }
  }
}
```

### 3. Saved Views

Add named filters to the board settings block so the same board can be viewed in different ways without changing canonical ordering.

- `My Work`
- `Due Soon`
- `Bugs`
- `Blocked`

Example:

```json
{
  "saved-views": [
    { "name": "My Work", "filter": { "assignee": "galen" } },
    { "name": "Due Soon", "filter": { "due-within-days": 7 } },
    { "name": "Blocked", "filter": { "blocked": true } }
  ]
}
```

### 4. Board Defaults and Inheritance

Add optional defaults that new cards inherit when created from a board or sub-board.

- default tags
- default assignee
- default card type
- default section for each column

Sub-boards may inherit parent settings unless explicitly overridden.

Example:

```json
{
  "defaults": {
    "type": "task",
    "assignee": "galen",
    "tags": ["auth"]
  },
  "inherit": {
    "defaults": true,
    "saved-views": true
  }
}
```

### 5. Archive and Parking Lot Support

Support work that should stay searchable without cluttering active columns.

- `archived: true` in card frontmatter for hidden history
- `parking-lot: true` for ideas that are not active work yet
- optional archive board links in `## Sub Boards`

Recommendation: use card metadata for archive state and keep archive boards optional.

### 6. Templates

Support reusable card shapes through a lightweight template field.

- `template: bug`
- `template: feature`
- `template: meeting-note`

Templates should only prefill frontmatter and markdown sections. They should not add new schema rules.

### 7. Mirrored Cards

Allow one card to appear on multiple boards without duplication.

Recommendation:

- board links remain normal `[[card]]` entries
- card frontmatter adds `mirrors: [board-slug]` only as helper metadata
- board placement is still explicit in each board file so nothing becomes implicit or hard to diff

### 8. Custom Fields

Allow unknown frontmatter keys on cards and unknown JSON keys in board settings.

This keeps the schema extensible for:

- story points
- sprint IDs
- external issue IDs
- team-specific workflows

## Recommended v2 Core Set

If we keep v2 focused, I would ship these first:

1. rich card metadata
2. column settings with WIP limits
3. saved views
4. board defaults plus sub-board inheritance
5. custom-field preservation

This gives the biggest product win without changing the basic markdown shape.

## Example v2 Board Settings

```md
%% kanban:settings
```json
{
  "sort-order": "manual",
  "group-by": "section",
  "show-empty-columns": true,
  "card-preview": "none",
  "list-collapse": [false, false, false, false, false],
  "column-settings": {
    "in-progress": { "wip-limit": 3 },
    "review": { "wip-limit": 2 }
  },
  "defaults": {
    "type": "task",
    "assignee": "galen",
    "tags": ["product"]
  },
  "inherit": {
    "defaults": true,
    "saved-views": true
  },
  "saved-views": [
    { "name": "My Work", "filter": { "assignee": "galen" } },
    { "name": "Due Soon", "filter": { "due-within-days": 7 } },
    { "name": "Blocked", "filter": { "blocked": true } }
  ]
}
```
%%
```

## Non-Goals for v2

- no embedded databases or non-markdown storage
- no automatic implicit board membership from card metadata alone
- no custom parser syntax beyond headings, wikilinks, frontmatter, task lists, and the settings JSON block

## Next Step

Define the exact allowed keys and normalization rules for:

- card frontmatter
- board settings
- inheritance behavior
- saved-view filters
