# KanStack Implementation Plan

A local-first kanban board application built with Tauri and Vue 3, featuring a terminal/developer aesthetic, JSON-based storage, and extensible architecture ready for AI integration and multi-device sync.

---

## Architecture

### Core Stack
- **Backend**: Tauri (Rust) with custom file system API
- **Frontend**: Vue 3 + TypeScript + Vite
- **State Management**: Pinia with local file persistence (JSON)
- **Sync Foundation**: Structure ready for Yjs, sync disabled in Phase 1
- **Styling**: Tailwind CSS with custom monochrome dark theme
- **Fonts**: JetBrains Mono (monospace throughout)

### Storage Strategy
```
~/.kanstack/
├── config.json              # App settings + project registry
├── cache/                   # UI state, preferences
└── data/                    # Default location for projects
    └── {project-id}/
        ├── meta.json
        └── boards/
            └── *.json

~/projects/project-a/        # Custom location (user's choice)
└── .kanstack/
    ├── meta.json
    └── boards/
        └── *.json
```

---

## Data Schema

### `~/.kanstack/config.json`
```json
{
  "appVersion": "1.0.0",
  "settings": {
    "theme": "dark",
    "font": "JetBrains Mono",
    "autoSave": true,
    "defaultProjectLocation": "/Users/galen/.kanstack/data"
  },
  "projects": [
    {
      "id": "proj-uuid-1",
      "name": "Default",
      "path": "/Users/galen/.kanstack/data/default",
      "type": "local",
      "lastOpened": "2026-01-29T10:00:00Z"
    },
    {
      "id": "proj-uuid-2", 
      "name": "Project A",
      "path": "/Users/galen/projects/project-a/.kanstack",
      "type": "custom",
      "lastOpened": "2026-01-29T09:00:00Z"
    }
  ],
  "combinedBoardSettings": {
    "visibleProjects": ["all"],
    "filters": {
      "excludeArchived": true,
      "tags": []
    }
  }
}
```

**Key decisions**:
- Absolute paths (no `~` tilde expansion in storage)
- No `isAvailable` field — availability is runtime check only

### `{project}/.kanstack/meta.json`
```json
{
  "id": "proj-uuid",
  "name": "Project Name",
  "createdAt": "2026-01-29T10:00:00Z",
  "updatedAt": "2026-01-29T10:00:00Z",
  "boards": ["board-uuid-1", "board-uuid-2"],
  "settings": {
    "tags": ["bug", "feature", "urgent"],
    "customFields": []
  }
}
```

### `{project}/.kanstack/boards/{board-id}.json`
```json
{
  "id": "board-uuid",
  "version": "1.0",
  "schemaVersion": 1,
  "name": "Main Board",
  "projectId": "proj-uuid",
  "createdAt": "2026-01-29T10:00:00Z",
  "updatedAt": "2026-01-29T10:00:00Z",
  
  "columns": [
    {
      "id": "col-uuid-1",
      "name": "Backlog",
      "order": "a",
      "wipLimit": null
    },
    {
      "id": "col-uuid-2", 
      "name": "In Progress",
      "order": "b",
      "wipLimit": 3
    }
  ],
  
  "cards": [
    {
      "id": "card-uuid-1",
      "columnId": "col-uuid-1",
      "title": "Implement authentication",
      "content": "## Description\n\nNeed to add login functionality...",
      "contentType": "markdown",
      "order": "a",
      
      "tags": ["feature", "backend"],
      "dueDate": "2026-02-15",
      "priority": 1,
      
      "parentId": null,
      "linkedRefs": [
        {
          "cardId": "card-uuid-3",
          "boardId": "board-uuid-2",
          "projectId": "proj-uuid-2"
        }
      ],
      
      "checklist": [
        {"id": "chk-1", "text": "Design UI", "checked": false},
        {"id": "chk-2", "text": "Implement API", "checked": false}
      ],
      
      "status": "active",
      "archived": false,
      "archivedAt": null,
      
      "createdAt": "2026-01-29T10:00:00Z",
      "updatedAt": "2026-01-29T10:00:00Z",
      
      "metadata": {}
    }
  ]
}
```

**Key decisions**:
- Fractional indexing for `order` fields (e.g., `"a"`, `"b"`, `"am"`) — enables efficient reordering and CRDT compatibility
- Links include full context (`cardId`, `boardId`, `projectId`) for cross-project references
- Checklists are structured arrays only — no parsing of markdown checkbox syntax
- No `subItemIds` field — computed dynamically from `parentId`

---

## Relationship Handling

### Parent-Child (Sub-items)
Store only `parentId` on child cards:
```typescript
parentId: "card-uuid-1"  // This card is a child
```

Compute sub-items dynamically:
```typescript
const subItems = allCards.filter(c => c.parentId === thisCard.id)
```

### Linked Cards (Cross-Reference)
Store full context for every link:
```typescript
linkedRefs: [
  {
    cardId: "card-uuid-3",
    boardId: "board-uuid-2", 
    projectId: "proj-uuid-2"
  }
]
```

