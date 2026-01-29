#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            list_directory,
            ensure_directory,
            resolve_path,
            get_config_path,
            get_default_data_path,
            path_exists,
            delete_file,
            delete_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
