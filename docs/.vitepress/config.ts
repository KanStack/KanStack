import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    srcDir: "wiki",
    base: "/KanStack/",
    ignoreDeadLinks: true,

    title: "KanStack",
    description: "Local-first markdown-based Kanban board application",
    appearance: false,
    head: [
      ["link", { rel: "icon", href: "/favicon.ico" }],
      ["link", { rel: "icon", type: "image/png", href: "/logo.png" }],
    ],
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: "/logo.png",
      siteTitle: "KanStack",

      nav: [
        { text: "Home", link: "/" },
        { text: "Overview", link: "/1-overview" },
        { text: "Getting Started", link: "/2-getting-started" },
      ],

      sidebar: [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/1-overview" },
            { text: "Getting Started", link: "/2-getting-started" },
          ],
        },
        {
          text: "Architecture",
          collapsed: false,
          items: [
            { text: "Architecture Overview", link: "/3-architecture-overview" },
            { text: "Application Structure", link: "/3.1-application-structure" },
            { text: "Data Model", link: "/3.2-data-model" },
            { text: "Frontend Architecture", link: "/3.3-frontend-architecture" },
            { text: "Backend Architecture", link: "/3.4-backend-architecture" },
          ],
        },
        {
          text: "Core Concepts",
          collapsed: false,
          items: [
            { text: "Core Concepts", link: "/4-core-concepts" },
            {
              text: "Workspaces & TODO Structure",
              link: "/4.1-workspaces-and-todo-structure",
            },
            { text: "Boards & Sub-boards", link: "/4.2-boards-and-sub-boards" },
            { text: "Cards", link: "/4.3-cards" },
            { text: "Markdown Format", link: "/4.4-markdown-format" },
          ],
        },
        {
          text: "Frontend Guide",
          collapsed: false,
          items: [
            { text: "Frontend Guide", link: "/5-frontend-guide" },
            {
              text: "Main Application Component",
              link: "/5.1-main-application-component",
            },
            { text: "Composables Overview", link: "/5.2-composables-overview" },
            { text: "useWorkspace", link: "/5.2.1-useworkspace" },
            { text: "useBoardActions", link: "/5.2.2-useboardactions" },
            { text: "useCardEditor", link: "/5.2.3-usecardeditor" },
            { text: "Key Components", link: "/5.3-key-components" },
            { text: "CardEditorModal", link: "/5.3.1-cardeditormodal" },
            { text: "Frontend Utilities", link: "/5.4-frontend-utilities" },
            { text: "Workspace Parsing", link: "/5.4.1-workspace-parsing" },
            {
              text: "Board/Card Serialization",
              link: "/5.4.2-board-and-card-serialization",
            },
            {
              text: "Path/Slug Management",
              link: "/5.4.3-path-and-slug-management",
            },
          ],
        },
        {
          text: "Backend Guide",
          collapsed: false,
          items: [
            { text: "Backend Guide", link: "/6-backend-guide" },
            {
              text: "Entry Point & Menu System",
              link: "/6.1-main-entry-point-and-menu-system",
            },
            { text: "Command Handlers", link: "/6.2-command-handlers" },
            { text: "Workspace Operations", link: "/6.3-workspace-operations" },
            { text: "File System Watching", link: "/6.4-file-system-watching" },
          ],
        },
        {
          text: "Data Schemas & Types",
          collapsed: false,
          items: [
            { text: "Data Schemas and Types", link: "/7-data-schemas-and-types" },
            { text: "Kanban Parser Schema", link: "/7.1-kanban-parser-schema" },
            { text: "Workspace Types", link: "/7.2-workspace-types" },
          ],
        },
        {
          text: "Development",
          collapsed: false,
          items: [
            { text: "Development Guide", link: "/8-development-guide" },
            {
              text: "Project Setup & Build",
              link: "/8.1-project-setup-and-build",
            },
          ],
        },
      ],

      socialLinks: [
        { icon: "github", link: "https://github.com/KanStack/KanStack" },
      ],

      outline: {
        level: [2, 3],
      },
    },
  })
);