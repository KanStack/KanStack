mod board;
mod card;
mod config;
mod reveal;
mod support;
mod watcher;
mod workspace;

use tauri::{AppHandle, Emitter};

use crate::backend::{models::WorkspaceChangedPayload, WORKSPACE_CHANGED_EVENT};

pub(crate) use board::{create_board, delete_board, rename_board, sync_known_board_tree};
pub(crate) use card::{create_card_in_board, delete_card_file, rename_card};
pub(crate) use config::{load_app_config, save_app_config};
pub(crate) use reveal::reveal_in_file_manager;
pub(crate) use watcher::{unwatch_workspace, watch_workspace};
pub(crate) use workspace::{
    apply_workspace_snapshot, load_workspace, save_board_file, save_card_file,
    save_workspace_boards,
};

pub(crate) fn emit_workspace_changed(app_handle: &AppHandle, root: &str) -> Result<(), String> {
    app_handle
        .emit(
            WORKSPACE_CHANGED_EVENT,
            WorkspaceChangedPayload {
                root_path: root.to_string(),
            },
        )
        .map_err(|error| error.to_string())
}