Handle broken links gracefully:
```typescript
function resolveLink(ref: LinkedRef): Card | null {
  const project = getProject(ref.projectId)
  if (!project || !project.isAvailable) return null
  // Load and return card, or return null if deleted
}
```

### Cross-Project Cards in Combined View
```typescript
interface CardWithContext {
  card: Card
  source: {
    projectId: string
    boardId: string
    projectPath: string
    isAvailable: boolean  // Runtime check
  }
}

// When editing in combined view, write back to source:
// `${source.projectPath}/boards/${source.boardId}.json`
```

---

## Operations Safety

### Deleting a Column
Must specify target column for existing cards:
```typescript
function deleteColumn(board: Board, columnId: string, targetColumnId: string) {
  const cardsInColumn = board.cards.filter(c => c.columnId === columnId)
  
  if (cardsInColumn.length > 0 && !targetColumnId) {
    throw new Error("Must specify target column for existing cards")
  }
  
  // Move cards to target column
  cardsInColumn.forEach(card => {
    card.columnId = targetColumnId
    card.updatedAt = now()
  })
  
  // Remove column
  board.columns = board.columns.filter(c => c.id !== columnId)
}
```

### Tag Handling
Project tags are suggestions only:
```typescript
interface ProjectMeta {
  settings: {
    tags: string[]  // Known/suggested tags for autocomplete
  }
}

// Cards can use any tag string
// No validation against project.settings.tags
card.tags: string[]
```

---

## Extensibility Strategy

### Version Management
```typescript
const CURRENT_SCHEMA_VERSION = 1

function loadBoard(path: string): Board {
  const data = readFile(path)
  const board = JSON.parse(data)
  
  if (board.schemaVersion < CURRENT_SCHEMA_VERSION) {
    return migrateBoard(board, CURRENT_SCHEMA_VERSION)
  }
  
  return board
}

function migrateBoard(board: Board, targetVersion: number): Board {
  if (board.schemaVersion === undefined) {
    board.schemaVersion = 0
  }
  
  // Migration: v0 -> v1 added priority field
  if (board.schemaVersion === 0) {
    board.cards.forEach(c => c.priority = c.priority || 0)
    board.schemaVersion = 1
  }
  
  return board
}
```

### Adding Custom Fields
```json
{
  "settings": {
    "customFields": [
      {
        "id": "story-points",
        "name": "Story Points",
        "type": "number"
      }
    ]
  },
  "cards": [
    {
      "metadata": {
        "story-points": 5
      }
    }
  ]
}
```

---

## Phase Structure

### Phase 1: Foundation (Local-First MVP)

**1. Tauri + Vue Setup**
- Initialize Tauri + Vue 3 + Vite project
- Configure Tailwind with monochrome dark theme
- Set up JetBrains Mono font
- Create base UI components (terminal aesthetic)

**2. Data Layer**
- File system API in Rust (absolute paths, no tilde expansion)
- JSON read/write with validation
- Config management
- Project registry (default + custom locations)
- Auto-create `.kanstack/` folders

**3. Core Board UI**
- Board view with columns
- Card display and drag-and-drop (fractional ordering)
- Create/edit/delete cards
- Markdown rendering for card content
- Card detail modal

**4. Card Features**
- Tags system (suggested tags per project, cards use any)
- Checklists (structured array only)
- Card linking (with project/board context)
- Parent/sub-item relationships (computed)
- Due dates
- Archive functionality

### Phase 2: Multi-Project & Combined Board

**5. Project Management**
- Project sidebar/navigation
- Create new project (default location)
- Import project (custom location picker)
- Project settings
- Quick switcher

**6. Combined Board**
- Virtual board aggregation (CardWithContext)
- Filter by project/tag/status
- Search across all cards
- Offline indicators (runtime availability check)
- Edit cards with context-aware write-back

**7. Polish & Keyboard**
- Command palette (Cmd+K)
- Vim-style navigation (hjkl)
- Keyboard shortcuts
- Auto-save

### Phase 3: AI Integration Foundation

**8. Structured API**
- AI-friendly board summaries
- Natural language search
- Batch operations
- Card creation from structured data

**9. File Watchers & Context**
- Watch for external file changes (opencode)
- Real-time UI updates
- AI metadata tracking

**10. MCP Server**
- Model Context Protocol implementation
- Tools: list_projects, read_board, create_card, etc.
- Resources and prompts for LLM integration

### Phase 4: Sync Layer

**11. Yjs Foundation**
- Integrate Yjs CRDT library
- Add `yjsState` field to files
- CRDT operations for all data changes

**12. iCloud/Dropbox Sync**
- File watcher for sync folders
- Conflict detection
- Manual merge UI

**13. WebSocket Server**
- Self-hosted server scaffold
- Real-time sync protocol
- Authentication framework

**14. WebRTC P2P**
- Peer discovery
- Direct P2P sync
- Server fallback

