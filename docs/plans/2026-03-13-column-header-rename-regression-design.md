# Column Header Rename Regression Design

## Goal

Restore the two-step column header interaction:

- click a column header to select it
- click the selected column title to start inline rename

## Current Regression

Column headers now participate in pointer-based column reordering. That drag wiring starts from the header itself, which can interfere with title-click rename interactions.

## Approach

- keep the existing rename persistence flow unchanged
- add a focused regression test around header-pointer gating for title controls
- prevent header drag setup when the pointer starts from the title button or title input

## Why This Approach

This is the smallest fix that restores the intended interaction without changing selection rules, rename behavior, or backend column persistence.

## Verification

- title clicks on an unselected column still select it
- title clicks on a selected column enter inline rename
- title-control pointer events do not arm column drag
