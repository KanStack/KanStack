# Markdown Kanban Parser Schema

## Goal

Define the normalized data shape a parser should emit for the current markdown Kanban format.

## Canonical Schema File

- `docs/schemas/kanban-parser-schema.ts`

That file defines the parser target types for boards, cards, settings, sections, links, and diagnostics.

## Parsing Rules

### Board Files

- parse frontmatter into `frontmatter`
- derive `slug` from the filename without `.md`
- use the first `#` heading as `title`; fall back to frontmatter `title` if needed
- parse each `##` heading as either a normal column or the special `Sub Boards` block
- inside a normal column, parse each `###` heading as a section
- if cards appear directly under a column before any `###` heading, normalize them into an implicit section with `name: null`
- parse each card bullet as a `KanbanCardLink`
- parse `## Sub Boards` bullets as `KanbanBoardLink[]`
- parse the footer `%% kanban:settings` fenced JSON block into `settings`

### Card Files

- parse frontmatter into `metadata`
- derive `slug` from the filename without `.md`
- use frontmatter `title` as the canonical title; fall back to the first `#` heading if needed
- preserve unknown frontmatter keys in `metadata`
- parse the full markdown body after frontmatter into `body`
- split `##` sections into `sections[]`
- collect checklist items from the whole card into `checklist[]`
- collect wikilinks from frontmatter-derived relationship lists and markdown body into `wikilinks[]`

### Diagnostics

- unresolved wikilinks should emit warnings, not hard failures
- malformed settings JSON should emit an error on the board document
- duplicate board or card slugs should emit errors
- invalid heading hierarchy should emit warnings with file path and line number when available

## Normalization Notes

- board structure is canonical for column placement and ordering
- sub-boards are not columns and should stay in `subBoards`
- card relationship fields like `blocked_by`, `blocks`, `related`, and `parent_card` are slug-based
- unknown settings keys and unknown card metadata keys must survive round trips
- explicit card IDs are not part of the schema; filenames and wikilink slugs are the stable references

## Example Board Result

```ts
const board = {
  kind: "board",
  slug: "main",
  path: "boards/main.md",
  title: "Product Board",
  frontmatter: { title: "Product Board" },
  columns: [
    {
      name: "Backlog",
      slug: "backlog",
      index: 0,
      sections: [
        {
          name: "Auth",
          slug: "auth",
          index: 0,
          cards: [
            { slug: "session-model", target: "cards/session-model.md" },
            { slug: "auth", target: "cards/auth.md" }
          ]
        }
      ]
    }
  ],
  subBoards: [{ slug: "auth-flow", target: "boards/auth-flow.md" }],
  settings: {
    "sort-order": "manual",
    "group-by": "section",
    "column-settings": {
      "In Progress": { "wip-limit": 2 }
    }
  },
  diagnostics: []
} satisfies import("../schemas/kanban-parser-schema").KanbanBoardDocument
```

## Example Card Result

```ts
const card = {
  kind: "card",
  slug: "auth",
  path: "cards/auth.md",
  title: "Implement authentication",
  metadata: {
    type: "feature",
    priority: "high",
    assignee: "galen",
    blocked_by: ["session-model"],
    related: ["oauth-spike"],
    story_points: 8
  },
  body: "# Implement authentication\n\nAdd local-first email and password authentication for the desktop app.",
  sections: [
    {
      name: "Checklist",
      slug: "checklist",
      index: 0,
      markdown: "- [ ] Define auth state model\n- [ ] Build login form",
      checklist: [
        { text: "Define auth state model", checked: false },
        { text: "Build login form", checked: false }
      ],
      wikilinks: []
    }
  ],
  checklist: [
    { text: "Define auth state model", checked: false },
    { text: "Build login form", checked: false }
  ],
  wikilinks: ["session-model", "oauth-spike"],
  diagnostics: []
} satisfies import("../schemas/kanban-parser-schema").KanbanCardDocument
```

## Recommended Next Step

- implement a loader that emits `KanbanParseResult`
- validate board settings JSON before applying inheritance
- add fixture files that cover direct column cards, explicit sections, sub-boards, and unresolved links
