# Known Board Index On Disk Design

## Goal

Move the known-board index out of WebView local storage and into a durable machine-local file.

Note: the shipped implementation has since been consolidated into a unified machine-local `config.md` rather than a standalone `known-boards.json` file.

## Storage Location

- use a Tauri app-global data/config directory
- on macOS this should resolve under `~/Library/Application Support/KanStack/`
- store the index in a single JSON file named `known-boards.json`

## File Shape

```json
{
  "boardRoots": [
    "/Users/example/projects/foo/TODO",
    "/Users/example/projects/bar/TODO"
  ]
}
```

## Scope

- this is machine-local app metadata
- it is not board content and should not live inside individual `TODO/` roots
- all KanStack sessions on the same machine share the same known-board set

## Behavior

- reading known boards should come from `known-boards.json`
- opening, creating, or attaching a board updates the file
- missing boards are removed from the file during tree sync
- if the file does not exist, KanStack creates it lazily on first write
- if the file is malformed, KanStack should recover safely with an empty known-board set and surface a clear error if needed

## Why This Replaces Local Storage

- survives WebView resets and app storage quirks
- easier to inspect and back up locally
- more appropriate for durable machine-level app state
- keeps board markdown and app metadata clearly separated

## Verification

- known boards persist after app restart
- opening, creating, and attaching boards updates `known-boards.json`
- missing boards are removed from the file on sync
- an absent file is created automatically
- malformed JSON does not crash the app
