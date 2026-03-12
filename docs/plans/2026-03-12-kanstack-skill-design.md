# KanStack Skill Design

## Goal

Create a project-local OpenCode skill that teaches agents how to use this repo's `TODO/` KanStack workflow correctly and re-check the repo before acting so the guidance stays current.

## Scope

- Install locally at `.opencode/skills/kanstack/SKILL.md`
- Target KanStack task tracking work in this repo
- Cover board, card, lessons, and verification workflow
- Tell agents to inspect the repo before using remembered KanStack rules

## Trigger Intent

Use the skill when work involves:

- KanStack
- `TODO/` task tracking
- board or card setup
- moving work between `Backlog`, `In Progress`, and `Review`
- updating `lessons.md`

## Workflow To Encode

1. Inspect the repo first for current rules and files
2. Use or create the local `TODO/` KanStack workspace
3. Create or update a card for non-trivial work
4. Keep status honest: `Backlog` while planning, `In Progress` during implementation, `Review` for verification
5. Never move cards to `Done`; that is for the human reviewer
6. Update `lessons.md` after corrections
7. Verify behavior against current implementation and current docs before claiming support

## Repo Sources To Re-Check

- `TODO/README.md`
- `TODO/boards/main.md`
- `TODO/cards/*.md`
- `lessons.md`
- `docs/schemas/kanban-parser-schema.ts`
- relevant `docs/plans/*kanban*.md` files when the schema or workflow is involved

## Guardrails

- Prefer current repo files over memory
- Do not present proposal-only features as shipped behavior
- Do not overwrite unrelated cards or board entries
- Keep examples aligned with the shipped markdown format

## Verification

- Skill frontmatter matches OpenCode naming and description rules
- Skill path is project-local and discoverable
- Skill instructions reflect the current repo workflow
