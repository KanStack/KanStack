# Core Concepts

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](../README.md)
- [TODO/README.md](../TODO/README.md)
- [TODO/cards/cross-workspace-boards.md](../TODO/cards/cross-workspace-boards.md)
- [TODO/cards/tauri-backend-module-split.md](../TODO/cards/tauri-backend-module-split.md)
- [TODO/todo.md](../TODO/todo.md)
- [docs/plans/2026-03-11-example-workspace-refresh-design.md](../docs/plans/2026-03-11-example-workspace-refresh-design.md)
- [docs/plans/2026-03-12-cross-workspace-boards-design.md](../docs/plans/2026-03-12-cross-workspace-boards-design.md)

</details>



This page introduces the fundamental concepts needed to understand how KanStack works: workspaces, boards, cards, and the markdown format that ties them together. These concepts form the foundation of KanStack's local-first, file-based architecture.

For detailed information about specific topics, see:
- [4.1 Workspaces and TODO/ Structure](4.1-workspaces-and-todo-structure.md) for directory organization and workspace discovery
- [4.2 Boards and Sub-Boards](4.2-boards-and-sub-boards.md) for board structure, columns, and hierarchies
- [4.3 Cards](4.3-cards.md) for card metadata and content organization
- [4.4 Markdown Format](4.4-markdown-format.md) for the detailed markdown syntax and conventions

## The KanStack Mental Model

KanStack organizes work using a three-level hierarchy: **workspaces**, **boards**, and **cards**. Each level corresponds to a specific directory and file structure on disk, with markdown files serving as the single source of truth.

```mermaid
graph TB
    W["Workspace<br/>(TODO/ directory)"]
    B["Board<br/>(todo.md file)"]
    C1["Card<br/>(cards/*.md files)"]
    C2["Card"]
    C3["Card"]
    SB1["Sub-Board<br/>(child TODO/)"]
    SB2["Sub-Board<br/>(child TODO/)"]
    
    W --> B
    B --> C1
    B --> C2
    B --> C3
    B --> SB1
    B --> SB2
    SB1 -.recursive structure.-> W
    SB2 -.recursive structure.-> W
```

**Sources:** [README.md:34-54](../README.md), [TODO/README.md:1-27](../TODO/README.md)

### Local-First Architecture

KanStack is a **local-first** application that stores all data in markdown files. There is no database, no server, and no proprietary file format. This design provides several benefits:

| Aspect | Implementation |
|--------|---------------|
| **Data ownership** | All files live on your local filesystem |
| **Portability** | Markdown files can be read/edited by any text editor |
| **Version control** | Boards and cards work seamlessly with Git |
| **Tool independence** | Your data remains accessible even without KanStack |
| **Human readability** | Board structure and card content are plain text |

The application reads markdown files from disk, parses them into structured data, and presents a visual kanban interface. When you make changes through the UI, KanStack updates the markdown files directly.

**Sources:** [README.md:3-12](../README.md), [docs/plans/2026-03-12-cross-workspace-boards-design.md:1-61](../docs/plans/2026-03-12-cross-workspace-boards-design.md)

## Fundamental Data Structures

KanStack transforms markdown files through multiple stages, each represented by specific TypeScript types. Understanding these structures is essential for working with the codebase.

```mermaid
graph LR
    subgraph "File System Layer"
        FS["TODO/<br/>todo.md<br/>cards/*.md"]
    end
    
    subgraph "Backend Layer (Rust)"
        WS["WorkspaceSnapshot<br/>rootPath: string<br/>boards: FileSnapshot[]<br/>cards: FileSnapshot[]"]
    end
    
    subgraph "Parsing Layer (TypeScript)"
        KPR["KanbanParseResult<br/>version: string<br/>boards: KanbanBoardDocument[]<br/>cards: KanbanCardDocument[]<br/>diagnostics: Diagnostic[]"]
        
        KBD["KanbanBoardDocument<br/>slug: string<br/>path: string<br/>frontmatter: {title}<br/>columns: Column[]<br/>subBoards: SubBoard[]<br/>settings: BoardSettings"]
        
        KCD["KanbanCardDocument<br/>slug: string<br/>path: string<br/>frontmatter: Metadata<br/>body: string<br/>sections: Section[]<br/>checklist: ChecklistItem[]"]
    end
    
    subgraph "Index Layer (TypeScript)"
        LW["LoadedWorkspace<br/>rootPath: string<br/>rootBoardSlug: string<br/>boardsBySlug: Map<br/>cardsBySlug: Map<br/>boardOrder: string[]"]
    end
    
    FS -->|"load_workspace"| WS
    WS -->|"parseWorkspace()"| KPR
    KPR --> KBD
    KPR --> KCD
    KPR -->|"buildLoadedWorkspace()"| LW
    LW -.indexes.-> KBD
    LW -.indexes.-> KCD
```

