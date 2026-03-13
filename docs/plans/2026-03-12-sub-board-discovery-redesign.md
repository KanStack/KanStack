# Sub-Board Discovery Redesign

## Goal

Replace expensive recursive filesystem discovery with a cheaper model based on a known-board index and path-derived relationships.

## Core Model

- maintain a lightweight known-board set
- a board becomes known when it is opened, created, or manually attached
- relationships for known boards are auto-generated from known board paths
- `## Sub Boards` remains the persisted markdown output
- `Attach Existing Board` is reserved for boards that are not yet known

## Auto-Tree Timing

- auto-generate the tree only when the known-board set changes
- do not crawl the filesystem in the background
- do not recursively scan large directory trees

### Triggers

- `Open Folder`
- `New Board`
- `Attach Existing Board`
- removal of a known board whose path no longer resolves
- optional future manual `Rebuild Board Tree` action

## Auto-Tree Rule

- collect all known board roots
- sort by path depth
- for each known board, find the nearest containing known board
- the nearest containing known board becomes the parent
- write resulting child links into `## Sub Boards` for auto-managed boards

## Unknown Boards

- `Attach Existing Board` opens a picker for a board root that is not yet known
- after attachment, that board joins the known-board set
- future tree rebuilds include it automatically

## Missing or Moved Boards

- if a known board path no longer resolves, remove it from the known-board set
- remove auto-managed relationships that depended on that board during the next tree rebuild
- prompt the user to manually add the board again if they still want it
- do not attempt automatic move detection in v1

## Why This Replaces Recursive Discovery

- cost scales with number of known boards, not directory tree size
- avoids permission and latency issues from scanning home directories
- keeps relationship persistence in markdown while making inference cheap

## Verification

- opening or creating boards updates the known-board set
- tree rebuild runs only on known-board changes
- nearest-ancestor inference produces the expected parent/child structure
- attaching an unknown board adds it to the index and the next rebuild includes it
- missing boards are removed from the known set and no longer appear in the generated tree
