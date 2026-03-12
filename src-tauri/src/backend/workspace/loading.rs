use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use crate::backend::models::{WorkspaceFile, WorkspaceSnapshot, WorkspaceSnapshotInput};

use super::discovery::resolve_sub_board_todo_roots;
use super::paths::{
    is_markdown_file, normalize_workspace_path, to_project_relative_path, validate_todo_root,
};

pub(crate) fn build_workspace_snapshot(path: &str) -> Result<WorkspaceSnapshot, String> {
    let root_todo_path = PathBuf::from(path);
    validate_todo_root(&root_todo_path)?;

    let project_root = project_root_for_todo_root(&root_todo_path)?;
    let mut boards = Vec::new();
    let mut cards = Vec::new();
    let mut visited_todo_roots = HashSet::new();

    collect_workspace_tree(
        &project_root,
        &root_todo_path,
        &mut visited_todo_roots,
        &mut boards,
        &mut cards,
    )?;

    sort_workspace_files(&mut boards);
    sort_workspace_files(&mut cards);

    Ok(WorkspaceSnapshot {
        root_path: root_todo_path.to_string_lossy().into_owned(),
        root_board_path: board_markdown_path(&project_root, &root_todo_path)?,
        boards,
        cards,
    })
}

fn collect_workspace_tree(
    project_root: &Path,
    todo_root: &Path,
    visited_todo_roots: &mut HashSet<PathBuf>,
    boards: &mut Vec<WorkspaceFile>,
    cards: &mut Vec<WorkspaceFile>,
) -> Result<(), String> {
    let normalized_todo_root = normalize_workspace_path(todo_root)?;
    if !visited_todo_roots.insert(normalized_todo_root.clone()) {
        return Ok(());
    }

    validate_todo_root(&normalized_todo_root)?;

    let board_path = normalized_todo_root.join("todo.md");
    let board_content = fs::read_to_string(&board_path).map_err(|error| error.to_string())?;
    boards.push(workspace_file(
        project_root,
        &board_path,
        board_content.clone(),
    )?);
    cards.extend(read_markdown_files(
        project_root,
        &normalized_todo_root.join("cards"),
    )?);

    for child_todo_root in discover_child_todo_roots(&normalized_todo_root, &board_content)? {
        collect_workspace_tree(
            project_root,
            &child_todo_root,
            visited_todo_roots,
            boards,
            cards,
        )?;
    }

    Ok(())
}

fn discover_child_todo_roots(
    todo_root: &Path,
    board_content: &str,
) -> Result<Vec<PathBuf>, String> {
    let project_root = project_root_for_todo_root(todo_root)?;

    Ok(resolve_sub_board_todo_roots(todo_root, board_content)?
        .into_iter()
        .filter(|child_todo_root| {
            child_todo_root.starts_with(&project_root) && child_todo_root.exists()
        })
        .collect())
}

fn read_markdown_files(
    project_root: &Path,
    directory: &Path,
) -> Result<Vec<WorkspaceFile>, String> {
    let mut files = fs::read_dir(directory)
        .map_err(|error| error.to_string())?
        .map(|entry| {
            entry
                .map(|value| value.path())
                .map_err(|error| error.to_string())
        })
        .collect::<Result<Vec<_>, String>>()?
        .into_iter()
        .filter(|path| path.is_file() && is_markdown_file(path))
        .map(|path| {
            let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
            workspace_file(project_root, &path, content)
        })
        .collect::<Result<Vec<_>, String>>()?;

    sort_workspace_files(&mut files);
    Ok(files)
}

fn workspace_file(
    project_root: &Path,
    path: &Path,
    content: String,
) -> Result<WorkspaceFile, String> {
    Ok(WorkspaceFile {
        path: to_project_relative_path(project_root, path)?,
        content,
    })
}

fn board_markdown_path(project_root: &Path, todo_root: &Path) -> Result<String, String> {
    to_project_relative_path(project_root, &todo_root.join("todo.md"))
}

fn project_root_for_todo_root(todo_root: &Path) -> Result<PathBuf, String> {
    todo_root
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Selected TODO folder is missing a parent directory.".to_string())
}

fn sort_workspace_files(files: &mut [WorkspaceFile]) {
    files.sort_by(|left, right| left.path.cmp(&right.path));
}

pub(crate) fn collect_snapshot_directories(
    current_snapshot: Option<&WorkspaceSnapshot>,
    target_snapshot: &WorkspaceSnapshotInput,
    boards: bool,
) -> Vec<PathBuf> {
    let mut directories = snapshot_paths(current_snapshot, target_snapshot, boards)
        .into_iter()
        .filter_map(|path| Path::new(path).parent().map(Path::to_path_buf))
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    directories.sort();
    directories
}

fn snapshot_paths<'a>(
    current_snapshot: Option<&'a WorkspaceSnapshot>,
    target_snapshot: &'a WorkspaceSnapshotInput,
    boards: bool,
) -> Vec<&'a str> {
    let current_paths = current_snapshot
        .map(|snapshot| snapshot_file_paths(snapshot, boards))
        .unwrap_or_default();

    current_paths
        .into_iter()
        .chain(snapshot_input_paths(target_snapshot, boards))
        .collect()
}

fn snapshot_file_paths<'a>(snapshot: &'a WorkspaceSnapshot, boards: bool) -> Vec<&'a str> {
    if boards {
        snapshot
            .boards
            .iter()
            .map(|file| file.path.as_str())
            .collect()
    } else {
        snapshot
            .cards
            .iter()
            .map(|file| file.path.as_str())
            .collect()
    }
}

fn snapshot_input_paths<'a>(snapshot: &'a WorkspaceSnapshotInput, boards: bool) -> Vec<&'a str> {
    if boards {
        snapshot
            .boards
            .iter()
            .map(|file| file.path.as_str())
            .collect()
    } else {
        snapshot
            .cards
            .iter()
            .map(|file| file.path.as_str())
            .collect()
    }
}

pub(crate) fn remove_missing_workspace_snapshot_files(
    project_root: &Path,
    directories: Vec<PathBuf>,
    allowed_paths: &[&str],
    boards: bool,
) -> Result<(), String> {
    let allowed = allowed_paths.iter().copied().collect::<HashSet<_>>();

    for directory in directories {
        let absolute_directory = project_root.join(&directory);
        if !absolute_directory.is_dir() {
            continue;
        }

        for entry in fs::read_dir(&absolute_directory).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if !should_consider_for_cleanup(&path, boards) {
                continue;
            }

            let relative_path = to_project_relative_path(project_root, &path)?;
            if !allowed.contains(relative_path.as_str()) {
                fs::remove_file(path).map_err(|error| error.to_string())?;
            }
        }
    }

    Ok(())
}

fn should_consider_for_cleanup(path: &Path, boards: bool) -> bool {
    if !is_markdown_file(path) {
        return false;
    }

    if !boards {
        return true;
    }

    path.file_name().and_then(|value| value.to_str()) == Some("todo.md")
}