**Sources:** docs/schemas/kanban-parser-schema.ts (referenced in [README.md:55](../README.md)), Diagram 2 and Diagram 7 from high-level architecture

### Data Transformation Pipeline

The data flows through four distinct layers:

1. **File System Layer**: Raw markdown files in `TODO/` directories
2. **Backend Layer**: `WorkspaceSnapshot` containing file paths and content, produced by Rust backend commands
3. **Parsing Layer**: `KanbanParseResult` with structured `KanbanBoardDocument` and `KanbanCardDocument` objects, created by `parseWorkspace()`
4. **Index Layer**: `LoadedWorkspace` with maps for efficient lookup by slug, created by `buildLoadedWorkspace()`

Each layer serves a specific purpose:

| Layer | Purpose | Key Functions |
|-------|---------|---------------|
| **WorkspaceSnapshot** | Raw file data from backend | Created by `load_workspace` command |
| **KanbanParseResult** | Structured, validated documents | Created by `parseWorkspace()` utility |
| **LoadedWorkspace** | Indexed, ready-to-use state | Created by `buildLoadedWorkspace()` |

**Sources:** Diagram 2 (Workspace Data Flow Pipeline), src-tauri/src/backend/commands/workspace.rs (for `load_workspace`), frontend parsing utilities

## File System Organization

Every board in KanStack has its own `TODO/` directory containing all related files. This structure enables boards to be self-contained and portable.

```mermaid
graph TB
    subgraph "Project Root"
        P["project/"]
    end
    
    subgraph "Board Root (TODO/)"
        TD["TODO/"]
        TM["TODO/todo.md<br/>(canonical board file)"]
        TR["TODO/README.md<br/>(board documentation)"]
        CD["TODO/cards/<br/>(card files)"]
        C1["TODO/cards/task-1.md"]
        C2["TODO/cards/task-2.md"]
        C3["TODO/cards/feature-x.md"]
    end
    
    subgraph "Sub-Board 1"
        SB1["services/api/TODO/"]
        SB1T["services/api/TODO/todo.md"]
        SB1C["services/api/TODO/cards/"]
    end
    
    subgraph "Sub-Board 2"
        SB2["services/auth/TODO/"]
        SB2T["services/auth/TODO/todo.md"]
        SB2C["services/auth/TODO/cards/"]
    end
    
    P --> TD
    TD --> TM
    TD --> TR
    TD --> CD
    CD --> C1
    CD --> C2
    CD --> C3
    
    P --> SB1
    SB1 --> SB1T
    SB1 --> SB1C
    
    P --> SB2
    SB2 --> SB2T
    SB2 --> SB2C
    
    TM -.references via<br/>## Sub Boards.-> SB1
    TM -.references via<br/>## Sub Boards.-> SB2
```

**Sources:** [README.md:34-54](../README.md), [TODO/README.md:28-38](../TODO/README.md), [docs/plans/2026-03-12-cross-workspace-boards-design.md:8-14](../docs/plans/2026-03-12-cross-workspace-boards-design.md)

### Board Root Structure

Each `TODO/` directory follows this layout:

| File/Directory | Purpose | Required |
|----------------|---------|----------|
| `todo.md` | Canonical board definition with columns and card placement | Yes |
| `cards/*.md` | Individual card files with metadata and content | No |
| `README.md` | Board-specific documentation and notes | No |

The `todo.md` file controls:
- Board title (via frontmatter)
- Column order and names
- Card placement within columns
- Section organization within columns
- Sub-board references
- Board settings (via `%% kanban:settings %%` block)

**Sources:** [README.md:46-52](../README.md), [TODO/README.md:28-38](../TODO/README.md)

### Board Identity and Paths

Board identity in KanStack is **path-based**, not filename-based. The normalized path to a board's `TODO/` directory serves as its stable identifier.

