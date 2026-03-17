use std::process::Command;

use crate::backend::workspace::project_root_from_root;

#[tauri::command]
pub(crate) async fn reveal_in_file_manager(
    root: String,
    relative_path: String,
) -> Result<(), String> {
    let project_root = project_root_from_root(&root)?;
    let absolute_path = project_root.join(&relative_path);

    if !absolute_path.exists() {
        return Err(format!("File does not exist: {}", absolute_path.display()));
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&absolute_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &absolute_path.to_string_lossy()])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let parent = absolute_path.parent().ok_or("Could not get parent directory")?;
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}