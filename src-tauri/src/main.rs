#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Component, Path, PathBuf},
    sync::Mutex,
};
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, State};

const MENU_ACTION_EVENT: &str = "menu-action";
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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MenuActionPayload {
    action: String,
}

struct WorkspaceWatcher {
    root_path: String,
    _watcher: RecommendedWatcher,
}

struct WorkspaceFileWrite<'a> {
    relative_path: &'a str,
    content: &'a str,
    allowed_prefix: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceBoardWrite {
    path: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSnapshotInput {
    root_path: String,
    boards: Vec<WorkspaceBoardWrite>,
    cards: Vec<WorkspaceBoardWrite>,
}

struct WorkspaceFileSnapshot {
    absolute_path: PathBuf,
    original_content: Option<String>,
}

struct BoardDeletePlan {
    board_targets: Vec<BoardDeleteTarget>,
    board_slugs: Vec<String>,
    card_targets: Vec<CardDeleteTarget>,
    card_slugs: Vec<String>,
}

struct BoardDeleteTarget {
    absolute_path: PathBuf,
    relative_path: String,
}

struct CardDeleteTarget {
    absolute_path: PathBuf,
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
    save_workspace_markdown_file_batch(
        &root,
        &[WorkspaceFileWrite {
            relative_path: &path,
            content: &content,
            allowed_prefix: "cards",
        }],
    )?;
    emit_workspace_changed(&app_handle, &root)
}

#[tauri::command]
fn save_board_file(
    root: String,
    path: String,
    content: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(
        &root,
        &[WorkspaceFileWrite {
            relative_path: &path,
            content: &content,
            allowed_prefix: "boards",
        }],
    )?;
    emit_workspace_changed(&app_handle, &root)?;
    load_workspace(root)
}

#[tauri::command]
fn save_workspace_boards(
    root: String,
    boards: Vec<WorkspaceBoardWrite>,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let writes = boards
        .iter()
        .map(|board| WorkspaceFileWrite {
            relative_path: board.path.as_str(),
            content: board.content.as_str(),
            allowed_prefix: "boards",
        })
        .collect::<Vec<_>>();

    save_workspace_markdown_file_batch(&root, &writes)?;
    emit_workspace_changed(&app_handle, &root)?;
    load_workspace(root)
}

#[tauri::command]
fn apply_workspace_snapshot(snapshot: WorkspaceSnapshotInput) -> Result<WorkspaceSnapshot, String> {
    if snapshot.root_path.is_empty() {
        return Err("Workspace snapshot is missing a root path.".into());
    }

    let root = PathBuf::from(&snapshot.root_path);
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
        .map(|board| WorkspaceFileWrite {
            relative_path: board.path.as_str(),
            content: board.content.as_str(),
            allowed_prefix: "boards",
        })
        .collect::<Vec<_>>();
    let card_writes = snapshot
        .cards
        .iter()
        .map(|card| WorkspaceFileWrite {
            relative_path: card.path.as_str(),
            content: card.content.as_str(),
            allowed_prefix: "cards",
        })
        .collect::<Vec<_>>();

    save_workspace_markdown_file_batch(&snapshot.root_path, &board_writes)?;
    save_workspace_markdown_file_batch(&snapshot.root_path, &card_writes)?;
    remove_missing_workspace_files(&root.join("boards"), &board_paths)?;
    remove_missing_workspace_files(&root.join("cards"), &card_paths)?;

    load_workspace(snapshot.root_path)
}

#[tauri::command]
fn create_card_in_board(
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
            WorkspaceFileWrite {
                relative_path: &card_path,
                content: &card_content,
                allowed_prefix: "cards",
            },
            WorkspaceFileWrite {
                relative_path: &board_path,
                content: &board_content,
                allowed_prefix: "boards",
            },
        ],
    )?;

    emit_workspace_changed(&app_handle, &root)?;
    load_workspace(root)
}

#[tauri::command]
fn create_sub_board(
    root: String,
    board_path: String,
    board_content: String,
    parent_board_path: String,
    parent_board_content: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(
        &root,
        &[
            WorkspaceFileWrite {
                relative_path: &board_path,
                content: &board_content,
                allowed_prefix: "boards",
            },
            WorkspaceFileWrite {
                relative_path: &parent_board_path,
                content: &parent_board_content,
                allowed_prefix: "boards",
            },
        ],
    )?;

    emit_workspace_changed(&app_handle, &root)?;
    load_workspace(root)
}

