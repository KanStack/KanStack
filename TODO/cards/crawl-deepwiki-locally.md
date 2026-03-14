---
title: Crawl DeepWiki Locally
type: feature
priority: high
tags:
  - docs
  - tooling
  - automation
assignee: ai-agent
---

# Crawl DeepWiki Locally

Add a local export script that crawls the DeepWiki pages for this repo and writes the captured wiki into a new local `wiki/` folder as markdown plus any extracted diagram assets.

## Spec

- Start from the provided DeepWiki page and discover the full page list from the wiki navigation.
- Save each page locally with stable markdown filenames and working internal links.
- Preserve important structured content such as headings, lists, tables, code fences, and mermaid diagrams when present.
- Write enough metadata or index files so the exported wiki is easy to browse offline.
- Keep the implementation simple to run from this repo with clear usage instructions.

## Checklist

- [x] Confirm the export approach and output shape
- [x] Implement the crawler/export script
- [x] Write exported pages into a new local `wiki/` folder
- [x] Add usage documentation for refreshing the local export
- [x] Run the script and verify a representative sample of exported pages

## Review Notes

- Planning started from `https://deepwiki.com/KanStack/KanStack/1-overview` and the current DeepWiki navigation structure.
- Chosen approach: a simple Node HTML crawler that reads the server-rendered DeepWiki page data, extracts the embedded markdown payload for each page, rewrites internal links for offline browsing, and writes the result into `wiki/`.
- Added `scripts/export-deepwiki.mjs` plus `npm run wiki:export` so the DeepWiki snapshot can be refreshed without extra dependencies.
- The exporter writes 34 wiki pages plus `wiki/README.md` and `wiki/_manifest.json`, keeps mermaid fences inline, and rewrites DeepWiki page links to local markdown files.
- Updated `README.md` with a short wiki export section so the refresh command is discoverable from the repo root.

## Verification

- [x] Run `npm run wiki:export`
- [x] Confirm `wiki/README.md`, `wiki/1-overview.md`, and `wiki/3-architecture-overview.md` were generated with rewritten local links and inline mermaid fences
- [x] Confirm the exported markdown has no remaining numeric DeepWiki page links or empty markdown links