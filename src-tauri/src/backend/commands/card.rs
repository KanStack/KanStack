use std::path::Path;

use tauri::AppHandle;

use crate::backend::{
    commands::{
        emit_workspace_changed,
        support::{
            board_write, card_write, local_markdown_slug, owned_board_write, read_board_document,
        },
    },
    models::WorkspaceSnapshot,
    workspace::{
        build_workspace_snapshot, move_workspace_file_to_trash, normalize_relative_markdown_path,
        project_root_from_root, remove_card_from_board_markdown, rename_workspace_markdown_file,
        rewrite_wikilinks_for_rename, rollback_workspace_file_updates,
        save_owned_workspace_markdown_files, save_workspace_markdown_file_batch,
    },
};

#[tauri::command]
pub(crate) fn create_card_in_board(
    root: String,
    card_path: String,
    card_content: String,
    board_path: String,
    board_content: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(
        &root,
        &[
            card_write(&card_path, &card_content),
            board_write(&board_path, &board_content),
        ],
    )?;

    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn rename_card(
    root: String,
    board_path: String,
    old_path: String,
    new_path: String,
    _old_slug: String,
    _new_slug: String,
    new_title: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    let old_local_slug = local_markdown_slug(Path::new(&old_path))?;
    let new_local_slug = local_markdown_slug(Path::new(&new_path))?;
    let board = read_board_document(&root, &board_path)?;
    let board_updated = rewrite_wikilinks_for_rename(
        &board.content,
        "cards",
        &old_local_slug,
        &new_local_slug,
        &new_title,
    );
    let extra_writes = if board_updated != board.content {
        vec![owned_board_write(
            &board.context.relative_path,
            board_updated,
        )]
    } else {
        Vec::new()
    };

    rename_workspace_markdown_file(
        &root,
        &old_path,
        &new_path,
        &content,
        "cards",
        &extra_writes,
    )
}

#[tauri::command]
pub(crate) fn delete_card_file(
    root: String,
    board_path: String,
    path: String,
    _slug: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let card_relative_path = normalize_relative_markdown_path(&path, "cards")?;
    let card_absolute_path = project_root_from_root(&root)?.join(&card_relative_path);
    let board = read_board_document(&root, &board_path)?;
    let card_slug = local_markdown_slug(&card_relative_path)?;
    let board_updated = remove_card_from_board_markdown(&board.content, &card_slug);
    let board_updates = if board_updated != board.content {
        vec![owned_board_write(
            &board.context.relative_path,
            board_updated,
        )]
    } else {
        Vec::new()
    };
    let applied_board_snapshots = save_owned_workspace_markdown_files(&root, &board_updates)?;

    if let Err(error) = move_workspace_file_to_trash(&card_absolute_path) {
        rollback_workspace_file_updates(&applied_board_snapshots)?;
        return Err(error);
    }

    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}