#[tauri::command]
fn rename_card(
    root: String,
    old_path: String,
    new_path: String,
    old_slug: String,
    new_slug: String,
    new_title: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    let board_updates = collect_link_updates(&root, "cards", &old_slug, &new_slug, &new_title)?;
    rename_workspace_markdown_file(
        &root,
        &old_path,
        &new_path,
        &content,
        "cards",
        &board_updates,
    )
}

#[tauri::command]
fn rename_board(
    root: String,
    old_path: String,
    new_path: String,
    old_slug: String,
    new_slug: String,
    new_title: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    let board_updates = collect_link_updates(&root, "boards", &old_slug, &new_slug, &new_title)?;
    rename_workspace_markdown_file(
        &root,
        &old_path,
        &new_path,
        &content,
        "boards",
        &board_updates,
    )
}

#[tauri::command]
fn delete_card_file(
    root: String,
    path: String,
    slug: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let card_relative_path = normalize_relative_markdown_path(&path, "cards")?;
    let card_absolute_path = PathBuf::from(&root).join(&card_relative_path);
    let board_updates = collect_card_detach_updates(&root, &slug)?;
    let applied_board_snapshots = save_owned_workspace_markdown_files(&root, &board_updates)?;

    if let Err(error) = move_workspace_file_to_trash(&card_absolute_path) {
        rollback_workspace_file_updates(&applied_board_snapshots)?;
        return Err(error);
    }

    emit_workspace_changed(&app_handle, &root)?;
    load_workspace(root)
}

