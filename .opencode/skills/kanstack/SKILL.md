---
name: kanstack
description: Use this for KanStack task tracking in this repo, including `TODO/` boards, cards, and status workflow. Re-check the repo before acting so instructions stay aligned with the current implementation.
---

# KanStack

Use this skill when work involves KanStack, the local `TODO/` workspace, board/card setup, task tracking, or workflow status updates.

## First: Re-check the Repo

Do not rely on memory alone. Before acting, inspect the current repo state so you use the latest workflow and file format.

https://github.com/galengreen/KanStack/

If the repo and older docs disagree, trust the current implementation and update the docs to match what ships now.

## What This Repo Uses

- `TODO/` is the local KanStack workspace
- `TODO/boards/main.md` is the todo board unless the repo clearly uses another or other boards too
- `TODO/cards/*.md` stores one card per task

## Status Workflow

For non-trivial work:

1. Create or update a KanStack card first
2. Keep the card in `Backlog` while planning
3. Move it to `In Progress` when implementation starts
4. Move it to `Review` when implementation is done and verification is next
5. Never move a card to `Done`; that is for the human reviewer

Keep the board and the card in sync.

## Card Expectations

For non-trivial work, cards should usually include:

- a short goal statement
- `## Spec`
- `## Checklist`
- `## Review Notes`
- `## Verification`

Keep the checklist current as the work progresses.

## Board Expectations

- Use `##` headings for columns
- Use wikilink bullets for cards
- Use `## Sub Boards` only for board links
- Preserve existing ordering unless the task requires a move

Follow the current shipped markdown format in this repo, not older proposal docs.

## Verification Rules

Before presenting work as done:

- verify against current code, not just planning docs
- run relevant tests or checks when appropriate
- make sure docs/examples do not describe unshipped features as current behavior
- ask yourself whether the board status and card notes reflect the real state of the work

## Practical Defaults

- If `TODO/` is missing, create `TODO/README.md`, `TODO/boards/main.md`, `TODO/cards/`, and `lessons.md` using current repo conventions
- Prefer updating an existing relevant card over creating duplicates
- Keep changes minimal and local; do not disturb unrelated KanStack history
