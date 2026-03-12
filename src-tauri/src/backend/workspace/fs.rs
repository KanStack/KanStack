use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::backend::models::{
    WorkspaceFileSnapshot, WorkspaceFileWrite, WorkspaceFileWriteOwned, WorkspaceSnapshot,
};

use super::build_workspace_snapshot;

pub(crate) fn normalize_relative_markdown_path(
    relative_path: &str,
    allowed_prefix: &str,
) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(relative_path);

    if candidate.is_absolute() {
        return Err("Expected a project-relative markdown path.".into());
    }

    if candidate.extension().and_then(|value| value.to_str()) != Some("md") {
        return Err("Only markdown files can be written.".into());
    }

    let normalized = normalize_relative_path_components(&candidate)?;
    validate_allowed_markdown_location(&normalized, allowed_prefix)?;
    Ok(normalized)
}

fn normalize_relative_path_components(candidate: &Path) -> Result<PathBuf, String> {
    let mut normalized = PathBuf::new();

    for component in candidate.components() {
        match component {
            std::path::Component::Normal(part) => normalized.push(part),
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                if !normalized.pop() {
                    return Err("Relative path contains unsupported segments.".into());
                }
            }
            _ => return Err("Relative path contains unsupported segments.".into()),
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err("Relative path is empty.".into());
    }

    Ok(normalized)
}

fn validate_allowed_markdown_location(path: &Path, allowed_prefix: &str) -> Result<(), String> {
    match allowed_prefix {
        "cards" if path.parent().and_then(file_name_str) == Some("cards") => Ok(()),
        "boards"
            if path.file_name().and_then(os_str_to_str) == Some("todo.md")
                && path.parent().and_then(file_name_str) == Some("TODO") =>
        {
            Ok(())
        }
        "notes"
            if path.file_name().and_then(os_str_to_str) == Some("README.md")
                && path.parent().and_then(file_name_str) == Some("TODO") =>
        {
            Ok(())
        }
        "cards" => Err("Card writes must target a `cards/` directory.".into()),
        "boards" => Err("Board writes must target a `TODO/todo.md` file.".into()),
        "notes" => Err("Board note writes must target a `TODO/README.md` file.".into()),
        _ => Err("Unknown markdown write target kind.".into()),
    }
}

fn file_name_str(path: &Path) -> Option<&str> {
    path.file_name().and_then(|value| value.to_str())
}

fn os_str_to_str(value: &std::ffi::OsStr) -> Option<&str> {
    value.to_str()
}

pub(crate) fn project_root_from_root(root: &str) -> Result<PathBuf, String> {
    PathBuf::from(root)
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Selected TODO folder is missing a parent directory.".to_string())
}

pub(crate) fn save_workspace_markdown_file_batch(
    root: &str,
    writes: &[WorkspaceFileWrite<'_>],
) -> Result<Vec<WorkspaceFileSnapshot>, String> {
    let project_root = project_root_from_root(root)?;
    let resolved_writes = writes
        .iter()
        .map(|write| resolve_workspace_write(&project_root, write))
        .collect::<Result<Vec<_>, String>>()?;

    apply_workspace_writes(&resolved_writes)
}

pub(crate) fn rename_workspace_markdown_file(
    root: &str,
    old_relative_path: &str,
    new_relative_path: &str,
    content: &str,
    allowed_prefix: &str,
    extra_writes: &[WorkspaceFileWriteOwned],
) -> Result<WorkspaceSnapshot, String> {
    let old_normalized_path = normalize_relative_markdown_path(old_relative_path, allowed_prefix)?;
    let new_normalized_path = normalize_relative_markdown_path(new_relative_path, allowed_prefix)?;
    let old_absolute_path = project_root_from_root(root)?.join(&old_normalized_path);
    let mut writes = vec![WorkspaceFileWriteOwned {
        relative_path: new_normalized_path.to_string_lossy().into_owned(),
        content: content.to_string(),
        allowed_prefix: allowed_prefix.to_string(),
    }];
    writes.extend(extra_writes.iter().map(clone_owned_write));

    let applied_snapshots = save_owned_workspace_markdown_files(root, &writes)?;

    if old_normalized_path != new_normalized_path {
        if let Err(error) = remove_workspace_file(&old_absolute_path) {
            rollback_workspace_file_updates(&applied_snapshots)?;
            return Err(error);
        }
    }

    build_workspace_snapshot(root)
}

fn clone_owned_write(write: &WorkspaceFileWriteOwned) -> WorkspaceFileWriteOwned {
    WorkspaceFileWriteOwned {
        relative_path: write.relative_path.clone(),
        content: write.content.clone(),
        allowed_prefix: write.allowed_prefix.clone(),
    }
}

struct ResolvedWorkspaceWrite<'a> {
    absolute_path: PathBuf,
    content: &'a str,
}

fn resolve_workspace_write<'a>(
    project_root: &Path,
    write: &'a WorkspaceFileWrite<'a>,
) -> Result<ResolvedWorkspaceWrite<'a>, String> {
    Ok(ResolvedWorkspaceWrite {
        absolute_path: project_root.join(normalize_relative_markdown_path(
            write.relative_path,
            write.allowed_prefix,
        )?),
        content: write.content,
    })
}

fn apply_workspace_writes(
    writes: &[ResolvedWorkspaceWrite<'_>],
) -> Result<Vec<WorkspaceFileSnapshot>, String> {
    let mut applied_snapshots = Vec::new();

    for write in writes {
        let snapshot = capture_workspace_file_snapshot(&write.absolute_path)?;

        if let Err(error) = write_workspace_markdown_file(&write.absolute_path, write.content) {
            rollback_workspace_file_updates(&applied_snapshots)?;
            return Err(error);
        }

        applied_snapshots.push(snapshot);
    }

    Ok(applied_snapshots)
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

pub(crate) fn rollback_workspace_file_updates(
    snapshots: &[WorkspaceFileSnapshot],
) -> Result<(), String> {
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

pub(crate) fn move_workspace_file_to_trash(absolute_path: &Path) -> Result<(), String> {
    if absolute_path.exists() {
        trash::delete(absolute_path).map_err(|error| error.to_string())?;
    }

    Ok(())
}

pub(crate) fn save_owned_workspace_markdown_files(
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