---

## UI/UX Specifications

### Color Palette (Monochrome)
```css
--bg-primary: #0a0a0a      /* main background */
--bg-secondary: #111111    /* cards, panels */
--bg-tertiary: #1a1a1a     /* elevated elements */
--border-subtle: #333333   /* borders */
--border-visible: #555555  /* active borders */
--text-muted: #888888      /* disabled, hints */
--text-secondary: #aaaaaa  /* labels */
--text-primary: #ffffff    /* main text */
--accent: #ffffff          /* focus, active states */
```

### Typography
```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
--text-xs: 12px;   /* hints, timestamps */
--text-sm: 14px;   /* labels, tags */
--text-base: 16px; /* body, card titles */
--text-lg: 20px;   /* board titles */
```

### Component Styles
- All elements: `border-radius: 0` (sharp corners)
- Borders: `1px solid var(--border-subtle)`
- Focus: `outline: 2px solid var(--accent)`
- Hover: `border-color: var(--border-visible)` or `background: var(--bg-tertiary)`
- Spacing: 4px grid system

### Keyboard Shortcuts
- `Cmd/Ctrl+K` — Command palette
- `j/k` — Navigate cards (vim-style)
- `h/l` — Navigate columns
- `Enter` — Open card
- `n` — New card
- `e` — Edit card
- `a` — Archive card
- `?` — Show shortcuts

---

## Tauri Commands (Rust)

```rust
// File system
read_file(path: String) -> Result<String>
write_file(path: String, content: String) -> Result<()>
list_directory(path: String) -> Result<Vec<FileEntry>>
ensure_directory(path: String) -> Result<()>
resolve_path(path: String) -> Result<String>  // Expand ~, check exists

// Project operations
list_projects() -> Result<Vec<Project>>
create_project(name: String, location: ProjectLocation) -> Result<Project>
import_project(path: String) -> Result<Project>  // Custom location
delete_project(id: String) -> Result<()>
check_project_availability(id: String) -> Result<bool>  // Runtime check

// Board operations
list_boards(project_id: String) -> Result<Vec<BoardMeta>>
read_board(project_id: String, board_id: String) -> Result<Board>
write_board(project_id: String, board_id: String, data: Board) -> Result<()>
create_board(project_id: String, name: String) -> Result<Board>
delete_board(project_id: String, board_id: String) -> Result<()>
delete_column(project_id: String, board_id: String, column_id: String, target_column_id: Option<String>) -> Result<()>

// Combined board
get_all_cards(filter: FilterOptions) -> Result<Vec<CardWithContext>>
update_card_global(card_with_context: CardWithContext) -> Result<()>
```

---

## Architecture Decisions Summary

| Aspect | Decision |
|--------|----------|
| Paths | Absolute paths stored, tilde expanded at write-time |
| Ordering | Fractional indexing strings (not integers) |
| Availability | Runtime check only, not persisted |
| Checklists | Structured array only (no markdown parsing) |
| Yjs | Added in Phase 4, not in Phase 1 JSON |
| Links | Full context (cardId, boardId, projectId) |
| Sub-items | Computed from `parentId`, no `subItemIds` |
| Tags | Project tags are suggestions, cards use any string |
| Combined board | Virtual only, no physical file |
| Column deletion | Requires moving cards first |
| API style | Composition API with `<script setup>` |
| Font | JetBrains Mono, monospace everywhere |
| Theme | Monochrome dark (no colors except grays and white) |

---

## Future Considerations

### AI Integration (Phase 3)
- Natural language card creation: "Create card: Fix login bug, tag as urgent"
- Smart suggestions for tags, due dates, related cards
- Batch operations via structured API
- MCP (Model Context Protocol) for opencode integration
- File watching for AI agent edits

### Sync Layer (Phase 4)
- Local-first with automatic sync when available
- Yjs CRDTs for conflict-free collaboration
- Multiple sync backends: iCloud/Dropbox, self-hosted WebSocket, WebRTC P2P
- Graceful offline handling with sync status indicators

### Server-Ready Architecture
- REST API for remote access
- Authentication framework
- Docker configuration for easy self-hosting
- WebSocket for real-time updates

---

## Development Notes

### Building the Project
```bash
# Setup
cargo install tauri-cli
npm install

# Development
npm run tauri dev

# Build
npm run tauri build
```

### File Structure
```
kanstack/
├── docs/
│   └── PLAN.md              # This file
├── src/
│   ├── components/          # Vue components
│   ├── stores/              # Pinia stores
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Helper functions
│   └── App.vue              # Root component
├── src-tauri/
│   ├── src/
│   │   ├── commands/        # Tauri command handlers
│   │   ├── models/          # Rust data structures
│   │   └── main.rs          # Entry point
│   └── Cargo.toml
├── public/
├── index.html
├── package.json
└── tailwind.config.js
```

---

*Plan version: 1.0*
*Last updated: 2026-01-29*
