---
title: KanStack Skill
type: chore
priority: high
tags:
  - docs
  - workflow
  - opencode
assignee: ai-agent
---

# KanStack Skill

Create an OpenCode skill for using KanStack so agents can follow the local KanStack workflow consistently.

## Spec

- Follow the OpenCode skills format from `https://opencode.ai/docs/skills/`.
- Make the skill teach agents how to create or update a `TODO/` KanStack workspace, boards, cards, and lessons.
- Keep the skill aligned with the current shipped KanStack markdown format and current workflow rules.
- Make the skill tell agents to inspect the repo for the latest KanStack rules and files before acting.
- Decide whether the skill should be project-local or global before implementation.

## Checklist

- [x] Review OpenCode skill docs
- [x] Review local skill conventions
- [x] Confirm install location and scope
- [x] Draft the skill design and trigger wording
- [x] Implement the skill files
- [x] Verify the skill loads cleanly by format and naming rules
- [x] Add a proactive rule so agents load the local `kanstack` skill when working in this repo

## Review Notes

- Added a project-local OpenCode skill at `.opencode/skills/kanstack/SKILL.md` with repo-specific guidance for using the `TODO/` KanStack workflow.
- Made the skill explicitly tell agents to re-check repo files like `TODO/README.md`, `TODO/todo.md`, `TODO/cards/`, `lessons.md`, and `docs/schemas/kanban-parser-schema.ts` before acting.
- Added a compact design doc in `docs/plans/2026-03-12-kanstack-skill-design.md` to capture the local skill intent and workflow.
- Added a short rule in `/Users/galengreen/.config/opencode/AGENTS.md` telling agents to load the local `kanstack` skill when available for KanStack-related work.

## Verification

- [x] Skill frontmatter validated against OpenCode docs
- [x] Skill path and name match discovery rules
- [x] Confirmed the local skill path matches OpenCode project discovery: `.opencode/skills/kanstack/SKILL.md`
- [x] Confirmed the global agent rules now mention the local `kanstack` skill for repo work
