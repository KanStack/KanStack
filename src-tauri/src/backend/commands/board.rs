use std::{
    collections::{BTreeSet, HashMap},
    fs,
    path::{Path, PathBuf},
};

use tauri::AppHandle;

use crate::backend::{
    commands::{
        config::{read_app_config_state, write_app_config_state},
        emit_workspace_changed,
        support::{
            board_write, note_write, owned_board_write, read_board_document, resolve_board_context,
        },
    },
    models::{KnownBoardTreeSyncResult, WorkspaceSnapshot},
    workspace::{
        build_workspace_snapshot, child_target_from_parent_board, collect_board_delete_todo_roots,
        extract_sub_board_links, move_workspace_file_to_trash, normalize_wikilink_target,
        read_board_title_from_content, remove_board_target_from_markdown,
        replace_sub_board_section, rollback_workspace_file_updates,
        save_owned_workspace_markdown_files, save_workspace_markdown_file_batch,
        validate_todo_root,
    },
};

struct KnownBoard {
    root_path: String,
    todo_root: PathBuf,
    project_dir: PathBuf,
    title: String,
    content: String,
}

#[tauri::command]
pub(crate) fn create_board(
    destination_path: String,
    board_content: String,
) -> Result<String, String> {
    let destination_root = PathBuf::from(&destination_path);
    if !destination_root.is_dir() {
        return Err("Select an existing folder for the new board.".into());
    }

    if destination_root
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("TODO"))
        || validate_todo_root(&destination_root).is_ok()
    {
        return Err("Select a project folder, not an existing TODO folder.".into());
    }

    let todo_root = destination_root.join("TODO");
    if todo_root.exists() {
        return Err("The selected folder already contains a TODO board.".into());
    }
    let readme_content = "# TODO\n\nThis folder is a KanStack board root.\n";
    let cards_directory = todo_root.join("cards");

    fs::create_dir_all(&cards_directory).map_err(|error| error.to_string())?;

    save_workspace_markdown_file_batch(
        todo_root
            .to_str()
            .ok_or_else(|| "Encountered an invalid UTF-8 path.".to_string())?,
        &[
            board_write("TODO/todo.md", &board_content),
            note_write("TODO/README.md", readme_content),
        ],
    )?;

    Ok(todo_root.to_string_lossy().into_owned())
}

#[tauri::command]
pub(crate) fn sync_known_board_tree(
    app_handle: AppHandle,
    additional_board_roots: Vec<String>,
    focus_root_path: Option<String>,
) -> Result<KnownBoardTreeSyncResult, String> {
    let mut app_config = read_app_config_state(&app_handle)?;
    let mut known_board_roots = app_config.known_board_roots.clone();
    known_board_roots.extend(additional_board_roots);
    let (known_boards, missing_board_roots) = collect_known_boards(&known_board_roots)?;
    let child_links_by_root = infer_child_links(&known_boards)?;
    let mut updated_board_roots = Vec::new();

    for board in &known_boards {
        let next_content = replace_sub_board_section(
            &board.content,
            &merged_sub_board_links(board, &child_links_by_root, &known_boards),
        );

        if next_content != board.content {
            save_workspace_markdown_file_batch(
                &board.root_path,
                &[board_write("TODO/todo.md", &next_content)],
            )?;
            updated_board_roots.push(board.root_path.clone());
        }
    }

    let persisted_known_board_roots = known_boards
        .iter()
        .map(|board| board.root_path.clone())
        .collect::<Vec<_>>();
    app_config.known_board_roots = persisted_known_board_roots.clone();
    write_app_config_state(&app_handle, &app_config)?;

    Ok(KnownBoardTreeSyncResult {
        known_board_roots: persisted_known_board_roots,
        missing_board_roots,
        suggested_root_path: suggest_root_path(focus_root_path.as_deref(), &known_boards),
        updated_board_roots,
    })
}

#[tauri::command]
pub(crate) fn rename_board(
    root: String,
    old_path: String,
    _new_path: String,
    _old_slug: String,
    _new_slug: String,
    _new_title: String,
    content: String,
) -> Result<WorkspaceSnapshot, String> {
    save_workspace_markdown_file_batch(&root, &[board_write(&old_path, &content)])?;

    build_workspace_snapshot(&root)
}

