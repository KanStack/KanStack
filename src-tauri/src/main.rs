#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use tauri::menu::{
    AboutMetadataBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
};
use tauri::{AppHandle, Emitter};

use crate::backend::commands::{
    apply_workspace_snapshot, create_board, create_card_in_board, delete_board, delete_card_file,
    load_app_config, load_workspace, rename_board, rename_card, save_app_config, save_board_file,
    save_card_file, save_workspace_boards, sync_known_board_tree, unwatch_workspace,
    watch_workspace,
};
use crate::backend::models::{MenuActionPayload, WorkspaceWatcherState};
use crate::backend::MENU_ACTION_EVENT;

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceWatcherState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            create_board,
            rename_card,
            rename_board,
            delete_card_file,
            delete_board,
            load_app_config,
            save_app_config,
            sync_known_board_tree,
            watch_workspace,
            unwatch_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let package_info = app.package_info();
    #[cfg(target_os = "macos")]
    let about_kanstack = PredefinedMenuItem::about(
        app,
        Some("About KanStack"),
        Some(
            AboutMetadataBuilder::new()
                .name(Some(package_info.name.clone()))
                .version(Some(package_info.version.to_string()))
                .icon(app.default_window_icon().cloned())
                .build(),
        ),
    )?;
    #[cfg(target_os = "macos")]
    let check_for_updates =
        MenuItemBuilder::with_id("check-for-updates", "Check for Updates...").build(app)?;
    let open_folder = MenuItemBuilder::with_id("open-folder", "Open Folder")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let close_folder = MenuItemBuilder::with_id("close-folder", "Close Folder")
        .accelerator("CmdOrCtrl+W")
        .build(app)?;

    let undo = MenuItemBuilder::with_id("undo-action", "Undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app)?;
    let redo = MenuItemBuilder::with_id("redo-action", "Redo")
        .accelerator("CmdOrCtrl+Shift+Z")
        .build(app)?;

    let new_board = MenuItemBuilder::with_id("new-board", "New Board")
        .accelerator("CmdOrCtrl+Shift+N")
        .build(app)?;
    let attach_existing_board =
        MenuItemBuilder::with_id("attach-existing-board", "Attach Existing Board").build(app)?;

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

    let new_card = MenuItemBuilder::with_id("new-card", "New Card")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let archive_selected_cards =
        MenuItemBuilder::with_id("archive-selected-cards", "Archive Selected")
            .accelerator("Delete")
            .build(app)?;
    let delete_selected_cards =
        MenuItemBuilder::with_id("delete-selected-cards", "Delete Selected")
            .accelerator("Shift+Delete")
            .build(app)?;

    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, package_info.name.as_str())
        .item(&about_kanstack)
        .separator()
        .item(&check_for_updates)
        .build()?;
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&open_folder)
        .item(&close_folder)
        .build()?;
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .build()?;

    let board_menu = SubmenuBuilder::new(app, "Board")
        .item(&new_board)
        .item(&attach_existing_board)
        .separator()
        .item(&toggle_archive_column)
        .item(&toggle_sub_boards)
        .separator()
        .item(&delete_current_board)
        .build()?;
    let column_menu = SubmenuBuilder::new(app, "Column")
        .item(&new_column)
        .item(&rename_selected_column)
        .separator()
        .item(&delete_selected_column)
        .build()?;
    let card_menu = SubmenuBuilder::new(app, "Card")
        .item(&new_card)
        .separator()
        .item(&archive_selected_cards)
        .item(&delete_selected_cards)
        .build()?;
    let builder = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    let builder = builder.item(&app_menu);
    let builder = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&board_menu)
        .item(&column_menu)
        .item(&card_menu);

    builder.build()
}

fn map_menu_action(menu_id: &str) -> Option<&'static str> {
    match menu_id {
        #[cfg(target_os = "macos")]
        "check-for-updates" => Some("check-for-updates"),
        "open-folder" => Some("open-folder"),
        "close-folder" => Some("close-folder"),
        "undo-action" => Some("undo-action"),
        "redo-action" => Some("redo-action"),
        "new-card" => Some("new-card"),
        "new-board" => Some("new-board"),
        "attach-existing-board" => Some("attach-existing-board"),
        "new-column" => Some("new-column"),
        "rename-selected-column" => Some("rename-selected-column"),
        "delete-selected-column" => Some("delete-selected-column"),
        "toggle-archive-column" => Some("toggle-archive-column"),
        "toggle-sub-boards" => Some("toggle-sub-boards"),
        "delete-current-board" => Some("delete-current-board"),
        "archive-selected-cards" => Some("archive-selected-cards"),
        "delete-selected-cards" => Some("delete-selected-cards"),
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
