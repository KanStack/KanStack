# Overview

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](../README.md)
- [package.json](../package.json)
- [src-tauri/Cargo.toml](../src-tauri/Cargo.toml)

</details>



## Purpose and Scope

This document introduces KanStack, a local-first markdown-based Kanban board desktop application. It explains the application's core purpose, design philosophy, technology stack, and key capabilities. For installation and usage instructions, see [Getting Started](2-getting-started.md). For detailed architectural information, see [Architecture Overview](3-architecture-overview.md).

## What is KanStack?

KanStack is a desktop application for managing Kanban boards stored as markdown files. It reads and writes a `TODO/` directory structure containing `todo.md` board files and individual card files in markdown format. The application provides a graphical interface for viewing and editing these files while maintaining the markdown files as the single source of truth.

The application is built as a desktop-native program using Tauri 2, combining a Vue.js 3 frontend with a Rust backend. All board and card data exists as plain markdown files on the local filesystem—there is no database, no cloud sync, and no proprietary data formats.

**Sources:** [README.md:1-13](../README.md), [package.json:1-29](../package.json), [src-tauri/Cargo.toml:1-27](../src-tauri/Cargo.toml)

## Core Design Philosophy

KanStack follows three fundamental principles:

### Local-First Architecture

All data resides on the user's local filesystem. The application reads from and writes to markdown files in a `TODO/` directory structure. No network requests are made, no external services are required, and the user maintains complete ownership of their data.

### Markdown as Source of Truth

Board structure and card content are stored in human-readable markdown files that follow specific conventions. These files can be edited in any text editor, versioned with git, or processed by other tools. The application parses markdown to build its internal data model and serializes changes back to markdown for persistence.

### Zero Database Dependency

The application maintains no database, cache files, or binary data stores. Application state is derived on-demand from markdown files. The only persistent state outside the workspace is user preferences stored in a `config.md` file in the application's data directory.

**Sources:** [README.md:1-13](../README.md), [README.md:34-56](../README.md)

## Technology Stack

The following table summarizes the core technologies used in KanStack:

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Desktop Framework | Tauri | 2.x | Native desktop application shell |
| Frontend Framework | Vue.js | 3.5.13 | Reactive UI components and state management |
| Frontend Language | TypeScript | 5.7.2 | Type-safe frontend code |
| Frontend Build | Vite | 5.4.14 | Fast development server and bundler |
| Backend Language | Rust | 2021 edition | File I/O, workspace operations, system integration |
| File Watching | notify | 6.x | Filesystem change detection |
| Serialization | serde, serde_json, serde_yaml | 1.x / 0.9 | Data structure serialization |

**KanStack Technology Stack and Communication Flow**

```mermaid
graph TB
    subgraph Desktop["Desktop Application (Tauri 2)"]
        subgraph Frontend["Frontend Layer"]
            Vue["Vue.js 3.5.13<br/>Components + Composables"]
            TS["TypeScript 5.7.2<br/>Type Definitions"]
            Vite["Vite 5.4.14<br/>Build Tool"]
        end
        
        IPC["@tauri-apps/api<br/>IPC Bridge<br/>invoke() / listen()"]
        
        subgraph Backend["Backend Layer"]
            Rust["Rust 2021<br/>Command Handlers"]
            Notify["notify 6<br/>File Watcher"]
            Serde["serde + serde_json + serde_yaml<br/>Serialization"]
        end
    end
    
    FS["Local Filesystem<br/>TODO/ directories<br/>*.md files"]
    
    Vue -->|"reactive state"| TS
    TS -->|"invoke commands"| IPC
    IPC <-->|"typed messages"| Rust
    Rust -->|"read/write"| FS
    Rust -->|"uses"| Serde
    Notify -->|"watches"| FS
    Notify -->|"emits events"| Rust
    Vite -.->|"bundles"| Vue
```

**Sources:** [package.json:15-28](../package.json), [src-tauri/Cargo.toml:8-18](../src-tauri/Cargo.toml)

## Workspace Structure and File Organization

KanStack workspaces follow a conventional directory structure. Each board is represented by a `TODO/` directory containing a `todo.md` file, a `cards/` subdirectory, and an optional `README.md` file.

