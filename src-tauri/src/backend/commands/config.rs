use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::backend::models::AppConfig;

const CONFIG_BODY: &str = "# KanStack Config\n\nLocal machine settings for KanStack.\n";

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KnownBoardIndexFile {
    board_roots: Vec<String>,
}

#[tauri::command]
pub(crate) fn load_app_config(app_handle: AppHandle) -> Result<AppConfig, String> {
    read_app_config_state(&app_handle)
}

#[tauri::command]
pub(crate) fn save_app_config(
    app_handle: AppHandle,
    config: AppConfig,
) -> Result<AppConfig, String> {
    write_app_config_state(&app_handle, &config)?;
    Ok(config)
}

pub(super) fn read_app_config_state(app_handle: &AppHandle) -> Result<AppConfig, String> {
    let (config, migrated) = read_or_migrate_app_config(app_handle)?;
    if migrated {
        write_app_config_state(app_handle, &config)?;
    }

    Ok(config)
}

pub(super) fn write_app_config_state(
    app_handle: &AppHandle,
    config: &AppConfig,
) -> Result<(), String> {
    let config_path = app_config_path(app_handle)?;
    let parent = config_path
        .parent()
        .ok_or_else(|| "App config path is missing a parent directory.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let content = serialize_app_config(config)?;
    fs::write(&config_path, content).map_err(|error| error.to_string())?;

    let legacy_path = legacy_known_board_index_path(app_handle)?;
    if legacy_path.is_file() {
        let _ = fs::remove_file(legacy_path);
    }

    Ok(())
}

fn read_or_migrate_app_config(app_handle: &AppHandle) -> Result<(AppConfig, bool), String> {
    let config_path = app_config_path(app_handle)?;
    if config_path.is_file() {
        let raw = fs::read_to_string(&config_path).map_err(|error| error.to_string())?;
        return Ok((parse_app_config(&raw)?, false));
    }

    let legacy_known_board_roots = read_legacy_known_board_roots(app_handle)?;
    if legacy_known_board_roots.is_empty() {
        return Ok((AppConfig::default(), false));
    }

    let mut config = AppConfig::default();
    config.known_board_roots = legacy_known_board_roots;
    Ok((config, true))
}

fn parse_app_config(raw: &str) -> Result<AppConfig, String> {
    if raw.trim().is_empty() {
        return Ok(AppConfig::default());
    }

    let mut lines = raw.lines();
    if lines.next().map(str::trim) != Some("---") {
        return Ok(AppConfig::default());
    }

    let mut yaml_lines = Vec::new();
    let mut found_closing_delimiter = false;
    for line in lines {
        if line.trim() == "---" {
            found_closing_delimiter = true;
            break;
        }

        yaml_lines.push(line);
    }

    if !found_closing_delimiter {
        return Err("App config frontmatter is missing the closing delimiter.".into());
    }

    let yaml_source = yaml_lines.join("\n");
    if yaml_source.trim().is_empty() {
        return Ok(AppConfig::default());
    }

    serde_yaml::from_str(&yaml_source)
        .map_err(|error| format!("Failed to parse app config frontmatter: {error}"))
}

fn serialize_app_config(config: &AppConfig) -> Result<String, String> {
    let yaml = serde_yaml::to_string(config).map_err(|error| error.to_string())?;
    let yaml = yaml.trim_start_matches("---\n").trim();

    Ok(format!("---\n{yaml}\n---\n\n{CONFIG_BODY}"))
}

fn read_legacy_known_board_roots(app_handle: &AppHandle) -> Result<Vec<String>, String> {
    let index_path = legacy_known_board_index_path(app_handle)?;
    if !index_path.is_file() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(&index_path).map_err(|error| error.to_string())?;
    let parsed = serde_json::from_str::<KnownBoardIndexFile>(&raw).unwrap_or_default();
    Ok(parsed.board_roots)
}

fn app_config_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    Ok(app_data_dir.join("config.md"))
}

fn legacy_known_board_index_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    Ok(app_data_dir.join("known-boards.json"))
}

#[cfg(test)]
mod tests {
    use crate::backend::models::{
        AppConfig, AppViewDueStatus, AppViewFilters, AppViewPreferences, AppViewSort,
    };

    use super::{parse_app_config, serialize_app_config};

    #[test]
    fn parses_markdown_frontmatter_config() {
        let config = parse_app_config(
            r#"---
knownBoardRoots:
  - /workspace/TODO
workspacePath: /workspace/TODO
view:
  sort: priority
  filters:
    text: bug
    assignee: galen
    tags:
      - urgent
    priority: high
    type: bug
    dueStatus: overdue
---

# KanStack Config
"#,
        )
        .expect("config parses");

        assert_eq!(config.known_board_roots, vec!["/workspace/TODO"]);
        assert_eq!(config.workspace_path.as_deref(), Some("/workspace/TODO"));
        assert!(matches!(config.view.sort, AppViewSort::Priority));
        assert_eq!(config.view.filters.text, "bug");
        assert_eq!(config.view.filters.tags, vec!["urgent"]);
        assert!(matches!(
            config.view.filters.due_status,
            AppViewDueStatus::Overdue
        ));
    }

    #[test]
    fn serializes_round_trip_markdown_config() {
        let config = AppConfig {
            known_board_roots: vec!["/workspace/TODO".into()],
            workspace_path: Some("/workspace/TODO".into()),
            view: AppViewPreferences {
                sort: AppViewSort::Due,
                filters: AppViewFilters {
                    text: "api".into(),
                    assignee: None,
                    tags: vec!["backend".into()],
                    priority: Some("high".into()),
                    r#type: Some("feature".into()),
                    due_status: AppViewDueStatus::DueSoon,
                },
            },
        };

        let markdown = serialize_app_config(&config).expect("config serializes");
        let reparsed = parse_app_config(&markdown).expect("config reparses");

        assert_eq!(reparsed.known_board_roots, config.known_board_roots);
        assert_eq!(reparsed.workspace_path, config.workspace_path);
        assert!(matches!(reparsed.view.sort, AppViewSort::Due));
        assert_eq!(reparsed.view.filters.tags, vec!["backend"]);
        assert!(matches!(
            reparsed.view.filters.due_status,
            AppViewDueStatus::DueSoon
        ));
    }
}
