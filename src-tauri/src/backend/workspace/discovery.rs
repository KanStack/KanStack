use std::{
    fs,
    path::{Path, PathBuf},
};

use super::markdown::{extract_sub_board_targets, normalize_wikilink_target};
use super::paths::{normalize_workspace_path, validate_todo_root};

pub(crate) fn resolve_sub_board_todo_roots(
    todo_root: &Path,
    content: &str,
) -> Result<Vec<PathBuf>, String> {
    let project_root = todo_root
        .parent()
        .ok_or_else(|| "TODO folder is missing a project root.".to_string())?;
    let mut resolved = Vec::new();

    for target in extract_sub_board_targets(content) {
        let normalized_target = normalize_wikilink_target(&target);
        let relative_todo_path = if normalized_target.ends_with("/todo") {
            PathBuf::from(normalized_target)
                .parent()
                .ok_or_else(|| "Sub-board target is missing a TODO directory.".to_string())?
                .to_path_buf()
        } else {
            PathBuf::from(normalized_target)
        };
        let absolute_todo_path = normalize_workspace_path(&project_root.join(relative_todo_path))?;

        if absolute_todo_path.starts_with(project_root) {
            resolved.push(absolute_todo_path);
        }
    }

    Ok(resolved)
}

pub(crate) fn collect_discoverable_sub_boards(
    project_dir: &Path,
    current_todo_root: &Path,
    discovered: &mut Vec<PathBuf>,
) -> Result<(), String> {
    let mut child_directories = Vec::new();
    let mut found_child_todo = false;

    for entry in fs::read_dir(project_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        if path.file_name().and_then(|value| value.to_str()) == Some("TODO") {
            if path == current_todo_root {
                continue;
            }

            if validate_todo_root(&path).is_ok() {
                discovered.push(path);
                found_child_todo = true;
            }

            continue;
        }

        child_directories.push(path);
    }

    if found_child_todo {
        return Ok(());
    }

    for child_directory in child_directories {
        collect_discoverable_sub_boards(&child_directory, current_todo_root, discovered)?;
    }

    Ok(())
}

pub(crate) fn child_target_from_parent_board(
    parent_board_path: &Path,
    child_board_path: &Path,
) -> Result<String, String> {
    let parent_todo_root = parent_board_path
        .parent()
        .ok_or_else(|| "Parent board path is missing a TODO directory.".to_string())?;
    let parent_project_root = parent_todo_root
        .parent()
        .ok_or_else(|| "Parent board TODO folder is missing a project root.".to_string())?;
    let child_todo_root = child_board_path
        .parent()
        .ok_or_else(|| "Child board path is missing a TODO directory.".to_string())?;

    let relative_child_todo = if parent_project_root.as_os_str().is_empty() {
        child_todo_root.to_path_buf()
    } else {
        child_todo_root
            .strip_prefix(parent_project_root)
            .map_err(|_| "Child board is not under the parent board tree.".to_string())?
            .to_path_buf()
    };

    Ok(relative_child_todo.to_string_lossy().replace('\\', "/"))
}

pub(crate) fn collect_board_delete_todo_roots(
    todo_root: &Path,
    todo_roots: &mut Vec<PathBuf>,
) -> Result<(), String> {
    validate_todo_root(todo_root)?;
    let board_content =
        fs::read_to_string(todo_root.join("todo.md")).map_err(|error| error.to_string())?;

    for child_todo_root in resolve_sub_board_todo_roots(todo_root, &board_content)? {
        if child_todo_root.exists() {
            collect_board_delete_todo_roots(&child_todo_root, todo_roots)?;
        }
    }

    todo_roots.push(todo_root.to_path_buf());
    Ok(())
}
