#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter};

use crate::backend::commands::{
    apply_workspace_snapshot, create_card_in_board, create_sub_board, delete_board,
    delete_card_file, find_sub_boards, load_workspace, rename_board, rename_card, save_board_file,
    save_card_file, save_workspace_boards, unwatch_workspace, watch_workspace,
};
use crate::backend::models::{MenuActionPayload, WorkspaceWatcherState};
use crate::backend::MENU_ACTION_EVENT;

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceWatcherState::default())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.set_menu(build_menu(app)?)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(action) = map_menu_action(event.id().as_ref()) {
                let _ = emit_menu_action(app, action);
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_card_file,
            save_board_file,
            save_workspace_boards,
            apply_workspace_snapshot,
            create_card_in_board,
            create_sub_board,
            rename_card,
            rename_board,
            delete_card_file,
            delete_board,
            find_sub_boards,
            watch_workspace,
            unwatch_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let open_folder = MenuItemBuilder::with_id("open-folder", "Open Folder")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let undo = MenuItemBuilder::with_id("undo-action", "Undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id("redo-action", "Redo")
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;
    let new_card = MenuItemBuilder::with_id("new-card", "New Card")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let new_sub_board = MenuItemBuilder::with_id("new-sub-board", "New Sub Board")
        .accelerator("CmdOrCtrl+Shift+N")
        .build(app)?;
    let find_sub_boards =
        MenuItemBuilder::with_id("find-sub-boards", "Find Sub Boards").build(app)?;
    let toggle_archive_column =
        MenuItemBuilder::with_id("toggle-archive-column", "Toggle Archive Column")
            .accelerator("CmdOrCtrl+Shift+A")
            .build(app)?;
    let toggle_sub_boards =
        MenuItemBuilder::with_id("toggle-sub-boards", "Toggle Sub Boards").build(app)?;
    let delete_current_board =
        MenuItemBuilder::with_id("delete-current-board", "Delete Current Board").build(app)?;
    let new_column = MenuItemBuilder::with_id("new-column", "New Column").build(app)?;
    let rename_selected_column =
        MenuItemBuilder::with_id("rename-selected-column", "Rename Column").build(app)?;
    let delete_selected_column =
        MenuItemBuilder::with_id("delete-selected-column", "Delete Column").build(app)?;
    let open_selected_card = MenuItemBuilder::with_id("open-selected-card", "Open Selected")
        .accelerator("Enter")
        .build(app)?;
    let archive_selected_cards =
        MenuItemBuilder::with_id("archive-selected-cards", "Archive Selected").build(app)?;
    let delete_selected_cards =
        MenuItemBuilder::with_id("delete-selected-cards", "Delete Selected")
            .accelerator("Delete")
            .build(app)?;
    let close_editor = MenuItemBuilder::with_id("close-editor", "Close Editor")
        .accelerator("Escape")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_folder)
        .build()?;
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .build()?;
    let board_menu = SubmenuBuilder::new(app, "Board")
        .item(&new_column)
        .item(&rename_selected_column)
        .item(&delete_selected_column)
        .separator()
        .item(&toggle_archive_column)
        .item(&toggle_sub_boards)
        .separator()
        .item(&new_sub_board)
        .item(&find_sub_boards)
        .separator()
        .item(&delete_current_board)
        .build()?;
    let card_menu = SubmenuBuilder::new(app, "Card")
        .item(&new_card)
        .separator()
        .item(&open_selected_card)
        .item(&archive_selected_cards)
        .item(&delete_selected_cards)
        .separator()
        .item(&close_editor)
        .build()?;

    MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&board_menu)
        .item(&card_menu)
        .build()
}

fn map_menu_action(menu_id: &str) -> Option<&'static str> {
    match menu_id {
        "open-folder" => Some("open-folder"),
        "undo-action" => Some("undo-action"),
        "redo-action" => Some("redo-action"),
        "new-card" => Some("new-card"),
        "new-sub-board" => Some("new-sub-board"),
        "find-sub-boards" => Some("find-sub-boards"),
        "new-column" => Some("new-column"),
        "rename-selected-column" => Some("rename-selected-column"),
        "delete-selected-column" => Some("delete-selected-column"),
        "toggle-archive-column" => Some("toggle-archive-column"),
        "toggle-sub-boards" => Some("toggle-sub-boards"),
        "delete-current-board" => Some("delete-current-board"),
        "open-selected-card" => Some("open-selected-card"),
        "archive-selected-cards" => Some("archive-selected-cards"),
        "delete-selected-cards" => Some("delete-selected-cards"),
        "close-editor" => Some("close-editor"),
        _ => None,
    }
}

fn emit_menu_action(app_handle: &AppHandle, action: &str) -> Result<(), String> {
    app_handle
        .emit(
            MENU_ACTION_EVENT,
            MenuActionPayload {
                action: action.to_string(),
            },
        )
        .map_err(|error| error.to_string())
}
