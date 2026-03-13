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
pub(crate) struct KnownBoardTreeSyncResult {
    pub(crate) known_board_roots: Vec<String>,
    pub(crate) missing_board_roots: Vec<String>,
    pub(crate) suggested_root_path: Option<String>,
    pub(crate) updated_board_roots: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct AppConfig {
    pub(crate) known_board_roots: Vec<String>,
    pub(crate) workspace_path: Option<String>,
    pub(crate) view: AppViewPreferences,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct AppViewPreferences {
    pub(crate) sort: AppViewSort,
    pub(crate) filters: AppViewFilters,
}

impl Default for AppViewPreferences {
    fn default() -> Self {
        Self {
            sort: AppViewSort::Manual,
            filters: AppViewFilters::default(),
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct AppViewFilters {
    pub(crate) text: String,
    pub(crate) assignee: Option<String>,
    pub(crate) tags: Vec<String>,
    pub(crate) priority: Option<String>,
    pub(crate) r#type: Option<String>,
    pub(crate) due_status: AppViewDueStatus,
}

#[derive(Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) enum AppViewSort {
    #[default]
    Manual,
    Title,
    Due,
    Priority,
}

#[derive(Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) enum AppViewDueStatus {
    #[default]
    Any,
    Overdue,
    DueSoon,
    HasDue,
    NoDue,
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