```mermaid
graph LR
    subgraph "Path Resolution"
        RP["Root Path<br/>/home/user/project"]
        BP["Board Path<br/>TODO"]
        FP["Full Path<br/>/home/user/project/TODO"]
        BS["Board Slug<br/>'todo'"]
    end
    
    subgraph "Sub-Board Resolution"
        SRP["Sub-Board Relative Path<br/>services/api/TODO"]
        SFP["Sub-Board Full Path<br/>/home/user/project/services/api/TODO"]
        SBS["Sub-Board Slug<br/>'services-api-todo'"]
    end
    
    RP --> FP
    BP --> FP
    FP --> BS
    
    FP --> SFP
    SRP --> SFP
    SFP --> SBS
```

This path-based model ensures:
- Cards from different boards never collide (even with identical filenames)
- Sub-boards can be reorganized without breaking references
- Board identity remains stable during renames (only title changes)

**Sources:** [docs/plans/2026-03-12-cross-workspace-boards-design.md:33-38](../docs/plans/2026-03-12-cross-workspace-boards-design.md), src-tauri/src/backend/workspace/paths.rs

## Data Ownership and Relationships

KanStack maintains clear ownership boundaries between boards and cards.

```mermaid
graph TB
    subgraph "Board Scope"
        B["Board<br/>(todo.md)"]
        COL1["Column: Backlog"]
        COL2["Column: In Progress"]
        COL3["Column: Done"]
        SB["Sub-Boards Section<br/>(## Sub Boards)"]
    end
    
    subgraph "Card Scope (owned by board)"
        C1["Card: task-1.md<br/>(in Backlog)"]
        C2["Card: task-2.md<br/>(in In Progress)"]
        C3["Card: task-3.md<br/>(in Done)"]
    end
    
    subgraph "Child Boards"
        CB1["Child Board TODO/"]
        CB2["Child Board TODO/"]
    end
    
    B --> COL1
    B --> COL2
    B --> COL3
    B --> SB
    
    COL1 --> C1
    COL2 --> C2
    COL3 --> C3
    
    SB -.links to.-> CB1
    SB -.links to.-> CB2
```

**Sources:** [TODO/README.md:28-95](../TODO/README.md), [docs/plans/2026-03-12-cross-workspace-boards-design.md:47-53](../docs/plans/2026-03-12-cross-workspace-boards-design.md)

### Ownership Rules

| Entity | Owned By | Stored In |
|--------|----------|-----------|
| **Card files** | The board in whose `TODO/cards/` they reside | `TODO/cards/*.md` |
| **Card placement** | The board's `todo.md` file | Column/section in `todo.md` |
| **Column structure** | The board | `## ` headings in `todo.md` |
| **Board settings** | The board | `%% kanban:settings %%` in `todo.md` |
| **Sub-board links** | The parent board | `## Sub Boards` in `todo.md` |

When you edit a card through the KanStack UI, the changes are written to the card file in the owning board's `TODO/cards/` directory. When you move a card between columns, only the board's `todo.md` file is updated—the card file itself remains unchanged.

**Sources:** [docs/plans/2026-03-12-cross-workspace-boards-design.md:47-53](../docs/plans/2026-03-12-cross-workspace-boards-design.md)

## Board Operations and Serialization

KanStack maintains a consistent pattern for all board and card operations: parse markdown, modify structure, serialize to markdown, persist to disk.

```mermaid
sequenceDiagram
    participant UI as "UI Component"
    participant Comp as "useBoardActions"
    participant Ser as "serializeBoard"
    participant BE as "Rust Backend"
    participant FS as "File System"
    
    UI->>Comp: "moveCard(board, params)"
    Comp->>Comp: "Capture state snapshot<br/>for undo"
    Comp->>Ser: "moveBoardCardMarkdown(board, params)"
    Ser-->>Comp: "Updated markdown string"
    Comp->>BE: "invoke('save_board_file', {path, content})"
    BE->>FS: "Write TODO/todo.md"
    FS-->>BE: "Success"
    BE-->>Comp: "WorkspaceSnapshot"
    Comp->>Comp: "applyWorkspaceMutation(snapshot)"
    Comp-->>UI: "Reactive state updated"
```

**Sources:** Diagram 4 (Board and Card Operations Flow), src/composables/useBoardActions.ts (inferred), serialization utilities

### Key Operations

The `useBoardActions` composable provides functions for manipulating boards and cards:

| Operation | Function | Markdown Target | Updates |
|-----------|----------|-----------------|---------|
| Move card | `moveCard()` | `todo.md` | Card's column/section placement |
| Create card | `createCard()` | `cards/*.md` + `todo.md` | New card file + board placement |
| Archive card | `archiveCard()` | `todo.md` | Moves card to Archive column |
| Rename column | `renameColumn()` | `todo.md` | Column heading |
| Create board | `createBoard()` | New `TODO/todo.md` | New board file |
| Add sub-board | Manual discovery | `todo.md` | `## Sub Boards` section |

