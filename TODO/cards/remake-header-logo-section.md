---
title: Remake Header Logo Section
type: feature
priority: medium
assignee: AGENT
tags:
  - ui
  - branding
---

# Remake Header Logo Section

Refresh the header brand/logo section so it feels more intentional while fitting the existing KanStack shell.

## Spec

- Rework the brand area in `src/components/app/AppHeader.vue`.
- Keep the overall app shell compact and aligned with the current monochrome UI.
- Improve the logo section without making the header feel promotional or noisy.
- Use the existing Tauri app logo in the header instead of a newly invented monogram.

## Checklist

- [x] Inspect the current header brand section and surrounding layout
- [x] Confirm the desired logo direction
- [x] Propose a few logo-section approaches with a recommendation
- [x] Write an approved design before implementation
- [x] Implement the approved logo-backed brand section
- [x] Verify the refreshed header logo section in the existing shell

## Review Notes

- Replaced the invented monogram with the existing Tauri app logo in the header brand block.
- Kept the existing monochrome shell, header density, and navigation layout intact.
- Kept the wordmark and eyebrow text, but made the logo source match the shipped app iconography.
- Flattened the breadcrumb and sub-board utilities into a single navigation line and removed the inline `+ board` action from that strip.
- Added a `:` separator between breadcrumbs and sub-board chips when child boards are present.
- Center-aligned the header row so the logo and navigation sit with more even vertical padding.

## Verification

- [x] `npm run build`
- [x] Confirmed the header brand area now renders the existing Tauri logo beside the KanStack wordmark in `src/components/app/AppHeader.vue`
- [x] Confirmed the breadcrumb and sub-board controls now share one line and the header no longer shows an inline new-board button
- [x] Confirmed the one-line header nav now shows `:` between breadcrumbs and sub-board chips only when sub-boards exist
- [x] Confirmed the header row is vertically centered for more even top/bottom spacing