**Workspace Directory Structure**

```mermaid
graph TB
    Root["Workspace Root<br/>(any directory)"]
    TODO["TODO/<br/>(board root)"]
    TodoMD["todo.md<br/>(board structure)"]
    CardsDir["cards/<br/>(card files)"]
    Card1["card-1.md"]
    Card2["card-2.md"]
    ReadmeMD["README.md<br/>(optional notes)"]
    SubProj["sub-project/<br/>(child workspace)"]
    SubTODO["TODO/<br/>(child board)"]
    
    Root --> TODO
    TODO --> TodoMD
    TODO --> CardsDir
    TODO --> ReadmeMD
    CardsDir --> Card1
    CardsDir --> Card2
    Root --> SubProj
    SubProj --> SubTODO
```

### File Responsibilities

| File | Purpose | Content |
|------|---------|---------|
| `todo.md` | Board structure definition | Column definitions, card placement, section organization, sub-board links |
| `cards/*.md` | Individual card content | Card metadata (frontmatter), full description, checklists, notes |
| `README.md` | Board-level documentation | Notes about the board itself (optional) |
| Sub-board `TODO/` | Hierarchical organization | Nested workspaces for project decomposition |

### Key Data Flow: Markdown to Application State

The application transforms markdown files through several stages to build its runtime state:

```mermaid
graph LR
    MD["Markdown Files<br/>todo.md<br/>cards/*.md"]
    WS["WorkspaceSnapshot<br/>(backend/models.rs)<br/>raw file paths + content"]
    PR["KanbanParseResult<br/>(kanbanParser.ts)<br/>structured boards + cards"]
    LW["LoadedWorkspace<br/>(workspaceData.ts)<br/>indexed maps"]
    State["Reactive State<br/>(useWorkspace.ts)<br/>Vue refs + computed"]
    
    MD -->|"Rust: load_workspace"| WS
    WS -->|"parseWorkspace()"| PR
    PR -->|"buildLoadedWorkspace()"| LW
    LW -->|"ref() + computed()"| State
```

The reverse flow occurs when the user makes changes: the frontend serializes updated boards back to markdown, invokes Rust commands to write files, and receives an updated `WorkspaceSnapshot` to refresh the UI.

**Sources:** [README.md:34-56](../README.md)

## Core Features

### Board Management

- **Multi-board workspaces**: Open a root `TODO/` directory and navigate to any discovered sub-boards
- **Hierarchical structure**: Organize projects with parent-child board relationships
- **Column and section organization**: Define custom columns with optional sections for grouping cards
- **Sub-board discovery**: Automatically detect nested `TODO/` directories and build board lineage

### Card Operations

- **Full-text editing**: Edit card content in a dedicated modal with live autosave
- **Metadata management**: Track card properties via frontmatter (tags, priorities, timestamps)
- **Wikilink references**: Link cards using `[[card-slug]]` syntax
- **Card movement**: Drag cards between columns and sections, archive to hidden archive column
- **Multi-select operations**: Select multiple cards for batch archiving or movement

### Workspace Features

- **File watching**: Automatic UI updates when markdown files change externally
- **Undo/redo**: Full operation history with snapshot-based rollback
- **Keyboard shortcuts**: Navigate and manipulate boards without mouse interaction
- **No lock-in**: All data remains in standard markdown format, editable in any text editor

**Sources:** [README.md:7-13](../README.md)

## High-Level Application Architecture

The following diagram maps the conceptual system to actual code modules and data structures:

```mermaid
graph TB
    subgraph UI["UI Layer (src/)"]
        AppVue["App.vue<br/>orchestrates composables<br/>handles keyboard shortcuts"]
        BoardCanvas["BoardCanvas.vue<br/>renders columns + cards"]
        CardEditor["CardEditorModal.vue<br/>edit form UI"]
        
        subgraph Composables["Composables (src/composables/)"]
            UseWS["useWorkspace.ts<br/>manages LoadedWorkspace<br/>current board selection"]
            UseBA["useBoardActions.ts<br/>create/move/archive operations"]
            UseCE["useCardEditor.ts<br/>edit session + autosave"]
        end
    end
    
    subgraph IPC["IPC Layer"]
        TauriAPI["@tauri-apps/api<br/>invoke()<br/>listen()"]
    end
    
    subgraph Backend["Backend (src-tauri/src/)"]
        Commands["backend/commands/<br/>workspace.rs<br/>board.rs<br/>card.rs<br/>watcher.rs"]
        Workspace["backend/workspace/<br/>loading.rs<br/>markdown.rs<br/>fs.rs"]
    end
    
    subgraph Data["Data Structures"]
        FS["TODO/<br/>todo.md<br/>cards/*.md"]
        Snapshot["WorkspaceSnapshot<br/>(models.rs)"]
        ParseResult["KanbanParseResult<br/>(kanbanParser.ts)"]
        Loaded["LoadedWorkspace<br/>(workspaceData.ts)"]
    end
    
    AppVue --> BoardCanvas
    AppVue --> CardEditor
    AppVue --> UseWS
    AppVue --> UseBA
    AppVue --> UseCE
    
    UseWS -->|"invoke('load_workspace')"| TauriAPI
    UseBA -->|"invoke('save_board_file')"| TauriAPI
    UseCE -->|"invoke('save_card_file')"| TauriAPI
    
    TauriAPI --> Commands
    Commands --> Workspace
    
    Workspace -->|"read files"| FS
    Workspace -->|"creates"| Snapshot
    
    Snapshot -->|"parseWorkspace()"| ParseResult
    ParseResult -->|"buildLoadedWorkspace()"| Loaded
    Loaded --> UseWS
    
    UseBA -->|"mutates"| Loaded
    UseCE -->|"mutates"| Loaded
```

### Component Responsibilities

| Component/Module | Responsibility | Key Types/Functions |
|-----------------|----------------|---------------------|
| `App.vue` | Application orchestrator, keyboard shortcuts, menu integration | Coordinates all composables |
| `useWorkspace.ts` | Workspace state management, board/card selection | `LoadedWorkspace`, `applyWorkspaceMutation()` |
| `useBoardActions.ts` | Board and card mutations | `moveCard()`, `createBoard()`, `archiveCard()` |
| `useCardEditor.ts` | Card editing session management | `openEditor()`, `saveCardContent()` |
| `kanbanParser.ts` | Markdown parsing | `parseWorkspace()`, `KanbanParseResult` |
| `workspace.rs` | Backend workspace operations | `load_workspace()`, `save_board_file()` |
| `loading.rs` | File system snapshot collection | `collect_workspace_snapshot()` |

**Sources:** [README.md:67-75](../README.md)

## Application Lifecycle

A typical user session follows this flow:

1. **Initialization**: User launches the application
2. **Workspace Selection**: User opens a `TODO/` directory via file dialog
3. **Loading**: Backend reads all markdown files and creates `WorkspaceSnapshot`
4. **Parsing**: Frontend parses markdown into structured `KanbanParseResult`
5. **Indexing**: Parser output is indexed into `LoadedWorkspace` with efficient lookup maps
6. **Rendering**: Vue components render the current board based on reactive state
7. **Interaction**: User performs operations (move cards, edit content, create boards)
8. **Persistence**: Operations serialize changes to markdown and invoke backend to write files
9. **Synchronization**: File watcher detects changes and triggers workspace reload

**Sources:** [README.md:14-32](../README.md)

## Relationship to Other Documentation

This overview provides a conceptual introduction to KanStack. For more specific information:

- **Installation and usage**: See [Getting Started](2-getting-started.md)
- **Technical architecture details**: See [Architecture Overview](3-architecture-overview.md)
- **Workspace directory structure**: See [Workspaces and TODO/ Structure](4.1-workspaces-and-todo-structure.md)
- **Markdown format conventions**: See [Markdown Format](4.4-markdown-format.md)
- **Frontend implementation**: See [Frontend Guide](5-frontend-guide.md)
- **Backend implementation**: See [Backend Guide](6-backend-guide.md)
- **Data structure reference**: See [Data Schemas and Types](7-data-schemas-and-types.md)
- **Development setup**: See [Development Guide](8-development-guide.md)
