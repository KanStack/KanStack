# Kanstack Sub-Board Button Design

## Goal

Add a fast `new sub board` action that creates a linked child board from the current board view.

## Behavior

- a `new sub board` button appears beside `new card` in the board header
- clicking it creates a new board titled `Untitled Board`
- the new board is linked under the current board's `## Sub Boards` section
- the app navigates directly into the new board after creation

## Board Template

- new sub boards inherit the parent board's column structure
- columns are created empty and preserve section headings when present
- the new board starts with no cards and no sub-board links
- hidden/archive display settings are not forced on for the new board

## Persistence

- board creation uses one backend command that writes the new child board file and the updated parent board file together
- slugs are derived from `Untitled Board` and de-duplicated against existing board slugs

## Verification

- creating a sub board writes a new board file
- parent board markdown gains a new `[[boards/...]]` entry under `## Sub Boards`
- new board opens immediately after creation
- build and test checks remain green