All operations follow the serialization → persistence → mutation pattern shown in the diagram above.

**Sources:** Diagram 4, src/composables/useBoardActions.ts (inferred)

## Workspace Loading and Parsing

When KanStack opens a workspace, it loads all boards and cards in the hierarchy, starting from the root `TODO/` directory.

```mermaid
graph TB
    subgraph "Backend (Rust)"
        CMD["load_workspace command"]
        DISC["discover_boards()<br/>(src-tauri/src/backend/workspace/discovery.rs)"]
        LOAD["collect_workspace_files()<br/>(src-tauri/src/backend/workspace/loading.rs)"]
        SNAP["WorkspaceSnapshot"]
    end
    
    subgraph "Frontend (TypeScript)"
        PARSE["parseWorkspace()<br/>(src/utils/workspace/parseWorkspace.ts)"]
        BUILD["buildLoadedWorkspace()<br/>(src/utils/workspace/buildLoadedWorkspace.ts)"]
        
        KPR["KanbanParseResult<br/>boards[], cards[], diagnostics[]"]
        LW["LoadedWorkspace<br/>boardsBySlug Map<br/>cardsBySlug Map"]
    end
    
    subgraph "Reactive State"
        WS["useWorkspace<br/>loaded: Ref<LoadedWorkspace>"]
    end
    
    CMD --> DISC
    DISC --> LOAD
    LOAD --> SNAP
    SNAP --> PARSE
    PARSE --> KPR
    KPR --> BUILD
    BUILD --> LW
    LW --> WS
```

**Sources:** src-tauri/src/backend/workspace/discovery.rs, src-tauri/src/backend/workspace/loading.rs, Diagram 2

### Loading Sequence

1. **Backend Discovery**: The `load_workspace` command resolves the root `TODO/` path
2. **Board Scanning**: `discover_boards()` recursively finds all sub-boards via `## Sub Boards` links
3. **File Collection**: `collect_workspace_files()` reads `todo.md` and `cards/*.md` for all discovered boards
4. **Snapshot Creation**: All file paths and content are packaged into a `WorkspaceSnapshot`
5. **Parsing**: `parseWorkspace()` transforms markdown into typed `KanbanBoardDocument` and `KanbanCardDocument` objects
6. **Indexing**: `buildLoadedWorkspace()` creates maps for efficient slug-based lookup
7. **Reactive Wrapping**: `useWorkspace` wraps the `LoadedWorkspace` in Vue reactive state

**Sources:** src-tauri/src/backend/commands/workspace.rs, src-tauri/src/backend/workspace/, Diagram 2

## Real-Time Synchronization

KanStack watches the filesystem for external changes and automatically reloads when files are modified outside the application.

```mermaid
graph LR
    subgraph "File System"
        TODO["TODO/<br/>todo.md, cards/*.md"]
        EXT["External Editor<br/>(VS Code, Vim, etc)"]
    end
    
    subgraph "Backend (Rust)"
        WATCH["File Watcher<br/>(notify crate)<br/>(src-tauri/src/backend/commands/watcher.rs)"]
        EVENT["workspace-changed event"]
    end
    
    subgraph "Frontend"
        LISTENER["Event Listener<br/>(useWorkspace)"]
        RELOAD["Reload workspace"]
    end
    
    EXT -.modifies.-> TODO
    WATCH -.watches.-> TODO
    TODO -.change detected.-> WATCH
    WATCH --> EVENT
    EVENT --> LISTENER
    LISTENER --> RELOAD
    RELOAD -.triggers.-> TODO
```

**Sources:** src-tauri/src/backend/commands/watcher.rs, Diagram 2

The watcher enables a **two-way editing model**: you can edit markdown files in your favorite text editor while KanStack is running, and changes will appear in the UI immediately. Conversely, changes made through the KanStack UI are written to disk and can be seen in external editors.

**Sources:** src-tauri/src/backend/commands/watcher.rs, [README.md:8-12](../README.md)

---

This mental model—workspaces as `TODO/` directories, boards as `todo.md` files, cards as `cards/*.md` files, with markdown as the single source of truth—forms the foundation of everything else in KanStack. Understanding these core concepts is essential before diving into the specific details of workspace structure, board organization, card metadata, or markdown syntax covered in the following pages.