#[tauri::command]
pub(crate) fn delete_board(
    root: String,
    path: String,
    parent_board_path: String,
    app_handle: AppHandle,
) -> Result<WorkspaceSnapshot, String> {
    let board = resolve_board_context(&root, &path)?;
    let parent_board = read_board_document(&root, &parent_board_path)?;
    let current_target =
        child_target_from_parent_board(&parent_board.context.relative_path, &board.relative_path)?;
    let parent_board_updated =
        remove_board_target_from_markdown(&parent_board.content, &current_target);
    let parent_board_updates = if parent_board_updated != parent_board.content {
        vec![owned_board_write(
            &parent_board.context.relative_path,
            parent_board_updated,
        )]
    } else {
        Vec::new()
    };
    let applied_board_snapshots =
        save_owned_workspace_markdown_files(&root, &parent_board_updates)?;
    let mut todo_roots = Vec::new();
    collect_board_delete_todo_roots(&board.todo_root, &mut todo_roots)?;
    todo_roots.sort();
    todo_roots.reverse();

    for todo_root in todo_roots {
        if let Err(error) = move_workspace_file_to_trash(&todo_root) {
            rollback_workspace_file_updates(&applied_board_snapshots)?;
            return Err(error);
        }
    }

    emit_workspace_changed(&app_handle, &root)?;
    build_workspace_snapshot(&root)
}

fn collect_known_boards(
    known_board_roots: &[String],
) -> Result<(Vec<KnownBoard>, Vec<String>), String> {
    let mut unique_roots = BTreeSet::new();
    let mut known_boards = Vec::new();
    let mut missing_board_roots = Vec::new();

    for root in known_board_roots {
        let todo_root = PathBuf::from(root);
        let normalized_root = todo_root
            .to_string_lossy()
            .trim_end_matches(['/', '\\'])
            .to_string();
        if !unique_roots.insert(normalized_root.clone()) {
            continue;
        }

        if validate_todo_root(&todo_root).is_err() {
            missing_board_roots.push(normalized_root);
            continue;
        }

        let board_path = todo_root.join("todo.md");
        let content = fs::read_to_string(&board_path).map_err(|error| error.to_string())?;
        let project_dir = todo_root
            .parent()
            .ok_or_else(|| "Known board TODO folder is missing a project root.".to_string())?
            .to_path_buf();
        let fallback_title = project_dir
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Board")
            .to_string();

        known_boards.push(KnownBoard {
            root_path: normalized_root,
            todo_root,
            project_dir,
            title: read_board_title_from_content(&content, &fallback_title),
            content,
        });
    }

    known_boards.sort_by(|left, right| left.root_path.cmp(&right.root_path));
    missing_board_roots.sort();
    Ok((known_boards, missing_board_roots))
}

fn infer_child_links(
    known_boards: &[KnownBoard],
) -> Result<HashMap<String, Vec<(String, Option<String>)>>, String> {
    let mut child_links_by_root = known_boards
        .iter()
        .map(|board| (board.root_path.clone(), Vec::new()))
        .collect::<HashMap<_, _>>();

    for child in known_boards {
        let Some(parent) = nearest_known_parent(child, known_boards) else {
            continue;
        };
        let target = relative_todo_target(&parent.project_dir, &child.todo_root)?;
        child_links_by_root
            .entry(parent.root_path.clone())
            .or_default()
            .push((target, Some(child.title.clone())));
    }

    for links in child_links_by_root.values_mut() {
        links.sort_by(|left, right| left.0.cmp(&right.0));
    }

    Ok(child_links_by_root)
}

fn merged_sub_board_links(
    board: &KnownBoard,
    child_links_by_root: &HashMap<String, Vec<(String, Option<String>)>>,
    known_boards: &[KnownBoard],
) -> Vec<(String, Option<String>)> {
    let auto_links = child_links_by_root
        .get(&board.root_path)
        .cloned()
        .unwrap_or_default();
    let auto_targets = auto_links
        .iter()
        .map(|(target, _title)| normalize_wikilink_target(target))
        .collect::<BTreeSet<_>>();
    let mut merged_links = auto_links;

    for (target, title) in extract_sub_board_links(&board.content) {
        let normalized_target = normalize_wikilink_target(&target);
        if auto_targets.contains(&normalized_target) {
            continue;
        }

        if points_to_known_board(board, &normalized_target, known_boards) {
            continue;
        }

        merged_links.push((target, title));
    }

    merged_links.sort_by(|left, right| left.0.cmp(&right.0));
    merged_links
}

