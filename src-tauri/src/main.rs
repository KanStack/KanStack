#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, State};

const WORKSPACE_CHANGED_EVENT: &str = "workspace-changed";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceFile {
    path: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSnapshot {
    root_path: String,
    boards: Vec<WorkspaceFile>,
    cards: Vec<WorkspaceFile>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceChangedPayload {
    root_path: String,
}

struct WorkspaceWatcher {
    root_path: String,
    _watcher: RecommendedWatcher,
}

#[derive(Default)]
struct WorkspaceWatcherState {
    watcher: Mutex<Option<WorkspaceWatcher>>,
}

#[tauri::command]
fn load_workspace(path: String) -> Result<WorkspaceSnapshot, String> {
    let root_path = PathBuf::from(&path);
    let boards_dir = root_path.join("boards");
    let cards_dir = root_path.join("cards");

    if !boards_dir.is_dir() || !cards_dir.is_dir() {
        return Err("Expected `boards/` and `cards/` folders in the selected workspace.".into());
    }

    Ok(WorkspaceSnapshot {
        root_path: root_path.to_string_lossy().into_owned(),
        boards: read_markdown_files(&boards_dir, "boards")?,
        cards: read_markdown_files(&cards_dir, "cards")?,
    })
}

fn read_markdown_files(directory: &Path, prefix: &str) -> Result<Vec<WorkspaceFile>, String> {
    let mut files = Vec::new();

    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !path.is_file() || path.extension().and_then(|value| value.to_str()) != Some("md") {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| "Encountered an invalid UTF-8 file name.".to_string())?;

        let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;

        files.push(WorkspaceFile {
            path: format!("{prefix}/{name}"),
            content,
        });
    }

    files.sort_by(|left, right| left.path.cmp(&right.path));

    Ok(files)
}

#[tauri::command]
fn save_card_file(
    root: String,
    path: String,
    content: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    save_workspace_markdown_file(&root, &path, &content, "cards")?;
    emit_workspace_changed(&app_handle, &root)
}

#[tauri::command]
fn save_board_file(
    root: String,
    path: String,
    content: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    save_workspace_markdown_file(&root, &path, &content, "boards")?;
    emit_workspace_changed(&app_handle, &root)
}

#[tauri::command]
fn delete_card_file(
    root: String,
    path: String,
    slug: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let absolute_path =
        PathBuf::from(&root).join(normalize_relative_markdown_path(&path, "cards")?);

    if absolute_path.exists() {
        fs::remove_file(&absolute_path).map_err(|error| error.to_string())?;
    }

    remove_card_from_boards(&root, &slug)?;
    emit_workspace_changed(&app_handle, &root)
}

#[tauri::command]
fn watch_workspace(
    path: String,
    app_handle: AppHandle,
    state: State<WorkspaceWatcherState>,
) -> Result<(), String> {
    let root_path = PathBuf::from(&path);
    let boards_dir = root_path.join("boards");
    let cards_dir = root_path.join("cards");

    if !boards_dir.is_dir() || !cards_dir.is_dir() {
        return Err("Expected `boards/` and `cards/` folders in the selected workspace.".into());
    }

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

            if !event.paths.iter().any(is_markdown_file) {
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
        .watch(&boards_dir, RecursiveMode::NonRecursive)
        .map_err(|error| error.to_string())?;
    watcher
        .watch(&cards_dir, RecursiveMode::NonRecursive)
        .map_err(|error| error.to_string())?;

    *guard = Some(WorkspaceWatcher {
        root_path: path,
        _watcher: watcher,
    });

    Ok(())
}

#[tauri::command]
fn unwatch_workspace(state: State<WorkspaceWatcherState>) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|error| error.to_string())?;
    *guard = None;
    Ok(())
}

fn is_markdown_file(path: &PathBuf) -> bool {
    path.extension().and_then(|value| value.to_str()) == Some("md")
}

fn save_workspace_markdown_file(
    root: &str,
    relative_path: &str,
    content: &str,
    allowed_prefix: &str,
) -> Result<(), String> {
    let root_path = PathBuf::from(root);
    let normalized_relative_path = normalize_relative_markdown_path(relative_path, allowed_prefix)?;
    let absolute_path = root_path.join(&normalized_relative_path);
    let parent = absolute_path
        .parent()
        .ok_or_else(|| "Target file is missing a parent directory.".to_string())?;

    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let temp_path = absolute_path.with_extension("md.tmp");
    fs::write(&temp_path, content).map_err(|error| error.to_string())?;
    fs::rename(&temp_path, &absolute_path).map_err(|error| error.to_string())?;

    Ok(())
}

fn emit_workspace_changed(app_handle: &AppHandle, root: &str) -> Result<(), String> {
    app_handle
        .emit(
            WORKSPACE_CHANGED_EVENT,
            WorkspaceChangedPayload {
                root_path: root.to_string(),
            },
        )
        .map_err(|error| error.to_string())
}

fn remove_card_from_boards(root: &str, slug: &str) -> Result<(), String> {
    let boards_dir = PathBuf::from(root).join("boards");

    if !boards_dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(&boards_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !is_markdown_file(&path) {
            continue;
        }

        let original = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let filtered_lines = original
            .lines()
            .filter(|line| !is_deleted_card_bullet_line(line.trim(), slug))
            .collect::<Vec<_>>();
        let updated = format!("{}\n", filtered_lines.join("\n").trim_end());

        if updated != original {
            fs::write(&path, updated).map_err(|error| error.to_string())?;
        }
    }

    Ok(())
}

fn is_deleted_card_bullet_line(line: &str, slug: &str) -> bool {
    if !line.starts_with("- [[") && !line.starts_with("* [[") {
        return false;
    }

    let Some(start) = line.find("[[") else {
        return false;
    };
    let Some(end) = line.find("]]") else {
        return false;
    };

    let inner = &line[start + 2..end];
    let target = inner.split('|').next().unwrap_or_default().trim();
    let normalized = target
        .trim_start_matches("./")
        .trim_end_matches(".md")
        .replace('\\', "/");
    let normalized_slug = normalized.strip_prefix("cards/").unwrap_or(&normalized);

    normalized_slug == slug
}

fn normalize_relative_markdown_path(
    relative_path: &str,
    allowed_prefix: &str,
) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(relative_path);

    if candidate.is_absolute() {
        return Err("Expected a workspace-relative markdown path.".into());
    }

    if candidate.extension().and_then(|value| value.to_str()) != Some("md") {
        return Err("Only markdown files can be written.".into());
    }

    let mut normalized = PathBuf::new();

    for component in candidate.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            _ => return Err("Relative path contains unsupported segments.".into()),
        }
    }

    let prefix = normalized
        .components()
        .next()
        .and_then(|component| match component {
            Component::Normal(part) => part.to_str(),
            _ => None,
        })
        .ok_or_else(|| "Relative path is empty.".to_string())?;

    if prefix != allowed_prefix {
        return Err(format!(
            "Only files inside `{allowed_prefix}/` can be written."
        ));
    }

    Ok(normalized)
}

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceWatcherState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_card_file,
            save_board_file,
            delete_card_file,
            watch_workspace,
            unwatch_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
