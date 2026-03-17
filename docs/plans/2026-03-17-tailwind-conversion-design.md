# Design: Convert to Tailwind v4

## Overview

Convert KanStack from custom CSS with CSS custom properties to Tailwind v4 utility classes. This is a full conversion of all Vue components and global styles.

## Approach: Tailwind-First

Replace all scoped `<style scoped>` blocks with Tailwind utility classes in templates. This is the idiomatic Tailwind approach and yields the best long-term maintainability.

## Setup & Configuration

### Dependencies
- `tailwindcss@4`
- `@tailwindcss/vite`

### Vite Config
Add `@tailwindcss/vite` plugin to `vite.config.ts`.

### Main CSS (src/style.css)
- Replace with Tailwind imports and theme configuration
- Keep JetBrains Mono font import
- Configure dark color palette using Tailwind v4's `@theme` directive

### Theme Color Mapping
| Current | Hex | Tailwind |
|---------|-----|----------|
| --shade-0 | #050505 | gray-950 |
| --shade-1 | #0d0d0d | gray-950 |
| --shade-2 | #141414 | gray-900 |
| --shade-3 | #242424 | gray-800 |
| --shade-4 | #8f8f8f | gray-400 |
| --shade-5 | #f2f2f2 | gray-200 |

## Component Conversion Strategy

### Conversion Order (dependencies first)
1. `src/style.css` - Replace with Tailwind base + theme
2. `src/App.vue` - Convert scoped styles
3. `src/components/app/AppHeader.vue`
4. `src/components/app/AppMessageBanner.vue`
5. `src/components/app/AppSelect.vue`
6. `src/components/board/BoardCanvas.vue`
7. `src/components/board/BoardColumn.vue`
8. `src/components/board/BoardViewControls.vue`
9. `src/components/board/CardTile.vue`
10. `src/components/card/CardEditorModal.vue`

### Per-Component Conversion
- Remove `<style scoped>` block entirely
- Replace class attributes with Tailwind utility classes
- Use arbitrary values for one-off values: `w-[calc(100vw-2rem)]`
- Keep Vue class object syntax for conditional styling: `:class="{ 'ring-1': selected }"`

## Design Tokens & Utility Mappings

### Color Palette (Always Dark)
- Base background: `bg-gray-950`
- Panel backgrounds: `bg-gray-900`
- Card backgrounds: `bg-gradient-to-b from-gray-900 to-gray-950`
- Border color: `border-gray-800`
- Text primary: `text-gray-200`
- Text muted: `text-gray-400`
- Text highlight: `text-white`

### Typography
- Font: `font-mono` (JetBrains Mono)
- Headings: `text-xl` to `text-3xl`
- Labels: `text-xs uppercase tracking-wider`
- Body: `text-sm` to `text-base`

### Spacing Patterns
- Gaps: `gap-2` (0.5rem), `gap-3` (0.75rem), `gap-4` (1rem)
- Padding: `p-2`, `p-3`, `p-4`
- Margins: `mt-1`, `mb-2`, etc.

### Interactive States
- Hover: `hover:border-gray-200`
- Focus: `focus-visible:ring focus-visible:ring-gray-200`
- Active/Selected: `ring-1 ring-gray-200`

### Custom CSS (Keep)
- Scrollbar styling (`::-webkit-scrollbar*`) - Tailwind doesn't support this
- CSS grid background pattern on body

## Success Criteria
- All `<style scoped>` blocks removed from Vue components
- `style.css` contains only Tailwind config + custom scrollbar styles
- App visual appearance unchanged
- No TypeScript errors
- Build succeeds