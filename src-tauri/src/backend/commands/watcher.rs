use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

use crate::backend::{
    models::{WorkspaceChangedPayload, WorkspaceWatcher, WorkspaceWatcherState},
    workspace::{is_workspace_markdown_file, validate_todo_root},
    WORKSPACE_CHANGED_EVENT,
};

#[tauri::command]
pub(crate) fn watch_workspace(
    path: String,
    app_handle: AppHandle,
    state: State<WorkspaceWatcherState>,
) -> Result<(), String> {
    let root_path = PathBuf::from(&path);
    validate_todo_root(&root_path)?;
    let project_root = root_path
        .parent()
        .ok_or_else(|| "Selected TODO folder is missing a parent directory.".to_string())?
        .to_path_buf();

    let mut guard = state.watcher.lock().map_err(|error| error.to_string())?;

    if guard
        .as_ref()
        .map(|watcher| watcher.root_path == path)
        .unwrap_or(false)
    {
        return Ok(());
    }

    let event_root_path = path.clone();
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            let Ok(event) = result else {
                return;
            };

            if !event.paths.iter().any(is_workspace_markdown_file) {
                return;
            }

            let _ = app_handle.emit(
                WORKSPACE_CHANGED_EVENT,
                WorkspaceChangedPayload {
                    root_path: event_root_path.clone(),
                },
            );
        },
        Config::default(),
    )
    .map_err(|error| error.to_string())?;

    watcher
        .watch(&project_root, RecursiveMode::Recursive)
        .map_err(|error| error.to_string())?;

    *guard = Some(WorkspaceWatcher {
        root_path: path,
        _watcher: watcher,
    });

    Ok(())
}

#[tauri::command]
pub(crate) fn unwatch_workspace(state: State<WorkspaceWatcherState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|error| error.to_string())?;
    *guard = None;
    Ok(())
}