fn points_to_known_board(board: &KnownBoard, target: &str, known_boards: &[KnownBoard]) -> bool {
    let resolved_root = normalize_root_path(&board.project_dir.join(target).to_string_lossy());
    known_boards
        .iter()
        .any(|known_board| normalize_root_path(&known_board.root_path) == resolved_root)
}

fn normalize_root_path(path: &str) -> String {
    path.replace('\\', "/").trim_end_matches('/').to_string()
}

fn nearest_known_parent<'a>(
    child: &KnownBoard,
    known_boards: &'a [KnownBoard],
) -> Option<&'a KnownBoard> {
    known_boards
        .iter()
        .filter(|candidate| candidate.root_path != child.root_path)
        .filter(|candidate| child.todo_root.starts_with(&candidate.project_dir))
        .max_by_key(|candidate| candidate.project_dir.components().count())
}

fn relative_todo_target(
    parent_project_dir: &Path,
    child_todo_root: &Path,
) -> Result<String, String> {
    child_todo_root
        .strip_prefix(parent_project_dir)
        .map_err(|_| "Child board is not under the parent board tree.".to_string())
        .map(|path| path.to_string_lossy().replace('\\', "/"))
}

fn suggest_root_path(focus_root_path: Option<&str>, known_boards: &[KnownBoard]) -> Option<String> {
    let focus_root = PathBuf::from(focus_root_path?);

    known_boards
        .iter()
        .filter(|board| focus_root.starts_with(&board.project_dir))
        .min_by_key(|board| board.project_dir.components().count())
        .map(|board| board.root_path.clone())
}

#[cfg(test)]
mod tests {
    use super::{infer_child_links, merged_sub_board_links, suggest_root_path, KnownBoard};
    use std::path::PathBuf;

    #[test]
    fn infers_nearest_known_parent_links() {
        let boards = vec![
            test_board("/workspace/TODO", "Root"),
            test_board("/workspace/projects/TODO", "Projects"),
            test_board("/workspace/projects/api/TODO", "API"),
        ];

        let links = infer_child_links(&boards).unwrap();

        assert_eq!(
            links.get("/workspace/TODO").unwrap(),
            &vec![("projects/TODO".to_string(), Some("Projects".to_string()))]
        );
        assert_eq!(
            links.get("/workspace/projects/TODO").unwrap(),
            &vec![("api/TODO".to_string(), Some("API".to_string()))]
        );
    }

    #[test]
    fn suggests_topmost_known_root_for_focus_board() {
        let boards = vec![
            test_board("/workspace/TODO", "Root"),
            test_board("/workspace/projects/TODO", "Projects"),
            test_board("/workspace/projects/api/TODO", "API"),
        ];

        assert_eq!(
            suggest_root_path(Some("/workspace/projects/api/TODO"), &boards),
            Some("/workspace/TODO".to_string()),
        );
    }

    #[test]
    fn drops_known_links_that_belong_under_a_different_parent() {
        let boards = vec![
            test_board_with_content(
                "/vault/TODO",
                "Root",
                "## Sub Boards\n\n- [[Personal/TODO|Personal]]\n\n- [[VUW/TODO|VUW]]\n\n- [[VUW/2026/ENGR 401/TODO|ENGR 401]]\n",
            ),
            test_board("/vault/Personal/TODO", "Personal"),
            test_board("/vault/VUW/TODO", "VUW"),
            test_board("/vault/VUW/2026/ENGR 401/TODO", "ENGR 401"),
        ];

        let child_links = infer_child_links(&boards).unwrap();
        let merged = merged_sub_board_links(&boards[0], &child_links, &boards);

        assert_eq!(
            merged,
            vec![
                ("Personal/TODO".to_string(), Some("Personal".to_string())),
                ("VUW/TODO".to_string(), Some("VUW".to_string())),
            ],
        );
    }

    fn test_board(root_path: &str, title: &str) -> KnownBoard {
        test_board_with_content(root_path, title, &format!("# {title}\n"))
    }

    fn test_board_with_content(root_path: &str, title: &str, content: &str) -> KnownBoard {
        let todo_root = PathBuf::from(root_path);
        KnownBoard {
            root_path: root_path.to_string(),
            project_dir: todo_root.parent().unwrap().to_path_buf(),
            todo_root,
            title: title.to_string(),
            content: content.to_string(),
        }
    }
}
