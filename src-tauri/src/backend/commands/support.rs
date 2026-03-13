use std::path::{Path, PathBuf};

use crate::backend::{
    models::{WorkspaceFileWrite, WorkspaceFileWriteOwned},
    workspace::{normalize_relative_markdown_path, project_root_from_root},
};

pub(crate) struct BoardContext {
    pub(crate) relative_path: PathBuf,
    pub(crate) absolute_path: PathBuf,
    pub(crate) todo_root: PathBuf,
}

pub(crate) struct BoardDocument {
    pub(crate) context: BoardContext,
    pub(crate) content: String,
}

pub(crate) fn read_board_document(root: &str, board_path: &str) -> Result<BoardDocument, String> {
    let context = resolve_board_context(root, board_path)?;
    let content =
        std::fs::read_to_string(&context.absolute_path).map_err(|error| error.to_string())?;

    Ok(BoardDocument { context, content })
}

pub(crate) fn resolve_board_context(root: &str, board_path: &str) -> Result<BoardContext, String> {
    let project_root = project_root_from_root(root)?;
    let relative_path = normalize_relative_markdown_path(board_path, "boards")?;
    let absolute_path = project_root.join(&relative_path);
    let todo_root = absolute_path
        .parent()
        .ok_or_else(|| "Board file is missing a TODO directory.".to_string())?
        .to_path_buf();
    Ok(BoardContext {
        relative_path,
        absolute_path,
        todo_root,
    })
}

pub(crate) fn board_write<'a>(relative_path: &'a str, content: &'a str) -> WorkspaceFileWrite<'a> {
    WorkspaceFileWrite {
        relative_path,
        content,
        allowed_prefix: "boards",
    }
}

pub(crate) fn card_write<'a>(relative_path: &'a str, content: &'a str) -> WorkspaceFileWrite<'a> {
    WorkspaceFileWrite {
        relative_path,
        content,
        allowed_prefix: "cards",
    }
}

pub(crate) fn note_write<'a>(relative_path: &'a str, content: &'a str) -> WorkspaceFileWrite<'a> {
    WorkspaceFileWrite {
        relative_path,
        content,
        allowed_prefix: "notes",
    }
}

pub(crate) fn owned_board_write(relative_path: &Path, content: String) -> WorkspaceFileWriteOwned {
    WorkspaceFileWriteOwned {
        relative_path: relative_path.to_string_lossy().into_owned(),
        content,
        allowed_prefix: "boards".to_string(),
    }
}

pub(crate) fn local_markdown_slug(path: &Path) -> Result<String, String> {
    path.file_stem()
        .and_then(|value| value.to_str())
        .map(ToOwned::to_owned)
        .ok_or_else(|| "Could not determine the markdown file slug.".to_string())
}
