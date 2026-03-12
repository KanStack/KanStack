mod discovery;
mod fs;
mod loading;
mod markdown;
mod paths;

pub(crate) use discovery::{
    child_target_from_parent_board, collect_board_delete_todo_roots,
    collect_discoverable_sub_boards,
};
pub(crate) use fs::{
    move_workspace_file_to_trash, normalize_relative_markdown_path, project_root_from_root,
    rename_workspace_markdown_file, rollback_workspace_file_updates,
    save_owned_workspace_markdown_files, save_workspace_markdown_file_batch,
};
pub(crate) use loading::{
    build_workspace_snapshot, collect_snapshot_directories, remove_missing_workspace_snapshot_files,
};
pub(crate) use markdown::{
    read_board_title_from_content, remove_board_target_from_markdown,
    remove_card_from_board_markdown, rewrite_wikilinks_for_rename,
};
pub(crate) use paths::{is_workspace_markdown_file, to_project_relative_path, validate_todo_root};
