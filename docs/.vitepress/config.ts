import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// Rewrite numbered files to clean URLs
const numberedFiles = [
  "1-overview",
  "2-getting-started",
  "3-architecture-overview",
  "3.1-application-structure",
  "3.2-data-model",
  "3.3-frontend-architecture",
  "3.4-backend-architecture",
  "4-core-concepts",
  "4.1-workspaces-and-todo-structure",
  "4.2-boards-and-sub-boards",
  "4.3-cards",
  "4.4-markdown-format",
  "5-frontend-guide",
  "5.1-main-application-component",
  "5.2-composables-overview",
  "5.2.1-useworkspace",
  "5.2.2-useboardactions",
  "5.2.3-usecardeditor",
  "5.3-key-components",
  "5.3.1-cardeditormodal",
  "5.4-frontend-utilities",
  "5.4.1-workspace-parsing",
  "5.4.2-board-and-card-serialization",
  "5.4.3-path-and-slug-management",
  "6-backend-guide",
  "6.1-main-entry-point-and-menu-system",
  "6.2-command-handlers",
  "6.3-workspace-operations",
  "6.4-file-system-watching",
  "7-data-schemas-and-types",
  "7.1-kanban-parser-schema",
  "7.2-workspace-types",
  "8-development-guide",
  "8.1-project-setup-and-build",
];

const rewrites: Record<string, string> = {};
for (const file of numberedFiles) {
  const cleanName = file.replace(/^[0-9.]+-/, "");
  rewrites[`${file}.md`] = `${cleanName}.md`;
}

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    srcDir: "wiki",
    base: "/",
    cleanUrls: true,
    ignoreDeadLinks: true,
    rewrites,
    vite: {
      publicDir: "../.vitepress/public",
    },

    title: "KanStack",
    description: "Local-first markdown-based Kanban board application",
    appearance: false,
    mermaid: {
      theme: "dark",
    },
    head: [
      ["link", { rel: "icon", href: "/favicon.ico" }],
      ["link", { rel: "icon", type: "image/png", href: "/logo.png" }],
    ],
    themeConfig: {
      logo: "/logo.png",
      siteTitle: "KanStack",

      nav: [
        { text: "About", link: "/overview" },
        { text: "Getting Started", link: "/getting-started" },
      ],

      sidebar: [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/overview" },
            { text: "Getting Started", link: "/getting-started" },
          ],
        },
        {
          text: "Architecture",
          collapsed: false,
          items: [
            { text: "Architecture Overview", link: "/architecture-overview" },
            { text: "Application Structure", link: "/application-structure" },
            { text: "Data Model", link: "/data-model" },
            { text: "Frontend Architecture", link: "/frontend-architecture" },
            { text: "Backend Architecture", link: "/backend-architecture" },
          ],
        },
        {
          text: "Core Concepts",
          collapsed: false,
          items: [
            { text: "Core Concepts", link: "/core-concepts" },
            {
              text: "Workspaces & TODO Structure",
              link: "/workspaces-and-todo-structure",
            },
            { text: "Boards & Sub-boards", link: "/boards-and-sub-boards" },
            { text: "Cards", link: "/cards" },
            { text: "Markdown Format", link: "/markdown-format" },
          ],
        },
        {
          text: "Frontend Guide",
          collapsed: false,
          items: [
            { text: "Frontend Guide", link: "/frontend-guide" },
            {
              text: "Main Application Component",
              link: "/main-application-component",
            },
            { text: "Composables Overview", link: "/composables-overview" },
            { text: "useWorkspace", link: "/useworkspace" },
            { text: "useBoardActions", link: "/useboardactions" },
            { text: "useCardEditor", link: "/usecardeditor" },
            { text: "Key Components", link: "/key-components" },
            { text: "CardEditorModal", link: "/cardeditormodal" },
            { text: "Frontend Utilities", link: "/frontend-utilities" },
            { text: "Workspace Parsing", link: "/workspace-parsing" },
            {
              text: "Board/Card Serialization",
              link: "/board-and-card-serialization",
            },
            { text: "Path/Slug Management", link: "/path-and-slug-management" },
          ],
        },
        {
          text: "Backend Guide",
          collapsed: false,
          items: [
            { text: "Backend Guide", link: "/backend-guide" },
            {
              text: "Entry Point & Menu System",
              link: "/main-entry-point-and-menu-system",
            },
            { text: "Command Handlers", link: "/command-handlers" },
            { text: "Workspace Operations", link: "/workspace-operations" },
            { text: "File System Watching", link: "/file-system-watching" },
          ],
        },
        {
          text: "Data Schemas & Types",
          collapsed: false,
          items: [
            { text: "Data Schemas and Types", link: "/data-schemas-and-types" },
            { text: "Kanban Parser Schema", link: "/kanban-parser-schema" },
            { text: "Workspace Types", link: "/workspace-types" },
          ],
        },
        {
          text: "Development",
          collapsed: false,
          items: [
            { text: "Development Guide", link: "/development-guide" },
            { text: "Project Setup & Build", link: "/project-setup-and-build" },
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
  }),
);