#[tauri::command]
fn delete_board(root: String, _path: String, slug: String) -> Result<WorkspaceSnapshot, String> {
    let plan = collect_board_delete_plan(&root, &slug)?;
    let excluded_board_paths = plan
        .board_targets
        .iter()
        .map(|target| target.relative_path.as_str())
        .collect::<Vec<_>>();
    let board_slug_refs = plan
        .board_slugs
        .iter()
        .map(|slug| slug.as_str())
        .collect::<Vec<_>>();
    let card_slug_refs = plan
        .card_slugs
        .iter()
        .map(|slug| slug.as_str())
        .collect::<Vec<_>>();
    let board_updates = collect_delete_detach_updates(
        &root,
        &board_slug_refs,
        &card_slug_refs,
        &excluded_board_paths,
    )?;
    let applied_board_snapshots = save_owned_workspace_markdown_files(&root, &board_updates)?;

    for target in &plan.card_targets {
        if let Err(error) = move_workspace_file_to_trash(&target.absolute_path) {
            rollback_workspace_file_updates(&applied_board_snapshots)?;
            return Err(error);
        }
    }

    for target in &plan.board_targets {
        if let Err(error) = move_workspace_file_to_trash(&target.absolute_path) {
            rollback_workspace_file_updates(&applied_board_snapshots)?;
            return Err(error);
        }
    }

    load_workspace(root)
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

fn save_workspace_markdown_file_batch(
    root: &str,
    writes: &[WorkspaceFileWrite<'_>],
) -> Result<Vec<WorkspaceFileSnapshot>, String> {
    let root_path = PathBuf::from(root);
    let mut applied_snapshots = Vec::new();

    for write in writes {
        let normalized_relative_path =
            normalize_relative_markdown_path(write.relative_path, write.allowed_prefix)?;
        let absolute_path = root_path.join(&normalized_relative_path);
        let snapshot = capture_workspace_file_snapshot(&absolute_path)?;

        if let Err(error) = write_workspace_markdown_file(&absolute_path, write.content) {
            rollback_workspace_file_updates(&applied_snapshots)?;
            return Err(error);
        }

        applied_snapshots.push(snapshot);
    }

    Ok(applied_snapshots)
}

fn rename_workspace_markdown_file(
    root: &str,
    old_relative_path: &str,
    new_relative_path: &str,
    content: &str,
    allowed_prefix: &str,
    extra_writes: &[WorkspaceFileWriteOwned],
) -> Result<WorkspaceSnapshot, String> {
    let old_normalized_path = normalize_relative_markdown_path(old_relative_path, allowed_prefix)?;
    let new_normalized_path = normalize_relative_markdown_path(new_relative_path, allowed_prefix)?;
    let old_absolute_path = PathBuf::from(root).join(&old_normalized_path);
    let new_relative_path_string = new_normalized_path.to_string_lossy().into_owned();
    let mut writes = vec![WorkspaceFileWriteOwned {
        relative_path: new_relative_path_string,
        content: content.to_string(),
        allowed_prefix: allowed_prefix.to_string(),
    }];
    writes.extend(extra_writes.iter().map(|write| WorkspaceFileWriteOwned {
        relative_path: write.relative_path.clone(),
        content: write.content.clone(),
        allowed_prefix: write.allowed_prefix.clone(),
    }));

    let applied_snapshots = save_owned_workspace_markdown_files(root, &writes)?;

    if old_normalized_path != new_normalized_path {
        if let Err(error) = remove_workspace_file(&old_absolute_path) {
            rollback_workspace_file_updates(&applied_snapshots)?;
            return Err(error);
        }
    }

    load_workspace(root.to_string())
}

fn capture_workspace_file_snapshot(absolute_path: &Path) -> Result<WorkspaceFileSnapshot, String> {
    let original_content = if absolute_path.exists() {
        Some(fs::read_to_string(absolute_path).map_err(|error| error.to_string())?)
    } else {
        None
    };

    Ok(WorkspaceFileSnapshot {
        absolute_path: absolute_path.to_path_buf(),
        original_content,
    })
}

fn rollback_workspace_file_updates(snapshots: &[WorkspaceFileSnapshot]) -> Result<(), String> {
    for snapshot in snapshots.iter().rev() {
        restore_workspace_file_snapshot(snapshot)?;
    }

    Ok(())
}

fn restore_workspace_file_snapshot(snapshot: &WorkspaceFileSnapshot) -> Result<(), String> {
    match &snapshot.original_content {
        Some(content) => write_workspace_markdown_file(&snapshot.absolute_path, content),
        None => {
            if snapshot.absolute_path.exists() {
                fs::remove_file(&snapshot.absolute_path).map_err(|error| error.to_string())?;
            }

            Ok(())
        }
    }
}

fn write_workspace_markdown_file(absolute_path: &Path, content: &str) -> Result<(), String> {
    let parent = absolute_path
        .parent()
        .ok_or_else(|| "Target file is missing a parent directory.".to_string())?;

    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let temp_path = absolute_path.with_extension("md.tmp");
    fs::write(&temp_path, content).map_err(|error| error.to_string())?;
    fs::rename(&temp_path, absolute_path).map_err(|error| error.to_string())?;

    Ok(())
}

fn remove_workspace_file(absolute_path: &Path) -> Result<(), String> {
    if absolute_path.exists() {
        fs::remove_file(absolute_path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn move_workspace_file_to_trash(absolute_path: &Path) -> Result<(), String> {
    if absolute_path.exists() {
        trash::delete(absolute_path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn remove_missing_workspace_files(directory: &Path, allowed_paths: &[&str]) -> Result<(), String> {
    if !directory.is_dir() {
        return Ok(());
    }

    let allowed = allowed_paths
        .iter()
        .copied()
        .collect::<std::collections::HashSet<_>>();
    let prefix = directory
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Failed to determine workspace directory prefix.".to_string())?;

    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !is_markdown_file(&path) {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| "Encountered an invalid UTF-8 file name.".to_string())?;
        let relative_path = format!("{prefix}/{name}");

        if !allowed.contains(relative_path.as_str()) {
            fs::remove_file(path).map_err(|error| error.to_string())?;
        }
    }

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

fn collect_card_detach_updates(
    root: &str,
    slug: &str,
) -> Result<Vec<WorkspaceFileWriteOwned>, String> {
    let boards_dir = PathBuf::from(root).join("boards");
    let mut updates = Vec::new();

    if !boards_dir.is_dir() {
        return Ok(updates);
    }

    for entry in fs::read_dir(&boards_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !is_markdown_file(&path) {
            continue;
        }

        let original = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let updated = remove_card_from_board_markdown(&original, slug);

        if updated != original {
            let relative_path = format!(
                "boards/{}",
                path.file_name()
                    .and_then(|value| value.to_str())
                    .ok_or_else(|| "Encountered an invalid UTF-8 file name.".to_string())?
            );

            updates.push(WorkspaceFileWriteOwned {
                relative_path,
                content: updated,
                allowed_prefix: "boards".to_string(),
            });
        }
    }

    Ok(updates)
}

fn collect_delete_detach_updates(
    root: &str,
    board_slugs: &[&str],
    card_slugs: &[&str],
    excluded_paths: &[&str],
) -> Result<Vec<WorkspaceFileWriteOwned>, String> {
    let boards_dir = PathBuf::from(root).join("boards");
    let mut updates = Vec::new();

    if !boards_dir.is_dir() {
        return Ok(updates);
    }

    for entry in fs::read_dir(&boards_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !is_markdown_file(&path) {
            continue;
        }

        let relative_path = format!(
            "boards/{}",
            path.file_name()
                .and_then(|value| value.to_str())
                .ok_or_else(|| "Encountered an invalid UTF-8 file name.".to_string())?
        );

        if excluded_paths
            .iter()
            .any(|excluded| *excluded == relative_path)
        {
            continue;
        }

        let original = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let without_cards = remove_cards_from_board_markdown(&original, card_slugs);
        let updated = remove_boards_from_board_markdown(&without_cards, board_slugs);

        if updated != original {
            updates.push(WorkspaceFileWriteOwned {
                relative_path,
                content: updated,
                allowed_prefix: "boards".to_string(),
            });
        }
    }

    Ok(updates)
}

fn collect_link_updates(
    root: &str,
    prefix: &str,
    old_slug: &str,
    new_slug: &str,
    new_title: &str,
) -> Result<Vec<WorkspaceFileWriteOwned>, String> {
    let boards_dir = PathBuf::from(root).join("boards");
    let mut updates = Vec::new();

    if !boards_dir.is_dir() {
        return Ok(updates);
    }

    for entry in fs::read_dir(&boards_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !is_markdown_file(&path) {
            continue;
        }

        let original = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let updated =
            rewrite_wikilinks_for_rename(&original, prefix, old_slug, new_slug, new_title);

        if updated != original {
            let relative_path = format!(
                "boards/{}",
                path.file_name()
                    .and_then(|value| value.to_str())
                    .ok_or_else(|| "Encountered an invalid UTF-8 file name.".to_string())?
            );

            updates.push(WorkspaceFileWriteOwned {
                relative_path,
                content: updated,
                allowed_prefix: "boards".to_string(),
            });
        }
    }

    Ok(updates)
}

struct WorkspaceFileWriteOwned {
    relative_path: String,
    content: String,
    allowed_prefix: String,
}

fn save_owned_workspace_markdown_files(
    root: &str,
    writes: &[WorkspaceFileWriteOwned],
) -> Result<Vec<WorkspaceFileSnapshot>, String> {
    let borrowed_writes = writes
        .iter()
        .map(|write| WorkspaceFileWrite {
            relative_path: write.relative_path.as_str(),
            content: write.content.as_str(),
            allowed_prefix: write.allowed_prefix.as_str(),
        })
        .collect::<Vec<_>>();

    save_workspace_markdown_file_batch(root, &borrowed_writes)
}

fn collect_board_delete_plan(root: &str, root_slug: &str) -> Result<BoardDeletePlan, String> {
    let boards_dir = PathBuf::from(root).join("boards");
    let cards_dir = PathBuf::from(root).join("cards");
    let boards = read_markdown_files(&boards_dir, "boards")?;
    let cards = read_markdown_files(&cards_dir, "cards")?;
    let mut board_map = std::collections::HashMap::new();
    let mut card_paths_by_slug = std::collections::HashMap::new();

    for board in boards {
        let board_slug = board
            .path
            .strip_prefix("boards/")
            .unwrap_or(&board.path)
            .trim_end_matches(".md")
            .to_string();

        board_map.insert(
            board_slug,
            (
                board.path,
                extract_sub_board_slugs(&board.content),
                extract_board_card_slugs(&board.content),
            ),
        );
    }

    for card in cards {
        let card_slug = card
            .path
            .strip_prefix("cards/")
            .unwrap_or(&card.path)
            .trim_end_matches(".md")
            .to_string();
        card_paths_by_slug.insert(card_slug, card.path);
    }

    if !board_map.contains_key(root_slug) {
        return Err(format!("Could not find board `{root_slug}`."));
    }

    let mut ordered_board_slugs = Vec::new();
    let mut ordered_card_slugs = Vec::new();
    let mut stack = vec![root_slug.to_string()];
    let mut visited_boards = std::collections::HashSet::new();
    let mut visited_cards = std::collections::HashSet::new();

    while let Some(current_slug) = stack.pop() {
        if !visited_boards.insert(current_slug.clone()) {
            continue;
        }

        ordered_board_slugs.push(current_slug.clone());

        if let Some((_, child_slugs, card_slugs)) = board_map.get(&current_slug) {
            for card_slug in card_slugs {
                if visited_cards.insert(card_slug.clone()) {
                    ordered_card_slugs.push(card_slug.clone());
                }
            }

            for child_slug in child_slugs.iter().rev() {
                stack.push(child_slug.clone());
            }
        }
    }

    ordered_board_slugs.reverse();

    let board_targets = ordered_board_slugs
        .iter()
        .map(|board_slug| {
            let (relative_path, _, _) = board_map
                .get(board_slug)
                .ok_or_else(|| format!("Could not find board `{board_slug}`."))?;

            Ok(BoardDeleteTarget {
                absolute_path: PathBuf::from(root).join(relative_path),
                relative_path: relative_path.clone(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    let card_targets = ordered_card_slugs
        .iter()
        .filter_map(|card_slug| {
            card_paths_by_slug
                .get(card_slug)
                .map(|relative_path| CardDeleteTarget {
                    absolute_path: PathBuf::from(root).join(relative_path),
                })
        })
        .collect::<Vec<_>>();

    Ok(BoardDeletePlan {
        board_targets,
        board_slugs: ordered_board_slugs,
        card_targets,
        card_slugs: ordered_card_slugs,
    })
}

fn remove_card_from_board_markdown(original: &str, slug: &str) -> String {
    let filtered_lines = original
        .lines()
        .filter(|line| !is_deleted_card_bullet_line(line.trim(), slug))
        .collect::<Vec<_>>();

    format!("{}\n", filtered_lines.join("\n").trim_end())
}

fn remove_cards_from_board_markdown(original: &str, slugs: &[&str]) -> String {
    let filtered_lines = original
        .lines()
        .filter(|line| {
            !slugs
                .iter()
                .any(|slug| is_deleted_card_bullet_line(line.trim(), slug))
        })
        .collect::<Vec<_>>();

    format!("{}\n", filtered_lines.join("\n").trim_end())
}

fn remove_boards_from_board_markdown(original: &str, slugs: &[&str]) -> String {
    let filtered_lines = original
        .lines()
        .filter(|line| {
            !slugs
                .iter()
                .any(|slug| is_deleted_board_bullet_line(line.trim(), slug))
        })
        .collect::<Vec<_>>();

    format!("{}\n", filtered_lines.join("\n").trim_end())
}

fn extract_sub_board_slugs(content: &str) -> Vec<String> {
    extract_section_link_slugs(content, "Sub Boards", "boards")
}

fn extract_board_card_slugs(content: &str) -> Vec<String> {
    let mut card_slugs = Vec::new();
    let mut current_is_sub_boards = false;

    for line in content.lines() {
        if line.starts_with("## ") {
            current_is_sub_boards = line.trim() == "## Sub Boards";
            continue;
        }

        if current_is_sub_boards {
            continue;
        }

        if let Some(slug) = extract_bullet_link_slug(line.trim(), "cards") {
            card_slugs.push(slug);
        }
    }

    card_slugs
}

fn extract_section_link_slugs(content: &str, heading: &str, prefix: &str) -> Vec<String> {
    let mut slugs = Vec::new();
    let mut in_target_section = false;

    for line in content.lines() {
        if line.starts_with("## ") {
            in_target_section = line.trim() == format!("## {heading}");
            continue;
        }

        if !in_target_section {
            continue;
        }

        if let Some(slug) = extract_bullet_link_slug(line.trim(), prefix) {
            slugs.push(slug);
        }
    }

    slugs
}

fn extract_bullet_link_slug(line: &str, prefix: &str) -> Option<String> {
    if !line.starts_with("- [[") && !line.starts_with("* [[") {
        return None;
    }

    let start = line.find("[[")?;
    let end = line.find("]]")?;
    let inner = &line[start + 2..end];
    let target = inner.split('|').next().unwrap_or_default().trim();
    let normalized = normalize_wikilink_target(target);
    let slug = normalized
        .strip_prefix(&format!("{prefix}/"))
        .unwrap_or(&normalized);

    if slug.is_empty() {
        None
    } else {
        Some(slug.to_string())
    }
}

fn rewrite_wikilinks_for_rename(
    original: &str,
    prefix: &str,
    old_slug: &str,
    new_slug: &str,
    new_title: &str,
) -> String {
    let mut rewritten = String::with_capacity(original.len());
    let mut remainder = original;

    while let Some(start) = remainder.find("[[") {
        let (before, after_start) = remainder.split_at(start);
        rewritten.push_str(before);

        let Some(end) = after_start.find("]]") else {
            rewritten.push_str(after_start);
            return rewritten;
        };

        let inner = &after_start[2..end];
        let target = inner.split('|').next().unwrap_or_default().trim();
        let normalized = normalize_wikilink_target(target);
        let expected_prefixed_target = format!("{prefix}/{old_slug}");

        if normalized == expected_prefixed_target || normalized == old_slug {
            rewritten.push_str(&format!("[[{prefix}/{new_slug}|{new_title}]]"));
        } else {
            rewritten.push_str(&after_start[..end + 2]);
        }

        remainder = &after_start[end + 2..];
    }

    rewritten.push_str(remainder);
    rewritten
}

fn normalize_wikilink_target(target: &str) -> String {
    target
        .trim_start_matches("./")
        .trim_end_matches(".md")
        .replace('\\', "/")
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

fn is_deleted_board_bullet_line(line: &str, slug: &str) -> bool {
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
    let normalized_slug = normalized.strip_prefix("boards/").unwrap_or(&normalized);

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

#[cfg(test)]
mod tests {
    use super::remove_boards_from_board_markdown;
    use super::rewrite_wikilinks_for_rename;

    #[test]
    fn rewrites_card_links_for_rename() {
        let original =
            "## Todo\n\n- [[cards/old-card|Old Card]]\n- [[cards/other-card|Other Card]]\n";
        let updated =
            rewrite_wikilinks_for_rename(original, "cards", "old-card", "new-card", "New Card");

        assert!(updated.contains("[[cards/new-card|New Card]]"));
        assert!(updated.contains("[[cards/other-card|Other Card]]"));
    }

    #[test]
    fn rewrites_board_links_for_rename() {
        let original = "## Sub Boards\n\n- [[boards/old-board|Old Board]]\n";
        let updated =
            rewrite_wikilinks_for_rename(original, "boards", "old-board", "new-board", "New Board");

        assert!(updated.contains("[[boards/new-board|New Board]]"));
    }

    #[test]
    fn removes_deleted_board_bullets() {
        let original =
            "## Sub Boards\n\n- [[boards/remove-me|Remove Me]]\n- [[boards/keep-me|Keep Me]]\n";
        let updated = remove_boards_from_board_markdown(original, &["remove-me"]);

        assert!(!updated.contains("remove-me"));
        assert!(updated.contains("keep-me"));
    }
}

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceWatcherState::default())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
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
            let toggle_archive_column =
                MenuItemBuilder::with_id("toggle-archive-column", "Toggle Archive Column")
                    .accelerator("CmdOrCtrl+Shift+A")
                    .build(app)?;
            let toggle_sub_boards =
                MenuItemBuilder::with_id("toggle-sub-boards", "Toggle Sub Boards").build(app)?;
            let delete_current_board =
                MenuItemBuilder::with_id("delete-current-board", "Delete Current Board")
                    .build(app)?;
            let new_column = MenuItemBuilder::with_id("new-column", "New Column").build(app)?;
            let rename_selected_column =
                MenuItemBuilder::with_id("rename-selected-column", "Rename Column").build(app)?;
            let delete_selected_column =
                MenuItemBuilder::with_id("delete-selected-column", "Delete Column").build(app)?;
            let open_selected_card =
                MenuItemBuilder::with_id("open-selected-card", "Open Selected")
                    .accelerator("Enter")
                    .build(app)?;
            let archive_selected_cards =
                MenuItemBuilder::with_id("archive-selected-cards", "Archive Selected")
                    .build(app)?;
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
            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&board_menu)
                .item(&card_menu)
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let action = match event.id().as_ref() {
                "open-folder" => Some("open-folder"),
                "undo-action" => Some("undo-action"),
                "redo-action" => Some("redo-action"),
                "new-card" => Some("new-card"),
                "new-sub-board" => Some("new-sub-board"),
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
            };

            if let Some(action) = action {
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
            watch_workspace,
            unwatch_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
