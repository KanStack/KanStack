use notify::RecommendedWatcher;
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Mutex};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceFile {
    pub(crate) path: String,
    pub(crate) content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceSnapshot {
    pub(crate) root_path: String,
    pub(crate) root_board_path: String,
    pub(crate) boards: Vec<WorkspaceFile>,
    pub(crate) cards: Vec<WorkspaceFile>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceChangedPayload {
    pub(crate) root_path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MenuActionPayload {
    pub(crate) action: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiscoveredSubBoard {
    pub(crate) title: String,
    pub(crate) todo_path: String,
}

pub(crate) struct WorkspaceWatcher {
    pub(crate) root_path: String,
    pub(crate) _watcher: RecommendedWatcher,
}

pub(crate) struct WorkspaceFileWrite<'a> {
    pub(crate) relative_path: &'a str,
    pub(crate) content: &'a str,
    pub(crate) allowed_prefix: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceBoardWrite {
    pub(crate) path: String,
    pub(crate) content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceSnapshotInput {
    pub(crate) root_path: String,
    pub(crate) boards: Vec<WorkspaceBoardWrite>,
    pub(crate) cards: Vec<WorkspaceBoardWrite>,
}

pub(crate) struct WorkspaceFileSnapshot {
    pub(crate) absolute_path: PathBuf,
    pub(crate) original_content: Option<String>,
}

#[derive(Default)]
pub(crate) struct WorkspaceWatcherState {
    pub(crate) watcher: Mutex<Option<WorkspaceWatcher>>,
}

pub(crate) struct WorkspaceFileWriteOwned {
    pub(crate) relative_path: String,
    pub(crate) content: String,
    pub(crate) allowed_prefix: String,
}
