use std::path::{Component, Path, PathBuf};

pub(crate) fn validate_todo_root(todo_root: &Path) -> Result<(), String> {
    if !todo_root.is_dir() {
        return Err("Expected to open a `TODO/` folder.".into());
    }

    if !todo_root.join("todo.md").is_file() || !todo_root.join("cards").is_dir() {
        return Err(
            "Expected the selected `TODO/` folder to contain `todo.md` and `cards/`.".into(),
        );
    }

    Ok(())
}

pub(crate) fn to_project_relative_path(project_root: &Path, path: &Path) -> Result<String, String> {
    let relative = path
        .strip_prefix(project_root)
        .map_err(|_| "Workspace path escaped the project root.".to_string())?;
    Ok(relative.to_string_lossy().replace('\\', "/"))
}

pub(crate) fn normalize_workspace_path(path: &Path) -> Result<PathBuf, String> {
    let mut normalized = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Prefix(prefix) => normalized.push(prefix.as_os_str()),
            Component::RootDir => normalized.push(component.as_os_str()),
            Component::CurDir => {}
            Component::Normal(part) => normalized.push(part),
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err("Workspace path escaped the project root.".into());
                }
            }
        }
    }

    Ok(normalized)
}

pub(crate) fn is_markdown_file(path: &Path) -> bool {
    path.extension().and_then(|value| value.to_str()) == Some("md")
}

pub(crate) fn is_workspace_markdown_file(path: &PathBuf) -> bool {
    is_markdown_file(path)
        && path
            .components()
            .any(|component| component.as_os_str().to_string_lossy() == "TODO")
}
