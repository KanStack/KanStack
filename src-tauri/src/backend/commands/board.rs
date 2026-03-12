use std::{fs, path::PathBuf};

use tauri::AppHandle;

use crate::backend::{
    commands::{
        emit_workspace_changed,
        support::{
            board_write, note_write, owned_board_write, read_board_document, resolve_board_context,
        },
    },
    models::{DiscoveredSubBoard, WorkspaceSnapshot},
    workspace::{
        build_workspace_snapshot, child_target_from_parent_board, collect_board_delete_todo_roots,
        collect_discoverable_sub_boards, move_workspace_file_to_trash,
        read_board_title_from_content, remove_board_target_from_markdown,
        rollback_workspace_file_updates, save_owned_workspace_markdown_files,
        save_workspace_markdown_file_batch, to_project_relative_path, validate_todo_root,
    },
};

#[tauri::command]
pub(crate) fn create_sub_board(
    root: String,
    board_path: String,
    board_content: String,
    parent_board_path: String,
    parent_board_content: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let board_context = resolve_board_context(&root, &board_path)?;
    let readme_path = board_context
        .relative_path
        .parent()
        .ok_or_else(|| "Sub-board path is missing a TODO directory.".to_string())?
        .join("README.md");
    let readme_content = "# TODO\n\nThis folder is a KanStack board root.\n";
    let cards_directory = board_context.todo_root.join("cards");

    fs::create_dir_all(&cards_directory).map_err(|error| error.to_string())?;

    save_workspace_markdown_file_batch(
        &root,
        &[
            board_write(&board_path, &board_content),
            note_write(
                readme_path
                    .to_str()
                    .ok_or_else(|| "Encountered an invalid UTF-8 path.".to_string())?,
                readme_content,
            ),
            board_write(&parent_board_path, &parent_board_content),
        ],
    )?;

    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn find_sub_boards(
    root: String,
    board_path: String,
) -> Result<Vec<DiscoveredSubBoard>, String> {
    let root_todo_path = PathBuf::from(&root);
    validate_todo_root(&root_todo_path)?;
    let board = read_board_document(&root, &board_path)?;
    let mut discovered = Vec::new();

    collect_discoverable_sub_boards(
        &board.context.project_dir,
        &board.context.todo_root,
        &mut discovered,
    )?;
    discovered.sort();

    discovered
        .into_iter()
        .map(|todo_root| {
            let todo_path = to_project_relative_path(&board.context.project_root, &todo_root)?;
            let board_content =
                fs::read_to_string(todo_root.join("todo.md")).map_err(|error| error.to_string())?;
            let fallback_title = todo_root
                .parent()
                .and_then(|path| path.file_name())
                .and_then(|value| value.to_str())
                .unwrap_or("Board");

            Ok(DiscoveredSubBoard {
                title: read_board_title_from_content(&board_content, fallback_title),
                todo_path,
            })
        })
        .collect::<Result<Vec<_>, String>>()
}

#[tauri::command]
pub(crate) fn rename_board(
    root: String,
    old_path: String,
    _new_path: String,
    _old_slug: String,
    _new_slug: String,
    _new_title: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(&root, &[board_write(&old_path, &content)])?;

    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn delete_board(
    root: String,
    path: String,
    parent_board_path: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let board = resolve_board_context(&root, &path)?;
    let parent_board = read_board_document(&root, &parent_board_path)?;
    let current_target =
        child_target_from_parent_board(&parent_board.context.relative_path, &board.relative_path)?;
    let parent_board_updated =
        remove_board_target_from_markdown(&parent_board.content, &current_target);
    let parent_board_updates = if parent_board_updated != parent_board.content {
        vec![owned_board_write(
            &parent_board.context.relative_path,
            parent_board_updated,
        )]
    } else {
        Vec::new()
    };
    let applied_board_snapshots =
        save_owned_workspace_markdown_files(&root, &parent_board_updates)?;
    let mut todo_roots = Vec::new();
    collect_board_delete_todo_roots(&board.todo_root, &mut todo_roots)?;
    todo_roots.sort();
    todo_roots.reverse();

    for todo_root in todo_roots {
        if let Err(error) = move_workspace_file_to_trash(&todo_root) {
            rollback_workspace_file_updates(&applied_board_snapshots)?;
            return Err(error);
        }
    }

    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}
