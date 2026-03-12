use std::path::PathBuf;

use tauri::AppHandle;

use crate::backend::{
    commands::{
        emit_workspace_changed,
        support::{board_write, card_write},
    },
    models::{WorkspaceBoardWrite, WorkspaceSnapshot, WorkspaceSnapshotInput},
    workspace::{
        build_workspace_snapshot, collect_snapshot_directories,
        remove_missing_workspace_snapshot_files, save_workspace_markdown_file_batch,
        validate_todo_root,
    },
};

#[tauri::command]
pub(crate) fn load_workspace(path: String) -> Result<WorkspaceSnapshot, String> {
    build_workspace_snapshot(&path)
}

#[tauri::command]
pub(crate) fn save_card_file(
    root: String,
    path: String,
    content: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    save_workspace_markdown_file_batch(&root, &[card_write(&path, &content)])?;
    emit_workspace_changed(&app_handle, &root)
}

#[tauri::command]
pub(crate) fn save_board_file(
    root: String,
    path: String,
    content: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(&root, &[board_write(&path, &content)])?;
    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn save_workspace_boards(
    root: String,
    boards: Vec<WorkspaceBoardWrite>,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let writes = boards
        .iter()
        .map(|board| board_write(board.path.as_str(), board.content.as_str()))
        .collect::<Vec<_>>();

    save_workspace_markdown_file_batch(&root, &writes)?;
    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn apply_workspace_snapshot(
    snapshot: WorkspaceSnapshotInput,
) -> Result<WorkspaceSnapshot, String> {
    if snapshot.root_path.is_empty() {
        return Err("Workspace snapshot is missing a root path.".into());
    }

    let root = PathBuf::from(&snapshot.root_path);
    validate_todo_root(&root)?;
    let project_root = root
        .parent()
        .ok_or_else(|| "Selected TODO folder is missing a parent directory.".to_string())?
        .to_path_buf();
    let current_snapshot = build_workspace_snapshot(&snapshot.root_path).ok();
    let board_paths = snapshot
        .boards
        .iter()
        .map(|board| board.path.as_str())
        .collect::<Vec<_>>();
    let card_paths = snapshot
        .cards
        .iter()
        .map(|card| card.path.as_str())
        .collect::<Vec<_>>();
    let board_writes = snapshot
        .boards
        .iter()
        .map(|board| board_write(board.path.as_str(), board.content.as_str()))
        .collect::<Vec<_>>();
    let card_writes = snapshot
        .cards
        .iter()
        .map(|card| card_write(card.path.as_str(), card.content.as_str()))
        .collect::<Vec<_>>();

    save_workspace_markdown_file_batch(&snapshot.root_path, &board_writes)?;
    save_workspace_markdown_file_batch(&snapshot.root_path, &card_writes)?;
    remove_missing_workspace_snapshot_files(
        &project_root,
        collect_snapshot_directories(current_snapshot.as_ref(), &snapshot, true),
        &board_paths,
        true,
    )?;
    remove_missing_workspace_snapshot_files(
        &project_root,
        collect_snapshot_directories(current_snapshot.as_ref(), &snapshot, false),
        &card_paths,
        false,
    )?;

    build_workspace_snapshot(&snapshot.root_path)
}
