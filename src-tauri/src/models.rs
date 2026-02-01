use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Config models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub app_version: String,
    pub settings: AppSettings,
    pub projects: Vec<ProjectEntry>,
    #[serde(alias = "combined_board_settings")]
    pub summary_settings: SummarySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub font: String,
    pub auto_save: bool,
    pub default_project_location: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub last_opened: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummarySettings {
    pub visible_projects: Vec<String>,
    pub filters: FilterSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSettings {
    pub exclude_archived: bool,
    pub tags: Vec<String>,
}

// Project meta models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub boards: Vec<String>,
    pub settings: ProjectSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub tags: Vec<String>,
    #[serde(default)]
    pub custom_fields: Vec<CustomField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomField {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
}

// Board models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Board {
    pub id: String,
    pub version: String,
    pub schema_version: i32,
    pub name: String,
    pub project_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub columns: Vec<Column>,
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub id: String,
    pub name: String,
    pub order: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wip_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub column_id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "contentType")]
    pub content_type: String,
    pub order: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    pub priority: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub linked_refs: Vec<LinkedRef>,
    #[serde(default)]
    pub checklist: Vec<ChecklistItem>,
    pub status: String,
    pub archived: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedRef {
    pub card_id: String,
    pub board_id: String,
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistItem {
    pub id: String,
    pub text: String,
    pub checked: bool,
}
